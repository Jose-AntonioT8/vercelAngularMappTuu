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
 * Pantalla de planes creados por el usuario.
 *
 * Carga:
 * - Documento de usuario para leer `createdPlans`.
 * - Cada plan por ID y los combina en un único stream (`plans$`).
 * - Tipos de actividad y actividades para enriquecer cards/filtros.
 */
@Component({
  selector: 'app-created-plans',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    FilterPlansComponent,
    CardPlansComponent,
    TranslatePipe,
    RouterModule,
  ],
  templateUrl: './created-plans.component.html',
  styleUrl: './created-plans.component.scss',
})
export class CreatedPlansComponent implements OnInit {
  /** Acceso a perfil/relaciones del usuario. */
  private userService = inject(UserService);
  /** Acceso a planes (detalle/listado). */
  private planService = inject(PlanService);
  /** Acceso al catálogo de tipos de actividad. */
  private activityTypeService = inject(ActivityTypeService);
  /** Acceso a sesión/usuario actual. */
  private authService = inject(AuthService);
  /** Stream de planes creados listos para UI. */
  plans$ = of<Plan[]>([]);
  /** Catálogo de tipos para enriquecer cards/filtros. */
  activityTypes$!: Observable<ActivityType[]>;
  /** Acceso a actividades para enriquecer UI. */
  private activityService = inject(ActivityService);
  /** Stream de actividades (catálogo) para filtros/cards. */
  activity$!: Observable<Activity[]>;

  constructor(private route: Router) {}
  /** Controla el panel de filtros (responsive). */
  isFilterOpen = false;

  /** Usuario autenticado actual (si existe). */
  private user = this.authService.currentUser;

  /** Inicializa streams de planes creados, actividades y tipos. */
  ngOnInit() {
    this.activity$ = this.activityService.getActivities();

    this.userService.getUserId(this.user!.uid).subscribe((user) => {
      if (user.createdPlans && user.createdPlans.length > 0) {
        const activityObservables = user.createdPlans.map((activityId) =>
          this.planService.getPlanId(activityId),
        );
        this.plans$ = combineLatest(activityObservables);
      } else {
        this.plans$ = of([]);
      }
    });
    this.activityTypes$ = this.activityTypeService.getActivitiesType();
  }

  /** Alterna el panel de filtros. */
  toggleFilter() {
    this.isFilterOpen = !this.isFilterOpen;
  }
  /** Navega a la pantalla de creación. */
  goCreatePlan() {
    this.route.navigate(['/plansCreation']);
  }
  /** Cierra filtros en pantallas pequeñas. */
  closeFilter() {
    if (window.innerWidth < 1024) {
      this.isFilterOpen = false;
    }
  }
}
