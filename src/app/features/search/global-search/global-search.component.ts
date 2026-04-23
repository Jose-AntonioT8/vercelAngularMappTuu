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

type SearchItemType = 'activity' | 'plan';

interface SearchCardItem {
  id: string;
  name: string;
  description: string;
  image: string;
  rating: number;
  itemType: SearchItemType;
  route: string[];
}

@Component({
  selector: 'app-global-search',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HeaderComponent, TranslatePipe],
  templateUrl: './global-search.component.html',
  styleUrl: './global-search.component.scss',
})
export class GlobalSearchComponent implements OnInit {
  private readonly activityService = inject(ActivityService);
  private readonly planService = inject(PlanService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  searchTerm = '';
  private readonly searchTerm$ = new BehaviorSubject<string>('');

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

  ngOnInit(): void {
    this.activityService.getActivities();
    this.planService.getPlans();

    this.route.queryParamMap.subscribe((params) => {
      const query = (params.get('q') || '').trim();
      this.searchTerm = query;
      this.searchTerm$.next(query);
    });
  }

  runSearch(): void {
    const query = this.searchTerm.trim();
    this.searchTerm$.next(query);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: query ? { q: query } : {},
      queryParamsHandling: '',
    });
  }

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

  private normalizeText(value: string): string {
    return (value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private toString(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }
}
