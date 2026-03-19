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
import { environment } from '../../../app/environment/environment';

/**
 * Mensaje en formato chat enviado al proveedor de IA.
 */
interface IaChatMessage {
  /** Rol del mensaje (system/user). */
  role: 'system' | 'user';
  /** Contenido textual del mensaje. */
  content: string;
}

/**
 * Respuesta mínima esperada del proveedor (compatible con OpenAI-like).
 */
interface IaChatResponse {
  /** Lista de elecciones/respuestas candidatas. */
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

/**
 * Dataset base obtenido desde Firebase para construir contexto.
 */
interface IaFirebaseData {
  /** Colección `activities` serializada. */
  activity: Array<Record<string, unknown>>;
  /** Colección `activityTypes` serializada. */
  activityType: Array<Record<string, unknown>>;
  /** Colección `plans` serializada. */
  plans: Array<Record<string, unknown>>;
}

/**
 * Contexto relacional derivado (IDs enlazados) para mejorar respuestas y trazabilidad.
 */
interface IaRelationalContext {
  /** Planes con actividades resueltas (IDs ↔ nombres) y faltantes detectados. */
  plansWithActivities: Array<{
    planId: string;
    planName: string;
    activityIds: string[];
    activityNames: string[];
    missingActivityIds: string[];
    activityTypeIds: string[];
    activityTypeNames: string[];
  }>;
  /** Actividades con su tipo asociado resuelto. */
  activitiesWithType: Array<{
    activityId: string;
    activityName: string;
    activityTypeId: string;
    activityTypeName: string;
  }>;
  /** Actividades que no se pudieron asociar a un tipo. */
  orphanActivities: Array<{
    activityId: string;
    activityName: string;
    activityTypeId: string;
    activityTypeName: string;
  }>;
  /** Tipos de actividad que no aparecen en ninguna actividad. */
  orphanActivityTypes: Array<{
    activityTypeId: string;
    activityTypeName: string;
  }>;
  /** Relación inversa: actividad → planes donde aparece. */
  activityToPlans: Array<{
    activityId: string;
    activityName: string;
    planIds: string[];
    planNames: string[];
  }>;
  /** Relación inversa: tipo → actividades que lo usan. */
  activityTypeToActivities: Array<{
    activityTypeId: string;
    activityTypeName: string;
    activityIds: string[];
    activityNames: string[];
  }>;
  /** Estadísticas agregadas para debugging/observabilidad. */
  stats: {
    totalPlans: number;
    totalActivities: number;
    totalActivityTypes: number;
    missingActivityLinksInPlans: number;
    activitiesWithoutType: number;
  };
}

/**
 * Asistente IA acotado al dominio de MapTuu.
 *
 * Objetivo:
 * - Responder preguntas **solo** sobre planes, actividades y tipos de actividad,
 *   usando como fuente de datos Firebase (colecciones `activities`, `activityTypes`, `plans`).
 *
 * Decisiones de diseño:
 * - Se construye un **contexto relacional** (IDs enlazados) para mejorar respuestas
 *   y reducir alucinaciones (ej: plan.activitiesIds -> activity.id).
 * - Se aplican límites de tamaño (`maxFirebaseJsonChars`, `maxDocsPerCollection`)
 *   para evitar que el prompt exceda límites del proveedor.
 * - Se soporta cadena de modelos (principal + fallbacks) con manejo de errores 402/404/429.
 */
@Injectable({ providedIn: 'root' })
export class IaAssistantService {
  /** Instancia Firestore para lecturas puntuales de colecciones. */
  private firestore = inject(Firestore);
  /** Cliente HTTP para llamar al proveedor de IA (chat completions). */
  private http = inject(HttpClient);
  /** Set de modelos marcados como no disponibles (por ejemplo 404). */
  private readonly unavailableModels = new Set<string>();
  /** Máximo de modelos a intentar por pregunta (principal + fallbacks). */
  private readonly maxModelAttempts = 3;
  /** Límite de documentos a incluir por colección en el contexto. */
  private readonly maxDocsPerCollection = 25;
  /** Límite duro de chars de JSON para evitar prompts gigantes. */
  private readonly maxFirebaseJsonChars = 15000;

  /** Regex de “tema permitido” para limitar el dominio del asistente. */
  private readonly allowedTopicPattern =
    /(plan|planes|actividad|actividades|activity|activities|activitytype|activity type|tipo|tipos|ruta|rutas|itinerario|itinerarios)/i;

