import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  inject,
  OnDestroy,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as L from 'leaflet';
import { LanguageSelectorComponent } from '../../../common/language-selector/language-selector.component';
import { ReviewModalComponent } from '../../../common/modals/review-modal/review-modal.component';
import { ReviewsListModalComponent } from '../../../common/modals/reviews-list-modal/reviews-list-modal'; // Ajusta ruta
import { Activity, Review } from '../../../common/models/activity.model';
import { OptionsComponent } from '../../../common/options/options/options.component';
import { PricePipe } from '../../../core/pipes/price.pipe';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { ActivityService } from '../../../core/services/activity.service';
import { AuthService } from '../../../core/services/auth.service';
import { mapsService } from '../../../core/services/maps.service';

@Component({
  selector: 'app-activity-detail',
  standalone: true,
  imports: [
    CommonModule,
    OptionsComponent,
    TranslatePipe,
    PricePipe,
    LanguageSelectorComponent,
    ReviewModalComponent,
    ReviewsListModalComponent,
  ],
  templateUrl: './activity-detail.component.html',
  styleUrl: './activity-detail.component.scss',
})
export class ActivityDetailComponent implements OnDestroy, AfterViewInit {
  isReviewsListModalOpen = false;

  activity?: Activity;
  location?: string;
  activityDescription?: string;
  private map?: L.Map;
  private marker?: L.Marker;
  mapInitialized = false;
  isReviewModalOpen = false;
  userReview: Review | null = null;

  private activityService = inject(ActivityService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private mapService = inject(mapsService);
  private cdr = inject(ChangeDetectorRef);
  public authService = inject(AuthService);

  ngOnInit() {
    const idUrl = this.route.snapshot.paramMap.get('id');
    this.activityService.getActivityId(idUrl!).subscribe((data) => {
      this.activity = data;
      this.activityDescription = (data as any).description;

      console.log('🎯 Actividad cargada:', {
        id: data.id,
        name: data.name,
        rating: data.rating,
        reviews: (data as any).reviews,
      });

      if (this.activity) {
        // Buscar si el usuario actual tiene una reseña para esta actividad
        this.loadUserReview();

        this.mapService
          .getAddress(
            parseFloat(this.activity.latitude),
            parseFloat(this.activity.longitude)
          )
          .subscribe((address) => {
            this.location = address;
          });

        // Inicializar el mapa después de que la actividad esté cargada
        setTimeout(() => {
          this.initMap();
        }, 300);
      }
    });
  }
  openReviewsListModal() {
    this.isReviewsListModalOpen = true;
  }

  closeReviewsListModal() {
    this.isReviewsListModalOpen = false;
  }
  /**
   * Carga la reseña del usuario actual para esta actividad
   */
  private loadUserReview(): void {
    const user = this.authService.currentUser;
    if (!user || !this.activity) {
      console.log(
        '❌ No se puede cargar reseña - Usuario o actividad no disponible'
      );
      return;
    }

    // Buscar en las reseñas de la actividad si existe una del usuario actual
    const reviews = this.activity.reviews || [];
    console.log(
      '🔍 Buscando reseña del usuario',
      user.uid,
      'en',
      reviews.length,
      'reseñas'
    );
    console.log('📋 Reviews array completo:', JSON.stringify(reviews, null, 2));

    const userReview = reviews.find(
      (review: Review) => review.userId === user.uid
    );

    if (userReview) {
      this.userReview = {
        id: userReview.id,
        rating: userReview.rating || 0,
        comment: userReview.comment || '',
        userId: userReview.userId,
      };
      console.log('✅ Reseña del usuario encontrada:', this.userReview);
    } else {
      this.userReview = null;
      console.log('ℹ️ El usuario no tiene reseña para esta actividad');
      console.log('👤 userId buscado:', user.uid);
    }
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
        scrollWheelZoom: true,
      });

      // Agregar capa de tiles de OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(this.map);

      // Crear icono rojo personalizado para el marcador
      const redIcon = L.icon({
        iconUrl:
          'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
        shadowUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      // Agregar marcador en la ubicación
      this.marker = L.marker([lat, lon], { icon: redIcon }).addTo(this.map);

      // Agregar popup al marcador con información
      const popupContent = `<b>${this.activity?.name || 'Actividad'}</b><br>${
        this.location || 'Ubicación'
      }`;
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

  getFormattedDate(firebaseTimestamp: any): string {
    // Convierte el Timestamp de Firebase a un objeto Date de JavaScript.
    // Esto puede causar una pérdida de precisión a milisegundos.
    const date = firebaseTimestamp.toDate();

    // Obtiene el día, mes y año.
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Los meses son base 0 en JavaScript
    const year = date.getFullYear();

    // Retorna la fecha formateada.
    return `${day}/${month}/${year}`;
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
    window.open(
      `https://www.google.com/maps?q=${this.activity.latitude},${this.activity.longitude}`,
      '_blank'
    );
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

  openReviewModal() {
    this.isReviewModalOpen = true;
  }

  closeReviewModal() {
    this.isReviewModalOpen = false;
  }

  handleReviewSubmit(review: Review) {
    if (!this.activity) return;

    try {
      const user = this.authService.currentUser;
      if (!user) throw new Error('No autenticado');

      user.getIdToken().then((token) => {
        const isUpdate = !!review.id; // Si tiene id, es una actualización

        const ratingData = {
          rating: review.rating,
          comment: review.comment,
          userId: user.uid,
          id: review.id,
          isUpdate: isUpdate,
          previousRating: isUpdate ? this.userReview?.rating : undefined,
        };

        console.log('📤 Enviando reseña:', {
          isUpdate,
          newRating: review.rating,
          previousRating: this.userReview?.rating,
          userId: user.uid,
          activityId: this.activity!.id,
        });

        this.activityService
          .rateActivity(this.activity!.id, ratingData, token)
          .subscribe({
            next: (res) => {
              console.log('✅ Reseña guardada con éxito:', res);

              // Actualizar la actividad completa con los datos del backend
              if (res && res.activity) {
                // El backend devuelve el objeto activity completo dentro de res.activity
                this.activity = {
                  ...this.activity!,
                  rating: res.activity.rating,
                  numRatings: res.activity.numRatings,
                  reviews: res.activity.reviews || [],
                };

                console.log(
                  '🔄 Actividad actualizada con reviews:',
                  this.activity.reviews
                );

                // Recargar la reseña del usuario desde el array actualizado
                this.loadUserReview();
              }

              // Forzar detección de cambios
              this.cdr.detectChanges();
            },
            error: (err) => {
              console.error('❌ Error al guardar la reseña:', err);
            },
          });
      });
    } catch (err: any) {
      console.error('Error de autenticación:', err);
    }
  }
}
