import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {HeaderComponent} from '../../../common/header/header.component';
import {FilterPlansComponent} from '../../../common/plans/filter-plans/filter-plans.component';
import { ListPlansComponent } from '../../../common/plans/list-plans/list-plans.component';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
@Component({
  selector: 'app-plans-list',
  standalone: true,
  imports: [CommonModule, HeaderComponent, FilterPlansComponent, ListPlansComponent, TranslatePipe],
  templateUrl: './plans-list.component.html',
  styles: []
})
export class PlansListComponent {
  isFilterOpen = false;

  ngOnInit() {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      this.isFilterOpen = true;
    }
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
