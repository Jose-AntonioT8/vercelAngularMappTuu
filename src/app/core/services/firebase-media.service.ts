import { Injectable, inject } from '@angular/core';
import { BaseMediaService } from './base-media.service';
import { 
  getStorage, 
  ref, 
  uploadBytes,
  getDownloadURL,
  StorageReference,
  FirebaseStorage
} from 'firebase/storage';
import { from, Observable, switchMap, map } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environment/environment';
import { initializeApp, FirebaseApp } from 'firebase/app';

@Injectable({
  providedIn: 'root'
})
export class FirebaseMediaService extends BaseMediaService<string> {
  private storage: FirebaseStorage;
  private app: FirebaseApp;

  constructor(private authService: AuthService) {
    super();
    this.app = initializeApp(environment.firebase);
    this.storage = getStorage(this.app);
  }

  public upload(blob: Blob, folder: string = 'uploads'): Observable<string[]> {
    return from(this.getCurrentUser()).pipe(
      switchMap(user => {
        if (!user) {
          throw new Error('Usuario no autenticado. Por favor, inicia sesión.');
        }

        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const fileExtension = this.getFileExtension(blob.type);
        const fileName = `${timestamp}_${randomString}${fileExtension}`;
        const storageRef: StorageReference = ref(this.storage, `${folder}/${fileName}`);
        const metadata = {
          contentType: blob.type || 'image/jpeg',
          customMetadata: {
            'uploaded-by': user.uid || 'anonymous',
            'uploaded-at': new Date().toISOString()
          }
        };
        return from(uploadBytes(storageRef, blob, metadata)).pipe(
          switchMap(snapshot => getDownloadURL(snapshot.ref)),
          map(url => [url])
        );
      })
    );
  }

  public override uploadMultiple(blobs: Blob[], folder: string = 'uploads'): Observable<string[]> {
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

  public delete(url: string): Observable<void> {
    try {
      const urlObj = new URL(url);
      const pathMatch = urlObj.pathname.match(/\/o\/(.+)\?/);
      if (!pathMatch) {
        throw new Error('URL de Firebase Storage no válida');
      }
      const filePath = decodeURIComponent(pathMatch[1]);
      const fileRef = ref(this.storage, filePath);
      return from(import('firebase/storage').then(m => m.deleteObject(fileRef)));
    } catch (error) {
      return new Observable(observer => {
        observer.error(new Error('Error al procesar la URL del archivo'));
      });
    }
  }

  private async getCurrentUser(): Promise<any> {
    const user = this.authService.currentUser;
    if (user) {
      return user;
    } else {
      throw new Error('Usuario no autenticado');
    }
  }

  private getFileExtension(mimeType: string): string {
    const mimeToExt: { [key: string]: string } = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg'
    };
    return mimeToExt[mimeType] || '.jpg';
  }
}
