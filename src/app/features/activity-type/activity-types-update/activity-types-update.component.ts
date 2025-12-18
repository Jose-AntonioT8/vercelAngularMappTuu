import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ActivityTypeService } from '../../../core/services/activitytype.service';
import { ActivityType } from '../../../common/models/activityType.models';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { LanguageSelectorComponent } from '../../../common/language-selector/language-selector.component';

@Component({
  selector: 'app-activity-types-update',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TranslatePipe, LanguageSelectorComponent],
  templateUrl: './activity-types-update.component.html',
})
export class ActivityTypesUpdateComponent {
  error = '';
  success = '';
  formActivityTypeUpdate: FormGroup;
  currentId: string | null = null;
  typeData?: ActivityType;

  constructor(
    private fb: FormBuilder,
    private router: ActivatedRoute,
    private nav: Router,
    private auth: AuthService,
    private typeService: ActivityTypeService
  ) {
    this.formActivityTypeUpdate = this.fb.group({
      name: [''],
      description: [''],
      color: ['']
    });
  }

  ngOnInit(): void {
    this.currentId = this.router.snapshot.paramMap.get('id');
    if (!this.currentId) return;
    this.typeService.getActivityId?.(this.currentId).subscribe({
      next: (data: ActivityType) => {
        this.typeData = data;
        this.formActivityTypeUpdate.patchValue({
          name: data.name,
          description: data.description,
          color: data.color
        });
      },
      error: () => (this.error = 'No se pudo cargar el tipo de actividad')
    });
  }

  get displayColor(): string {
    const val = this.formActivityTypeUpdate.get('color')?.value || this.typeData?.color || '#cccccc';
    const s = String(val);
    return s.startsWith('#') ? s : `#${s}`;
  }

  async onUpdate() {
    const payload: Partial<ActivityType> = {};
    const v = this.formActivityTypeUpdate.value;
    if (v.name) payload.name = v.name;
    if (v.description) payload.description = v.description;
    if (v.color) payload.color = v.color.startsWith('#') ? v.color : `#${v.color}`;

    try {
      const user = await this.auth.currentUser;
      if (!user) throw new Error('No autenticado');
      const token = await user.getIdToken();
      this.typeService.updateActivityType?.(this.currentId!, payload, token).subscribe({
        next: () => {
          this.success = 'Tipo de actividad actualizado';
          setTimeout(() => this.nav.navigate(['/activityTypesList']), 1000);
        },
        error: () => (this.error = 'Error al guardar los cambios')
      });
    } catch (e) {
      this.error = 'Error de autenticación';
    }
  }
}
