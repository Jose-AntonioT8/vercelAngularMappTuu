import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ActivityFilterState, FilterComponent } from '../../../common/activities/filter/filter.component';
import { ListComponent } from '../../../common/activities/list/list.component';
import { HeaderComponent } from '../../../common/header/header.component';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

import { RouterModule } from '@angular/router';

/**
 * Pantalla “Explorar actividades” (listado).
 *
 * Compone header + filtros + listado.
 * En desktop, el panel de filtros se muestra abierto.
 */
@Component({
  selector: 'app-list-activities',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HeaderComponent,
    FilterComponent,
    ListComponent,
    TranslatePipe,
    RouterModule,
  ],
  templateUrl: './list-activities.component.html',
  styles: [],
})
export class ListActivitiesComponent {
  /** Router para navegación a creación de actividad. */
  private route: Router;

  /** @param route Router para navegar entre pantallas. */
  constructor(route: Router) {
    this.route = route;
  }
  /** Texto de búsqueda para filtrar actividades por nombre. */
  searchTerm = '';
  /** Estado del panel de filtros de actividades. */
  activityFilters: ActivityFilterState = {
    activityType: null,
    location: null,
    ratingMin: 0,
  };
  /** Estado del panel de filtros (mobile). */
  isFilterOpen = false;

  /** En desktop (>= 1024px) abre filtros por defecto. */
  ngOnInit(): void {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      this.isFilterOpen = true;
    }
  }

  /** Alterna el panel de filtros. */
  toggleFilter(): void {
    this.isFilterOpen = !this.isFilterOpen;
  }
  /** Actualiza el estado de filtros desde el panel lateral. */
  onFilterChanged(filterState: ActivityFilterState): void {
    this.activityFilters = filterState;
  }
  /** Navega a la pantalla de creación de actividad. */
  goCreateActivity(): void {
    this.route.navigate(['/activitiesCreation']);
  }
  /** Cierra filtros en pantallas pequeñas. */
  closeFilter(): void {
    if (window.innerWidth < 1024) {
      this.isFilterOpen = false;
    }
  }
}
