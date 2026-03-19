import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';
import { AuthService } from './auth.service';

/**
 * Servicio de subida de media a Cloudinary.
 *
 * Se usa desde el frontend para subir imágenes (u otros blobs) a una carpeta
 * lógica de Cloudinary. Requiere que exista un usuario autenticado en
 * `AuthService` para poder adjuntar metadatos de trazabilidad.
 *
 * Nota de seguridad:
 * - El `api_key` de Cloudinary **no es un secreto** (no es el `api_secret`).
 *   La autorización real debe estar gobernada por el `upload_preset` y, si se
 *   necesita control más estricto, por un flujo firmado desde backend.
 */
@Injectable({
  providedIn: 'root'
})
export class CloudinaryService {
  /** Servicio de auth para obtener el usuario actual (trazabilidad). */
  private authService = inject(AuthService);
  /** Cloud name de Cloudinary (parte de la URL del endpoint). */
  private readonly CLOUD_NAME = environment.CLOUD_NAME;
  /** Upload preset (gobierna permisos/transformaciones del upload no firmado). */
  private readonly UPLOAD_PRESET = environment.UPLOAD_PRESET;

  /**
   * Sube un `Blob` a Cloudinary y devuelve las URLs seguras resultantes.
   *
   * @param blob Fichero binario (por ejemplo, una imagen) a subir.
   * @param folder Carpeta lógica destino en Cloudinary (por defecto `uploads`).
   *
   * @throws Error si no hay usuario autenticado.
   * @returns Observable que emite una lista de URLs (`secure_url`) y completa.
   */
  public upload(blob: Blob, folder: string = 'uploads'): Observable<string[]> {
    return new Observable(observer => {
      const user = this.authService.currentUser;
      if (!user) {
        observer.error('Usuario no autenticado');
        return;
      }

      const formData = new FormData();
      formData.append('file', blob);
      formData.append('upload_preset', this.UPLOAD_PRESET);
      formData.append('folder', folder);
      formData.append('context', `uploaded-by=${user.uid}|uploaded-at=${new Date().toISOString()}`);
      formData.append('api_key', environment.CLOUDINARY_API_KEY); // Necesitas agregar esto

      fetch(`https://api.cloudinary.com/v1_1/${this.CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData
      })
        .then(res => res.json())
        .then(data => {
          observer.next([data.secure_url]);
          observer.complete();
        })
        .catch(err => observer.error(err));
    });
  }
}