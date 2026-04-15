import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { ActivityService } from '../../../core/services/activity.service';
import { CardComponent } from '../card/card.component';
import { ActivityTypeService } from '../../../core/services/activitytype.service';
import { ActivityType } from '../../models/activityType.models';
import { BehaviorSubject, Observable, combineLatest, map } from 'rxjs';
import { Activity } from '../../models/activity.model';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

/**
 * Listado de actividades.
 *
 * Orquesta la carga inicial:
 * - Actividades (desde `ActivityService`)
 * - Tipos de actividad (desde `ActivityTypeService`)
 */
@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule, CardComponent, TranslatePipe],
  templateUrl: './list.component.html',
  styles: [],
})
export class ListComponent implements OnInit {
  
  /** Servicio de actividades para alimentar el stream del listado. */
  private activityService = inject(ActivityService);
  /** Servicio de tipos para enriquecer cards (labels/colores). */
  private activityTypeService = inject(ActivityTypeService);

  /** Stream reactivo de actividades para renderizar el listado. */
  activities$ = this.activityService.activities$;
  /** Stream de búsqueda por nombre desde la pantalla padre. */
  private readonly searchTerm$ = new BehaviorSubject<string>('');
  /** Stream final de actividades filtradas por nombre/título. */
  filteredActivities$ = combineLatest([this.activities$, this.searchTerm$]).pipe(
    map(([activities, rawTerm]) => this.filterByName(activities || [], rawTerm)),
  );
  /** Stream de tipos usado por las cards para colorear/etiquetar. */
  activityTypes$!: Observable<ActivityType[]>; 

  /** Término de búsqueda externo para filtrar por nombre de actividad. */
  @Input() set searchTerm(value: string) {
    this.searchTerm$.next((value || '').trim());
  }

  /** Dispara cargas iniciales necesarias para el listado. */
  ngOnInit(): void {
    this.activityService.getActivities();
    this.activityTypes$ = this.activityTypeService.getActivitiesType();
  }

  private filterByName(activities: Activity[], term: string): Activity[] {
    const normalizedTerm = term.trim().toLowerCase();
    if (!normalizedTerm) {
      return activities;
    }

    return activities.filter((activity) => {
      const searchableText = this.getSearchableText(activity);
      return searchableText.includes(normalizedTerm);
    });
  }

  private getSearchableText(activity: Activity): string {
    const value = activity as Activity & Record<string, unknown>;
    const fields = [
      value.name,
      value['title'],
      value['location'],
      value['locationText'],
      value['address'],
      value['city'],
      value['region'],
      value['place'],
      value['fullAddress'],
      value['description'],
    ];

    return fields
      .filter((field): field is string => typeof field === 'string')
      .map((field) => field.toLowerCase())
      .join(' ');
  }
}