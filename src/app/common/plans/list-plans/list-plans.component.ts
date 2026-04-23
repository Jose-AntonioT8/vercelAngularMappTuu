
import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { PlanService } from '../../../core/services/plan.service';
import { CardPlansComponent } from '../card-plans/card-plans.component';
import { ActivityService } from '../../../core/services/activity.service';
import { Activity } from '../../models/activity.model';
import { BehaviorSubject, Observable, combineLatest, distinctUntilChanged, forkJoin, map, of, shareReplay, switchMap } from 'rxjs';
import { Plan } from '../../models/plan.model';
import { GeocodedLocation, MapsService } from '../../../core/services/maps.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { ActivityFilterState as PlanFilterState } from '../filter-plans/filter-plans.component';

/** Actividad enriquecida con ubicación resuelta para filtros de planes. */
interface ActivitySearchItem extends Activity {
  /** Ubicación textual derivada de reverse geocoding. */
  resolvedLocation: string;
}

/** Estado intermedio de búsqueda: término normalizado + posible geocodificación. */
interface SearchQueryState {
  /** Término de búsqueda normalizado para comparar. */
  normalizedTerm: string;
  /** Resultado geocodificado del término, si aplica. */
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
  /** Estado reactivo del panel de filtros de planes. */
  private readonly filterState$ = new BehaviorSubject<PlanFilterState>({
    activity: null,
    ratingMin: 0,
  });

  /** Stream de planes para renderizar el listado. */
  plans$ = this.planService.plans$;
  /** Stream de búsqueda por nombre desde la pantalla padre. */
  private readonly searchTerm$ = new BehaviorSubject<string>('');
  /** Stream de consulta geocodificada derivada del buscador. */
  private readonly searchQuery$ = this.searchTerm$.pipe(
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

  /** Estado del panel de filtros (actividad y rating). */
  @Input() set filterState(value: PlanFilterState | null) {
    this.filterState$.next({
      activity: value?.activity ?? null,
      ratingMin: value?.ratingMin ?? 0,
    });
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
      this.filterState$,
    ]).pipe(
      map(([plans, activities, query, filterState]) =>
        this.filterByTerm(plans || [], activities || [], query, filterState),
      ),
    );
  }

  /**
   * Aplica filtros combinados de texto, geolocalizacion, actividad y valoracion.
   */
  private filterByTerm(
    plans: Plan[],
    activities: ActivitySearchItem[],
    query: SearchQueryState,
    filterState: PlanFilterState,
  ): Plan[] {
    const activitiesById = new Map(
      activities
        .filter((activity) => !!activity?.id)
        .map((activity) => [activity.id, activity] as const),
    );

    return plans.filter((plan) => {
      const normalizedTerm = query.normalizedTerm;
      const searchableText = this.getSearchableText(plan, activitiesById);
      const textMatch = normalizedTerm ? searchableText.includes(normalizedTerm) : true;
      const geoMatch = query.geoLocation
        ? this.matchesPlanGeoFilter(plan, activitiesById, query.geoLocation)
        : true;
      const activityMatch = this.matchesPlanActivityFilter(
        plan,
        activitiesById,
        filterState.activity,
      );
      const ratingMatch = this.matchesPlanRatingFilter(plan, filterState.ratingMin);

      return (textMatch || geoMatch) && activityMatch && ratingMatch;
    });
  }

  /** Construye el texto indexable de un plan y de sus actividades relacionadas. */
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

  /** Extrae un array de strings desde un conjunto de claves candidatas. */
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

  /** Resuelve el termino de busqueda y su posible geocodificacion. */
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

  /** Valida coincidencia geografica de un plan en base a sus actividades. */
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

  /** Valida coincidencia por actividad seleccionada en el filtro del panel. */
  private matchesPlanActivityFilter(
    plan: Plan,
    activitiesById: Map<string, ActivitySearchItem>,
    selectedActivity: string | null,
  ): boolean {
    const normalizedSelectedActivity = this.normalizeSearchText(selectedActivity || '');
    if (!normalizedSelectedActivity) {
      return true;
    }

    const value = plan as unknown as Record<string, unknown>;
    const activityIds = this.getStringArrayField(value, ['activitiesIds']);

    return activityIds.some((activityId) => {
      const activity = activitiesById.get(activityId);
      if (!activity) {
        return false;
      }

      const activityName = this.normalizeSearchText(activity.name);
      const activityIdNormalized = this.normalizeSearchText(activity.id);
      return (
        activityName === normalizedSelectedActivity ||
        activityIdNormalized === normalizedSelectedActivity
      );
    });
  }

  /** Valida coincidencia por valoracion minima del plan. */
  private matchesPlanRatingFilter(plan: Plan, ratingMin: number): boolean {
    if (!ratingMin || ratingMin <= 0) {
      return true;
    }

    return (plan.rating ?? 0) >= ratingMin;
  }

  /** Comprueba si una actividad coincide con el filtro geoespacial. */
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

  /** Valida si un punto cae dentro del viewport geocodificado. */
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

  /** Calcula distancia aproximada entre dos puntos usando Haversine. */
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

  /** Convierte grados a radianes. */
  private toRadians(value: number): number {
    return (value * Math.PI) / 180;
  }

  /** Radio de busqueda por defecto cuando no hay viewport exacto. */
  private readonly searchRadiusKm = 25;

  /** Enriquece actividades con ubicacion resuelta para busqueda/filtros. */
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

  /**
   * Resuelve una ubicacion legible para una actividad.
   * Usa campos explicitos y cae a reverse geocoding por coordenadas.
   */
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

  /** Devuelve el primer campo string valido encontrado en la lista de claves. */
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

  /** Devuelve el primer campo numerico valido encontrado en la lista de claves. */
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

  /** Normaliza texto para comparaciones flexibles sin acentos ni mayusculas. */
  private normalizeSearchText(value: string): string {
    return (value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
}