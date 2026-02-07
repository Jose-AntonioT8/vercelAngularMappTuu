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
  private userService = inject(UserService);
  private activityService = inject(ActivityService);
  private activityTypeService = inject(ActivityTypeService);
  private authService = inject(AuthService);
  activities$ = of<Activity[]>([]);
  activityTypes$!: Observable<ActivityType[]>;

  constructor(private route: Router) {}
  isFilterOpen = false;

  private user = this.authService.currentUser;

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

  toggleFilter() {
    this.isFilterOpen = !this.isFilterOpen;
  }
  goCreateActivity() {
    this.route.navigate(['/activitiesCreation']);
  }
  closeFilter() {
    if (window.innerWidth < 1024) {
      this.isFilterOpen = false;
    }
  }
}
