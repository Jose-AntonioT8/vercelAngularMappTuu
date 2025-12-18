import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SelectableItem {
  id: string;
  name: string;
}

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
  @Input() items: SelectableItem[] = [];
  @Input() label: string = 'Seleccionar elementos';
  @Input() errorMessage: string = '';
  
  selectedNames: string[] = [];
  disabled: boolean = false;
  touched: boolean = false;

  onChange: any = () => {};
  onTouched: any = () => {};

  writeValue(value: string[]): void {
    this.selectedNames = value || [];
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

  isSelected(itemName: string): boolean {
    return this.selectedNames.includes(itemName);
  }

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
