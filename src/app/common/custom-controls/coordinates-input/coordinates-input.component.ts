import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

export interface Coordinates {
  latitude: number | null;
  longitude: number | null;
}

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
  @Input() label: string = 'Coordenadas';
  @Input() errorMessage: string = '';
  @Input() showMap: boolean = true;
  
  latitude: string = '';
  longitude: string = '';
  disabled: boolean = false;
  touched: boolean = false;

  onChange: any = () => {};
  onTouched: any = () => {};

  constructor(private sanitizer: DomSanitizer) {}

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

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onLatitudeChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.latitude = input.value;
    this.emitValue();
  }

  onLongitudeChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.longitude = input.value;
    this.emitValue();
  }

  onBlur(): void {
    this.touched = true;
    this.onTouched();
  }

  private emitValue(): void {
    const lat = this.latitude ? parseFloat(this.latitude) : null;
    const lng = this.longitude ? parseFloat(this.longitude) : null;
    
    this.onChange({
      latitude: lat,
      longitude: lng
    });
  }

  get mapUrl(): SafeResourceUrl | null {
    const lat = parseFloat(this.latitude);
    const lng = parseFloat(this.longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return null;
    }

    const url = `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  get isValidCoordinates(): boolean {
    const lat = parseFloat(this.latitude);
    const lng = parseFloat(this.longitude);
    return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }
}
