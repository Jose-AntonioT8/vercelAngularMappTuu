import { Pipe, PipeTransform } from '@angular/core';
import { TranslationService } from '../services/translation.service';

/**
 * Pipe de traducción para templates.
 *
 * Es `pure: false` para reevaluar cuando cambia el idioma en runtime.
 * Uso: `{{ 'auth.login.title' | translate }}`.
 */
@Pipe({
  name: 'translate',
  pure: false,
  standalone: true
})
export class TranslatePipe implements PipeTransform {
  constructor(private translationService: TranslationService) {}

  /** Resuelve una clave de traducción con fallback opcional. */
  transform(key: string, defaultValue?: string): string {
    return this.translationService.get(key, defaultValue);
  }
}
