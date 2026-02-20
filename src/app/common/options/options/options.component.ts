import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { ActivityService } from '../../../core/services/activity.service';
import { AuthService } from '../../../core/services/auth.service';
import { Activity } from '../../models/activity.model';



@Component({
  selector: 'app-options',
  standalone: true,
  imports: [TranslatePipe, CommonModule],
  templateUrl: './options.component.html',
  styles: []
})
export class OptionsComponent {

  private route = inject(Router);
  private activityService = inject(ActivityService);
  private router = inject(ActivatedRoute)
  private auth = inject(AuthService)

  isMenuOpen: boolean = false;
  showDeleteModal = false;
  activity?: Activity;

  ngOnInit(){
    const idUrl = this.router.snapshot.paramMap.get('id');
    this.activityService.getActivityId(idUrl!).subscribe(data =>
      this.activity = data)
    }
  

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  onUpdate(){
    const idUrl = this.router.snapshot.paramMap.get('id');
    this.route.navigate(['/updateActivity/',idUrl]);
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
