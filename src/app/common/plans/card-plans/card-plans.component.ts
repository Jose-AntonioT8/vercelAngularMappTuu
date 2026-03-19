import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Plan } from '../../models/plan.model';
import { MapsService } from '../../../core/services/maps.service';
import { Activity } from '../../models/activity.model';
import { Tilt3DDirective } from '../../../core/directives/tilt3d.directive';

/**
 * Card de plan para listados.
 *
 * - Navega al detalle del plan.
 * - Renderiza rating en estrellas.
 * - Puede recibir actividades para enriquecer la UI (si aplica).
 */
@Component({
  selector: 'app-card-plans',
  imports: [CommonModule, Tilt3DDirective],
  templateUrl: './card-plans.component.html',
  styles: []
})
export class CardPlansComponent implements OnInit, OnChanges {

  /** Plan a renderizar. */
  @Input() plan!: Plan;
  /** Actividades relacionadas (opcional). */
  @Input() activity: Activity[] = [];

  /** Router para navegar al detalle del plan. */
  constructor(private router: Router, private mapService: MapsService) {}

  /** Hook para reaccionar a cambios del `@Input plan` (si se necesita). */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['plan'] ) {
    }
  }

  /** Hook de inicialización del componente. */
  ngOnInit(): void {
   
  }

  /** Navega al detalle del plan. */
  redirectToDetail() {
    this.router.navigate(['/planDetail', this.plan.id]);
  }

  /** Devuelve estado de una estrella (full/half/empty) para un índice 0..4. */
  getStarState(index: number): 'full' | 'half' | 'empty' {
    if (!this.plan) return 'empty';
    const rating = this.plan.rating;
    const starValue = index + 1;
    if (rating >= starValue) return 'full';
    else if (rating >= starValue - 0.5) return 'half';
    else return 'empty';
  }

  /** Helper para iterar 5 estrellas en template. */
  getStarsArray(): number[] {
    return [0, 1, 2, 3, 4];
  }
}