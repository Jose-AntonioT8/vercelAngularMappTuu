import { Directive, ElementRef, Input, OnInit, HostListener } from '@angular/core';

@Directive({
  selector: '[appDefaultAvatar]',
  standalone: true
})
export class DefaultAvatarDirective implements OnInit {
  @Input() appDefaultAvatar: string = '';
  @Input() avatarSize: number = 100;
  @Input() avatarBgColor: string = '#5675AC';
  @Input() avatarTextColor: string = '#ffffff';

  constructor(private el: ElementRef<HTMLImageElement>) {}

  ngOnInit(): void {
    const img = this.el.nativeElement;
    if (!img.src || img.src === window.location.href) {
      this.setDefaultAvatar();
    }
  }

  @HostListener('error')
  onError(): void {
    this.setDefaultAvatar();
  }

  private setDefaultAvatar(): void {
    const initial = this.getInitial();
    this.el.nativeElement.src = this.generateSvgAvatar(initial);
  }

  private getInitial(): string {
    if (this.appDefaultAvatar) {
      return this.appDefaultAvatar.charAt(0).toUpperCase();
    }
    return '?';
  }

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
