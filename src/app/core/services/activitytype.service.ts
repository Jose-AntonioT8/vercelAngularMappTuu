import { HttpClient } from '@angular/common/http';
import { apiUrl } from '../../common/models/apiurl.model';
import { ActivityType } from '../../common/models/activityType.models';
import { Injectable, inject, NgZone } from '@angular/core';
import { 
  Firestore, 
  getDoc,
  QuerySnapshot, 
  DocumentData,
  Unsubscribe 
} from '@angular/fire/firestore'; 
import { Firestore as FirestoreType, collection as col, onSnapshot as onSnap, doc as docRef } from 'firebase/firestore'; 

import { BehaviorSubject, Observable, from, map } from 'rxjs';
@Injectable({ providedIn: 'root' })
/**
 * Servicio de dominio para Tipos de Actividad.
 *
 * Fuentes:
 * - **Firestore (activityTypes)**: lectura reactiva para listados/detalle.
 * - **API HTTP (`/activitytypes`)**: mutaciones con token Bearer.
 *
 * Igual que `ActivityService`, evita múltiples listeners con `unsubscribeListener`.
 */
export class ActivityTypeService {
  private url = `${apiUrl}/activitytypes`;
  private db: FirestoreType = inject(Firestore); 
  private ngZone = inject(NgZone);

  private readonly collectionName = 'activityTypes';
  private unsubscribeListener: Unsubscribe | null = null;
  
  private _activities = new BehaviorSubject<ActivityType[]>([]);
  public activities$ = this._activities.asObservable();
  
  constructor(private http: HttpClient) {}



  /**
   * Crea un tipo de actividad vía API HTTP.
   *
   * @param activityTypeData Payload según contrato de API.
   * @param token JWT/Bearer token.
   */
  createActivityType(activityTypeData: any, token: any): Observable<any> {
    return this.http.post(this.url, activityTypeData, { headers: { Authorization: `Bearer ${token}` } });
  }
  

  
  /**
   * Obtiene tipos de actividad desde Firestore de forma reactiva.
   *
   * @returns Observable con listado actualizado.
   */
  getActivitiesType(): Observable<ActivityType[]> {
    if (this.unsubscribeListener) {
      return this.activities$;
    }

    this.unsubscribeListener = onSnap(
      col(this.db, this.collectionName),
      (snapshot: QuerySnapshot<DocumentData>) => {
        this.ngZone.run(() => {
        const activities = snapshot.docs.map(d => {
          const data = d.data();
          if (!data) throw new Error('Activity not found');
          return {
            id: d.id,
            ...(data as Record<string, any>)
          } as ActivityType;
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
   * Obtiene un tipo de actividad por id desde Firestore.
   *
   * @param id Document id.
   * @throws Error('Activity not found') si no existe el documento.
   */
  getActivityId(id: string): Observable<ActivityType> {
    const dRef = docRef(this.db, this.collectionName, id);
    return from(getDoc(dRef)).pipe(
      map(snapshot => {
        const data = snapshot.data();
        if (!data) throw new Error('Activity not found');
        return {
          id: snapshot.id,
          ...data,
        } as ActivityType;
      })
    );
  }

  /**
   * Libera el listener de Firestore y completa el stream.
   */
  ngOnDestroy() {
    if (this.unsubscribeListener) {
      this.unsubscribeListener();
    }
    this._activities.complete();
  }

  /**
   * Actualiza un tipo de actividad vía API HTTP.
   *
   * @param id Id de tipo.
   * @param activityTypeData Cambios (contrato API).
   * @param token JWT/Bearer token.
   */
  updateActivityType(id: string, activityTypeData: any, token: any): Observable<any> {
    return this.http.patch(`${this.url}/${id}`, activityTypeData, { headers: { Authorization: `Bearer ${token}` } });
  }

  /**
   * Elimina un tipo de actividad vía API HTTP.
   *
   * @param id Id de tipo.
   * @param token JWT/Bearer token.
   */
  deleteActivityType(id: string, token: any): Observable<any> {
    return this.http.delete(`${this.url}/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  }

}
