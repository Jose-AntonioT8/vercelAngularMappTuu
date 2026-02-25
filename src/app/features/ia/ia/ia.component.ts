import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, finalize, of } from 'rxjs';
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
    this.answer = '';

    this.iaAssistantService
      .ask(this.question)
      .pipe(
        catchError((error: HttpErrorResponse | Error) => {
          if (error instanceof HttpErrorResponse) {
            switch (error.status) {
              case 404:
                this.errorMessage = `❌ 404: Modelo/endpoint no encontrado. Verifica NG_APP_IA_MODEL (ej: meta-llama/llama-3.1-8b-instruct:free) en vars. entorno.`;
                break;
              case 401:
                this.errorMessage = `❌ 401: API key inválida. Revisa tu NG_APP_IA_API_KEY en variables de entorno de Vercel/local.`;
                break;
              case 402:
                this.errorMessage = `❌ 402: El modelo seleccionado requiere créditos. Usa un modelo con sufijo :free o revisa tus fallbacks.`;
                break;
              case 429:
                this.errorMessage = `❌ 429: Límite de rate limit alcanzado. Espera un momento e intenta de nuevo.`;
                break;
              case 500:
                this.errorMessage = `❌ 500: Error del servidor OpenRouter. Intenta en unos momentos.`;
                break;
              default:
                this.errorMessage = `❌ Error HTTP ${error.status}: ${error.message}`;
            }
          } else {
            this.errorMessage = `❌ Error: ${error.message || 'No se pudo conectar con la IA.'}`;
          }
          return of('');
        }),
        finalize(() => {
          this.isLoading = false;
        }),
      )
      .subscribe({
        next: (response) => {
          if (response && response.trim()) {
            this.answer = response;
            this.errorMessage = '';
          }
        },
      });
  }
}
