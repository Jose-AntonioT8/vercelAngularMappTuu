import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivityService } from '../../core/services/activity.service';
import { ActivityTypeService } from '../../core/services/activitytype.service';
import { HeaderComponent } from "../../common/header/header.component";
import { MapComponent, MapMarkerData } from '../../common/maps/maps.component';
import { combineLatest, Subscription, filter } from 'rxjs';

@Component({
  selector: 'app-maps',
  standalone: true,
  imports: [HeaderComponent, MapComponent],
  templateUrl: './maps.component.html',
  styles: []
})
export class MapsComponent implements OnInit, OnDestroy {

  mapPoints: MapMarkerData[] = [];
  private subscription?: Subscription;

  constructor(
    private activityservice: ActivityService,
    private activityTypeService: ActivityTypeService
  ) { }

  ngOnInit() {
    this.subscription = combineLatest([
      this.activityservice.getActivities(),
      this.activityTypeService.getActivitiesType()
    ]).pipe(
      filter(([activities, types]) => activities.length > 0)
    ).subscribe({
      next: ([activities, types]) => {
        this.mapPoints = activities.map(actividad => {
          const activityType = types.find(t => t.id === (actividad as any).activityTypeId);
          let color = activityType?.color || '#5675AC';
          if (color && !color.startsWith('#')) {
            color = '#' + color;
          }
          
          return {
          latitude: parseFloat(actividad.latitude),
          longitude: parseFloat(actividad.longitude),
          title: actividad.name,
          rating: actividad.rating,
            link: `/activityDetail/${actividad.id}`,
            image: (actividad as any).imageRef || (actividad as any).imageURL,
            color: color,
            price: (actividad as any).price || 0
          };
        });
      },
      error: (err) => console.error('Error loading activities for map:', err)
    });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }
}