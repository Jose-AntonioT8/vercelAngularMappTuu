import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LanguageSelectorComponent } from '../../../common/language-selector/language-selector.component';
import { MapPreviewComponent } from '../../../common/maps/map-preview.component';
import { ActivityType } from '../../../common/models/activityType.models';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { ActivityService } from '../../../core/services/activity.service';
import { ActivityTypeService } from '../../../core/services/activitytype.service';
import { AuthService } from '../../../core/services/auth.service';
import { ContentModerationService } from '../../../core/services/content-moderation.service';
import { CloudinaryService } from '../../../core/services/firebase-media.service';
import { IaAssistantService } from '../../../core/services/ia-assistant.service';
import { TranslationService } from '../../../core/services/translation.service';

/**
 * Pantalla de edición de actividad.
 *
 * - Carga la actividad por `id` de ruta y rellena el formulario.
 * - Permite cambiar coordenadas (con previsualización de mapa).
 * - Permite actualizar la imagen (subida a Cloudinary) o mantener la existente.
 * - Envía actualización al backend con Bearer token.
 */
@Component({
  standalone: true,
  selector: 'app-activity-update',
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TranslatePipe, MapPreviewComponent, LanguageSelectorComponent],
  templateUrl: './activity-update.component.html',
  styleUrl: './activity-update.component.scss',
})
export class ActivitiesUpdateComponent {
  readonly fallbackImage = 'assets/images/placeholder.svg';
  /** Mensaje de error para UI. */
  error = '';
  /** Mensaje de éxito para UI. */
  success = '';
  /** Aviso de moderación no bloqueante. */
  warning = '';
  /** Formulario reactivo de edición. */
  formActivityUpdate: FormGroup;
  /** Catálogo de tipos de actividad. */
  activityTypes: any;
  /** Lista de nombres de tipos (derivada) para la UI. */
  activityTypesName : string[] = [];
  /** ID de la actividad en edición (ruta). */
  currentId: string | null = null;
  /** Archivo de imagen seleccionado para reemplazar (opcional). */
  selectedFile: File | null = null;
  /** Preview local de la imagen (data URL). */
  imagePreview: string | null = null;
  /** Flag de subida en curso (para deshabilitar UI). */
  isUploading = false;

  constructor(
    /** Constructor de formularios. */
    private formSvc: FormBuilder,
    /** Router para navegar tras actualizar. */
    private route: Router,
    /** Ruta activa para leer `id`. */
    private router: ActivatedRoute,
    /** Auth para token/usuario actual. */
    private auth: AuthService,
    /** Servicio de actividades (lectura puntual y mutación). */
    private activityService: ActivityService,
    /** Servicio de tipos para catálogo. */
    private ActivityTypeService: ActivityTypeService,
    /** Servicio de media (Cloudinary). */
    private mediaService: CloudinaryService,
    /** Servicio de moderación de contenido básico. */
    private moderationService: ContentModerationService,
    /** Servicio IA para moderación de imagen con Groq. */
    private iaAssistantService: IaAssistantService,
    /** Servicio de traducción runtime para mensajes en TS. */
    private translationService: TranslationService
  ) {
    this.formActivityUpdate = this.formSvc.group({
      name: ['', [Validators.required]],
      description: ['', [Validators.required]],
      activityType: ['', [Validators.required]],
      latitude: ['', [Validators.pattern(/^-?\d+(\.\d+)?$/), Validators.min(-90), Validators.max(90)]],
      longitude: ['', [Validators.pattern(/^-?\d+(\.\d+)?$/), Validators.min(-180), Validators.max(180)]],
      price: [null, [Validators.min(0)]],
    });
    this.activityTypes = this.ActivityTypeService.getActivitiesType();
  }
  /** Carga tipos y la actividad a editar. */
  ngOnInit(): void {
    this.ActivityTypeService.getActivitiesType().subscribe(
      (res: ActivityType[]) => {
        this.activityTypes = res;
        this.activityTypesName = res.map((type) => type.name);
      }
    );
    this.currentId = this.router.snapshot.paramMap.get('id');
    if (this.currentId) {
      this.activityService.getActivityId(this.currentId).subscribe({
        next: (data: any) => {
          (this.formActivityUpdate as any).existingImageRef = data.imageRef;
          this.formActivityUpdate.patchValue({
            name: data.name,
            description: data.description,
            latitude: data.latitude,
            longitude: data.longitude,
            activityType: this.activityTypes.find((t: any) => t.id === data.activityTypeId)?.name,
            price: data.price || null
          });
        },
        error: (err) => console.error('Error cargando actividad', err)
      });
    }
  }
  /** Coordenadas para el preview del mapa (lat). */
  get mapLatitude(): string {
    return this.formActivityUpdate.get('latitude')?.value || '';
  }

