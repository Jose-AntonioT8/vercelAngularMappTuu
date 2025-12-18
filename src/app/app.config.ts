import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideStorage, getStorage } from '@angular/fire/storage';

import { routes } from './app.routes';
import { environment } from './environment/environment'; 

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(),

    // Inicializa Firebase con tus credenciales
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    
    // Inicializa Auth
    provideAuth(() => getAuth()),

    // Inicializa Firestore (Base de Datos)
    provideFirestore(() => getFirestore()), 

    // Inicializa Storage (Almacenamiento de archivos)
    provideStorage(() => getStorage()),
  ]
};