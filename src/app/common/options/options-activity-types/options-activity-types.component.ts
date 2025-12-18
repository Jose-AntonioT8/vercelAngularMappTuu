import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ActivityTypeService } from '../../../core/services/activitytype.service';
import { ActivityType } from '../../models/activityType.models';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';



@Component({
  selector: 'app-options-activity-types',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './options-activity-types.component.html',
  styles: []
})
export class OptionsActivityTypesComponent {

  private route = inject(Router);
  private activityTypeSeervice = inject(ActivityTypeService);
  private router = inject(ActivatedRoute)
  private auth = inject(AuthService)

  isMenuOpen: boolean = false;
  showDeleteModal = false;
  activity?: ActivityType;

  ngOnInit(){
    const idUrl = this.router.snapshot.paramMap.get('id');
    this.activityTypeSeervice.getActivityId(idUrl!).subscribe(data =>
      this.activity = data)
    }
  

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  onUpdate(){
    const idUrl = this.router.snapshot.paramMap.get('id');
    this.route.navigate(['/activityTypesUpdate/',idUrl]);
  }

  askToDelete() {
    this.isMenuOpen = false;
    this.showDeleteModal = true;
  }

  cancelDelete() {
    this.showDeleteModal = false;
  }

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
