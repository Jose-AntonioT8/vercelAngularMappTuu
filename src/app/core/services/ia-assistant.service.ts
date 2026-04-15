import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import { collection, getDocs } from 'firebase/firestore';
import {
  Observable,
  catchError,
  firstValueFrom,
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
import { MapsService } from './maps.service';

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
    activityPrices?: (number | undefined)[];
    activityPriceTexts: string[];
    totalPrice?: number;
    totalPriceText: string;
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
    price?: number;
    priceText: string;
    location?: string;
    locationText: string;
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
  /** Servicio de mapas para resolver ubicación legible desde coordenadas. */
  private mapsService = inject(MapsService);
  /** Set de modelos marcados como no disponibles (por ejemplo 404). */
  private readonly unavailableModels = new Set<string>();
  /** Máximo de modelos a intentar por pregunta (principal + fallbacks). */
  private readonly maxModelAttempts = 3;
  /** Límite de documentos a incluir por colección en el contexto. */
  private readonly maxDocsPerCollection = 25;
  /** Límite duro de chars de JSON para evitar prompts gigantes. */
  private readonly maxFirebaseJsonChars = 15000;
  /** Límite de reverse geocoding por pregunta para evitar latencia excesiva. */
  private readonly maxReverseGeocodingLookups = 12;

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
        const assistantContext = this.buildAssistantContext(relationalContext);
        const assistantContextJson = JSON.stringify(assistantContext);
        const trimmedAssistantContextJson =
          assistantContextJson.length > this.maxFirebaseJsonChars
            ? `${assistantContextJson.slice(0, this.maxFirebaseJsonChars)}... [TRUNCADO]`
            : assistantContextJson;

        const messages: IaChatMessage[] = [
          {
            role: 'system',
            content:
              'Eres el asistente de MappTuu. Debes responder con tono amable, cercano y claro. Solo puedes responder con el contexto proporcionado. Si preguntan algo fuera de planes/actividades/tipos/ubicaciones, responde brevemente y con amabilidad que no tienes ese dato. Reglas estrictas: nunca muestres IDs; nunca muestres latitud/longitud; no inventes datos. Si el precio de una actividad no está disponible, di literalmente "Gratis". Cuando hables de planes, indica el nombre del plan, las actividades por nombre y el precio total. Cuando hables de ubicaciones, usa solo texto descriptivo (por ejemplo "Málaga capital").',
          },
          {
            role: 'user',
            content: [
              `Pregunta: ${cleanQuestion}`,
              'Contexto de negocio (sin IDs ni coordenadas):',
              trimmedAssistantContextJson,
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
          const safeContent = this.sanitizeAssistantOutput(resolvedContent);

          if (!isFallback) {
            return safeContent;
          }

          return `[Usando modelo fallback: ${model}]\n\n${safeContent}`;
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
        this.getStringField(plan, ['name', 'title']) || 'Plan sin nombre';
      const activityIds = this.getStringArrayField(plan, ['activitiesIds']);

      const activityNames: string[] = [];
      const activityPrices: (number | undefined)[] = [];
      const activityPriceTexts: string[] = [];
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
          this.getStringField(activity, ['name', 'title']) || 'Actividad sin nombre';
        activityNames.push(activityName);

        const price = this.getNumberField(activity, ['price', 'cost', 'amount']);
        activityPrices.push(price);
        activityPriceTexts.push(this.toPriceText(price));

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

     const totalPrice: number = activityPrices.reduce<number>(
       (sum, price) => sum + (typeof price === 'number' ? price : 0),
       0,
     );

     return {
        planId,
        planName,
        activityIds,
        activityNames,
        activityPrices: activityPrices.length > 0 ? activityPrices : undefined,
        activityPriceTexts,
       totalPrice: totalPrice > 0 ? totalPrice : undefined,
        totalPriceText: totalPrice > 0 ? this.toPriceText(totalPrice) : 'Gratis',
        missingActivityIds,
        activityTypeIds: Array.from(activityTypeIds),
        activityTypeNames: Array.from(activityTypeNames),
      };
    });

    const activitiesWithType = firebaseData.activity.map((activity) => {
      const activityId = this.getStringField(activity, ['id']) || 'sin-id';
      const activityName =
        this.getStringField(activity, ['name', 'title']) || 'Actividad sin nombre';
      const activityTypeId =
        this.getStringField(activity, ['activityTypeId']) || 'sin-tipo';
      const activityType = activityTypesById.get(activityTypeId);
      const activityTypeName =
        this.getStringField(activityType, ['name']) ||
        (activityTypeId === 'sin-tipo' ? 'Tipo no disponible' : 'Tipo no disponible');
      const price = this.getNumberField(activity, ['price', 'cost', 'amount']);
      const location = this.getStringField(activity, [
        'location',
        'city',
        'region',
        'place',
        'address',
      ]);

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
        price,
        priceText: this.toPriceText(price),
        location: location || undefined,
        locationText: location || 'Ubicacion aproximada no disponible',
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
   * Construye un contexto orientado a usuario final, sin IDs ni coordenadas.
   */
  private buildAssistantContext(relationalContext: IaRelationalContext): Record<string, unknown> {
    const plans = relationalContext.plansWithActivities.map((plan) => ({
      planName: plan.planName,
      activities: plan.activityNames.map((name, index) => ({
        name,
        price: plan.activityPriceTexts[index] || 'Gratis',
      })),
      totalPrice: plan.totalPriceText,
    }));

    const activities = relationalContext.activitiesWithType.map((activity) => ({
      activityName: activity.activityName,
      activityTypeName: activity.activityTypeName,
      price: activity.priceText,
      location: activity.locationText,
    }));

    return {
      plans,
      activities,
      stats: relationalContext.stats,
      guidance:
        'No mostrar IDs ni coordenadas. Si falta precio, mostrar Gratis. Si falta ubicacion, indicar que no esta disponible.',
    };
  }

  /**
   * Limpia la salida textual del modelo para evitar IDs/coords en respuesta final.
   */
  private sanitizeAssistantOutput(rawText: string): string {
    let safe = rawText || '';

    safe = safe.replace(/\b(lat(?:itud)?|lng|long(?:itud)?)\b\s*[:=]?\s*-?\d+(?:\.\d+)?/gi, '');
    safe = safe.replace(/-?\d{1,2}\.\d{4,}\s*,\s*-?\d{1,3}\.\d{4,}/g, 'ubicacion aproximada disponible');
    safe = safe.replace(/\b(ids?|id)\s*[:=]\s*[^\n,.;]+/gi, '');
    safe = safe.replace(/\n{3,}/g, '\n\n').trim();

    return safe;
  }

  /**
   * Extrae un campo numérico priorizando las `keys` dadas.
   */
  private getNumberField(
    source: Record<string, unknown> | undefined,
    keys: string[],
  ): number | undefined {
    if (!source) {
      return undefined;
    }

    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === 'string') {
        const normalized = value.replace(',', '.').trim();
        const parsed = Number(normalized);
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }

    return undefined;
  }

  /** Formatea un precio para salida natural al usuario. */
  private toPriceText(price?: number): string {
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
      return 'Gratis';
    }

    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 2,
    }).format(price);
  }

  /**
   * Enriquecer actividades con ubicación descriptiva a partir de lat/lng.
   */
  private async enrichActivitiesWithLocation(
    activities: Array<Record<string, unknown>>,
  ): Promise<Array<Record<string, unknown>>> {
    const enriched = [...activities];
    let lookups = 0;

    for (const activity of enriched) {
      if (lookups >= this.maxReverseGeocodingLookups) {
        break;
      }

      const hasLocationText = this.getStringField(activity, [
        'location',
        'city',
        'region',
        'place',
        'address',
      ]);

      if (hasLocationText) {
        continue;
      }

      const latitude = this.getNumberField(activity, ['latitude', 'lat']);
      const longitude = this.getNumberField(activity, ['longitude', 'lng', 'lon']);

      if (
        typeof latitude !== 'number' ||
        typeof longitude !== 'number' ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      ) {
        continue;
      }

      try {
        const location = await firstValueFrom(
          this.mapsService.getAddress(latitude, longitude),
        );

        if (location && typeof location === 'string') {
          activity['location'] = location;
          lookups += 1;
        }
      } catch (error) {
        console.warn('[IA] No se pudo resolver ubicación por geocoding:', error);
      }
    }

    return enriched;
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

    const activities = activityDocs.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));

    const enrichedActivities = await this.enrichActivitiesWithLocation(activities);

    return {
      activity: enrichedActivities,
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

