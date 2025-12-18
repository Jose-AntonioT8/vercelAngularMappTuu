import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilterPlansComponent } from './filter-plans.component';

describe('FilterPlansComponent', () => {
  let component: FilterPlansComponent;
  let fixture: ComponentFixture<FilterPlansComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilterPlansComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FilterPlansComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
