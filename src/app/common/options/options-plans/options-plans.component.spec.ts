import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OptionsPlansComponent } from './options-plans.component';

describe('OptionsPlansComponent', () => {
  let component: OptionsPlansComponent;
  let fixture: ComponentFixture<OptionsPlansComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OptionsPlansComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OptionsPlansComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
