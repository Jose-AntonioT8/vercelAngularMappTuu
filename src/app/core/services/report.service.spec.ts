import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ReportingService } from './reporting.service';
import { apiUrl } from '../../common/models/apiurl.model';

describe('ReportService', () => {
  let service: ReportingService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ReportingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call POST /reports when creating report', () => {
    const payload = {
      activityId: 'act-1',
      reason: 'spam' as const,
      details: 'contenido duplicado',
    };

    service.createReport(payload, 'token-1').subscribe();

    const req = httpMock.expectOne(`${apiUrl}/reports`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-1');
    expect(req.request.body).toEqual(payload);
    req.flush({});
  });

  it('should call GET /admin/reports with filters', () => {
    service
      .getAdminReports('token-2', { status: 'pending', page: 2, limit: 10 })
      .subscribe();

    const req = httpMock.expectOne(
      (request) =>
        request.url === `${apiUrl}/admin/reports` &&
        request.params.get('status') === 'pending' &&
        request.params.get('page') === '2' &&
        request.params.get('limit') === '10'
    );

    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-2');
    req.flush([]);
  });

  it('should unwrap and normalize admin reports payload', () => {
    let result: unknown;
    service.getAdminReports('token-3').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/admin/reports`);
    req.flush({
      data: [
        {
          _id: 'rep-1',
          activity_id: 'act-1',
          reporter_user_id: 'u1',
          reason: 'spam',
          status: 'pending',
          created_at: '2024-01-01T00:00:00.000Z',
        },
      ],
    });

    expect(Array.isArray(result)).toBeTrue();
    const reports = result as { id: string; activityId: string }[];
    expect(reports.length).toBe(1);
    expect(reports[0].id).toBe('rep-1');
    expect(reports[0].activityId).toBe('act-1');
  });

  it('should call PATCH /admin/reports/:id/resolve when resolving', () => {
    service
      .resolveReport('rep-99', { action: 'dismiss' }, 'token-4')
      .subscribe();

    const req = httpMock.expectOne(`${apiUrl}/admin/reports/rep-99/resolve`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ action: 'dismiss' });
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-4');
    req.flush({});
  });
});
