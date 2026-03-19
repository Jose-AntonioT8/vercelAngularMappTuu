import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivityService } from '../../../core/services/activity.service';
import { CardComponent } from '../card/card.component';
import { ActivityTypeService } from '../../../core/services/activitytype.service';
import { ActivityType } from '../../models/activityType.models';
import { Observable } from 'rxjs';
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
  /** Stream de tipos usado por las cards para colorear/etiquetar. */
  activityTypes$!: Observable<ActivityType[]>; 

  /** Dispara cargas iniciales necesarias para el listado. */
  ngOnInit(): void {
    this.activityService.getActivities();
    this.activityTypes$ = this.activityTypeService.getActivitiesType();
  }
}