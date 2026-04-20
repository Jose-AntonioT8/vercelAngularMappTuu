import { CommonModule, Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
      name: ['', [Validators.required, Validators.minLength(3)]],
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
        name: user.displayName || user.email?.split('@')[0] || '',
        email: user.email || '',
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

    const name = (this.form.value.name || '').trim();
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
          { name, email },
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
