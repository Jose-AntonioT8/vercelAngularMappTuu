import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Observable, combineLatest, of } from 'rxjs';
import { HeaderComponent } from '../../../common/header/header.component';
import { Activity } from '../../../common/models/activity.model';
import { ActivityType } from '../../../common/models/activityType.models';
import { Plan } from '../../../common/models/plan.model';
import { CardPlansComponent } from '../../../common/plans/card-plans/card-plans.component';
import { FilterPlansComponent } from '../../../common/plans/filter-plans/filter-plans.component';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { ActivityService } from '../../../core/services/activity.service';
import { ActivityTypeService } from '../../../core/services/activitytype.service';
import { AuthService } from '../../../core/services/auth.service';
import { PlanService } from '../../../core/services/plan.service';
import { UserService } from '../../../core/services/user.service';

/**
 * Pantalla de planes guardados por el usuario.
 *
 * Carga:
 * - El documento de usuario para leer `savedPlans`.
 * - Cada plan por ID, combinando resultados en un único stream (`plans$`).
 * - Tipos de actividad y actividades (para enriquecer UI/filtros).
 */
@Component({
  selector: 'app-saved-plans',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    FilterPlansComponent,
    CardPlansComponent,
    TranslatePipe,
    RouterModule,
  ],
  templateUrl: './saved-plans.component.html',
  styleUrl: './saved-plans.component.scss',
})
export class SavedPlansComponent implements OnInit {
  /** Acceso a perfil/relaciones del usuario. */
  private userService = inject(UserService);
  /** Acceso a planes (detalle/listado). */
  private planService = inject(PlanService);
  /** Acceso al catálogo de tipos de actividad. */
  private activityTypeService = inject(ActivityTypeService);
  /** Acceso a sesión/usuario actual. */
  private authService = inject(AuthService);

  /** Stream de planes guardados listos para la UI. */
  plans$ = of<Plan[]>([]);
  /** Catálogo de tipos para enriquecer cards/filtros. */
  activityTypes$!: Observable<ActivityType[]>;
  /** Acceso a actividades para enriquecer UI. */
  private activityService = inject(ActivityService);
  /** Stream de actividades (catálogo) para filtros/cards. */
  activity$!: Observable<Activity[]>;

  constructor(private route: Router) {}
  /** Controla el panel de filtro (responsive). */
  isFilterOpen = false;

  /** Usuario autenticado actual (si existe). */
  private user = this.authService.currentUser;

  /** Inicializa streams y abre el filtro en desktop. */
  ngOnInit() {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      this.isFilterOpen = true;
    }
    this.activity$ = this.activityService.getActivities();

    this.userService.getUserId(this.user!.uid).subscribe((user) => {
      if (user.savedPlans && user.savedPlans.length > 0) {
        const activityObservables = user.savedPlans.map((activityId) =>
          this.planService.getPlanId(activityId),
        );
        this.plans$ = combineLatest(activityObservables);
      } else {
        this.plans$ = of([]);
      }
    });
    this.activityTypes$ = this.activityTypeService.getActivitiesType();
  }

  /** Alterna el panel de filtro (mobile/desktop). */
  toggleFilter() {
    this.isFilterOpen = !this.isFilterOpen;
  }
  /** Navega a crear plan. */
  goCreatePlan() {
    this.route.navigate(['/plansCreation']);
  }
  /** Cierra filtro en pantallas pequeñas. */
  closeFilter() {
    if (window.innerWidth < 1024) {
      this.isFilterOpen = false;
    }
  }
}
