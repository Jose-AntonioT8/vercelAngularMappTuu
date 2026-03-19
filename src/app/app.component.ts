import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Componente raíz de la aplicación.
 *
 * Su responsabilidad es mínima: alojar el `RouterOutlet` para que el router
 * renderice las pantallas/feature modules (standalone) según la URL.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <router-outlet></router-outlet>
  `
})
export class AppComponent {
  /** Título de la app (usado principalmente como señal/ejemplo). */
  title = signal('mapTuu');
}
