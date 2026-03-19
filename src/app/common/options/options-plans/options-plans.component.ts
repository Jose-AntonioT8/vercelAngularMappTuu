
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Plan } from '../../models/plan.model';
import { PlanService } from '../../../core/services/plan.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

/**
 * Menú de opciones para un plan (editar/eliminar).
 *
 * Obtiene el `id` desde la ruta actual y carga el `Plan` para poder eliminarlo.
 * La eliminación requiere token de Firebase (AuthService.currentUser).
 */
@Component({
  selector: 'app-options-plans',
  imports: [TranslatePipe],
  templateUrl: './options-plans.component.html',
 // styleUrl: './options-plans.component.scss'
})
export class OptionsPlansComponent {


  /** Router para navegación (update/redirecciones). */
  private route = inject(Router);
  /** Servicio de planes para cargar/eliminar el plan objetivo. */
  private planService = inject(PlanService);
  /** Ruta activa para leer el parámetro `id`. */
  private router = inject(ActivatedRoute)
  /** Auth para obtener token del usuario actual. */
  private auth = inject(AuthService)

  /** Estado del dropdown/menú. */
  isMenuOpen: boolean = false;
  /** Control del modal de confirmación de borrado. */
  showDeleteModal = false;
  /** Plan cargado desde el servicio. */
  plan?: Plan;

  /** Carga el plan correspondiente al `id` de la URL. */
  ngOnInit(){
    const idUrl = this.router.snapshot.paramMap.get('id');
    this.planService.getPlanId(idUrl!).subscribe(data =>
      this.plan = data)
    }
  

  /** Alterna el menú de opciones. */
  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  /** Navega a la pantalla de actualización del plan. */
  onUpdate(){
    const idUrl = this.router.snapshot.paramMap.get('id');
    this.route.navigate(['/updatePlan/',idUrl]);
  }

  /** Abre el modal de confirmación de borrado. */
  askToDelete() {
    this.isMenuOpen = false;
    this.showDeleteModal = true;
  }

  /** Cancela el modal de borrado. */
  cancelDelete() {
    this.showDeleteModal = false;
  }

  /**
   * Confirma la eliminación del plan.
   *
   * Obtiene token del usuario autenticado y llama al endpoint protegido.
   */
  async confirmDelete() {
    try {
      const user = this.auth.currentUser;
      if (!user) throw new Error('No autenticado');
      const token = await user.getIdToken();
      this.planService.deletePlan(this.plan!!.id, token).subscribe({
        next: () => {
          console.log("Plan eliminado con éxito");
          this.showDeleteModal = false;
          this.route.navigate(['/plansList']);
        },
        error: (err) => {
          console.error("Error al eliminar (Probablemente 401 o 500):", err);
        }
      });
    } catch (error) {
      
    }
    
    
  }

}
