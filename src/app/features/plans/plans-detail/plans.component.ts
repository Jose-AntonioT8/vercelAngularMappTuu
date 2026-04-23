import { CommonModule, Location } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { LanguageSelectorComponent } from '../../../common/language-selector/language-selector.component';
import { ReviewModalComponent } from '../../../common/modals/review-modal/review-modal.component';
import { ReviewsListModalComponent } from '../../../common/modals/reviews-list-modal/reviews-list-modal'; // Ajusta ruta
import { Activity, Review } from '../../../common/models/activity.model';
import { Plan } from '../../../common/models/plan.model';
import { OptionsPlansComponent } from '../../../common/options/options-plans/options-plans.component';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { ActivityService } from '../../../core/services/activity.service';
import { AuthService } from '../../../core/services/auth.service';
import { PlanService } from '../../../core/services/plan.service';
import { UserService } from '../../../core/services/user.service';
/**
 * Detalle de plan.
 *
 * - Carga el plan por id de ruta y resuelve sus actividades.
 * - Permite guardar el plan en el perfil del usuario.
 * - Permite crear/editar reseñas y listar reseñas existentes.
 */
@Component({
  selector: 'app-plans',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    OptionsPlansComponent,
    TranslatePipe,
    LanguageSelectorComponent,
    ReviewModalComponent,
    ReviewsListModalComponent,
  ],
  templateUrl: './plans.component.html',
  styleUrl: './plans.component.scss',
})
export class PlansComponent implements OnInit, OnDestroy {
  /**
   * @param userService Servicio de usuario para guardados y perfil.
   * @param auth Servicio de autenticacion para token del usuario actual.
   */
  constructor(private userService: UserService, private auth: AuthService) {}
  /** Subscripciones activas del componente. */
  private readonly subscriptions = new Subscription();
  /** Todos los planes disponibles para construir recomendaciones. */
  private allPlans: Plan[] = [];
  /** Límite de recomendaciones por bloque. */
  private readonly maxRelatedPlans = 4;

  /** Indica si el plan está guardado por el usuario actual. */
  isPlanSaved = false;
  /** Plan cargado desde API. */
  plan?: Plan;
  /** Descripción derivada del plan (por compatibilidad). */
  planDescription?: string;
  /** Actividades resueltas a partir de `plan.activitiesIds`. */
  activities: Activity[] = [];
  /** Controla el modal de reseña (crear/editar). */
  isReviewModalOpen = false;
  /** Reseña del usuario actual (si existe). */
  userReview: Review | null = null;
  /** Planes recomendados por actividades coincidentes. */
  relatedPlans: Plan[] = [];
  /** Detector manual para refrescar vista tras callbacks async. */
  private cdr = inject(ChangeDetectorRef);
  /** Controla el modal con la lista de reseñas. */
  isReviewsListModalOpen = false;
  /** Servicio de actividades para resolver IDs asociados al plan. */
  private activityService = inject(ActivityService);
  /** Servicio de planes para carga, guardado y valoraciones. */
  private planService = inject(PlanService);
  /** Ruta activa para resolver el identificador del plan. */
  private route = inject(ActivatedRoute);
  /** Router para navegación de retorno. */
  private router = inject(Router);
  /** Servicio Location para volver en historial del navegador. */
  private browserLocation = inject(Location);
  /** Servicio de auth expuesto al template. */
  public authService = inject(AuthService);

  /** Carga el plan y sus actividades asociadas. */
  ngOnInit(): void {
    this.subscriptions.add(
      this.route.paramMap.subscribe((params) => {
        const idUrl = params.get('id');
        if (!idUrl) {
          return;
        }

        this.loadPlanDetail(idUrl);
      })
    );

    this.subscriptions.add(
      this.planService.getPlans().subscribe((plans) => {
        this.allPlans = plans || [];
        this.updateRelatedPlans();
      })
    );
  }

  /** Carga un plan por id y sincroniza estado dependiente. */
  private loadPlanDetail(planId: string): void {
    this.resetDetailState();

    this.subscriptions.add(
      this.planService.getPlanId(planId).subscribe({
        next: (data) => {
          this.plan = data;
          this.planDescription = (data as any).description ?? '';

          const ids = this.plan?.activitiesIds ?? [];
          if (ids.length > 0) {
            this.activities = [];
            this.subscriptions.add(
              forkJoin(
                ids.map((id) =>
                  this.activityService.getActivityId(id).pipe(
                    catchError((err) => {
                      console.warn(`Actividad ${id} no encontrada`, err);
                      return of(null);
                    })
                  )
                )
              ).subscribe({
                next: (results) => {
                  this.activities = results.filter(
                    (r) => r !== null
                  ) as Activity[];
                },
                error: (err) => {
                  console.error('Error cargando actividades del plan', err);
                },
              })
            );
          }

          if (this.plan) {
            this.loadUserReview();
            this.checkIfPlanSaved();
            this.updateRelatedPlans();
          }
        },
        error: (err) => {
          console.error('Error cargando plan', err);
        },
      })
    );
  }

  /** Resetea estado dependiente al cambiar de plan en la misma vista. */
  private resetDetailState(): void {
    this.plan = undefined;
    this.planDescription = '';
    this.activities = [];
    this.userReview = null;
    this.isPlanSaved = false;
    this.relatedPlans = [];
  }

