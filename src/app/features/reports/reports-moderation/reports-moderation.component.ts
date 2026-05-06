import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../../../common/header/header.component';
import {
  ActivityReport,
  ReportReason,
  ReportStatus,
  
} from '../../../common/models/reporting.types';
import { AuthService } from '../../../core/services/auth.service';
import { ReportingService } from '../../../core/services/reporting.service';
import { TranslationService } from '../../../core/services/translation.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

/**
 * Pantalla de moderación de reportes de actividades.
 *
 * Permite filtrar reportes y ejecutar acciones administrativas
 * como mantener actividad o eliminar actividad reportada.
 */
@Component({
  selector: 'app-reports-moderation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    HeaderComponent,
    TranslatePipe,
  ],
  templateUrl: './reports-moderation.component.html',
  styleUrl: './reports-moderation.component.scss',
})
export class ReportsModerationComponent implements OnInit {
  readonly fallbackImage = 'assets/images/placeholder.svg';
  /** Servicio de autenticación para recuperar sesión/token actual. */
  private authService = inject(AuthService);
  /** Servicio de reportes para acciones de moderación. */
  private reportService = inject(ReportingService);
  /** Servicio de traducción para mensajes de UI. */
  private translation = inject(TranslationService);
  /** Nota estándar para marcar resolución manteniendo actividad. */
  private readonly keepActivityResolvedNote = 'resolved_keep_activity';
  /** Mensaje local cuando se intenta borrar un reporte pendiente. */
  private readonly openReportDeleteError =
    'Tienes que resolver el reporte antes de eliminarlo';

  /** Listado de reportes cargados del backend. */
  reports: ActivityReport[] = [];
  /** Estado de carga del listado. */
  loading = false;
  /** Mensaje de error principal en pantalla. */
  error = '';
  /** ID del reporte con menú contextual abierto. */
  activeMenuReportId: string | null = null;

  /** Filtro de estado seleccionado en UI. */
  statusFilter: 'pending' | 'resolved' | 'deleted' | '' = '';
  /** Filtro de motivo seleccionado en UI. */
  reasonFilter: ReportReason | '' = '';
  /** Filtro de tipo reportado (actividad/plan). */
  targetTypeFilter: 'activity' | 'plan' | '' = '';
  /** Página actual de paginación. */
  page = 1;
  /** Límite por página para consulta admin. */
  limit = 20;

  /** Reporte actualmente abierto en modal de resolución. */
  resolveModalReport: ActivityReport | null = null;

  /** Reportes visibles según filtros de estado y motivo. */
  get filteredReports(): ActivityReport[] {
    return this.reports.filter((report) => {
      const normalizedStatus = this.getDisplayStatus(report);
      const statusMatch = this.statusFilter
        ? normalizedStatus === this.statusFilter
        : true;
      const reasonMatch = this.reasonFilter
        ? report.reason === this.reasonFilter
        : true;
      const typeMatch = this.targetTypeFilter
        ? this.getTargetType(report) === this.targetTypeFilter
        : true;
      return statusMatch && reasonMatch && typeMatch;
    });
  }

  /** Inicializa la pantalla cargando reportes. */
  ngOnInit(): void {
    this.loadReports();
  }

