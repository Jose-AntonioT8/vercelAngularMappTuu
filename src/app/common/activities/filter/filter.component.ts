import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule  } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivityType } from '../../models/activityType.models';
import { ActivityTypeService } from '../../../core/services/activitytype.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

/**
 * Opción de filtro disponible en UI (id + nombre).
 *
 * Se usa para poblar selects/listas de tipos, etc.
 */
export interface FilterItem {
  /** Identificador estable del item. */
  id: string;
  /** Nombre visible del item. */
  name: string;
}

/**
 * Estado serializable de filtros para actividades.
 *
 * Se emite al componente padre para filtrar listados.
 */
export interface ActivityFilterState {
    /** ID o nombre del tipo seleccionado. `null` = sin filtro. */
    activityType: string | null; 
    /** Texto de ubicación (si aplica). `null` = sin filtro. */
    location: string | null;
    /** Rating mínimo seleccionado (0 = sin filtro). */
    ratingMin: number; 
}

/**
 * Componente de filtros de actividades.
 *
 * Emite `filterChanged` cada vez que cambia el estado actual.
 */
@Component({
  selector: 'app-filter',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './filter.component.html',
  styles: []
})


export class FilterComponent implements OnInit, ActivityFilterState{
    /** Tipo seleccionado. */
    activityType: string | null = null;
    /** Texto de ubicación seleccionado/introducido. */
    location: string | null = null;
    /** Rating mínimo. */
    ratingMin: number = 0;
    /** Lista derivada de nombres de tipos para selects. */
    activityTypesName : string[] = [];
    /** Catálogo completo de tipos cargado desde el servicio. */
    activityTypes : ActivityType[] = [];
    /** Evento hacia el padre con el nuevo estado de filtros. */
    @Output() filterChanged = new EventEmitter<ActivityFilterState>();
    
    /** Tipos disponibles desde el padre (si aplica). */
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

    /** Construye y emite el estado actual de filtros. */
    emitCurrentFilterState() {
        const filterState: ActivityFilterState = {
            activityType: this.activityType,
            location: this.location,
            ratingMin: this.ratingMin
        };
        this.filterChanged.emit(filterState);
    }

    /** Ejecuta la búsqueda de ubicación con el texto actual. */
    searchByLocation() {
      this.emitCurrentFilterState();
    }

    /** Limpia todos los filtros al estado inicial y re-emite. */
    resetFilters() {
        this.activityType = null;
        this.location = null;
        this.ratingMin = 0;
        this.emitCurrentFilterState();
    }


}