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
 * Pantalla de actividades creadas por el usuario.
 *
 * Lee `createdActivities` del perfil de usuario y carga cada actividad por ID,
 * combinando los resultados en un stream para renderizar cards.
 */
@Component({
  selector: 'app-created-activities',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    FilterComponent,
    CardComponent,
    TranslatePipe,
    RouterModule,
  ],
  templateUrl: './created-activities.component.html',
  styleUrl: './created-activities.component.scss',
})
export class CreatedActivitiesComponent implements OnInit {
  /** Acceso a perfil/relaciones del usuario. */
  private userService = inject(UserService);
  /** Acceso al catálogo/detalle de actividades. */
  private activityService = inject(ActivityService);
  /** Acceso al catálogo de tipos de actividad. */
  private activityTypeService = inject(ActivityTypeService);
  /** Acceso a sesión/usuario actual. */
  private authService = inject(AuthService);
  /** Stream de actividades creadas para la UI. */
  activities$ = of<Activity[]>([]);
  /** Catálogo de tipos para enriquecer cards/filtros. */
  activityTypes$!: Observable<ActivityType[]>;

  constructor(private route: Router) {}
  /** Controla el panel de filtros (responsive). */
  isFilterOpen = false;

  /** Usuario autenticado actual (si existe). */
  private user = this.authService.currentUser;

  /** Inicializa streams de actividades creadas y tipos. */
  ngOnInit() {
    this.userService.getUserId(this.user!.uid).subscribe((user) => {
      if (user.createdActivities && user.createdActivities.length > 0) {
        const activityObservables = user.createdActivities.map((activityId) =>
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
