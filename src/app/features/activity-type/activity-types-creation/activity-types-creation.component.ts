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
@Component({
  selector: 'app-activity-types-creation',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TranslatePipe, LanguageSelectorComponent],
  templateUrl: './activity-types-creation.component.html',
  styleUrl: './activity-types-creation.component.scss'
})
export class ActivityTypesCreationComponent {
  error = '';
  success = '';
  formActivityCreation;
  activityData: any;
  activityTypes: any;
activityTypesName : string[] = [];

  constructor(
    
    private formSvc: FormBuilder,
    private route: Router,
    private auth: AuthService,
    private ActivityTypeService: ActivityTypeService
  ) {
    this.formActivityCreation = this.formSvc.group({
      name: ['', [Validators.required]],
      description: ['', [Validators.required]],
      
      color: ['', [Validators.required]],
    });

    this.activityTypes = this.ActivityTypeService.getActivitiesType();
  }
  ngOnInit(): void {
    this.ActivityTypeService.getActivitiesType().subscribe(
      (res: ActivityType[]) => {
        this.activityTypes = res;
        this.activityTypesName = res.map((type) => type.name);
      }
      
    );
  }
  logOut() {
    this.route.navigate(['/landingPage']);
    this.auth.logout();
  }
  getError(control: string) {
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

  async onCreate() {
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
      this.ActivityTypeService.createActivityType(activityData, token).subscribe(
        (res) => (this.success = 'Actividad creada con éxito'),
        (err: Error) => console.error('create error', err)
      );
      this.route.navigate(['/activitiesList']);
    } catch (err) {
      console.error('Token error', err);
    }
  }
}
