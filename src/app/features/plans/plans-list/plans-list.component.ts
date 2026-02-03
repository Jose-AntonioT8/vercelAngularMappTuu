import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../common/header/header.component';
import { FilterPlansComponent } from '../../../common/plans/filter-plans/filter-plans.component';
import { ListPlansComponent } from '../../../common/plans/list-plans/list-plans.component';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
@Component({
  selector: 'app-plans-list',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    FilterPlansComponent,
    ListPlansComponent,
    TranslatePipe,
  ],
  templateUrl: './plans-list.component.html',
  styles: [],
})
export class PlansListComponent {
  constructor(private route: Router) {}
  isFilterOpen = false;

  ngOnInit() {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      this.isFilterOpen = true;
    }
  }
  goCreatePlan() {
    this.route.navigate(['/plansCreation']);
  }
  toggleFilter() {
    this.isFilterOpen = !this.isFilterOpen;
  }

  closeFilter() {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      this.isFilterOpen = false;
    }
  }
}
