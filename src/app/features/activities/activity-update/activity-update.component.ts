import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ActivityService } from '../../../core/services/activity.service';
import { RouterModule } from '@angular/router';
import { ActivityTypeService } from '../../../core/services/activitytype.service';
import { ActivityType } from '../../../common/models/activityType.models';
import { FirebaseMediaService } from '../../../core/services/firebase-media.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { MapPreviewComponent } from '../../../common/maps/map-preview.component';
import { LanguageSelectorComponent } from '../../../common/language-selector/language-selector.component';

@Component({
  standalone: true,
  selector: 'app-activity-update',
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TranslatePipe, MapPreviewComponent, LanguageSelectorComponent],
  templateUrl: './activity-update.component.html',
  styleUrl: './activity-update.component.scss',
})
export class ActivitiesUpdateComponent {
  error = '';
  success = '';
  formActivityUpdate: FormGroup;
  activityTypes: any;
  activityTypesName : string[] = [];
  currentId: string | null = null;
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  isUploading = false;

  constructor(
    private formSvc: FormBuilder,
    private route: Router,
    private router: ActivatedRoute,
    private auth: AuthService,
    private activityService: ActivityService,
    private ActivityTypeService: ActivityTypeService,
    private mediaService: FirebaseMediaService
  ) {
    this.formActivityUpdate = this.formSvc.group({
      name: ['', [Validators.required]],
      description: ['', [Validators.required]],
      activityType: ['', [Validators.required]],
      latitude: ['', [Validators.pattern(/^-?\d+(\.\d+)?$/), Validators.min(-90), Validators.max(90)]],
      longitude: ['', [Validators.pattern(/^-?\d+(\.\d+)?$/), Validators.min(-180), Validators.max(180)]],
      price: [null, [Validators.min(0)]],
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
    this.currentId = this.router.snapshot.paramMap.get('id');
    if (this.currentId) {
      this.activityService.getActivityId(this.currentId).subscribe({
        next: (data: any) => {
          (this.formActivityUpdate as any).existingImageRef = data.imageRef;
          this.formActivityUpdate.patchValue({
            name: data.name,
            description: data.description,
            latitude: data.latitude,
            longitude: data.longitude,
            activityType: this.activityTypes.find((t: any) => t.id === data.activityTypeId)?.name,
            price: data.price || null
          });
        },
        error: (err) => console.error('Error cargando actividad', err)
      });
    }
  }
  get mapLatitude(): string {
    return this.formActivityUpdate.get('latitude')?.value || '';
  }

  get mapLongitude(): string {
    return this.formActivityUpdate.get('longitude')?.value || '';
  }

  onMapCoordinatesChange(coords: { latitude: number; longitude: number }): void {
    this.formActivityUpdate.patchValue({
      latitude: coords.latitude.toString(),
      longitude: coords.longitude.toString()
    });
  }

  logOut() {
    this.route.navigate(['/landingPage']);
    this.auth.logout();
  }

  get currentImage(): string {
    if (this.imagePreview) return this.imagePreview;
    const existingImage = (this.formActivityUpdate as any).existingImageRef;
    return existingImage || '';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (!file.type.startsWith('image/')) {
        this.error = 'Por favor, selecciona un archivo de imagen válido';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        this.error = 'La imagen no debe superar los 5MB';
        return;
      }
      this.selectedFile = file;
      this.error = '';
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  async uploadImage(): Promise<string | null> {
    if (!this.selectedFile) return null;
    this.isUploading = true;
    this.error = '';
    try {
      const blob = new Blob([this.selectedFile], { type: this.selectedFile.type });
      const urls = await this.mediaService.upload(blob, 'activities').toPromise();
      if (urls && urls.length > 0) {
        this.isUploading = false;
        return urls[0];
      }
      throw new Error('No se obtuvo URL de la imagen subida');
    } catch (err: any) {
      this.isUploading = false;
      this.error = err.message || 'Error al subir la imagen. Por favor, intenta nuevamente.';
      return null;
    }
  }

  async onCreate() {
    if (this.formActivityUpdate.invalid) {
      this.formActivityUpdate.markAllAsTouched();
      return;
    }

    const selectedActivityType = this.activityTypes.find(
      (type: ActivityType) => type.name === this.formActivityUpdate.value.activityType
    );

    let imageUrl = (this.formActivityUpdate as any).existingImageRef;

    if (this.selectedFile) {
      imageUrl = await this.uploadImage();
      if (!imageUrl) return;
    }

    if (!imageUrl) {
      this.error = 'Debes subir una imagen o mantener la existente';
      return;
    }

    const activityData = {
      name: this.formActivityUpdate.value.name,
      description: this.formActivityUpdate.value.description,
      latitude: this.formActivityUpdate.value.latitude,
      longitude: this.formActivityUpdate.value.longitude,
      imageRef: imageUrl,
      activityTypeId: selectedActivityType ? selectedActivityType.id : undefined,
      price: parseFloat(this.formActivityUpdate.value.price) || 0,
    };

    console.log('📦 Datos enviados al backend:', activityData);

    try {
      const user = this.auth.currentUser;
      if (!user) throw new Error('No autenticado');
      const token = await user.getIdToken();
      const idUrl = this.router.snapshot.paramMap.get('id');
      this.activityService.updateActivity(idUrl!, activityData, token).subscribe({
        next: (res) => {
          this.success = 'Actividad actualizada con éxito';
          setTimeout(() => {
             this.route.navigate(['/activitiesList']);
          }, 1000);
        },
        error: (err) => {
          this.error = 'Error al guardar los cambios.';
        }
      });
    } catch (err) {
      this.error = 'Error de autenticación. Por favor, inicia sesión nuevamente.';
    }
  }
}
