import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../app/environment/environment';
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
    constructor(private http: HttpClient) {}

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
                return of(this.fallbackLocation());
              }),
            );
        }

        return of(this.fallbackLocation());
      }

    /**
     * Construye URL de reverse geocoding de Google Maps API.
     */
    buildGoogleReverseGeocodeUrl(lat: number, lon: number, apiKey: string): string {
      return `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&language=es&key=${encodeURIComponent(apiKey)}`;
    }

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

    /** Redondea coordenadas para evitar consultas inválidas o demasiado precisas. */
    private normalizeCoordinate(value: number): number {
      return Math.round(value * 100000) / 100000;
    }

    /** Fallback silencioso para no romper la UI cuando la geocodificación falla. */
    private fallbackLocation(): string {
      return 'Ubicación no disponible';
    }
}
