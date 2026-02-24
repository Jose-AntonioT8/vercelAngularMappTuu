import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import { collection, getDocs } from 'firebase/firestore';
import { from, map, of, switchMap } from 'rxjs';
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

    if (!environment.ia.model) {
      return of(
        'El modelo de IA no está configurado. Deja definido NG_APP_IA_MODEL en tu entorno runtime.',
      );
    }

    if (!environment.ia.apiKey) {
      return of(
        'Falta la API key de IA. Define NG_APP_IA_API_KEY en tu entorno runtime.',
      );
    }

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

        return this.http
          .post<IaChatResponse>(
            environment.ia.apiUrl,
            {
              model: environment.ia.model,
              messages,
              temperature: 0.2,
            },
            {
              headers: new HttpHeaders({
                Authorization: `Bearer ${environment.ia.apiKey}`,
                'Content-Type': 'application/json',
              }),
            },
          )
          .pipe(
            map((response) => {
              const content = response.choices?.[0]?.message?.content?.trim();
              return (
                content ||
                'No he podido generar una respuesta con los datos disponibles.'
              );
            }),
          );
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
