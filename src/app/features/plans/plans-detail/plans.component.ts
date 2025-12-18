import { Component, inject } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Plan } from '../../../common/models/plan.model';
import { CommonModule } from '@angular/common';
import { PlanService } from '../../../core/services/plan.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { OptionsPlansComponent } from '../../../common/options/options-plans/options-plans.component';
import { ActivityService } from '../../../core/services/activity.service';
import { Activity } from '../../../common/models/activity.model';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { LanguageSelectorComponent } from '../../../common/language-selector/language-selector.component';
@Component({
  selector: 'app-plans',
  standalone: true,
  imports: [CommonModule, RouterModule, OptionsPlansComponent, TranslatePipe, LanguageSelectorComponent],
  templateUrl: './plans.component.html',
  styleUrl: './plans.component.scss'
})
export class PlansComponent {
  plan?: Plan;
  planDescription?: string;
  activities: Activity[] = [];
  private activityService = inject(ActivityService);
  private planService = inject(PlanService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  ngOnInit() {
    const idUrl = this.route.snapshot.paramMap.get('id');
    this.planService.getPlanId(idUrl!).subscribe({
      next: (data) => {
        this.plan = data;
        this.planDescription = (data as any).description ?? '';

        const ids = this.plan?.activitiesIds ?? [];
        if (ids.length > 0) {
          this.activities = []; // limpiar antes
          forkJoin(
            ids.map(id =>
              this.activityService.getActivityId(id).pipe(
                catchError(err => {
                  console.warn(`Actividad ${id} no encontrada`, err);
                  return of(null);
                })
              )
            )
          ).subscribe({
            next: (results) => {
              this.activities = (results.filter(r => r !== null) as Activity[]);
            },
            error: (err) => {
              console.error('Error cargando actividades del plan', err);
            }
          });
        }
      },
      error: (err) => {
        console.error('Error cargando plan', err);
      }
    });
  }

  goBack() {
    this.router.navigate(['/plansList']);
  }

  getFormattedDate(): string {
    if (!this.plan) return '';
    
    const createdAt = (this.plan as any).createdAt;
    
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
}
