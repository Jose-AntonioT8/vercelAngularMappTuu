import { CommonModule, Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';
import { UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-profile-edit',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './profile-edit.component.html',
  styleUrl: './profile-edit.component.scss',
})
export class ProfileEditComponent implements OnInit {
  isSaving = false;
  error = '';
  success = '';

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
  });

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private userService: UserService,
    private translationService: TranslationService,
    private router: Router,
    private location: Location,
  ) {}

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

  goBack(): void {
    this.location.back();
  }

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
