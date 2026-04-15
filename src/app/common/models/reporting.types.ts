export type ReportReason = 'spam' | 'inappropriate' | 'fraud' | 'other';

export type ReportStatus = 'pending' | 'reviewed' | 'dismissed' | 'resolved';

export interface ActivityReport {
  id: string;
  activityId: string;
  reporterUserId: string;
  reason: ReportReason;
  details?: string;
  status: ReportStatus;
  createdAt: string | number | Date;
  updatedAt?: string | number | Date;
  resolvedBy?: string;
  resolvedAt?: string | number | Date;
  resolutionNote?: string;
  resolutionAction?: 'dismiss' | 'delete_activity';
  activityName?: string;
  activityImageURL?: string;
  reporterDisplay?: string;
}

export interface CreateActivityReportPayload {
  activityId: string;
  reason: ReportReason;
  details?: string;
}

export interface ReportQueryFilters {
  status?: ReportStatus;
  reason?: ReportReason;
  page?: number;
  limit?: number;
}

export interface ResolveReportPayload {
  action: 'dismiss' | 'delete_activity';
  resolutionNote?: string;
}
