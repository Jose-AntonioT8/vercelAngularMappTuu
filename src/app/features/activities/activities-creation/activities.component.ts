import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { LanguageSelectorComponent } from '../../../common/language-selector/language-selector.component';
import { MapPreviewComponent } from '../../../common/maps/map-preview.component';
import { ActivityType } from '../../../common/models/activityType.models';
import { HighlightDirective } from '../../../core/directives/highlight.directive';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { ActivityService } from '../../../core/services/activity.service';
import { ActivityTypeService } from '../../../core/services/activitytype.service';
import { AuthService } from '../../../core/services/auth.service';
import { CloudinaryService } from '../../../core/services/firebase-media.service';
import { IaAssistantService } from '../../../core/services/ia-assistant.service';
import { ContentModerationService } from '../../../core/services/content-moderation.service';
import { TranslationService } from '../../../core/services/translation.service';
import { UserService } from '../../../core/services/user.service';

/**
 * Pantalla de creación de actividades.
 *
 * - Valida formulario (nombre/descripcion/tipo/coordenadas/precio).
 * - Obliga a subir una imagen y la sube a Cloudinary.
 * - Crea la actividad vía backend con Bearer token.
 * - Asocia la actividad al usuario (en `UserService`) tras crearla.
 */
@Component({
  standalone: true,
  selector: 'app-activities',
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    TranslatePipe,
    HighlightDirective,
    MapPreviewComponent,
    LanguageSelectorComponent,
  ],
  templateUrl: './activities.component.html',
  styleUrl: './activities.component.scss',
})
export class ActivitiesCreationComponent {
  /** Input file nativo para seleccionar imagen. */
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  /** Mensaje de error para UI. */
  error = '';
  /** Mensaje de éxito para UI. */
  success = '';
  /** Aviso moderado para UI. */
  warning = '';
  /** Formulario reactivo de creación. */
  formActivityCreation: FormGroup;
  /** Catálogo de tipos (para selects). */
  activityTypes: any;
  /** Lista de nombres (derivada) usada por la UI. */
  activityTypesName: string[] = [];
  /** Archivo de imagen seleccionado. */
  selectedFile: File | null = null;
  /** Preview local de imagen (data URL). */
  imagePreview: string | null = null;
  /** Flag de subida en curso. */
  isUploading = false;
  /** Flag para evitar generar descripciones en paralelo. */
  isGeneratingDescription = false;

  /** Abre el selector de archivo para subir imagen. */
  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  constructor(
    /** Constructor de formularios. */
    private formSvc: FormBuilder,
    /** Router para navegar tras crear. */
    private route: Router,
    /** Servicio para relacionar actividad creada con usuario. */
    private userService: UserService,
    /** Auth para token/usuario actual. */
    private auth: AuthService,
    /** Servicio de actividades (mutación). */
    private activityService: ActivityService,
    /** Servicio de tipos para catálogo. */
    private ActivityTypeService: ActivityTypeService,
    /** Servicio de media (Cloudinary). */
    private mediaService: CloudinaryService,
    /** Servicio IA para autocompletar descripciones. */
    private iaAssistantService: IaAssistantService,
    /** Servicio de moderación de contenido básico. */
    private moderationService: ContentModerationService,
    /** Servicio de traducción runtime para mensajes en TS. */
    private translationService: TranslationService
  ) {
    this.formActivityCreation = this.formSvc.group({
      name: ['', [Validators.required]],
      description: ['', [Validators.required]],
      activityType: ['', [Validators.required]],
      latitude: [
        '',
        [
          Validators.required,
          Validators.pattern(/^-?\d+(\.\d+)?$/),
          Validators.min(-90),
          Validators.max(90),
        ],
      ],
      longitude: [
        '',
        [
          Validators.required,
          Validators.pattern(/^-?\d+(\.\d+)?$/),
          Validators.min(-180),
          Validators.max(180),
        ],
      ],
      price: [null, [Validators.min(0)]],
    });
    this.activityTypes = this.ActivityTypeService.getActivitiesType();
  }
  /** Carga tipos disponibles para el selector. */
  ngOnInit(): void {
    this.ActivityTypeService.getActivitiesType().subscribe(
      (res: ActivityType[]) => {
        this.activityTypes = res;
        this.activityTypesName = res.map((type) => type.name);
      }
    );
  }

  /** Coordenadas para el preview (lat). */
  get mapLatitude(): string {
    return this.formActivityCreation.get('latitude')?.value || '';
  }

  /** Coordenadas para el preview (lng). */
  get mapLongitude(): string {
    return this.formActivityCreation.get('longitude')?.value || '';
  }

  /** Actualiza el formulario cuando el mapa emite nuevas coordenadas. */
  onMapCoordinatesChange(coords: {
    latitude: number;
    longitude: number;
  }): void {
    this.formActivityCreation.patchValue({
      latitude: coords.latitude.toString(),
      longitude: coords.longitude.toString(),
    });
  }

