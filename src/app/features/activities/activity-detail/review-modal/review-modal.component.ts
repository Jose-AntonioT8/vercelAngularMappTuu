import { Component, Input, Output, EventEmitter, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

export interface Review {
  rating: number;
  comment: string;
}

@Component({
  selector: 'app-review-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './review-modal.component.html',
  styleUrl: './review-modal.component.scss'
})
export class ReviewModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() activityId: string | undefined;
  @Output() onClose = new EventEmitter<void>();
  @Output() onSubmit = new EventEmitter<Review>();

  formReview: FormGroup;
  hoverRating = 0;
  error = '';
  success = '';
  isSubmitting = false;

  private formBuilder = inject(FormBuilder);

  constructor() {
    this.formReview = this.formBuilder.group({
      rating: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
      comment: ['', [Validators.maxLength(500)]]
    });
  }

  ngOnInit() {}

  closeModal() {
    this.onClose.emit();
    this.resetForm();
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
      comment: this.formReview.get('comment')?.value || ''
    };

    this.onSubmit.emit(review);
    this.success = 'Reseña guardada con éxito';
    
    setTimeout(() => {
      this.closeModal();
    }, 1000);
  }

  private resetForm() {
    this.formReview.reset({ rating: 0, comment: '' });
    this.error = '';
    this.success = '';
    this.isSubmitting = false;
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
