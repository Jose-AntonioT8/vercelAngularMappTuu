import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlansCreationComponent } from './plans-creation.component';

describe('PlansCreationComponent', () => {
  let component: PlansCreationComponent;
  let fixture: ComponentFixture<PlansCreationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlansCreationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlansCreationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
