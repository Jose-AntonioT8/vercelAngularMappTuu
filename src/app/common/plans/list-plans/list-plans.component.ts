
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { PlanService } from '../../../core/services/plan.service';
import { CardPlansComponent } from '../card-plans/card-plans.component';
import { ActivityService } from '../../../core/services/activity.service';
import { Activity } from '../../models/activity.model';
import { Observable } from 'rxjs';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

/**
 * Listado de planes (componente común).
 *
 * Orquesta la carga reactiva de:
 * - planes desde `PlanService`
 * - actividades desde `ActivityService` (para enriquecer cards)
 */
@Component({
  selector: 'app-list-plans',
  standalone: true,
  imports: [CommonModule, CardPlansComponent, TranslatePipe],
  templateUrl: './list-plans.component.html',
  styles: []
})
export class ListPlansComponent implements OnInit {
  
  /** Servicio de actividades (catálogo) para enriquecer cards. */
  private activityService = inject(ActivityService);
  /** Servicio de planes (stream + carga). */
  private planService = inject(PlanService);

  /** Stream de planes para renderizar el listado. */
  plans$ = this.planService.plans$;
  /** Stream de actividades para enriquecer cards (si aplica). */
  activity$!: Observable<Activity[]>; 

  /** Dispara listeners/cargas necesarias para poblar streams. */
  ngOnInit(): void {
    this.planService.getPlans();
    this.activity$ = this.activityService.getActivities();
  }
}