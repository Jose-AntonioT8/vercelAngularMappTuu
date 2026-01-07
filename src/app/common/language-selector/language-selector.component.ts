import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService } from '../../core/services/translation.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-language-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative language-selector-container">
      <button
        (click)="toggleDropdown()"
        class="flex items-center gap-2 px-3 py-2 rounded-full shadow-lg hover:opacity-80 transition-opacity bg-white text-gray-900 font-medium"
        [attr.aria-label]="'Current language: ' + currentLanguage"
        aria-haspopup="true"
        [attr.aria-expanded]="isDropdownOpen"
      >
        <span class="flag" [textContent]="getLanguageFlag()"></span>
        <span class="text-sm hidden sm:inline">{{ getLanguageLabel() }}</span>
        <svg class="w-4 h-4 transition-transform" [class.rotate-180]="isDropdownOpen" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
        </svg>
      </button>

      <!-- Dropdown -->
      <div
        *ngIf="isDropdownOpen"
        class="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg z-50 min-w-[150px]"
        (click)="$event.stopPropagation()"
      >
        <button
          *ngFor="let lang of languages"
          (click)="changeLanguage(lang)"
          [class.bg-blue-100]="currentLanguage === lang"
          [class.text-blue-900]="currentLanguage === lang"
          class="w-full px-4 py-2 text-left text-gray-900 hover:bg-gray-50 transition-colors text-sm font-medium first:rounded-t-lg last:rounded-b-lg"
        >
          <span class="flag" [textContent]="getLanguageFlagByCode(lang)"></span>
          {{ getLanguageLabelByCode(lang) }}
        </button>
      </div>
    </div>

    <!-- Backdrop for closing dropdown -->
    <div
      *ngIf="isDropdownOpen"
      class="fixed inset-0 z-40"
      (click)="closeDropdown()"
    ></div>
  `,
  styles: [`
    .language-selector-container {
      position: relative;
    }

    .flag {
      font-size: 1.2em;
      line-height: 1;
    }
  `]
})
export class LanguageSelectorComponent implements OnInit, OnDestroy {
  currentLanguage: string = 'es';
  languages: string[] = [];
  isDropdownOpen: boolean = false;
  private destroy$ = new Subject<void>();

  constructor(private translationService: TranslationService) {}

  ngOnInit(): void {
    this.currentLanguage = this.translationService.getCurrentLanguage();
    this.languages = this.translationService.getSupportedLanguages();

    this.translationService.currentLanguage$
      .pipe(takeUntil(this.destroy$))
      .subscribe(lang => {
        this.currentLanguage = lang;
        this.isDropdownOpen = false;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  changeLanguage(lang: string): void {
    this.translationService.setLanguage(lang);
    this.closeDropdown();
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  closeDropdown(): void {
    this.isDropdownOpen = false;
  }

  getLanguageFlag(): string {
    return this.getLanguageFlagByCode(this.currentLanguage);
  }

  getLanguageFlagByCode(lang: string): string {
    const flags: { [key: string]: string } = {
      'es': '🇪🇸',
      'en': '🇬🇧'
    };
    return flags[lang] || '🌐';
  }

  getLanguageLabel(): string {
    return this.getLanguageLabelByCode(this.currentLanguage);
  }

  getLanguageLabelByCode(lang: string): string {
    const labels: { [key: string]: string } = {
      'es': 'Español',
      'en': 'English'
    };
    return labels[lang] || lang.toUpperCase();
  }
}
