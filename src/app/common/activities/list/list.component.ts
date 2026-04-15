import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { ActivityService } from '../../../core/services/activity.service';
import { CardComponent } from '../card/card.component';
import { ActivityTypeService } from '../../../core/services/activitytype.service';
import { ActivityType } from '../../models/activityType.models';
import { BehaviorSubject, Observable, combineLatest, debounceTime, distinctUntilChanged, forkJoin, map, of, shareReplay, switchMap } from 'rxjs';
import { Activity } from '../../models/activity.model';
import { GeocodedLocation, MapsService } from '../../../core/services/maps.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

interface ActivitySearchItem extends Activity {
  resolvedLocation: string;
}

interface SearchQueryState {
  normalizedTerm: string;
  geoLocation: GeocodedLocation | null;
}

/**
 * Listado de actividades.
 *
 * Orquesta la carga inicial:
 * - Actividades (desde `ActivityService`)
 * - Tipos de actividad (desde `ActivityTypeService`)
 */
@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule, CardComponent, TranslatePipe],
  templateUrl: './list.component.html',
  styles: [],
})
export class ListComponent implements OnInit {
  
  /** Servicio de actividades para alimentar el stream del listado. */
  private activityService = inject(ActivityService);
  /** Servicio de tipos para enriquecer cards (labels/colores). */
  private activityTypeService = inject(ActivityTypeService);
  /** Servicio de mapas para reverse geocoding de coordenadas. */
  private mapsService = inject(MapsService);
  /** Caché de ubicaciones resueltas por coordenadas. */
  private readonly locationCache = new Map<string, string>();
  /** Caché de geocodificación de términos de búsqueda. */
  private readonly searchGeoCache = new Map<string, GeocodedLocation | null>();

