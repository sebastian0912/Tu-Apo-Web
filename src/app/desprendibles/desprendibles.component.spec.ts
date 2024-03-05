import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DesprendiblesComponent } from './desprendibles.component';

describe('DesprendiblesComponent', () => {
  let component: DesprendiblesComponent;
  let fixture: ComponentFixture<DesprendiblesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DesprendiblesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DesprendiblesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
