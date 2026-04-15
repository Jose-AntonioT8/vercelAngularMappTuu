/**
 * Mapa de variables de entorno en runtime.
 *
 * Estas claves se inyectan en `window.__env__` (generado por `scripts/generate-env.js`)
 * para evitar hardcodear secretos en el bundle.
 */
type RuntimeEnv = Record<string, unknown>;

/** Raíz de runtime (normalmente `window`). */
const runtimeRoot = window as any;
/** Entorno runtime leído desde `window.__env__` si existe. */
const runtimeEnv = (runtimeRoot.__env__ || runtimeRoot) as RuntimeEnv;
/** Sub-objeto opcional `firebase` dentro del runtime env. */
const runtimeFirebase = (runtimeEnv['firebase'] || {}) as RuntimeEnv;

/**
 * Valida si un string representa un valor “real” de entorno.
 *
 * Filtra placeholders típicos (`undefined`, `null`, `${...}`, etc.).
 */
const isValidEnvValue = (value: string): boolean => {
  const normalized = value.trim();
  if (!normalized) {
    return false;
  }

  const lower = normalized.toLowerCase();
  if (lower === 'undefined' || lower === 'null') {
    return false;
  }

  if (normalized.includes('${') || normalized.includes('@@')) {
    return false;
  }

  return true;
};

/**
 * Lee una variable de entorno en runtime probando varias claves (aliases).
 * Devuelve string vacío si no encuentra un valor válido.
 */
const readEnv = (...keys: string[]): string => {
  for (const key of keys) {
    const value = runtimeEnv[key];
    if (typeof value === 'string') {
      const sanitized = value.trim().replace(/^['\"]|['\"]$/g, '');
      if (isValidEnvValue(sanitized)) {
        return sanitized;
      }
    }
  }

  return '';
};

/**
 * Lee configuración de Firebase priorizando:
 * 1) `window.__env__.firebase[field]` si existe,
 * 2) aliases de nivel raíz (por ejemplo `NG_APP_*` y `FIREBASE_*`).
 */
const readFirebaseEnv = (field: string, ...aliases: string[]): string => {
  const nestedValue = runtimeFirebase[field];
  if (typeof nestedValue === 'string') {
    const sanitized = nestedValue.trim().replace(/^['\"]|['\"]$/g, '');
    if (isValidEnvValue(sanitized)) {
      return sanitized;
    }
  }

  return readEnv(...aliases);
};

/** Lee una lista separada por comas desde el env runtime. */
const readEnvArray = (...keys: string[]): string[] => {
  const raw = readEnv(...keys);
  if (!raw) {
    return [];
  }

  return raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => isValidEnvValue(value));
};

/**
 * Configuración de entorno consumida por la aplicación.
 *
 * Nota: aunque el campo se llame `production`, en este proyecto se usa runtime env
 * también en desarrollo. El valor depende del build/configuración.
 */
export const environment = {
  production: true,
  CLOUD_NAME: readEnv('NG_APP_CLOUDINARY_CLOUD_NAME'),
  UPLOAD_PRESET: readEnv('NG_APP_UPLOAD_PRESET'),
  CLOUDINARY_API_KEY: readEnv('NG_APP_CLOUDINARY_API_KEY'),
  ia: {
    model: readEnv('NG_APP_IA_MODEL', 'IA_MODEL'),
    apiUrl:
      readEnv('NG_APP_IA_API_URL', 'IA_API_URL') ||
      'https://api.groq.com/openai/v1/chat/completions',
    apiKey: readEnv('NG_APP_IA_API_KEY', 'IA_API_KEY'),
    fallbackModels: readEnvArray(
      'NG_APP_IA_FALLBACK_MODELS',
      'IA_FALLBACK_MODELS',
    ),
  },
  maps: {
    apiKey: readEnv(
      'NG_APP_MAPS_API_KEY',
      'MAPS_API_KEY',
      'NG_APP_GOOGLE_MAPS_API_KEY',
      'GOOGLE_MAPS_API_KEY',
    ),
  },
  firebase: {
    apiKey: readFirebaseEnv(
      'apiKey',
      'NG_APP_API_KEY',
      'NG_APP_FIREBASE_API_KEY',
      'FIREBASE_API_KEY',
    ),
    authDomain: readFirebaseEnv(
      'authDomain',
      'NG_APP_AUTH_DOMAIN',
      'FIREBASE_AUTH_DOMAIN',
    ),
    projectId: readFirebaseEnv(
      'projectId',
      'NG_APP_PROJECT_ID',
      'FIREBASE_PROJECT_ID',
    ),
    storageBucket: readFirebaseEnv(
      'storageBucket',
      'NG_APP_STORAGE_BUCKET',
      'FIREBASE_STORAGE_BUCKET',
    ),
    messagingSenderId: readFirebaseEnv(
      'messagingSenderId',
      'NG_APP_MESSAGING_SENDER_ID',
      'FIREBASE_MESSAGING_SENDER_ID',
    ),
    appId: readFirebaseEnv('appId', 'NG_APP_APP_ID', 'FIREBASE_APP_ID'),
    measurementId: readFirebaseEnv(
      'measurementId',
      'NG_APP_MEASUREMENT_ID',
      'FIREBASE_MEASUREMENT_ID',
    ),
  },
};

/** Lista de campos Firebase requeridos que no están presentes en runtime. */
const missingFirebaseFields = Object.entries(environment.firebase)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingFirebaseFields.length > 0) {
  console.warn(
    `[Firebase config] Faltan variables en runtime: ${missingFirebaseFields.join(', ')}.`,
  );
}
