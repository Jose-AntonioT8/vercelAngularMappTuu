import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Observable, combineLatest, of } from 'rxjs';
import { CardComponent } from '../../../common/activities/card/card.component';
import { FilterComponent } from '../../../common/activities/filter/filter.component';
import { HeaderComponent } from '../../../common/header/header.component';
import { Activity } from '../../../common/models/activity.model';
import { ActivityType } from '../../../common/models/activityType.models';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { ActivityService } from '../../../core/services/activity.service';
import { ActivityTypeService } from '../../../core/services/activitytype.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';

/**
 * Pantalla de actividades guardadas por el usuario.
 *
 * Lee `savedActivities` del perfil de usuario (backend/Firestore) y carga cada
 * actividad por ID, combinándolas en un stream para la UI.
 */
@Component({
  selector: 'app-saved-activities',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    FilterComponent,
    CardComponent,
    TranslatePipe,
    RouterModule,
  ],
  templateUrl: './saved-activities.component.html',
  styleUrl: './saved-activities.component.scss',
})
export class SavedActivitiesComponent implements OnInit {
  /** Acceso a perfil/relaciones del usuario. */
  private userService = inject(UserService);
  /** Acceso al catálogo/detalle de actividades. */
  private activityService = inject(ActivityService);
  /** Acceso al catálogo de tipos de actividad. */
  private activityTypeService = inject(ActivityTypeService);
  /** Acceso a sesión/usuario actual. */
  private authService = inject(AuthService);
  /** Stream de actividades guardadas para la UI. */
  activities$ = of<Activity[]>([]);
  /** Stream del catálogo de tipos para cards/filtros. */
  activityTypes$!: Observable<ActivityType[]>;

  constructor(private route: Router) {}
  /** Controla el panel de filtros (responsive). */
  isFilterOpen = false;

  /** Usuario autenticado actual (si existe). */
  private user = this.authService.currentUser;

  /** Inicializa streams y abre filtros por defecto en desktop. */
  ngOnInit() {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      this.isFilterOpen = true;
    }
    this.userService.getUserId(this.user!.uid).subscribe((user) => {
      if (user.savedActivities && user.savedActivities.length > 0) {
        const activityObservables = user.savedActivities.map((activityId) =>
          this.activityService.getActivityId(activityId),
        );
        this.activities$ = combineLatest(activityObservables);
      } else {
        this.activities$ = of([]);
      }
    });
    this.activityTypes$ = this.activityTypeService.getActivitiesType();
  }

  /** Alterna el panel de filtros. */
  toggleFilter() {
    this.isFilterOpen = !this.isFilterOpen;
  }
  /** Navega a creación de actividad. */
  goCreateActivity() {
    this.route.navigate(['/activitiesCreation']);
  }
  /** Cierra filtros en pantallas pequeñas. */
  closeFilter() {
    if (window.innerWidth < 1024) {
      this.isFilterOpen = false;
    }
  }
}
