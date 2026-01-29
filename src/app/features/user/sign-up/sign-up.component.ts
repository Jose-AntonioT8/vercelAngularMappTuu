import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LanguageSelectorComponent } from '../../../common/language-selector/language-selector.component';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';
import { UserService } from '../../../core/services/user.service';
import { matchPasswordValidator } from '../../../core/validators/match-password.validator';
@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
    LanguageSelectorComponent,
    RouterLink,
  ],
  templateUrl: './sign-up.component.html',
})
export class SignupComponent {
  error = '';
  success = '';
  isLoading = false;
  showPassword = false;
  showConfirmPassword = false;
  formSignup;

  constructor(
    private formSvc: FormBuilder,
    private auth: AuthService,
    private route: Router,
    private translation: TranslationService,
    private userService: UserService
  ) {
    this.formSignup = this.formSvc.group(
      {
        email: ['', [Validators.required, Validators.email]],
        name: ['', [Validators.required, Validators.minLength(3)]],
        password: [
          '',
          [
            Validators.required,
            Validators.minLength(8),
            Validators.pattern(
              /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/
            ),
          ],
        ],
        repeatpassword: ['', [Validators.required]],
        acceptTerms: [false, [Validators.requiredTrue]],
        newsletter: [false],
      },
      {
        validators: matchPasswordValidator('password', 'repeatpassword'),
      }
    );
  }

  get passwordStrength(): 'weak' | 'medium' | 'strong' {
    const password = this.formSignup.controls.password.value || '';

    if (password.length < 6) return 'weak';

    let score = 0;

    // Length check
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;

    // Character variety
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[\W_]/.test(password)) score++;

    if (score <= 3) return 'weak';
    if (score <= 5) return 'medium';
    return 'strong';
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  getError(control: string): string {
    switch (control) {
      case 'email':
        if (this.formSignup.controls.email.errors?.['required']) {
          return this.translation.instant('auth.signup.emailRequired');
        }
        if (this.formSignup.controls.email.errors?.['email']) {
          return this.translation.instant('auth.signup.invalidEmail');
        }
        break;
      case 'name':
        if (this.formSignup.controls.name.errors?.['required']) {
          return this.translation.instant('auth.signup.nameRequired');
        }
        if (this.formSignup.controls.name.errors?.['minlength']) {
          return this.translation.instant('auth.signup.nameMinLength');
        }
        break;
      case 'password':
        const passwordErrors = this.formSignup.controls.password.errors;
        if (passwordErrors?.['required']) {
          return this.translation.instant('auth.signup.passwordRequired');
        }
        if (passwordErrors?.['minlength']) {
          return this.translation.instant('auth.signup.passwordMinLength');
        }
        if (passwordErrors?.['pattern']) {
          return this.translation.instant('auth.signup.passwordPattern');
        }
        break;
    }
    return '';
  }

  login(): void {
    this.route.navigate(['/login']);
  }

  async onGoogleSignup(): Promise<void> {
    try {
      this.error = '';
      await this.auth.loginWithGoogle();
    } catch (err: any) {
      this.handleSocialError(err, 'Google');
    }
  }

  async onGithubSignup(): Promise<void> {
    try {
      this.error = '';
      await this.auth.loginWithGithub();
    } catch (err: any) {
      this.handleSocialError(err, 'GitHub');
    }
  }

  private handleSocialError(err: any, provider: string): void {
    switch (err.code) {
      case 'auth/popup-closed-by-user':
        break;
      case 'auth/cancelled-popup-request':
        break;
      case 'auth/account-exists-with-different-credential':
        this.error = 'Ya existe una cuenta con este email usando otro método.';
        break;
      case 'auth/popup-blocked':
        this.error = 'El popup fue bloqueado. Permite popups para este sitio.';
        break;
      default:
        this.error = `Error al registrarse con ${provider}`;
    }
  }

  async onSignup(): Promise<void> {
    if (this.formSignup.invalid || this.isLoading) return;

    this.error = '';
    this.success = '';
    this.isLoading = true;

    try {
      await this.auth.register(
        this.formSignup.controls.email.value!,
        this.formSignup.controls.password.value!
      );

      this.success = this.translation.instant('auth.signup.signupSuccess');

      this.userService.createUser({
        id: this.auth.currentUser?.uid,
        email: this.formSignup.controls.email.value!,
        name: this.formSignup.controls.name.value!,
        createdAt: new Date(),
      });

      // Delay navigation for success animation
      setTimeout(() => {
        this.route.navigate(['/landingPage']);
      }, 1500);
    } catch (err: any) {
      this.isLoading = false;

      switch (err.code) {
        case 'auth/email-already-in-use':
          this.error = this.translation.instant('auth.signup.emailInUse');
          break;
        case 'auth/invalid-email':
          this.error = this.translation.instant('auth.signup.invalidEmail');
          break;
        case 'auth/weak-password':
          this.error = 'La contraseña es demasiado débil';
          break;
        case 'auth/network-request-failed':
          this.error = 'Error de conexión. Inténtalo de nuevo.';
          break;
        default:
          this.error = err.message || 'Error al crear la cuenta';
      }
    }
  }
}
