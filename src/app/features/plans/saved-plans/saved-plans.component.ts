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
  private userService = inject(UserService);
  private planService = inject(PlanService);
  private activityTypeService = inject(ActivityTypeService);
  private authService = inject(AuthService);
  plans$ = of<Plan[]>([]);
  activityTypes$!: Observable<ActivityType[]>;
  private activityService = inject(ActivityService);
  activity$!: Observable<Activity[]>;

  constructor(private route: Router) {}
  isFilterOpen = false;

  private user = this.authService.currentUser;

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

  toggleFilter() {
    this.isFilterOpen = !this.isFilterOpen;
  }
  goCreatePlan() {
    this.route.navigate(['/plansCreation']);
  }
  closeFilter() {
    if (window.innerWidth < 1024) {
      this.isFilterOpen = false;
    }
  }
}
