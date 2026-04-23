import { Injectable, signal } from '@angular/core';

/**
 * Servicio para gestionar el tema (claro/oscuro) de la aplicación.
 *
 * Responsabilidades:
 * - Mantener el estado actual del tema
 * - Detectar preferencias del sistema
 * - Aplicar el tema al DOM
 * - Persistir la preferencia en localStorage
 */
@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  /** Signal del tema actual: 'light' o 'dark' */
  private currentTheme = signal<'light' | 'dark'>('light');

  /** Observable público del tema actual */
  currentTheme$ = this.currentTheme.asReadonly();

  constructor() {
    this.initializeTheme();
  }

  /**
   * Inicializa el tema al cargar el servicio.
   *
   * Prioridad:
   * 1. Preferencia guardada en localStorage
   * 2. Preferencia del sistema
   * 3. Por defecto: 'light'
   */
  private initializeTheme(): void {
    const savedTheme = this.getSavedTheme();

    if (savedTheme) {
      this.setTheme(savedTheme);
    } else {
      // Detectar preferencia del sistema
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;
      this.setTheme(prefersDark ? 'dark' : 'light');
    }
  }

  /**
   * Obtiene el tema guardado en localStorage.
   *
   * @returns 'light' | 'dark' | null
   */
  private getSavedTheme(): 'light' | 'dark' | null {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    return null;
  }

  /**
   * Establece el tema y lo aplica al DOM.
   *
   * @param theme - 'light' o 'dark'
   */
  setTheme(theme: 'light' | 'dark'): void {
    this.currentTheme.set(theme);
    this.applyTheme(theme);
    localStorage.setItem('theme', theme);
  }

  /**
   * Cambia entre temas.
   * Si está en claro, cambia a oscuro y viceversa.
   */
  toggleTheme(): void {
    const newTheme = this.currentTheme() === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  /**
   * Obtiene el tema actual.
   *
   * @returns 'light' o 'dark'
   */
  getTheme(): 'light' | 'dark' {
    return this.currentTheme();
  }

  /**
   * Aplica el tema al elemento HTML.
   * Tailwind CSS observa la clase 'dark' en el HTML.
   *
   * @param theme - Tema a aplicar
   */
  private applyTheme(theme: 'light' | 'dark'): void {
    const html = document.documentElement;

    if (theme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }
}
