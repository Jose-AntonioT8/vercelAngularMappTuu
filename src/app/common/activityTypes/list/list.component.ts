import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { CardComponent } from '../card/card.component';
import { ActivityTypeService } from '../../../core/services/activitytype.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule, CardComponent, TranslatePipe],
  templateUrl: './list.component.html',
  styles: [],
})
export class ListComponent implements OnInit {
  
  private activityTypeService = inject(ActivityTypeService);

  activityTypes$ = this.activityTypeService.activities$;

  ngOnInit(): void {
    this.activityTypeService.getActivitiesType();
  }
}