  /**
   * Punto de entrada del asistente.
   *
   * Devuelve un Observable para integrarse bien con Angular/RxJS.
   * Internamente:
   * - valida dominio
   * - construye contexto desde Firebase
   * - ejecuta petición a proveedor con cadena de modelos
   *
   * Reglas:
   * - Si la pregunta no trata sobre el dominio permitido, se rechaza.
   * - Si falta configuración (modelo/API key/URL), devuelve un mensaje de error controlado.
   *
   * @param question Pregunta del usuario (texto libre).
   * @returns Observable con la respuesta en texto.
   */
  ask(question: string): Observable<string> {
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
        const relationalContext =
          this.buildRelationalContext(compactFirebaseData);
        const firebaseDataJson = JSON.stringify(compactFirebaseData);
        const relationalContextJson = JSON.stringify(relationalContext);

        const trimmedFirebaseDataJson =
          firebaseDataJson.length > this.maxFirebaseJsonChars
            ? `${firebaseDataJson.slice(0, this.maxFirebaseJsonChars)}... [TRUNCADO]`
            : firebaseDataJson;

        const trimmedRelationalContextJson =
          relationalContextJson.length > this.maxFirebaseJsonChars
            ? `${relationalContextJson.slice(0, this.maxFirebaseJsonChars)}... [TRUNCADO]`
            : relationalContextJson;

        const messages: IaChatMessage[] = [
          {
            role: 'system',
            content:
              'Eres un asistente de MappTuu. Solo puedes responder usando como fuente de datos las colecciones de Firebase activities, activityTypes y plans y el contexto relacional derivado de esos datos. Si la pregunta no trata de planes o actividades, debes rechazarla brevemente. Siempre prioriza relaciones por IDs: plans.activitiesIds -> activity.id y activity.activityTypeId -> activityType.id. Usa también relaciones inversas (activityToPlans y activityTypeToActivities) para responder mejor. Si falta información, di que no está disponible en Firebase. Los datos pueden venir resumidos o truncados para evitar límites del modelo.',
          },
          {
            role: 'user',
            content: [
              `Pregunta: ${cleanQuestion}`,
              'Datos Firebase (fuente única):',
              trimmedFirebaseDataJson,
              'Contexto relacional precalculado (IDs enlazados):',
              trimmedRelationalContextJson,
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

  /**
   * Ejecuta la petición probando modelos en cadena (principal + fallbacks).
   *
   * @param models Lista de modelos a intentar, en orden.
   * @param messages Prompt en formato chat.
   * @param apiKey API key del proveedor.
   * @param apiUrl Endpoint de chat completions.
   * @param index Índice actual dentro de `models`.
   */
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

  /**
   * Lanza una petición al endpoint de chat completions.
   *
   * Manejo:
   * - Reintentos exponenciales ante 429 (rate limit).
   * - Devuelve contenido de `choices[0].message.content` o mensaje “fallback”.
   */
  private requestWithModel(
    model: string,
    messages: IaChatMessage[],
    apiKey: string,
    apiUrl: string,
    isFallback: boolean,
  ): Observable<string> {
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

  /**
   * Normaliza URLs configuradas y ajusta `/models` -> `/chat/completions` si aplica.
   */
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

  /**
   * Reduce tamaño del dataset para mantener el prompt dentro de límites razonables.
   */
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

  /**
   * Construye relaciones entre planes/actividades/tipos a partir de IDs.
   *
   * @param firebaseData Dataset (posiblemente compacto) de Firebase.
   * @returns Estructura relacional usada como “memoria” para el modelo.
   */
  private buildRelationalContext(
    firebaseData: IaFirebaseData,
  ): IaRelationalContext {
    const activitiesById = new Map<string, Record<string, unknown>>();
    const activityTypesById = new Map<string, Record<string, unknown>>();
    const planRefsByActivityId = new Map<
      string,
      { planId: string; planName: string }[]
    >();
    const activitiesByTypeId = new Map<
      string,
      { activityId: string; activityName: string }[]
    >();
    const usedActivityIds = new Set<string>();
    const usedActivityTypeIds = new Set<string>();
    let missingActivityLinksInPlans = 0;
    let activitiesWithoutType = 0;

    for (const activity of firebaseData.activity) {
      const activityId = this.getStringField(activity, ['id']);
      if (!activityId) {
        continue;
      }
      activitiesById.set(activityId, activity);
    }

    for (const activityType of firebaseData.activityType) {
      const activityTypeId = this.getStringField(activityType, ['id']);
      if (!activityTypeId) {
        continue;
      }
      activityTypesById.set(activityTypeId, activityType);
    }

    const plansWithActivities = firebaseData.plans.map((plan) => {
      const planId = this.getStringField(plan, ['id']) || 'sin-id';
      const planName =
        this.getStringField(plan, ['name', 'title']) || 'Sin nombre';
      const activityIds = this.getStringArrayField(plan, ['activitiesIds']);

      const activityNames: string[] = [];
      const missingActivityIds: string[] = [];
      const activityTypeIds = new Set<string>();
      const activityTypeNames = new Set<string>();

      for (const activityId of activityIds) {
        const activity = activitiesById.get(activityId);
        if (!activity) {
          missingActivityIds.push(activityId);
          continue;
        }

        usedActivityIds.add(activityId);

        const activityName =
          this.getStringField(activity, ['name', 'title']) || activityId;
        activityNames.push(activityName);

        const plansForActivity = planRefsByActivityId.get(activityId) || [];
        plansForActivity.push({ planId, planName });
        planRefsByActivityId.set(activityId, plansForActivity);

        const activityTypeId = this.getStringField(activity, [
          'activityTypeId',
        ]);

        if (!activityTypeId) {
          activitiesWithoutType += 1;
          continue;
        }

        activityTypeIds.add(activityTypeId);
        usedActivityTypeIds.add(activityTypeId);

        const activityType = activityTypesById.get(activityTypeId);
        const activityTypeName =
          this.getStringField(activityType, ['name']) || activityTypeId;
        activityTypeNames.add(activityTypeName);

        const activitiesForType = activitiesByTypeId.get(activityTypeId) || [];
        activitiesForType.push({ activityId, activityName });
        activitiesByTypeId.set(activityTypeId, activitiesForType);
      }

      missingActivityLinksInPlans += missingActivityIds.length;

      return {
        planId,
        planName,
        activityIds,
        activityNames,
        missingActivityIds,
        activityTypeIds: Array.from(activityTypeIds),
        activityTypeNames: Array.from(activityTypeNames),
      };
    });

    const activitiesWithType = firebaseData.activity.map((activity) => {
      const activityId = this.getStringField(activity, ['id']) || 'sin-id';
      const activityName =
        this.getStringField(activity, ['name', 'title']) || 'Sin nombre';
      const activityTypeId =
        this.getStringField(activity, ['activityTypeId']) || 'sin-tipo';
      const activityType = activityTypesById.get(activityTypeId);
      const activityTypeName =
        this.getStringField(activityType, ['name']) ||
        (activityTypeId === 'sin-tipo' ? 'Sin tipo' : activityTypeId);

      if (activityTypeId !== 'sin-tipo') {
        usedActivityTypeIds.add(activityTypeId);

        const activitiesForType = activitiesByTypeId.get(activityTypeId) || [];
        if (!activitiesForType.some((item) => item.activityId === activityId)) {
          activitiesForType.push({ activityId, activityName });
          activitiesByTypeId.set(activityTypeId, activitiesForType);
        }
      } else {
        activitiesWithoutType += 1;
      }

      return {
        activityId,
        activityName,
        activityTypeId,
        activityTypeName,
      };
    });

    const orphanActivities = activitiesWithType.filter(
      (activity) => !usedActivityIds.has(activity.activityId),
    );

    const orphanActivityTypes = Array.from(activityTypesById.entries())
      .filter(([activityTypeId]) => !usedActivityTypeIds.has(activityTypeId))
      .map(([activityTypeId, activityType]) => ({
        activityTypeId,
        activityTypeName:
          this.getStringField(activityType, ['name']) || activityTypeId,
      }));

    const activityToPlans = Array.from(planRefsByActivityId.entries()).map(
      ([activityId, planRefs]) => {
        const activity = activitiesById.get(activityId);
        const activityName =
          this.getStringField(activity, ['name', 'title']) || activityId;

        return {
          activityId,
          activityName,
          planIds: planRefs.map((item) => item.planId),
          planNames: planRefs.map((item) => item.planName),
        };
      },
    );

    const activityTypeToActivities = Array.from(
      activitiesByTypeId.entries(),
    ).map(([activityTypeId, activityRefs]) => {
      const activityType = activityTypesById.get(activityTypeId);
      const activityTypeName =
        this.getStringField(activityType, ['name']) || activityTypeId;

      return {
        activityTypeId,
        activityTypeName,
        activityIds: activityRefs.map((item) => item.activityId),
        activityNames: activityRefs.map((item) => item.activityName),
      };
    });

    return {
      plansWithActivities,
      activitiesWithType,
      orphanActivities,
      orphanActivityTypes,
      activityToPlans,
      activityTypeToActivities,
      stats: {
        totalPlans: firebaseData.plans.length,
        totalActivities: firebaseData.activity.length,
        totalActivityTypes: firebaseData.activityType.length,
        missingActivityLinksInPlans,
        activitiesWithoutType,
      },
    };
  }

  /**
   * Extrae un campo string priorizando las `keys` dadas.
   *
   * @returns string normalizada (trim) o string vacío si no existe.
   */
  private getStringField(
    source: Record<string, unknown> | undefined,
    keys: string[],
  ): string {
    if (!source) {
      return '';
    }

    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string') {
        const normalized = value.trim();
        if (normalized) {
          return normalized;
        }
      }
    }

    return '';
  }

  /**
   * Extrae un campo `string[]` priorizando las `keys` dadas.
   *
   * @returns array normalizado (sin vacíos) o [] si no existe.
   */
  private getStringArrayField(
    source: Record<string, unknown> | undefined,
    keys: string[],
  ): string[] {
    if (!source) {
      return [];
    }

    for (const key of keys) {
      const value = source[key];
      if (!Array.isArray(value)) {
        continue;
      }

      const normalizedValues = value
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter((item) => !!item);

      if (normalizedValues.length > 0) {
        return normalizedValues;
      }
    }

    return [];
  }

  /**
   * Carga datos desde Firebase (colecciones de dominio) y los transforma en JSON simple.
   *
   * Nota: se usa `getDocs` (snapshot puntual) para componer contexto; no mantiene listener.
   */
  private async getFirebaseData(): Promise<IaFirebaseData> {
    const [activityDocs, activityTypeDocs, plansDocs] = await Promise.all([
      getDocs(collection(this.firestore, 'activities')),
      getDocs(collection(this.firestore, 'activityTypes')),
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
