import { Component } from '@angular/core';
import{ Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { LanguageSelectorComponent } from '../../common/language-selector/language-selector.component';

  
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
 logOut(){
     this.route.navigate(['/landingPage'])
    this.auth.logout()
  }

  createActivities(){
    this.route.navigate(['/activitiesCreation'])
  }

  viewAcctivities(){
    this.route.navigate(['/activitiesList'])
  }

  createActivitiesTypes(){
    this.route.navigate(['/activityTypesCreation'])
  }
  viewActivitiesTypes(){
    this.route.navigate(['/activityTypesList'])
  }

  createPlans(){
    this.route.navigate(['/plansCreation'])
  }
  viewPlans(){
    this.route.navigate(['/plansList'])
  }
}
