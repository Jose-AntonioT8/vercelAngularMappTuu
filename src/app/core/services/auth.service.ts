import { Injectable, inject, NgZone } from '@angular/core';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updateEmail,
  User,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup
} from '@angular/fire/auth';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
/**
 * Fachada de autenticación de la app.
 *
 * Responsabilidades:
 * - Gestionar sesión con Firebase Auth (email/password + proveedores OAuth).
 * - Exponer el usuario actual como stream (`user$`) para que UI/guards reaccionen.
 *
 * No es responsabilidad de este servicio:
 * - Persistir perfiles de usuario en Firestore (ver `UserService`).
 * - Implementar autorización granular (solo expone helpers básicos como `isAdmin`).
 */
export class AuthService {
  /** Instancia de Firebase Auth. */
  private auth = inject(Auth);
  /** Zona para propagar cambios al árbol de Angular. */
  private ngZone = inject(NgZone);
  /** Estado interno del usuario autenticado. */
  private userSubject = new BehaviorSubject<User | null>(null);
  /** Stream reactivo del usuario autenticado (o `null` si no hay sesión). */
  user$ = this.userSubject.asObservable();
  /** Flag para saber si Firebase ya resolvió el estado inicial de sesión. */
  private authInitialized = false;
  /** Resolver de la promesa de inicialización. */
  private resolveAuthInitialized!: () => void;
  /** Promesa que se cumple cuando `onAuthStateChanged` emite por primera vez. */
  private readonly authInitializedPromise = new Promise<void>((resolve) => {
    this.resolveAuthInitialized = resolve;
  });

  /** Se suscribe a `onAuthStateChanged` para mantener `user$` sincronizado. */
  constructor(private router: Router) {
    onAuthStateChanged(this.auth, user => {
      this.ngZone.run(() => {
      this.userSubject.next(user);
      if (!this.authInitialized) {
        this.authInitialized = true;
        this.resolveAuthInitialized();
      }
      });
    });
  }

  /** Espera a que Firebase resuelva el estado inicial de autenticación. */
  async waitForAuthInitialization(): Promise<void> {
    await this.authInitializedPromise;
  }

  /**
   * Inicia sesión con email/password.
   *
   * Efectos:
   * - Actualiza estado interno por `onAuthStateChanged`.
   * - Navega a `landingPage` si la autenticación tiene éxito.
   *
   * @param email Email del usuario.
   * @param password Contraseña del usuario.
   */
  async login(email: string, password: string) {
    await signInWithEmailAndPassword(this.auth, email, password);
    this.router.navigate(['/landingPage']);
  }

  /**
   * Registra un usuario (email/password) en Firebase Auth.
   *
   * Nota: este método solo crea la cuenta en Auth. Si se necesita un registro
   * de perfil/datos adicionales, debe coordinarse con `UserService`.
   *
   * @param email Email del usuario.
   * @param password Contraseña del usuario.
   */
  async register(email: string, password: string) {
    await createUserWithEmailAndPassword(this.auth, email, password);
    this.router.navigate(['/landingPage']);
  }

  /**
   * Login con Google vía popup.
   *
   * @returns Resultado del login (incluye credenciales/usuario).
   */
  async loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    const result = await signInWithPopup(this.auth, provider);
    this.router.navigate(['/landingPage']);
    return result;
  }

  /**
   * Login con GitHub vía popup.
   *
   * @returns Resultado del login (incluye credenciales/usuario).
   */
  async loginWithGithub() {
    const provider = new GithubAuthProvider();
    provider.addScope('user:email');
    const result = await signInWithPopup(this.auth, provider);
    this.router.navigate(['/landingPage']);
    return result;
  }

  /**
   * Cierra sesión y limpia estado local.
   *
   * Efectos:
   * - Llama a `signOut` (Firebase Auth).
   * - Limpia `localStorage`/`sessionStorage` y, si existe, `CacheStorage`.
   * - Fuerza recarga de página para resetear estado de UI de forma agresiva.
   *
   * Nota: el `location.reload()` se usa como “reset” global. Si más adelante
   * se requiere UX sin recarga, habrá que re-trabajar el flujo de estado.
   */
  async logout() {
    await signOut(this.auth);
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.error('Error limpiando storage', e);
    }
    try {
      if (typeof caches !== 'undefined') {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      }
    } catch (e) {
      console.error('Error limpiando CacheStorage', e);
    }
    this.userSubject.next(null);
    location.reload();
  }

  /**
   * Indica si hay sesión activa (usado por guards).
   *
   * Importante: depende del último valor emitido por `onAuthStateChanged`.
   */
  isAuthenticated(): boolean {
    return !!this.userSubject.value;
  }

  /**
   * Autorización básica de admin.
   *
   * Regla actual: email fijo `admin@mapptuu.com`.
   * Si se migra a roles/claims, este método debe cambiar.
   */
  isAdmin(): boolean {
    const user = this.userSubject.value;
    if(user?.email === 'admin@mapptuu.com'){
      return true;  
    }
    return false;
  }

  /** Acceso directo al usuario actual (o `null`). */
  get currentUser() {
    return this.userSubject.value;
  }

  /** Fallback directo desde Firebase Auth. */
  get firebaseCurrentUser() {
    return this.auth.currentUser;
  }

  /**
   * Actualiza la foto de perfil del usuario en Firebase Auth.
   *
   * @param photoURL URL pública de la imagen.
   */
  async updateUserPhoto(photoURL: string): Promise<void> {
    const user = this.auth.currentUser;
    if (user) {
      await updateProfile(user, { photoURL });
      this.userSubject.next(user);
    }
  }

  /**
   * Actualiza nombre visible y/o email del usuario autenticado.
   * Nota: actualizar email puede requerir reautenticación reciente.
   */
  async updateUserProfileData(displayName: string, email: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) {
      throw new Error('No authenticated user');
    }

    const normalizedName = displayName.trim();
    const normalizedEmail = email.trim();

    if (normalizedName && user.displayName !== normalizedName) {
      await updateProfile(user, { displayName: normalizedName });
    }

    if (normalizedEmail && user.email !== normalizedEmail) {
      await updateEmail(user, normalizedEmail);
    }

    this.userSubject.next(this.auth.currentUser);
  }
}
