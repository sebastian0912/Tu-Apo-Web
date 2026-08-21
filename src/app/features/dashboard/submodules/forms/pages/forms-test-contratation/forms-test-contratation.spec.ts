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
import { detectarDominioEnUsuario } from './email-warning.util';
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
  DOTACION_TALLA: V([
    { sexo: 'M', tipo_prenda: 'CAMISA', talla: '38', orden: 3 },
    { sexo: 'M', tipo_prenda: 'PANTALON', talla: '32', orden: 3 },
    { sexo: 'M', tipo_prenda: 'CHAQUETA', talla: '38', orden: 3 },
    { sexo: 'M', tipo_prenda: 'CALZADO', talla: '40', orden: 5 },
    { sexo: 'F', tipo_prenda: 'CAMISA', talla: '10', orden: 3 },
    { sexo: 'F', tipo_prenda: 'CALZADO', talla: '37', orden: 4 },
  ]),
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

    // `onSearch` confirma el documento con un Swal.fire que espera un clic;
    // en el runner no hay quien lo dé y el await colgaba TODA la suite DOM
    // (stepper undefined + timeouts). Se resuelve como "sí, es correcto".
    spyOn(FormsTestContratation.prototype as any, 'confirmarDocumento').and.resolveTo(true);

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

  it('RF-045/046: cada hijo tiene nombres estructurados + tipo de documento independientes', async () => {
    await abrirFormulario();
    await irAlPaso(3);
    comp.formHojaDeVida2.get('numHijosDependientes')!.setValue(2);
    fixture.detectChanges();
    await fixture.whenStable();
    const g0: any = comp.hijosFormArray.at(0);
    const g1: any = comp.hijosFormArray.at(1);
    // Los controles nuevos existen por fila (no se comparten entre hijos).
    for (const g of [g0, g1]) {
      for (const k of ['hijoPrimerNombre', 'hijoSegundoNombre', 'hijoPrimerApellido', 'hijoSegundoApellido', 'tipoDocHijo']) {
        expect(g.get(k)).withContext(k).not.toBeNull();
      }
    }
    g0.get('hijoPrimerNombre')!.setValue('JUAN');
    g1.get('hijoPrimerNombre')!.setValue('ANA');
    expect(g0.get('hijoPrimerNombre')!.value).toBe('JUAN');
    expect(g1.get('hijoPrimerNombre')!.value).withContext('no se mezclan entre filas').toBe('ANA');
    // Primer nombre, primer apellido y tipo de documento son obligatorios.
    expect(g0.get('hijoPrimerApellido')!.hasError('required')).toBeTrue();
    expect(g0.get('tipoDocHijo')!.hasError('required')).toBeTrue();
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

  it('marcar NO VIVE conserva el nombre del padre; NO LO CONOCE lo vacía recordándolo (RF-040)', async () => {
    await abrirFormulario();
    await irAlPaso(2);
    const f = comp.formHojaDeVida2;
    // RF-040: el nombre del padre vive en componentes.
    f.get('padrePrimerNombre')!.setValue('JUAN');
    f.get('padrePrimerApellido')!.setValue('PEREZ');

    // NO VIVE: la dirección/teléfono/ocupación dejan de aplicar, pero el
    // nombre del fallecido se conserva (antes se borraba: bug reportado).
    f.get('elPadreVive')!.setValue('NO VIVE');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(f.get('padrePrimerNombre')!.value).toBe('JUAN');
    expect(f.get('padrePrimerNombre')!.enabled).toBeTrue();

    // NO LO CONOCE: sí se vacía y bloquea…
    f.get('elPadreVive')!.setValue('NO LO CONOCE');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(f.get('padrePrimerNombre')!.value).toBe('');
    expect(f.get('padrePrimerNombre')!.disabled).toBeTrue();

    // …y al volver a VIVE se restaura lo recordado.
    f.get('elPadreVive')!.setValue('VIVE');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(f.get('padrePrimerNombre')!.value).toBe('JUAN');
    expect(f.get('padrePrimerNombre')!.enabled).toBeTrue();
  });

  it('RF-039: cambiar el estado del padre NO altera el nombre de la madre (y viceversa)', async () => {
    await abrirFormulario();
    await irAlPaso(2);
    const f = comp.formHojaDeVida2;
    f.get('padrePrimerNombre')!.setValue('JUAN');
    f.get('padrePrimerApellido')!.setValue('PEREZ');
    f.get('madrePrimerNombre')!.setValue('MARIA');
    f.get('madrePrimerApellido')!.setValue('GOMEZ');

    // Cambiar padre a NO LO CONOCE (vacía SOLO al padre).
    f.get('elPadreVive')!.setValue('NO LO CONOCE');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(f.get('madrePrimerNombre')!.value).withContext('la madre no debe tocarse').toBe('MARIA');
    expect(f.get('madrePrimerApellido')!.value).toBe('GOMEZ');
    expect(f.get('madrePrimerNombre')!.enabled).toBeTrue();

    // Y al revés: cambiar la madre no toca al padre (recordado tras NO LO CONOCE).
    f.get('elPadreVive')!.setValue('VIVE');
    f.get('madreVive')!.setValue('NO LO CONOCE');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(f.get('padrePrimerNombre')!.value).withContext('el padre no debe tocarse').toBe('JUAN');
    expect(f.get('padrePrimerNombre')!.enabled).toBeTrue();
  });

  it('finalizar con pendientes muestra el resumen TOTAL por pasos y NO llama al backend', async () => {
    await abrirFormulario();
    // Fechas de identidad válidas para que el candado específico de fechas no
    // tape el resumen general.
    comp.formHojaDeVida2.get('fechaNacimiento')!.setValue(new Date(1990, 0, 15));
    comp.formHojaDeVida2.get('fechaExpedicionCC')!.setValue(new Date(2010, 5, 20));

    const svc: any = TestBed.inject(RegistroProcesoContratacion);
    const spyUpsert = spyOn(svc, 'crearActualizarCandidato2').and.callThrough();

    await comp.imprimirInformacion2();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(spyUpsert).withContext('con pendientes no debe enviarse nada').not.toHaveBeenCalled();
    const swal = document.body.querySelector('.swal2-container');
    expect(swal).withContext('debe abrirse el resumen').not.toBeNull();
    const texto = swal!.textContent || '';
    expect(texto).toContain('por completar');
    expect(texto).toContain('Paso 1');
    (document.body.querySelector('.swal2-confirm') as HTMLButtonElement | null)?.click();
    await fixture.whenStable();
  });

  // ------------------------------------------------------------------
  // Finalizar exige TODOS los pasos: con cualquier faltante se bloquea
  // (resumen por pasos) y NO se envía nada; completo, sí guarda.
  // ------------------------------------------------------------------
  describe('finalizar con información faltante en pasos anteriores', () => {
    /** Deja el formulario COMPLETO y válido (base del control positivo). */
    async function llenarTodoValido() {
      const f = comp.formHojaDeVida2;
      const set = (k: string, v: any) => f.get(k)!.setValue(v);

      // Paso 1 — identificación y contacto
      set('fuenteVacante', 'FACEBOOK');
      set('oficina', 'FACA_PRIMERA');
      set('tipoDoc', 'CC');
      set('numeroCedula', '1023456789');
      set('fechaNacimiento', new Date(1990, 0, 15));
      set('fechaExpedicionCC', new Date(2010, 5, 20));
      set('departamentoNacimiento', 'Cundinamarca');
      set('departamentoExpedicionCC', 'Cundinamarca');
      set('pNombre', 'IVAN'); set('pApellido', 'BERMUDEZ');
      set('genero', 'M'); set('estadoCivil', 'SO');
      set('departamento', 'Cundinamarca');
      fixture.detectChanges(); await fixture.whenStable();
      // Las ciudades en cascada nacen deshabilitadas; al elegir depto se habilitan.
      for (const c of ['ciudad', 'municipioNacimiento', 'municipioExpedicionCC']) {
        const ctrl = f.get(c)!;
        if (ctrl.disabled) ctrl.enable({ emitEvent: false });
        ctrl.setValue('Funza');
      }
      set('zonaResidencia', 'CENTRO');
      set('direccionResidencia', 'CL 12 33 24');
      set('numCelular', '3101234567'); set('numWha', '3101234567');
      set('conQuienViveChecks', ['PADRES']);
      set('tiempoResidenciaZona', '1 AÑO');
      set('correoUsuario', 'ivan'); set('correoDominio', 'GMAIL.COM');
      set('escolaridad', 'SIN ESTUDIOS'); // sin detalle académico obligatorio
      set('expectativasVidaChecks', ['CASA PROPIA']);

      // Paso 2 — detalles
      set('rh', 'O+'); set('lateralidad', 'D');
      // RF-029: tallas numéricas por sexo (M) + prenda.
      set('tallaCamisa', '38'); set('tallaPantalon', '32');
      set('tallaChaqueta', '38'); set('tallaCalzado', '40');
      // RF-032: residencia anterior estructurada (tiempo != TODO LA VIDA => requerida).
      set('departamentoResidenciaAnterior', 'Cundinamarca');
      set('municipioResidenciaAnterior', 'Madrid');
      set('barrioResidenciaAnterior', 'CENTRO');
      set('direccionResidenciaAnterior', 'CL 9 8 7');
      set('razonCambioResidencia', 'TRABAJO');
      // RF-033/035: contacto de emergencia estructurado + ubicación.
      set('emergenciaPrimerNombre', 'MARIA');
      set('emergenciaPrimerApellido', 'PEREZ');
      set('parentescoFamiliarEmergencia', 'HE');
      set('telefonoFamiliarEmergencia', '3111234567');
      set('departamentoEmergencia', 'Cundinamarca');
      set('municipioEmergencia', 'Funza');
      set('barrioFamiliarEmergencia', 'SUR');
      set('direccionFamiliarEmergencia', 'CL 1 2 3');
      set('estudiaActualmente', 'NO');

      // Paso 3 — familia y referencias (padres sin detalle obligatorio)
      set('elPadreVive', 'NO LO CONOCE');
      set('madreVive', 'NO LO CONOCE');
      // RF-040: nombre de referencia en componentes (primer nombre/apellido obligatorios).
      set('refPersonal1PrimerNombre', 'JUAN'); set('refPersonal1PrimerApellido', 'PEREZ');
      set('telefonoReferencia1', '3200000001');
      set('direccionReferenciaPersonal1', 'CL 1 1 1');
      set('parentescoReferenciaPersonal1', 'HE');
      set('refPersonal2PrimerNombre', 'ANA'); set('refPersonal2PrimerApellido', 'GOMEZ');
      set('telefonoReferencia2', '3200000002');
      set('direccionReferenciaPersonal2', 'CL 2 2 2');
      set('parentescoReferenciaPersonal2', 'HE');
      set('refFamiliar1PrimerNombre', 'LUISA'); set('refFamiliar1PrimerApellido', 'CASTRO');
      set('telefonoReferenciaFamiliar1', '3300000001');
      set('direccionReferenciaFamiliar1', 'CL 3 3 3');
      set('parentescoReferenciaFamiliar1', 'HE');
      set('refFamiliar2PrimerNombre', 'PEDRO'); set('refFamiliar2PrimerApellido', 'RIOS');
      set('telefonoReferenciaFamiliar2', '3300000002');
      set('direccionReferenciaFamiliar2', 'CL 4 4 4');
      set('parentescoReferenciaFamiliar2', 'HE');

      // Paso 4 — experiencia, hijos, vivienda
      set('experienciaLaboral', 'NO');
      set('numHijosDependientes', 0);
      set('familiaSolo', 'SI');
      set('personas_a_cargo', ['NINGUNA']);
      set('tiposViviendaChecks', ['ARRIENDO']);
      set('numeroHabitaciones', '3');
      set('personasPorHabitacion', '2');
      set('caracteristicasVivienda', 'LADRILLO');
      set('comodidadesChecks', ['AGUA']);
      // RF-049: evaluación ocupacional ahora obligatoria (paso 4).
      set('relacionFamiliar', 'BUENA');
      set('desempenoLaboral', 'BUENO');
      set('felicitaciones', 'PUNTUALIDAD');
      set('situacionConflictiva', 'NO');
      set('actividadesDiferentes', 'SI');

      fixture.detectChanges();
      await fixture.whenStable();
    }

    const swalTexto = () => document.body.querySelector('.swal2-container')?.textContent || '';
    async function cerrarSwal() {
      (document.body.querySelector('.swal2-confirm') as HTMLButtonElement | null)?.click();
      await fixture.whenStable();
    }

    /** Finaliza y devuelve si se llamó al guardado del backend. */
    async function finalizar(): Promise<jasmine.Spy> {
      const svc: any = TestBed.inject(RegistroProcesoContratacion);
      const spy = (svc.crearActualizarCandidato2 as jasmine.Spy).calls
        ? svc.crearActualizarCandidato2
        : spyOn(svc, 'crearActualizarCandidato2').and.callThrough();
      spy.calls.reset();
      await comp.imprimirInformacion2();
      fixture.detectChanges();
      await fixture.whenStable();
      return spy;
    }

    it('control positivo: con TODO diligenciado sí se envía al backend', async () => {
      await abrirFormulario();
      await llenarTodoValido();
      expect(comp.formHojaDeVida2.valid)
        .withContext('el helper debe dejar el formulario válido; si falla, revisar qué control quedó inválido: '
          + Object.keys(comp.formHojaDeVida2.controls).filter(k => comp.formHojaDeVida2.get(k)!.invalid).join(', '))
        .toBeTrue();
      const spy = await finalizar();
      expect(spy).toHaveBeenCalled();
      await cerrarSwal();
    });

    it('falta el correo (paso 1): bloquea con el resumen y NO envía', async () => {
      await abrirFormulario();
      await llenarTodoValido();
      comp.formHojaDeVida2.get('correoUsuario')!.setValue('');
      const spy = await finalizar();
      expect(spy).not.toHaveBeenCalled();
      expect(swalTexto()).toContain('por completar');
      expect(swalTexto()).toContain('Paso 1');
      await cerrarSwal();
    });

    it('falta el RH (paso 2): bloquea y NO envía', async () => {
      await abrirFormulario();
      await llenarTodoValido();
      comp.formHojaDeVida2.get('rh')!.setValue('');
      const spy = await finalizar();
      expect(spy).not.toHaveBeenCalled();
      expect(swalTexto()).toContain('Paso 2');
      await cerrarSwal();
    });

    it('falta una referencia (paso 3): bloquea y NO envía', async () => {
      await abrirFormulario();
      await llenarTodoValido();
      // RF-040: el nombre obligatorio vive en el componente primer nombre.
      comp.formHojaDeVida2.get('refPersonal1PrimerNombre')!.setValue('');
      const spy = await finalizar();
      expect(spy).not.toHaveBeenCalled();
      expect(swalTexto()).toContain('Paso 3');
      await cerrarSwal();
    });

    it('falta vivienda (paso 4): bloquea y NO envía', async () => {
      await abrirFormulario();
      await llenarTodoValido();
      comp.formHojaDeVida2.get('caracteristicasVivienda')!.setValue('');
      const spy = await finalizar();
      expect(spy).not.toHaveBeenCalled();
      expect(swalTexto()).toContain('Paso 4');
      await cerrarSwal();
    });

    it('RF-049: evaluación ocupacional vacía (paso 4) bloquea y NO envía', async () => {
      await abrirFormulario();
      await llenarTodoValido();
      // Una pregunta de evaluación sin responder debe bloquear la finalización.
      comp.formHojaDeVida2.get('relacionFamiliar')!.setValue('');
      const spy = await finalizar();
      expect(spy).not.toHaveBeenCalled();
      expect(swalTexto()).toContain('Paso 4');
      await cerrarSwal();
      // 'NO' es una respuesta válida (no debe tratarse como vacío).
      comp.formHojaDeVida2.get('relacionFamiliar')!.setValue('BUENA');
      comp.formHojaDeVida2.get('actividadesDiferentes')!.setValue('NO');
      expect(comp.formHojaDeVida2.get('actividadesDiferentes')!.valid).toBeTrue();
    });

    it('condicional cónyuge: CASADO sin datos del cónyuge bloquea', async () => {
      await abrirFormulario();
      await llenarTodoValido();
      comp.formHojaDeVida2.get('estadoCivil')!.setValue('CA');
      fixture.detectChanges(); await fixture.whenStable();
      const spy = await finalizar();
      expect(spy).not.toHaveBeenCalled();
      expect(swalTexto()).toContain('por completar');
      await cerrarSwal();
    });

    it('condicional padre VIVE sin dirección bloquea', async () => {
      await abrirFormulario();
      await llenarTodoValido();
      comp.formHojaDeVida2.get('elPadreVive')!.setValue('VIVE');
      fixture.detectChanges(); await fixture.whenStable();
      const spy = await finalizar();
      expect(spy).not.toHaveBeenCalled();
      expect(swalTexto()).toContain('Paso 3');
      await cerrarSwal();
    });

    it('condicional hijos: 2 hijos con tarjetas vacías bloquea listando cada hijo', async () => {
      await abrirFormulario();
      await llenarTodoValido();
      comp.formHojaDeVida2.get('numHijosDependientes')!.setValue(2);
      fixture.detectChanges(); await fixture.whenStable();
      const spy = await finalizar();
      expect(spy).not.toHaveBeenCalled();
      expect(swalTexto()).toContain('Hijo 1');
      await cerrarSwal();
    });
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

  // ------------------------------------------------------------------
  // Aviso "dominio en el Usuario del correo": ADVERTENCIA, nunca error.
  // ------------------------------------------------------------------
  describe('aviso de dominio en el usuario del correo', () => {
    /** Fija usuario + dominio y deja el DOM estable. */
    async function ponerCorreo(usuario: string, dominio = 'GMAIL.COM') {
      comp.formHojaDeVida2.get('correoUsuario')!.setValue(usuario);
      comp.formHojaDeVida2.get('correoDominio')!.setValue(dominio);
      fixture.detectChanges();
      await fixture.whenStable();
    }
    const aviso = () => fixture.nativeElement.querySelector('.email-warning');
    const campoWarn = () => fixture.nativeElement.querySelector('.email-row .check-field.field-warn');

    it('ivvan + GMAIL.COM: sin aviso y el correo se arma', async () => {
      await abrirFormulario();
      await ponerCorreo('ivvan');
      expect(comp.avisoDominioEnUsuario).toBeFalse();
      expect(aviso()).toBeNull();
      expect(campoWarn()).toBeNull();
      expect(comp.formHojaDeVida2.get('correo')!.value).toBe('IVVAN@GMAIL.COM');
    });

    it('ivvangmail.com: avisa (amarillo) pero el control SIGUE VÁLIDO y el correo se arma igual', async () => {
      await abrirFormulario();
      await ponerCorreo('ivvangmail.com');
      expect(comp.avisoDominioEnUsuario).toBeTrue();
      expect(aviso()).withContext('debe pintarse el mensaje').not.toBeNull();
      expect(aviso()!.textContent).toContain('parte anterior al @');
      expect(campoWarn()).withContext('el campo debe llevar .field-warn').not.toBeNull();
      // La advertencia NO invalida ni bloquea: sin errores en el control y el
      // correo se arma tal cual (eso deja VER el error en la vista previa).
      expect(comp.formHojaDeVida2.get('correoUsuario')!.valid).toBeTrue();
      expect(comp.formHojaDeVida2.get('correoUsuario')!.errors).toBeNull();
      expect(comp.formHojaDeVida2.get('correo')!.value).toBe('IVVANGMAIL.COM@GMAIL.COM');
    });

    it('MAYÚSCULAS: IVVANGMAIL.COM también avisa', async () => {
      await abrirFormulario();
      await ponerCorreo('IVVANGMAIL.COM');
      expect(comp.avisoDominioEnUsuario).toBeTrue();
      expect(comp.formHojaDeVida2.get('correoUsuario')!.valid).toBeTrue();
    });

    it('otro dominio del catálogo (ivvanoutlook.com) avisa aunque el elegido sea GMAIL.COM', async () => {
      await abrirFormulario();
      await ponerCorreo('ivvanoutlook.com', 'GMAIL.COM');
      expect(comp.avisoDominioEnUsuario).toBeTrue();
    });

    it('un @ (valor precargado) avisa; el validador previo sigue intacto', async () => {
      await abrirFormulario();
      await ponerCorreo('ivvan@gmail.com');
      expect(comp.avisoDominioEnUsuario).toBeTrue();
      expect(aviso()).not.toBeNull();
      // La regla de negocio EXISTENTE no se toca: @ sigue siendo error del
      // validador (el aviso no la reemplaza ni la duplica en rojo).
      expect(comp.formHojaDeVida2.get('correoUsuario')!.hasError('arrobaEnUsuario')).toBeTrue();
    });

    it('reactividad: el aviso aparece y desaparece al corregir, sin residuo', async () => {
      await abrirFormulario();
      await ponerCorreo('ivvan');
      expect(aviso()).toBeNull();
      await ponerCorreo('ivvangmail.com');
      expect(aviso()).not.toBeNull();
      await ponerCorreo('ivvan');
      expect(aviso()).toBeNull();
      expect(campoWarn()).toBeNull();
      expect(comp.formHojaDeVida2.get('correo')!.value).toBe('IVVAN@GMAIL.COM');
    });

    it('accesibilidad: el aviso queda atado al input por aria-describedby', async () => {
      await abrirFormulario();
      await ponerCorreo('ivvangmail.com');
      const input: HTMLInputElement | null =
        fixture.nativeElement.querySelector('.email-row .check-field.field-warn input');
      expect(input).not.toBeNull();
      expect(input!.getAttribute('aria-describedby') || '').toContain('aviso-correo-usuario');
      expect(aviso()!.id).toBe('aviso-correo-usuario');
    });
  });
});

// La regla de detección es una función pura: se prueba aparte, sin TestBed.
describe('detectarDominioEnUsuario (regla pura de la advertencia)', () => {
  const CATALOGO = ['GMAIL.COM', 'HOTMAIL.COM', 'OUTLOOK.COM', 'YAHOO.COM', 'ICLOUD.COM'];

  const CASOS: Array<[string, boolean, string]> = [
    ['ivvan', false, 'usuario normal'],
    ['juan.perez', false, 'los puntos de usuario no molestan'],
    ['ivvangmail', false, 'marca sin dominio completo: no ser agresivos'],
    ['ivvanhotmail', false, 'marca sin dominio completo'],
    ['', false, 'vacío'],
    ['ivvangmail.com', true, 'dominio del catálogo concatenado'],
    ['IVVANGMAIL.COM', true, 'insensible a mayúsculas'],
    ['ivvanGMAIL.COM', true, 'mezcla de mayúsculas'],
    ['ivvanoutlook.com', true, 'otro dominio del catálogo'],
    ['ivvanyahoo.com', true, 'otro dominio del catálogo'],
    ['ivvanicloud.com', true, 'otro dominio del catálogo'],
    ['ivvan@gmail.com', true, 'correo completo'],
    ['ivvan@', true, 'arroba suelta'],
    ['ivvan@gmail', true, 'arroba con dominio a medias'],
    ['ivvan gmail.com', true, 'espacio antes del dominio'],
    ['ivvan @gmail.com', true, 'espacio y arroba'],
    ['ivvangmail.com ', true, 'espacio al final'],
    [' ivvangmail.com', true, 'espacio al inicio'],
    ['ivvangmail.comgmail.com', true, 'dominio repetido'],
    ['ivvan@gmail.com@gmail.com', true, 'doble arroba'],
    ['ivvan..gmail.com', true, 'puntos dobles con dominio'],
    ['ivvangmail.com.com', true, 'dominio malformado con .com extra'],
    ['ivvanlatinmail.com', true, 'dominio FUERA del catálogo: cae por el TLD .COM'],
  ];

  for (const [entrada, esperado, motivo] of CASOS) {
    it(`"${entrada}" → ${esperado ? 'avisa' : 'no avisa'} (${motivo})`, () => {
      expect(detectarDominioEnUsuario(entrada, CATALOGO)).toBe(esperado);
    });
  }

  it('el catálogo real del formulario también detecta dominios .EDU.CO', () => {
    expect(detectarDominioEnUsuario('pepitomisena.edu.co', ['MISENA.EDU.CO'])).toBeTrue();
  });
});