  /** Coordenadas para el preview del mapa (lng). */
  get mapLongitude(): string {
    return this.formActivityUpdate.get('longitude')?.value || '';
  }

  /** Actualiza el form cuando el usuario selecciona coords en el mapa. */
  onMapCoordinatesChange(coords: { latitude: number; longitude: number }): void {
    this.formActivityUpdate.patchValue({
      latitude: coords.latitude.toString(),
      longitude: coords.longitude.toString()
    });
  }

  /** Cierra sesión y vuelve al landing. */
  logOut() {
    this.route.navigate(['/landingPage']);
    this.auth.logout();
  }

  /** Imagen actual (preview > existente). */
  get currentImage(): string {
    if (this.imagePreview) return this.imagePreview;
    const existingImage = (this.formActivityUpdate as any).existingImageRef;
    return existingImage || '';
  }

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (!img.src.includes(this.fallbackImage)) {
      img.src = this.fallbackImage;
      return;
    }
    img.onerror = null;
  }

  /** Valida y previsualiza un fichero de imagen seleccionado. */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (!file.type.startsWith('image/')) {
        this.error = 'Por favor, selecciona un archivo de imagen válido';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        this.error = 'La imagen no debe superar los 5MB';
        return;
      }
      const imageModeration = this.moderationService.moderateImageFile(file);
      if (imageModeration.blocked) {
        this.error = this.translationService.get(
          'moderation.blockedImage',
          'La imagen parece no apropiada y no se puede publicar.'
        );
        this.selectedFile = null;
        this.imagePreview = null;
        return;
      }
      if (imageModeration.warning) {
        this.warning = this.translationService.get(
          'moderation.warningImage',
          'La imagen parece sospechosa y podria ser revisada por moderacion.'
        );
      } else {
        this.warning = '';
      }
      this.selectedFile = file;
      this.error = '';
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  /** Sube la imagen seleccionada a Cloudinary y devuelve la URL. */
  async uploadImage(): Promise<string | null> {
    if (!this.selectedFile) return null;
    this.isUploading = true;
    this.error = '';
    try {
      const blob = new Blob([this.selectedFile], { type: this.selectedFile.type });
      const urls = await this.mediaService.upload(blob, 'activities').toPromise();
      if (urls && urls.length > 0) {
        this.isUploading = false;
        return urls[0];
      }
      throw new Error('No se obtuvo URL de la imagen subida');
    } catch (err: any) {
      this.isUploading = false;
      this.error = err.message || 'Error al subir la imagen. Por favor, intenta nuevamente.';
      return null;
    }
  }

  /** Envía la actualización de la actividad al backend. */
  async onCreate() {
    if (this.formActivityUpdate.invalid) {
      this.formActivityUpdate.markAllAsTouched();
      return;
    }
    this.warning = '';

    const baseModeration = this.moderationService.moderateActivityInput(
      this.formActivityUpdate.value.name,
      this.formActivityUpdate.value.description,
      this.selectedFile
    );

    // Moderación de imagen con Groq (visión) antes de actualizar/guardar.
    const existingImageRef: string | undefined = (this.formActivityUpdate as any).existingImageRef;
    let groqModeration = {
      blocked: false,
      warning: false,
      score: 0,
      reasons: [] as string[],
    };

    if (this.selectedFile) {
      groqModeration = await firstValueFrom(
        this.iaAssistantService.moderateImageFileWithGroq(this.selectedFile),
      );
    } else if (existingImageRef) {
      groqModeration = await firstValueFrom(
        this.iaAssistantService.moderateImageUrlWithGroq(existingImageRef),
      );
    }

    const moderation = {
      blocked: baseModeration.blocked || groqModeration.blocked,
      warning: baseModeration.warning || groqModeration.warning,
      score: Math.min(1, Math.max(baseModeration.score, groqModeration.score)),
      reasons: [...new Set([...baseModeration.reasons, ...groqModeration.reasons])],
    };

    if (moderation.blocked) {
      this.error = this.translationService.get(
        'moderation.blockedContent',
        'Se detecto contenido no apropiado en texto o imagen.'
      );
      return;
    }
    if (moderation.warning) {
      this.warning = this.translationService.get(
        'moderation.warningContent',
        'Contenido potencialmente sensible detectado. Pasara a revision manual.'
      );
    }

    const selectedActivityType = this.activityTypes.find(
      (type: ActivityType) => type.name === this.formActivityUpdate.value.activityType
    );

    let imageUrl = (this.formActivityUpdate as any).existingImageRef;

    if (this.selectedFile) {
      imageUrl = await this.uploadImage();
      if (!imageUrl) return;
    }

    if (!imageUrl) {
      this.error = 'Debes subir una imagen o mantener la existente';
      return;
    }

    const activityData = {
      name: this.formActivityUpdate.value.name,
      description: this.formActivityUpdate.value.description,
      latitude: this.formActivityUpdate.value.latitude,
      longitude: this.formActivityUpdate.value.longitude,
      imageRef: imageUrl,
      activityTypeId: selectedActivityType ? selectedActivityType.id : undefined,
      price: parseFloat(this.formActivityUpdate.value.price) || 0,
      moderationResult: {
        blocked: moderation.blocked,
        warning: moderation.warning,
        score: moderation.score,
        reasons: moderation.reasons,
      },
    };

    console.log('📦 Datos enviados al backend:', activityData);

    try {
      const user = this.auth.currentUser;
      if (!user) throw new Error('No autenticado');
      const token = await user.getIdToken();
      const idUrl = this.router.snapshot.paramMap.get('id');
      this.activityService.updateActivity(idUrl!, activityData, token).subscribe({
        next: (res) => {
          this.success = 'Actividad actualizada con éxito';
          setTimeout(() => {
             this.route.navigate(['/activitiesList']);
          }, 1000);
        },
        error: (err) => {
          this.error = this.mapUpdateError(err);
        }
      });
    } catch (err) {
      this.error = 'Error de autenticación. Por favor, inicia sesión nuevamente.';
    }
  }

  private mapUpdateError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 400) {
        return this.translationService.get(
          'moderation.backendMissingModeration',
          'No se pudo validar la moderacion del contenido. Revisa los datos e intenta de nuevo.'
        );
      }
      if (error.status === 422) {
        return this.translationService.get(
          'moderation.blockedContent',
          'Se detecto contenido no apropiado en texto o imagen.'
        );
      }
      if (error.status === 401 || error.status === 403) {
        return this.translationService.get(
          'messages.sessionExpired',
          'Tu sesion no tiene permisos para esta accion.'
        );
      }
      if (error.status === 409) {
        return this.translationService.get(
          'moderation.conflictStatus',
          'La actividad cambio de estado de moderacion. Recarga e intenta de nuevo.'
        );
      }
    }
    return 'Error al guardar los cambios.';
  }
}
