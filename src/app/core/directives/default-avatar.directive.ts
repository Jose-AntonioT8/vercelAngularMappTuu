import { Directive, ElementRef, Input, OnInit, HostListener } from '@angular/core';

/**
 * Directiva para fallback de avatar en `<img>`.
 *
 * Si la imagen no tiene `src` válido o falla al cargar, genera un SVG inline
 * (data URL) con una inicial.
 */
@Directive({
  selector: '[appDefaultAvatar]',
  standalone: true
})
export class DefaultAvatarDirective implements OnInit {
  /** Texto base para extraer la inicial (por ejemplo nombre o email). */
  @Input() appDefaultAvatar: string = '';
  /** Tamaño del avatar (px). */
  @Input() avatarSize: number = 100;
  /** Color de fondo del SVG. */
  @Input() avatarBgColor: string = '#5675AC';
  /** Color de texto (inicial) del SVG. */
  @Input() avatarTextColor: string = '#ffffff';

  constructor(private el: ElementRef<HTMLImageElement>) {}

  /** Aplica el avatar por defecto si no hay `src` válido. */
  ngOnInit(): void {
    const img = this.el.nativeElement;
    if (!img.src || img.src === window.location.href) {
      this.setDefaultAvatar();
    }
  }

  /** Handler del evento `error` del `<img>` para aplicar fallback. */
  @HostListener('error')
  onError(): void {
    this.setDefaultAvatar();
  }

  /** Establece el data URL generado como `src` del `<img>`. */
  private setDefaultAvatar(): void {
    const initial = this.getInitial();
    this.el.nativeElement.src = this.generateSvgAvatar(initial);
  }

  /** Obtiene la inicial a partir del texto de entrada (fallback: '?'). */
  private getInitial(): string {
    if (this.appDefaultAvatar) {
      return this.appDefaultAvatar.charAt(0).toUpperCase();
    }
    return '?';
  }

  /** Genera un SVG circular con la inicial y lo retorna como data URL base64. */
  private generateSvgAvatar(initial: string): string {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${this.avatarSize}" height="${this.avatarSize}" viewBox="0 0 100 100">
        <rect width="100" height="100" rx="50" fill="${this.avatarBgColor}"/>
        <text x="50" y="50" dy=".35em" text-anchor="middle" fill="${this.avatarTextColor}" font-family="Arial, sans-serif" font-size="45" font-weight="bold">
          ${initial}
        </text>
      </svg>
    `;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }
}
