import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../app/environment/environment';

/** Resultado geocodificado normalizado para consumir en UI y filtros. */
export interface GeocodedLocation {
  /** Dirección legible para mostrar en UI. */
  formattedAddress: string;
  /** Latitud central del resultado geocodificado. */
  latitude: number;
  /** Longitud central del resultado geocodificado. */
  longitude: number;
  /** Viewport recomendado por el proveedor para centrar mapa. */
  viewport?: {
    /** Esquina noreste del viewport. */
    northeast: { lat: number; lng: number };
    /** Esquina suroeste del viewport. */
    southwest: { lat: number; lng: number };
  };
}


@Injectable({ providedIn: 'root' })
/**
 * Servicio de utilidades de mapas/geocodificación.
 *
 * Implementa reverse geocoding con Google Maps API para convertir lat/lng
 * en una cadena legible. Si no hay API key o falla la consulta, devuelve
 * un fallback silencioso para no romper la UI.
 */
export class MapsService{
    /** Cliente HTTP usado para consultar el proveedor de geocodificación. */
    private http: HttpClient;

    /**
     * Crea el servicio de mapas y geocodificación.
     * @param http Cliente HTTP para consultas al proveedor.
     */
    constructor(http: HttpClient) {
      this.http = http;
    }

    /** Geocodifica un texto de ubicación en coordenadas y viewport. */
    geocodeLocation(query: string): Observable<GeocodedLocation | null> {
        const normalizedQuery = query.trim();
        const googleApiKey = environment.maps.apiKey?.trim();

        if (!normalizedQuery) {
          return of(null);
        }

        if (!googleApiKey) {
          return this.http
            .get<any[]>(this.buildNominatimGeocodeUrl(normalizedQuery))
            .pipe(
              map((response) => this.pickBestGeocodedLocationFromNominatim(response)),
              catchError((error) => {
                console.warn('[Maps] Nominatim forward geocoding failed:', error);
                return of(null);
              }),
            );
        }

        return this.http
          .get<any>(this.buildGoogleGeocodeUrl(normalizedQuery, googleApiKey))
          .pipe(
            map((response) => this.pickBestGeocodedLocation(response)),
            catchError((error) => {
              console.warn('[Maps] Google forward geocoding failed:', error);
              return this.http
                .get<any[]>(this.buildNominatimGeocodeUrl(normalizedQuery))
                .pipe(
                  map((fallback) => this.pickBestGeocodedLocationFromNominatim(fallback)),
                  catchError(() => of(null)),
                );
            }),
          );
      }

    /** Obtiene una ubicación legible desde latitude/longitude. */
    getAddress(lat: number, lon: number): Observable<string> {
        const normalizedLat = this.normalizeCoordinate(lat);
        const normalizedLon = this.normalizeCoordinate(lon);
        const googleApiKey = environment.maps.apiKey?.trim();

        if (googleApiKey) {
          return this.http
            .get<any>(this.buildGoogleReverseGeocodeUrl(normalizedLat, normalizedLon, googleApiKey))
            .pipe(
              map((response) => this.pickBestLocalityFromGoogle(response)),
              catchError((error) => {
                console.warn('[Maps] Google reverse geocoding failed:', error);
                return this.http
                  .get<any>(this.buildNominatimReverseGeocodeUrl(normalizedLat, normalizedLon))
                  .pipe(
                    map((fallback) => this.pickBestLocalityFromNominatim(fallback)),
                    catchError(() => of(this.fallbackLocation())),
                  );
              }),
            );
        }

        return this.http
          .get<any>(this.buildNominatimReverseGeocodeUrl(normalizedLat, normalizedLon))
          .pipe(
            map((response) => this.pickBestLocalityFromNominatim(response)),
            catchError((error) => {
              console.warn('[Maps] Nominatim reverse geocoding failed:', error);
              return of(this.fallbackLocation());
            }),
          );
      }

    /**
     * Construye URL de reverse geocoding de Google Maps API.
     */
    buildGoogleReverseGeocodeUrl(lat: number, lon: number, apiKey: string): string {
      return `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&language=es&key=${encodeURIComponent(apiKey)}`;
    }

    /** Construye URL de geocoding directo para una ubicación textual. */
    buildGoogleGeocodeUrl(query: string, apiKey: string): string {
      return `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&language=es&key=${encodeURIComponent(apiKey)}`;
    }

    /** Construye URL de reverse geocoding de Nominatim (OpenStreetMap). */
    buildNominatimReverseGeocodeUrl(lat: number, lon: number): string {
      return `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=es`;
    }

