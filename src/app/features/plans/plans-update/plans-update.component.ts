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

@Component({
  standalone: true,
  selector: 'app-plans-update',
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TranslatePipe, LanguageSelectorComponent],
  templateUrl: './plans-update.component.html',
  styleUrls: ['./plans-update.component.scss']
})
export class PlansUpdateComponent implements OnInit {
  error = '';
  success = '';
  formPlanUpdate: FormGroup;
  planData: any;
  currentId: string | null = null;
  activities: Activity[] = [];
  activitiesName: string[] = [];

  constructor(
    private formSvc: FormBuilder,
    private route: Router,
    private router: ActivatedRoute,
    private auth: AuthService,
    private planService: PlanService,
    private activityService: ActivityService
  ) {
    this.formPlanUpdate = this.formSvc.group({
      name: [''],
      description: [''],
      imageRef: [''],
      activitiesIds: [[] as string[]],
      visibility: [true]
    });
  }

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

  get currentImage(): string {
    return this.formPlanUpdate.get('imageRef')?.value || '';
  }

  isSelected(activityName: string): boolean {
    const selectedNames: string[] = this.formPlanUpdate.get('activitiesIds')?.value || [];
    return selectedNames.includes(activityName);
  }

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

  async onUpdate() {
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