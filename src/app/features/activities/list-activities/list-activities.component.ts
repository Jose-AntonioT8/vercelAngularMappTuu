import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FilterComponent } from '../../../common/activities/filter/filter.component';
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
  constructor(private route: Router) {}
  /** Estado del panel de filtros (mobile). */
  isFilterOpen = false;

  /** En desktop (>= 1024px) abre filtros por defecto. */
  ngOnInit() {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      this.isFilterOpen = true;
    }
  }

  /** Alterna el panel de filtros. */
  toggleFilter() {
    this.isFilterOpen = !this.isFilterOpen;
  }
  /** Navega a la pantalla de creación de actividad. */
  goCreateActivity() {
    this.route.navigate(['/activitiesCreation']);
  }
  /** Cierra filtros en pantallas pequeñas. */
  closeFilter() {
    if (window.innerWidth < 1024) {
      this.isFilterOpen = false;
    }
  }
}
