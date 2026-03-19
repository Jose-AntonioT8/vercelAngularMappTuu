import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Input reutilizable compatible con Angular Forms (ControlValueAccessor).
 *
 * Expone propiedades para etiqueta/placeholder/tipo y se integra con
 * formularios reactivos o template-driven mediante `NG_VALUE_ACCESSOR`.
 */
@Component({
  selector: 'app-custom-input',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './custom-input.component.html',
  styleUrls: ['./custom-input.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomInputComponent),
      multi: true
    }
  ]
})
export class CustomInputComponent implements ControlValueAccessor {
  /** Etiqueta del campo (UI). */
  @Input() label: string = '';
  /** Placeholder del input (UI). */
  @Input() placeholder: string = '';
  /** Tipo del input HTML. */
  @Input() type: string = 'text';
  /** Mensaje de error a renderizar en la UI (opcional). */
  @Input() errorMessage: string = '';
  
  /** Valor actual serializado como string. */
  value: string = '';
  /** Estado disabled recibido desde el formulario. */
  disabled: boolean = false;
  /** Marca si el usuario ya interactuó con el control. */
  touched: boolean = false;

  /** Callback del formulario al cambiar el valor. */
  onChange: any = () => {};
  /** Callback del formulario al marcar como tocado. */
  onTouched: any = () => {};

  /** Escribe el valor desde el formulario al control. */
  writeValue(value: any): void {
    this.value = value || '';
  }

  /** Registra el callback de cambios del formulario. */
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  /** Registra el callback de "tocado" del formulario. */
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  /** Actualiza el estado disabled desde el formulario. */
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  /** Handler del evento `input` para propagar cambios al formulario. */
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.value = input.value;
    this.onChange(this.value);
  }

  /** Handler del blur para marcar como tocado. */
  onBlur(): void {
    this.touched = true;
    this.onTouched();
  }
}
