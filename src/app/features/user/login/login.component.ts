import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { LanguageSelectorComponent } from '../../../common/language-selector/language-selector.component';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';

/**
 * Pantalla de login.
 *
 * Responsabilidades:
 * - Validar credenciales (email/password) y orquestar el login con `AuthService`.
 * - Soportar login social (Google/GitHub).
 * - Enviar correo de restablecimiento de contraseña (Firebase Auth).
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
    LanguageSelectorComponent,
    RouterLink,
  ],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  /** Mensaje de error para UI. */
  error = '';
  /** Mensaje de éxito para UI. */
  success = '';
  /** Flag para evitar dobles envíos. */
  isLoading = false;
  /** Toggle de visibilidad del password. */
  showPassword = false;
  /** Email usado para el modal de reset. */
  emailAddress: string = '';
  /** Controla el modal de reset de contraseña. */
  showResetModal = false;
  /** Formulario reactivo de autenticación. */
  formLogin: ReturnType<FormBuilder['group']>;

  /** Servicio constructor de formularios. */
  private formSvc: FormBuilder;
  /** Servicio de autenticación (email/social). */
  private authService: AuthService;
  /** Router para redirecciones post-login. */
  private route: Router;
  /** Servicio de traducciones para mensajes de validación/estado. */
  private translation: TranslationService;
  /** Instancia de Firebase Auth para reset de contraseña. */
  private auth: Auth;

  /**
   * @param formSvc Constructor de formularios reactivos.
   * @param authService Servicio de autenticación.
   * @param route Router para navegación.
   * @param translation Servicio de traducciones.
   * @param auth Instancia de Firebase Auth.
   */
  constructor(
    formSvc: FormBuilder,
    authService: AuthService,
    route: Router,
    translation: TranslationService,
    auth: Auth = getAuth()
  ) {
    this.formSvc = formSvc;
    this.authService = authService;
    this.route = route;
    this.translation = translation;
    this.auth = auth;
    this.formLogin = this.formSvc.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
      rememberMe: [false],
    });
  }

  /** Alterna visibilidad del campo contraseña. */
  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  /** Envía email de restablecimiento usando el email actual del formulario. */
  sendPasswordReset(): void {
    if (!this.formLogin.controls['email'].value) {
      this.error = this.translation.instant('auth.login.emailRequired');
      return;
    }
    this.emailAddress = this.formLogin.controls['email'].value;
    sendPasswordResetEmail(this.auth, this.emailAddress)
      .then(() => {
        this.showResetModal = true;
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.error(
          'Error al enviar el correo de restablecimiento:',
          errorCode,
          errorMessage
        );
      });
  }

  /** Cierra el modal de reset. */
  closeResetModal(): void {
    this.showResetModal = false;
  }

  /** Devuelve mensaje de error traducido según validación del control. */
  getError(control: string): string {
    switch (control) {
      case 'email':
        if (this.formLogin.controls['email'].errors?.['required']) {
          return this.translation.instant('auth.login.emailRequired');
        }
        if (this.formLogin.controls['email'].errors?.['email']) {
          return this.translation.instant('auth.login.invalidEmail');
        }
        break;
      case 'password':
        if (this.formLogin.controls['password'].errors?.['required']) {
          return this.translation.instant('auth.login.passwordRequired');
        }
        break;
    }
    return '';
  }

  /** Navega a la pantalla de registro. */
  singUp(): void {
    this.route.navigate(['/signup']);
  }

  /** Login vía Google OAuth. */
  async onGoogleLogin(): Promise<void> {
    try {
      this.error = '';
      await this.authService.loginWithGoogle();
    } catch (err: any) {
      this.handleSocialError(err, 'Google');
    }
  }

  /** Login vía GitHub OAuth. */
  async onGithubLogin(): Promise<void> {
    try {
      this.error = '';
      await this.authService.loginWithGithub();
    } catch (err: any) {
      this.handleSocialError(err, 'GitHub');
    }
  }

  /** Mapea errores frecuentes de OAuth para UX. */
  private handleSocialError(err: any, provider: string): void {
    switch (err.code) {
      case 'auth/popup-closed-by-user':
        // No mostrar error si el usuario cierra el popup
        break;
      case 'auth/cancelled-popup-request':
        break;
      case 'auth/account-exists-with-different-credential':
        this.error =
          'Ya existe una cuenta con este email usando otro método de inicio de sesión.';
        break;
      case 'auth/popup-blocked':
        this.error = 'El popup fue bloqueado. Permite popups para este sitio.';
        break;
      default:
        this.error = `Error al iniciar sesión con ${provider}`;
    }
  }

  /** Login con email/password. */
  async onLogin(): Promise<void> {
    if (this.formLogin.invalid || this.isLoading) return;

    this.error = '';
    this.success = '';
    this.isLoading = true;

    try {
      await this.authService.login(
        this.formLogin.controls['email'].value!,
        this.formLogin.controls['password'].value!
      );

      this.success = this.translation.instant('auth.login.loginSuccess');

      // Delay navigation for success animation
      setTimeout(() => {
        this.route.navigate(['/landingPage']);
      }, 500);
    } catch (err: any) {
      this.isLoading = false;

      switch (err.code) {
        case 'auth/user-not-found':
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
          this.error = this.translation.instant('auth.login.loginError');
          break;
        case 'auth/invalid-email':
          this.error = this.translation.instant('auth.login.invalidEmail');
          break;
        case 'auth/network-request-failed':
          this.error = 'Error de conexión. Inténtalo de nuevo.';
          break;
        case 'auth/too-many-requests':
          this.error = 'Demasiados intentos. Espera un momento.';
          break;
        default:
          this.error = err.message || 'Error al iniciar sesión';
      }
    }
  }
}
