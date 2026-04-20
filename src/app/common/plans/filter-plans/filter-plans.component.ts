
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule  } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Activity } from '../../models/activity.model';
import { ActivityService } from '../../../core/services/activity.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

/**
 * Opción de filtro (id + nombre) para selects/listas.
 */
export interface FilterItem {
  /** Identificador del ítem (por ejemplo, id de actividad). */
  id: string;
  /** Nombre legible para UI. */
  name: string;
}

/**
 * Estado serializable de filtros para planes.
 */
export interface ActivityFilterState {
    /** Actividad seleccionada (por nombre o id según UI). */
    activity: string | null; 
    /** Rating mínimo. */
    ratingMin: number; 
}


@Component({
  selector: 'app-filter-plans',
  imports: [CommonModule, FormsModule, TranslatePipe],
  standalone: true,
  templateUrl: './filter-plans.component.html',
  styles: []
})
export class FilterPlansComponent  implements OnInit, ActivityFilterState{

    /** Actividad seleccionada. */
    activity: string | null = null;
    /** Ubicación textual (si aplica en la pantalla). */
    location: string | null = null;
    /** Rating mínimo seleccionado. */
    ratingMin: number = 0;
    /** Lista derivada de nombres de actividades para el selector. */
    activitiesName : string[] = [];
    /** Catálogo completo de actividades cargado desde el servicio. */
    activities : Activity[] = [];
    /** Evento hacia el padre con el estado de filtros. */
    @Output() filterChanged = new EventEmitter<ActivityFilterState>();
    
    /** Catálogo opcional inyectado por el padre (si no se usa Firestore). */
    @Input() availableTypes: FilterItem[] = []; 
    /** Servicio para cargar catálogo de actividades desde Firestore/API. */
    private activityService: ActivityService;

    /**
     * Crea el panel de filtros de planes.
     * @param activityService Servicio de actividades para poblar el selector.
     */
constructor( activityService: ActivityService,
) {
  this.activityService = activityService;
}

    /** Carga catálogo de actividades y emite el estado inicial. */
    ngOnInit(): void {
        this.emitCurrentFilterState();
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

    /** Emite el estado actual de filtros. */
    emitCurrentFilterState(): void {
        const filterState: ActivityFilterState = {
            activity: this.activity,
            ratingMin: this.ratingMin
        };
        this.filterChanged.emit(filterState);
    }

    /** Limpia filtros al estado inicial y re-emite. */
    resetFilters(): void {
        this.activity = null;
        this.ratingMin = 0;
        this.emitCurrentFilterState();
    }


}