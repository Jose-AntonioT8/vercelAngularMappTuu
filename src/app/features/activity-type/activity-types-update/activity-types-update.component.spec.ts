import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivityTypesUpdateComponent } from './activity-types-update.component';

describe('ActivityTypesUpdateComponent', () => {
  let component: ActivityTypesUpdateComponent;
  let fixture: ComponentFixture<ActivityTypesUpdateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivityTypesUpdateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActivityTypesUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
