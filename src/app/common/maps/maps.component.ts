import { Component, AfterViewInit, Input, OnChanges, ViewChild, ElementRef, SimpleChanges, Inject, PLATFORM_ID, NgZone } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {mapsService} from '../../core/services/maps.service'
import * as L from 'leaflet';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { PricePipe } from '../../core/pipes/price.pipe';

export interface MapMarkerData {
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
  rating?: number;
  link?: string;
  image?: string;
  color?: string;
  price?: number;
}

@Component({
  selector: 'app-activity-map',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, PricePipe],
  templateUrl: './maps.component.html',
  styles: [`
    :host { 
      display: block; 
      height: 100%;
      width: 100%; 
    }
    ::ng-deep .custom-marker {
      background: transparent !important;
      border: none !important;
    }
    ::ng-deep .custom-marker svg {
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
      transition: transform 0.2s ease;
    }
    ::ng-deep .custom-marker:hover svg {
      transform: scale(1.2);
    }
  `]
})

export class MapComponent implements AfterViewInit, OnChanges {

  @Input() points: MapMarkerData[] = [];
  @Input() center: [number, number] = [40.416, -3.703];
  @Input() zoom: number = 6;

  location?: string;

  @ViewChild('mapContainer') mapContainer!: ElementRef;

  // Variable para controlar qué tarjeta se muestra
  selectedPoint: MapMarkerData | null = null;

  private map: L.Map | undefined;
  private markersLayer = new L.LayerGroup();

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private zone: NgZone,
    private servimapa: mapsService,
  ) {}


  
  

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initMap();
      this.updateMarkers();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['points'] && this.map) {
      this.updateMarkers();
    }
  }

  // Método para cerrar la tarjeta manualmente
  closeCard() {
    this.selectedPoint = null;
  }

  private initMap(): void {
    this.map = L.map(this.mapContainer.nativeElement, { zoomControl: false }).setView(this.center, this.zoom);

    // Mover el control de zoom arriba a la derecha para que no estorbe a la tarjeta
    L.control.zoom({ position: 'topright' }).addTo(this.map);

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri'
    }).addTo(this.map);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(this.map);

    this.markersLayer.addTo(this.map);
    this.fixLeafletIcons();

    this.map.on('click', () => {
      this.zone.run(() => {
        this.selectedPoint = null;
      });
    });
  }

  private updateMarkers(): void {
    if (!this.map) return;
    
    this.markersLayer.clearLayers();

    if (!this.points || this.points.length === 0) return;

    const latLngs: L.LatLngExpression[] = [];

    this.points.forEach(point => {
      if (!isNaN(point.latitude) && !isNaN(point.longitude)) {
        
        const customIcon = this.createColoredMarker(point.color || '#5675AC');
        const marker = L.marker([point.latitude, point.longitude], { icon: customIcon });
        

        marker.on('click', (e) => {
            // Leaflet ejecuta esto fuera de la zona de Angular,
            // por eso usamos this.zone.run para actualizar la UI inmediatamente
            console.log('Datos del punto clickado:', point);
            this.zone.run(() => {
                this.selectedPoint = point;
                
                
            });
            if (this.selectedPoint) {
              this.servimapa.getAddress(
                this.selectedPoint.latitude, 
                this.selectedPoint.longitude
              ).subscribe(address => {
                this.location = address;
              });
            }
        });

        this.markersLayer.addLayer(marker);
        latLngs.push([point.latitude, point.longitude]);
      }
    });

    if (latLngs.length > 0) {
      this.map.fitBounds(L.latLngBounds(latLngs), { padding: [50, 50] });
    }
  }

  private fixLeafletIcons(): void {
    const iconDefault = this.createColoredMarker('#5675AC');
    L.Marker.prototype.options.icon = iconDefault;
  }

  private createColoredMarker(color: string): L.DivIcon {
    const svgIcon = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36">
        <path fill="${color}" stroke="#fff" stroke-width="1.5" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
        <circle cx="12" cy="9" r="3" fill="#fff"/>
      </svg>
    `;
    
    return L.divIcon({
      html: svgIcon,
      className: 'custom-marker',
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -36]
    });
  }
  ngOnInit() {
    
      
      
    }
  
}