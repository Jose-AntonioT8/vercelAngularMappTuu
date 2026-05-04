import { Component } from '@angular/core';
import{ Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { LanguageSelectorComponent } from '../../common/language-selector/language-selector.component';

  
/**
 * Dashboard de acciones rápidas (principalmente para administración/gestión).
 *
 * Provee accesos directos a creación y listados de actividades, tipos y planes.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterModule, CommonModule, TranslatePipe, LanguageSelectorComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  /** Servicio de autenticación para cierre de sesión. */
  private auth: AuthService;
  /** Router para navegación de acciones rápidas. */
  private route: Router;

  /**
   * @param auth Servicio de autenticación.
   * @param route Router para navegación.
   */
  constructor(
    auth: AuthService,
    route: Router
  ){
    this.auth = auth;
    this.route = route;
  }
 /** Cierra sesión y vuelve al landing. */
 logOut(): void {
     this.route.navigate(['/landingPage'])
    this.auth.logout()
  }

  /** Navega a creación de actividades. */
  createActivities(): void {
    this.route.navigate(['/activitiesCreation'])
  }

  /** Navega al listado de actividades. */
  viewAcctivities(): void {
    this.route.navigate(['/activitiesList'])
  }

  /** Navega a creación de tipos de actividad. */
  createActivitiesTypes(): void {
    this.route.navigate(['/activityTypesCreation'])
  }
  /** Navega al listado de tipos de actividad. */
  viewActivitiesTypes(): void {
    this.route.navigate(['/activityTypesList'])
  }

  /** Navega a creación de planes. */
  createPlans(): void {
    this.route.navigate(['/plansCreation'])
  }
  /** Navega al listado de planes. */
  viewPlans(): void {
    this.route.navigate(['/plansList'])
  }

  /** Navega al panel de moderación de reportes. */
  viewReportsModeration(): void {
    this.route.navigate(['/admin/reports'])
  }

  /** Navega al panel de moderación de actividades pendientes. */
  viewActivitiesModeration(): void {
    this.route.navigate(['/admin/activities/moderation']);
  }
}
