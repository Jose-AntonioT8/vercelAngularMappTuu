import { Injectable, inject, NgZone } from '@angular/core';
import { 
  Firestore, 
  getDoc,
  QuerySnapshot, 
  DocumentData,
  Unsubscribe 
} from '@angular/fire/firestore';
import { Firestore as FirestoreType, collection as col, onSnapshot as onSnap, doc as docRef, getFirestore } from 'firebase/firestore'; 
import { HttpClient } from '@angular/common/http';
import { apiUrl } from '../../common/models/apiurl.model';
import { Activity } from '../../common/models/activity.model';
import { ActivityDetail } from '../../common/models/activityDetail';

import { BehaviorSubject, Observable, from, map } from 'rxjs';



@Injectable({ providedIn: 'root' })
/**
 * Servicio de dominio para Actividades.
 *
 * Fuentes de datos:
 * - **Firestore (activities)**: lectura reactiva (listener) para listados.
 * - **API HTTP (`/activities`)**: mutaciones (create/update/delete/rating) con token Bearer.
 *
 * Decisión importante:
 * - `getActivities()` establece **un único listener** por ciclo de vida del servicio
 *   (cache simple con `unsubscribeListener`) para evitar listeners duplicados.
 */
export class ActivityService {
  /** Base URL del API para actividades. */
  private url = `${apiUrl}/activities`;
  /** Instancia de Firestore (compat firebase/firestore). */
  private db: FirestoreType = inject(Firestore); 
  /** Zona para re-entrar a Angular desde callbacks externos. */
  private ngZone = inject(NgZone);

  /** Nombre de la colección Firestore. */
  private readonly collectionName = 'activities';
  /** Listener activo para evitar duplicados. */
  private unsubscribeListener: Unsubscribe | null = null;
  
  /** Estado interno del listado (stream). */
  private _activities = new BehaviorSubject<ActivityDetail[]>([]);
  /** Stream público de actividades. */
  public activities$ = this._activities.asObservable();
  
  /** Cliente HTTP para mutaciones vía API protegida. */
  constructor(private http: HttpClient) {}

  

  /**
   * Crea una actividad vía API HTTP.
   *
   * @param activityData Payload de creación (según contrato de la API).
   * @param token JWT/Bearer token.
   */
  createActivity(activityData: any, token: any): Observable<any> {
    return this.http.post(this.url, activityData, { headers: { Authorization: `Bearer ${token}` } });
  }

  /**
   * Envía una valoración (rating) a la API.
   *
   * @param id Id de actividad.
   * @param activityData Payload de rating (según contrato de la API).
   * @param token JWT/Bearer token.
   */
  rateActivity(id:string, activityData:any, token:any): Observable<any>{
    return this.http.patch(`${this.url}/${id}/rating`, activityData, { headers: { Authorization: `Bearer ${token}` } });
  }


  /**
   * Actualiza una actividad vía API HTTP.
   *
   * @param id Id de actividad.
   * @param activityData Cambios a aplicar (según contrato de la API).
   * @param token JWT/Bearer token.
   */
  updateActivity(id: string, activityData: any, token: any): Observable<any> {
    return this.http.patch(`${this.url}/${id}`, activityData, { headers: { Authorization: `Bearer ${token}` } });
  }

  /**
   * Elimina una actividad vía API HTTP.
   *
   * @param id Id de actividad.
   * @param token JWT/Bearer token.
   */
  deleteActivity(id: string, token: any): Observable<any> {
    return this.http.delete(`${this.url}/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  }
  
  /**
   * Obtiene actividades desde Firestore de forma reactiva.
   *
   * Comportamiento:
   * - En la primera llamada crea un `onSnapshot` y publica en `activities$`.
   * - En llamadas posteriores devuelve el stream existente (no duplica listener).
   *
   * @returns Observable con el listado actualizado (cada cambio en Firestore emite).
   */
  getActivities(): Observable<Activity[]> {
    if (this.unsubscribeListener) {
      return this.activities$;
    }

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

 
  /**
   * Obtiene una actividad por id desde Firestore.
   *
   * @param id Id de actividad (document id).
   * @throws Error('Activity not found') si el documento no existe.
   */
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

  /**
   * Libera recursos del listener de Firestore.
   *
   * Nota: Angular solo llamará esto automáticamente si el servicio participa
   * en un ciclo de vida con destrucción (p.ej. providers a nivel de componente).
   */
  ngOnDestroy() {
    if (this.unsubscribeListener) {
      this.unsubscribeListener();
    }
    this._activities.complete();
  }
}


