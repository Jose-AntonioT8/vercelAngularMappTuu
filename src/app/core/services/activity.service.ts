import { Injectable, inject, NgZone } from '@angular/core';
import { 
  Firestore, 
  getDoc,
  QuerySnapshot, 
  DocumentData,
  Unsubscribe 
} from '@angular/fire/firestore'; // OJO: Importa desde '@angular/fire/firestore' si usas la librería, o 'firebase/firestore' si usas el SDK nativo. 
// Si usas provideFirestore en app.config, lo normal es usar el SDK nativo 'firebase/firestore' pero inyectando la instancia.
// Vamos a usar la inyección de AngularFire pero los métodos del SDK nativo que ya usabas.

// CORRECCIÓN DE IMPORTS PARA ASEGURAR COMPATIBILIDAD:
import { Firestore as FirestoreType, collection as col, onSnapshot as onSnap, doc as docRef, getFirestore } from 'firebase/firestore'; 
import { HttpClient } from '@angular/common/http';
import { apiUrl } from '../../common/models/apiurl.model';
import { Activity } from '../../common/models/activity.model';
import { ActivityDetail } from '../../common/models/activityDetail';

import { BehaviorSubject, Observable, from, map } from 'rxjs';



@Injectable({ providedIn: 'root' })
export class ActivityService {
  private url = `${apiUrl}/activities`;
private db: FirestoreType = inject(Firestore); 
  private ngZone = inject(NgZone);

  private readonly collectionName = 'activities';
  private unsubscribeListener: Unsubscribe | null = null;
  
  private _activities = new BehaviorSubject<ActivityDetail[]>([]);
  public activities$ = this._activities.asObservable();
  
  constructor(private http: HttpClient) {}

  

  createActivity(activityData: any, token: any): Observable<any> {
    return this.http.post(this.url, activityData, { headers: { Authorization: `Bearer ${token}` } });
  }


  updateActivity(id: string, activityData: any, token: any): Observable<any> {
    return this.http.patch(`${this.url}/${id}`, activityData, { headers: { Authorization: `Bearer ${token}` } });
  }

  deleteActivity(id: string, token: any): Observable<any> {
    return this.http.delete(`${this.url}/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  }
  
  getActivities(): Observable<Activity[]> {
    if (this.unsubscribeListener) {
      return this.activities$;
    }

    // Usamos 'this.db' que ya está listo gracias a app.config
    this.unsubscribeListener = onSnap(
      col(this.db, this.collectionName),
      (snapshot: QuerySnapshot<DocumentData>) => {
        this.ngZone.run(() => {
        const activities = snapshot.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            imageURL: data['imageURL'] || data['imageRef'] || '',
          } as ActivityDetail;
        });
        this._activities.next(activities);
        });
      },
      (error) => {
        console.error('Error en Firestore:', error);
        this._activities.error(error);
      }
    );
    return this.activities$;
  }

 
  getActivityId(id: string): Observable<ActivityDetail> {
    const dRef = docRef(this.db, this.collectionName, id);
    return from(getDoc(dRef)).pipe(
      map(snapshot => {
        const data = snapshot.data();
        if (!data) throw new Error('Activity not found');
        return {
          id: snapshot.id,
          ...data,
          imageURL: data['imageURL'] || data['imageRef'] || ''
        } as ActivityDetail;
      })
    );
  }

  ngOnDestroy() {
    if (this.unsubscribeListener) {
      this.unsubscribeListener();
    }
    this._activities.complete();
  }
}


