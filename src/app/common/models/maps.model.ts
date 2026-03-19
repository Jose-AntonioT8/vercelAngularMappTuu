/**
 * Datos mínimos para un marcador en mapas.
 *
 * Este modelo está pensado para capas/preview donde solo se necesitan coords
 * y algunos metadatos opcionales.
 */
export interface MapMarkerData {
  /** Latitud (Leaflet exige number). */
  latitude: number;
  /** Longitud (Leaflet exige number). */
  longitude: number;
  /** Título opcional del punto. */
  title?: string;
  /** Descripción opcional del punto. */
  description?: string;
  /** Enlace asociado (por ejemplo, a detalle). */
  link?: string;
}