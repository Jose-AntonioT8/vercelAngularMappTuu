import { HttpClient } from '@angular/common/http';
import { Injectable, NgZone, inject } from '@angular/core';
import {
  DocumentData,
  Firestore,
  QuerySnapshot,
  Unsubscribe,
  getDoc,
} from '@angular/fire/firestore';
import {
  Firestore as FirestoreType,
  collection as col,
  doc as docRef,
  onSnapshot as onSnap,
} from 'firebase/firestore';
import { BehaviorSubject, Observable, from, map } from 'rxjs';
import { apiUrl } from '../../common/models/apiurl.model';
import { User } from '../../common/models/user.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class UserService {
  private url = `${apiUrl}/users`;

  private db: FirestoreType = inject(Firestore);
  private ngZone = inject(NgZone);

  private readonly collectionName = 'users';
  private unsubscribeListener: Unsubscribe | null = null;

  private users = new BehaviorSubject<User[]>([]);
  public users$ = this.users.asObservable();

  constructor(private http: HttpClient, private authService: AuthService) {}

  createUser(userData: any, token: any): Observable<any> {
    return this.http.post(this.url, userData, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  getUsers(): Observable<User[]> {
    if (this.unsubscribeListener) {
      return this.users$;
    }

    this.unsubscribeListener = onSnap(
      col(this.db, this.collectionName),
      (snapshot: QuerySnapshot<DocumentData>) => {
        this.ngZone.run(() => {
          const activities = snapshot.docs.map((d) => {
            const data = d.data();
            if (!data) throw new Error('Activity not found');
            return {
              id: d.id,
              ...(data as Record<string, any>),
            } as User;
          });
          this.users.next(activities);
        });
      },
      (error) => {
        console.error('Error en Firestore:', error);
        this.users.error(error);
      }
    );
    return this.users$;
  }

  getUserId(id: string): Observable<User> {
    const dRef = docRef(this.db, this.collectionName, id);
    return from(getDoc(dRef)).pipe(
      map((snapshot) => {
        const data = snapshot.data();
        if (!data) throw new Error('User not found');
        return {
          id: snapshot.id,
          ...data,
        } as User;
      })
    );
  }

  updateUser(id: string, userData: any, token: any): Observable<any> {
    return this.http.patch(`${this.url}/${id}`, userData, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  deleteUser(id: string, token: any): Observable<any> {
    return this.http.delete(`${this.url}/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  createActivity(
    id: string,
    activityId: string,
    token: string
  ): Observable<any> {
    const body = { createdActivities: [activityId] }; // Envolver el ID en un array con la clave correcta
    console.log(body);
    return this.http.patch(`${this.url}/${id}/createdActivities`, body, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  createPlan(id: string, planId: string, token: string): Observable<any> {
    const body = { createdPlans: [planId] }; // Envolver el ID en un array con la clave correcta
    return this.http.patch(`${this.url}/${id}/createdPlans`, body, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  saveActivity(id: string, activityId: string, token: string): Observable<any> {
    const body = { savedActivities: [activityId] }; // Envolver el ID en un array con la clave correcta
    return this.http.patch(`${this.url}/${id}/savedActivities`, body, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  savePlan(id: string, planId: string, token: string): Observable<any> {
    const body = { savedPlans: [planId] }; // Envolver el ID en un array con la clave correcta
    return this.http.patch(`${this.url}/${id}/savedPlans`, body, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}
