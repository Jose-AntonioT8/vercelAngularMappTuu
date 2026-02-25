import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import { collection, getDocs } from 'firebase/firestore';
import {
  Observable,
  catchError,
  from,
  map,
  of,
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
  private readonly fallbackRetryDelayMs = 2500;
  private readonly defaultFallbackModels = [
    'openai/gpt-oss-20b:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'openai/gpt-oss-120b:free',
    'mistralai/mistral-small-3.1-24b-instruct:free',
    'google/gemma-3-12b-it:free',
  ];

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

    if (!model || model === '') {
      return of(
        '❌ Modelo IA no configurado. Define NG_APP_IA_MODEL (ej: meta-llama/llama-3.3-70b-instruct:free) en variables de entorno.',
      );
    }

    if (!apiKey || apiKey === '') {
      return of(
        '❌ API key no configurada. Define NG_APP_IA_API_KEY en variables de entorno (obtén gratis en openrouter.ai).',
      );
    }

    console.log(
      '[IA] Llamando OpenRouter con modelo:',
      model,
      'URL:',
      environment.ia.apiUrl,
    );
    console.log(
      '[IA] Runtime env model:',
      (window as any)?.__env__?.NG_APP_IA_MODEL || '(vacío)',
    );

    return from(this.getFirebaseData()).pipe(
      switchMap((firebaseData) => {
        const messages: IaChatMessage[] = [
          {
            role: 'system',
            content:
              'Eres un asistente de MappTuu. Solo puedes responder usando como fuente de datos las colecciones de Firebase activity, activityType y plans. Si la pregunta no trata de planes o actividades, debes rechazarla brevemente. Si no hay información suficiente en los datos, responde que no está disponible en Firebase.',
          },
          {
            role: 'user',
            content: [
              `Pregunta: ${cleanQuestion}`,
              'Datos Firebase (fuente única):',
              JSON.stringify(firebaseData),
            ].join('\n\n'),
          },
        ];

        const candidateModels = [
          ...this.buildModelVariants(model),
          ...(environment.ia.fallbackModels || []),
          ...this.defaultFallbackModels,
        ].filter(
          (candidate, index, all) =>
            !!candidate && all.indexOf(candidate) === index,
        );

        const preferFreeModels = this.isFreeModel(model);
        const filteredCandidateModels = preferFreeModels
          ? candidateModels.filter((candidate) => this.isFreeModel(candidate))
          : candidateModels;

        const availableCandidateModels = filteredCandidateModels.filter(
          (candidate) => !this.unavailableModels.has(candidate),
        );

        return this.requestWithModelChain(
          availableCandidateModels,
          messages,
          apiKey,
        );
      }),
    );
  }

  private requestWithModelChain(
    models: string[],
    messages: IaChatMessage[],
    apiKey: string,
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
      isFallback,
    ).pipe(
      catchError((error: any): Observable<string> => {
        const shouldTryNext =
          error?.status === 402 ||
          error?.status === 404 ||
          error?.status === 429;
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

        if (error?.status === 429) {
          console.info(
            `[IA] Esperando ${this.fallbackRetryDelayMs}ms antes de reintentar con fallback.`,
          );
          return timer(this.fallbackRetryDelayMs).pipe(
            switchMap(() =>
              this.requestWithModelChain(models, messages, apiKey, index + 1),
            ),
          );
        }

        return this.requestWithModelChain(models, messages, apiKey, index + 1);
      }),
    );
  }

  private requestWithModel(
    model: string,
    messages: IaChatMessage[],
    apiKey: string,
    isFallback: boolean,
  ) {
    return this.http
      .post<IaChatResponse>(
        environment.ia.apiUrl,
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

  private buildModelVariants(model: string): string[] {
    const variants = [model];

    if (!model.endsWith(':free')) {
      variants.push(`${model}:free`);
    }

    if (model.endsWith(':exacto')) {
      variants.push(model.replace(/:exacto$/, ''));
    }

    return variants;
  }

  private isFreeModel(model: string): boolean {
    return model.endsWith(':free');
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
