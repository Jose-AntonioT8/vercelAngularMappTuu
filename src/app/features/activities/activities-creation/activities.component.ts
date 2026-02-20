import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LanguageSelectorComponent } from '../../../common/language-selector/language-selector.component';
import { MapPreviewComponent } from '../../../common/maps/map-preview.component';
import { ActivityType } from '../../../common/models/activityType.models';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { ActivityService } from '../../../core/services/activity.service';
import { ActivityTypeService } from '../../../core/services/activitytype.service';
import { AuthService } from '../../../core/services/auth.service';
import { CloudinaryService } from '../../../core/services/firebase-media.service';
import { UserService } from '../../../core/services/user.service';
@Component({
  standalone: true,
  selector: 'app-activities',
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    TranslatePipe,
    MapPreviewComponent,
    LanguageSelectorComponent,
  ],
  templateUrl: './activities.component.html',
  styleUrl: './activities.component.scss',
})
export class ActivitiesCreationComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  error = '';
  success = '';
  formActivityCreation: FormGroup;
  activityTypes: any;
  activityTypesName: string[] = [];
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  isUploading = false;

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  constructor(
    private formSvc: FormBuilder,
    private route: Router,
    private userService: UserService,
    private auth: AuthService,
    private activityService: ActivityService,
    private ActivityTypeService: ActivityTypeService,
    private mediaService: CloudinaryService
  ) {
    this.formActivityCreation = this.formSvc.group({
      name: ['', [Validators.required]],
      description: ['', [Validators.required]],
      activityType: ['', [Validators.required]],
      latitude: [
        '',
        [
          Validators.required,
          Validators.pattern(/^-?\d+(\.\d+)?$/),
          Validators.min(-90),
          Validators.max(90),
        ],
      ],
      longitude: [
        '',
        [
          Validators.required,
          Validators.pattern(/^-?\d+(\.\d+)?$/),
          Validators.min(-180),
          Validators.max(180),
        ],
      ],
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
  }

  get mapLatitude(): string {
    return this.formActivityCreation.get('latitude')?.value || '';
  }

  get mapLongitude(): string {
    return this.formActivityCreation.get('longitude')?.value || '';
  }

  onMapCoordinatesChange(coords: {
    latitude: number;
    longitude: number;
  }): void {
    this.formActivityCreation.patchValue({
      latitude: coords.latitude.toString(),
      longitude: coords.longitude.toString(),
    });
  }

  get currentImage(): string {
    return this.imagePreview || '';
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
      const blob = new Blob([this.selectedFile], {
        type: this.selectedFile.type,
      });
      const urls = await this.mediaService
        .upload(blob, 'activities')
        .toPromise();
      if (urls && urls.length > 0) {
        this.isUploading = false;
        return urls[0];
      }
      throw new Error('No se obtuvo URL de la imagen subida');
    } catch (err: any) {
      this.isUploading = false;
      this.error =
        err.message ||
        'Error al subir la imagen. Por favor, intenta nuevamente.';
      return null;
    }
  }

  async onCreate() {
    if (!this.selectedFile) {
      this.error = 'Debes subir una imagen';
      return;
    }

    if (this.formActivityCreation.invalid) {
      this.formActivityCreation.markAllAsTouched();
      return;
    }

    const selectedActivityType = this.activityTypes.find(
      (type: ActivityType) =>
        type.name === this.formActivityCreation.value.activityType
    );

    const imageUrl = await this.uploadImage();
    if (!imageUrl) return;

    const activityData = {
      name: this.formActivityCreation.value.name,
      description: this.formActivityCreation.value.description,
      latitude: this.formActivityCreation.value.latitude,
      longitude: this.formActivityCreation.value.longitude,
      imageRef: imageUrl,
      activityTypeId: selectedActivityType ? selectedActivityType.id : null,
      createdAt: Date.now(),
      ownerId: this.auth.currentUser,
      rating: 0,
      price: parseFloat(this.formActivityCreation.value.price) || 0,
    };

    try {
      const user = this.auth.currentUser;
      if (!user) throw new Error('No autenticado');
      const token = await user.getIdToken();

      this.activityService.createActivity(activityData, token).subscribe({
        next: (res) => {
          this.userService.createActivity(user.uid, res.id, token).subscribe();
          this.success = 'Actividad creada con éxito';
          setTimeout(() => {
            this.route.navigate(['/activitiesList']);
          }, 1000);
        },
        error: (err) => {
          this.error =
            'Error al crear la actividad. Por favor, intenta nuevamente.';
        },
      });
    } catch (err) {
      this.error =
        'Error de autenticación. Por favor, inicia sesión nuevamente.';
    }
  }
}
