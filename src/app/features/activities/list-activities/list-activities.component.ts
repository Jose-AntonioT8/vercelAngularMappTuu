import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FilterComponent } from '../../../common/activities/filter/filter.component';
import { ListComponent } from '../../../common/activities/list/list.component';
import { HeaderComponent } from '../../../common/header/header.component';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-list-activities',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    FilterComponent,
    ListComponent,
    TranslatePipe,
    RouterModule,
  ],
  templateUrl: './list-activities.component.html',
  styles: [],
})
export class ListActivitiesComponent {
  constructor(private route: Router) {}
  isFilterOpen = false;

  ngOnInit() {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      this.isFilterOpen = true;
    }
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
