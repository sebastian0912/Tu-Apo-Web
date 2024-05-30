import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SolicitudTrasladoComponent } from './solicitud-traslado.component';

describe('SolicitudTrasladoComponent', () => {
  let component: SolicitudTrasladoComponent;
  let fixture: ComponentFixture<SolicitudTrasladoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SolicitudTrasladoComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SolicitudTrasladoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
