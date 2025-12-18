
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Plan } from '../../models/plan.model';
import { PlanService } from '../../../core/services/plan.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-options-plans',
  imports: [TranslatePipe],
  templateUrl: './options-plans.component.html',
 // styleUrl: './options-plans.component.scss'
})
export class OptionsPlansComponent {


  private route = inject(Router);
  private planService = inject(PlanService);
  private router = inject(ActivatedRoute)
  private auth = inject(AuthService)

  isMenuOpen: boolean = false;
  showDeleteModal = false;
  plan?: Plan;

  ngOnInit(){
    const idUrl = this.router.snapshot.paramMap.get('id');
    this.planService.getPlanId(idUrl!).subscribe(data =>
      this.plan = data)
    }
  

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  onUpdate(){
    const idUrl = this.router.snapshot.paramMap.get('id');
    this.route.navigate(['/updatePlan/',idUrl]);
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
