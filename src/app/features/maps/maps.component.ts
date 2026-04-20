import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivityService } from '../../core/services/activity.service';
import { ActivityTypeService } from '../../core/services/activitytype.service';
import { HeaderComponent } from "../../common/header/header.component";
import { MapComponent, MapMarkerData } from '../../common/maps/maps.component';
import { combineLatest, Subscription, filter } from 'rxjs';

/**
 * Pantalla de mapa “Explorar”.
 *
 * Construye `mapPoints` combinando:
 * - Actividades (lat/lng, nombre, rating, imagen, precio)
 * - Tipos de actividad (para derivar color del marker)
 *
 * El render real del mapa vive en `MapComponent`.
 */
@Component({
  selector: 'app-maps',
  standalone: true,
  imports: [HeaderComponent, MapComponent],
  templateUrl: './maps.component.html',
  styles: []
})
export class MapsComponent implements OnInit, OnDestroy {

  /** Puntos que se pasan al componente de mapa para renderizar markers. */
  mapPoints: MapMarkerData[] = [];
  /** Suscripción a streams combinados (activities + types). */
  private subscription?: Subscription;
  /** Servicio para recuperar actividades publicables en el mapa. */
  private activityservice: ActivityService;
  /** Servicio para recuperar metadatos de tipos (color, etc.). */
  private activityTypeService: ActivityTypeService;

  /**
    * Crea la pantalla de mapa y prepara dependencias de datos.
    *
   * @param activityservice Servicio para recuperar actividades publicables en el mapa.
   * @param activityTypeService Servicio para recuperar metadatos de tipos (color, etc.).
   */
  constructor(
    activityservice: ActivityService,
    activityTypeService: ActivityTypeService
  ) {
    this.activityservice = activityservice;
    this.activityTypeService = activityTypeService;
  }

  /** Suscribe a actividades y tipos para construir `mapPoints`. */
  ngOnInit(): void {
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

  /** Limpia la suscripción al destruir el componente. */
  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}