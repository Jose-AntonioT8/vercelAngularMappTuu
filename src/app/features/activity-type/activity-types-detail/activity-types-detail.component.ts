import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ActivityTypeService } from '../../../core/services/activitytype.service';
import { ActivityType } from '../../../common/models/activityType.models';
import { OptionsActivityTypesComponent } from '../../../common/options/options-activity-types/options-activity-types.component';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { LanguageSelectorComponent } from '../../../common/language-selector/language-selector.component';

@Component({
  selector: 'app-activity-types-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, OptionsActivityTypesComponent, TranslatePipe, LanguageSelectorComponent],
  templateUrl: './activity-types-detail.component.html',
})
export class ActivityTypesDetailComponent {
  activityType?: ActivityType;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(ActivityTypeService);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.service.getActivityId?.(id).subscribe(data => {
      this.activityType = data as ActivityType;
    });
  }

  goBack() {
    this.router.navigate(['/activityTypesList']);
  }
}
