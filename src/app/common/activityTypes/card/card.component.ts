import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ActivityType } from '../../models/activityType.models';

/**
 * Card de tipo de actividad para listados.
 *
 * - Deriva un color seguro (hex/valor CSS) para UI.
 * - Navega al detalle del tipo.
 */
@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card.component.html',
  styles: []
})
export class CardComponent implements  OnChanges {

  /** Tipo de actividad a renderizar. */
  @Input() activityType!: ActivityType;

  /** Color derivado del tipo (normalizado a hex cuando aplica). */
  activityTypeColor = '';

  constructor(private router: Router) {}

  /** Recalcula el color cuando cambia el input. */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['activityType']) this.updateActivityColor();
  }

  

  /** Navega a la pantalla de detalle del tipo. */
  redirectToDetail() {
    this.router.navigate(['/activityTypeDetail', this.activityType.id]);
  }

  /** Normaliza el campo `color` (hex con o sin `#`) o cae a `#ccc`. */
  private updateActivityColor(): void {
    const raw = this.activityType?.color?.toString().trim();
    if (!raw) { this.activityTypeColor = '#ccc'; return; }
    const hex = raw.startsWith('#') ? raw.slice(1) : raw;
    const isHex = /^([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(hex);
    this.activityTypeColor = isHex ? `#${hex.toLowerCase()}` : raw;
  }

 
}