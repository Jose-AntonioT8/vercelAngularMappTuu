import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map } from 'rxjs';
import { environment } from '../../../app/environment/environment';
@Injectable({ providedIn: 'root' })

/**
 * Servicio de utilidades de mapas/geocodificación.
 *
 * Actualmente implementa reverse geocoding para convertir lat/lng en una
 * cadena legible de ubicación usando BigDataCloud.
 */
export class MapsService{
    /**
     * Cliente HTTP usado para consultar el proveedor de geocodificación.
     *
     * Inicializa el servicio con el `HttpClient` de Angular.
     *
     * @param http HttpClient Angular
     */
    constructor(private http: HttpClient) {}
    
    /**
     * Obtiene una descripción de ubicación aproximada para unas coordenadas.
     *
     * Nota: usa BigDataCloud reverse-geocode-client y devuelve un fallback si no hay datos.
     *
     * @param lat Latitud
     * @param lon Longitud
     * @returns Observable que emite la mejor cadena de ubicación encontrada.
     */
    getAddress(lat: number, lon: number): Observable<string> {
        const normalizedLat = this.normalizeCoordinate(lat);
        const normalizedLon = this.normalizeCoordinate(lon);
        const googleApiKey = environment.maps.apiKey?.trim();

        if (googleApiKey) {
          return this.http
            .get<any>(this.buildGoogleReverseGeocodeUrl(normalizedLat, normalizedLon, googleApiKey))
            .pipe(
              map((response) => this.pickBestLocalityFromGoogle(response)),
              catchError(() =>
                this.http
                  .get<any>(this.buildReverseGeocodeUrl(normalizedLat, normalizedLon))
                  .pipe(
                    map((response) => this.pickBestLocality(response)),
                    catchError(() => [this.fallbackLocation()]),
                  ),
              ),
            );
        }

        return this.http
          .get<any>(this.buildReverseGeocodeUrl(normalizedLat, normalizedLon))
          .pipe(
            map((response) => this.pickBestLocality(response)),
            catchError(() => [this.fallbackLocation()]),
          );
      }

    /**
     * Construye URL de reverse geocoding de Google Maps API.
     */
    buildGoogleReverseGeocodeUrl(lat: number, lon: number, apiKey: string): string {
      return `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&language=es&key=${encodeURIComponent(apiKey)}`;
    }

    /**
     * Construye la URL del proveedor de reverse geocoding.
     *
     * @param lat Latitud
     * @param lon Longitud
     * @param localityLanguage Idioma preferido para la respuesta (por defecto `es`)
     */
    buildReverseGeocodeUrl(lat: number, lon: number, localityLanguage: string = 'es'): string {
      return `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=${encodeURIComponent(localityLanguage)}`;
    }

    /**
     * Selecciona el mejor campo de localidad disponible de la respuesta del proveedor.
     *
     * @param response Respuesta JSON de BigDataCloud
     * @returns Una cadena legible (fallback: "Ubicación desconocida")
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

    /** Redondea coordenadas para evitar consultas inválidas o demasiado precisas. */
    private normalizeCoordinate(value: number): number {
      return Math.round(value * 100000) / 100000;
    }

    /** Fallback silencioso para no romper la UI cuando la geocodificación falla. */
    private fallbackLocation(): string {
      return 'Ubicación no disponible';
    }
}
