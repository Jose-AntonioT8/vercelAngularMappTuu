import { Injectable, inject, NgZone } from '@angular/core';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup
} from '@angular/fire/auth';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private ngZone = inject(NgZone);
  private userSubject = new BehaviorSubject<User | null>(null);
  user$ = this.userSubject.asObservable();

  constructor(private router: Router) {
    onAuthStateChanged(this.auth, user => {
      this.ngZone.run(() => {
      this.userSubject.next(user);
      });
    });
  }

  async login(email: string, password: string) {
    await signInWithEmailAndPassword(this.auth, email, password);
    this.router.navigate(['/landingPage']);
  }

  async register(email: string, password: string) {
    await createUserWithEmailAndPassword(this.auth, email, password);
    this.router.navigate(['/landingPage']);
  }

  // Login con Google
  async loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    const result = await signInWithPopup(this.auth, provider);
    this.router.navigate(['/landingPage']);
    return result;
  }

  // Login con GitHub
  async loginWithGithub() {
    const provider = new GithubAuthProvider();
    provider.addScope('user:email');
    const result = await signInWithPopup(this.auth, provider);
    this.router.navigate(['/landingPage']);
    return result;
  }
 //no esta implementado el logout en la interfaz pero lo agrego para tenerlo listo
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
//para el guards
  isAuthenticated(): boolean {
    return !!this.userSubject.value;
  }

  isAdmin(): boolean {
    const user = this.userSubject.value;
    if(user?.email === 'admin@mapptuu.com'){
      return true;  
    }
    return false;
  }

  get currentUser() {
    return this.userSubject.value;
  }

  async updateUserPhoto(photoURL: string): Promise<void> {
    const user = this.auth.currentUser;
    if (user) {
      await updateProfile(user, { photoURL });
      this.userSubject.next(user);
    }
  }
}
