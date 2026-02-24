type RuntimeEnv = Record<string, unknown>;

const runtimeRoot = window as any;
const runtimeEnv = (runtimeRoot.__env__ || runtimeRoot) as RuntimeEnv;
const runtimeFirebase = (runtimeEnv['firebase'] || {}) as RuntimeEnv;

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

export const environment = {
  production: true,
  CLOUD_NAME: readEnv('NG_APP_CLOUDINARY_CLOUD_NAME'),
  UPLOAD_PRESET: readEnv('NG_APP_UPLOAD_PRESET'),
  CLOUDINARY_API_KEY: readEnv('NG_APP_CLOUDINARY_API_KEY'),
  ia: {
    model: readEnv('NG_APP_IA_MODEL'),
    apiUrl:
      readEnv('NG_APP_IA_API_URL') ||
      'https://openrouter.ai/api/v1/chat/completions',
    apiKey: readEnv('NG_APP_IA_API_KEY'),
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

const missingFirebaseFields = Object.entries(environment.firebase)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingFirebaseFields.length > 0) {
  console.warn(
    `[Firebase config] Faltan variables en runtime: ${missingFirebaseFields.join(', ')}.`,
  );
}
