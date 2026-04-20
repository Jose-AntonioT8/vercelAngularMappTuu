import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LanguageSelectorComponent } from '../../../common/language-selector/language-selector.component';
import { Activity } from '../../../common/models/activity.model';
import { ActivityType } from '../../../common/models/activityType.models';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { ActivityService } from '../../../core/services/activity.service';
import { ActivityTypeService } from '../../../core/services/activitytype.service';
import { AuthService } from '../../../core/services/auth.service';
import { CloudinaryService } from '../../../core/services/firebase-media.service';
import { IaAssistantService } from '../../../core/services/ia-assistant.service';
import { PlanService } from '../../../core/services/plan.service';
import { TranslationService } from '../../../core/services/translation.service';
import { UserService } from '../../../core/services/user.service';
/**
 * Pantalla para crear un plan.
 *
 * - Carga actividades disponibles y permite seleccionarlas (selector múltiple).
 * - Permite subir una imagen (Cloudinary) y guardar el plan vía API protegida.
 * - Al crear, también registra la relación usuario→plan en `UserService`.
 */
@Component({
  selector: 'app-plans-creation',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    TranslatePipe,
    LanguageSelectorComponent,
  ],
  templateUrl: './plans-creation.component.html',
  styleUrl: './plans-creation.component.scss',
})
export class PlansCreationComponent implements OnInit {
  /** Input file nativo (se dispara con un botón custom). */
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  /** Mensaje de error para la UI. */
  error = '';
  /** Mensaje de éxito para la UI. */
  success = '';
  /** Formulario reactivo de creación del plan. */
  formPlanCreation;
  /** Payload auxiliar (no tipado) usado por la pantalla. */
  planData: any;
  /** Actividades disponibles cargadas desde API. */
  activities: Activity[] = [];
  /** Nombres de actividades para el selector. */
  activitiesName: string[] = [];
  /** Archivo de imagen seleccionado para subir. */
  selectedFile: File | null = null;
  /** Preview local de la imagen. */
  imagePreview: string | null = null;
  /** Estado de subida (para deshabilitar UI/mostrar spinner). */
  isUploading = false;
  /** Catálogo de tipos de actividad para inferir categorías del plan. */
  activityTypes: ActivityType[] = [];
  /** Flag para evitar generar descripciones en paralelo. */
  isGeneratingDescription = false;

