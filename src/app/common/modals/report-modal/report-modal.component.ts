import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CreateActivityReportPayload,
  ReportReason,
} from '../../models/reporting.types';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

/**
 * Modal para reportar actividades.
 *
 * Valida motivo y detalle, y emite el payload normalizado al componente padre.
 */
@Component({
  selector: 'app-report-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './report-modal.component.html',
  styleUrl: './report-modal.component.scss',
})
export class ReportModalComponent {
  /** Indica si el modal está visible. */
  @Input() isOpen = false;
  /** ID de la actividad a reportar. */
  @Input() activityId = '';
  /** Nombre de la actividad para contexto visual. */
  @Input() activityName = '';
  /** Evento de cierre del modal. */
  @Output() onClose = new EventEmitter<void>();
  /** Evento de envío de reporte validado. */
  @Output() onSubmit = new EventEmitter<CreateActivityReportPayload>();

  /** Motivo seleccionado en el formulario. */
  reason: ReportReason = 'spam';
  /** Texto libre opcional con detalle del reporte. */
  details = '';
  /** Clave i18n de error de validación. */
  errorKey = '';

  /** Opciones de motivo disponibles para el select/radio del modal. */
  readonly reasonOptions: Array<{ value: ReportReason; labelKey: string }> = [
    { value: 'spam', labelKey: 'reports.reportActivity.reasons.spam' },
    {
      value: 'inappropriate',
      labelKey: 'reports.reportActivity.reasons.inappropriate',
    },
    { value: 'fraud', labelKey: 'reports.reportActivity.reasons.fraud' },
    { value: 'other', labelKey: 'reports.reportActivity.reasons.other' },
  ];

  /** Cierra el modal y limpia estado interno del formulario. */
  closeModal(): void {
    this.resetState();
    this.onClose.emit();
  }

  /**
   * Valida el formulario y emite el reporte.
   *
   * Reglas:
   * - `activityId` obligatorio
   * - `reason` obligatorio
   * - `details` con máximo de 500 caracteres
   */
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

  /** Restablece valores por defecto del formulario del modal. */
  private resetState(): void {
    this.reason = 'spam';
    this.details = '';
    this.errorKey = '';
  }
}
