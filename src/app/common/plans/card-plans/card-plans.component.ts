import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Plan } from '../../models/plan.model';
import { mapsService } from '../../../core/services/maps.service';
import { Activity } from '../../models/activity.model';
import { Tilt3DDirective } from '../../../core/directives/tilt3d.directive';

@Component({
  selector: 'app-card-plans',
  imports: [CommonModule, Tilt3DDirective],
  templateUrl: './card-plans.component.html',
  styles: []
})
export class CardPlansComponent implements OnInit, OnChanges {

  @Input() plan!: Plan;
  @Input() activity: Activity[] = [];

  constructor(private router: Router, private mapService: mapsService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['plan'] ) {
    }
  }

  ngOnInit(): void {
   
  }

  redirectToDetail() {
    this.router.navigate(['/planDetail', this.plan.id]);
  }

  getStarState(index: number): 'full' | 'half' | 'empty' {
    if (!this.plan) return 'empty';
    const rating = this.plan.rating;
    const starValue = index + 1;
    if (rating >= starValue) return 'full';
    else if (rating >= starValue - 0.5) return 'half';
    else return 'empty';
  }

  getStarsArray(): number[] {
    return [0, 1, 2, 3, 4];
  }
}