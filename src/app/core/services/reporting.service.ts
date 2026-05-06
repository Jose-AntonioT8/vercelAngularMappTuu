import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, throwError, timeout } from 'rxjs';
import { apiUrl } from '../../common/models/apiurl.model';
import {
  ActivityReport,
  CreateActivityReportPayload,
  ReportQueryFilters,
  ReportReason,
  ReportStatus,
  ResolveReportPayload,
} from '../../common/models/reporting.types';

/**
 * Servicio de reportes y moderación.
 *
 * Centraliza llamadas al backend para:
 * - crear reportes de actividad
 * - listar reportes en panel admin
 * - resolver y eliminar reportes
 */
@Injectable({ providedIn: 'root' })
export class ReportingService {
  /** Base API dinámica (proxy local en dev, URL API en producción). */
  private readonly apiBase =
    typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? '/api'
      : apiUrl;
  /** Endpoint público de creación de reportes. */
  private readonly reportsUrl = `${this.apiBase}/reports`;
  /** Endpoint admin de moderación de reportes. */
  private readonly adminReportsUrl = `${this.apiBase}/admin/reports`;

  /** @param http Cliente HTTP de Angular. */
  constructor(private http: HttpClient) {}

  /**
   * Crea un reporte de actividad.
   * @param payload Datos del reporte.
   * @param token Bearer token del usuario autenticado.
   */
  createReport(
    payload: CreateActivityReportPayload,
    token: string
  ): Observable<ActivityReport> {
    return this.http
      .post<ActivityReport>(this.reportsUrl, payload, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .pipe(timeout(15000));
  }

  /**
   * Elimina un reporte desde panel de moderación.
   * @param id ID del reporte.
   * @param token Bearer token de admin.
   */
  deleteReport(id: string, token: string): Observable<unknown> {
    const reportId = encodeURIComponent(id.trim());
    return this.http.delete(`${this.adminReportsUrl}/${reportId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /**
   * Obtiene reportes para administración con filtros opcionales.
   * @param token Bearer token de admin.
   * @param filters Filtros de estado/motivo/paginación.
   */
  getAdminReports(
    token: string,
    filters: ReportQueryFilters = {}
  ): Observable<ActivityReport[]> {
    let params = new HttpParams();
    if (filters.status) params = params.set('status', filters.status);
    if (filters.reason) params = params.set('reason', filters.reason);
    if (filters.page) params = params.set('page', String(filters.page));
    if (filters.limit) params = params.set('limit', String(filters.limit));

    return this.http
      .get<unknown>(this.adminReportsUrl, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      })
      .pipe(map((body) => this.normalizeAdminReportsList(body)));
  }

  /**
   * Resuelve un reporte (dismiss/delete_activity).
   *
   * Incluye fallback a `PUT` para backends que no soporten `PATCH`.
   */
  resolveReport(
    reportId: string,
    payload: ResolveReportPayload,
    token: string
  ): Observable<ActivityReport> {
    const id = encodeURIComponent(reportId.trim());
    const url = `${this.adminReportsUrl}/${id}/resolve`;
    const headers = { Authorization: `Bearer ${token}` };

    return this.http.patch<ActivityReport>(url, payload, { headers }).pipe(
      catchError((err: unknown) => {
        if (!(err instanceof HttpErrorResponse)) return throwError(() => err);
        if (err.status === 405) {
          return this.http.put<ActivityReport>(url, payload, { headers });
        }
        return throwError(() => err);
      })
    );
  }

  /** Normaliza respuesta arbitraria del backend a lista tipada de reportes. */
  private normalizeAdminReportsList(body: unknown): ActivityReport[] {
    const rawList = this.extractReportsArray(body);
    return rawList
      .map((item) => this.normalizeReportItem(item))
      .filter((r) => r.id.length > 0);
  }

  /** Convierte motivo libre del backend al enum `ReportReason` permitido. */
  private normalizeReportReason(raw: string): ReportReason {
    const allowed: ReportReason[] = [
      'spam',
      'inappropriate',
      'fraud',
      'other',
    ];
    const s = raw.trim().toLowerCase();
    if (allowed.includes(s as ReportReason)) return s as ReportReason;
    return 'other';
  }

  /** Convierte estado libre del backend al enum `ReportStatus` permitido. */
  private normalizeReportStatus(raw: string): ReportStatus {
    const s = raw.trim().toLowerCase();
    const allowed: ReportStatus[] = [
      'pending',
      'reviewed',
      'dismissed',
      'resolved',
    ];
    if (allowed.includes(s as ReportStatus)) return s as ReportStatus;
    if (s === 'open' || s === 'new' || s === 'active') return 'pending';
    if (s === 'closed' || s === 'done') return 'resolved';
    return 'pending';
  }

  /**
   * Extrae un array de reportes desde diferentes formatos de respuesta.
   * Soporta claves: `data`, `reports`, `items`, `results`, `rows`.
   */
  private extractReportsArray(body: unknown): unknown[] {
    if (Array.isArray(body)) return body;
    if (body && typeof body === 'object') {
      const o = body as Record<string, unknown>;
      for (const key of ['data', 'reports', 'items', 'results', 'rows']) {
        const v = o[key];
        if (Array.isArray(v)) return v;
      }
    }
    return [];
  }

  /** Normaliza un elemento crudo del backend a `ActivityReport`. */
  private normalizeReportItem(raw: unknown): ActivityReport {
    if (!raw || typeof raw !== 'object') return this.emptyReport();
    const r = raw as Record<string, unknown>;
    const pickStr = (...keys: string[]): string => {
      for (const k of keys) {
        const v = r[k];
        if (v != null && String(v).trim() !== '') return String(v);
      }
      return '';
    };

    const reason = this.normalizeReportReason(pickStr('reason'));
    const status = this.normalizeReportStatus(pickStr('status'));

    const actionRaw = pickStr('resolutionAction', 'resolution_action');
    const resolutionAction =
      actionRaw === 'dismiss' ||
      actionRaw === 'delete_activity' ||
      actionRaw === 'delete_plan'
        ? actionRaw
        : undefined;

    const targetTypeRaw = pickStr('targetType', 'target_type');
    const targetType =
      targetTypeRaw === 'plan'
        ? 'plan'
        : targetTypeRaw === 'activity'
          ? 'activity'
          : undefined;

    const activityId = pickStr('activityId', 'activity_id');
    const targetId = pickStr('targetId', 'target_id') || activityId;

    return {
      id: pickStr('id', '_id'),
      targetType,
      targetId,
      activityId,
      reporterUserId: pickStr(
        'reporterUserId',
        'reporter_user_id',
        'userId',
        'user_id'
      ),
      reason,
      details: pickStr('details', 'detail') || undefined,
      status,
      createdAt: this.coerceDateValue(r['createdAt'] ?? r['created_at']),
      updatedAt: this.coerceDateOptional(r['updatedAt'] ?? r['updated_at']),
      resolvedBy: pickStr('resolvedBy', 'resolved_by') || undefined,
      resolvedAt: this.coerceDateOptional(r['resolvedAt'] ?? r['resolved_at']),
      resolutionNote: pickStr('resolutionNote', 'resolution_note') || undefined,
      resolutionAction,
      activityName: pickStr('activityName', 'activity_name') || undefined,
      activityImageURL:
        pickStr(
          'activityImageURL',
          'activity_image_url',
          'activityImageUrl',
          'imageURL',
          'image_url'
        ) || undefined,
      reporterDisplay:
        pickStr('reporterDisplay', 'reporter_display') || undefined,
    };
  }

  /** Fallback vacío para elementos inválidos. */
  private emptyReport(): ActivityReport {
    return {
      id: '',
      activityId: '',
      reporterUserId: '',
      reason: 'other',
      status: 'pending',
      createdAt: 0,
    };
  }

  /** Coerce opcional de fechas para campos que pueden ser undefined. */
  private coerceDateOptional(v: unknown): string | number | Date | undefined {
    if (v == null) return undefined;
    return this.coerceDateValue(v);
  }

  /** Convierte distintos formatos de fecha/timestamp a un valor utilizable en UI. */
  private coerceDateValue(v: unknown): string | number | Date {
    if (v instanceof Date) return v;
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    if (typeof v === 'string' && v.trim()) return v;
    if (v && typeof v === 'object') {
      const ts = v as { _seconds?: number; seconds?: number };
      if (typeof ts._seconds === 'number') return ts._seconds * 1000;
      if (typeof ts.seconds === 'number') return ts.seconds * 1000;
    }
    return Date.now();
  }
}
