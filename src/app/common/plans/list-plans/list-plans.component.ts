
import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { PlanService } from '../../../core/services/plan.service';
import { CardPlansComponent } from '../card-plans/card-plans.component';
import { ActivityService } from '../../../core/services/activity.service';
import { Activity } from '../../models/activity.model';
import { BehaviorSubject, Observable, combineLatest, debounceTime, distinctUntilChanged, forkJoin, map, of, shareReplay, switchMap } from 'rxjs';
import { Plan } from '../../models/plan.model';
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
 * Listado de planes (componente común).
 *
 * Orquesta la carga reactiva de:
 * - planes desde `PlanService`
 * - actividades desde `ActivityService` (para enriquecer cards)
 */
@Component({
  selector: 'app-list-plans',
  standalone: true,
  imports: [CommonModule, CardPlansComponent, TranslatePipe],
  templateUrl: './list-plans.component.html',
  styles: []
})
export class ListPlansComponent implements OnInit {
  
  /** Servicio de actividades (catálogo) para enriquecer cards. */
  private activityService = inject(ActivityService);
  /** Servicio de planes (stream + carga). */
  private planService = inject(PlanService);
  /** Servicio de mapas para reverse geocoding de actividades. */
  private mapsService = inject(MapsService);
  /** Caché de ubicaciones resueltas por coordenadas. */
  private readonly locationCache = new Map<string, string>();
  /** Caché de geocodificación de términos de búsqueda. */
  private readonly searchGeoCache = new Map<string, GeocodedLocation | null>();

  /** Stream de planes para renderizar el listado. */
  plans$ = this.planService.plans$;
  /** Stream de búsqueda por nombre desde la pantalla padre. */
  private readonly searchTerm$ = new BehaviorSubject<string>('');
  /** Stream de consulta geocodificada derivada del buscador. */
  private readonly searchQuery$ = this.searchTerm$.pipe(
    debounceTime(250),
    distinctUntilChanged(),
    switchMap((term) => this.resolveSearchQuery(term)),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
  /** Stream de actividades para enriquecer cards (si aplica). */
  activity$!: Observable<Activity[]>; 
  /** Stream de actividades enriquecidas con ubicación textual resuelta. */
  activitiesWithLocation$!: Observable<ActivitySearchItem[]>;
  /** Stream final de planes filtrados por nombre, descripción y actividades relacionadas. */
  filteredPlans$!: Observable<Plan[]>;

  /** Término de búsqueda externo para filtrar por nombre de plan. */
  @Input() set searchTerm(value: string) {
    this.searchTerm$.next((value || '').trim());
  }

  /** Dispara listeners/cargas necesarias para poblar streams. */
  ngOnInit(): void {
    this.planService.getPlans();
    this.activity$ = this.activityService.getActivities();
    this.activitiesWithLocation$ = this.activity$.pipe(
      switchMap((activities) => this.enrichActivitiesWithLocation(activities || [])),
    );
    this.filteredPlans$ = combineLatest([
      this.plans$,
      this.activitiesWithLocation$,
      this.searchQuery$,
    ]).pipe(
      map(([plans, activities, query]) =>
        this.filterByTerm(plans || [], activities || [], query),
      ),
    );
  }

  private filterByTerm(
    plans: Plan[],
    activities: ActivitySearchItem[],
    query: SearchQueryState,
  ): Plan[] {
    const normalizedTerm = query.normalizedTerm;
    if (!normalizedTerm) {
      return plans;
    }

    const activitiesById = new Map(
      activities
        .filter((activity) => !!activity?.id)
        .map((activity) => [activity.id, activity] as const),
    );

    return plans.filter((plan) => {
      const searchableText = this.getSearchableText(plan, activitiesById);
      const textMatch = searchableText.includes(normalizedTerm);
      const geoMatch = query.geoLocation
        ? this.matchesPlanGeoFilter(plan, activitiesById, query.geoLocation)
        : false;

      return textMatch || geoMatch;
    });
  }

  private getSearchableText(
    plan: Plan,
    activitiesById: Map<string, ActivitySearchItem>,
  ): string {
    const value = plan as unknown as Record<string, unknown>;
    const activityIds = this.getStringArrayField(value, ['activitiesIds']);
    const relatedActivities = activityIds
      .map((activityId) => activitiesById.get(String(activityId)))
      .filter((activity): activity is ActivitySearchItem => !!activity);

    const fields = [
      value['name'],
      value['title'],
      value['description'],
      ...relatedActivities.flatMap((activity) => [
        activity.name,
        activity.resolvedLocation,
        (activity as unknown as Record<string, unknown>)['location'],
        (activity as unknown as Record<string, unknown>)['locationText'],
        (activity as unknown as Record<string, unknown>)['address'],
        (activity as unknown as Record<string, unknown>)['city'],
        (activity as unknown as Record<string, unknown>)['region'],
        (activity as unknown as Record<string, unknown>)['place'],
        (activity as unknown as Record<string, unknown>)['description'],
      ]),
    ];

    return fields
      .filter((field): field is string => typeof field === 'string')
      .map((field) => this.normalizeSearchText(field))
      .join(' ');
  }

  private getStringArrayField(
    source: Record<string, unknown>,
    keys: string[],
  ): string[] {
    for (const key of keys) {
      const value = source[key];
      if (Array.isArray(value)) {
        return value.filter((item): item is string => typeof item === 'string');
      }
    }

    return [];
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
        return { normalizedTerm, geoLocation };
      }),
    );
  }

  private matchesPlanGeoFilter(
    plan: Plan,
    activitiesById: Map<string, ActivitySearchItem>,
    geoLocation: GeocodedLocation,
  ): boolean {
    const value = plan as unknown as Record<string, unknown>;
    const activityIds = this.getStringArrayField(value, ['activitiesIds']);
    return activityIds.some((activityId) => {
      const activity = activitiesById.get(activityId);
      if (!activity) {
        return false;
      }
      return this.matchesGeoFilter(activity, geoLocation);
    });
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
    const value = activity as Activity & Record<string, unknown>;
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