import { Component } from '@angular/core';
import{ Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { LanguageSelectorComponent } from '../../common/language-selector/language-selector.component';


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


  isAuthenticated(): boolean {
    return this.auth.isAuthenticated();
  }
  isadmin(): boolean {
    return this.auth.isAdmin();
  }

  handleLoginActivities(){
    if (this.isAuthenticated()){
      this.redirectToActivities();
    }else{
      this.route.navigate(['/login']);
    }

  }

  redirectoToPlans(){
        this.route.navigate(['/plansList'])

  }
  readirectToDashboard(){
    this.route.navigate(['/dashboard'])
    //una vez que tengamos implementados los planes hay que poner la ruta a la lista
    //this.router.navigate(['/plans']);
  }
  redirectToActivities(){
    this.route.navigate(['/activitiesList'])

    //una vez que tengamos implementados las actividades hay que poner la ruta a la lista
    //this.router.navigate(['/activities']);
  }

  logOut(){
     this.route.navigate(['/landingPage'])
    this.auth.logout()
  }
}

