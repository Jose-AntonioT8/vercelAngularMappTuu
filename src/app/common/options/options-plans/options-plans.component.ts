
import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Plan } from '../../models/plan.model';
import { PlanService } from '../../../core/services/plan.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { ReportingService } from '../../../core/services/reporting.service';
import type {
  CreateActivityReportPayload,
  ReportReason,
} from '../../models/reporting.types';
import { firstValueFrom } from 'rxjs';

/**
 * Menú de opciones para un plan (editar/eliminar).
 *
 * Obtiene el `id` desde la ruta actual y carga el `Plan` para poder eliminarlo.
 * La eliminación requiere token de Firebase (AuthService.currentUser).
 */
@Component({
  selector: 'app-options-plans',
  imports: [CommonModule, FormsModule, TranslatePipe],
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
  /** Servicio de reportes. */
  private reportService = inject(ReportingService);

  /** Estado del dropdown/menú. */
  isMenuOpen: boolean = false;
  /** Control del modal de confirmación de borrado. */
  showDeleteModal = false;
  /** Plan cargado desde el servicio. */
  plan?: Plan;

  /** Control del modal de reporte. */
  isReportModalOpen = false;
  /** Motivo seleccionado para el reporte. */
  reportReason: ReportReason = 'spam';
  /** Detalle libre opcional del reporte. */
  reportDetails = '';
  /** Clave i18n de error de validación. */
  reportErrorKey = '';

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

  /** Abre modal para reportar el plan. */
  openReportModal(): void {
    const user = this.auth.currentUser ?? this.auth.firebaseCurrentUser;
    if (!user) {
      this.route.navigate(['/login']);
      return;
    }

    this.isMenuOpen = false;
    this.reportErrorKey = '';
    this.isReportModalOpen = true;
  }

  /** Cierra el modal de reporte y resetea estado. */
  closeReportModal(): void {
    this.isReportModalOpen = false;
    this.reportReason = 'spam';
    this.reportDetails = '';
    this.reportErrorKey = '';
  }

  /** Envía el reporte al backend. */
  async submitReport(): Promise<void> {
    try {
      const user = this.auth.currentUser ?? this.auth.firebaseCurrentUser;
      if (!user) {
        this.route.navigate(['/login']);
        return;
      }
      const routePlanId = this.router.snapshot.paramMap.get('id') || '';
      const planId = (this.plan?.id || routePlanId || '').trim();
      if (!planId) {
        this.reportErrorKey =
          'reports.reportPlan.errors.planUnknown';
        return;
      }

      const details = this.reportDetails.trim();
      const payload: CreateActivityReportPayload = {
        targetType: 'plan',
        planId,
        reason: this.reportReason,
        details: details || undefined,
      };

      const token = await user.getIdToken();
      await firstValueFrom(this.reportService.createReport(payload, token));

      this.closeReportModal();
    } catch {
      this.reportErrorKey = 'reports.reportPlan.toastError';
    }
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
