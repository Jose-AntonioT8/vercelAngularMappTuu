import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ActivityType } from '../../models/activityType.models';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card.component.html',
  styles: []
})
export class CardComponent implements  OnChanges {

  @Input() activityType!: ActivityType;

  activityTypeColor = '';

  constructor(private router: Router) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['activityType']) this.updateActivityColor();
  }

  

  redirectToDetail() {
    this.router.navigate(['/activityTypeDetail', this.activityType.id]);
  }

  private updateActivityColor(): void {
    const raw = this.activityType?.color?.toString().trim();
    if (!raw) { this.activityTypeColor = '#ccc'; return; }
    const hex = raw.startsWith('#') ? raw.slice(1) : raw;
    const isHex = /^([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(hex);
    this.activityTypeColor = isHex ? `#${hex.toLowerCase()}` : raw;
  }

 
}