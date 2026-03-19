import { Activity } from './activity.model';

/**
 * Modelo extendido de `Activity` para pantallas de detalle.
 *
 * Incluye campos adicionales que normalmente no están presentes en listados
 * compactos (descripción, precio, horarios, etc.).
 */
export interface ActivityDetail extends Activity {
  /** Descripción larga/expandida de la actividad. */
  description: string;
  /** Precio (si aplica). */
  price: number;
  /** Horarios de apertura por día. */
  openingHours: { day: string; hours: string }[];
  /** Email de contacto (si aplica). */
  contactEmail: string;
  /**
   * Datos completos para el mapa (estructura variable según proveedor).
   * Se mantiene como `any` porque puede venir de APIs externas.
   */
  fullMapData: any;
  /** Lista de puntos destacados (bullet points) para UI. */
  highlights: string[];
}