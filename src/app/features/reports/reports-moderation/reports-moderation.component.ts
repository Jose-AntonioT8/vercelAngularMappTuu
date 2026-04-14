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
  private authService = inject(AuthService);
  private reportService = inject(ReportingService);
  private translation = inject(TranslationService);
  private readonly keepActivityResolvedNote = 'resolved_keep_activity';

  reports: ActivityReport[] = [];
  loading = false;
  error = '';

  statusFilter: 'pending' | 'resolved' | 'deleted' | '' = '';
  reasonFilter: ReportReason | '' = '';
  page = 1;
  limit = 20;

  resolveModalReport: ActivityReport | null = null;

  get filteredReports(): ActivityReport[] {
    return this.reports.filter((report) => {
      const normalizedStatus = this.getDisplayStatus(report);
      const statusMatch = this.statusFilter
        ? normalizedStatus === this.statusFilter
        : true;
      const reasonMatch = this.reasonFilter
        ? report.reason === this.reasonFilter
        : true;
      return statusMatch && reasonMatch;
    });
  }

  ngOnInit(): void {
    this.loadReports();
  }

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

  isActionable(report: ActivityReport): boolean {
    const s = String(report.status || '').trim().toLowerCase();
    return s !== 'dismissed' && s !== 'resolved';
  }

  openResolveModal(report: ActivityReport): void {
    this.resolveModalReport = report;
  }

  closeResolveModal(): void {
    this.resolveModalReport = null;
  }

  async confirmResolveChoice(
    action: 'dismiss' | 'delete_activity' | 'resolve'
  ): Promise<void> {
    const report = this.resolveModalReport;
    if (!report) return;
    this.closeResolveModal();
    await this.applyAction(report.id, action);
  }

  async applyAction(
    reportId: string,
    action: 'dismiss' | 'delete_activity' | 'resolve'
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
      const payload =
        action === 'resolve'
          ? {
              action: 'dismiss' as const,
              resolutionNote: this.keepActivityResolvedNote,
            }
          : action === 'delete_activity'
            ? { action: 'delete_activity' as const }
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

  private httpErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error;
      if (typeof body === 'string' && body.trim()) return body;
      if (body && typeof body === 'object') {
        const msg = (body as Record<string, unknown>)['message'];
        if (typeof msg === 'string') return msg;
      }
      if (error.status) return `${fallback} (HTTP ${error.status})`;
    }
    return fallback;
  }

  getDisplayStatus(
    report: ActivityReport
  ): 'pending' | 'resolved' | 'deleted' {
    const status = String(report.status || '').trim().toLowerCase();

    if (status === 'resolved' && report.resolutionAction === 'delete_activity') {
      return 'deleted';
    }

    if (status === 'resolved' || status === 'dismissed') {
      return 'resolved';
    }

    return 'pending';
  }
}
