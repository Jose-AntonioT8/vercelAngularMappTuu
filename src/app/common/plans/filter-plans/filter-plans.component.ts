
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule  } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Activity } from '../../models/activity.model';
import { ActivityService } from '../../../core/services/activity.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

interface FilterItem {
  id: string;
  name: string;
}

export interface ActivityFilterState {
    activity: string | null; 
    ratingMin: number; 
}


@Component({
  selector: 'app-filter-plans',
  imports: [CommonModule, FormsModule, TranslatePipe],
  standalone: true,
  templateUrl: './filter-plans.component.html',
  styles: []
})
export class FilterPlansComponent  implements OnInit, ActivityFilterState{

    activity: string | null = null;
    location: string | null = null;
    ratingMin: number = 0;
    activitiesName : string[] = [];
    activities : Activity[] = [];
    @Output() filterChanged = new EventEmitter<ActivityFilterState>();
    
    @Input() availableTypes: FilterItem[] = []; 
constructor( private ActivityService: ActivityService,
) {}

    ngOnInit() {
        this.emitCurrentFilterState();
        this.ActivityService.getActivities().subscribe(
            (res: Activity[]) => {
              this.activities = res;
              this.activitiesName = res.map((type) => type.name);
            },
            (err) => {
              console.error('Error cargando actividades', err);
            }
          );
    }

    emitCurrentFilterState() {
        const filterState: ActivityFilterState = {
            activity: this.activity,
            ratingMin: this.ratingMin
        };
        this.filterChanged.emit(filterState);
    }

    resetFilters() {
        this.activity = null;
        this.ratingMin = 0;
        this.emitCurrentFilterState();
    }


}