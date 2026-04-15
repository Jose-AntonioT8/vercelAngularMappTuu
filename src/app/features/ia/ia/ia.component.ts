import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, finalize, of } from 'rxjs';
import { HeaderComponent } from '../../../common/header/header.component';
import { HighlightDirective } from '../../../core/directives/highlight.directive';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { IaAssistantService } from '../../../core/services/ia-assistant.service';

/**
 * Pantalla de asistente IA.
 *
 * Envía una pregunta al servicio `IaAssistantService` y muestra la respuesta.
 * Incluye un mapeo de errores HTTP comunes para dar feedback útil en UI.
 */
@Component({
  selector: 'app-ia',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HeaderComponent,
    TranslatePipe,
    HighlightDirective,
  ],
  templateUrl: './ia.component.html',
  styleUrl: './ia.component.scss',
})
export class IaComponent {
  private iaAssistantService = inject(IaAssistantService);

  /** Pregunta del usuario (input). */
  question = '';
  /** Respuesta renderizada en UI. */
  answer = '';
  /** Mensaje de error para UI. */
  errorMessage = '';
  /** Párrafos renderizados de la respuesta. */
  answerParagraphs: string[] = [];
  /** Elementos renderizados como lista para mayor legibilidad. */
  answerBullets: string[] = [];
  /** Flag para evitar envíos concurrentes. */
  isLoading = false;

  /** Envía la pregunta y gestiona estados de carga/errores. */
  sendQuestion(): void {
    if (!this.question.trim() || this.isLoading) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.answer = '';
    this.answerParagraphs = [];
    this.answerBullets = [];

    this.iaAssistantService
      .ask(this.question)
      .pipe(
        catchError((error: HttpErrorResponse | Error) => {
          if (error instanceof HttpErrorResponse) {
            switch (error.status) {
              case 404:
                this.errorMessage = `❌ 404: Modelo o endpoint no encontrado. Verifica NG_APP_IA_MODEL/IA_MODEL y NG_APP_IA_API_URL/IA_API_URL.`;
                break;
              case 401:
                this.errorMessage = `❌ 401: API key inválida. Revisa tu NG_APP_IA_API_KEY en variables de entorno de Vercel/local.`;
                break;
              case 402:
                this.errorMessage = `❌ 402: El proveedor IA requiere créditos o plan activo para ese modelo. Prueba otro modelo o revisa tu cuenta.`;
                break;
              case 400:
                this.errorMessage = `❌ 400: Solicitud inválida para el modelo actual (normalmente por límites de contexto o formato). Intenta una pregunta más corta.`;
                break;
              case 429:
                this.errorMessage = `❌ 429: Límite de rate limit alcanzado. Espera un momento e intenta de nuevo.`;
                break;
              case 500:
                this.errorMessage = `❌ 500: Error del servidor Groq. Intenta en unos momentos.`;
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
            this.applyAnswerFormatting(response);
            this.errorMessage = '';
          }
        },
      });
  }

  /** Convierte texto IA en párrafos y bullets para una lectura más clara. */
  private applyAnswerFormatting(rawAnswer: string): void {
    const lines = rawAnswer
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const bulletPattern = /^(?:[-*•]\s+|\d+\.\s+)/;
    const bullets = lines
      .filter((line) => bulletPattern.test(line))
      .map((line) => line.replace(bulletPattern, '').trim())
      .filter(Boolean);

    const paragraphs = lines.filter((line) => !bulletPattern.test(line));

    this.answerBullets = bullets;
    this.answerParagraphs = paragraphs;
  }
}
