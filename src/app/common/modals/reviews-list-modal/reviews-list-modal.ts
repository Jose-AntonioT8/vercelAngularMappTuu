import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, ChangeDetectorRef, EventEmitter, Input, OnInit, Output, OnChanges, SimpleChanges } from '@angular/core';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { UserNamePipe } from '../../../core/pipes/username.pipe';
import { Review } from '../../models/activity.model'; // Asumiendo que Review es compartido

/**
 * Modal para mostrar una lista de reseñas.
 *
 * Es un modal presentacional: recibe `reviews` y emite `onClose` cuando se cierra.
 * Incluye helpers para pintar estrellas, formatear fechas de Firebase Timestamp,
 * y resolver nombres de usuarios mediante el pipe `userName`.
 */
@Component({
  selector: 'app-reviews-list-modal',
  standalone: true,
  imports: [CommonModule, TranslatePipe, UserNamePipe],
  templateUrl: './reviews-list-modal.html',
  styleUrl: './reviews-list-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReviewsListModalComponent implements OnInit, OnChanges {
  /** Controla si el modal está visible. */
  @Input() isOpen = false;
  /** Lista de reseñas a renderizar. */
  @Input() reviews: Review[] = [];
  /** Título del modal (por ejemplo: "Reseñas de la Actividad"). */
  @Input() title = 'Reseñas'; // Título dinámico, ej. "Reseñas de la Actividad"
  /** Evento de cierre hacia el padre. */
  @Output() onClose = new EventEmitter<void>();

  constructor(private cdr: ChangeDetectorRef) {}

  /** Inicializa el componente. */
  ngOnInit(): void {
    this.cdr.markForCheck();
  }

  /** Detecta cambios en las reseñas. */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['reviews']) {
      this.cdr.markForCheck();
    }
  }

  /** Cierra el modal notificando al padre. */
  closeModal() {
    this.onClose.emit();
  }

  /**
   * Devuelve el estado visual de la estrella para un rating dado.
   * `index` es 0-based (0..4).
   */
  getStarState(rating: number, index: number): 'full' | 'half' | 'empty' {
    const starValue = index + 1;
    if (rating >= starValue) return 'full';
    if (rating >= starValue - 0.5) return 'half';
    return 'empty';
  }

  /** Array fijo de 5 posiciones para iterar estrellas en la plantilla. */
  getStarsArray(): number[] {
    return [0, 1, 2, 3, 4];
  }

  /**
   * Formatea un Timestamp de Firebase a `dd/mm/yyyy`.
   *
   * Acepta `any` porque Firebase Timestamp no siempre está tipado en el modelo.
   */
  formatDate(firebaseTimestamp: any): string {
    // Convierte el Timestamp de Firebase a un objeto Date de JavaScript.
    // Esto puede causar una pérdida de precisión a milisegundos.
    const date = firebaseTimestamp.toDate?.() || new Date(firebaseTimestamp);

    // Obtiene el día, mes y año.
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Los meses son base 0 en JavaScript
    const year = date.getFullYear();

    // Retorna la fecha formateada.
    return `${day}/${month}/${year}`;
  }
}
