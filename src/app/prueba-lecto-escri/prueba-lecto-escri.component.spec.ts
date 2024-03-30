import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PruebaLectoEscriComponent } from './prueba-lecto-escri.component';

describe('PruebaLectoEscriComponent', () => {
  let component: PruebaLectoEscriComponent;
  let fixture: ComponentFixture<PruebaLectoEscriComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PruebaLectoEscriComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PruebaLectoEscriComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
