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
  constructor(
    private auth: AuthService,
    private route: Router
  ){
  }
 /** Cierra sesión y vuelve al landing. */
 logOut(){
     this.route.navigate(['/landingPage'])
    this.auth.logout()
  }

  /** Navega a creación de actividades. */
  createActivities(){
    this.route.navigate(['/activitiesCreation'])
  }

  /** Navega al listado de actividades. */
  viewAcctivities(){
    this.route.navigate(['/activitiesList'])
  }

  /** Navega a creación de tipos de actividad. */
  createActivitiesTypes(){
    this.route.navigate(['/activityTypesCreation'])
  }
  /** Navega al listado de tipos de actividad. */
  viewActivitiesTypes(){
    this.route.navigate(['/activityTypesList'])
  }

  /** Navega a creación de planes. */
  createPlans(){
    this.route.navigate(['/plansCreation'])
  }
  /** Navega al listado de planes. */
  viewPlans(){
    this.route.navigate(['/plansList'])
  }
}
