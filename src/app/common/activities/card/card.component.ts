import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Activity } from '../../models/activity.model';
import { ActivityType } from '../../models/activityType.models';
import { mapsService } from '../../../core/services/maps.service';
import { Tilt3DDirective } from '../../../core/directives/tilt3d.directive';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule, Tilt3DDirective],
  templateUrl: './card.component.html',
  styles: []
})
export class CardComponent implements OnInit, OnChanges {

  @Input() activity!: Activity;
  @Input() activityTypes: ActivityType[] = [];

  activityColor = '';
  location?: string;

  constructor(private router: Router, private mapService: mapsService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['activity'] || changes['activityTypes']) {
      this.updateActivityColor();
    }
  }

  ngOnInit(): void {
    if (this.activity?.latitude && this.activity?.longitude) {
        this.mapService.getAddress(
          parseFloat(this.activity.latitude), 
          parseFloat(this.activity.longitude)
        ).subscribe(address => {
          this.location = address;
        });
    }
  }

  redirectToDetail() {
    this.router.navigate(['/activityDetail', this.activity.id]);
  }

  private updateActivityColor(): void {
    if (!this.activity || !this.activityTypes || this.activityTypes.length === 0) {
      this.activityColor = '#ccc';
      return;
    }

    const key = (this.activity as any).activityTypeId ??
                (this.activity as any).IdTypeActivity ??
                (this.activity as any).activityType ??
                (this.activity as any).typeId ??
                (this.activity as any).type ??
                '';

    const keyStr = String(key).toLowerCase();

    const type = this.activityTypes.find(t => {
      const tid = String((t as any).id ?? (t as any).uid ?? '').toLowerCase();
      const tname = String((t as any).name ?? '').toLowerCase();
      return tid === keyStr || tname === keyStr;
    });

    const color = type?.color ?? '';

    if (color && !color.startsWith('#') && /^([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
      this.activityColor = '#' + color;
    } else {
      this.activityColor = color || '#ccc';
    }
  }

  getStarState(index: number): 'full' | 'half' | 'empty' {
    if (!this.activity) return 'empty';
    const rating = this.activity.rating;
    const starValue = index + 1;
    if (rating >= starValue) return 'full';
    else if (rating >= starValue - 0.5) return 'half';
    else return 'empty';
  }

  getStarsArray(): number[] {
    return [0, 1, 2, 3, 4];
  }
}