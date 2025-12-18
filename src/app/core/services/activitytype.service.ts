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
export class ActivityTypeService {
  private url = `${apiUrl}/activitytypes`;
  private db: FirestoreType = inject(Firestore); 
  private ngZone = inject(NgZone);

  private readonly collectionName = 'activityTypes';
  private unsubscribeListener: Unsubscribe | null = null;
  
  private _activities = new BehaviorSubject<ActivityType[]>([]);
  public activities$ = this._activities.asObservable();
  
  constructor(private http: HttpClient) {}



  createActivityType(activityTypeData: any, token: any): Observable<any> {
    return this.http.post(this.url, activityTypeData, { headers: { Authorization: `Bearer ${token}` } });
  }
  

  
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
  ngOnDestroy() {
    if (this.unsubscribeListener) {
      this.unsubscribeListener();
    }
    this._activities.complete();
  }

  updateActivityType(id: string, activityTypeData: any, token: any): Observable<any> {
    return this.http.patch(`${this.url}/${id}`, activityTypeData, { headers: { Authorization: `Bearer ${token}` } });
  }

  deleteActivityType(id: string, token: any): Observable<any> {
    return this.http.delete(`${this.url}/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  }

}
