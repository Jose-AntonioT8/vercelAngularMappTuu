import { Component, Input, Output, EventEmitter, inject, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { Review } from '../../../../common/models/activity.model';

@Component({
  selector: 'app-review-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './review-modal.component.html',
  styleUrl: './review-modal.component.scss'
})
export class ReviewModalComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() activityId: string | undefined;
  @Input() userId: string = '';
  @Input() existingReview: Review | null = null;
  @Output() onClose = new EventEmitter<void>();
  @Output() onSubmit = new EventEmitter<Review>();

  formReview: FormGroup;
  hoverRating = 0;
  error = '';
  success = '';
  isSubmitting = false;
  isEditMode = false;

  private formBuilder = inject(FormBuilder);

  constructor() {
    this.formReview = this.formBuilder.group({
      rating: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
      comment: ['', [Validators.maxLength(500)]]
    });
  }

  ngOnInit() {
    this.loadReview();
  }

  ngOnChanges(changes: SimpleChanges) {
    // Detectar cambios en existingReview o isOpen y actualizar el formulario
    if (changes['existingReview'] || changes['isOpen']) {
      if (this.isOpen) {
        this.loadReview();
      }
    }
  }

  private loadReview() {
    // Si existe una reseña anterior, cargar sus valores
    console.log('📝 Cargando reseña existente:', this.existingReview);
    
    if (this.existingReview && this.existingReview.rating && this.existingReview.rating > 0) {
      this.isEditMode = true;
      this.formReview.patchValue({
        rating: this.existingReview.rating,
        comment: this.existingReview.comment || ''
      });
      this.error = '';
      this.success = '';
      console.log('✅ Modo edición activado con rating:', this.existingReview.rating);
    } else {
      this.isEditMode = false;
      this.formReview.patchValue({
        rating: 0,
        comment: ''
      });
      this.error = '';
      this.success = '';
      console.log('➕ Modo creación - nueva reseña');
    }
  }

  closeModal() {
    this.error = '';
    this.success = '';
    this.isSubmitting = false;
    this.onClose.emit();
  }

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
      id: this.existingReview?.id
    };

    this.onSubmit.emit(review);
    this.success = this.isEditMode ? 'Reseña actualizada con éxito' : 'Reseña guardada con éxito';
    
    setTimeout(() => {
      this.closeModal();
    }, 1000);
  }

  setRating(value: number) {
    this.formReview.patchValue({ rating: value });
  }

  setHoverRating(value: number) {
    this.hoverRating = value;
  }

  clearHoverRating() {
    this.hoverRating = 0;
  }

  getStarState(index: number, useHover = false): 'full' | 'empty' {
    const currentRating = useHover ? this.hoverRating : this.formReview.get('rating')?.value || 0;
    return currentRating >= index + 1 ? 'full' : 'empty';
  }

  getStarsArray(): number[] {
    return [0, 1, 2, 3, 4];
  }
}
