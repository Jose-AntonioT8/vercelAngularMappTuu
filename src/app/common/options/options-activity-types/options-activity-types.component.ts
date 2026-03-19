import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ActivityTypeService } from '../../../core/services/activitytype.service';
import { ActivityType } from '../../models/activityType.models';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';



/**
 * Menú de opciones para un tipo de actividad (editar/eliminar).
 *
 * Obtiene el `id` desde la ruta actual y carga el `ActivityType` para poder eliminarlo.
 * La eliminación requiere token de Firebase (AuthService.currentUser).
 */
@Component({
  selector: 'app-options-activity-types',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './options-activity-types.component.html',
  styles: []
})
export class OptionsActivityTypesComponent {

  /** Router para navegación (update/redirecciones). */
  private route = inject(Router);
  /** Servicio de tipos para cargar/eliminar el tipo objetivo. */
  private activityTypeSeervice = inject(ActivityTypeService);
  /** Ruta activa para leer el parámetro `id`. */
  private router = inject(ActivatedRoute)
  /** Auth para obtener token del usuario actual. */
  private auth = inject(AuthService)

  /** Estado del dropdown/menú. */
  isMenuOpen: boolean = false;
  /** Control del modal de confirmación de borrado. */
  showDeleteModal = false;
  /** Tipo de actividad cargado desde el servicio. */
  activity?: ActivityType;

  /** Carga el tipo de actividad correspondiente al `id` de la URL. */
  ngOnInit(){
    const idUrl = this.router.snapshot.paramMap.get('id');
    this.activityTypeSeervice.getActivityId(idUrl!).subscribe(data =>
      this.activity = data)
    }
  

  /** Alterna el menú de opciones. */
  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  /** Navega a la pantalla de actualización del tipo de actividad. */
  onUpdate(){
    const idUrl = this.router.snapshot.paramMap.get('id');
    this.route.navigate(['/activityTypesUpdate/',idUrl]);
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
   * Confirma la eliminación del tipo de actividad.
   *
   * Obtiene token del usuario autenticado y llama al endpoint protegido.
   */
  async confirmDelete() {
    try {
      const user = this.auth.currentUser;
      if (!user) throw new Error('No autenticado');
      const token = await user.getIdToken();
      this.activityTypeSeervice.deleteActivityType(this.activity!!.id, token).subscribe({
        next: () => {
          console.log("Tipo de actividad eliminada con éxito");
          this.showDeleteModal = false;
          this.route.navigate(['/activityTypesList']);
        },
        error: (err) => {
          console.error("Error al eliminar (Probablemente 401 o 500):", err);
        }
      });
    } catch (error) {
      
    }
    
    
  }

}
