import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import { collection, getDocs } from 'firebase/firestore';
import {
  Observable,
  catchError,
  from,
  map,
  mergeMap,
  of,
  retryWhen,
  switchMap,
  throwError,
  timer,
} from 'rxjs';
import { environment } from '../../../environment/environment';

interface IaChatMessage {
  role: 'system' | 'user';
  content: string;
}

interface IaChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

interface IaFirebaseData {
  activity: Array<Record<string, unknown>>;
  activityType: Array<Record<string, unknown>>;
  plans: Array<Record<string, unknown>>;
}

@Injectable({ providedIn: 'root' })
export class IaAssistantService {
  private firestore = inject(Firestore);
  private http = inject(HttpClient);
  private readonly unavailableModels = new Set<string>();
  private readonly maxModelAttempts = 3;
  private readonly maxDocsPerCollection = 25;
  private readonly maxFirebaseJsonChars = 15000;

  private readonly allowedTopicPattern =
    /(plan|planes|actividad|actividades|activity|activities|activitytype|activity type|tipo|tipos|ruta|rutas|itinerario|itinerarios)/i;

  ask(question: string) {
    const cleanQuestion = question.trim();

    if (!cleanQuestion) {
      return of('Escribe una pregunta para poder ayudarte.');
    }

    if (!this.allowedTopicPattern.test(cleanQuestion)) {
      return of(
        'Solo puedo responder preguntas sobre planes, actividades o tipos de actividad.',
      );
    }

    const model = environment.ia.model?.trim();
    const apiKey = environment.ia.apiKey?.trim();
    const rawApiUrl = environment.ia.apiUrl?.trim();
    const apiUrl = this.resolveChatCompletionsUrl(rawApiUrl);

    if (!model || model === '') {
      return of(
        '❌ Modelo IA no configurado. Define NG_APP_IA_MODEL (ej: meta-llama/llama-3.3-70b-instruct:free) en variables de entorno.',
      );
    }

    if (!apiKey || apiKey === '') {
      return of(
        '❌ API key no configurada. Define NG_APP_IA_API_KEY (o IA_API_KEY) en variables de entorno.',
      );
    }

    if (!apiUrl) {
      return of(
        '❌ URL de IA no configurada. Define NG_APP_IA_API_URL (o IA_API_URL) en variables de entorno.',
      );
    }

    console.log(model, 'URL:', apiUrl);
    console.log(
      '[IA] Runtime env model:',
      (window as any)?.__env__?.NG_APP_IA_MODEL || '(vacío)',
    );

    return from(this.getFirebaseData()).pipe(
      switchMap((firebaseData) => {
        const compactFirebaseData = this.compactFirebaseData(firebaseData);
        const firebaseDataJson = JSON.stringify(compactFirebaseData);

        const trimmedFirebaseDataJson =
          firebaseDataJson.length > this.maxFirebaseJsonChars
            ? `${firebaseDataJson.slice(0, this.maxFirebaseJsonChars)}... [TRUNCADO]`
            : firebaseDataJson;

        const messages: IaChatMessage[] = [
          {
            role: 'system',
            content:
              'Eres un asistente de MappTuu. Solo puedes responder usando como fuente de datos las colecciones de Firebase activity, activityType y plans. Si la pregunta no trata de planes o actividades, debes rechazarla brevemente. Si no hay información suficiente en los datos, responde que no está disponible en Firebase. Los datos pueden venir resumidos o truncados para evitar límites del modelo.',
          },
          {
            role: 'user',
            content: [
              `Pregunta: ${cleanQuestion}`,
              'Datos Firebase (fuente única):',
              trimmedFirebaseDataJson,
            ].join('\n\n'),
          },
        ];

        const candidateModels = [
          model,
          ...(environment.ia.fallbackModels || []),
        ].filter(
          (candidate, index, all) =>
            !!candidate && all.indexOf(candidate) === index,
        );

        const availableCandidateModels = candidateModels.filter(
          (candidate) => !this.unavailableModels.has(candidate),
        );

        const modelsToTry = (
          availableCandidateModels.length > 0
            ? availableCandidateModels
            : candidateModels
        ).slice(0, this.maxModelAttempts);

        return this.requestWithModelChain(
          modelsToTry,
          messages,
          apiKey,
          apiUrl,
        );
      }),
    );
  }

