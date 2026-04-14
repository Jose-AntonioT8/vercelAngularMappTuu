import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CreateActivityReportPayload,
  ReportReason,
} from '../../models/reporting.types';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-report-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './report-modal.component.html',
  styleUrl: './report-modal.component.scss',
})
export class ReportModalComponent {
  @Input() isOpen = false;
  @Input() activityId = '';
  @Input() activityName = '';
  @Output() onClose = new EventEmitter<void>();
  @Output() onSubmit = new EventEmitter<CreateActivityReportPayload>();

  reason: ReportReason = 'spam';
  details = '';
  errorKey = '';

  readonly reasonOptions: Array<{ value: ReportReason; labelKey: string }> = [
    { value: 'spam', labelKey: 'reports.reportActivity.reasons.spam' },
    {
      value: 'inappropriate',
      labelKey: 'reports.reportActivity.reasons.inappropriate',
    },
    { value: 'fraud', labelKey: 'reports.reportActivity.reasons.fraud' },
    { value: 'other', labelKey: 'reports.reportActivity.reasons.other' },
  ];

  closeModal(): void {
    this.resetState();
    this.onClose.emit();
  }

  submitReport(): void {
    if (!this.activityId) {
      this.errorKey = 'reports.reportActivity.errors.activityUnknown';
      return;
    }
    if (!this.reason) {
      this.errorKey = 'reports.reportActivity.errors.reasonRequired';
      return;
    }
    if (this.details.length > 500) {
      this.errorKey = 'reports.reportActivity.errors.detailsTooLong';
      return;
    }

    this.errorKey = '';
    this.onSubmit.emit({
      activityId: this.activityId,
      reason: this.reason,
      details: this.details.trim() || undefined,
    });
    this.closeModal();
  }

  private resetState(): void {
    this.reason = 'spam';
    this.details = '';
    this.errorKey = '';
  }
}
