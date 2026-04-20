import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { ActivityService } from '../../../core/services/activity.service';
import { AuthService } from '../../../core/services/auth.service';
import { Activity } from '../../models/activity.model';
import { ReportingService } from '../../../core/services/reporting.service';
import {
  CreateActivityReportPayload,
  ReportReason,
} from '../../models/reporting.types';
import { firstValueFrom } from 'rxjs';



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
  imports: [TranslatePipe, CommonModule, FormsModule],
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
  /** Servicio de reportes. */
  private reportService = inject(ReportingService);

  /** Estado del menú desplegable. */
  isMenuOpen: boolean = false;
  /** Control del modal de confirmación de borrado. */
  showDeleteModal = false;
  /** Actividad objetivo de las acciones del menú. */
  activity?: Activity;
  /** Control del modal de reporte. */
  isReportModalOpen = false;
  /** Motivo seleccionado para el reporte. */
  reportReason: ReportReason = 'spam';
  /** Detalle libre opcional que acompana el reporte. */
  reportDetails = '';
  /** Clave i18n para mostrar feedback de envio. */
  reportToastKey = '';
  /** Tipo visual del toast de reporte. */
  reportToastType: 'success' | 'error' = 'success';
  /** Temporizador para ocultar automaticamente el toast. */
  private reportToastTimer: ReturnType<typeof setTimeout> | null = null;

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

  /** Abre modal para reportar actividad. */
  openReportModal() {
    const user = this.auth.currentUser ?? this.auth.firebaseCurrentUser;
    if (!user) {
      this.route.navigate(['/login']);
      return;
    }
    this.isMenuOpen = false;
    this.isReportModalOpen = true;
  }

  /** Cierra el modal de reporte sin enviar cambios. */
  closeReportModal() {
    this.isReportModalOpen = false;
  }

  /** Envía el reporte al backend. */
  async submitReport(): Promise<void> {
    try {
      const user = this.auth.currentUser ?? this.auth.firebaseCurrentUser;
      if (!user) {
        this.route.navigate(['/login']);
        return;
      }
      if (!this.activity?.id) {
        this.showReportToast('reports.reportActivity.errors.activityUnknown', 'error');
        return;
      }
      const payload: CreateActivityReportPayload = {
        activityId: this.activity.id,
        reason: this.reportReason,
        details: this.reportDetails.trim() || undefined,
      };
      const token = await user.getIdToken();
      await firstValueFrom(this.reportService.createReport(payload, token));
      this.isReportModalOpen = false;
      this.reportReason = 'spam';
      this.reportDetails = '';
      this.showReportToast('reports.reportActivity.toastSuccess', 'success');
    } catch (error) {
      console.error('Error enviando reporte:', error);
      this.showReportToast('reports.reportActivity.toastError', 'error');
    }
  }

  /** Muestra un toast temporal de resultado para el flujo de reporte. */
  private showReportToast(
    translationKey: string,
    type: 'success' | 'error' = 'success'
  ): void {
    this.reportToastKey = translationKey;
    this.reportToastType = type;
    if (this.reportToastTimer) {
      clearTimeout(this.reportToastTimer);
    }
    this.reportToastTimer = setTimeout(() => {
      this.reportToastKey = '';
      this.reportToastTimer = null;
    }, 2500);
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
