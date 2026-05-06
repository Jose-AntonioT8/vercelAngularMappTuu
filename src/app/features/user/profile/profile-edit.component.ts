import { CommonModule, Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';
import { UserService } from '../../../core/services/user.service';

/**
 * Formulario de edición de perfil.
 *
 * Permite actualizar nombre y correo del usuario autenticado,
 * sincronizando Firebase Auth y backend de usuarios.
 */
@Component({
  selector: 'app-profile-edit',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './profile-edit.component.html',
  styleUrl: './profile-edit.component.scss',
})
export class ProfileEditComponent implements OnInit {
  /** Estado de guardado en curso para bloquear doble envío. */
  isSaving = false;
  /** Mensaje de error visible en UI. */
  error = '';
  /** Mensaje de éxito visible en UI. */
  success = '';

  /** Formulario reactivo de edición de perfil. */
  form;

  /**
   * Validador de edad mínima para fecha de nacimiento.
   * @param minAge Edad mínima requerida.
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

  /** Servicio constructor de formularios. */
  private fb: FormBuilder;
  /** Servicio de autenticación para usuario actual y actualización de Auth. */
  private authService: AuthService;
  /** Servicio de usuario para sincronizar cambios en backend. */
  private userService: UserService;
  /** Servicio de traducciones para mensajes de feedback. */
  private translationService: TranslationService;
  /** Router para redirigir tras guardado. */
  private router: Router;
  /** Servicio de historial para volver atrás. */
  private location: Location;

  /** Construye el componente y define la estructura inicial del formulario. */
  /**
   * @param fb Constructor de formularios reactivos.
   * @param authService Servicio de autenticación.
   * @param userService Servicio de usuario.
   * @param translationService Servicio de traducciones.
   * @param router Router para navegación.
   * @param location Servicio de navegación histórica.
   */
  constructor(
    fb: FormBuilder,
    authService: AuthService,
    userService: UserService,
    translationService: TranslationService,
    router: Router,
    location: Location,
  ) {
    this.fb = fb;
    this.authService = authService;
    this.userService = userService;
    this.translationService = translationService;
    this.router = router;
    this.location = location;
    this.form = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      name: ['', [Validators.required, Validators.minLength(3)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      birthDate: ['', [Validators.required, this.minimumAgeValidator(14)]],
      email: ['', [Validators.required, Validators.email]],
    });
  }

  /** Inicializa el formulario con los datos del usuario autenticado. */
  ngOnInit(): void {
    this.authService.user$.subscribe((user) => {
      if (!user) {
        this.router.navigate(['/login']);
        return;
      }

      this.form.patchValue({
        firstName: '',
        name: user.displayName || user.email?.split('@')[0] || '',
        lastName: '',
        birthDate: '',
        email: user.email || '',
      });

      this.userService.getUserId(user.uid).subscribe({
        next: (profile) => {
          this.form.patchValue({
            firstName: profile.firstName || '',
            name: profile.name || user.displayName || user.email?.split('@')[0] || '',
            lastName: profile.lastName || '',
            birthDate: profile.birthDate || '',
            email: profile.email || user.email || '',
          });
        },
      });
    });
  }

  /** Navega a la pantalla anterior. */
  goBack(): void {
    this.location.back();
  }

  /**
   * Valida y guarda los cambios de perfil.
   *
   * Flujo:
   * 1) Actualiza Auth (displayName/email)
   * 2) Actualiza backend de usuario
   * 3) Muestra feedback y vuelve a perfil
   */
  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.isSaving) {
      this.form.markAllAsTouched();
      return;
    }

    const user = this.authService.currentUser;
    if (!user) {
      this.error = this.translationService.get('messages.error', 'Error al procesar la solicitud');
      return;
    }

    const firstName = (this.form.value.firstName || '').trim();
    const name = (this.form.value.name || '').trim();
    const lastName = (this.form.value.lastName || '').trim();
    const birthDate = this.form.value.birthDate || '';
    const email = (this.form.value.email || '').trim();

    this.isSaving = true;
    this.error = '';
    this.success = '';

    try {
      await this.authService.updateUserProfileData(name, email);

      const token = await user.getIdToken(true);
      await firstValueFrom(
        this.userService.updateUser(
          user.uid,
          { firstName, name, lastName, birthDate, email },
          token,
        ),
      );

      this.success = this.translationService.get(
        'messages.updated',
        'Actualizado correctamente',
      );

      setTimeout(() => {
        this.router.navigate(['/profile']);
      }, 800);
    } catch (err: any) {
      if (err?.code === 'auth/requires-recent-login') {
        this.error = this.translationService.get(
          'profile.reloginRequired',
          'Debes volver a iniciar sesion para cambiar el correo.',
        );
      } else if (err?.error?.message === 'Usuario menor de 14 años') {
        this.error = this.translationService.get(
          'auth.signup.underageBlocked',
          'Si eres menor de 14 años no puedes acceder a la aplicación',
        );
      } else {
        this.error = this.translationService.get(
          'messages.error',
          'Error al procesar la solicitud',
        );
      }
    } finally {
      this.isSaving = false;
    }
  }
}
