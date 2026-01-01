import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { LanguageSelectorComponent } from '../../../common/language-selector/language-selector.component';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';
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
  error = '';
  success = '';
  isLoading = false;
  showPassword = false;
  formLogin;

  constructor(
    private formSvc: FormBuilder,
    private authService: AuthService,
    private route: Router,
    private translation: TranslationService,
    private auth = getAuth(),
    private emailAddress: string
  ) {
    this.formLogin = this.formSvc.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
      rememberMe: [false],
    });
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  sendPasswordReset(): void {
    if (!this.formLogin.controls.email.value) {
      this.error = this.translation.instant('auth.login.emailRequired');
      return;
    }
    this.emailAddress = this.formLogin.controls.email.value;
    sendPasswordResetEmail(this.auth, this.emailAddress)
      .then(() => {
        console.log('Correo de restablecimiento enviado exitosamente.');
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

  getError(control: string): string {
    switch (control) {
      case 'email':
        if (this.formLogin.controls.email.errors?.['required']) {
          return this.translation.instant('auth.login.emailRequired');
        }
        if (this.formLogin.controls.email.errors?.['email']) {
          return this.translation.instant('auth.login.invalidEmail');
        }
        break;
      case 'password':
        if (this.formLogin.controls.password.errors?.['required']) {
          return this.translation.instant('auth.login.passwordRequired');
        }
        break;
    }
    return '';
  }

  singUp(): void {
    this.route.navigate(['/signup']);
  }

  async onGoogleLogin(): Promise<void> {
    try {
      this.error = '';
      await this.authService.loginWithGoogle();
    } catch (err: any) {
      this.handleSocialError(err, 'Google');
    }
  }

  async onGithubLogin(): Promise<void> {
    try {
      this.error = '';
      await this.authService.loginWithGithub();
    } catch (err: any) {
      this.handleSocialError(err, 'GitHub');
    }
  }

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

  async onLogin(): Promise<void> {
    if (this.formLogin.invalid || this.isLoading) return;

    this.error = '';
    this.success = '';
    this.isLoading = true;

    try {
      await this.authService.login(
        this.formLogin.controls.email.value!,
        this.formLogin.controls.password.value!
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
