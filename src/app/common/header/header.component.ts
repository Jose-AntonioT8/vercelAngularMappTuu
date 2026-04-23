import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { LanguageSelectorComponent } from '../../common/language-selector/language-selector.component';

/**
 * Header principal de la app.
 *
 * - Controla la apertura/cierre del menú móvil.
 * - Ajusta el botón “explorar/listar” según si el usuario está en vista mapa.
 * - Expone el selector de idioma.
 */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslatePipe, LanguageSelectorComponent],
  templateUrl: './header.component.html',
  styles: [] 
})
export class HeaderComponent implements OnInit, OnDestroy {
  /** Estado del menú móvil (hamburger). */
  isMobileMenuOpen = false;
  /** `true` cuando la ruta actual está en `/activitiesList` o `/plansList`. */
  isOnListPage = false;
  /** Subscription a eventos del router (se limpia en destroy). */
  private routeSub?: Subscription;

  /** Router para navegación y detección de ruta actual. */
  constructor(private router: Router) {}

  /** Inicia el listener de navegación para sincronizar `isOnListPage`. */
  ngOnInit() {
    this.checkRoute(this.router.url);
    this.routeSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.checkRoute(event.url);
    });
  }

  /** Limpia recursos del componente. */
  ngOnDestroy() {
    this.routeSub?.unsubscribe();
  }

  /** Deriva si estamos en página de lista en base a la URL actual. */
  private checkRoute(url: string): void {
    this.isOnListPage = url === '/activitiesList' || url.startsWith('/activitiesList?') ||
                        url === '/plansList' || url.startsWith('/plansList?');
  }

  /** Detecta si estamos específicamente en la lista de actividades. */
  private isOnActivitiesList(): boolean {
    const url = this.router.url;
    return url === '/activitiesList' || url.startsWith('/activitiesList?');
  }

  /** Ruta dinámica para el botón de toggle entre lista de actividades y planes. */
  get toggleListRoute(): string {
    return this.isOnActivitiesList() ? '/plansList' : '/activitiesList';
  }

  /** i18n key del label del botón de toggle. */
  get toggleListLabel(): string {
    return this.isOnActivitiesList() ? 'header.listPlans' : 'header.listActivities';
  }

  /** Alterna el menú móvil. */
  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  /** Cierra el menú móvil (por ejemplo al navegar). */
  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }
}