  /** Carga reportes del backend con filtros y estado de sesión actual. */
  async loadReports(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      const user =
        this.authService.currentUser ?? this.authService.firebaseCurrentUser;
      if (!user) {
        this.error = this.translation.instant(
          'reports.moderation.errors.notAuthenticated'
        );
        this.loading = false;
        return;
      }
      const token = await user.getIdToken();
      const backendStatusFilter: ReportStatus | undefined =
        this.statusFilter === 'deleted'
          ? undefined
          : this.statusFilter || undefined;
      this.reportService
        .getAdminReports(token, {
          status: backendStatusFilter,
          reason: this.reasonFilter || undefined,
          page: this.page,
          limit: this.limit,
        })
        .subscribe({
          next: (reports) => {
            this.reports = reports;
            this.loading = false;
          },
          error: (error) => {
            this.error = this.httpErrorMessage(
              error,
              this.translation.instant('reports.moderation.errors.loadFailed')
            );
            this.loading = false;
          },
        });
    } catch {
      this.error = this.translation.instant(
        'reports.moderation.errors.sessionFailed'
      );
      this.loading = false;
    }
  }

  /** Devuelve clases CSS de badge según estado visual del reporte. */
  statusClass(report: ActivityReport): string {
    const status = this.getDisplayStatus(report);
    if (status === 'deleted') {
      return 'bg-red-100 text-red-700 border border-red-200';
    }
    if (status === 'resolved') {
      return 'bg-green-100 text-green-700 border border-green-200';
    }
    return 'bg-amber-100 text-amber-800 border border-amber-200';
  }

  /** Normaliza tipo reportado para UI. */
  getTargetType(report: ActivityReport): 'activity' | 'plan' {
    return report.targetType === 'plan' ? 'plan' : 'activity';
  }

  /** Etiqueta visible de tipo reportado. */
  targetTypeLabel(report: ActivityReport): string {
    return this.getTargetType(report) === 'plan' ? 'Plan' : 'Actividad';
  }

  /** Clases visuales para etiqueta de tipo reportado. */
  targetTypeClass(report: ActivityReport): string {
    return this.getTargetType(report) === 'plan'
      ? 'bg-indigo-600/95 text-white border-indigo-200'
      : 'bg-sky-600/95 text-white border-sky-200';
  }

  /** Indica si el reporte admite acciones de moderación. */
  isActionable(report: ActivityReport): boolean {
    const s = String(report.status || '').trim().toLowerCase();
    return s !== 'dismissed' && s !== 'resolved';
  }

  /** Abre modal de resolución para un reporte concreto. */
  openResolveModal(report: ActivityReport): void {
    this.resolveModalReport = report;
  }

  /** Cierra modal de resolución activo. */
  closeResolveModal(): void {
    this.resolveModalReport = null;
  }

  /** Abre/cierra menú contextual de un reporte. */
  toggleReportMenu(reportId: string, event?: MouseEvent): void {
    event?.stopPropagation();
    this.activeMenuReportId =
      this.activeMenuReportId === reportId ? null : reportId;
  }

  /** Cierra cualquier menú contextual abierto. */
  closeReportMenu(): void {
    this.activeMenuReportId = null;
  }

  /**
   * Elimina un reporte ya resuelto.
   * Si está pendiente, bloquea acción y muestra mensaje.
   */
  async handleDeleteReport(
    report: ActivityReport,
    event?: MouseEvent
  ): Promise<void> {
    event?.stopPropagation();

    if (this.getDisplayStatus(report) === 'pending') {
      this.error = this.openReportDeleteError;
      return;
    }

    this.error = '';
    this.closeReportMenu();

    try {
      const user =
        this.authService.currentUser ?? this.authService.firebaseCurrentUser;
      if (!user) {
        this.error = this.translation.instant(
          'reports.moderation.errors.notAuthenticated'
        );
        return;
      }

      const token = await user.getIdToken();
      this.reportService.deleteReport(report.id, token).subscribe({
        next: () => this.loadReports(),
        error: (error) => {
          this.error = this.httpErrorMessage(
            error,
            this.translation.instant('reports.moderation.errors.actionFailed')
          );
        },
      });
    } catch {
      this.error = this.translation.instant(
        'reports.moderation.errors.sessionFailed'
      );
    }
  }

  /** Confirma acción elegida en modal y aplica resolución. */
  async confirmResolveChoice(
    action: 'dismiss' | 'delete' | 'resolve'
  ): Promise<void> {
    const report = this.resolveModalReport;
    if (!report) return;
    this.closeResolveModal();
    await this.applyAction(report, action);
  }

  /** Aplica una acción de moderación sobre un reporte. */
  async applyAction(
    report: ActivityReport,
    action: 'dismiss' | 'delete' | 'resolve'
  ): Promise<void> {
    try {
      const user =
        this.authService.currentUser ?? this.authService.firebaseCurrentUser;
      if (!user) {
        this.error = this.translation.instant(
          'reports.moderation.errors.notAuthenticated'
        );
        return;
      }
      const token = await user.getIdToken();
      const reportId = report.id;
      const deleteAction =
        report.targetType === 'plan' ? ('delete_plan' as const) : ('delete_activity' as const);
      const payload =
        action === 'resolve'
          ? {
              action: 'dismiss' as const,
              resolutionNote: this.keepActivityResolvedNote,
            }
          : action === 'delete'
            ? { action: deleteAction }
            : { action: 'dismiss' as const };

      this.reportService.resolveReport(reportId, payload, token).subscribe({
        next: () => this.loadReports(),
        error: (error) => {
          this.error = this.httpErrorMessage(
            error,
            this.translation.instant('reports.moderation.errors.actionFailed')
          );
        },
      });
    } catch {
      this.error = this.translation.instant(
        'reports.moderation.errors.sessionFailed'
      );
    }
  }

  /** Extrae un mensaje de error legible desde respuestas HTTP heterogéneas. */
  private httpErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error;
      if (typeof body === 'string' && body.trim()) {
        return this.normalizeHttpErrorString(body, fallback);
      }
      if (body && typeof body === 'object') {
        const msg = (body as Record<string, unknown>)['message'];
        if (typeof msg === 'string') return msg;
      }
      if (error.status) return `${fallback} (HTTP ${error.status})`;
    }
    return fallback;
  }

  /** Normaliza errores en formato string/HTML a mensajes entendibles en UI. */
  private normalizeHttpErrorString(raw: string, fallback: string): string {
    const text = raw.replace(/\s+/g, ' ').trim();

    if (text.includes('<') && text.includes('>')) {
      const preMatch = text.match(/<pre>(.*?)<\/pre>/i);
      const htmlExtract = preMatch?.[1]?.trim();
      if (htmlExtract) {
        if (/Cannot\s+DELETE/i.test(htmlExtract)) {
          return 'No se pudo borrar el reporte por una ruta invalida del servidor. Intenta de nuevo.';
        }
        return htmlExtract;
      }
    }

    if (/Cannot\s+DELETE/i.test(text)) {
      return 'No se pudo borrar el reporte por una ruta invalida del servidor. Intenta de nuevo.';
    }

    return text || fallback;
  }

  /**
   * Traduce estado backend a estado de presentación.
   * `resolved + delete_activity` se muestra como `deleted`.
   */
  getDisplayStatus(
    report: ActivityReport
  ): 'pending' | 'resolved' | 'deleted' {
    const status = String(report.status || '').trim().toLowerCase();

    if (
      status === 'resolved' &&
      (report.resolutionAction === 'delete_activity' ||
        report.resolutionAction === 'delete_plan')
    ) {
      return 'deleted';
    }

    if (status === 'resolved' || status === 'dismissed') {
      return 'resolved';
    }

    return 'pending';
  }

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (!img.src.includes(this.fallbackImage)) {
      img.src = this.fallbackImage;
      return;
    }
    img.onerror = null;
  }
}
