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
  and,
  collection as col,
  doc as docRef,
  onSnapshot as onSnap,
  or,
  query,
  where,
} from 'firebase/firestore';
import { apiUrl } from '../../common/models/apiurl.model';
import { Plan } from '../../common/models/plan.model';
import { AuthService } from './auth.service';

import { BehaviorSubject, Observable, from, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PlanService {
  private url = `${apiUrl}/plans`;
  private db: FirestoreType = inject(Firestore);
  private ngZone = inject(NgZone);

  private readonly collectionName = 'plans';
  private unsubscribeListener: Unsubscribe | null = null;

  private plans = new BehaviorSubject<Plan[]>([]);
  public plans$ = this.plans.asObservable();

  constructor(private http: HttpClient, private authService: AuthService) {}

  createPlan(planData: any, token: any): Observable<any> {
    return this.http.post(this.url, planData, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  ratePlan(id: string, planData: any, token: any): Observable<any> {
    console.log('hola');
    console.log(id);
    console.log(planData);
    return this.http.patch(`${this.url}/${id}/rating`, planData, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  updatePlan(id: string, planData: any, token: any): Observable<any> {
    return this.http.patch(`${this.url}/${id}`, planData, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  deletePlan(id: string, token: any): Observable<any> {
    return this.http.delete(`${this.url}/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  getPlans(): Observable<Plan[]> {
    if (this.unsubscribeListener) {
      return this.plans$;
    }

    // Usamos 'this.db' que ya está listo gracias a app.config
    const uid = this.authService.currentUser?.uid || null;
    const baseCol = col(this.db, this.collectionName);

    // Query Firestore según autenticación: público o público + privados propios
    const q = uid
      ? query(
          baseCol,
          or(
            where('visibility', '==', true),
            and(where('visibility', '==', false), where('ownerId', '==', uid))
          )
        )
      : query(baseCol, where('visibility', '==', true));

    this.unsubscribeListener = onSnap(
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        this.ngZone.run(() => {
          const plans = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as Plan[];
          this.plans.next(plans);
        });
      },
      (error) => {
        console.error('Error en Firestore:', error);
        this.plans.error(error);
      }
    );
    return this.plans$;
  }

  getPlanId(id: string): Observable<Plan> {
    const dRef = docRef(this.db, this.collectionName, id);
    return from(getDoc(dRef)).pipe(
      map((snapshot) => {
        const data = snapshot.data();
        if (!data) throw new Error('Plan not found');
        return {
          id: snapshot.id,
          ...data,
        } as Plan;
      })
    );
  }
}
