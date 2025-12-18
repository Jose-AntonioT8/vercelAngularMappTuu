import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './footer.component.html',
  styles: []
})
export class FooterComponent {

  
  navItems = [
    { name: 'Home', route: '/landingPage', icon: 'home', iconURL: 'assets/icons/footer/home.svg' },
    { name: 'Maps', route: '/maps', icon: 'map', iconURL: 'assets/icons/footer/maps.svg' },
    { name: 'Profile', route: '/login', icon: 'user', iconURL: 'assets/icons/footer/user.svg' }
  ];

  
    
}
