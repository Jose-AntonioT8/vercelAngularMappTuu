import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule  } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivityType } from '../../models/activityType.models';
import { ActivityTypeService } from '../../../core/services/activitytype.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

interface FilterItem {
  id: string;
  name: string;
}

export interface ActivityFilterState {
    activityType: string | null; 
    location: string | null;
    ratingMin: number; 
}

@Component({
  selector: 'app-filter',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './filter.component.html',
  styles: []
})


export class FilterComponent implements OnInit, ActivityFilterState{
    activityType: string | null = null;
    location: string | null = null;
    ratingMin: number = 0;
    activityTypesName : string[] = [];
    activityTypes : ActivityType[] = [];
    @Output() filterChanged = new EventEmitter<ActivityFilterState>();
    
    @Input() availableTypes: FilterItem[] = []; 
constructor( private ActivityTypeService: ActivityTypeService,
) {}

    ngOnInit() {
        this.emitCurrentFilterState();
        this.ActivityTypeService.getActivitiesType().subscribe(
            (res: ActivityType[]) => {
              this.activityTypes = res;
              this.activityTypesName = res.map((type) => type.name);
            },
            (err) => {
              console.error('Error cargando actividades', err);
            }
          );
    }

    emitCurrentFilterState() {
        const filterState: ActivityFilterState = {
            activityType: this.activityType,
            location: this.location,
            ratingMin: this.ratingMin
        };
        this.filterChanged.emit(filterState);
    }

    resetFilters() {
        this.activityType = null;
        this.location = null;
        this.ratingMin = 0;
        this.emitCurrentFilterState();
    }


}