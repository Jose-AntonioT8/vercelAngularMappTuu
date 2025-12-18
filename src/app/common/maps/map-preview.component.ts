import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import * as L from 'leaflet';

@Component({
  selector: 'app-map-preview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div #mapContainer class="w-full h-full rounded-xl overflow-hidden cursor-crosshair"></div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    ::ng-deep .preview-marker {
      background: transparent !important;
      border: none !important;
      cursor: grab !important;
    }
    ::ng-deep .preview-marker:active {
      cursor: grabbing !important;
    }
  `]
})
export class MapPreviewComponent implements AfterViewInit, OnChanges {
  @Input() latitude: number | string = 0;
  @Input() longitude: number | string = 0;
  @Input() markerColor: string = '#5675AC';
  @Input() interactive: boolean = true;

  @Output() coordinatesChange = new EventEmitter<{ latitude: number; longitude: number }>();

  @ViewChild('mapContainer') mapContainer!: ElementRef;

  private map?: L.Map;
  private marker?: L.Marker;
  private isInternalUpdate = false;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => this.initMap(), 100);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['latitude'] || changes['longitude']) && this.map && !this.isInternalUpdate) {
      this.updateMarker();
    }
  }

  private initMap(): void {
    const lat = this.parseCoord(this.latitude);
    const lng = this.parseCoord(this.longitude);
    const validCoords = this.hasValidCoords();

    this.map = L.map(this.mapContainer.nativeElement, { 
      zoomControl: false,
      attributionControl: false
    }).setView(validCoords ? [lat, lng] : [40.416, -3.703], validCoords ? 15 : 5);

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}').addTo(this.map);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(this.map);

    if (validCoords) {
      this.addMarker(lat, lng);
    }

    if (this.interactive) {
      this.map.on('click', (e: L.LeafletMouseEvent) => {
        this.setMarkerPosition(e.latlng.lat, e.latlng.lng);
      });
    }
  }

  private updateMarker(): void {
    if (!this.map) return;

    const lat = this.parseCoord(this.latitude);
    const lng = this.parseCoord(this.longitude);

    if (this.hasValidCoords()) {
      if (this.marker) {
        this.marker.setLatLng([lat, lng]);
      } else {
        this.addMarker(lat, lng);
      }
      this.map.setView([lat, lng], 15, { animate: true });
    } else if (this.marker) {
      this.marker.remove();
      this.marker = undefined;
    }
  }

  private setMarkerPosition(lat: number, lng: number): void {
    this.isInternalUpdate = true;
    
    if (this.marker) {
      this.marker.setLatLng([lat, lng]);
    } else {
      this.addMarker(lat, lng);
    }

    this.coordinatesChange.emit({
      latitude: parseFloat(lat.toFixed(6)),
      longitude: parseFloat(lng.toFixed(6))
    });

    setTimeout(() => this.isInternalUpdate = false, 100);
  }

  private addMarker(lat: number, lng: number): void {
    const icon = this.createMarkerIcon();
    this.marker = L.marker([lat, lng], { 
      icon,
      draggable: this.interactive
    }).addTo(this.map!);

    if (this.interactive) {
      this.marker.on('dragend', () => {
        const pos = this.marker!.getLatLng();
        this.setMarkerPosition(pos.lat, pos.lng);
      });
    }
  }

  private createMarkerIcon(): L.DivIcon {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36">
        <path fill="${this.markerColor}" stroke="#fff" stroke-width="1.5" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
        <circle cx="12" cy="9" r="3" fill="#fff"/>
      </svg>
    `;
    return L.divIcon({
      html: svg,
      className: 'preview-marker',
      iconSize: [36, 36],
      iconAnchor: [18, 36]
    });
  }

  private parseCoord(value: number | string): number {
    return typeof value === 'string' ? parseFloat(value) : value;
  }

  private hasValidCoords(): boolean {
    const lat = this.parseCoord(this.latitude);
    const lng = this.parseCoord(this.longitude);
    return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
  }
}
