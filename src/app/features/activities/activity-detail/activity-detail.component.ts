import { Component, inject, OnDestroy, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { Activity } from '../../../common/models/activity.model';
import { CommonModule } from '@angular/common';
import { ActivityService } from '../../../core/services/activity.service';
import { ActivatedRoute, Router } from '@angular/router';
import { mapsService } from '../../../core/services/maps.service';
import { OptionsComponent } from '../../../common/options/options/options.component';
import * as L from 'leaflet';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { PricePipe } from '../../../core/pipes/price.pipe';
import { LanguageSelectorComponent } from '../../../common/language-selector/language-selector.component';


@Component({
  selector: 'app-activity-detail',
  standalone: true,
  imports: [CommonModule, OptionsComponent, TranslatePipe, PricePipe, LanguageSelectorComponent],
  templateUrl: './activity-detail.component.html',
  styleUrl: './activity-detail.component.scss'
})
export class ActivityDetailComponent implements OnDestroy, AfterViewInit {
  activity?: Activity;
  location?: string;
  activityDescription?: string;
  private map?: L.Map;
  private marker?: L.Marker;
  mapInitialized = false;

  private activityService = inject(ActivityService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private mapService = inject(mapsService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    const idUrl = this.route.snapshot.paramMap.get('id');
    this.activityService.getActivityId(idUrl!).subscribe(data => {
      this.activity = data;
      this.activityDescription = (data as any).description;
      
      if (this.activity) {
        this.mapService.getAddress(
          parseFloat(this.activity.latitude), 
          parseFloat(this.activity.longitude)
        ).subscribe(address => {
          this.location = address;
        });
        
        // Inicializar el mapa después de que la actividad esté cargada
        setTimeout(() => {
          this.initMap();
        }, 300);
      }
    });
    
  }

  ngAfterViewInit() {
    // El mapa se inicializa después de que activity esté cargado en ngOnInit
  }

  ngOnDestroy() {
    // Limpiar el mapa cuando se destruye el componente
    if (this.map) {
      this.map.remove();
      this.map = undefined;
    }
  }

  /**
   * Inicializa el mapa de Leaflet con las coordenadas de la actividad.
   * Crea un mapa interactivo con un marcador rojo en la ubicación.
   */
  private initMap(): void {
    if (!this.activity || this.mapInitialized) return;
    
    const lat = parseFloat(this.activity.latitude);
    const lon = parseFloat(this.activity.longitude);
    
    // Validar coordenadas
    if (isNaN(lat) || isNaN(lon)) {
      console.warn('Coordenadas inválidas para el mapa');
      return;
    }
    
    // Esperar a que el div del mapa exista en el DOM
    setTimeout(() => {
      const mapElement = document.getElementById('activity-map');
      if (!mapElement) {
        console.warn('Elemento del mapa no encontrado');
        return;
      }
      
      // Crear el mapa de Leaflet
      this.map = L.map('activity-map', {
        center: [lat, lon],
        zoom: 15,
        zoomControl: true,
        dragging: true,
        touchZoom: true,
        doubleClickZoom: true,
        scrollWheelZoom: true
      });
      
      // Agregar capa de tiles de OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(this.map);
      
      // Crear icono rojo personalizado para el marcador
      const redIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
      
      // Agregar marcador en la ubicación
      this.marker = L.marker([lat, lon], { icon: redIcon }).addTo(this.map);
      
      // Agregar popup al marcador con información
      const popupContent = `<b>${this.activity?.name || 'Actividad'}</b><br>${this.location || 'Ubicación'}`;
      this.marker.bindPopup(popupContent).openPopup();
      
      // Hacer el mapa clickeable para abrir Google Maps
      this.map.on('click', () => {
        window.open(`https://www.google.com/maps?q=${lat},${lon}`, '_blank');
      });
      
      // También hacer clickeable el marcador
      this.marker.on('click', () => {
        window.open(`https://www.google.com/maps?q=${lat},${lon}`, '_blank');
      });
      
      this.mapInitialized = true;
      this.cdr.detectChanges();
      
      // Ajustar el tamaño del mapa después de cargar
      setTimeout(() => {
        this.map?.invalidateSize();
      }, 100);
    }, 200);
  }

  goBack() {
    this.router.navigate(['/activitiesList']);
  }

  getFormattedDate(): string {
    if (!this.activity) return '';
    
    const createdAt = (this.activity as any).createdAt;
    
    // Si no hay fecha, usar la fecha actual
    if (!createdAt) {
      return new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    
    // Intentar parsear la fecha
    let date: Date;
    
    // Si es un número (timestamp)
    if (typeof createdAt === 'number') {
      date = new Date(createdAt);
    } 
    // Si es un string
    else if (typeof createdAt === 'string') {
      date = new Date(createdAt);
    } 
    // Si ya es un objeto Date
    else if (createdAt instanceof Date) {
      date = createdAt;
    } 
    else {
      // Si no se puede parsear, usar fecha actual
      return new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    
    // Verificar si la fecha es válida
    if (isNaN(date.getTime())) {
      return new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }


  /**
   * Verifica si hay coordenadas válidas para mostrar el mapa.
   * 
   * @returns true si hay coordenadas válidas, false en caso contrario
   */
  hasValidCoordinates(): boolean {
    if (!this.activity) return false;
    const lat = parseFloat(this.activity.latitude);
    const lon = parseFloat(this.activity.longitude);
    return !isNaN(lat) && !isNaN(lon);
  }

  openGoogleMaps() {
    if (!this.activity) return;
    window.open(`https://www.google.com/maps?q=${this.activity.latitude},${this.activity.longitude}`, '_blank');
  }

  /**
   * Obtiene el estado de cada estrella según la puntuación.
   * 
   * @param index - Índice de la estrella (0-4, correspondiente a estrellas 1-5)
   * @returns 'full' si la estrella está completamente llena, 'half' si está a la mitad, 'empty' si está vacía
   */
  getStarState(index: number): 'full' | 'half' | 'empty' {
    if (!this.activity) return 'empty';
    
    const rating = this.activity.rating;
    const starValue = index + 1; // 1, 2, 3, 4, 5
    
    // Si la puntuación es mayor o igual al valor de la estrella, está llena
    if (rating >= starValue) {
      return 'full';
    } 
    // Si la puntuación es mayor o igual a (valor - 0.5), está a la mitad
    else if (rating >= starValue - 0.5) {
      return 'half';
    } 
    // Si no, está vacía
    else {
      return 'empty';
    }
  }

  /**
   * Crea un array con los índices de las 5 estrellas.
   * 
   * @returns Array [0, 1, 2, 3, 4] para iterar sobre las 5 estrellas
   */
  getStarsArray(): number[] {
    return [0, 1, 2, 3, 4];
  }

  get activityPrice(): number | null {
    return (this.activity as any)?.price ?? null;
  }
}
