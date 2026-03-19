import { Component } from '@angular/core';
import{ Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
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
  imports: [CommonModule, RouterModule, TranslatePipe, LanguageSelectorComponent],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss'
})

  

export class LandingPageComponent {
  constructor(
    private auth: AuthService,
    private route: Router
  ){
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
  handleLoginActivities(){
    if (this.isAuthenticated()){
      this.redirectToActivities();
    }else{
      this.route.navigate(['/login']);
    }

  }

  /** Navega al listado de planes. */
  redirectoToPlans(){
        this.route.navigate(['/plansList'])

  }
  /** Navega al dashboard (acciones/admin). */
  readirectToDashboard(){
    this.route.navigate(['/dashboard'])
    //una vez que tengamos implementados los planes hay que poner la ruta a la lista
    //this.router.navigate(['/plans']);
  }
  /** Navega al listado de actividades. */
  redirectToActivities(){
    this.route.navigate(['/activitiesList'])

    //una vez que tengamos implementados las actividades hay que poner la ruta a la lista
    //this.router.navigate(['/activities']);
  }

  /** Cierra sesión y vuelve al landing. */
  logOut(){
     this.route.navigate(['/landingPage'])
    this.auth.logout()
  }
}

