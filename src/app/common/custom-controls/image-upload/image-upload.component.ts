import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

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
  @Input() label: string = 'Imagen';
  @Input() previewUrl: string = '';
  @Input() errorMessage: string = '';
  
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  disabled: boolean = false;
  touched: boolean = false;

  onChange: any = () => {};
  onTouched: any = () => {};

  writeValue(file: File | null): void {
    this.selectedFile = file;
    if (file) {
      this.loadPreview(file);
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

  private loadPreview(file: File): void {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.imagePreview = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  get currentPreview(): string {
    return this.imagePreview || this.previewUrl || 'https://via.placeholder.com/400x300?text=Sin+Imagen';
  }
}
