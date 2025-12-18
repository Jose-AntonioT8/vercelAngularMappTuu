import { Observable } from 'rxjs';

/**
 * Clase abstracta base para servicios de gestión de medios (imágenes, videos, etc.)
 * Define la interfaz común que deben implementar todos los servicios de media
 */
export abstract class BaseMediaService<T> {
  /**
   * Sube un archivo (Blob) y retorna un Observable con las URLs resultantes
   * @param blob - El archivo a subir como Blob
   * @returns Observable que emite un array de URLs de los archivos subidos
   */
  abstract upload(blob: Blob): Observable<T[]>;

  /**
   * Sube múltiples archivos
   * @param blobs - Array de Blobs a subir
   * @returns Observable que emite un array de URLs de los archivos subidos
   */
  uploadMultiple(blobs: Blob[]): Observable<T[]> {
    // Implementación por defecto: subir uno por uno
    // Las implementaciones pueden sobrescribir esto para optimización
    const uploads = blobs.map(blob => this.upload(blob));
    return new Observable(observer => {
      const results: T[] = [];
      let completed = 0;
      let hasError = false;

      uploads.forEach((upload$, index) => {
        upload$.subscribe({
          next: (urls) => {
            results[index] = urls[0]; // Asumimos un archivo por upload
            completed++;
            if (completed === uploads.length && !hasError) {
              observer.next(results);
              observer.complete();
            }
          },
          error: (err) => {
            if (!hasError) {
              hasError = true;
              observer.error(err);
            }
          }
        });
      });
    });
  }
}
