import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LanguageSelectorComponent } from '../../../common/language-selector/language-selector.component';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';
import { UserService } from '../../../core/services/user.service';
import { matchPasswordValidator } from '../../../core/validators/match-password.validator';

/**
 * Pantalla de registro de usuario.
 *
 * Responsabilidades:
 * - Validar formulario (email/nombre/contraseña + repetición + términos).
 * - Registrar en Firebase Auth (email/password) o iniciar con OAuth (Google/GitHub).
 * - Crear el “usuario de dominio” en el backend usando Bearer token (Firebase ID token).
 */
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
  /** Mensaje de error para UI. */
  error = '';
  /** Mensaje de éxito para UI. */
  success = '';
  /** Flag para evitar dobles envíos. */
  isLoading = false;
  /** Toggle visibilidad del password. */
  showPassword = false;
  /** Toggle visibilidad de confirmación de password. */
  showConfirmPassword = false;
  /** FormGroup tipado en runtime por FormBuilder. */
  formSignup;

  /**
   * Validador de edad mínima para la fecha de nacimiento.
   * @param minAge Edad mínima permitida para registro.
   */
  private minimumAgeValidator(minAge: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;

      const birthDate = new Date(value);
      if (Number.isNaN(birthDate.getTime())) {
        return { invalidBirthDate: true };
      }

      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      return age >= minAge ? null : { minAge: true };
    };
  }

  /** Construye el componente y registra validaciones del formulario de alta. */
  /**
   * @param formSvc Constructor de formularios reactivos.
   * @param auth Servicio de autenticación.
   * @param route Router para navegación.
   * @param translation Servicio de traducción.
   * @param userService Servicio de usuario de dominio.
   */
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
        firstName: ['', [Validators.required, Validators.minLength(2)]],
        name: ['', [Validators.required, Validators.minLength(3)]],
        lastName: ['', [Validators.required, Validators.minLength(2)]],
        birthDate: ['', [Validators.required, this.minimumAgeValidator(14)]],
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

  /** Heurística simple de fuerza de contraseña para feedback visual. */
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

  /** Alterna visibilidad del campo contraseña. */
  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  /** Alterna visibilidad del campo repetir contraseña. */
  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  /**
   * Devuelve mensaje de error traducido según validación actual del control.
   * @param control Nombre lógico del control.
   */
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
      case 'firstName':
        if (this.formSignup.controls.firstName.errors?.['required']) {
          return this.translation.instant('auth.signup.firstNameRequired');
        }
        if (this.formSignup.controls.firstName.errors?.['minlength']) {
          return this.translation.instant('auth.signup.firstNameMinLength');
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
      case 'lastName':
        if (this.formSignup.controls.lastName.errors?.['required']) {
          return this.translation.instant('auth.signup.lastNameRequired');
        }
        if (this.formSignup.controls.lastName.errors?.['minlength']) {
          return this.translation.instant('auth.signup.lastNameMinLength');
        }
        break;
      case 'birthDate':
        if (this.formSignup.controls.birthDate.errors?.['required']) {
          return this.translation.instant('auth.signup.birthDateRequired');
        }
        if (this.formSignup.controls.birthDate.errors?.['invalidBirthDate']) {
          return this.translation.instant('auth.signup.birthDateInvalid');
        }
        if (this.formSignup.controls.birthDate.errors?.['minAge']) {
          return this.translation.instant('auth.signup.birthDateMin');
        }
        break;
    }
    return '';
  }

  /** Navega a login. */
  login(): void {
    this.route.navigate(['/login']);
  }

  /** Registro/inicio vía Google OAuth. */
  async onGoogleSignup(): Promise<void> {
    try {
      this.error = '';
      await this.auth.loginWithGoogle();
    } catch (err: any) {
      this.handleSocialError(err, 'Google');
    }
  }

  /** Registro/inicio vía GitHub OAuth. */
  async onGithubSignup(): Promise<void> {
    try {
      this.error = '';
      await this.auth.loginWithGithub();
    } catch (err: any) {
      this.handleSocialError(err, 'GitHub');
    }
  }

  /** Mapea errores frecuentes de OAuth para UX. */
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

  /**
   * Registro con email/password.
   *
   * Flujo:
   * 1) Registrar en Firebase Auth
   * 2) Obtener ID token
   * 3) Crear usuario en backend (dominio)
   * 4) Navegar a la app
   */
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

      const token = await this.auth.currentUser!.getIdToken();
      console.log(token);

      this.userService
        .createUser(
          {
            id: this.auth.currentUser?.uid,
            email: this.formSignup.controls.email.value!,
            firstName: this.formSignup.controls.firstName.value!,
            name: this.formSignup.controls.name.value!,
            lastName: this.formSignup.controls.lastName.value!,
            birthDate: this.formSignup.controls.birthDate.value!,
            createdAt: new Date(),
          },
          token
        )
        .subscribe({
          next: (res) => {
            this.success = 'Plan creado con éxito';
            this.isLoading = false;
            setTimeout(() => {
              this.route.navigate(['/plansList']);
            }, 1000);
          },
          error: (err) => {
            console.error('create error', err);
            this.isLoading = false;
            const backendMessage = err?.error?.message;
            if (backendMessage === 'Usuario menor de 14 años') {
              this.error = this.translation.instant('auth.signup.underageBlocked');
              return;
            }
            this.error = backendMessage || this.translation.instant('auth.signup.signupGenericError');
          },
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
