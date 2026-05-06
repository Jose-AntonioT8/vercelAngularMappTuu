import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { HeaderComponent } from '../../common/header/header.component';
import { AuthService } from '../../core/services/auth.service';

/**
 * Pantalla “Acerca de”.
 *
 * Presenta información general del proyecto (contenido principalmente estático)
 * y reutiliza el header + traducciones.
 */
@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe, HeaderComponent],
  templateUrl: './about.component.html'
})
export class AboutComponent {
  /** Servicio de autenticación para exponer estado de login en la vista. */
  private readonly authService = inject(AuthService);

  /** Indica si existe sesión activa para condicionar CTA/acciones en la vista. */
  get isLoggedIn(): boolean {
    return this.authService.isAuthenticated();
  }
}
