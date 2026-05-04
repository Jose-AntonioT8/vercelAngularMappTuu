import { CommonModule, Location } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  inject,
  OnDestroy,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as L from 'leaflet';
import { Subscription } from 'rxjs';
import { LanguageSelectorComponent } from '../../../common/language-selector/language-selector.component';
import { ReviewModalComponent } from '../../../common/modals/review-modal/review-modal.component';
import { ReviewsListModalComponent } from '../../../common/modals/reviews-list-modal/reviews-list-modal'; // Ajusta ruta
import { Activity, Review } from '../../../common/models/activity.model';
import { OptionsComponent } from '../../../common/options/options/options.component';
import { PricePipe } from '../../../core/pipes/price.pipe';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { ActivityService } from '../../../core/services/activity.service';
import { AuthService } from '../../../core/services/auth.service';
import { MapsService } from '../../../core/services/maps.service';
import { UserService } from '../../../core/services/user.service';
/**
 * Detalle de actividad.
 *
 * - Carga la actividad por id de ruta.
 * - Resuelve la dirección humana mediante `mapsService`.
 * - Renderiza un mapa Leaflet con marcador y atajos a Google Maps.
 * - Permite guardar la actividad en el perfil del usuario.
 * - Permite crear/editar reseñas y listar reseñas existentes.
 */
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
  readonly fallbackImage = 'assets/images/placeholder.svg';
  constructor(private userService: UserService, private auth: AuthService) {}
  /** Subscripciones activas del componente. */
  private readonly subscriptions = new Subscription();
  /** Todas las actividades disponibles para calcular recomendaciones. */
  private allActivities: Activity[] = [];
  /** Limite de recomendaciones por seccion. */
  private readonly maxRecommendations = 4;
  /** Radio maximo para sugerencias cercanas (km). */
  private readonly nearbyRadiusKm = 30;

  /** Controla el modal con la lista de reseñas. */
  isReviewsListModalOpen = false;
  /** Indica si la actividad está guardada por el usuario actual. */
  isActivitySaved = false;
  /** Actividad cargada desde API. */
  activity?: Activity;
  /** Dirección humana resuelta desde coordenadas. */
  location?: string;
  /** Descripción derivada (por compatibilidad). */
  activityDescription?: string;
  /** Instancia Leaflet del mapa (se crea al cargar la actividad). */
  private map?: L.Map;
  /** Marcador Leaflet de la ubicación de la actividad. */
  private marker?: L.Marker;
  /** Evita reinicializar el mapa. */
  mapInitialized = false;
  /** Controla el modal de reseña (crear/editar). */
  isReviewModalOpen = false;
  /** Reseña del usuario actual (si existe). */
  userReview: Review | null = null;
  /** Actividades del mismo tipo para descubrir alternativas. */
  similarActivities: Activity[] = [];
  /** Actividades dentro del radio cercano a la actual. */
  nearbyActivities: Activity[] = [];

  /** Servicio de actividades para lecturas y rating. */
  private activityService = inject(ActivityService);
  /** Ruta activa para leer el `id` de la actividad. */
  private route = inject(ActivatedRoute);
  /** Router para navegación (volver). */
  private router = inject(Router);
  /** Servicio Location para volver en historial del navegador. */
  private browserLocation = inject(Location);
  /** Servicio de mapas para reverse geocoding. */
  private mapService = inject(MapsService);
  /** ChangeDetector para refrescar UI tras callbacks externos. */
  private cdr = inject(ChangeDetectorRef);
  /** Servicio de auth expuesto al template. */
  public authService = inject(AuthService);

  /** Carga actividad, dirección, reseña del usuario y estado de guardado. */
  ngOnInit() {
    this.subscriptions.add(
      this.route.paramMap.subscribe((params) => {
        const idUrl = params.get('id');
        if (!idUrl) {
          return;
        }
        this.loadActivityDetail(idUrl);
      })
    );

    this.subscriptions.add(
      this.activityService.getActivities().subscribe((activities) => {
        this.allActivities = (activities || []) as Activity[];
        this.updateRecommendations();
      })
    );
  }

  /** Carga el detalle de la actividad actual y sincroniza elementos dependientes. */
  private loadActivityDetail(idUrl: string): void {
    this.resetDetailState();

    this.subscriptions.add(this.activityService.getActivityId(idUrl).subscribe((data) => {
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
        this.checkIfActivitySaved();
        this.updateRecommendations();

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
    }));
  }

  /** Reinicia estado dependiente al cambiar de actividad en la misma vista. */
  private resetDetailState(): void {
    this.location = undefined;
    this.userReview = null;
    this.isActivitySaved = false;
    this.similarActivities = [];
    this.nearbyActivities = [];

    if (this.map) {
      this.map.remove();
      this.map = undefined;
      this.marker = undefined;
      this.mapInitialized = false;
    }
  }

  /** Verifica en el perfil del usuario si la actividad ya está guardada. */
  private async checkIfActivitySaved(): Promise<void> {
    const user = this.authService.currentUser;
    if (!user || !this.activity) return;
    console.log(user.uid);
    try {
      const activityId = this.activity.id;
      this.userService.getUserId(user.uid).subscribe({
        next: (userData) => {
          this.isActivitySaved =
            userData.savedActivities?.includes(activityId) ?? false;
        },
        error: (err) => {
          console.error(
            'Error al verificar si la actividad está guardada:',
            err
          );
          this.isActivitySaved = false;
        },
      });
    } catch (error) {
      console.error('Error al obtener el token:', error);
      this.isActivitySaved = false;
    }
  }

  /** Abre el modal con la lista de reseñas. */
  openReviewsListModal() {
    this.isReviewsListModalOpen = true;
  }

  /** Cierra el modal con la lista de reseñas. */
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

  /** Hook de vista: el mapa se inicializa tras cargar actividad. */
  ngAfterViewInit() {
    // El mapa se inicializa después de que activity esté cargado en ngOnInit
  }

  /** Limpia recursos (mapa Leaflet) al destruir el componente. */
  ngOnDestroy() {
    this.subscriptions.unsubscribe();

    // Limpiar el mapa cuando se destruye el componente
    if (this.map) {
      this.map.remove();
      this.map = undefined;
    }
  }

  /** Navega al detalle de la actividad seleccionada desde recomendaciones. */
  goToActivityDetail(activityId: string): void {
    if (!activityId || activityId === this.activity?.id) {
      return;
    }

    this.router.navigate(['/activityDetail', activityId]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Calcula recomendaciones de actividades parecidas y cercanas. */
  private updateRecommendations(): void {
    if (!this.activity) {
      this.similarActivities = [];
      this.nearbyActivities = [];
      return;
    }

    const currentActivity = this.activity;
    const candidates = this.allActivities.filter(
      (activity) => activity?.id && activity.id !== currentActivity.id,
    );

    const currentType = this.extractActivityTypeKey(currentActivity);
    this.similarActivities = candidates
      .filter(
        (activity) =>
          !!currentType &&
          this.extractActivityTypeKey(activity) === currentType,
      )
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, this.maxRecommendations);

    const usedIds = new Set(this.similarActivities.map((activity) => activity.id));
    const currentCoords = this.extractCoordinates(currentActivity);
    if (!currentCoords) {
      this.nearbyActivities = [];
      return;
    }

    this.nearbyActivities = candidates
      .filter((activity) => !usedIds.has(activity.id))
      .map((activity) => ({
        activity,
        distance: this.getDistanceFromCurrent(currentCoords, activity),
      }))
      .filter(
        (entry): entry is { activity: Activity; distance: number } =>
          entry.distance !== null && entry.distance <= this.nearbyRadiusKm,
      )
      .sort((a, b) => a.distance - b.distance)
      .slice(0, this.maxRecommendations)
      .map((entry) => entry.activity);
  }

  /** Extrae una clave normalizada del tipo de actividad para comparar similitud. */
  private extractActivityTypeKey(activity: Activity): string {
    const rawType =
      (activity as any).IdTypeActivity ??
      (activity as any).activityTypeId ??
      (activity as any).typeId ??
      (activity as any).activityType ??
      '';

    return String(rawType).trim().toLowerCase();
  }

  /** Convierte coordenadas string/number de una actividad en valores numéricos. */
  private extractCoordinates(
    activity: Activity,
  ): { latitude: number; longitude: number } | null {
    const latitude = Number((activity as any).latitude);
    const longitude = Number((activity as any).longitude);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return null;
    }

    return { latitude, longitude };
  }

  /** Calcula distancia en km desde la actividad actual a una candidata. */
  private getDistanceFromCurrent(
    currentCoords: { latitude: number; longitude: number },
    candidate: Activity,
  ): number | null {
    const candidateCoords = this.extractCoordinates(candidate);
    if (!candidateCoords) {
      return null;
    }

    return this.distanceKm(
      currentCoords.latitude,
      currentCoords.longitude,
      candidateCoords.latitude,
      candidateCoords.longitude,
    );
  }

  /** Distancia Haversine entre dos coordenadas geográficas en kilómetros. */
  private distanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const earthRadiusKm = 6371;
    const deltaLat = this.toRadians(lat2 - lat1);
    const deltaLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(deltaLon / 2) *
        Math.sin(deltaLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
  }

  /** Convierte grados a radianes. */
  private toRadians(value: number): number {
    return (value * Math.PI) / 180;
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

  /** Vuelve a la página anterior con fallback al listado de actividades. */
  goBack() {
    if (window.history.length > 1) {
      this.browserLocation.back();
      return;
    }

    this.router.navigate(['/activitiesList']);
  }

  /** Formatea un Timestamp de Firebase a `dd/mm/yyyy`. */
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

  /** Abre Google Maps en nueva pestaña con las coordenadas de la actividad. */
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

  /** Precio de la actividad, si el modelo lo expone. */
  get activityPrice(): number | null {
    return (this.activity as any)?.price ?? null;
  }

  /** Obtiene una URL de imagen robusta para tarjetas de recomendaciones. */
  getActivityImage(activity: Activity): string {
    return (
      (activity as any).imageURL ||
      (activity as any).imageRef ||
      this.fallbackImage
    );
  }

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (!img.src.includes(this.fallbackImage)) {
      img.src = this.fallbackImage;
      return;
    }
    img.onerror = null;
  }

  /** Abre el modal de reseña. */
  openReviewModal() {
    this.isReviewModalOpen = true;
  }

  /** Cierra el modal de reseña. */
  closeReviewModal() {
    this.isReviewModalOpen = false;
  }

  /** Guarda la actividad en el perfil del usuario actual. */
  async saveActivity() {
    if (this.isActivitySaved) return; // Evitar guardar si ya está guardada

    const user = this.auth.currentUser;
    if (!user) {
      console.error('Usuario no autenticado');
      return;
    }
    const token = await user.getIdToken();
    this.isActivitySaved = true;
    this.userService
      .saveActivity(user.uid, this.activity!.id, token)
      .subscribe({
        error: (err) => {
          console.error('Error al guardar la actividad en favoritos:', err);
          this.isActivitySaved = false;
        },
      });
  }

  /** Emite la reseña al backend y sincroniza la actividad con la respuesta. */
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
