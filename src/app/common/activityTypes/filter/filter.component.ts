import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule  } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivityType } from '../../models/activityType.models';
import { ActivityTypeService } from '../../../core/services/activitytype.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

/**
 * Opción de filtro (id + nombre) para selects/listas.
 */
export interface FilterItem {
  /** Identificador del tipo/ítem. */
  id: string;
  /** Nombre legible para mostrar en UI. */
  name: string;
}

/**
 * Estado serializable de filtros para tipos de actividad.
 *
 * Se emite hacia el componente padre para filtrar listados.
 */
export interface ActivityFilterState {
    /** ID/nombre del tipo de actividad seleccionado. */
    activityType: string | null; 
    /** Filtro de ubicación textual (si aplica). */
    location: string | null;
    /** Rating mínimo para filtrar resultados. */
    ratingMin: number; 
}

/**
 * Componente de filtros para tipos de actividad.
 *
 * Nota: parte del estado (por ejemplo `location`) puede no usarse en todas las pantallas
 * pero se conserva para mantener compatibilidad con otros filtros.
 */
@Component({
  selector: 'app-filter',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './filter.component.html',
  styles: []
})


export class FilterComponent implements OnInit, ActivityFilterState{
    /** Tipo seleccionado. `null` = sin filtro. */
    activityType: string | null = null;
    /** Texto de ubicación (opcional). */
    location: string | null = null;
    /** Rating mínimo (0 = sin filtro). */
    ratingMin: number = 0;
    /** Lista derivada de nombres de tipos para selects. */
    activityTypesName : string[] = [];
    /** Catálogo completo de tipos cargado desde el servicio. */
    activityTypes : ActivityType[] = [];
    /** Evento hacia el padre cuando cambian los filtros. */
    @Output() filterChanged = new EventEmitter<ActivityFilterState>();
    
    /** Tipos disponibles inyectados por el padre (opcional). */
    @Input() availableTypes: FilterItem[] = []; 
    /** Inyecta `ActivityTypeService` para cargar catálogo. */
constructor( private ActivityTypeService: ActivityTypeService,
) {}

    /** Carga tipos y emite el estado inicial. */
    ngOnInit() {
        this.emitCurrentFilterState();
        this.ActivityTypeService.getActivitiesType().subscribe(
            (res: ActivityType[]) => {
              this.activityTypes = res;
              this.activityTypesName = res.map((type) => type.name);
            },
            (err) => {
              console.error('Error cargando actividades', err);
            }
          );
    }

    /** Construye y emite el estado actual. */
    emitCurrentFilterState() {
        const filterState: ActivityFilterState = {
            activityType: this.activityType,
            location: this.location,
            ratingMin: this.ratingMin
        };
        this.filterChanged.emit(filterState);
    }

    /** Resetea filtros al estado inicial y re-emite. */
    resetFilters() {
        this.activityType = null;
        this.location = null;
        this.ratingMin = 0;
        this.emitCurrentFilterState();
    }


}