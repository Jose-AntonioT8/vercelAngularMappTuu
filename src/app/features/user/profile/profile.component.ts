import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { TranslationService } from '../../../core/services/translation.service';
import { FirebaseMediaService } from '../../../core/services/firebase-media.service';
import { DefaultAvatarDirective } from '../../../core/directives/default-avatar.directive';
import { User } from '@angular/fire/auth';
import { LanguageSelectorComponent } from '../../../common/language-selector/language-selector.component';
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe, DefaultAvatarDirective],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  @ViewChild('avatarInput') avatarInput!: ElementRef<HTMLInputElement>;
  
  user: User | null = null;
  isUploadingAvatar = false;
  avatarPreview: string | null = null;

  stats = {
    activitiesVisited: 12,
    plansCreated: 5,
    favorites: 8
  };

  achievements = [
    { id: 1, name: 'Explorador', icon: '🧭', bgColor: '#dbeafe', unlocked: true },
    { id: 2, name: 'Viajero', icon: '✈️', bgColor: '#fef3c7', unlocked: true },
    { id: 3, name: 'Planificador', icon: '📋', bgColor: '#ede9fe', unlocked: true },
    { id: 4, name: 'Aventurero', icon: '🏔️', bgColor: '#dcfce7', unlocked: false },
    { id: 5, name: 'Social', icon: '👥', bgColor: '#fce7f3', unlocked: false },
    { id: 6, name: 'Fotógrafo', icon: '📸', bgColor: '#fed7aa', unlocked: false },
    { id: 7, name: 'Experto', icon: '🏆', bgColor: '#fef08a', unlocked: false },
    { id: 8, name: 'Leyenda', icon: '⭐', bgColor: '#e0e7ff', unlocked: false }
  ];

  recentActivities = [
    { id: '1', name: 'Senderismo en Sierra Nevada', image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=100&h=100&fit=crop', date: 'Hace 2 días' },
    { id: '2', name: 'Yoga al atardecer', image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=100&h=100&fit=crop', date: 'Hace 5 días' },
    { id: '3', name: 'Tour gastronómico', image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=100&h=100&fit=crop', date: 'Hace 1 semana' }
  ];

  get unlockedCount(): number {
    return this.achievements.filter(a => a.unlocked).length;
  }

  expandedSection: 'achievements' | 'recent' | 'actions' | null = null;

  toggleSection(section: 'achievements' | 'recent' | 'actions'): void {
    this.expandedSection = this.expandedSection === section ? null : section;
  }

  constructor(
    private authService: AuthService,
    private router: Router,
    private location: Location,
    private translationService: TranslationService,
    private mediaService: FirebaseMediaService
  ) {}

  triggerAvatarInput(): void {
    this.avatarInput.nativeElement.click();
  }

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
        next: async (urls) => {
          console.log('✅ URLs recibidas:', urls);
          if (urls && urls.length > 0) {
            await this.authService.updateUserPhoto(urls[0]);
            console.log('✅ Foto de perfil actualizada');
            this.avatarPreview = null;
          }
          this.isUploadingAvatar = false;
        },
        error: (err) => {
          console.error('❌ Error en upload:', err);
          this.avatarPreview = null;
          this.isUploadingAvatar = false;
        }
      });
    } catch (err) {
      console.error('❌ Error:', err);
      this.avatarPreview = null;
      this.isUploadingAvatar = false;
    }
  }

  get displayAvatar(): string | null {
    return this.avatarPreview || this.user?.photoURL || null;
  }

  get currentLanguage(): string {
    return this.translationService.getCurrentLanguage();
  }

  setLanguage(lang: string): void {
    this.translationService.setLanguage(lang);
  }

  ngOnInit(): void {
    this.authService.user$.subscribe(user => {
      this.user = user;
      if (!user) {
        this.router.navigate(['/login']);
      }
    });
  }

  get userInitial(): string {
    if (this.user?.displayName) {
      return this.user.displayName.charAt(0).toUpperCase();
    }
    if (this.user?.email) {
      return this.user.email.charAt(0).toUpperCase();
    }
    return 'U';
  }

  get userName(): string {
    return this.user?.displayName || this.user?.email?.split('@')[0] || '';
  }

  get userEmail(): string {
    return this.user?.email || '';
  }

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  get memberSince(): string {
    if (this.user?.metadata?.creationTime) {
      return new Date(this.user.metadata.creationTime).toLocaleDateString();
    }
    return '';
  }

  logout(): void {
    this.authService.logout();
  }

  goBack(): void {
    this.location.back();
  }
}
