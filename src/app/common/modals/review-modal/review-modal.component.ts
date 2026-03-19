import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { Review } from '../../models/activity.model';

/**
 * Modal para crear/editar una reseña.
 *
 * - Si `existingReview` viene con rating válido, entra en modo edición.
 * - Valida rating (1..5) y comment (máx 500).
 * - Emite `onSubmit` con el objeto `Review` listo para persistir.
 */
@Component({
  selector: 'app-review-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './review-modal.component.html',
  styleUrl: './review-modal.component.scss',
})
export class ReviewModalComponent implements OnInit, OnChanges {
  /** Controla si el modal está visible. */
  @Input() isOpen = false;
  /** ID de actividad a la que pertenece la reseña (si aplica). */
  @Input() activityId: string | undefined;
  /** ID del usuario autor de la reseña. */
  @Input() userId: string = '';
  /** Reseña existente (si se está editando). */
  @Input() existingReview: Review | null = null;
  /** Evento de cierre hacia el padre. */
  @Output() onClose = new EventEmitter<void>();
  /** Evento de submit hacia el padre con la reseña. */
  @Output() onSubmit = new EventEmitter<Review>();

  /** Formulario reactivo de la reseña. */
  formReview: FormGroup;
  /** Rating temporal al hover (para previsualizar estrellas). */
  hoverRating = 0;
  /** Mensaje de error para UI. */
  error = '';
  /** Mensaje de éxito para UI. */
  success = '';
  /** Estado de submit (spinner/disable). */
  isSubmitting = false;
  /** Indica si el modal está editando una reseña existente. */
  isEditMode = false;

  private formBuilder = inject(FormBuilder);

  constructor() {
    this.formReview = this.formBuilder.group({
      rating: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
      comment: ['', [Validators.maxLength(500)]],
    });
  }

  /** Inicializa el formulario con datos si corresponde. */
  ngOnInit() {
    this.loadReview();
  }

  /** Sincroniza formulario cuando cambia `existingReview` o se abre el modal. */
  ngOnChanges(changes: SimpleChanges) {
    // Detectar cambios en existingReview o isOpen y actualizar el formulario
    if (changes['existingReview'] || changes['isOpen']) {
      if (this.isOpen) {
        this.loadReview();
      }
    }
  }

  /** Carga en el formulario los valores de `existingReview` o resetea a nuevo. */
  private loadReview() {
    // Si existe una reseña anterior, cargar sus valores
    console.log('📝 Cargando reseña existente:', this.existingReview);

    if (
      this.existingReview &&
      this.existingReview.rating &&
      this.existingReview.rating > 0
    ) {
      this.isEditMode = true;
      this.formReview.patchValue({
        rating: this.existingReview.rating,
        comment: this.existingReview.comment || '',
      });
      this.error = '';
      this.success = '';
      console.log(
        '✅ Modo edición activado con rating:',
        this.existingReview.rating
      );
    } else {
      this.isEditMode = false;
      this.formReview.patchValue({
        rating: 0,
        comment: '',
      });
      this.error = '';
      this.success = '';
      console.log('➕ Modo creación - nueva reseña');
    }
  }

  /** Cierra el modal y resetea mensajes/estado de submit. */
  closeModal() {
    this.error = '';
    this.success = '';
    this.isSubmitting = false;
    this.onClose.emit();
  }

  /**
   * Valida y emite la reseña construida desde el formulario.
   * Mantiene un feedback de éxito y cierra automáticamente tras 1s.
   */
  submitReview() {
    if (this.formReview.invalid || this.formReview.get('rating')?.value === 0) {
      this.error = 'Por favor, selecciona una puntuación';
      return;
    }

    this.isSubmitting = true;
    this.error = '';
    this.success = '';

    const review: Review = {
      rating: this.formReview.get('rating')?.value,
      comment: this.formReview.get('comment')?.value || '',
      userId: this.userId,
      id: this.existingReview?.id,
    };

    this.onSubmit.emit(review);
    this.success = this.isEditMode
      ? 'Reseña actualizada con éxito'
      : 'Reseña guardada con éxito';

    setTimeout(() => {
      this.closeModal();
    }, 1000);
  }

  /** Fija el rating seleccionado (click). */
  setRating(value: number) {
    this.formReview.patchValue({ rating: value });
  }

  /** Fija el rating de hover (previsualización). */
  setHoverRating(value: number) {
    this.hoverRating = value;
  }

  /** Limpia el hover rating. */
  clearHoverRating() {
    this.hoverRating = 0;
  }

  /**
   * Devuelve el estado visual de una estrella (full/empty).
   * `index` es 0-based (0..4). Si `useHover` está activo, usa `hoverRating`.
   */
  getStarState(index: number, useHover = false): 'full' | 'empty' {
    const currentRating = useHover
      ? this.hoverRating
      : this.formReview.get('rating')?.value || 0;
    return currentRating >= index + 1 ? 'full' : 'empty';
  }

  /** Array fijo de 5 posiciones para iterar estrellas en la plantilla. */
  getStarsArray(): number[] {
    return [0, 1, 2, 3, 4];
  }
}
