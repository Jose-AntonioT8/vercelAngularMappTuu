/** Motivos válidos para reportar una actividad. */
export type ReportReason = 'spam' | 'inappropriate' | 'fraud' | 'other';

export type TargetType = 'activity' | 'plan';

/** Estados válidos de un reporte en moderación. */
export type ReportStatus = 'pending' | 'reviewed' | 'dismissed' | 'resolved';

/**
 * Entidad de reporte de actividad mostrada en UI y panel de moderación.
 */
export interface ActivityReport {
  /** Identificador único del reporte. */
  id: string;

  /** Tipo de entidad reportada. */
  targetType?: TargetType;
  /** ID real de la entidad reportada. */
  targetId?: string;

  /** ID de la actividad reportada. */
  activityId: string;
  /** ID del usuario que reporta. */
  reporterUserId: string;
  /** Motivo principal del reporte. */
  reason: ReportReason;
  /** Detalle opcional aportado por el usuario. */
  details?: string;
  /** Estado actual en el flujo de moderación. */
  status: ReportStatus;
  /** Fecha/hora de creación. */
  createdAt: string | number | Date;
  /** Fecha/hora de actualización. */
  updatedAt?: string | number | Date;
  /** Moderador que resolvió el reporte. */
  resolvedBy?: string;
  /** Fecha de resolución del reporte. */
  resolvedAt?: string | number | Date;
  /** Nota opcional de resolución. */
  resolutionNote?: string;
  /** Acción aplicada al resolver. */
  resolutionAction?: 'dismiss' | 'delete_activity' | 'delete_plan';
  /** Nombre de la actividad reportada. */
  activityName?: string;
  /** Imagen de la actividad reportada. */
  activityImageURL?: string;
  /** Nombre visible del usuario que reportó. */
  reporterDisplay?: string;
}

/** Payload para crear un nuevo reporte de actividad. */
export interface CreateActivityReportPayload {
  /** ID de la actividad a reportar (legacy / compatibilidad). */
  activityId?: string;
  /** ID del plan a reportar. */
  planId?: string;
  /** Tipo de target reportado. Si no viene, el backend lo deduce. */
  targetType?: TargetType;

  /** Motivo seleccionado por el usuario. */
  reason: ReportReason;
  /** Detalle opcional del reporte. */
  details?: string;
}

/** Filtros de consulta para listado de reportes en administración. */
export interface ReportQueryFilters {
  /** Filtro por estado del reporte. */
  status?: ReportStatus;
  /** Filtro por motivo del reporte. */
  reason?: ReportReason;
  /** Página (paginación). */
  page?: number;
  /** Límite de elementos por página. */
  limit?: number;
}

/** Payload para resolver un reporte desde moderación. */
export interface ResolveReportPayload {
  /** Acción de resolución seleccionada por moderación. */
  action: 'dismiss' | 'delete_activity' | 'delete_plan';
  /** Nota opcional para auditar la resolución. */
  resolutionNote?: string;
}
