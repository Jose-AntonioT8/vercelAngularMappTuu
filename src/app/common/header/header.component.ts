import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { LanguageSelectorComponent } from '../../common/language-selector/language-selector.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslatePipe, LanguageSelectorComponent],
  templateUrl: './header.component.html',
  styles: [] 
})
export class HeaderComponent implements OnInit, OnDestroy {
  isMobileMenuOpen = false;
  isOnMapView = false;
  private routeSub?: Subscription;

  constructor(private router: Router) {}

  ngOnInit() {
    this.checkRoute(this.router.url);
    this.routeSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.checkRoute(event.url);
    });
  }

  ngOnDestroy() {
    this.routeSub?.unsubscribe();
  }

  private checkRoute(url: string): void {
    this.isOnMapView = url === '/maps' || url.startsWith('/maps?');
  }

  get exploreRoute(): string {
    return this.isOnMapView ? '/activitiesList' : '/maps';
  }

  get exploreLabel(): string {
    return this.isOnMapView ? 'header.list' : 'header.explore';
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }
}
