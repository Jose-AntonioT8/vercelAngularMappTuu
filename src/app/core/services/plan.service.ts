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
  /** Base URL del API para planes. */
  private url = `${apiUrl}/plans`;
  /** Instancia de Firestore (compat firebase/firestore). */
  private db: FirestoreType = inject(Firestore);
  /** Zona para re-entrar a Angular desde callbacks externos. */
  private ngZone = inject(NgZone);

  /** Nombre de la colección Firestore. */
  private readonly collectionName = 'plans';
  /** Listener activo de Firestore para evitar duplicados. */
  private unsubscribeListener: Unsubscribe | null = null;

  /** Estado interno del listado de planes (stream). */
  private plans = new BehaviorSubject<Plan[]>([]);
  /** Stream público de planes. */
  public plans$ = this.plans.asObservable();

  /**
   * Servicio de planes.
   *
   * Fuentes:
   * - Escrituras (create/update/delete/rate) vía API HTTP con Bearer token.
   * - Lectura reactiva (listado) vía Firestore con filtros de visibilidad:
   *   - público para anónimos
   *   - público + privados propios cuando hay sesión
   */
  constructor(private http: HttpClient, private authService: AuthService) {}

  /** Crea un plan en el backend. */
  createPlan(planData: any, token: any): Observable<any> {
    return this.http.post(this.url, planData, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /** Envía una valoración de plan al backend. */
  ratePlan(id: string, planData: any, token: any): Observable<any> {
    console.log('hola');
    console.log(id);
    console.log(planData);
    return this.http.patch(`${this.url}/${id}/rating`, planData, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /** Actualiza un plan (parcial) en el backend. */
  updatePlan(id: string, planData: any, token: any): Observable<any> {
    return this.http.patch(`${this.url}/${id}`, planData, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /** Elimina un plan en el backend. */
  deletePlan(id: string, token: any): Observable<any> {
    return this.http.delete(`${this.url}/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /**
   * Escucha planes desde Firestore (stream).
   *
   * Mantiene un listener único (se reutiliza si ya existe).
   */
  getPlans(): Observable<Plan[]> {
    // En despliegues evitamos listeners Firestore (canal Listen) y usamos API HTTP.
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      this.http.get<Plan[]>(this.url).subscribe({
        next: (plans) => this.plans.next(plans || []),
        error: (error) => {
          console.error('Error cargando planes por API:', error);
          this.plans.next([]);
        },
      });
      return this.plans$;
    }

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

  /** Obtiene un plan concreto por ID (lectura puntual). */
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