  constructor(
    private userService: UserService,
    private formSvc: FormBuilder,
    private route: Router,
    private auth: AuthService,
    private planService: PlanService,
    private activityService: ActivityService,
    private mediaService: CloudinaryService,
    private activityTypeService: ActivityTypeService,
    private iaAssistantService: IaAssistantService,
    private translationService: TranslationService
  ) {
    // Inicialización del FormGroup en el constructor
    this.formPlanCreation = this.formSvc.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.maxLength(250)]],
      // Control para el selector múltiple, inicializado con un ARRAY vacío
      activitiesIds: [[] as string[]],
      imgRef: [''],
      visibility: [true],
    });
  }

  /** Carga el catálogo de actividades para permitir selección. */
  ngOnInit(): void {
    this.activityService.getActivities().subscribe(
      (res: Activity[]) => {
        this.activities = res;
        this.activitiesName = res.map((type) => type.name);
      },
      (err) => {
        console.error('Error cargando actividades', err);
      }
    );

    this.activityTypeService.getActivitiesType().subscribe((res: ActivityType[]) => {
      this.activityTypes = res;
    });
  }

  /** Abre el selector de archivo nativo. */
  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  /** Imagen actual a mostrar: preview local o valor del formulario. */
  get currentImage(): string {
    return (
      this.imagePreview || this.formPlanCreation.get('imgRef')?.value || ''
    );
  }

  /** Handler de selección de imagen con validación básica (tipo y tamaño). */
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
      this.selectedFile = file;
      this.error = '';
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  /**
   * Sube la imagen seleccionada a Cloudinary y devuelve su URL.
   * Si no hay archivo nuevo, reutiliza `imgRef` del formulario.
   */
  async uploadImage(): Promise<string | null> {
    if (!this.selectedFile)
      return this.formPlanCreation.get('imgRef')?.value || null;
    this.isUploading = true;
    this.error = '';
    try {
      const blob = new Blob([this.selectedFile], {
        type: this.selectedFile.type,
      });
      const urls = await this.mediaService.upload(blob, 'plans').toPromise();
      if (urls && urls.length > 0) {
        this.isUploading = false;
        return urls[0];
      }
      throw new Error('No se obtuvo URL de la imagen subida');
    } catch (err: any) {
      this.isUploading = false;
      this.error = err.message || 'Error al subir la imagen.';
      return null;
    }
  }

  /** Cuenta cuántas actividades hay seleccionadas en el control. */
  getSelectedCount(): number {
    const selected: string[] =
      this.formPlanCreation.get('activitiesIds')?.value || [];
    return selected.length;
  }

  // --- Lógica del Selector de Actividades Mejorado ---

  /**
   * Verifica si una actividad está seleccionada actualmente en el formulario.
   * @param activityName El nombre de la actividad a verificar.
   * @returns true si la actividad está seleccionada, false en caso contrario.
   */
  isSelected(activityName: string): boolean {
    const selectedNames: string[] =
      this.formPlanCreation.get('activitiesIds')?.value || [];
    return selectedNames.includes(activityName);
  }

  /**
   * Alterna la selección de una actividad en el formulario.
   * @param activityName El nombre de la actividad a alternar.
   */
  toggleActivitySelection(activityName: string): void {
    // Obtener los nombres seleccionados actualmente (será un array de strings)
    const currentSelectedNames: string[] =
      this.formPlanCreation.get('activitiesIds')?.value || [];
    let updatedSelectedNames: string[] = [];

    if (currentSelectedNames.includes(activityName)) {
      // Deseleccionar: filtrar el nombre de la actividad del array
      updatedSelectedNames = currentSelectedNames.filter(
        (name) => name !== activityName
      );
    } else {
      // Seleccionar: añadir el nombre de la actividad al array
      updatedSelectedNames = [...currentSelectedNames, activityName];
    }

    // Actualizar el valor del control 'activitiesIds'
    this.formPlanCreation.get('activitiesIds')?.setValue(updatedSelectedNames);
  }

  // --- Lógica de Envío del Formulario ---

  /**
   * Crea el plan.
   *
   * Valida formulario, mapea nombres→ids, sube imagen si aplica, obtiene token y llama al API.
   */
  async onCreate() {
    if (this.formPlanCreation.invalid) {
      this.formPlanCreation.markAllAsTouched();
      return;
    }

    const selectedActivityNames: string[] =
      this.formPlanCreation.value.activitiesIds || [];
    const selectedActivityIds: string[] = this.activities
      .filter((act: Activity) => selectedActivityNames.includes(act.name))
      .map((act: Activity) => act.id);

    const user = await this.auth.currentUser;
    if (!user) {
      this.error = 'Debes iniciar sesión para crear un plan.';
      return;
    }

    const imageUrl = await this.uploadImage();

    const planData = {
      name: this.formPlanCreation.value.name,
      description: this.formPlanCreation.value.description,
      activitiesIds: selectedActivityIds,
      visibility: this.formPlanCreation.value.visibility,
      imgRef: imageUrl || '',
      createdAt: Date.now(),
      ownerId: this.auth.currentUser,
      rating: 0,
    };

    try {
      const token = await user.getIdToken();

      this.planService.createPlan(planData, token).subscribe({
        next: (res) => {
          this.userService.createPlan(user.uid, res.id, token).subscribe();
          this.success = 'Plan creado con éxito';
          setTimeout(() => {
            this.route.navigate(['/plansList']);
          }, 1000);
        },
        error: (err) => {
          console.error('create error', err);
          this.error = 'Error al crear el plan.';
        },
      });
    } catch (err) {
      console.error('Error al crear plan:', err);
      this.error = 'Error inesperado al crear el plan.';
    }
  }

  // --- Lógica de Navegación y Errores (sin cambios mayores) ---

  /** Cierra sesión y vuelve a landing. */
  logOut() {
    this.route.navigate(['/landingPage']);
    this.auth.logout();
  }

  /** Devuelve un mensaje de error por control del formulario. */
  getError(control: string) {
    switch (control) {
      case 'name':
        if (
          this.formPlanCreation.controls.name.errors != null &&
          Object.keys(this.formPlanCreation.controls.name.errors).includes(
            'required'
          )
        )
          return 'El nombre es requerido';
        break;
      case 'description':
        if (
          this.formPlanCreation.controls.description.errors != null &&
          Object.keys(
            this.formPlanCreation.controls.description.errors
          ).includes('required')
        )
          return 'La descripción es requerida';
        break;

      case 'visibility':
        if (
          this.formPlanCreation.controls.visibility.errors != null &&
          Object.keys(
            this.formPlanCreation.controls.visibility.errors
          ).includes('required')
        )
          return 'Público o privado';
        break;

      case 'activitiesIds':
        if (
          this.formPlanCreation.controls.activitiesIds.errors != null &&
          Object.keys(
            this.formPlanCreation.controls.activitiesIds.errors
          ).includes('required')
        )
          return 'Selecciona una actividad valida o ninguno';
        break;

      case 'imageRef':
        if (
          this.formPlanCreation.controls.imgRef.errors != null &&
          Object.keys(this.formPlanCreation.controls.imgRef.errors).includes(
            'required'
          )
        )
          return 'La referencia de la imagen es requerida';
        break;

      default:
        return '';
    }
    return '';
  }

  /**
   * Genera una descripción de plan con IA tomando nombre, actividades,
   * categorías, ubicaciones y precio estimado (gratis si no hay precio).
   */
  async autocompleteDescriptionWithIA(): Promise<void> {
    if (this.isGeneratingDescription) {
      return;
    }

    const planName = (this.formPlanCreation.get('name')?.value || '').trim();
    const selectedActivityNames: string[] =
      this.formPlanCreation.get('activitiesIds')?.value || [];
    const selectedActivities = this.activities.filter((activity: Activity) =>
      selectedActivityNames.includes(activity.name),
    );

    const activityTypeMap = new Map(
      this.activityTypes.map((type) => [type.id, type.name]),
    );

    const categories = Array.from(
      new Set(
        selectedActivities
          .map((activity) => activityTypeMap.get(activity.IdTypeActivity) || '')
          .filter(Boolean),
      ),
    );

    const locations = Array.from(
      new Set(
        selectedActivities
          .map((activity) => {
            const lat = (activity.latitude || '').trim();
            const lng = (activity.longitude || '').trim();
            return lat && lng ? `${lat}, ${lng}` : '';
          })
          .filter(Boolean),
      ),
    );

    if (!planName || categories.length === 0 || locations.length === 0) {
      this.error = this.translationService.get(
        'messages.completeFieldsBeforeDescription',
        'Escriba el resto de campos antes de generar la descripcion',
      );
      return;
    }

    const currentDescription = (
      this.formPlanCreation.get('description')?.value || ''
    ).trim();

    const totalPrice = selectedActivities.reduce((sum, activity) => {
      const value = Number((activity as any).price ?? 0);
      return Number.isNaN(value) ? sum : sum + value;
    }, 0);

    const freeText = this.translationService.get('activities.free', 'Gratis');
    const priceText = totalPrice > 0 ? `${totalPrice.toFixed(2)} EUR` : freeText;

    const prompt = [
      'Necesito que redactes una descripcion para un plan en MappTuu.',
      `Nombre del plan: ${planName}`,
      `Actividades incluidas: ${selectedActivityNames.join(', ') || 'No especificadas'}`,
      `Categorias del plan: ${categories.join(', ')}`,
      `Ubicaciones de referencia (coordenadas): ${locations.join(' | ')}`,
      `Precio estimado del plan: ${priceText}`,
      currentDescription
        ? `Texto escrito por el usuario para tener en cuenta: ${currentDescription}`
        : 'No hay descripcion previa escrita por el usuario.',
      'Genera una descripcion natural, atractiva y clara en 3-5 frases. Si no hay precio, menciona que es gratis.',
      'No uses listas ni encabezados.',
    ].join('\n');

    this.error = '';
    this.isGeneratingDescription = true;

    try {
      const generatedDescription = await firstValueFrom(
        this.iaAssistantService.ask(prompt),
      );

      if (generatedDescription && generatedDescription.trim()) {
        this.formPlanCreation.patchValue({
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
