import {
  Directive,
  ElementRef,
  HostListener,
  Input,
  OnInit,
  Renderer2,
  PLATFORM_ID,
  Inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Directiva para resaltar elementos al pasar el ratón por encima.
 * Cambia el color de fondo dinámicamente.
 */
@Directive({
  selector: '[appHighlight]',
  standalone: true,
})
export class HighlightDirective implements OnInit {
  /** Color efectivo usado al aplicar el resaltado. */
  private _appHighlight: string = 'yellow';

  /** Color de resaltado al entrar el cursor. Por defecto es amarillo. */
  @Input() set appHighlight(color: string) {
    if (color) this._appHighlight = color;
  }

  /** Devuelve el color de resaltado actualmente configurado. */
  get appHighlight(): string {
    return this._appHighlight;
  }

  /** Color de fondo por defecto cuando no hay resaltado. */
  @Input() highlightDefault: string = '';

  /** Color original del elemento antes de aplicar highlight. */
  private originalBackground: string = '';
  /** Referencia al elemento host donde se aplica la directiva. */
  private el: ElementRef;
  /** Renderer de Angular para actualizar estilos de forma segura. */
  private renderer: Renderer2;
  /** Identificador de plataforma para evitar acceso DOM en SSR. */
  private platformId: Object;

  /**
   * Crea la directiva de resaltado para el elemento host.
   *
   * @param el Referencia al elemento.
   * @param renderer Utilidad para manipular el DOM de forma segura.
   * @param platformId Identificador de plataforma.
   */
  constructor(
    el: ElementRef,
    renderer: Renderer2,
    @Inject(PLATFORM_ID) platformId: Object,
  ) {
    this.el = el;
    this.renderer = renderer;
    this.platformId = platformId;
  }

  /**
   * Captura el color de fondo original al inicializar el componente.
   */
  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.originalBackground = this.highlightDefault || '';
      return;
    }
    const computedStyle = window.getComputedStyle(this.el.nativeElement);
    this.originalBackground =
      this.highlightDefault || computedStyle.backgroundColor;
  }

  /** Aplica el resaltado al entrar el ratón. */
  @HostListener('mouseenter') onMouseEnter(): void {
    this.renderer.setStyle(
      this.el.nativeElement,
      'background-color',
      this.appHighlight,
    );
  }

  /** Restaura el color original al salir el ratón. */
  @HostListener('mouseleave') onMouseLeave(): void {
    this.renderer.setStyle(
      this.el.nativeElement,
      'background-color',
      this.originalBackground,
    );
  }
}
