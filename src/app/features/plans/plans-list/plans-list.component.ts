import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../common/header/header.component';
import { FilterPlansComponent } from '../../../common/plans/filter-plans/filter-plans.component';
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
  constructor(private route: Router) {}
  /** Texto de búsqueda para filtrar planes por nombre. */
  searchTerm = '';
  /** Estado del panel de filtros (principalmente para mobile). */
  isFilterOpen = false;

  /** En desktop (>= 1024px) abre filtros por defecto. */
  ngOnInit() {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      this.isFilterOpen = true;
    }
  }
  /** Navega a la pantalla de creación de plan. */
  goCreatePlan() {
    this.route.navigate(['/plansCreation']);
  }
  /** Alterna el panel de filtros. */
  toggleFilter() {
    this.isFilterOpen = !this.isFilterOpen;
  }

  /** Cierra filtros en pantallas pequeñas. */
  closeFilter() {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      this.isFilterOpen = false;
    }
  }
}
