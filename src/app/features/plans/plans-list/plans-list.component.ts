import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../common/header/header.component';
import { ActivityFilterState as PlanFilterState, FilterPlansComponent } from '../../../common/plans/filter-plans/filter-plans.component';
import { ListPlansComponent } from '../../../common/plans/list-plans/list-plans.component';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

/**
 * Pantalla de listado de planes.
 *
 * Renderiza header + panel de filtros + lista de planes.
 * En desktop, el panel de filtros arranca abierto.
 */
@Component({
  selector: 'app-plans-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HeaderComponent,
    FilterPlansComponent,
    ListPlansComponent,
    TranslatePipe,
  ],
  templateUrl: './plans-list.component.html',
  styles: [],
})
export class PlansListComponent {
  /** Router para navegación a creación de plan. */
  private route: Router;

  /** @param route Router para navegación entre pantallas. */
  constructor(route: Router) {
    this.route = route;
  }
  /** Texto de búsqueda para filtrar planes por nombre. */
  searchTerm = '';
  /** Estado del panel de filtros de planes. */
  planFilters: PlanFilterState = {
    activity: null,
    ratingMin: 0,
  };
  /** Estado del panel de filtros (principalmente para mobile). */
  isFilterOpen = false;

  /** Navega a la pantalla de creación de plan. */
  goCreatePlan(): void {
    this.route.navigate(['/plansCreation']);
  }
  /** Alterna el panel de filtros. */
  toggleFilter(): void {
    this.isFilterOpen = !this.isFilterOpen;
  }

  /** Actualiza el estado de filtros desde el panel lateral. */
  onFilterChanged(filterState: PlanFilterState): void {
    this.planFilters = filterState;
  }

  /** Cierra filtros en pantallas pequeñas. */
  closeFilter(): void {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      this.isFilterOpen = false;
    }
  }
}
