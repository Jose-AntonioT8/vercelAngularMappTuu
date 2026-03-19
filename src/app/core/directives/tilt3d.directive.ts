import { Directive, ElementRef, HostListener, Input, OnInit, OnDestroy, Renderer2 } from '@angular/core';

/**
 * Directiva de efecto “tilt 3D” al pasar el ratón.
 *
 * Aplica transforms de rotación/escala en función de la posición del mouse y,
 * opcionalmente, un overlay de “glare” para dar profundidad.
 *
 * Diseñada para usarse en cards (por ejemplo `app-card`).
 */
@Directive({
  selector: '[appTilt3D]',
  standalone: true
})
export class Tilt3DDirective implements OnInit, OnDestroy {
  /** Rotación máxima en eje X (grados). */
  @Input() tiltMaxX: number = 15;
  /** Rotación máxima en eje Y (grados). */
  @Input() tiltMaxY: number = 15;
  /** Escala aplicada durante el hover. */
  @Input() tiltScale: number = 1.02;
  /** Duración de transición (ms). */
  @Input() tiltSpeed: number = 400;
  /** Si `true`, añade capa de brillo (glare). */
  @Input() glareEnabled: boolean = true;
  /** Opacidad máxima del glare. */
  @Input() glareMaxOpacity: number = 0.3;

  private glareElement?: HTMLElement;
  private wrapper?: HTMLElement;

  constructor(
    private el: ElementRef<HTMLElement>,
    private renderer: Renderer2
  ) {}

  /** Inicializa wrapper/estilos y (opcionalmente) el glare. */
  ngOnInit() {
    this.wrapElement();
    this.setupStyles();
    if (this.glareEnabled) {
      this.createGlare();
    }
  }

  /** Limpia el glare si fue creado. */
  ngOnDestroy() {
    if (this.glareElement) {
      this.glareElement.remove();
    }
  }

  /** Configura estilos base necesarios para el efecto (perspective/clip). */
  private wrapElement() {
    const element = this.el.nativeElement;
    const computedStyle = window.getComputedStyle(element);
    const borderRadius = computedStyle.borderRadius || '0px';
    
    // Crear wrapper con perspective
    this.wrapper = this.renderer.createElement('div');
    this.renderer.setStyle(this.wrapper, 'perspective', '1000px');
    this.renderer.setStyle(this.wrapper, 'display', 'contents');
    
    // Aplicar estilos al elemento para mantener bordes redondeados
    element.style.isolation = 'isolate';
    element.style.transform = 'translateZ(0)';
    element.style.borderRadius = borderRadius;
    
    // Hack para forzar el clip de bordes redondeados en 3D
    element.style.maskImage = 'radial-gradient(white, black)';
    element.style.webkitMaskImage = '-webkit-radial-gradient(white, black)';
  }

  /** Aplica estilos de transición/optimizaciones para animación. */
  private setupStyles() {
    const element = this.el.nativeElement;
    element.style.transformStyle = 'flat';
    element.style.transition = `transform ${this.tiltSpeed}ms cubic-bezier(0.03, 0.98, 0.52, 0.99)`;
    element.style.willChange = 'transform';
  }

  /** Crea y añade la capa de brillo (glare) si está habilitada. */
  private createGlare() {
    const element = this.el.nativeElement;
    const computedStyle = window.getComputedStyle(element);
    const borderRadius = computedStyle.borderRadius || '0px';
    
    element.style.position = 'relative';
    element.style.overflow = 'hidden';

    this.glareElement = document.createElement('div');
    this.glareElement.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      background: linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%);
      opacity: 0;
      transition: opacity ${this.tiltSpeed}ms ease-out;
      z-index: 100;
      border-radius: ${borderRadius};
    `;
    element.appendChild(this.glareElement);
  }

  /** Ajusta transición al entrar con el mouse. */
  @HostListener('mouseenter')
  onMouseEnter() {
    const element = this.el.nativeElement;
    element.style.transition = `transform ${this.tiltSpeed}ms cubic-bezier(0.03, 0.98, 0.52, 0.99)`;
  }

  /** Calcula rotación/escala según posición del mouse y actualiza glare. */
  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    const element = this.el.nativeElement;
    const rect = element.getBoundingClientRect();

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const mouseX = event.clientX - centerX;
    const mouseY = event.clientY - centerY;

    const percentX = mouseX / (rect.width / 2);
    const percentY = mouseY / (rect.height / 2);

    const rotateX = -percentY * this.tiltMaxX;
    const rotateY = percentX * this.tiltMaxY;

    element.style.transition = 'transform 100ms linear';
    element.style.transform = `
      perspective(1000px)
      rotateX(${rotateX}deg)
      rotateY(${rotateY}deg)
      scale(${this.tiltScale})
    `;

    if (this.glareElement) {
      const glareOpacity = (Math.abs(percentX) + Math.abs(percentY)) / 2 * this.glareMaxOpacity;
      const glareAngle = Math.atan2(mouseY, mouseX) * (180 / Math.PI) + 135;
      
      this.glareElement.style.opacity = glareOpacity.toString();
      this.glareElement.style.background = `
        linear-gradient(${glareAngle}deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0) 100%)
      `;
    }
  }

  /** Resetea transform y oculta glare al salir con el mouse. */
  @HostListener('mouseleave')
  onMouseLeave() {
    const element = this.el.nativeElement;
    element.style.transition = `transform ${this.tiltSpeed}ms cubic-bezier(0.03, 0.98, 0.52, 0.99)`;
    element.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)';

    if (this.glareElement) {
      this.glareElement.style.opacity = '0';
    }
  }
}