  /** Imagen actual para preview (data URL). */
  get currentImage(): string {
    return this.imagePreview || '';
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

  /** Sube la imagen seleccionada a Cloudinary y devuelve su URL. */
  async uploadImage(): Promise<string | null> {
    if (!this.selectedFile) return null;
    this.isUploading = true;
    this.error = '';
    try {
      const blob = new Blob([this.selectedFile], {
        type: this.selectedFile.type,
      });
      const urls = await this.mediaService
        .upload(blob, 'activities')
        .toPromise();
      if (urls && urls.length > 0) {
        this.isUploading = false;
        return urls[0];
      }
      throw new Error('No se obtuvo URL de la imagen subida');
    } catch (err: any) {
      this.isUploading = false;
      this.error =
        err.message ||
        'Error al subir la imagen. Por favor, intenta nuevamente.';
      return null;
    }
  }

  /** Crea la actividad en backend y la vincula al usuario. */
  async onCreate() {
    if (!this.selectedFile) {
      this.error = 'Debes subir una imagen';
      return;
    }

    if (this.formActivityCreation.invalid) {
      this.formActivityCreation.markAllAsTouched();
      return;
    }
    this.warning = '';

    const moderation = this.moderationService.moderateActivityInput(
      this.formActivityCreation.value.name,
      this.formActivityCreation.value.description,
      this.selectedFile
    );
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
      (type: ActivityType) =>
        type.name === this.formActivityCreation.value.activityType
    );

    const imageUrl = await this.uploadImage();
    if (!imageUrl) return;

    const latitude = Number(this.formActivityCreation.value.latitude);
    const longitude = Number(this.formActivityCreation.value.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      this.error = 'Latitud/longitud no validas';
      return;
    }

    const activityData = {
      name: this.formActivityCreation.value.name,
      description: this.formActivityCreation.value.description,
      latitude,
      longitude,
      imageRef: imageUrl,
      activityTypeId: selectedActivityType ? selectedActivityType.id : null,
      createdAt: Date.now(),
      ownerId: this.auth.currentUser,
      rating: 0,
      price: parseFloat(this.formActivityCreation.value.price) || 0,
      moderationResult: {
        blocked: moderation.blocked,
        warning: moderation.warning,
        score: moderation.score,
        reasons: moderation.reasons,
      },
    };

    try {
      const user = this.auth.currentUser;
      if (!user) throw new Error('No autenticado');
      const token = await user.getIdToken();

      this.activityService.createActivity(activityData, token).subscribe({
        next: (res) => {
          this.userService.createActivity(user.uid, res.id, token).subscribe();
          this.success = 'Actividad creada con éxito';
          setTimeout(() => {
            this.route.navigate(['/activitiesList']);
          }, 1000);
        },
        error: (err) => {
          this.error = this.mapCreateError(err);
        },
      });
    } catch (err) {
      this.error =
        'Error de autenticación. Por favor, inicia sesión nuevamente.';
    }
  }

  private mapCreateError(error: unknown): string {
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
    }
    return 'Error al crear la actividad. Por favor, intenta nuevamente.';
  }

  /**
   * Genera una descripción con IA usando nombre, categoría, ubicación y precio.
   * Si ya hay texto en descripción, se usa como base para mejorar el resultado.
   */
  async autocompleteDescriptionWithIA(): Promise<void> {
    if (this.isGeneratingDescription) {
      return;
    }

    const name = (this.formActivityCreation.get('name')?.value || '').trim();
    const activityType = (
      this.formActivityCreation.get('activityType')?.value || ''
    ).trim();
    const latitude = (this.formActivityCreation.get('latitude')?.value || '').trim();
    const longitude = (
      this.formActivityCreation.get('longitude')?.value || ''
    ).trim();

    if (!name || !activityType || !latitude || !longitude) {
      this.error = this.translationService.get(
        'messages.completeFieldsBeforeDescription',
        'Escriba el resto de campos antes de generar la descripcion',
      );
      return;
    }

    const currentDescription = (
      this.formActivityCreation.get('description')?.value || ''
    ).trim();
    const rawPrice = this.formActivityCreation.get('price')?.value;
    const hasPrice = rawPrice !== null && rawPrice !== '' && !Number.isNaN(Number(rawPrice));
    const freeText = this.translationService.get('activities.free', 'Gratis');
    const priceText = hasPrice ? `${Number(rawPrice)} EUR` : freeText;

    const prompt = [
      'Necesito que redactes una descripcion para una actividad en MappTuu.',
      `Nombre: ${name}`,
      `Categoria: ${activityType}`,
      `Ubicacion (coordenadas): ${latitude}, ${longitude}`,
      `Precio: ${priceText}`,
      currentDescription
        ? `Texto escrito por el usuario para tener en cuenta: ${currentDescription}`
        : 'No hay descripcion previa escrita por el usuario.',
      'Genera una descripcion natural, atractiva y clara en 3-5 frases. Si el precio no existe, menciona que es gratis.',
      'No uses listas ni encabezados.',
    ].join('\n');

    this.error = '';
    this.isGeneratingDescription = true;

    try {
      const generatedDescription = await firstValueFrom(
        this.iaAssistantService.ask(prompt),
      );

      if (generatedDescription && generatedDescription.trim()) {
        this.formActivityCreation.patchValue({
          description: generatedDescription.trim(),
        });
      } else {
        this.error = this.translationService.get(
          'messages.descriptionGenerationFailed',
          'No se pudo generar la descripcion. Intentalo de nuevo.',
        );
      }
    } catch (error) {
      this.error = this.translationService.get(
        'messages.descriptionGenerationFailed',
        'No se pudo generar la descripcion. Intentalo de nuevo.',
      );
    } finally {
      this.isGeneratingDescription = false;
    }
  }
}
