import { Pipe, PipeTransform } from '@angular/core';
import { TranslationService } from '../services/translation.service';

@Pipe({
  name: 'price',
  pure: false,
  standalone: true
})
export class PricePipe implements PipeTransform {
  constructor(private translationService: TranslationService) {}

  transform(value: number | string | null | undefined): string {
    // Convertir a número si es string
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    // Si es null, undefined, NaN, o 0 -> Gratis
    if (numValue === null || numValue === undefined || isNaN(numValue) || numValue === 0) {
      return this.translationService.get('activities.free', 'Gratis');
    }
    
    return `${numValue.toFixed(2)} €`;
  }
}
