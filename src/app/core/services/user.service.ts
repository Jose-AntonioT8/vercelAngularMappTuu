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
/**
 * Servicio de usuarios (perfil y relaciones con planes/actividades).
 *
 * Fuentes:
 * - **Firestore (users)**: lectura reactiva del listado/detalle.
 * - **API HTTP (`/users`)**: escritura/actualización y endpoints de relación
 *   (createdActivities/createdPlans/savedActivities/savedPlans).
 *
 * Nota: este servicio no autentica; usa `AuthService` para sesión si se requiere.
 */
export class UserService {
  /** Base URL del API para usuarios. */
  private url = `${apiUrl}/users`;

  /** Instancia de Firestore (compat firebase/firestore). */
  private db: FirestoreType = inject(Firestore);
  /** Zona para re-entrar a Angular desde callbacks externos. */
  private ngZone = inject(NgZone);

  /** Nombre de la colección Firestore. */
  private readonly collectionName = 'users';
  /** Listener activo de Firestore para evitar duplicados. */
  private unsubscribeListener: Unsubscribe | null = null;

  /** Estado interno del listado de usuarios (stream). */
  private users = new BehaviorSubject<User[]>([]);
  /** Stream público de usuarios. */
  public users$ = this.users.asObservable();

  /** Cliente HTTP para API y AuthService para contexto de sesión si aplica. */
  constructor(private http: HttpClient, private authService: AuthService) {}

  /**
   * Crea un usuario en el backend (no confundir con crear cuenta en Firebase Auth).
   *
   * @param userData Payload según contrato de API.
   * @param token JWT/Bearer token.
   */
  createUser(userData: any, token: any): Observable<any> {
    return this.http.post(this.url, userData, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /**
   * Obtiene usuarios desde Firestore de forma reactiva.
   *
   * @returns Observable con listado actualizado.
   */
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

  /**
   * Obtiene un usuario por id desde Firestore.
   *
   * @param id Document id.
   * @throws Error('User not found') si no existe.
   */
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

  /**
   * Actualiza un usuario vía API HTTP.
   *
   * @param id Id del usuario.
   * @param userData Cambios según contrato de API.
   * @param token JWT/Bearer token.
   */
  updateUser(id: string, userData: any, token: any): Observable<any> {
    return this.http.patch(`${this.url}/${id}`, userData, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /**
   * Elimina un usuario vía API HTTP.
   *
   * @param id Id del usuario.
   * @param token JWT/Bearer token.
   */
  deleteUser(id: string, token: any): Observable<any> {
    return this.http.delete(`${this.url}/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /**
   * Añade una actividad al conjunto de actividades creadas por el usuario.
   *
   * Contrato: el backend espera `{ createdActivities: [activityId] }`.
   *
   * @param id Id del usuario.
   * @param activityId Id de actividad.
   * @param token JWT/Bearer token.
   */
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

  /**
   * Añade un plan al conjunto de planes creados por el usuario.
   *
   * @param id Id del usuario.
   * @param planId Id del plan.
   * @param token JWT/Bearer token.
   */
  createPlan(id: string, planId: string, token: string): Observable<any> {
    const body = { createdPlans: [planId] }; // Envolver el ID en un array con la clave correcta
    return this.http.patch(`${this.url}/${id}/createdPlans`, body, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /**
   * Guarda una actividad para el usuario (favoritos/guardados).
   *
   * @param id Id del usuario.
   * @param activityId Id de actividad.
   * @param token JWT/Bearer token.
   */
  saveActivity(id: string, activityId: string, token: string): Observable<any> {
    const body = { savedActivities: [activityId] }; // Envolver el ID en un array con la clave correcta
    return this.http.patch(`${this.url}/${id}/savedActivities`, body, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /**
   * Guarda un plan para el usuario (favoritos/guardados).
   *
   * @param id Id del usuario.
   * @param planId Id de plan.
   * @param token JWT/Bearer token.
   */
  savePlan(id: string, planId: string, token: string): Observable<any> {
    const body = { savedPlans: [planId] }; // Envolver el ID en un array con la clave correcta
    return this.http.patch(`${this.url}/${id}/savedPlans`, body, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}
