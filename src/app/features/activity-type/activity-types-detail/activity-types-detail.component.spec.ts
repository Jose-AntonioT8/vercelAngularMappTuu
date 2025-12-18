import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivityTypesDetailComponent } from './activity-types-detail.component';

describe('ActivityTypesDetailComponent', () => {
  let component: ActivityTypesDetailComponent;
  let fixture: ComponentFixture<ActivityTypesDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivityTypesDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActivityTypesDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
