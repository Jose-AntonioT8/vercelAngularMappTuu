import { Component } from '@angular/core';
import{ Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { LanguageSelectorComponent } from '../../common/language-selector/language-selector.component';


/**
 * Landing page / Home pública de la aplicación.
 *
 * Expone acciones de navegación (ir a actividades/planes/dashboard) y adapta
 * opciones según estado de autenticación y rol.
 */
@Component({
  selector: 'app-landing-page',
  standalone: true, 
  imports: [CommonModule, RouterModule, FormsModule, TranslatePipe, LanguageSelectorComponent],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss'
})

  

export class LandingPageComponent {
  /** Texto del buscador principal del landing. */
  landingSearchTerm = '';

  /** Servicio de autenticación para estado de sesión y rol. */
  private auth: AuthService;
  /** Router para navegación entre pantallas públicas/protegidas. */
  private route: Router;

  /**
   * @param auth Servicio de autenticación.
   * @param route Router para navegar desde acciones del landing.
   */
  constructor(
    auth: AuthService,
    route: Router
  ){
    this.auth = auth;
    this.route = route;
  }

  /** `true` si hay sesión activa. */
  isAuthenticated(): boolean {
    return this.auth.isAuthenticated();
  }
  /** `true` si el usuario actual tiene rol admin. */
  isadmin(): boolean {
    return this.auth.isAdmin();
  }

  /** Si está autenticado va a actividades; si no, redirige a login. */
  handleLoginActivities(): void {
    if (this.isAuthenticated()){
      this.redirectToActivities();
    }else{
      this.route.navigate(['/login']);
    }

  }

  /** Navega al listado de planes. */
  redirectoToPlans(): void {
        this.route.navigate(['/plansList'])

  }
  /** Navega al dashboard (acciones/admin). */
  readirectToDashboard(): void {
    this.route.navigate(['/dashboard'])
    //una vez que tengamos implementados los planes hay que poner la ruta a la lista
    //this.router.navigate(['/plans']);
  }
  /** Navega al listado de actividades. */
  redirectToActivities(): void {
    this.route.navigate(['/activitiesList'])

    //una vez que tengamos implementados las actividades hay que poner la ruta a la lista
    //this.router.navigate(['/activities']);
  }

  /** Cierra sesión y vuelve al landing. */
  logOut(): void {
     this.route.navigate(['/landingPage'])
    this.auth.logout()
  }

  /**
   * Ejecuta la busqueda global desde el landing.
   * - Si no hay sesion, redirige a login.
   * - Si hay sesion, navega a la nueva pagina protegida de resultados.
   */
  handleLandingSearch(): void {
    if (!this.isAuthenticated()) {
      this.route.navigate(['/login']);
      return;
    }

    const query = this.landingSearchTerm.trim();
    this.route.navigate(['/search'], {
      queryParams: query ? { q: query } : {},
    });
  }
}

