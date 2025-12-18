
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { PlanService } from '../../../core/services/plan.service';
import { CardPlansComponent } from '../card-plans/card-plans.component';
import { ActivityService } from '../../../core/services/activity.service';
import { Activity } from '../../models/activity.model';
import { Observable } from 'rxjs';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-list-plans',
  standalone: true,
  imports: [CommonModule, CardPlansComponent, TranslatePipe],
  templateUrl: './list-plans.component.html',
  styles: []
})
export class ListPlansComponent implements OnInit {
  
  private activityService = inject(ActivityService);
  private planService = inject(PlanService);

  plans$ = this.planService.plans$;
  activity$!: Observable<Activity[]>; 

  ngOnInit(): void {
    this.planService.getPlans();
    this.activity$ = this.activityService.getActivities();
  }
}