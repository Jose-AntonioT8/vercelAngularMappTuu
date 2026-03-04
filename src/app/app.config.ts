import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideStorage, getStorage } from '@angular/fire/storage';

import { routes } from './app.routes';
import { environment } from './environment/environment'; 

/**
 * Configuración global de la aplicación (standalone).
 *
 * Aquí se registran los proveedores transversales:
 * - **Router**: definición de rutas y binding de inputs desde params/query.
 * - **HttpClient**: acceso a la API HTTP.
 * - **Firebase**: inicialización centralizada (Auth/Firestore/Storage).
 *
 * Nota: mover la inicialización a un único punto evita estados inconsistentes
 * (p.ej. múltiples instancias de Firebase) y facilita el despliegue por entorno
 * vía `environment`.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(),

    provideFirebaseApp(() => initializeApp(environment.firebase)),
    
    provideAuth(() => getAuth()),

    provideFirestore(() => getFirestore()), 

    provideStorage(() => getStorage()),
  ]
};