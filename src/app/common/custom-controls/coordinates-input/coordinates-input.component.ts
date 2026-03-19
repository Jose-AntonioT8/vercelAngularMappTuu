import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

/**
 * Valor de coordenadas para el control de formulario.
 *
 * `null` representa “sin valor” (campo vacío).
 */
export interface Coordinates {
  /** Latitud en grados ([-90, 90]) o `null` si no hay valor. */
  latitude: number | null;
  /** Longitud en grados ([-180, 180]) o `null` si no hay valor. */
  longitude: number | null;
}

/**
 * Control personalizado de coordenadas (lat/lng) compatible con Reactive Forms.
 *
 * - Expone inputs para latitud/longitud como strings (UX) pero emite números.
 * - Puede mostrar un mapa embebido (Google Maps) cuando las coordenadas son válidas.
 *
 * Nota de seguridad:
 * - Se usa `bypassSecurityTrustResourceUrl` únicamente para una URL construida
 *   a partir de números (lat/lng). Evitar pasar texto arbitrario del usuario.
 */
@Component({
  selector: 'app-coordinates-input',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './coordinates-input.component.html',
  styleUrls: ['./coordinates-input.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CoordinatesInputComponent),
      multi: true
    }
  ]
})
export class CoordinatesInputComponent implements ControlValueAccessor {
  /** Etiqueta del campo. */
  @Input() label: string = 'Coordenadas';
  /** Mensaje de error a mostrar en UI. */
  @Input() errorMessage: string = '';
  /** Si `true`, muestra un iframe de mapa cuando el valor es válido. */
  @Input() showMap: boolean = true;
  
  /** Latitud introducida (string para permitir campos vacíos). */
  latitude: string = '';
  /** Longitud introducida (string para permitir campos vacíos). */
  longitude: string = '';
  /** Estado disabled recibido desde el formulario. */
  disabled: boolean = false;
  /** Marca si el usuario ya tocó el control. */
  touched: boolean = false;

  /** Callback del formulario al cambiar el valor. */
  onChange: any = () => {};
  /** Callback del formulario al marcar como tocado. */
  onTouched: any = () => {};

  constructor(private sanitizer: DomSanitizer) {}

  /** Sincroniza el valor externo (form) hacia el control. */
  writeValue(value: Coordinates): void {
    if (value) {
      this.latitude = value.latitude !== null ? String(value.latitude) : '';
      this.longitude = value.longitude !== null ? String(value.longitude) : '';
    } else {
      this.latitude = '';
      this.longitude = '';
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  /** Registra el callback de "tocado" del formulario. */
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  /** Habilita/deshabilita el control desde el form. */
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  /** Handler de cambio en el input de latitud. */
  onLatitudeChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.latitude = input.value;
    this.emitValue();
  }

  /** Handler de cambio en el input de longitud. */
  onLongitudeChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.longitude = input.value;
    this.emitValue();
  }

  /** Marca el control como “tocado” (touched). */
  onBlur(): void {
    this.touched = true;
    this.onTouched();
  }

  /** Construye el valor `Coordinates` y lo propaga al formulario. */
  private emitValue(): void {
    const lat = this.latitude ? parseFloat(this.latitude) : null;
    const lng = this.longitude ? parseFloat(this.longitude) : null;
    
    this.onChange({
      latitude: lat,
      longitude: lng
    });
  }

  /**
   * URL (sanitizada) de Google Maps para embebido.
   *
   * Devuelve `null` si lat/lng no son números.
   */
  get mapUrl(): SafeResourceUrl | null {
    const lat = parseFloat(this.latitude);
    const lng = parseFloat(this.longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return null;
    }

    const url = `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  /** Valida rango numérico de las coordenadas. */
  get isValidCoordinates(): boolean {
    const lat = parseFloat(this.latitude);
    const lng = parseFloat(this.longitude);
    return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }
}
