import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { HeaderComponent } from '../../../common/header/header.component';
import { IaAssistantService } from '../services/ia-assistant.service';

@Component({
  selector: 'app-ia',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './ia.component.html',
  styleUrl: './ia.component.scss',
})
export class IaComponent {
  private iaAssistantService = inject(IaAssistantService);

  question = '';
  answer = '';
  errorMessage = '';
  isLoading = false;

  sendQuestion(): void {
    if (!this.question.trim() || this.isLoading) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.iaAssistantService
      .ask(this.question)
      .pipe(
        finalize(() => {
          this.isLoading = false;
        }),
      )
      .subscribe({
        next: (response) => {
          this.answer = response;
        },
        error: () => {
          this.errorMessage =
            'No se pudo consultar la IA en este momento. Revisa configuración y conexión.';
        },
      });
  }
}
