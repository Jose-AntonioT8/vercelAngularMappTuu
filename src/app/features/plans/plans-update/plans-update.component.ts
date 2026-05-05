import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { PlanService } from '../../../core/services/plan.service';
import { ActivityService } from '../../../core/services/activity.service';
import { Activity } from '../../../common/models/activity.model';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { LanguageSelectorComponent } from '../../../common/language-selector/language-selector.component';
import { ContentModerationService } from '../../../core/services/content-moderation.service';
import { TranslationService } from '../../../core/services/translation.service';

/**
 * Pantalla de edición de un plan existente.
 *
 * Flujo:
 * - Carga el catálogo de actividades (para seleccionar por nombre en la UI).
 * - Carga el plan por `id` de ruta y “traduce” `activitiesIds` ↔ nombres.
 * - En el submit, convierte nombres seleccionados a IDs y llama al backend con token.
 */
@Component({
  standalone: true,
  selector: 'app-plans-update',
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TranslatePipe, LanguageSelectorComponent],
  templateUrl: './plans-update.component.html',
  styleUrls: ['./plans-update.component.scss']
})
export class PlansUpdateComponent implements OnInit {
  /** Mensaje de error para UI. */
  error = '';
  /** Mensaje de éxito para UI. */
  success = '';
  /** Aviso de moderación no bloqueante. */
  warning = '';
  /** Formulario reactivo de edición del plan. */
  formPlanUpdate: FormGroup;
  /** Snapshot del plan cargado (no tipado). */
  planData: any;
  /** ID del plan en edición (ruta). */
  currentId: string | null = null;
  /** Catálogo de actividades disponible para mapear ids ↔ nombres. */
  activities: Activity[] = [];
  /** Lista de nombres (derivada) para UI. */
  activitiesName: string[] = [];

  constructor(
    /** Constructor de formularios. */
    private formSvc: FormBuilder,
    /** Router para navegar tras actualizar. */
    private route: Router,
    /** Ruta activa para leer `id`. */
    private router: ActivatedRoute,
    /** Auth para token/usuario actual. */
    private auth: AuthService,
    /** Servicio de planes (lectura puntual + mutación). */
    private planService: PlanService,
    /** Servicio de actividades (catálogo). */
    private activityService: ActivityService,
    /** Servicio de moderación de contenido básico. */
    private moderationService: ContentModerationService,
    /** Servicio de traducción runtime para mensajes en TS. */
    private translationService: TranslationService
  ) {
    this.formPlanUpdate = this.formSvc.group({
      name: [''],
      description: [''],
      imageRef: [''],
      activitiesIds: [[] as string[]],
      visibility: [true]
    });
  }

  /** Carga actividades y, cuando estén disponibles, carga el plan. */
  ngOnInit(): void {
    // Cargar actividades primero
    this.activityService.getActivities().subscribe(
      (res: Activity[]) => {
        this.activities = res;
        this.activitiesName = res.map((type) => type.name);
        
        // Después de cargar actividades, cargar el plan
        this.loadPlan();
      },
      (err) => {
        console.error('Error cargando actividades', err);
      }
    );
  }

  /** Carga el plan por ID de ruta y rellena el formulario. */
  loadPlan(): void {
    this.currentId = this.router.snapshot.paramMap.get('id');
    console.log('ID del plan:', this.currentId);
    
    if (this.currentId) {
      this.planService.getPlanId(this.currentId).subscribe({
        next: (data: any) => {
          console.log('Plan cargado:', data);
          this.planData = data;
          
          // Convertir IDs a nombres de actividades
          const selectedActivityNames = this.activities
            .filter((act: Activity) => data.activitiesIds?.includes(act.id))
            .map((act: Activity) => act.name);
          
          this.formPlanUpdate.patchValue({
            name: data.name,
            description: data.description,
            imageRef: data.imageRef,
            visibility: data.visibility,
            activitiesIds: selectedActivityNames
          });
        },
        error: (err) => {
          console.error('Error cargando plan:', err);
          this.error = 'No se pudo cargar el plan';
        }
      });
    }
  }

  /** Imagen actual del formulario (para preview). */
  get currentImage(): string {
    return this.formPlanUpdate.get('imageRef')?.value || '';
  }

  /** Devuelve si un nombre de actividad está seleccionado en el form. */
  isSelected(activityName: string): boolean {
    const selectedNames: string[] = this.formPlanUpdate.get('activitiesIds')?.value || [];
    return selectedNames.includes(activityName);
  }

  /** Alterna selección de una actividad por nombre (UI). */
  toggleActivitySelection(activityName: string): void {
    const currentSelectedNames: string[] = this.formPlanUpdate.get('activitiesIds')?.value || [];
    let updatedSelectedNames: string[] = [];

    if (currentSelectedNames.includes(activityName)) {
      updatedSelectedNames = currentSelectedNames.filter((name) => name !== activityName);
    } else {
      updatedSelectedNames = [...currentSelectedNames, activityName];
    }
    
    this.formPlanUpdate.get('activitiesIds')?.setValue(updatedSelectedNames);
  }

  /**
   * Envía actualización del plan al backend.
   *
   * - Convierte nombres seleccionados a IDs
   * - Construye un payload parcial (solo campos con valor)
   * - Adjunta token Bearer del usuario autenticado
   */
  async onUpdate() {
    this.warning = '';
    const selectedActivityNames: string[] = this.formPlanUpdate.value.activitiesIds || [];
    const selectedActivityIds: string[] = this.activities
      .filter((act: Activity) => selectedActivityNames.includes(act.name))
      .map((act: Activity) => act.id);

    // Solo enviar campos que tienen valor
    const planData: any = {
      updatedAt: Date.now()
    };

    if (this.formPlanUpdate.value.name) {
      planData.name = this.formPlanUpdate.value.name;
    }
    if (this.formPlanUpdate.value.description) {
      planData.description = this.formPlanUpdate.value.description;
    }
    if (this.formPlanUpdate.value.imageRef) {
      planData.imageRef = this.formPlanUpdate.value.imageRef;
    }
    if (selectedActivityIds.length > 0) {
      planData.activitiesIds = selectedActivityIds;
    }
    planData.visibility = this.formPlanUpdate.value.visibility;

    const moderation = this.moderationService.moderatePlanInput(
      this.formPlanUpdate.value.name || this.planData?.name || '',
      this.formPlanUpdate.value.description || this.planData?.description || '',
      this.formPlanUpdate.value.imageRef || this.planData?.imageRef || this.planData?.imgRef || ''
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
    planData.moderationResult = {
      blocked: moderation.blocked,
      warning: moderation.warning,
      score: moderation.score,
      reasons: moderation.reasons,
    };

    console.log('Datos del plan a actualizar:', planData);

    try {
      const user = this.auth.currentUser;
      if (!user) throw new Error('No autenticado');
      
      const token = await user.getIdToken();
      console.log('Token obtenido');

      this.planService.updatePlan(this.currentId!, planData, token).subscribe({
        next: (res) => {
          console.log('Plan actualizado:', res);
          this.success = 'Plan actualizado con éxito';
          setTimeout(() => {
            this.route.navigate(['/plansList']);
          }, 1500);
        },
        error: (err) => {
          console.error('Error al actualizar plan:', err);
          this.error = 'Error al guardar los cambios.';
        }
      });
    } catch (err) {
      console.error('Error de token:', err);
      this.error = 'Error de autenticación';
    }
  }
}