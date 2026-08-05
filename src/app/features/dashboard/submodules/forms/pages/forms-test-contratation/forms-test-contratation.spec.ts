/**
 * Pruebas de DOM del formulario de contratación.
 *
 * Cubren lo que no se puede comprobar mirando solo el TypeScript: que el
 * template realmente pinte (o deje de pintar) los campos, que el input numérico
 * lleve sus topes, y que el stepper y el datepicker queden bien atados.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import { FormsTestContratation } from './forms-test-contratation';
import { ParametrizacionS } from '../../services/parametrizacion/parametrizacion-s';
import { RegistroProcesoContratacion } from '../../services/registro-proceso-contratacion/registro-proceso-contratacion';
import { CandidateS } from '../../../../../../shared/services/candidate-s/candidate-s';
import { DocumentManagementS } from '../../../../../../shared/services/document-management-s/document-management-s';

const V = (arr: any[]) => arr.map((d) => ({ activo: true, datos: d }));
const CATALOGOS: Record<string, any> = {
  TIPOS_IDENTIFICACION: V([{ codigo: 'CC', descripcion: 'CEDULA DE CIUDADANIA' }]),
  SEXO: V([{ codigo: 'M' }, { codigo: 'F' }]),
  RH: V([{ nombre: 'O+' }]),
  ESTADOS_CIVILES: V([{ codigo: 'SO', descripcion: 'SOLTERO' }, { codigo: 'CA', descripcion: 'CASADO' }]),
  DOMINANCIA_MANUAL: V([{ codigo: 'D', descripcion: 'DIESTRO' }]),
  PARENTESCOS_FAMILIARES: V([{ codigo: 'HE', descripcion: 'HERMANO' }]),
  OCUPACIONES: V([{ codigo: 'EMPLEADO' }, { codigo: 'ESTUDIANTE' }]),
  CATALOGO_NIVELES_ESCOLARIDAD: V([{ codigo: 'BACHILLER' }]),
  TALLA_ROPA: V([{ talla: 'M' }]),
  TALLAS_CALZADO: V([{ talla: '40' }]),
  CATALOGO_SERVICIOS: V([{ codigo: 'AGUA' }]),
  CATALOGO_MARKETING: V([{ codigo: 'FACEBOOK' }]),
  CATALOGO_CON_QUIEN_VIVE: V([{ codigo: 'PADRES' }]),
  CATALOGO_PERSONAS_ACARGO: V([{ codigo: 'NINGUNA' }]),
  CATALOGO_TIPOS_VIVIENDA: V([{ codigo: 'ARRIENDO' }]),
  CATALOGO_CARACTERISTICAS_VIVIENDA: V([{ codigo: 'LADRILLO' }]),
  AREAS_EXPERIENCIA: V([{ codigo: 'CULTIVO' }]),
  TIEMPO_EXPERIENCIA: V([{ nombre: '1 AÑO' }]),
  EXPECTATIVAS_VIDA: V([{ codigo: 'CASA PROPIA' }]),
  HACE_CUENTO_ZONA: V([{ nombre: '1 AÑO' }]),
  CUIDADOR_HIJOS: V([{ nombre: 'ABUELA' }]),
  ESTUDIOS: V([{ codigo: 'INGLES' }]),
};

const COLOMBIA = [
  { id: 1, departamento: 'Cundinamarca', ciudades: ['Funza', 'Madrid', 'Mosquera'] },
  { id: 2, departamento: 'Boyacá', ciudades: ['Tunja', 'Sotaquirá'] },
];

describe('FormsTestContratation (DOM)', () => {
  let fixture: ComponentFixture<FormsTestContratation>;
  let comp: FormsTestContratation;

  beforeEach(async () => {
    localStorage.clear();

    // El componente importa MatDialogModule, así que el MatDialog real gana
    // sobre cualquier provider del TestBed. Se neutraliza el modal de habeas
    // data en el prototipo: no es lo que se está probando aquí.
    spyOn(FormsTestContratation.prototype as any, 'openPoliciesDialog').and.stub();

    await TestBed.configureTestingModule({
      // El proyecto no instala @angular/animations: Material corre sin ellas.
      imports: [FormsTestContratation],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ParametrizacionS, useValue: { bulkValores: () => of({ results: CATALOGOS, counts: {}, missing: [] }) } },
        { provide: HttpClient, useValue: { get: () => of(COLOMBIA), post: () => of({ ok: true }), patch: () => of({}) } },
        { provide: ActivatedRoute, useValue: { queryParamMap: of({ get: () => null }), snapshot: { queryParamMap: { get: () => null } } } },
        { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(true) }) } },
        {
          provide: RegistroProcesoContratacion,
          useValue: { crearActualizarCandidato: () => of({ ok: true }), crearActualizarCandidato2: () => of({ ok: true }), formulario_vacantes: () => of({ ok: true }) },
        },
        { provide: DocumentManagementS, useValue: { guardarDocumento: () => of({ ok: true }) } },
        {
          provide: CandidateS,
          useValue: {
            getPrefillByDocumento: () => throwError(() => ({ status: 404 })),
            validarCorreoCedula: () => of({ correo_repetido: false }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FormsTestContratation);
    comp = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  /** Abre el formulario principal (el pre-check solo pide tipo y número). */
  async function abrirFormulario() {
    comp.searchForm.setValue({ tipo_doc: 'CC', numero_documento: '1023456789' });
    await comp.onSearch();
    fixture.detectChanges();
    await fixture.whenStable();
  }

  /** Salta a un paso concreto (el modo lineal frena si hay pendientes). */
  async function irAlPaso(i: number) {
    comp.stepper.linear = false;
    comp.stepper.selectedIndex = i;
    fixture.detectChanges();
    await fixture.whenStable();
    comp.stepper.linear = true;
  }

  const txt = () => (fixture.nativeElement as HTMLElement).textContent || '';

  /**
   * Texto SOLO del paso visible. El stepper deja en el DOM los pasos ya
   * visitados (ocultos), y el paso 1 tiene su propio campo "Barrio", así que
   * mirar todo el documento da falsos positivos.
   */
  const txtPasoActual = () =>
    (fixture.nativeElement as HTMLElement)
      .querySelector('.mat-horizontal-stepper-content-current')?.textContent || '';

  it('el pre-check exige 6 dígitos y no abre el formulario con menos', async () => {
    comp.searchForm.setValue({ tipo_doc: 'CC', numero_documento: '123' });
    await comp.onSearch();
    fixture.detectChanges();
    expect(comp.showForm).toBeFalse();
  });

  it('pinta el stepper con los 5 pasos', async () => {
    await abrirFormulario();
    expect(comp.showForm).toBeTrue();
    expect(comp.stepper.steps.length).toBe(5);
  });

  it('el campo de hijos lleva min=0 y max=10 en el DOM', async () => {
    await abrirFormulario();
    await irAlPaso(3);
    const input: HTMLInputElement | null = fixture.nativeElement.querySelector('input[type="number"]');
    expect(input).withContext('debe existir el input numérico de hijos').not.toBeNull();
    expect(input!.getAttribute('min')).toBe('0');
    expect(input!.getAttribute('max')).toBe('10');
  });

  it('un valor negativo en hijos no cuelga y se corrige a 0', async () => {
    await abrirFormulario();
    await irAlPaso(3);
    const inicio = Date.now();
    comp.formHojaDeVida2.get('numHijosDependientes')!.setValue(-1);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(Date.now() - inicio).toBeLessThan(3000);
    expect(comp.hijosFormArray.length).toBe(0);
    expect(comp.formHojaDeVida2.get('numHijosDependientes')!.value).toBe(0);
  });

  it('renderiza una tarjeta por hijo', async () => {
    await abrirFormulario();
    await irAlPaso(3);
    comp.formHojaDeVida2.get('numHijosDependientes')!.setValue(2);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('.child-card').length).toBe(2);
  });

  it('el barrio del padre aparece solo cuando el padre VIVE', async () => {
    await abrirFormulario();
    await irAlPaso(2);
    expect(txtPasoActual()).withContext('paso 3 visible').toContain('Padres');

    // Etiqueta EXACTA: las referencias usan "Dirección y Barrio", así que
    // buscar el texto suelto "Barrio" daría un falso positivo.
    const camposBarrio = () =>
      Array.from(
        (fixture.nativeElement as HTMLElement)
          .querySelectorAll('.mat-horizontal-stepper-content-current mat-label')
      ).filter((l) => (l.textContent || '').trim() === 'Barrio').length;

    expect(camposBarrio()).withContext('sin elegir estado del padre').toBe(0);

    comp.formHojaDeVida2.get('elPadreVive')!.setValue('VIVE');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(camposBarrio()).withContext('con el padre VIVE').toBe(1);

    comp.formHojaDeVida2.get('madreVive')!.setValue('VIVE');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(camposBarrio()).withContext('padre y madre VIVE').toBe(2);
  });

  it('el paso final ya no ofrece "¿Generar HV automática?"', async () => {
    await abrirFormulario();
    await irAlPaso(4);
    expect(txt()).toContain('Hoja de Vida');
    expect(txt()).not.toContain('Generar HV');
    expect(comp.formHojaDeVida2.get('deseaGenerar')).toBeNull();
  });

  it('el botón de enviar se bloquea mientras se envía', async () => {
    await abrirFormulario();
    await irAlPaso(4);
    const boton = (): HTMLButtonElement | null => fixture.nativeElement.querySelector('button.btn-save');
    expect(boton()).not.toBeNull();
    expect(boton()!.disabled).toBeFalse();

    comp.enviando = true;
    fixture.detectChanges();
    await fixture.whenStable();
    expect(boton()!.disabled).toBeTrue();
  });

  it('el datepicker de nacimiento no deja elegir a quien no cumple la edad mínima', async () => {
    await abrirFormulario();
    const hoy = new Date();
    const max = comp.maxFechaNacimiento;
    expect(max.getFullYear()).toBe(hoy.getFullYear() - FormsTestContratation.EDAD_MINIMA);
    const input: HTMLInputElement | null = fixture.nativeElement.querySelector('input[formcontrolname], input');
    expect(input).not.toBeNull();
  });

  it('avisa mientras cargan los catálogos', async () => {
    comp.loadingCatalogos = true;
    fixture.detectChanges();
    await fixture.whenStable();
    expect(txt()).toContain('Cargando las opciones del formulario');
  });

  it('la cascada departamento → ciudad puebla el desplegable aunque venga en MAYÚSCULAS', async () => {
    await abrirFormulario();
    comp.formHojaDeVida2.get('departamento')!.setValue('CUNDINAMARCA');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(comp.ciudadesResidencia.length).toBe(3);
  });
});
