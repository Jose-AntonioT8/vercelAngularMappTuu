const runtimeEnv = ((window as any).__env__ || (window as any)) as Record<
  string,
  string | undefined
>;

const readEnv = (...keys: string[]): string => {
  for (const key of keys) {
    const value = runtimeEnv[key];
    if (typeof value === 'string') {
      const sanitized = value.trim().replace(/^['\"]|['\"]$/g, '');
      if (sanitized) {
        return sanitized;
      }
    }
  }

  return '';
};

export const environment = {
  production: true,
  CLOUD_NAME: readEnv('NG_APP_CLOUDINARY_CLOUD_NAME'),
  UPLOAD_PRESET: readEnv('NG_APP_UPLOAD_PRESET'),
  CLOUDINARY_API_KEY: readEnv('NG_APP_CLOUDINARY_API_KEY'),
  firebase: {
    apiKey: readEnv('NG_APP_API_KEY'),
    authDomain: readEnv('NG_APP_AUTH_DOMAIN'),
    projectId: readEnv('NG_APP_PROJECT_ID'),
    storageBucket: readEnv('NG_APP_STORAGE_BUCKET'),
    messagingSenderId: readEnv('NG_APP_MESSAGING_SENDER_ID'),
    appId: readEnv('NG_APP_APP_ID'),
    measurementId: readEnv('NG_APP_MEASUREMENT_ID'),
  },
};
