import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Footer de navegación primaria (mobile-first).
 *
 * Renderiza accesos rápidos a secciones clave (home/mapa/perfil).
 */
@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './footer.component.html',
  styles: []
})
export class FooterComponent {

  /**
   * Items de navegación renderizados por el template.
   *
   * Nota: el `route` apunta a rutas del router Angular.
   */
  navItems = [
    { name: 'Home', route: '/landingPage', icon: 'home', iconURL: 'assets/icons/footer/home.svg' },
    { name: 'Maps', route: '/maps', icon: 'map', iconURL: 'assets/icons/footer/maps.svg' },
    { name: 'Profile', route: '/login', icon: 'user', iconURL: 'assets/icons/footer/user.svg' }
  ];

  
    
}
