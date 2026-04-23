import { Component, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ActivityTypeService } from '../../../core/services/activitytype.service';
import { ActivityType } from '../../../common/models/activityType.models';
import { OptionsActivityTypesComponent } from '../../../common/options/options-activity-types/options-activity-types.component';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { LanguageSelectorComponent } from '../../../common/language-selector/language-selector.component';

/**
 * Pantalla de detalle de un tipo de actividad.
 *
 * Carga el tipo por `id` de ruta y muestra acciones contextuales (opciones).
 */
@Component({
  selector: 'app-activity-types-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, OptionsActivityTypesComponent, TranslatePipe, LanguageSelectorComponent],
  templateUrl: './activity-types-detail.component.html',
})
export class ActivityTypesDetailComponent {
  /** Tipo de actividad cargado para renderizar. */
  activityType?: ActivityType;

  /** Ruta activa para leer parámetros. */
  private route = inject(ActivatedRoute);
  /** Router para navegación. */
  private router = inject(Router);
  /** Servicio Location para volver en historial del navegador. */
  private browserLocation = inject(Location);
  /** Servicio de tipos para cargar el detalle. */
  private service = inject(ActivityTypeService);

  /** Carga el tipo desde el servicio en base al `id` de la ruta. */
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.service.getActivityId?.(id).subscribe(data => {
      this.activityType = data as ActivityType;
    });
  }

  /** Vuelve a la página anterior con fallback al listado de tipos. */
  goBack() {
    if (window.history.length > 1) {
      this.browserLocation.back();
      return;
    }

    this.router.navigate(['/activityTypesList']);
  }
}
