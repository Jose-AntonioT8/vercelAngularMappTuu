import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';
import { AuthService } from './auth.service';
@Injectable({
  providedIn: 'root'
})
export class CloudinaryService {
  private authService = inject(AuthService);
  private readonly CLOUD_NAME = environment.CLOUD_NAME;
  private readonly UPLOAD_PRESET = environment.UPLOAD_PRESET;

  public upload(blob: Blob, folder: string = 'uploads'): Observable<string[]> {
    return new Observable(observer => {
      const user = this.authService.currentUser;
      if (!user) {
        observer.error('Usuario no autenticado');
        return;
      }

      const formData = new FormData();
      formData.append('file', blob);
      formData.append('upload_preset', "default-preset");
      formData.append('folder', folder);
      formData.append('context', `uploaded-by=${user.uid}|uploaded-at=${new Date().toISOString()}`);

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