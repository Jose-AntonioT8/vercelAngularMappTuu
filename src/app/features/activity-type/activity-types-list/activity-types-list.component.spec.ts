import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivityTypesListComponent } from './activity-types-list.component';

describe('ActivityTypesListComponent', () => {
  let component: ActivityTypesListComponent;
  let fixture: ComponentFixture<ActivityTypesListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivityTypesListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActivityTypesListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
