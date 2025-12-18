import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { PlanService } from '../../../core/services/plan.service';
import { ActivityService } from '../../../core/services/activity.service';
import { Activity } from '../../../common/models/activity.model';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { FirebaseMediaService } from '../../../core/services/firebase-media.service';
import { LanguageSelectorComponent } from '../../../common/language-selector/language-selector.component';

@Component({
  selector: 'app-plans-creation',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TranslatePipe, LanguageSelectorComponent],
  templateUrl: './plans-creation.component.html',
  styleUrl: './plans-creation.component.scss'
})
export class PlansCreationComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  
  error = '';
  success = '';
  formPlanCreation;
  planData: any;
  activities: Activity[] = [];
  activitiesName: string[] = [];
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  isUploading = false;

  constructor(
    private formSvc: FormBuilder,
    private route: Router,
    private auth: AuthService,
    private planService: PlanService,
    private activityService: ActivityService,
    private mediaService: FirebaseMediaService
  ) {
    // Inicialización del FormGroup en el constructor
    this.formPlanCreation = this.formSvc.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.maxLength(250)]],
      // Control para el selector múltiple, inicializado con un ARRAY vacío
      activitiesIds: [[] as string[]],
      imgRef: [''],
      visibility: [true]
    });
  }

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
  }

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  get currentImage(): string {
    return this.imagePreview || this.formPlanCreation.get('imgRef')?.value || '';
  }

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

  async uploadImage(): Promise<string | null> {
    if (!this.selectedFile) return this.formPlanCreation.get('imgRef')?.value || null;
    this.isUploading = true;
    this.error = '';
    try {
      const blob = new Blob([this.selectedFile], { type: this.selectedFile.type });
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

  getSelectedCount(): number {
    const selected: string[] = this.formPlanCreation.get('activitiesIds')?.value || [];
    return selected.length;
  }
  
  // --- Lógica del Selector de Actividades Mejorado ---

  /**
   * Verifica si una actividad está seleccionada actualmente en el formulario.
   * @param activityName El nombre de la actividad a verificar.
   * @returns true si la actividad está seleccionada, false en caso contrario.
   */
  isSelected(activityName: string): boolean {
    const selectedNames: string[] = this.formPlanCreation.get('activitiesIds')?.value || [];
    return selectedNames.includes(activityName);
  }

  /**
   * Alterna la selección de una actividad en el formulario.
   * @param activityName El nombre de la actividad a alternar.
   */
  toggleActivitySelection(activityName: string): void {
    // Obtener los nombres seleccionados actualmente (será un array de strings)
    const currentSelectedNames: string[] = this.formPlanCreation.get('activitiesIds')?.value || [];
    let updatedSelectedNames: string[] = [];

    if (currentSelectedNames.includes(activityName)) {
      // Deseleccionar: filtrar el nombre de la actividad del array
      updatedSelectedNames = currentSelectedNames.filter((name) => name !== activityName);
    } else {
      // Seleccionar: añadir el nombre de la actividad al array
      updatedSelectedNames = [...currentSelectedNames, activityName];
    }
    
    // Actualizar el valor del control 'activitiesIds'
    this.formPlanCreation.get('activitiesIds')?.setValue(updatedSelectedNames);
  }
  
  // --- Lógica de Envío del Formulario ---

  async onCreate() {
    if (this.formPlanCreation.invalid) {
      this.formPlanCreation.markAllAsTouched();
      return;
    }

    const selectedActivityNames: string[] = this.formPlanCreation.value.activitiesIds || [];
    const selectedActivityIds: string[] = this.activities
      .filter((act: Activity) => selectedActivityNames.includes(act.name))
      .map((act: Activity) => act.id);

    const user = await this.auth.currentUser;
    if (!user) {
      this.error = 'Debes iniciar sesión para crear un plan.';
      return;
    }
    const token = await user.getIdToken();

    const imageUrl = await this.uploadImage();

    const planData = {
      name: this.formPlanCreation.value.name,
      description: this.formPlanCreation.value.description,
      activitiesIds: selectedActivityIds, 
      visibility: this.formPlanCreation.value.visibility,
      imgRef: imageUrl || '',
      createdAt: Date.now(),
      ownerId: token,
      rating: 0,
    };

    try {
      this.planService.createPlan(planData, token).subscribe({
        next: (res) => {
          this.success = 'Plan creado con éxito';
          setTimeout(() => {
            this.route.navigate(['/plansList']);
          }, 1000);
        },
        error: (err) => {
          console.error('create error', err);
          this.error = 'Error al crear el plan.';
        }
      });
    } catch (err) {
      console.error('Error al crear plan:', err);
      this.error = 'Error inesperado al crear el plan.';
    }
  }

  // --- Lógica de Navegación y Errores (sin cambios mayores) ---

  logOut() {
    this.route.navigate(['/landingPage']);
    this.auth.logout();
  }
  
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
        break

      case 'activitiesIds':
        if (
          this.formPlanCreation.controls.activitiesIds.errors != null &&
          Object.keys(
            this.formPlanCreation.controls.activitiesIds.errors
          ).includes('required')
        )
          return 'Selecciona una actividad valida o ninguno';
        break
    
      case 'imageRef':
        if (
          this.formPlanCreation.controls.imgRef.errors != null &&
          Object.keys(
            this.formPlanCreation.controls.imgRef.errors
          ).includes('required')
        )
          return 'La referencia de la imagen es requerida';
        break;

      default:
        return '';
    }
    return '';
  }
}