import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivityService } from '../../../core/services/activity.service';
import { CardComponent } from '../card/card.component';
import { ActivityTypeService } from '../../../core/services/activitytype.service';
import { ActivityType } from '../../models/activityType.models';
import { Observable } from 'rxjs';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule, CardComponent, TranslatePipe],
  templateUrl: './list.component.html',
  styles: [],
})
export class ListComponent implements OnInit {
  
  private activityService = inject(ActivityService);
  private activityTypeService = inject(ActivityTypeService);

  activities$ = this.activityService.activities$;
  activityTypes$!: Observable<ActivityType[]>; 

  ngOnInit(): void {
    this.activityService.getActivities();
    this.activityTypes$ = this.activityTypeService.getActivitiesType();
  }
}