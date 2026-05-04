import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ActivityDetail } from '../../../common/models/activityDetail';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { ActivityService } from '../../../core/services/activity.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-activities-moderation',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe],
  templateUrl: './activities-moderation.component.html',
  styleUrl: './activities-moderation.component.scss',
})
export class ActivitiesModerationComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly activityService = inject(ActivityService);
  private readonly translationService = inject(TranslationService);

  loading = false;
  error = '';
  activities: ActivityDetail[] = [];
  processingId: string | null = null;
  readonly fallbackImage = 'assets/images/placeholder.svg';

  ngOnInit(): void {
    this.loadPending();
  }

  async loadPending(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      const user =
        this.authService.currentUser ?? this.authService.firebaseCurrentUser;
      if (!user) {
        this.error = this.translationService.get(
          'moderation.admin.errors.notAuthenticated',
          'No autenticado.'
        );
        this.loading = false;
        return;
      }
      const token = await user.getIdToken();
      this.activityService.getPendingActivities(token).subscribe({
        next: (activities) => {
          this.activities = activities || [];
          this.loading = false;
        },
        error: (error) => {
          this.error = this.mapModerationError(error);
          this.loading = false;
        },
      });
    } catch {
      this.error = this.translationService.get(
        'moderation.admin.errors.sessionFailed',
        'No se pudo validar la sesion.'
      );
      this.loading = false;
    }
  }

  async approve(activityId: string): Promise<void> {
    await this.resolveAction(activityId, 'approve');
  }

  async reject(activityId: string): Promise<void> {
    await this.resolveAction(activityId, 'reject');
  }

  private async resolveAction(
    activityId: string,
    action: 'approve' | 'reject'
  ): Promise<void> {
    this.processingId = activityId;
    this.error = '';
    try {
      const user =
        this.authService.currentUser ?? this.authService.firebaseCurrentUser;
      if (!user) {
        this.error = this.translationService.get(
          'moderation.admin.errors.notAuthenticated',
          'No autenticado.'
        );
        this.processingId = null;
        return;
      }
      const token = await user.getIdToken();
      const request$ =
        action === 'approve'
          ? this.activityService.approvePendingActivity(activityId, token)
          : this.activityService.rejectPendingActivity(activityId, token);

      request$.subscribe({
        next: () => {
          this.activities = this.activities.filter((a) => a.id !== activityId);
          this.processingId = null;
        },
        error: (error) => {
          this.error = this.mapModerationError(error);
          this.processingId = null;
        },
      });
    } catch {
      this.error = this.translationService.get(
        'moderation.admin.errors.sessionFailed',
        'No se pudo validar la sesion.'
      );
      this.processingId = null;
    }
  }

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (!img.src.includes(this.fallbackImage)) {
      img.src = this.fallbackImage;
      return;
    }
    img.onerror = null;
  }

  getImage(activity: ActivityDetail): string {
    const value = activity as any;
    return value.imageURL || value.imageRef || this.fallbackImage;
  }

  getScore(activity: ActivityDetail): string {
    const value = activity as any;
    return value.moderationScore ?? '-';
  }

  getReasons(activity: ActivityDetail): string {
    const value = activity as any;
    const reasons = value.moderationReasons || [];
    return Array.isArray(reasons) && reasons.length > 0 ? reasons.join(', ') : '-';
  }

  private mapModerationError(error: any): string {
    if (error?.status === 401 || error?.status === 403) {
      return this.translationService.get(
        'moderation.admin.errors.forbidden',
        'No tienes permisos para moderar actividades.'
      );
    }
    if (error?.status === 404) {
      return this.translationService.get(
        'moderation.admin.errors.notFound',
        'La actividad ya no existe.'
      );
    }
    if (error?.status === 409) {
      return this.translationService.get(
        'moderation.admin.errors.conflict',
        'La actividad ya no esta pendiente de revision.'
      );
    }
    return this.translationService.get(
      'moderation.admin.errors.actionFailed',
      'No se pudo aplicar la accion de moderacion.'
    );
  }
}