    /** Construye URL de geocoding directo de Nominatim (OpenStreetMap). */
    buildNominatimGeocodeUrl(query: string): string {
      return `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=1&addressdetails=1&accept-language=es`;
    }

    /**
     * Extrae una localidad legible desde respuestas geocoding no-Google.
     * Mantiene compatibilidad con proveedores alternativos usados previamente.
     */
    pickBestLocality(response: any): string {
      if (response?.status && response.status !== 'OK' && response.status !== 'SUCCESS') {
        return 'Ubicación desconocida';
      }

      return (
        response?.locality ||
        response?.city ||
        response?.principalSubdivision ||
        'Ubicación desconocida'
      );
    }

    /**
     * Selecciona una ubicación legible desde la respuesta de Google Geocoding.
     */
    pickBestLocalityFromGoogle(response: any): string {
      const result = response?.results?.[0];
      if (!result) {
        return 'Ubicación desconocida';
      }

      if (response?.status && response.status !== 'OK') {
        return 'Ubicación desconocida';
      }

      const components: Array<{ long_name?: string; types?: string[] }> =
        result.address_components || [];

      const findComponent = (type: string): string => {
        const component = components.find((item) => item?.types?.includes(type));
        return component?.long_name?.trim() || '';
      };

      const locality =
        findComponent('locality') ||
        findComponent('postal_town') ||
        findComponent('administrative_area_level_2');

      const province =
        findComponent('administrative_area_level_2') ||
        findComponent('administrative_area_level_1');

      if (locality && province && locality !== province) {
        return `${locality}, ${province}`;
      }

      if (locality) {
        return `${locality} capital`;
      }

      if (province) {
        return province;
      }

      return result.formatted_address || 'Ubicación desconocida';
    }

    /** Extrae una localidad legible desde respuesta reverse de Nominatim. */
    pickBestLocalityFromNominatim(response: any): string {
      const address = response?.address || {};
      const locality =
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        address.suburb ||
        '';
      const province = address.state || address.county || '';

      if (locality && province && locality !== province) {
        return `${locality}, ${province}`;
      }
      if (locality) {
        return locality;
      }
      if (province) {
        return province;
      }

      const displayName = typeof response?.display_name === 'string' ? response.display_name.trim() : '';
      return displayName || 'Ubicación desconocida';
    }

    /** Convierte una respuesta de geocoding directo a coordenadas + viewport. */
    pickBestGeocodedLocation(response: any): GeocodedLocation | null {
      const result = response?.results?.[0];
      if (!result || (response?.status && response.status !== 'OK')) {
        return null;
      }

      const lat = result?.geometry?.location?.lat;
      const lng = result?.geometry?.location?.lng;
      if (typeof lat !== 'number' || typeof lng !== 'number') {
        return null;
      }

      const viewport = result?.geometry?.viewport;
      const bounds = result?.geometry?.bounds;

      return {
        formattedAddress: result.formatted_address || '',
        latitude: lat,
        longitude: lng,
        viewport:
          viewport && viewport.northeast && viewport.southwest
            ? {
                northeast: {
                  lat: viewport.northeast.lat,
                  lng: viewport.northeast.lng,
                },
                southwest: {
                  lat: viewport.southwest.lat,
                  lng: viewport.southwest.lng,
                },
              }
            : bounds && bounds.northeast && bounds.southwest
              ? {
                  northeast: {
                    lat: bounds.northeast.lat,
                    lng: bounds.northeast.lng,
                  },
                  southwest: {
                    lat: bounds.southwest.lat,
                    lng: bounds.southwest.lng,
                  },
                }
              : undefined,
      };
    }

    /** Convierte respuesta de búsqueda Nominatim a GeocodedLocation. */
    pickBestGeocodedLocationFromNominatim(response: any[]): GeocodedLocation | null {
      const first = Array.isArray(response) ? response[0] : null;
      if (!first) {
        return null;
      }
      const lat = Number(first.lat);
      const lon = Number(first.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return null;
      }

      return {
        formattedAddress: (first.display_name || '').trim(),
        latitude: lat,
        longitude: lon,
      };
    }

    /** Redondea coordenadas para evitar consultas inválidas o demasiado precisas. */
    private normalizeCoordinate(value: number): number {
      return Math.round(value * 100000) / 100000;
    }

    /** Fallback silencioso para no romper la UI cuando la geocodificación falla. */
    private fallbackLocation(): string {
      return 'Ubicación no disponible';
    }
}
