import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, distinctUntilChanged, forkJoin, map, of, shareReplay, switchMap } from 'rxjs';
import { ActivityService } from '../../../core/services/activity.service';
import { ActivityTypeService } from '../../../core/services/activitytype.service';
import { GeocodedLocation, MapsService } from '../../../core/services/maps.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { ActivityType } from '../../models/activityType.models';
import { Activity } from '../../models/activity.model';
import { CardComponent } from '../card/card.component';
import { ActivityFilterState as ActivityListFilterState } from '../filter/filter.component';

/** Actividad enriquecida con ubicación resuelta para búsquedas por texto. */
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
  /** Estado reactivo del panel de filtros de actividades. */
  private readonly filterState$ = new BehaviorSubject<ActivityListFilterState>({
    activityType: null,
    location: null,
    ratingMin: 0,
  });

  /** Stream reactivo de actividades para renderizar el listado. */
  activities$ = this.activityService.activities$;
  /** Stream de actividades enriquecidas con ubicación textual resuelta. */
  activitiesWithLocation$ = this.activities$.pipe(
    switchMap((activities) => this.enrichActivitiesWithLocation(activities || [])),
  );
  /** Stream de tipos usado por las cards para colorear/etiquetar. */
  activityTypes$ = this.activityTypeService.activities$;
  /** Stream de búsqueda por nombre desde la pantalla padre. */
  private readonly searchTerm$ = new BehaviorSubject<string>('');
  /** Stream de consulta geocodificada derivada del buscador. */
  private readonly searchQuery$ = this.searchTerm$.pipe(
    distinctUntilChanged(),
    switchMap((term) => this.resolveSearchQuery(term)),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
  /** Stream final de actividades filtradas por búsqueda y panel de filtros. */
  filteredActivities$ = combineLatest([
    this.activitiesWithLocation$,
    this.searchQuery$,
    this.filterState$,
    this.activityTypes$,
  ]).pipe(
    map(([activities, query, filterState, activityTypes]) =>
      this.filterByTerm(activities || [], query, filterState, activityTypes || []),
    ),
  );

  /** Término de búsqueda externo para filtrar por nombre de actividad. */
  @Input() set searchTerm(value: string) {
    this.searchTerm$.next((value || '').trim());
  }

  /** Estado del panel de filtros (tipo, ubicación y rating). */
  @Input() set filterState(value: ActivityListFilterState | null) {
    this.filterState$.next({
      activityType: value?.activityType ?? null,
      location: value?.location ?? null,
      ratingMin: value?.ratingMin ?? 0,
    });
  }

  /** Dispara cargas iniciales necesarias para el listado. */
  ngOnInit(): void {
    this.activityService.getActivities();
    this.activityTypeService.getActivitiesType();
  }

  /**
   * Aplica filtros combinados de texto, geolocalizacion, tipo y valoracion.
   */
  private filterByTerm(
    activities: ActivitySearchItem[],
    query: SearchQueryState,
    filterState: ActivityListFilterState,
    activityTypes: ActivityType[],
  ): Activity[] {
    return activities.filter((activity) => {
      const moderationStatus = String((activity as any).moderationStatus || '').trim().toLowerCase();
      if (moderationStatus && moderationStatus !== 'approved') {
        return false;
      }
      const normalizedTerm = query.normalizedTerm;
      const textMatch = normalizedTerm
        ? this.getSearchableText(activity).includes(normalizedTerm)
        : true;
      const geoMatch = query.geoLocation
        ? this.matchesGeoFilter(activity, query.geoLocation)
        : true;
      const typeMatch = this.matchesActivityTypeFilter(
        activity,
        filterState.activityType,
        activityTypes,
      );
      const locationMatch = this.matchesLocationFilter(activity, filterState.location);
      const ratingMatch = this.matchesRatingFilter(activity, filterState.ratingMin);

      return (textMatch || geoMatch) && typeMatch && locationMatch && ratingMatch;
    });
  }

  /** Construye el texto indexable principal de una actividad. */
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

  /** Construye el texto indexable asociado unicamente a la ubicacion. */
  private getLocationSearchText(activity: ActivitySearchItem): string {
    const value = activity as unknown as Record<string, unknown>;
    const fields = [
      value['location'],
      value['locationText'],
      value['address'],
      value['city'],
      value['region'],
      value['place'],
      value['fullAddress'],
      activity.resolvedLocation,
    ];

    return fields
      .filter((field): field is string => typeof field === 'string')
      .map((field) => this.normalizeSearchText(field))
      .join(' ');
  }

  /** Evalua el filtro de ubicacion textual del panel. */
  private matchesLocationFilter(
    activity: ActivitySearchItem,
    location: string | null,
  ): boolean {
    const normalizedLocation = this.normalizeSearchText(location || '');
    if (!normalizedLocation) {
      return true;
    }

    return this.getLocationSearchText(activity).includes(normalizedLocation);
  }

  /** Evalua el filtro por tipo de actividad (id o nombre normalizado). */
  private matchesActivityTypeFilter(
    activity: ActivitySearchItem,
    selectedType: string | null,
    activityTypes: ActivityType[],
  ): boolean {
    const normalizedSelectedType = this.normalizeSearchText(selectedType || '');
    if (!normalizedSelectedType) {
      return true;
    }

    const activityTypeKey = this.normalizeSearchText(
      this.pickStringField(activity as unknown as Record<string, unknown>, [
        'activityTypeId',
        'IdTypeActivity',
        'typeId',
        'activityType',
        'type',
        'activityTypeName',
      ]),
    );

    if (!activityTypeKey) {
      return false;
    }

    const catalogMatch = activityTypes.find((activityType) => {
      const normalizedId = this.normalizeSearchText(activityType.id);
      const normalizedName = this.normalizeSearchText(activityType.name);
      return normalizedId === normalizedSelectedType || normalizedName === normalizedSelectedType;
    });

    if (catalogMatch) {
      const normalizedCatalogId = this.normalizeSearchText(catalogMatch.id);
      const normalizedCatalogName = this.normalizeSearchText(catalogMatch.name);
      return (
        activityTypeKey === normalizedCatalogId ||
        activityTypeKey === normalizedCatalogName
      );
    }

    return activityTypeKey === normalizedSelectedType;
  }

  /** Evalua el filtro por valoracion minima. */
  private matchesRatingFilter(
    activity: ActivitySearchItem,
    ratingMin: number,
  ): boolean {
    if (!ratingMin || ratingMin <= 0) {
      return true;
    }

    return (activity.rating ?? 0) >= ratingMin;
  }

  /** Enriquece cada actividad con su ubicacion resuelta para busqueda. */
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
        return {
          normalizedTerm,
          geoLocation,
        };
      }),
    );
  }

  /** Comprueba si la actividad coincide con el filtro geoespacial. */
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
