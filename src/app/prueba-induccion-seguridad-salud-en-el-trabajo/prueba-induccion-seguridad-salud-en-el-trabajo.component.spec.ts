import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PruebaInduccionSeguridadSaludEnElTrabajoComponent } from './prueba-induccion-seguridad-salud-en-el-trabajo.component';

describe('PruebaInduccionSeguridadSaludEnElTrabajoComponent', () => {
  let component: PruebaInduccionSeguridadSaludEnElTrabajoComponent;
  let fixture: ComponentFixture<PruebaInduccionSeguridadSaludEnElTrabajoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PruebaInduccionSeguridadSaludEnElTrabajoComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PruebaInduccionSeguridadSaludEnElTrabajoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
