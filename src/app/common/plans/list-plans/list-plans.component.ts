
import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { PlanService } from '../../../core/services/plan.service';
import { CardPlansComponent } from '../card-plans/card-plans.component';
import { ActivityService } from '../../../core/services/activity.service';
import { Activity } from '../../models/activity.model';
import { BehaviorSubject, Observable, combineLatest, map } from 'rxjs';
import { Plan } from '../../models/plan.model';
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
  /** Stream de búsqueda por nombre desde la pantalla padre. */
  private readonly searchTerm$ = new BehaviorSubject<string>('');
  /** Stream final de planes filtrados por nombre/título. */
  filteredPlans$ = combineLatest([this.plans$, this.searchTerm$]).pipe(
    map(([plans, rawTerm]) => this.filterByName(plans || [], rawTerm)),
  );
  /** Stream de actividades para enriquecer cards (si aplica). */
  activity$!: Observable<Activity[]>; 

  /** Término de búsqueda externo para filtrar por nombre de plan. */
  @Input() set searchTerm(value: string) {
    this.searchTerm$.next((value || '').trim());
  }

  /** Dispara listeners/cargas necesarias para poblar streams. */
  ngOnInit(): void {
    this.planService.getPlans();
    this.activity$ = this.activityService.getActivities();
  }

  private filterByName(plans: Plan[], term: string): Plan[] {
    const normalizedTerm = term.trim().toLowerCase();
    if (!normalizedTerm) {
      return plans;
    }

    return plans.filter((plan) => {
      const searchableText = this.getSearchableText(plan);
      return searchableText.includes(normalizedTerm);
    });
  }

  private getSearchableText(plan: Plan): string {
    const value = plan as Plan & Record<string, unknown>;
    const fields = [
      value.name,
      value['title'],
      value['description'],
      value['location'],
      value['locationText'],
      value['address'],
      value['city'],
      value['region'],
      value['place'],
    ];

    return fields
      .filter((field): field is string => typeof field === 'string')
      .map((field) => field.toLowerCase())
      .join(' ');
  }
}