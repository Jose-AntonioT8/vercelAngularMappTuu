

export const environment = {
    production: true,
    CLOUD_NAME: (window as any)['NG_APP_CLOUDINARY_CLOUD_NAME'] || '',
    UPLOAD_PRESET: (window as any)['NG_APP_UPLOAD_PRESET'] || '',
    firebase: {
    apiKey: (window as any)['NG_APP_API_KEY'] || '',
    authDomain: (window as any)['NG_APP_AUTH_DOMAIN'] || '',
    projectId: (window as any)['NG_APP_PROJECT_ID'] || '',
    storageBucket: (window as any)['NG_APP_STORAGE_BUCKET'] || '',
    messagingSenderId: (window as any)['NG_APP_MESSAGING_SENDER_ID'] || '',
    appId: (window as any)['NG_APP_APP_ID'] || '',
    measurementId: (window as any)['NG_APP_MEASUREMENT_ID'] || ''
    }
  };