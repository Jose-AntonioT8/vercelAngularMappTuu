import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme.service';

/**
 * Componente raíz de la aplicación.
 *
 * Su responsabilidad es mínima: alojar el `RouterOutlet` para que el router
 * renderice las pantallas/feature modules (standalone) según la URL.
 *
 * Además, inicializa el servicio de tema para aplicar las preferencias
 * guardadas del usuario al cargar la aplicación.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <router-outlet></router-outlet>
  `,
})
export class AppComponent {
  /** Título de la app (usado principalmente como señal/ejemplo). */
  title = signal('mapTuu');

  constructor(private themeService: ThemeService) {
    // El servicio de tema se inyecta para que se inicialice
    // y aplique la preferencia guardada o la del sistema
  }
}
