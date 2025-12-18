import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OptionsActivityTypesComponent } from './options-activity-types.component';

describe('OptionsActivityTypesComponent', () => {
  let component: OptionsActivityTypesComponent;
  let fixture: ComponentFixture<OptionsActivityTypesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OptionsActivityTypesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OptionsActivityTypesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