  /** Stream reactivo de actividades para renderizar el listado. */
  activities$ = this.activityService.activities$;
  /** Stream de actividades enriquecidas con ubicación textual resuelta. */
  activitiesWithLocation$ = this.activities$.pipe(
    switchMap((activities) => this.enrichActivitiesWithLocation(activities || [])),
  );
  /** Stream de búsqueda por nombre desde la pantalla padre. */
  private readonly searchTerm$ = new BehaviorSubject<string>('');
  /** Stream de consulta geocodificada derivada del buscador. */
  private readonly searchQuery$ = this.searchTerm$.pipe(
    debounceTime(250),
    distinctUntilChanged(),
    switchMap((term) => this.resolveSearchQuery(term)),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
  /** Stream final de actividades filtradas por nombre, ubicación resuelta y radio/bbox. */
  filteredActivities$ = combineLatest([this.activitiesWithLocation$, this.searchQuery$]).pipe(
    map(([activities, query]) => this.filterByTerm(activities || [], query)),
  );
  /** Stream de tipos usado por las cards para colorear/etiquetar. */
  activityTypes$!: Observable<ActivityType[]>; 

  /** Término de búsqueda externo para filtrar por nombre de actividad. */
  @Input() set searchTerm(value: string) {
    this.searchTerm$.next((value || '').trim());
  }

  /** Dispara cargas iniciales necesarias para el listado. */
  ngOnInit(): void {
    this.activityService.getActivities();
    this.activityTypes$ = this.activityTypeService.getActivitiesType();
  }

  private filterByTerm(activities: ActivitySearchItem[], query: SearchQueryState): Activity[] {
    const normalizedTerm = query.normalizedTerm;
    if (!normalizedTerm) {
      return activities;
    }

    return activities.filter((activity) => {
      const searchableText = this.getSearchableText(activity);
      const textMatch = searchableText.includes(normalizedTerm);
      const geoMatch = query.geoLocation
        ? this.matchesGeoFilter(activity, query.geoLocation)
        : false;

      return textMatch || geoMatch;
    });
  }

  private getSearchableText(activity: ActivitySearchItem): string {
    const value = activity as unknown as Record<string, unknown>;
    const fields = [
      value['name'],
      value['title'],
      value['location'],
      value['locationText'],
      value['address'],
      value['city'],
      value['region'],
      value['place'],
      value['fullAddress'],
      value['description'],
      activity.resolvedLocation,
    ];

    return fields
      .filter((field): field is string => typeof field === 'string')
      .map((field) => this.normalizeSearchText(field))
      .join(' ');
  }

  private enrichActivitiesWithLocation(
    activities: Activity[],
  ): Observable<ActivitySearchItem[]> {
    if (!activities.length) {
      return of([]);
    }

    return forkJoin(
      activities.map((activity) =>
        this.resolveActivityLocation(activity).pipe(
          map((resolvedLocation) => ({
            ...activity,
            resolvedLocation,
          })),
        ),
      ),
    );
  }

  private resolveActivityLocation(activity: Activity): Observable<string> {
    const value = activity as unknown as Record<string, unknown>;
    const explicitLocation = this.pickStringField(value, [
      'location',
      'locationText',
      'address',
      'city',
      'region',
      'place',
      'fullAddress',
    ]);

    if (explicitLocation) {
      return of(explicitLocation);
    }

    const latitude = this.pickNumberField(value, ['latitude', 'lat']);
    const longitude = this.pickNumberField(value, ['longitude', 'lng', 'lon']);

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return of('');
    }

    const cacheKey = `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
    const cachedLocation = this.locationCache.get(cacheKey);
    if (cachedLocation) {
      return of(cachedLocation);
    }

    return this.mapsService.getAddress(latitude, longitude).pipe(
      map((location) => {
        const normalizedLocation = this.normalizeSearchText(location);
        if (normalizedLocation) {
          this.locationCache.set(cacheKey, normalizedLocation);
        }
        return normalizedLocation;
      }),
    );
  }

  private resolveSearchQuery(term: string): Observable<SearchQueryState> {
    const normalizedTerm = this.normalizeSearchText(term);
    if (!normalizedTerm) {
      return of({ normalizedTerm: '', geoLocation: null });
    }

    const cachedGeoLocation = this.searchGeoCache.get(normalizedTerm);
    if (cachedGeoLocation !== undefined) {
      return of({ normalizedTerm, geoLocation: cachedGeoLocation });
    }

    return this.mapsService.geocodeLocation(term).pipe(
      map((geoLocation) => {
        this.searchGeoCache.set(normalizedTerm, geoLocation);

        return {
          normalizedTerm,
          geoLocation,
        };
      }),
    );
  }

  private matchesGeoFilter(
    activity: ActivitySearchItem,
    geoLocation: GeocodedLocation,
  ): boolean {
    const latitude = this.pickNumberField(activity as unknown as Record<string, unknown>, [
      'latitude',
      'lat',
    ]);
    const longitude = this.pickNumberField(activity as unknown as Record<string, unknown>, [
      'longitude',
      'lng',
      'lon',
    ]);

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return false;
    }

    if (geoLocation.viewport) {
      return this.isInsideViewport(latitude, longitude, geoLocation.viewport);
    }

    return this.distanceKm(
      latitude,
      longitude,
      geoLocation.latitude,
      geoLocation.longitude,
    ) <= this.searchRadiusKm;
  }

  private isInsideViewport(
    latitude: number,
    longitude: number,
    viewport: NonNullable<GeocodedLocation['viewport']>,
  ): boolean {
    const minLat = Math.min(viewport.northeast.lat, viewport.southwest.lat);
    const maxLat = Math.max(viewport.northeast.lat, viewport.southwest.lat);
    const minLng = Math.min(viewport.northeast.lng, viewport.southwest.lng);
    const maxLng = Math.max(viewport.northeast.lng, viewport.southwest.lng);

    return (
      latitude >= minLat &&
      latitude <= maxLat &&
      longitude >= minLng &&
      longitude <= maxLng
    );
  }

  private distanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const earthRadiusKm = 6371;
    const deltaLat = this.toRadians(lat2 - lat1);
    const deltaLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(deltaLon / 2) *
        Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
  }

  private toRadians(value: number): number {
    return (value * Math.PI) / 180;
  }

  private readonly searchRadiusKm = 25;

  private pickStringField(
    source: Record<string, unknown>,
    keys: string[],
  ): string {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    return '';
  }

  private pickNumberField(
    source: Record<string, unknown>,
    keys: string[],
  ): number | undefined {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === 'string') {
        const parsed = Number(value.replace(',', '.').trim());
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }

    return undefined;
  }

  private normalizeSearchText(value: string): string {
    return (value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
}