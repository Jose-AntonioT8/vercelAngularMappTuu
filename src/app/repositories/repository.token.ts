import { InjectionToken } from '@angular/core';

/**
 * Token de inyección para opciones/configuración de Firebase.
 *
 * Se usa para desacoplar el consumo de configuración (en providers) del origen
 * real de la misma (runtime env, environment, etc.).
 */
export const FIREBASEOPTIONS = new InjectionToken<any>('firebase.config');