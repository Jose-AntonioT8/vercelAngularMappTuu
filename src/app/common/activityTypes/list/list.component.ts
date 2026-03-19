import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { CardComponent } from '../card/card.component';
import { ActivityTypeService } from '../../../core/services/activitytype.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

/**
 * Listado de tipos de actividad (componente común).
 *
 * Se alimenta del stream `activities$` del `ActivityTypeService` y dispara
 * la carga inicial en `ngOnInit`.
 */
@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule, CardComponent, TranslatePipe],
  templateUrl: './list.component.html',
  styles: [],
})
export class ListComponent implements OnInit {
  
  /** Servicio de tipos de actividad (stream + carga). */
  private activityTypeService = inject(ActivityTypeService);

  /** Stream reactivo de tipos de actividad para la UI. */
  activityTypes$ = this.activityTypeService.activities$;

  /** Dispara la carga/listener del servicio. */
  ngOnInit(): void {
    this.activityTypeService.getActivitiesType();
  }
}