  /** Calcula planes relacionados por número de actividades coincidentes. */
  private updateRelatedPlans(): void {
    if (!this.plan) {
      this.relatedPlans = [];
      return;
    }

    const currentActivityIds = new Set(this.plan.activitiesIds || []);
    if (!currentActivityIds.size) {
      this.relatedPlans = [];
      return;
    }

    this.relatedPlans = this.allPlans
      .filter((candidate) => candidate.id !== this.plan?.id)
      .map((candidate) => {
        const overlapCount = (candidate.activitiesIds || []).filter((id) =>
          currentActivityIds.has(id)
        ).length;

        return { candidate, overlapCount };
      })
      .filter((item) => item.overlapCount > 0)
      .sort((a, b) => {
        if (b.overlapCount !== a.overlapCount) {
          return b.overlapCount - a.overlapCount;
        }

        return (b.candidate.rating ?? 0) - (a.candidate.rating ?? 0);
      })
      .slice(0, this.maxRelatedPlans)
      .map((item) => item.candidate);
  }

  /** Navega al detalle de un plan recomendado. */
  goToPlanDetail(planId: string): void {
    if (!planId || planId === this.plan?.id) {
      return;
    }

    this.router.navigate(['/plansDetail', planId]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Obtiene una URL robusta para imagen de plan recomendado. */
  getPlanImage(plan: Plan): string {
    return plan.imgRef || 'assets/logo/logo.png';
  }

  /** Verifica en el perfil del usuario si el plan ya está guardado. */
  private async checkIfPlanSaved(): Promise<void> {
    const user = this.authService.currentUser;
    if (!user || !this.plan) return;

    try {
      const planId = this.plan.id;
      this.userService.getUserId(user.uid).subscribe({
        next: (userData) => {
          this.isPlanSaved = userData.savedPlans?.includes(planId) ?? false;
        },
        error: (err) => {
          console.error('Error al verificar si el plan está guardado', err);
          this.isPlanSaved = false;
        },
      });
    } catch (error) {
      console.error('Error al obtener el token', error);
      this.isPlanSaved = false;
    }
  }

  /** Abre el modal de lista de reseñas. */
  openReviewsListModal(): void {
    this.isReviewsListModalOpen = true;
  }

  /** Cierra el modal de lista de reseñas. */
  closeReviewsListModal(): void {
    this.isReviewsListModalOpen = false;
  }
  /** Vuelve a la página anterior con fallback al listado de planes. */
  goBack(): void {
    if (window.history.length > 1) {
      this.browserLocation.back();
      return;
    }

    this.router.navigate(['/plansList']);
  }
  /** Guarda el plan en el perfil del usuario actual. */
  async savePlan(): Promise<void> {
    if (this.isPlanSaved) return; // Evitar guardar si ya está guardado

    const user = this.auth.currentUser;
    if (!user) {
      console.error('Usuario no autenticado');
      return;
    }
    const token = await user.getIdToken();
    this.isPlanSaved = true;
    this.userService.savePlan(user.uid, this.plan!.id, token).subscribe({
      error: (err) => {
        console.error('Error al guardar el plan en favoritos:', err);
        this.isPlanSaved = false;
      },
    });
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
   * Obtiene el estado de cada estrella según la puntuación.
   *
   * @param index - Índice de la estrella (0-4, correspondiente a estrellas 1-5)
   * @returns 'full' si la estrella está completamente llena, 'half' si está a la mitad, 'empty' si está vacía
   */
  getStarState(index: number): 'full' | 'half' | 'empty' {
    if (!this.plan) return 'empty';

    const rating = this.plan.rating;
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

  /**
   * Carga la reseña del usuario actual para este plan
   */
  private loadUserReview(): void {
    const user = this.authService.currentUser;
    if (!user || !this.plan) {
      console.log(
        '❌ No se puede cargar reseña - Usuario o plan no disponible'
      );
      return;
    }

    // Buscar en las reseñas del plan si existe una del usuario actual
    const reviews = this.plan.reviews || [];
    console.log(
      '🔍 Buscando reseña del usuario',
      user.uid,
      'en',
      reviews.length,
      'reseñas'
    );

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
      console.log('ℹ️ El usuario no tiene reseña para este plan');
    }
  }

  /** Abre el modal de reseña. */
  openReviewModal(): void {
    this.isReviewModalOpen = true;
  }

  /** Cierra el modal de reseña. */
  closeReviewModal(): void {
    this.isReviewModalOpen = false;
  }

  /** Emite la reseña al backend y sincroniza el plan con la respuesta. */
  handleReviewSubmit(review: Review): void {
    if (!this.plan) return;

    try {
      const user = this.authService.currentUser;
      if (!user) throw new Error('No autenticado');

      user.getIdToken().then((token) => {
        const isUpdate = !!review.id;

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
          planId: this.plan!.id,
        });

        this.planService.ratePlan(this.plan!.id, ratingData, token).subscribe({
          next: (res) => {
            console.log('✅ Reseña guardada con éxito:', res);

            // Actualizar el plan completo con los datos del backend
            if (res && res.plan) {
              this.plan = {
                ...this.plan!,
                rating: res.plan.rating,
                numRatings: res.plan.numRatings,
                reviews: res.plan.reviews,
              };

              console.log(
                '🔄 Plan actualizado con reviews:',
                this.plan.reviews
              );

              // Recargar la reseña del usuario desde el array actualizado
              this.loadUserReview();
            }
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

  /** Libera subscripciones activas del componente. */
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
