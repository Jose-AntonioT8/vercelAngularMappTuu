import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../common/header/header.component';
import { ListComponent as ActivityTypeList } from '../../../common/activityTypes/list/list.component';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-activity-types-list',
  standalone: true,
  imports: [CommonModule, HeaderComponent, ActivityTypeList, TranslatePipe],
  templateUrl: './activity-types-list.component.html',
  styleUrl: './activity-types-list.component.scss'
})
export class ActivityTypesListComponent {

}
