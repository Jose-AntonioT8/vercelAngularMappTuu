import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import { collection, getDocs } from 'firebase/firestore';
import {
  Observable,
  Subject,
  concatMap,
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
 * Resultado normalizado de moderación de imagen en frontend.
 */
export interface IaImageModerationResult {
  /** `true` cuando la imagen debe bloquearse. */
  blocked: boolean;
  /** `true` cuando la imagen es dudosa pero no bloqueada. */
  warning: boolean;
  /** Score normalizado 0..1 calculado por moderación. */
  score: number;
  /** Razones técnicas/funcionales detectadas por la moderación. */
  reasons: string[];
}

/**
 * Tarea encolada para resolver etiqueta de ubicación con IA.
 */
interface LocationLabelTask {
  /** Dirección base obtenida por geocoding para usar como fallback. */
  fallbackAddress: string;
  /** Latitud de la ubicación a etiquetar. */
  latitude: number;
  /** Longitud de la ubicación a etiquetar. */
  longitude: number;
  /** Subject donde se emite la etiqueta final resuelta. */
  response$: Subject<string>;
}

/**
 * Resultado interno de una tarea procesada en la cola de etiquetas.
 */
interface LocationLabelQueueResult {
  /** Tarea original que se está resolviendo. */
  task: LocationLabelTask;
  /** Valor final de etiqueta resultante. */
  value: string;
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
    description?: string;
    highlights: string[];
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
  private readonly maxReverseGeocodingLookups = 20;
  /** Cola para peticiones de etiqueta de ubicación (evita sobrecarga de IA). */
  private readonly locationLabelQueue$ = new Subject<LocationLabelTask>();
  /** Cache en memoria (vive hasta reinicio de app) para etiquetas de ubicación IA. */
  private readonly locationLabelCache = new Map<string, string>();

  /** Regex de “tema permitido” para limitar el dominio del asistente. */
  private readonly allowedTopicPattern =
    /(plan|planes|actividad|actividades|activity|activities|activitytype|activity type|tipo|tipos|ruta|rutas|itinerario|itinerarios|buscar|busca|precio|ubicaci[oó]n|recomend|donde|dónde|cu[aá]nto|gratis|ciudad|zona|lugar)/i;

  /** Palabras que no aportan al filtrado por pregunta (p. ej. "actividades de" → queda "malaga"). */
  private readonly searchStopWords = new Set([
    'a',
    'al',
    'con',
    'de',
    'del',
    'el',
    'en',
    'es',
    'hay',
    'la',
    'las',
    'lo',
    'los',
    'me',
    'mi',
    'que',
    'qué',
    'se',
    'un',
    'una',
    'y',
    'dime',
    'diga',
    'lista',
    'listar',
    'mostrar',
    'muestra',
    'busca',
    'buscar',
    'actividad',
    'actividades',
    'plan',
    'planes',
    'tipo',
    'tipos',
    'cuales',
    'cuáles',
    'cual',
    'cuál',
    'tienes',
    'tengo',
    'puedes',
    'decir',
    'decirme',
  ]);

  /** Inicializa la cola secuencial de resolución de etiquetas de ubicación. */
  constructor() {
    this.locationLabelQueue$
      .pipe(
        concatMap((task: LocationLabelTask) =>
          this.suggestLocationLabel(
            task.fallbackAddress,
            task.latitude,
            task.longitude,
          ).pipe(
            map(
              (value): LocationLabelQueueResult => ({
                task,
                value,
              }),
            ),
            catchError(() =>
              of<LocationLabelQueueResult>({
                task,
                value: task.fallbackAddress,
              }),
            ),
            switchMap((payload) => timer(350).pipe(map(() => payload))),
          ),
        ),
      )
      .subscribe((result: LocationLabelQueueResult) => {
        const { task, value } = result;
        task.response$.next(value);
        task.response$.complete();
      });
  }

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

    const searchTokens = this.extractSearchTokens(cleanQuestion);
    if (
      !this.allowedTopicPattern.test(cleanQuestion) &&
      searchTokens.length === 0
    ) {
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

    return from(this.getFirebaseData(cleanQuestion)).pipe(
      switchMap((firebaseData) => {
        const relevantFirebaseData = this.filterFirebaseDataByQuestion(
          firebaseData,
          searchTokens,
        );
        const compactFirebaseData =
          this.compactFirebaseData(relevantFirebaseData);
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
              'Eres el asistente de MappTuu. Debes responder con tono amable, cercano, claro y algo más desarrollado que una respuesta telegráfica. Solo puedes responder con el contexto proporcionado (actividades y planes filtrados según la pregunta). Si preguntan por una ciudad o zona (por ejemplo Málaga), menciona solo actividades cuya ubicacion en el contexto encaje; si no hay ninguna, dilo con claridad y no inventes. Si preguntan algo fuera de planes/actividades/tipos/ubicaciones, responde brevemente que no tienes ese dato. Reglas estrictas: nunca muestres IDs; nunca muestres latitud/longitud; no inventes datos. Si el precio de una actividad existe, inclúyelo siempre. Si no hay precio disponible o es cero, di literalmente "Gratis". Cuando hables de actividades, explica qué es la actividad, su tipo, su precio, su ubicación descriptiva y, si existen, sus puntos destacados o descripción. Cuando hables de planes, indica el nombre del plan, las actividades por nombre, el precio total y una explicación breve de por qué puede interesar. Usa de 1 a 3 emojis por respuesta. Responde en 2 a 5 frases cuando sea posible.',
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
   * Genera una etiqueta corta de ubicación a partir de geocoding + coordenadas.
   * Usa el proveedor IA configurado y, si falla, devuelve `fallbackAddress`.
   */
  suggestLocationLabel(
    fallbackAddress: string,
    latitude: number,
    longitude: number,
  ): Observable<string> {
    const model = environment.ia.model?.trim();
    const apiKey = environment.ia.apiKey?.trim();
    const rawApiUrl = environment.ia.apiUrl?.trim();
    const apiUrl = this.resolveChatCompletionsUrl(rawApiUrl);

    const cleanAddress = (fallbackAddress || '').trim();
    if (!model || !apiKey || !apiUrl) {
      return of(cleanAddress);
    }

    const messages: IaChatMessage[] = [
      {
        role: 'system',
        content:
          'Eres un asistente de geolocalización. Devuelve solo una etiqueta corta de ubicación humana en español (máximo 5 palabras), por ejemplo "Málaga centro" o "Sevilla, Triana". No uses emojis, ni explicaciones, ni prefijos.',
      },
      {
        role: 'user',
        content: [
          `Direccion base geocodificada: ${cleanAddress || 'sin direccion'}`,
          `Latitud: ${latitude}`,
          `Longitud: ${longitude}`,
          'Devuelve solo la mejor etiqueta corta.',
        ].join('\n'),
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

    return this.requestWithModelChain(modelsToTry, messages, apiKey, apiUrl).pipe(
      map((text) => {
        const normalized = (text || '').trim().replace(/^["']|["']$/g, '');
        if (!normalized) {
          return cleanAddress;
        }
        const firstLine = normalized.split('\n')[0]?.trim() || cleanAddress;
        return firstLine || cleanAddress;
      }),
      catchError(() => of(cleanAddress)),
    );
  }

  /**
   * Igual que `suggestLocationLabel`, pero en cola secuencial para evitar ráfagas.
   */
  suggestLocationLabelQueued(
    fallbackAddress: string,
    latitude: number,
    longitude: number,
  ): Observable<string> {
    const cacheKey = this.buildLocationLabelCacheKey(
      fallbackAddress,
      latitude,
      longitude,
    );
    const cachedValue = this.locationLabelCache.get(cacheKey);
    if (cachedValue) {
      return of(cachedValue);
    }

    const response$ = new Subject<string>();
    this.locationLabelQueue$.next({
      fallbackAddress,
      latitude,
      longitude,
      response$,
    });
    return response$.asObservable().pipe(
      map((value) => {
        const normalized = (value || '').trim();
        const resolved = normalized || fallbackAddress;
        this.locationLabelCache.set(cacheKey, resolved);
        return resolved;
      }),
    );
  }

  /** Modera una imagen remota (URL/data URL) usando modelos de visión de Groq. */
  moderateImageUrlWithGroq(imageUrl: string): Observable<IaImageModerationResult> {
    const apiKey = environment.ia.apiKey?.trim();
    const rawApiUrl = environment.ia.apiUrl?.trim();
    const apiUrl = this.resolveChatCompletionsUrl(rawApiUrl);
    const cleanUrl = (imageUrl || '').trim();

    // Modelos de visión (primer intento: el que mencionas en Groq).
    const visionModels = [
      'meta-llama/llama-4-scout-17b-16e-instruct',
      'meta-llama/llama-4-maverick-17b-128e-instruct',
      'llama-3.2-90b-vision-preview',
    ];

    if (!cleanUrl || !apiKey || !apiUrl) {
      return of({
        blocked: false,
        warning: true,
        score: 0.5,
        reasons: ['groq_moderation_unavailable'],
      });
    }

    return this.requestImageModerationWithModelChain(
      visionModels,
      cleanUrl,
      apiKey,
      apiUrl,
    ).pipe(
      catchError(() =>
        of({
          blocked: false,
          warning: true,
          score: 0.5,
          reasons: ['groq_moderation_request_failed'],
        }),
      ),
    );
  }

  /** Modera un archivo de imagen local transformándolo a data URL antes de enviar a IA. */
  moderateImageFileWithGroq(file: File): Observable<IaImageModerationResult> {
    return from(this.fileToDataUrl(file)).pipe(
      switchMap((dataUrl) => this.moderateImageUrlWithGroq(dataUrl)),
      catchError(() =>
        of({
          blocked: false,
          warning: true,
          score: 0.5,
          reasons: ['groq_moderation_file_encoding_failed'],
        }),
      ),
    );
  }

  /** Construye una clave de cache estable para etiqueta de ubicación. */
  private buildLocationLabelCacheKey(
    fallbackAddress: string,
    latitude: number,
    longitude: number,
  ): string {
    const normalizedAddress = (fallbackAddress || '').trim().toLowerCase();
    const lat = Number.isFinite(latitude) ? latitude.toFixed(5) : 'nan';
    const lon = Number.isFinite(longitude) ? longitude.toFixed(5) : 'nan';
    return `${normalizedAddress}|${lat}|${lon}`;
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
          const enrichedContent = this.addContextualEmojis(safeContent);

          if (!isFallback) {
            return enrichedContent;
          }

          return `[Usando modelo fallback: ${model}]\n\n${enrichedContent}`;
        }),
      );
  }

  /** Ejecuta moderación de imagen con fallback de modelos en cadena. */
  private requestImageModerationWithModelChain(
    models: string[],
    imageUrl: string,
    apiKey: string,
    apiUrl: string,
    index = 0,
  ): Observable<IaImageModerationResult> {
    const currentModel = models[index];
    if (!currentModel) {
      return throwError(() => new Error('No hay modelos disponibles para moderar imagen.'));
    }

    return this.requestImageModerationWithModel(currentModel, imageUrl, apiKey, apiUrl).pipe(
      catchError((error: any) => {
        const status = error?.status;
        const maybeMessage =
          error?.error?.error?.message ||
          error?.error?.message ||
          error?.message ||
          'unknown_error';
        console.warn('[Groq vision] error', { model: currentModel, status, maybeMessage });
        // 403: sin acceso al modelo (p.ej. cuenta sin permiso). También intentamos fallback.
        const shouldTryNext = error?.status === 402 || error?.status === 403 || error?.status === 404;
        const nextModel = models[index + 1];

        if (error?.status === 404) {
          this.unavailableModels.add(currentModel);
        }

        if (error?.status === 403) {
          this.unavailableModels.add(currentModel);
        }

        if (!shouldTryNext || !nextModel) {
          return throwError(() => error);
        }

        return this.requestImageModerationWithModelChain(
          models,
          imageUrl,
          apiKey,
          apiUrl,
          index + 1,
        );
      }),
    );
  }

  /** Llama al endpoint de visión para moderar una imagen con un modelo concreto. */
  private requestImageModerationWithModel(
    model: string,
    imageUrl: string,
    apiKey: string,
    apiUrl: string,
  ): Observable<IaImageModerationResult> {
    const body = {
      model,
      temperature: 0,
      max_completion_tokens: 256,
      top_p: 1,
      stream: false,
      stop: null as null | string | string[],
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analiza esta imagen y responde SOLO JSON con esta forma exacta: {"safe": boolean, "reason": string, "sexual": boolean, "nudity": boolean, "violence": boolean, "minor_risk": boolean}. safe=true solo si TODOS esos campos de riesgo son false.',
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
    };

    return this.http
      .post<IaChatResponse>(apiUrl, body, {
        headers: new HttpHeaders({
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        }),
      })
      .pipe(
        map((response) => {
          const raw = response.choices?.[0]?.message?.content?.trim() || '';
          const parsed = this.parseImageModerationJson(raw);
          const explicitRisk =
            parsed.sexual === true ||
            parsed.nudity === true ||
            parsed.violence === true ||
            parsed.minor_risk === true;
          const safe = parsed.safe === true && !explicitRisk;

          if (safe) {
            return { blocked: false, warning: false, score: 0, reasons: [] };
          }

          const reason = (parsed.reason || 'image_flagged_by_groq').trim();
          return {
            blocked: true,
            warning: false,
            score: 1,
            reasons: [`groq_image_blocked:${reason}`],
          };
        }),
        // En errores (403/400/...), no suprimimos aquí: lo gestiona el call-stack.
      );
  }

  /** Convierte un archivo de imagen a data URL base64 válida para input multimodal. */
  private fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        if (!result.startsWith('data:image/')) {
          reject(new Error('invalid_image_data_url'));
          return;
        }
        resolve(result);
      };
      reader.onerror = () => reject(new Error('file_reader_error'));
      reader.readAsDataURL(file);
    });
  }

  /** Parsea y valida el JSON devuelto por el modelo de visión para moderación. */
  private parseImageModerationJson(rawContent: string): {
    safe?: boolean;
    reason?: string;
    sexual?: boolean;
    nudity?: boolean;
    violence?: boolean;
    minor_risk?: boolean;
  } {
    const raw = (rawContent || '').trim();
    if (!raw) {
      throw new Error('groq_empty_response');
    }

    try {
      const jsonText = raw.match(/\{[\s\S]*\}/)?.[0] ?? raw;
      return JSON.parse(jsonText) as {
        safe?: boolean;
        reason?: string;
        sexual?: boolean;
        nudity?: boolean;
        violence?: boolean;
        minor_risk?: boolean;
      };
    } catch {
      throw new Error('groq_invalid_json');
    }
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
   * Debe recibir datos ya ordenados por relevancia (`filterFirebaseDataByQuestion`).
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
   * Prioriza actividades/planes que encajan con la pregunta (p. ej. "Málaga").
   */
  private filterFirebaseDataByQuestion(
    firebaseData: IaFirebaseData,
    tokens: string[],
  ): IaFirebaseData {
    if (tokens.length === 0) {
      return {
        activity: this.sortRecordsByRating(firebaseData.activity),
        activityType: firebaseData.activityType,
        plans: this.sortRecordsByRating(firebaseData.plans),
      };
    }

    const activityTypesById = new Map<string, Record<string, unknown>>();
    for (const activityType of firebaseData.activityType) {
      const id = this.getStringField(activityType, ['id']);
      if (id) {
        activityTypesById.set(id, activityType);
      }
    }

    const activitiesById = new Map<string, Record<string, unknown>>();
    const scoredActivities = firebaseData.activity.map((activity) => {
      const id = this.getStringField(activity, ['id']);
      if (id) {
        activitiesById.set(id, activity);
      }
      const typeId = this.getActivityTypeId(activity);
      const activityType = activityTypesById.get(typeId);
      const score = this.scoreRecordForSearch(activity, tokens, [
        this.getStringField(activityType, ['name']),
      ]);
      return { record: activity, score };
    });

    const scoredPlans = firebaseData.plans.map((plan) => {
      const activityIds = this.getStringArrayField(plan, [
        'activitiesIds',
        'activityIds',
      ]);
      const linkedTexts = activityIds.flatMap((activityId) => {
        const activity = activitiesById.get(activityId);
        if (!activity) {
          return [];
        }
        return [
          this.getStringField(activity, ['name', 'title']),
          this.getStringField(activity, [
            'location',
            'city',
            'region',
            'place',
            'address',
          ]),
          this.getStringField(activity, ['description', 'details', 'summary']),
        ];
      });
      return {
        record: plan,
        score: this.scoreRecordForSearch(plan, tokens, linkedTexts),
        activityIds,
      };
    });

    const hasActivityHits = scoredActivities.some((item) => item.score > 0);
    const hasPlanHits = scoredPlans.some((item) => item.score > 0);

    const selectedActivityIds = new Set<string>();
    const selectedActivities = (
      hasActivityHits
        ? scoredActivities
            .filter((item) => item.score > 0)
            .sort((a, b) => b.score - a.score)
        : this.sortRecordsByRating(firebaseData.activity).map((record) => ({
            record,
            score: 0,
          }))
    )
      .slice(0, this.maxDocsPerCollection)
      .map((item) => {
        const id = this.getStringField(item.record, ['id']);
        if (id) {
          selectedActivityIds.add(id);
        }
        return item.record;
      });

    const selectedPlans = (
      hasPlanHits
        ? scoredPlans.filter((item) => item.score > 0).sort((a, b) => b.score - a.score)
        : this.sortRecordsByRating(firebaseData.plans).map((record) => ({
            record,
            score: 0,
            activityIds: this.getStringArrayField(record, [
              'activitiesIds',
              'activityIds',
            ]),
          }))
    )
      .slice(0, this.maxDocsPerCollection)
      .map((item) => item.record);

    for (const plan of selectedPlans) {
      for (const activityId of this.getStringArrayField(plan, [
        'activitiesIds',
        'activityIds',
      ])) {
        if (selectedActivityIds.has(activityId)) {
          continue;
        }
        const linked = activitiesById.get(activityId);
        if (linked) {
          selectedActivities.push(linked);
          selectedActivityIds.add(activityId);
        }
      }
    }

    const usedTypeIds = new Set<string>();
    for (const activity of selectedActivities) {
      const typeId = this.getActivityTypeId(activity);
      if (typeId) {
        usedTypeIds.add(typeId);
      }
    }

    const selectedActivityTypes = firebaseData.activityType.filter((type) => {
      const typeId = this.getStringField(type, ['id']);
      return !!typeId && (usedTypeIds.has(typeId) || this.scoreRecordForSearch(type, tokens) > 0);
    });

    return {
      activity: selectedActivities.slice(0, this.maxDocsPerCollection),
      activityType: selectedActivityTypes.slice(0, this.maxDocsPerCollection),
      plans: selectedPlans,
    };
  }

  private extractSearchTokens(question: string): string[] {
    const normalized = this.normalizeSearchText(question);
    return Array.from(
      new Set(
        normalized
          .split(/[^a-z0-9]+/g)
          .map((token) => token.trim())
          .filter(
            (token) => token.length >= 2 && !this.searchStopWords.has(token),
          ),
      ),
    );
  }

  private normalizeSearchText(value: string): string {
    return (value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private scoreRecordForSearch(
    source: Record<string, unknown>,
    tokens: string[],
    extraFields: string[] = [],
  ): number {
    const locationText = this.getStringField(source, [
      'location',
      'city',
      'region',
      'place',
      'address',
    ]);
    const searchableText = this.normalizeSearchText(
      [
        this.getStringField(source, ['name', 'title']),
        this.getStringField(source, [
          'description',
          'details',
          'summary',
          'about',
          'text',
        ]),
        locationText,
        ...this.getStringArrayField(source, [
          'highlights',
          'features',
          'points',
          'bullets',
        ]),
        ...extraFields,
      ].join(' '),
    );

    if (!searchableText) {
      return 0;
    }

    let score = 0;
    for (const token of tokens) {
      if (!searchableText.includes(token)) {
        continue;
      }
      const inLocation = this.normalizeSearchText(locationText).includes(token);
      score += inLocation ? 5 : token.length >= 5 ? 3 : 2;
    }

    return score;
  }

  private sortRecordsByRating(
    records: Array<Record<string, unknown>>,
  ): Array<Record<string, unknown>> {
    return [...records].sort((left, right) => {
      const rightRating = this.getNumberField(right, ['rating']) || 0;
      const leftRating = this.getNumberField(left, ['rating']) || 0;
      return rightRating - leftRating;
    });
  }

  private getActivityTypeId(
    activity: Record<string, unknown> | undefined,
  ): string {
    return this.getStringField(activity, [
      'activityTypeId',
      'IdTypeActivity',
      'typeId',
    ]);
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

        const activityTypeId = this.getActivityTypeId(activity);

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
      const activityTypeId = this.getActivityTypeId(activity) || 'sin-tipo';
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
      const description = this.getStringField(activity, [
        'description',
        'details',
        'summary',
        'about',
        'text',
      ]);
      const highlights = this.getStringArrayField(activity, [
        'highlights',
        'features',
        'points',
        'bullets',
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
        description: description || undefined,
        highlights,
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
      description: activity.description || 'Descripcion no disponible',
      highlights: activity.highlights,
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

  /** Añade emojis relacionados para que la respuesta sea más visual y contextual. */
  private addContextualEmojis(rawText: string): string {
    const text = (rawText || '').trim();
    if (!text) {
      return text;
    }

    const lower = text.toLowerCase();
    const emojiRules: Array<{ emoji: string; keywords: string[] }> = [
      { emoji: '🗺️', keywords: ['plan', 'planes', 'ruta', 'itinerario', 'mapa'] },
      { emoji: '🎯', keywords: ['actividad', 'actividades', 'experiencia'] },
      { emoji: '💶', keywords: ['precio', 'coste', 'costo', 'euros', 'gratis'] },
      { emoji: '📍', keywords: ['ubicacion', 'ubicación', 'localidad', 'zona', 'ciudad'] },
      { emoji: '🍽️', keywords: ['comida', 'restaurante', 'gastronomia', 'gastronomía'] },
      { emoji: '🏖️', keywords: ['playa', 'mar', 'costa'] },
      { emoji: '🏛️', keywords: ['museo', 'cultura', 'historico', 'histórico', 'arte'] },
      { emoji: '🏃', keywords: ['deporte', 'running', 'bicicleta', 'senderismo'] },
      { emoji: '🌅', keywords: ['atardecer', 'paisaje', 'naturaleza'] },
    ];

    const selected: string[] = [];
    for (const rule of emojiRules) {
      const matches = rule.keywords.some((keyword) => lower.includes(keyword));
      if (matches && !selected.includes(rule.emoji)) {
        selected.push(rule.emoji);
      }
      if (selected.length >= 3) {
        break;
      }
    }

    if (selected.length === 0) {
      selected.push('✨');
    }

    const missing = selected.filter((emoji) => !text.includes(emoji)).slice(0, 3);
    if (missing.length === 0) {
      return text;
    }

    return `${text}\n\n${missing.join(' ')}`;
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
   * Enriquece actividades con ubicación descriptiva usando latitude/longitude.
   * Solo se ejecuta cuando hay API key de mapas configurada.
   */
  private async enrichActivitiesWithLocation(
    activities: Array<Record<string, unknown>>,
    maxLookups = this.maxReverseGeocodingLookups,
  ): Promise<Array<Record<string, unknown>>> {
    const mapsApiKey = environment.maps.apiKey?.trim();
    if (!mapsApiKey) {
      return activities;
    }

    const enriched = [...activities];
    let lookups = 0;

    for (const activity of enriched) {
      if (lookups >= maxLookups) {
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
      const longitude = this.getNumberField(activity, [
        'longitude',
        'lng',
        'lon',
      ]);

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

        if (
          typeof location === 'string' &&
          location.trim() !== '' &&
          location !== 'Ubicación no disponible' &&
          location !== 'Ubicación desconocida'
        ) {
          activity['location'] = location;
          lookups += 1;
        }
      } catch {
        // Silencio: maps.service ya maneja errores y fallback.
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
  private async getFirebaseData(question = ''): Promise<IaFirebaseData> {
    const [activityDocs, activityTypeDocs, plansDocs] = await Promise.all([
      getDocs(collection(this.firestore, 'activities')),
      getDocs(collection(this.firestore, 'activityTypes')),
      getDocs(collection(this.firestore, 'plans')),
    ]);

    const activities = activityDocs.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));

    const locationTokens = this.extractSearchTokens(question);
    const enrichedActivities = await this.enrichActivitiesWithLocation(
      activities,
      locationTokens.length > 0
        ? Math.min(activities.length, 40)
        : this.maxReverseGeocodingLookups,
    );

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

