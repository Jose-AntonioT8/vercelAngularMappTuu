import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { Review } from '../../models/activity.model'; // Asumiendo que Review es compartido

@Component({
  selector: 'app-reviews-list-modal',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './reviews-list-modal.html',
  styleUrl: './reviews-list-modal.component.scss',
})
export class ReviewsListModalComponent {
  @Input() isOpen = false;
  @Input() reviews: Review[] = [];
  @Input() title = 'Reseñas'; // Título dinámico, ej. "Reseñas de la Actividad"
  @Output() onClose = new EventEmitter<void>();

  closeModal() {
    this.onClose.emit();
  }

  // Método para calcular estrellas (similar a getStarState)
  getStarState(rating: number, index: number): 'full' | 'half' | 'empty' {
    const starValue = index + 1;
    if (rating >= starValue) return 'full';
    if (rating >= starValue - 0.5) return 'half';
    return 'empty';
  }

  getStarsArray(): number[] {
    return [0, 1, 2, 3, 4];
  }

  // Formatear fecha (opcional, si Review tiene createdAt)
  formatDate(firebaseTimestamp: any): string {
    // Convierte el Timestamp de Firebase a un objeto Date de JavaScript.
    // Esto puede causar una pérdida de precisión a milisegundos.
    const date = firebaseTimestamp.toDate();

    // Obtiene el día, mes y año.
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Los meses son base 0 en JavaScript
    const year = date.getFullYear();

    // Retorna la fecha formateada.
    return `${day}/${month}/${year}`;
  }
}
