import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Servicio de traducciones (i18n) en runtime.
 *
 * - Carga diccionarios JSON desde `assets/i18n/<lang>.json`
 * - Mantiene el idioma actual en `localStorage` (`appLanguage`)
 * - Provee helpers `get/instant` para resolver claves tipo `auth.login.title`
 */
@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  /** Idioma actual como subject para subscripción reactiva. */
  private currentLanguageSubject: BehaviorSubject<string>;
  /** Observable público del idioma actual. */
  public currentLanguage$: Observable<string>;

  /** Diccionario de traducciones por idioma. */
  private translations: { [key: string]: any } = {};
  /** Idiomas soportados por la app. */
  private supportedLanguages = ['es', 'en', 'de'];

  constructor() {
    const savedLanguage = localStorage.getItem('appLanguage') || 'es';
    this.currentLanguageSubject = new BehaviorSubject<string>(savedLanguage);
    this.currentLanguage$ = this.currentLanguageSubject.asObservable();
    
    this.loadTranslations();
  }

  /** Carga asíncronamente los diccionarios de todos los idiomas soportados. */
  private async loadTranslations(): Promise<void> {
    for (const lang of this.supportedLanguages) {
      try {
        const response = await fetch(`/assets/i18n/${lang}.json`);
        this.translations[lang] = await response.json();
      } catch (error) {
        console.error(`Error loading translations for ${lang}:`, error);
      }
    }
  }

  /** Devuelve el idioma actual. */
  getCurrentLanguage(): string {
    return this.currentLanguageSubject.value;
  }

  /** Cambia el idioma si está soportado y lo persiste en `localStorage`. */
  setLanguage(language: string): void {
    if (this.supportedLanguages.includes(language)) {
      this.currentLanguageSubject.next(language);
      localStorage.setItem('appLanguage', language);
    }
  }

  /** Lista de idiomas soportados. */
  getSupportedLanguages(): string[] {
    return this.supportedLanguages;
  }

  /**
   * Resuelve una clave de traducción.
   * @param key Clave tipo `a.b.c`
   * @param defaultValue Valor fallback si no existe
   */
  get(key: string, defaultValue: string = ''): string {
    const lang = this.getCurrentLanguage();
    const keys = key.split('.');
    let value = this.translations[lang] || {};

    for (const k of keys) {
      value = value[k];
      if (value === undefined) {
        return defaultValue || key;
      }
    }

    return value || defaultValue || key;
  }

  /** Alias sincrónico de `get` (mismo comportamiento). */
  instant(key: string, defaultValue: string = ''): string {
    return this.get(key, defaultValue);
  }

  /** Devuelve el diccionario completo de un idioma (o el actual por defecto). */
  getTranslations(lang?: string): any {
    const language = lang || this.getCurrentLanguage();
    return this.translations[language] || {};
  }

  /** Alterna al siguiente idioma en `supportedLanguages`. */
  toggleLanguage(): void {
    const currentLang = this.getCurrentLanguage();
    const idx = this.supportedLanguages.indexOf(currentLang);
    const nextLang = this.supportedLanguages[(idx + 1) % this.supportedLanguages.length];
    this.setLanguage(nextLang);
  }
}
