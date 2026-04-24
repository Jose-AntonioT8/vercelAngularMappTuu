import { CommonModule, Location } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { User as FirebaseUser } from '@angular/fire/auth';
import { Router, RouterModule } from '@angular/router';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { firstValueFrom } from 'rxjs';
import { DefaultAvatarDirective } from '../../../core/directives/default-avatar.directive';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { AuthService } from '../../../core/services/auth.service';
import { CloudinaryService } from '../../../core/services/firebase-media.service';
import { ThemeService } from '../../../core/services/theme.service';
import { TranslationService } from '../../../core/services/translation.service';
import { UserService } from '../../../core/services/user.service';

/**
 * Pantalla de perfil de usuario.
 *
 * Responsabilidades:
 * - Mostrar datos básicos del usuario autenticado (nombre/email/avatar).
 * - Permitir restablecer contraseña (Firebase Auth).
 * - Permitir subir avatar (Cloudinary) y sincronizarlo en Firebase Auth.
 * - Exponer acciones de navegación (volver, logout) y cambio de idioma.
 */
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe, DefaultAvatarDirective],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  /** Input file nativo para seleccionar avatar. */
  @ViewChild('avatarInput') avatarInput!: ElementRef<HTMLInputElement>;
  /** Contenedor de rueda+menú para detectar clicks internos. */
  @ViewChild('settingsMenuContainer') settingsMenuContainer?: ElementRef<HTMLElement>;

  /** Usuario autenticado actual (Firebase Auth). */
  user: FirebaseUser | null = null;
  /** Flag de subida de avatar en curso. */
  isUploadingAvatar = false;
  /** Preview local del avatar antes de subir (data URL). */
  avatarPreview: string | null = null;
  /** Controla visibilidad del menú de ajustes. */
  isSettingsMenuOpen = false;

  /** Total de actividades guardadas por el usuario. */
  savedActivitiesCount = 0;
  /** Total de planes guardados por el usuario. */
  savedPlansCount = 0;

  /** Logros (placeholder) renderizados en UI. */
  achievements = [
    {
      id: 1,
      name: 'Explorador',
      icon: '🧭',
      bgColor: '#dbeafe',
      unlocked: true,
    },
    { id: 2, name: 'Viajero', icon: '✈️', bgColor: '#fef3c7', unlocked: true },
    {
      id: 3,
      name: 'Planificador',
      icon: '📋',
      bgColor: '#ede9fe',
      unlocked: true,
    },
    {
      id: 4,
      name: 'Aventurero',
      icon: '🏔️',
      bgColor: '#dcfce7',
      unlocked: false,
    },
    { id: 5, name: 'Social', icon: '👥', bgColor: '#fce7f3', unlocked: false },
    {
      id: 6,
      name: 'Fotógrafo',
      icon: '📸',
      bgColor: '#fed7aa',
      unlocked: false,
    },
    { id: 7, name: 'Experto', icon: '🏆', bgColor: '#fef08a', unlocked: false },
    { id: 8, name: 'Leyenda', icon: '⭐', bgColor: '#e0e7ff', unlocked: false },
  ];

  /** Actividades recientes (placeholder) renderizadas en UI. */
  recentActivities = [
    {
      id: '1',
      name: 'Senderismo en Sierra Nevada',
      image:
        'https://images.unsplash.com/photo-1551632811-561732d1e306?w=100&h=100&fit=crop',
      date: 'Hace 2 días',
    },
    {
      id: '2',
      name: 'Yoga al atardecer',
      image:
        'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=100&h=100&fit=crop',
      date: 'Hace 5 días',
    },
    {
      id: '3',
      name: 'Tour gastronómico',
      image:
        'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=100&h=100&fit=crop',
      date: 'Hace 1 semana',
    },
  ];

  /** Número de logros desbloqueados. */
  get unlockedCount(): number {
    return this.achievements.filter((a) => a.unlocked).length;
  }

  /** Total de favoritos (actividades + planes guardados). */
  get favoritesCount(): number {
    return this.savedActivitiesCount + this.savedPlansCount;
  }

  /** Controla qué sección está expandida en UI. */
  expandedSection: 'achievements' | 'recent' | 'actions' | null = null;
  /** Controla el modal de reset de contraseña. */
  showResetModal = false;
  /** Estado para prevenir dobles clics al borrar la cuenta. */
  isDeletingAccount = false;
  /** Error visible al intentar eliminar la cuenta. */
  deleteAccountError = '';

  /** Alterna la sección expandida en UI. */
  toggleSection(section: 'achievements' | 'recent' | 'actions'): void {
    this.expandedSection = this.expandedSection === section ? null : section;
  }

  constructor(
    private authService: AuthService,
    private router: Router,
    private location: Location,
    private translationService: TranslationService,
    private mediaService: CloudinaryService,
    private userService: UserService,
    private themeService: ThemeService
  ) {}

  /** Abre/cierra el menú de ajustes de perfil. */
  toggleSettingsMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.isSettingsMenuOpen = !this.isSettingsMenuOpen;
  }

  /** Cierra el menú de ajustes si se hace click fuera. */
  @HostListener('document:click', ['$event'])
  closeSettingsMenu(event: MouseEvent): void {
    const target = event.target as Node | null;
    if (
      target &&
      this.settingsMenuContainer?.nativeElement.contains(target)
    ) {
      return;
    }
    this.isSettingsMenuOpen = false;
  }

  /** Navega al formulario de edición de perfil. */
  goToEditProfile(event: MouseEvent): void {
    event.stopPropagation();
    this.isSettingsMenuOpen = false;
    this.router.navigate(['/profile/edit']);
  }

  /** Envía email de restablecimiento de contraseña (si hay email). */
  async sendPasswordReset(): Promise<void> {
    if (!this.user?.email) {
      return;
    }
    try {
      await sendPasswordResetEmail(getAuth(), this.user.email);
      this.showResetModal = true;
    } catch (err) {
      console.error('Error al enviar correo de restablecimiento', err);
    }
  }

  /** Cierra el modal de reset. */
  closeResetModal(): void {
    this.showResetModal = false;
  }

  /** Abre el selector de archivo para cambiar avatar. */
  triggerAvatarInput(): void {
    this.avatarInput.nativeElement.click();
  }

  /**
   * Valida y sube el avatar seleccionado.
   *
   * Reglas UX:
   * - Solo imágenes
   * - Máximo 5MB
   */
  async onAvatarSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;

    const file = input.files[0];
    console.log('📷 Archivo seleccionado:', file.name, file.type, file.size);

    if (!file.type.startsWith('image/')) {
      console.error('❌ No es una imagen válida');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      console.error('❌ Imagen demasiado grande (máx 5MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.avatarPreview = e.target.result;
    };
    reader.readAsDataURL(file);

    this.isUploadingAvatar = true;

    try {
      console.log('⬆️ Iniciando subida...');

      this.mediaService.upload(file, 'avatars').subscribe({
        next: async (urls: any) => {
          console.log('✅ URLs recibidas:', urls);
          if (urls && urls.length > 0) {
            await this.authService.updateUserPhoto(urls[0]);
            console.log('✅ Foto de perfil actualizada');
            this.avatarPreview = null;
          }
          this.isUploadingAvatar = false;
        },
        error: (err: any) => {
          console.error('❌ Error en upload:', err);
          this.avatarPreview = null;
          this.isUploadingAvatar = false;
        },
      });
    } catch (err) {
      console.error('❌ Error:', err);
      this.avatarPreview = null;
      this.isUploadingAvatar = false;
    }
  }

  /** Devuelve el avatar a mostrar (preview > photoURL > null). */
  get displayAvatar(): string | null {
    return this.avatarPreview || this.user?.photoURL || null;
  }

  /** Idioma actual (desde TranslationService). */
  get currentLanguage(): string {
    return this.translationService.getCurrentLanguage();
  }

  /** Cambia el idioma actual. */
  setLanguage(lang: string): void {
    this.translationService.setLanguage(lang);
  }

  ngOnInit(): void {
    this.authService.user$.subscribe((user) => {
      this.user = user;
      if (!user) {
        this.router.navigate(['/login']);
        return;
      }

      this.userService.getUserId(user.uid).subscribe({
        next: (profile) => {
          this.savedActivitiesCount = profile.savedActivities?.length || 0;
          this.savedPlansCount = profile.savedPlans?.length || 0;
        },
        error: () => {
          this.savedActivitiesCount = 0;
          this.savedPlansCount = 0;
        },
      });
    });
  }

  /** Inicial del usuario para avatar fallback. */
  get userInitial(): string {
    if (this.user?.displayName) {
      return this.user.displayName.charAt(0).toUpperCase();
    }
    if (this.user?.email) {
      return this.user.email.charAt(0).toUpperCase();
    }
    return 'U';
  }

  /** Nombre visible del usuario (displayName o derivado del email). */
  get userName(): string {
    return this.user?.displayName || this.user?.email?.split('@')[0] || '';
  }

  /** Email del usuario. */
  get userEmail(): string {
    return this.user?.email || '';
  }

  /** Indica si el usuario actual es admin (regla en AuthService). */
  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  /** Fecha de alta del usuario (si está disponible en metadata). */
  get memberSince(): string {
    if (this.user?.metadata?.creationTime) {
      return new Date(this.user.metadata.creationTime).toLocaleDateString();
    }
    return '';
  }

  /** Cierra sesión. */
  logout(): void {
    this.authService.logout();
  }

  /** Elimina la cuenta del usuario actual en backend y cierra sesión. */
  async deleteAccount(): Promise<void> {
    if (!this.user || this.isDeletingAccount) {
      return;
    }

    const confirmed = window.confirm(
      this.translationService.get(
        'profile.deleteConfirm',
        'Esta accion eliminara tu usuario y no se puede deshacer. ¿Deseas continuar?',
      ),
    );

    if (!confirmed) {
      return;
    }

    this.isDeletingAccount = true;
    this.deleteAccountError = '';

    try {
      const token = await this.user.getIdToken(true);
      await firstValueFrom(this.userService.deleteUser(this.user.uid, token));
      await this.authService.logout();
    } catch (error) {
      this.deleteAccountError = this.translationService.get(
        'profile.deleteError',
        'No se pudo eliminar la cuenta. Intentalo de nuevo.',
      );
    } finally {
      this.isDeletingAccount = false;
    }
  }

  /** Navega hacia atrás usando el historial. */
  goBack(): void {
    this.location.back();
  }

  /** Alterna entre modo claro y oscuro. */
  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  /** Obtiene el tema actual ('light' o 'dark'). */
  get currentTheme(): 'light' | 'dark' {
    return this.themeService.getTheme();
  }
}
