

export const environment = {
    production: true,
    CLOUD_NAME: (window as any)['NG_APP_CLOUD_NAME'] || '',
    UPLOAD_PRESET: (window as any)['NG_APP_UPLOAD_PRESET'] || '',
    firebase: {
    apiKey: "AIzaSyC0iCkAwrhlSZ5C5-g01ZbTbupV_3Kh9ew",
    authDomain: "maptuu-e0f68.firebaseapp.com",
    projectId: "maptuu-e0f68",
    storageBucket: "maptuu-e0f68.firebasestorage.app",
    messagingSenderId: "894446902771",
    appId: "1:894446902771:web:59914a0a4c8ab97b218686",
    measurementId: "G-PJC4K4MV6P"
    }
  };