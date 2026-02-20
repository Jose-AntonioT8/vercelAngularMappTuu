import { Injectable, inject } from '@angular/core';
import { v2 as cloudinary } from 'cloudinary';
import { Observable, from } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';


@Injectable({
  providedIn: 'root'
})
export class Claudinary {
  private authService = inject(AuthService);
  public upload(blob: Blob, folder: string = 'uploads'): Observable<string[]> {
    return from(this.getCurrentUser()).pipe(
      switchMap(user => {
        if (!user) {
          throw new Error('Usuario no autenticado. Por favor, inicia sesión.');
        }
  
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const publicId = `${timestamp}_${randomString}`;
  
        // Convertir blob a buffer para Node.js o usar FormData para frontend
        const uploadPromise = new Promise<string>((resolve, reject) => {
          const formData = new FormData();
          formData.append('file', blob);
          formData.append('folder', folder);
          formData.append('public_id', publicId);
  
          const uploadStream = cloudinary.uploader.upload_stream({
            folder: folder,
            public_id: publicId,
            context: {
              'uploaded-by': user.uid || 'anonymous',
              'uploaded-at': new Date().toISOString()
            }
          }, (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result!.secure_url);
            }
          });
        });
  
        return from(uploadPromise).pipe(
          map(url => [url])
        );
      })
    );
  }
  
  public uploadMultiple(blobs: Blob[], folder: string = 'uploads'): Observable<string[]> {
    const uploads = blobs.map(blob => this.upload(blob, folder));
    
    return new Observable(observer => {
      const results: string[] = [];
      let completed = 0;
      let hasError = false;
  
      uploads.forEach((upload$, index) => {
        upload$.subscribe({
          next: (urls) => {
            results[index] = urls[0];
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
  
  public delete(publicId: string): Observable<void> {
    return from(cloudinary.uploader.destroy(publicId)).pipe(
      map(() => void 0)
    );
  }

  private async getCurrentUser(): Promise<any> {
    const user = this.authService.currentUser;
    if (user) {
      return user;
    } else {
      throw new Error('Usuario no autenticado');
    }
  }
}