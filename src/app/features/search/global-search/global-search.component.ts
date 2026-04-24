import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BehaviorSubject, combineLatest, map } from 'rxjs';
import { HeaderComponent } from '../../../common/header/header.component';
import { Activity } from '../../../common/models/activity.model';
import { Plan } from '../../../common/models/plan.model';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { ActivityService } from '../../../core/services/activity.service';
import { PlanService } from '../../../core/services/plan.service';

/**
 * Tipo de resultado mostrado por la búsqueda global.
 *
 * - `activity`: resultado proveniente del catálogo de actividades.
 * - `plan`: resultado proveniente del catálogo de planes.
 */
type SearchItemType = 'activity' | 'plan';

/**
 * Elemento normalizado para renderizar tarjetas de búsqueda en la UI.
 */
interface SearchCardItem {
  /** Identificador único del recurso. */
  id: string;
  /** Título principal que se muestra en la tarjeta. */
  name: string;
  /** Descripción resumida usada para búsqueda y presentación. */
  description: string;
  /** URL/ref de imagen a mostrar; usa fallback cuando falta. */
  image: string;
  /** Puntuación media para ordenar relevancia visual. */
  rating: number;
  /** Tipo de recurso (actividad o plan). */
  itemType: SearchItemType;
  /** Ruta de navegación al detalle del recurso. */
  route: string[];
}

/**
 * Pantalla de búsqueda global.
 *
 * Une resultados de actividades y planes, normaliza su estructura,
 * aplica filtro por término de búsqueda y ordena por valoración.
 */
@Component({
  selector: 'app-global-search',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HeaderComponent, TranslatePipe],
  templateUrl: './global-search.component.html',
  styleUrl: './global-search.component.scss',
})
export class GlobalSearchComponent implements OnInit {
  /** Servicio de actividades para obtener el stream de datos. */
  private readonly activityService = inject(ActivityService);
  /** Servicio de planes para obtener el stream de datos. */
  private readonly planService = inject(PlanService);
  /** Ruta activa para leer y sincronizar query params. */
  private readonly route = inject(ActivatedRoute);
  /** Router para actualizar URL tras ejecutar búsqueda. */
  private readonly router = inject(Router);

  /** Término visible en el input de búsqueda. */
  searchTerm = '';
  /** Término reactivo interno que dispara el filtrado. */
  private readonly searchTerm$ = new BehaviorSubject<string>('');

  /**
   * Resultados reactivos combinando actividades, planes y término actual.
   */
  readonly searchResults$ = combineLatest([
    this.activityService.activities$,
    this.planService.plans$,
    this.searchTerm$,
  ]).pipe(
    map(([activities, plans, term]) =>
      this.filterItems(
        this.toActivityCards(activities || []),
        this.toPlanCards(plans || []),
        term,
      ),
    ),
  );

  /**
   * Inicializa fuentes de datos y sincroniza el término con `?q=`.
   */
  ngOnInit(): void {
    this.activityService.getActivities();
    this.planService.getPlans();

    this.route.queryParamMap.subscribe((params) => {
      const query = (params.get('q') || '').trim();
      this.searchTerm = query;
      this.searchTerm$.next(query);
    });
  }

  /**
   * Ejecuta la búsqueda actualizando stream y query param en URL.
   */
  runSearch(): void {
    const query = this.searchTerm.trim();
    this.searchTerm$.next(query);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: query ? { q: query } : {},
      queryParamsHandling: '',
    });
  }

  /**
   * Convierte actividades a tarjetas de búsqueda homogéneas.
   * @param activities Lista de actividades en bruto.
   */
  private toActivityCards(activities: Activity[]): SearchCardItem[] {
    return activities.map((activity) => {
      const payload = activity as unknown as Record<string, unknown>;
      return {
        id: activity.id,
        name: activity.name || '',
        description: this.toString(payload['description']),
        image: activity.imageURL || 'assets/logo/logo.png',
        rating: activity.rating || 0,
        itemType: 'activity',
        route: ['/activityDetail', activity.id],
      };
    });
  }

  /**
   * Convierte planes a tarjetas de búsqueda homogéneas.
   * @param plans Lista de planes en bruto.
   */
  private toPlanCards(plans: Plan[]): SearchCardItem[] {
    return plans.map((plan) => ({
      id: plan.id,
      name: plan.name || '',
      description: this.toString(plan.description),
      image: plan.imgRef || 'assets/logo/logo.png',
      rating: plan.rating || 0,
      itemType: 'plan',
      route: ['/planDetail', plan.id],
    }));
  }

  /**
   * Filtra y ordena elementos por término normalizado y rating.
   * @param activities Tarjetas de actividad.
   * @param plans Tarjetas de plan.
   * @param term Texto de búsqueda.
   */
  private filterItems(
    activities: SearchCardItem[],
    plans: SearchCardItem[],
    term: string,
  ): SearchCardItem[] {
    const allItems = [...activities, ...plans];
    const normalizedTerm = this.normalizeText(term).trim();

    // Si no hay término de búsqueda, devolver todos los elementos ordenados por rating
    if (!normalizedTerm) {
      return allItems.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    // Si hay término de búsqueda, filtrar los elementos
    const filtered = allItems.filter((item) => {
      const searchableText = this.normalizeText(
        `${item.name} ${item.description} ${item.id}`,
      );
      return searchableText.includes(normalizedTerm);
    });

    return filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }

  /**
   * Normaliza texto para búsqueda tolerante a mayúsculas y acentos.
   * @param value Texto de entrada.
   */
  private normalizeText(value: string): string {
    return (value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  /**
   * Convierte valores desconocidos a string seguro.
   * @param value Valor de entrada.
   */
  private toString(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }
}
