import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Control de subida de imágenes compatible con Angular Forms.
 *
 * Valida tipo (imagen) y tamaño máximo (5MB) antes de propagar el `File`.
 * También mantiene un preview local usando `FileReader`.
 */
@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-upload.component.html',
  styleUrls: ['./image-upload.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ImageUploadComponent),
      multi: true
    }
  ]
})
export class ImageUploadComponent implements ControlValueAccessor {
  /** Etiqueta del control (UI). */
  @Input() label: string = 'Imagen';
  /** URL de preview remota (por ejemplo, imagen ya guardada). */
  @Input() previewUrl: string = '';
  /** Mensaje de error a renderizar en la UI (opcional). */
  @Input() errorMessage: string = '';
  
  /** Archivo seleccionado (si existe). */
  selectedFile: File | null = null;
  /** Preview generado en cliente como data URL. */
  imagePreview: string | null = null;
  /** Estado disabled recibido desde el formulario. */
  disabled: boolean = false;
  /** Marca si el usuario ya interactuó con el control. */
  touched: boolean = false;

  /** Callback del formulario al cambiar el valor. */
  onChange: any = () => {};
  /** Callback del formulario al marcar como tocado. */
  onTouched: any = () => {};

  /** Escribe el valor desde el formulario al control. */
  writeValue(file: File | null): void {
    this.selectedFile = file;
    if (file) {
      this.loadPreview(file);
    }
  }

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

  /**
   * Handler de selección de archivo.
   *
   * Solo acepta `image/*` y un tamaño máximo de 5MB.
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      if (!file.type.startsWith('image/')) {
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB
        return;
      }
      
      this.selectedFile = file;
      this.touched = true;
      this.loadPreview(file);
      this.onChange(file);
      this.onTouched();
    }
  }

  /** Genera y guarda un preview base64 del archivo. */
  private loadPreview(file: File): void {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.imagePreview = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  /**
   * Preview a mostrar en UI.
   *
   * Prioridad: preview local → previewUrl → placeholder.
   */
  get currentPreview(): string {
    return this.imagePreview || this.previewUrl || 'https://via.placeholder.com/400x300?text=Sin+Imagen';
  }
}
