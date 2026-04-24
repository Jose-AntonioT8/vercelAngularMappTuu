import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { HeaderComponent } from '../../common/header/header.component';
import { TranslatePipe } from '../../core/pipes/translate.pipe';

/**
 * Pantalla de contacto y presentación de co-founders.
 */
@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TranslatePipe],
  templateUrl: './contact.component.html',
})
export class ContactComponent {}
