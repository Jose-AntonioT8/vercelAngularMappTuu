import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { HeaderComponent } from '../../common/header/header.component';

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
export class AboutComponent {}