  private requestWithModelChain(
    models: string[],
    messages: IaChatMessage[],
    apiKey: string,
    apiUrl: string,
    index = 0,
  ): Observable<string> {
    const currentModel = models[index];

    if (!currentModel) {
      return throwError(
        () =>
          new Error(
            'No hay modelos disponibles para responder en este momento.',
          ),
      );
    }

    const isFallback = index > 0;

    return this.requestWithModel(
      currentModel,
      messages,
      apiKey,
      apiUrl,
      isFallback,
    ).pipe(
      catchError((error: any): Observable<string> => {
        const shouldTryNext = error?.status === 402 || error?.status === 404;
        const nextModel = models[index + 1];

        if (error?.status === 404) {
          this.unavailableModels.add(currentModel);
        }

        if (!shouldTryNext || !nextModel) {
          return throwError(() => error);
        }

        console.warn(
          `[IA] Modelo ${currentModel} devolvió ${error?.status}. Probando fallback:`,
          nextModel,
        );

        return this.requestWithModelChain(
          models,
          messages,
          apiKey,
          apiUrl,
          index + 1,
        );
      }),
    );
  }

  private requestWithModel(
    model: string,
    messages: IaChatMessage[],
    apiKey: string,
    apiUrl: string,
    isFallback: boolean,
  ) {
    return this.http
      .post<IaChatResponse>(
        apiUrl,
        {
          model,
          messages,
          temperature: 0.2,
        },
        {
          headers: new HttpHeaders({
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          }),
        },
      )
      .pipe(
        retryWhen((errors) =>
          errors.pipe(
            mergeMap((err: any, attempt: number) => {
              if (err?.status !== 429 || attempt >= 3) {
                return throwError(() => err);
              }

              const delayMs = 10000 * Math.pow(2, attempt);
              console.log(
                `429 - esperando ${delayMs / 1000}s antes de reintentar`,
              );

              return timer(delayMs);
            }),
          ),
        ),
        map((response) => {
          const content = response.choices?.[0]?.message?.content?.trim();
          const resolvedContent =
            content ||
            'No he podido generar una respuesta con los datos disponibles.';

          if (!isFallback) {
            return resolvedContent;
          }

          return `[Usando modelo fallback: ${model}]\n\n${resolvedContent}`;
        }),
      );
  }

  private resolveChatCompletionsUrl(apiUrl?: string): string {
    const raw = (apiUrl || '').trim();
    if (!raw) {
      return '';
    }

    if (/\/models\/?$/i.test(raw)) {
      return raw.replace(/\/models\/?$/i, '/chat/completions');
    }

    return raw;
  }

  private compactFirebaseData(firebaseData: IaFirebaseData): IaFirebaseData {
    return {
      activity: firebaseData.activity.slice(0, this.maxDocsPerCollection),
      activityType: firebaseData.activityType.slice(
        0,
        this.maxDocsPerCollection,
      ),
      plans: firebaseData.plans.slice(0, this.maxDocsPerCollection),
    };
  }

  private async getFirebaseData(): Promise<IaFirebaseData> {
    const [activityDocs, activityTypeDocs, plansDocs] = await Promise.all([
      getDocs(collection(this.firestore, 'activity')),
      getDocs(collection(this.firestore, 'activityType')),
      getDocs(collection(this.firestore, 'plans')),
    ]);

    return {
      activity: activityDocs.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })),
      activityType: activityTypeDocs.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })),
      plans: plansDocs.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })),
    };
  }
}
