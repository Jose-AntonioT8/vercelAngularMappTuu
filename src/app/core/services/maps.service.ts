import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
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
        const url = this.buildReverseGeocodeUrl(lat, lon);
        return this.http.get<any>(url).pipe(
          map((response) => this.pickBestLocality(response))
        );
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
      return (
        response?.locality ||
        response?.city ||
        response?.principalSubdivision ||
        'Ubicación desconocida'
      );
    }
}
