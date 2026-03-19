import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Item seleccionable para el selector genérico.
 *
 * Nota: el control emite/recibe una lista de `name` (no de `id`) para mantener
 * el binding simple en UI. Si necesitas persistencia por ID, adapta el contrato.
 */
export interface SelectableItem {
  /** ID del elemento (opcionalmente usado por la pantalla). */
  id: string;
  /** Nombre visible del elemento (y clave de selección por defecto). */
  name: string;
}

/**
 * Control de formulario para seleccionar múltiples elementos.
 *
 * Implementa `ControlValueAccessor` y trabaja con una lista de strings (`name`).
 */
@Component({
  selector: 'app-activity-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './activity-selector.component.html',
  styleUrls: ['./activity-selector.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ActivitySelectorComponent),
      multi: true
    }
  ]
})
export class ActivitySelectorComponent implements ControlValueAccessor {
  /** Catálogo de elementos disponibles para seleccionar. */
  @Input() items: SelectableItem[] = [];
  /** Etiqueta del control. */
  @Input() label: string = 'Seleccionar elementos';
  /** Mensaje de error para UI. */
  @Input() errorMessage: string = '';
  
  /** Lista de nombres seleccionados (valor del form). */
  selectedNames: string[] = [];
  /** Estado disabled recibido desde el formulario. */
  disabled: boolean = false;
  /** Marca si el usuario ya tocó el control. */
  touched: boolean = false;

  /** Callback del formulario al cambiar el valor. */
  onChange: any = () => {};
  /** Callback del formulario al marcar como tocado. */
  onTouched: any = () => {};

  /** Sincroniza el valor externo hacia el control. */
  writeValue(value: string[]): void {
    this.selectedNames = value || [];
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

  /** Devuelve si un nombre está seleccionado. */
  isSelected(itemName: string): boolean {
    return this.selectedNames.includes(itemName);
  }

  /** Alterna la selección de un elemento (no-op si está deshabilitado). */
  toggleSelection(itemName: string): void {
    if (this.disabled) return;
    
    this.touched = true;
    
    if (this.selectedNames.includes(itemName)) {
      this.selectedNames = this.selectedNames.filter(name => name !== itemName);
    } else {
      this.selectedNames = [...this.selectedNames, itemName];
    }
    
    this.onChange(this.selectedNames);
    this.onTouched();
  }
}
