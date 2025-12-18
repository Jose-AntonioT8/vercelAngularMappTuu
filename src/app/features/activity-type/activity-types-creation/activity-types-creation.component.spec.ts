import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivityTypesCreationComponent } from './activity-types-creation.component';

describe('ActivityTypesCreationComponent', () => {
  let component: ActivityTypesCreationComponent;
  let fixture: ComponentFixture<ActivityTypesCreationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivityTypesCreationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActivityTypesCreationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
