import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import { collection, getDocs } from 'firebase/firestore';
import { catchError, from, map, of, switchMap, throwError } from 'rxjs';
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
  private readonly defaultFallbackModels = [
    'meta-llama/llama-3.1-8b-instruct:free',
    'mistralai/mistral-7b-instruct:free',
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
        '❌ Modelo IA no configurado. Define NG_APP_IA_MODEL (ej: meta-llama/llama-3.1-8b-instruct:free) en variables de entorno.',
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

        const fallbackModels = [
          ...(environment.ia.fallbackModels || []),
          ...this.defaultFallbackModels,
        ].filter(
          (candidate, index, all) =>
            !!candidate && all.indexOf(candidate) === index,
        );

        return this.requestWithModel(model, messages, apiKey, false).pipe(
          catchError((error: any) => {
            if (error?.status !== 404) {
              return throwError(() => error);
            }

            const nextModel = fallbackModels.find(
              (candidate) => candidate !== model,
            );

            if (!nextModel) {
              return throwError(() => error);
            }

            console.warn(
              '[IA] Modelo principal devolvió 404. Probando fallback:',
              nextModel,
            );
            return this.requestWithModel(nextModel, messages, apiKey, true);
          }),
        );
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
