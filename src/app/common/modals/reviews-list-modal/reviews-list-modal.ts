import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { Review } from '../../models/activity.model'; // Asumiendo que Review es compartido
import { UserService } from '../../../core/services/user.service';

/**
 * Modal para mostrar una lista de reseñas.
 *
 * Es un modal presentacional: recibe `reviews` y emite `onClose` cuando se cierra.
 * Incluye helpers para pintar estrellas, formatear fechas de Firebase Timestamp,
 * y resolver nombres de usuarios desde el servicio de usuarios.
 */
@Component({
  selector: 'app-reviews-list-modal',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './reviews-list-modal.html',
  styleUrl: './reviews-list-modal.component.scss',
})
export class ReviewsListModalComponent implements OnInit {
  /** Controla si el modal está visible. */
  @Input() isOpen = false;
  /** Lista de reseñas a renderizar. */
  @Input() reviews: Review[] = [];
  /** Título del modal (por ejemplo: "Reseñas de la Actividad"). */
  @Input() title = 'Reseñas'; // Título dinámico, ej. "Reseñas de la Actividad"
  /** Evento de cierre hacia el padre. */
  @Output() onClose = new EventEmitter<void>();

  /** Mapa de userIds a userNames para caché. */
  private userNameCache: Map<string, string> = new Map();

  constructor(private userService: UserService) {}

  /** Inicializa el componente e intenta resolver los nombres de usuario. */
  ngOnInit(): void {
    this.resolveUserNames();
  }

  /**
   * Resuelve los nombres de usuario para todas las reseñas.
   * Utiliza el servicio de usuarios para obtener los nombres.
   */
  private resolveUserNames(): void {
    if (!this.reviews || this.reviews.length === 0) return;

    // Obtener IDs únicos de usuarios
    const uniqueUserIds = [...new Set(this.reviews.map(r => r.userId))];

    // Resolver cada usuario
    uniqueUserIds.forEach(userId => {
      if (this.userNameCache.has(userId)) {
        // Si ya está en caché, actualizar las reseñas
        this.updateReviewsWithUserName(userId, this.userNameCache.get(userId)!);
      } else {
        // Si no, obtenerlo del servicio
        this.userService.getUserId(userId).subscribe({
          next: (user: any) => {
            const userName = user.displayName || user.email?.split('@')[0] || userId;
            this.userNameCache.set(userId, userName);
            this.updateReviewsWithUserName(userId, userName);
          },
          error: (err) => {
            console.warn(`No se pudo obtener el usuario ${userId}:`, err);
            // Fallback: usar el ID como nombre
            this.userNameCache.set(userId, userId);
            this.updateReviewsWithUserName(userId, userId);
          }
        });
      }
    });
  }

  /**
   * Actualiza las reseñas con el nombre de usuario obtenido.
   * @param userId ID del usuario
   * @param userName Nombre del usuario
   */
  private updateReviewsWithUserName(userId: string, userName: string): void {
    this.reviews.forEach(review => {
      if (review.userId === userId) {
        review.userName = userName;
      }
    });
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
   * Obtiene el nombre de usuario para mostrar.
   * Si no está resuelto aún, muestra el ID.
   * @param review Reseña
   * @returns Nombre de usuario o ID
   */
  getUserDisplayName(review: Review): string {
    return review.userName || review.userId;
  }

  /**
   * Formatea un Timestamp de Firebase a `dd/mm/yyyy`.
   *
   * Acepta `any` porque Firebase Timestamp no siempre está tipado en el modelo.
   */
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
