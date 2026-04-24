import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { HeaderComponent } from '../../common/header/header.component';

/**
 * Pantalla de contacto y presentación de co-founders.
 */
@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  templateUrl: './contact.component.html',
})
export class ContactComponent {}
