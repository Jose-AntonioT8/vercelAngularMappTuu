import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { ActivityService } from '../../../core/services/activity.service';
import { AuthService } from '../../../core/services/auth.service';
import { Activity } from '../../models/activity.model';



/**
 * Menú contextual de opciones para una actividad (editar/eliminar).
 *
 * - Carga la actividad por `id` desde la ruta.
 * - Permite navegar a edición.
 * - Permite eliminar la actividad vía backend con Bearer token.
 */
@Component({
  selector: 'app-options',
  standalone: true,
  imports: [TranslatePipe, CommonModule],
  templateUrl: './options.component.html',
  styles: []
})
export class OptionsComponent {

  /** Router para navegación (update/redirecciones). */
  private route = inject(Router);
  /** Servicio de actividades para cargar/eliminar la actividad objetivo. */
  private activityService = inject(ActivityService);
  /** Ruta activa para leer el parámetro `id`. */
  private router = inject(ActivatedRoute)
  /** Auth para obtener token del usuario actual. */
  private auth = inject(AuthService)

  /** Estado del menú desplegable. */
  isMenuOpen: boolean = false;
  /** Control del modal de confirmación de borrado. */
  showDeleteModal = false;
  /** Actividad objetivo de las acciones del menú. */
  activity?: Activity;

  /** Carga la actividad según el `id` de ruta. */
  ngOnInit(){
    const idUrl = this.router.snapshot.paramMap.get('id');
    this.activityService.getActivityId(idUrl!).subscribe(data =>
      this.activity = data)
    }
  

  /** Abre/cierra el menú desplegable. */
  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  /** Navega a la pantalla de actualización de actividad. */
  onUpdate(){
    const idUrl = this.router.snapshot.paramMap.get('id');
    this.route.navigate(['/updateActivity/',idUrl]);
  }

  /** Abre modal de confirmación de borrado. */
  askToDelete() {
    this.isMenuOpen = false;
    this.showDeleteModal = true;
  }

  /** Cancela el borrado (cierra modal). */
  cancelDelete() {
    this.showDeleteModal = false;
  }

  /** Confirma y ejecuta el borrado en backend. */
  async confirmDelete() {
    try {
      const user = this.auth.currentUser;
      if (!user) throw new Error('No autenticado');
      const token = await user.getIdToken();
      this.activityService.deleteActivity(this.activity!!.id, token).subscribe({
        next: () => {
          console.log("Actividad eliminada con éxito");
          this.showDeleteModal = false;
          this.route.navigate(['/activitiesList']);
        },
        error: (err) => {
          console.error("Error al eliminar (Probablemente 401 o 500):", err);
        }
      });
    } catch (error) {
      
    }
    
    
  }

}
