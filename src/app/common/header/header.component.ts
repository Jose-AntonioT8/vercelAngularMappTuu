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
  /** `true` cuando la ruta actual está en `/maps` (para cambiar CTA). */
  isOnMapView = false;
  /** Subscription a eventos del router (se limpia en destroy). */
  private routeSub?: Subscription;

  /** Router para navegación y detección de ruta actual. */
  constructor(private router: Router) {}

  /** Suscripción a cambios de navegación para derivar `isOnMapView`. */
  /** Inicia el listener de navegación para sincronizar `isOnMapView`. */
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

  /** Deriva si estamos en vista mapa en base a la URL actual. */
  private checkRoute(url: string): void {
    this.isOnMapView = url === '/maps' || url.startsWith('/maps?');
  }

  /** Ruta dinámica para el CTA del header (explorar o listar). */
  get exploreRoute(): string {
    return this.isOnMapView ? '/activitiesList' : '/maps';
  }

  /** i18n key del label del CTA dinámico. */
  get exploreLabel(): string {
    return this.isOnMapView ? 'header.list' : 'header.explore';
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
