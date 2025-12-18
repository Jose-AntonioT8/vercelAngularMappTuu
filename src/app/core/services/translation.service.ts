import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private currentLanguageSubject: BehaviorSubject<string>;
  public currentLanguage$: Observable<string>;

  private translations: { [key: string]: any } = {};
  private supportedLanguages = ['es', 'en'];

  constructor() {
    const savedLanguage = localStorage.getItem('appLanguage') || 'es';
    this.currentLanguageSubject = new BehaviorSubject<string>(savedLanguage);
    this.currentLanguage$ = this.currentLanguageSubject.asObservable();
    
    this.loadTranslations();
  }

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

  getCurrentLanguage(): string {
    return this.currentLanguageSubject.value;
  }

  setLanguage(language: string): void {
    if (this.supportedLanguages.includes(language)) {
      this.currentLanguageSubject.next(language);
      localStorage.setItem('appLanguage', language);
    }
  }

  getSupportedLanguages(): string[] {
    return this.supportedLanguages;
  }

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

  instant(key: string, defaultValue: string = ''): string {
    return this.get(key, defaultValue);
  }

  getTranslations(lang?: string): any {
    const language = lang || this.getCurrentLanguage();
    return this.translations[language] || {};
  }

  toggleLanguage(): void {
    const currentLang = this.getCurrentLanguage();
    const nextLang = currentLang === 'es' ? 'en' : 'es';
    this.setLanguage(nextLang);
  }
}
