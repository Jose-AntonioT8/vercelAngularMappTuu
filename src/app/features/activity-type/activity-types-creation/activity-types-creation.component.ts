import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { RouterModule } from '@angular/router';
import { ActivityTypeService } from '../../../core/services/activitytype.service';
import { ActivityType } from '../../../common/models/activityType.models';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { LanguageSelectorComponent } from '../../../common/language-selector/language-selector.component';

/**
 * Pantalla de creación de tipos de actividad.
 *
 * - Valida formulario (nombre/descripcion/color).
 * - Normaliza el color a formato hex con `#`.
 * - Envía creación al backend con Bearer token (Firebase ID token).
 */
@Component({
  selector: 'app-activity-types-creation',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TranslatePipe, LanguageSelectorComponent],
  templateUrl: './activity-types-creation.component.html',
  styleUrl: './activity-types-creation.component.scss'
})
export class ActivityTypesCreationComponent {
  /** Mensaje de error para UI. */
  error = '';
  /** Mensaje de éxito para UI. */
  success = '';
  /** Formulario reactivo de creación de tipo. */
  formActivityCreation;
  /** Payload auxiliar (no tipado) usado por la pantalla. */
  activityData: any;
  /** Catálogo de tipos (si se usa en UI). */
  activityTypes: any;
  /** Lista de nombres (derivada) para mostrar en UI. */
  activityTypesName : string[] = [];
  /** Constructor de formularios. */
  private formSvc: FormBuilder;
  /** Router para navegación tras crear/cerrar sesión. */
  private route: Router;
  /** Auth para token/usuario actual. */
  private auth: AuthService;
  /** Servicio de tipos (mutación + catálogo). */
  private activityTypeService: ActivityTypeService;

  /**
   * Crea la pantalla de alta de tipos de actividad.
   *
   * @param formSvc Constructor de formularios.
   * @param route Router para navegar tras crear.
   * @param auth Auth para token/usuario actual.
   * @param activityTypeService Servicio de tipos (mutación + catálogo).
   */
  constructor(
    formSvc: FormBuilder,
    route: Router,
    auth: AuthService,
    activityTypeService: ActivityTypeService
  ) {
    this.formSvc = formSvc;
    this.route = route;
    this.auth = auth;
    this.activityTypeService = activityTypeService;
    this.formActivityCreation = this.formSvc.group({
      name: ['', [Validators.required]],
      description: ['', [Validators.required]],
      
      color: ['', [Validators.required]],
    });

    this.activityTypes = this.activityTypeService.getActivitiesType();
  }
  /** Carga tipos existentes para UI (si aplica). */
  ngOnInit(): void {
    this.activityTypeService.getActivitiesType().subscribe(
      (res: ActivityType[]) => {
        this.activityTypes = res;
        this.activityTypesName = res.map((type) => type.name);
      }
      
    );
  }
  /** Cierra sesión y vuelve al landing. */
  logOut(): void {
    this.route.navigate(['/landingPage']);
    this.auth.logout();
  }
  /** Devuelve un mensaje de error según el control invalidado. */
  getError(control: string): string {
    switch (control) {
      case 'name':
        if (
          this.formActivityCreation.controls.name.errors != null &&
          Object.keys(this.formActivityCreation.controls.name.errors).includes(
            'required'
          )
        )
          return 'El nombre es requerido';
        break;
      case 'description':
        if (
          this.formActivityCreation.controls.description.errors != null &&
          Object.keys(
            this.formActivityCreation.controls.description.errors
          ).includes('required')
        )
          return 'La descripción es requerida';
        break;

   

      case 'color':
        if (
          this.formActivityCreation.controls.color.errors != null &&
          Object.keys(
            this.formActivityCreation.controls.color.errors
          ).includes('required')
        )
          return 'El color es requerido';
        break;
      default:
        return '';
    }
    return '';
  }

  /** Crea un nuevo tipo de actividad en el backend. */
  async onCreate(): Promise<void> {
    if (this.formActivityCreation.invalid) {
      this.formActivityCreation.markAllAsTouched();
      return;
    }

    const rawColor = this.formActivityCreation.value.color!!;
    const color = rawColor.startsWith('#') ? rawColor : `#${rawColor}`;
    color.toString();

    const activityData = {
      name: this.formActivityCreation.value.name,
      description: this.formActivityCreation.value.description,
      color: color,
    };

    try {
      const user = await this.auth.currentUser;
      if (!user) throw new Error('No autenticado');
      const token = await user.getIdToken();
      alert(activityData.color);
      this.activityTypeService.createActivityType(activityData, token).subscribe(
        (res) => (this.success = 'Actividad creada con éxito'),
        (err: Error) => console.error('create error', err)
      );
      this.route.navigate(['/activitiesList']);
    } catch (err) {
      console.error('Token error', err);
    }
  }
}
