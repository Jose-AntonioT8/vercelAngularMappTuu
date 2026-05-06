import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Activity } from '../../models/activity.model';
import { ActivityType } from '../../models/activityType.models';
import { MapsService } from '../../../core/services/maps.service';
import { Tilt3DDirective } from '../../../core/directives/tilt3d.directive';

/**
 * Card de actividad para listados.
 *
 * - Muestra informaci?n resumida (imagen, nombre, rating, tipo).
 * - Deriva color del tipo de actividad para UI.
 * - Resuelve una direcci?n aproximada a partir de lat/lng (si existen).
 */
@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule, Tilt3DDirective],
  templateUrl: './card.component.html',
  styles: []
})
export class CardComponent implements OnInit, OnChanges {
  /** Imagen fallback usada cuando la URL principal falla. */
  readonly fallbackImage = 'assets/images/placeholder.svg';

  /** Actividad a renderizar. */
  @Input() activity!: Activity;
  /** Cat?logo de tipos para resolver nombre/color del tipo asociado. */
  @Input() activityTypes: ActivityType[] = [];

  /** Color de UI derivado del tipo de actividad. */
  activityColor = '';
  /** Direcci?n/resumen de ubicaci?n derivada por reverse geocoding. */
  location?: string;
  /** Router para navegaci?n al detalle de actividad. */
  private router: Router;
  /** Servicio de mapas para resolver ubicaci?n legible. */
  private mapService: MapsService;

  /**
   * Crea la card de actividad con navegaci?n y geocodificaci?n.
   *
   * @param router Router para navegar al detalle de actividad.
   * @param mapService Servicio de mapas para resolver ubicacion legible.
   */
  constructor(
    router: Router,
    mapService: MapsService,
  ) {
    this.router = router;
    this.mapService = mapService;
  }

  /** Recalcula color cuando cambia `activity` o `activityTypes`. */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['activity'] || changes['activityTypes']) {
      this.updateActivityColor();
    }
  }

  /** Obtiene direcci?n si hay coordenadas disponibles. */
  ngOnInit(): void {
    const explicitLocation = this.getExplicitLocation();
    if (explicitLocation) {
      this.location = explicitLocation;
      return;
    }

    const source = this.activity as any;
    const latitude = this.pickCoordinate(source, ['latitude', 'lat']);
    const longitude = this.pickCoordinate(source, ['longitude', 'lng', 'lon']);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      this.location = 'Ubicaci?n no disponible';
      return;
    }

    this.mapService.getAddress(latitude, longitude).subscribe((address) => {
      const normalizedAddress = (address || '').trim().toLowerCase();
      const isUnknownAddress =
        !normalizedAddress ||
        normalizedAddress.includes('desconocida') ||
        normalizedAddress.includes('no disponible');

      const geocodedLabel = isUnknownAddress
        ? this.formatCoordinates(latitude, longitude)
        : address;

      // 1) Prioriza geocoding API y pinta primero ese resultado.
      this.location = geocodedLabel;
    });
  }

  /** Navega a la pantalla de detalle de la actividad. */
  redirectToDetail(): void {
    this.router.navigate(['/activityDetail', this.activity.id]);
  }

  /**
   * Deriva el color de la actividad basado en el tipo asociado.
   *
   * El c?digo tolera varias posibles claves (por evoluci?n de modelos):
   * `activityTypeId`, `IdTypeActivity`, `typeId`, etc.
   */
  private updateActivityColor(): void {
    if (!this.activity || !this.activityTypes || this.activityTypes.length === 0) {
      this.activityColor = '#ccc';
      return;
    }

    const key = (this.activity as any).activityTypeId ??
                (this.activity as any).IdTypeActivity ??
                (this.activity as any).activityType ??
                (this.activity as any).typeId ??
                (this.activity as any).type ??
                '';

    const keyStr = String(key).toLowerCase();

    const type = this.activityTypes.find(t => {
      const tid = String((t as any).id ?? (t as any).uid ?? '').toLowerCase();
      const tname = String((t as any).name ?? '').toLowerCase();
      return tid === keyStr || tname === keyStr;
    });

    const color = type?.color ?? '';

    if (color && !color.startsWith('#') && /^([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
      this.activityColor = '#' + color;
    } else {
      this.activityColor = color || '#ccc';
    }
  }

  /** Devuelve el estado de una estrella (full/half/empty) para un ?ndice 0..4. */
  getStarState(index: number): 'full' | 'half' | 'empty' {
    if (!this.activity) return 'empty';
    const rating = this.activity.rating;
    const starValue = index + 1;
    if (rating >= starValue) return 'full';
    else if (rating >= starValue - 0.5) return 'half';
    else return 'empty';
  }

  /** Helper para iterar 5 estrellas en template. */
  getStarsArray(): number[] {
    return [0, 1, 2, 3, 4];
  }

  /** Etiqueta legible de estado de moderación para mostrar en la tarjeta. */
  get moderationStatusLabel(): string {
    const status = (this.activity as any)?.moderationStatus;
    if (status === 'pending_review') return 'Pendiente de revisi?n';
    if (status === 'rejected') return 'Rechazada';
    return '';
  }

  /** Fallback visual cuando falla la carga de la miniatura. */
  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (!img.src.includes(this.fallbackImage)) {
      img.src = this.fallbackImage;
      return;
    }
    img.onerror = null;
  }

  /** Obtiene la mejor ubicación textual disponible en el modelo de actividad. */
  private getExplicitLocation(): string {
    const source = this.activity as any;
    const candidates = [
      source?.resolvedLocation,
      source?.location,
      source?.locationText,
      source?.address,
      source?.city,
      source?.region,
      source?.fullAddress,
      source?.formattedAddress,
    ];

    const value = candidates.find(
      (item) => typeof item === 'string' && item.trim().length > 0,
    );
    const normalizedValue = value ? String(value).trim() : '';
    const normalizedLower = normalizedValue.toLowerCase();
    const isUnknownLocation =
      normalizedLower.includes('desconocida') ||
      normalizedLower.includes('no disponible') ||
      normalizedLower === '...';

    return isUnknownLocation ? '' : normalizedValue;
  }

  /** Formatea lat/lng como string corto cuando no hay dirección geocodificada. */
  private formatCoordinates(latitude: number, longitude: number): string {
    return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  }

  /** Extrae una coordenada numérica buscando en varias claves candidatas. */
  private pickCoordinate(source: Record<string, unknown>, keys: string[]): number {
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
    return Number.NaN;
  }
}