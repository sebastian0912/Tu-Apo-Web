import { RegistroProcesoContratacion } from './../../services/registro-proceso-contratacion/registro-proceso-contratacion';
import {
  Component,
  Inject,
  OnInit,
  PLATFORM_ID,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ValidationErrors,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';

import Swal from 'sweetalert2';
import { degrees, PDFCheckBox, PDFDocument, PDFTextField, rgb, StandardFonts } from 'pdf-lib';
import { firstValueFrom, Subject, merge } from 'rxjs';
import { debounceTime, startWith, takeUntil } from 'rxjs/operators';

import { SharedModule } from '../../../../../../shared/shared-module';
import { DocumentManagementS } from '../../../../../../shared/services/document-management-s/document-management-s';
import { CandidateS } from '../../../../../../shared/services/candidate-s/candidate-s';
import { PoliciesModal } from '../../components/policies-modal/policies-modal';
import { ParametrizacionS } from '../../services/parametrizacion/parametrizacion-s';
import { AddressBuilderDialog } from '../../components/address-builder-dialog/address-builder-dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

export const MY_DATE_FORMATS = {
  parse: { dateInput: 'D/M/YYYY' },
  display: {
    dateInput: 'D/M/YYYY',
    monthYearLabel: 'MMMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

type BulItem = {
  id: string;
  tabla: string;
  datos: Record<string, any>;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
};

type Option = { value: string; viewValue: string };

@Component({
  selector: 'app-form-vacancies',
  standalone: true,
  imports: [
    SharedModule,
    FormsModule,
    ReactiveFormsModule,
    MatProgressBarModule,
    MatStepperModule,
    MatDialogModule,
  ],
  templateUrl: './form-vacancies.html',
  styleUrls: ['./form-vacancies.css'],
  providers: [
    { provide: DateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE] },
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },
    { provide: MAT_DATE_LOCALE, useValue: 'es-CO' },
  ],
})
export class FormVacancies implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('stepper') private stepper?: MatStepper;

  // Cambia el nombre si quieres versionar
  private readonly DRAFT_KEY_BASE = 'formVacanciesDraft:v1';
  // ✅ Progreso estable del stepper (evita NG0100 si el HTML usa estas vars)
  stepperTotal = 0;
  stepperIndex = 0;
  stepperProgress = 0;

  private readonly destroy$ = new Subject<void>();

  formHojaDeVida2!: FormGroup;

  datos: any;
  ciudadesResidencia: string[] = [];
  ciudadesExpedicionCC: string[] = [];
  ciudadesNacimiento: string[] = [];

  guardarObjeti: string | undefined;
  guardarObjeti2: string | undefined;
  guardarObjeti3: string | undefined;

  firma: string | undefined;
  numeroCedula!: any;

  archivos: any = [];
  mostrarCamposAdicionales = false;

  mostrarSubirHojaVida = false;
  mostrarCamposVehiculo = false;
  mostrarCamposTrabajo = false;
  mostrarParientes = false;
  mostrarDeportes = false;
  mostrarCamposHermanos = false;

  categoriasLicencia = ['A1', 'A2', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3'];
  tiposContrato = ['Fijo', 'Indefinido', 'Prestación de servicios', 'Obra o labor'];

  uploadedFiles: { [key: string]: { file: File; fileName: string } } = {};
  typeMap: { [key: string]: number } = {
    hojaDeVida: 28,
    hojaDeVidaGenerada: 28,
  };

  opcionesPromocion: string[] = [];
  tipoDocs: Array<{ abbreviation: string; description: string }> = [];
  generos: string[] = [];

  haceCuantoViveEnlaZona: any[] = [];
  estadosCiviles: Array<{ codigo: string; descripcion: string }> = [];
  listadoDeNacionalidades: any[] = [];
  listamanos: Array<{ mano: string; descripcion: string }> = [];

  tiposVivienda: string[] = [];
  tiposVivienda2: string[] = [];
  caracteristicasVivienda: string[] = [];
  comodidades: string[] = [];
  expectativasVida: string[] = [];

  listaEscolaridad: string[] = [];
  listaEscoText: any[] = [];
  tallas: string[] = [];
  tallasCalzado: string[] = [];

  listaParentescosFamiliares: string[] = [];
  Ocupacion: string[] = [];

  listaMotivosRetiro: any[] = [];
  listaAreas: any[] = [];
  listaCalificaciones: any[] = [];
  listaDuracion: any[] = [];

  listatiposVivienda: string[] = [];
  listaPosiblesRespuestasConquienVive: string[] = [];
  listaPersonasQueCuidan: string[] = [];
  listaPosiblesRespuestasPersonasACargo: string[] = [];

  opcionesDeExperiencia: any[] = [];
  tiempoTrabajado: any[] = [];
  cursosDespuesColegio: any[] = [];

  // ✅ NUEVOS: vienen de catálogo bulk
  areasExperiencia: string[] = []; // AREAS_EXPERIENCIA

  listatiposdesangre: string[] = [];

  oficinaBloqueada = false;

  // ✅ BULK
  loadingCatalogos = false;

  private readonly CATALOGOS = [
    'SEXO',
    'DOMINANCIA_MANUAL',
    'PARENTESCOS_FAMILIARES',
    'OCUPACIONES',
    'CATALOGO_NIVELES_ESCOLARIDAD',
    'TALLA_ROPA',
    'TALLAS_CALZADO',
    'CATALOGO_CON_QUIEN_VIVE',
    'CATALOGO_PERSONAS_ACARGO',
    'CATALOGO_TIPOS_VIVIENDA',
    'CATALOGO_CARACTERISTICAS_VIVIENDA',
    'CATALOGO_SERVICIOS',
    'CATALOGO_MARKETING',
    'ESTADOS_CIVILES',
    'RH',
    'TIPOS_IDENTIFICACION',

    // ✅ AGREGADOS
    'AREAS_EXPERIENCIA',
    'TIEMPO_EXPERIENCIA',
    'EXPECTATIVAS_VIDA',
    'HACE_CUENTO_ZONA',
    'CUIDADOR_HIJOS',
    'ESTUDIOS',
  ] as const;

  // ✅ BULK llena esto
  personasACargoOptions: string[] = [];

  // ✅ patrón para direcciones (las llena el modal)
  private readonly ADDRESS_RX = /^[A-Z0-9#\-./ ]{6,120}$/;

  // -------------------------
  // ✅ Etiquetas normalizadas (popup “Formulario incompleto”)
  // -------------------------
  private readonly FIELD_LABELS: Record<string, string> = {
    tipoDoc: 'Tipo de documento',
    numeroCedula: 'Número de documento de identidad',
    pApellido: 'Primer apellido',
    sApellido: 'Segundo apellido',
    pNombre: 'Primer nombre',
    sNombre: 'Segundo nombre',
    genero: 'Sexo',
    correo: 'Correo electrónico',
    numCelular: 'Número de celular',
    numWha: 'Número de WhatsApp',
    departamento: 'Departamento donde vive',
    ciudad: 'Municipio donde vive',
    estadoCivil: 'Estado Civil',
    direccionResidencia: 'Dirección de Residencia',
    zonaResidencia: 'En que zona (barrio) vive',
    fechaExpedicionCC: 'Fecha de Expedición CC',
    departamentoExpedicionCC: 'Departamento de Expedición CC',
    municipioExpedicionCC: 'Municipio de Expedición CC',
    departamentoNacimiento: 'Departamento de Nacimiento',
    municipioNacimiento: 'Municipio de Nacimiento',
    rh: 'Rh',
    lateralidad: 'Zurdo/Diestro',
    tiempoResidenciaZona: '¿Hace cuánto vive en la zona?',
    lugarAnteriorResidencia: 'Lugar anterior de residencia',
    razonCambioResidencia: '¿Por qué cambió de ciudad de residencia?',
    zonasConocidas: '¿Qué zonas del país conoce?',
    preferenciaResidencia: '¿Dónde le gustaría vivir?',
    fechaNacimiento: 'Fecha de Nacimiento',
    estudiaActualmente: '¿Estudia actualmente?',
    familiarEmergencia: 'Nombre familiar En caso de emergencia',
    parentescoFamiliarEmergencia: 'Parentesco',
    direccionFamiliarEmergencia: 'Dirección del Familiar en Caso de Emergencia',
    barrioFamiliarEmergencia: 'Barrio o municipio del Familiar en Caso de Emergencia',
    telefonoFamiliarEmergencia: 'Teléfono del Familiar en Caso de Emergencia',
    ocupacionFamiliar_Emergencia: 'Ocupación del Familiar en Caso de Emergencia',
    oficina: 'Seleccione la oficina donde está',

    escolaridad: 'Escolaridad',
    nombreInstitucion: 'Nombre de la Institución',
    anoFinalizacion: 'Año de Finalización',
    tituloObtenido: 'Título Obtenido',
    estudiosExtrasSelect: 'Estudios adicionales',

    tallaChaqueta: 'Chaqueta',
    tallaPantalon: 'Pantalón',
    tallaCamisa: 'Camisa',
    tallaCalzado: 'Calzado',

    nombresConyuge: 'Nombres (Cónyuge)',
    apellidosConyuge: 'Apellidos (Cónyuge)',
    viveConyuge: '¿Vive? (Cónyuge)',
    documentoIdentidadConyuge: 'No. Doc. Identidad (Cónyuge)',
    direccionConyuge: 'Dirección (Cónyuge)',
    telefonoConyuge: 'Teléfono (Cónyuge)',
    barrioConyuge: 'Barrio o municipio (Cónyuge)',
    ocupacionConyuge: 'Ocupación (Cónyuge)',

    nombrePadre: 'Nombre Padre',
    elPadreVive: '¿Vive? (Padre)',
    ocupacionPadre: 'Ocupación Padre',
    direccionPadre: 'Dirección Padre',
    telefonoPadre: 'Teléfono Padre',
    barrioPadre: 'Barrio o municipio Padre',

    nombreMadre: 'Nombre Madre',
    madreVive: '¿Vive? (Madre)',
    ocupacionMadre: 'Ocupación Madre',
    direccionMadre: 'Dirección Madre',
    telefonoMadre: 'Teléfono Madre',
    barrioMadre: 'Barrio o Municipio Madre',

    nombreReferenciaPersonal1: 'Nombre Referencia Personal 1',
    telefonoReferencia1: 'Teléfono Referencia Personal 1',
    ocupacionReferencia1: 'Ocupación Referencia Personal 1',
    direccionReferenciaPersonal1: 'Dirección Referencia Personal 1',
    tiempoConoceReferenciaPersonal1: 'Tiempo que conoce a la referencia personal 1',

    nombreReferenciaPersonal2: 'Nombre Referencia Personal 2',
    telefonoReferencia2: 'Teléfono Referencia Personal 2',
    ocupacionReferencia2: 'Ocupación Referencia Personal 2',
    direccionReferenciaPersonal2: 'Dirección Referencia Personal 2',
    tiempoConoceReferenciaPersonal2: 'Tiempo que conoce a la referencia personal 2',

    nombreReferenciaFamiliar1: 'Nombre Referencia Familiar 1',
    telefonoReferenciaFamiliar1: 'Teléfono Referencia Familiar 1',
    ocupacionReferenciaFamiliar1: 'Ocupación Referencia Familiar 1',
    direccionReferenciaFamiliar1: 'Dirección Referencia Familiar 1',
    parentescoReferenciaFamiliar1: 'Parentesco con la referencia familiar 1',

    nombreReferenciaFamiliar2: 'Nombre Referencia Familiar 2',
    telefonoReferenciaFamiliar2: 'Teléfono Referencia Familiar 2',
    ocupacionReferenciaFamiliar2: 'Ocupación Referencia Familiar 2',
    direccionReferenciaFamiliar2: 'Dirección Referencia Familiar 2',
    parentescoReferenciaFamiliar2: 'Parentesco con la referencia familiar 2',

    experienciaLaboral: '¿Tiene experiencia laboral?',
    nombreEmpresa1: 'Nombre Empresa',
    direccionEmpresa1: 'Dirección Empresa',
    telefonosEmpresa1: 'Teléfonos Empresa',
    nombreJefe1: 'Nombre Jefe Inmediato',
    cargoEmpresa1: 'Cargo que se desempeñaba',
    areaExperiencia: '¿En qué área tiene experiencia?',
    fechaRetiro1: 'Fecha de Retiro 1',
    tiempoExperiencia: 'Tiempo de experiencia',
    motivoRetiro1: 'Motivo de Retiro',
    empresas_laborado: 'Empresas de flores que ha trabajado',

    numHijosDependientes: 'Número de hijos que dependen económicamente',
    cuidadorHijos: '¿Quién cuida a los hijos?',
    conQuienViveChecks: '¿Con quién vive?',
    familiaSolo: '¿Familia con un solo ingreso?',
    personas_a_cargo: 'Personas a cargo',
    tiposViviendaChecks: '¿Tipo de vivienda?',
    numeroHabitaciones: 'Número de Habitaciones',
    personasPorHabitacion: 'Número de Personas por Habitación',
    caracteristicasVivienda: 'Características de la Vivienda',
    comodidadesChecks: '¿Comodidades en la vivienda?',
    fuenteVacante: 'Cómo se enteró de la vacante',

    deseaGenerar: '¿Desea generar su hoja de vida?',
    hojaDeVida: 'Hoja de Vida',
    tieneVehiculo: '¿Tiene vehículo?',
    licenciaConduccion: 'Licencia de conducción Nº',
    categoriaLicencia: 'Categoría de la licencia',
    estaTrabajando: '¿Está trabajando actualmente?',
    empresaActual: 'Empresa',
    tipoTrabajo: '¿Empleado o independiente?',
    tipoContrato: 'Tipo de contrato',
    trabajoAntes: '¿Trabajó antes en esta empresa?',
    solicitoAntes: '¿Solicitó empleo antes en esta empresa?',
    tieneHermanos: '¿Tiene hermanos?',
    numeroHermanos: '¿Cuántos hermanos?',

    expectativasVidaChecks: 'Expectativas de Vida',
  };

  // -------------------------
  // ✅ Validadores anti-basura
  // -------------------------
  private readonly NAME_PART_RX =
    /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:['-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/;

  private normalizeSpaces(s: string): string {
    return String(s ?? '').replace(/\s+/g, ' ').trim();
  }

  private stripDiacritics(s: string): string {
    return String(s ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private normalizeAddress(v: any): string {
    let s = this.normalizeSpaces(String(v ?? '')).toUpperCase();
    s = this.stripDiacritics(s);

    s = s
      .replace(/\bAVENIDA\s+CALLE\b/g, 'AC')
      .replace(/\bAVENIDA\s+CARRERA\b/g, 'AK')
      .replace(/\bCALLE\b/g, 'CL')
      .replace(/\bCARRERA\b/g, 'CR')
      .replace(/\bAVENIDA\b/g, 'AV')
      .replace(/\bDIAGONAL\b/g, 'DG')
      .replace(/\bTRANSVERSAL\b/g, 'TV')
      .replace(/\bTRONCAL\b/g, 'TR')
      .replace(/\bKILOMETRO\b/g, 'KM')
      .replace(/\bAUTOPISTA\b/g, 'AUT')
      .replace(/\bNRO\b|\bNUMERO\b|\bNO\b/g, '');

    s = s.replace(/\s*#\s*/g, ' # ');
    s = s.replace(/\s*-\s*/g, '-');
    s = s.replace(/\s*\/\s*/g, '/');

    s = s.replace(/[^A-Z0-9#\-./ ]+/g, ' ');
    s = this.normalizeSpaces(s);

    if (s.length > 120) s = s.slice(0, 120).trim();

    return s;
  }

  openAddressModal(controlName: string, label: string): void {
    const ctrl = this.formHojaDeVida2.get(controlName);
    if (!ctrl) return;

    const ref = this.dialog.open(AddressBuilderDialog, {
      maxWidth: '95vw',
      autoFocus: true,
      restoreFocus: true,
      disableClose: false,
      data: {
        initialValue: String(ctrl.value ?? ''),
      },
    });

    ref.afterClosed().subscribe((result) => {
      if (!result) return;

      // ✅ aquí ya viene DIAN limpio
      const cleaned = typeof result === 'string' ? this.normalizeAddress(result) : (result?.dian ?? '');

      if (!cleaned) return;

      ctrl.setValue(cleaned);
      ctrl.markAsTouched();
      ctrl.markAsDirty();
      ctrl.updateValueAndValidity({ emitEvent: false });
    });
  }

  private toDate(v: any): Date | null {
    if (!v) return null;
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    if (typeof v?.toDate === 'function') {
      const d = v.toDate();
      if (d instanceof Date && !isNaN(d.getTime())) return d;
    }
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d;
    return null;
  }

  private toYmd(v: any): string {
    if (!v) return '';
    if (typeof v?.format === 'function') return String(v.format('YYYY-MM-DD') ?? '').trim();
    const d = this.toDate(v);
    if (!d) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private nameValidator(minWords = 1, maxWords = 4) {
    return (c: AbstractControl): ValidationErrors | null => {
      const raw = this.normalizeSpaces(c.value);
      if (!raw) return null;

      const parts = raw.split(' ').filter(Boolean);

      if (parts.length < minWords) return { nameMinWords: { minWords } };
      if (parts.length > maxWords) return { nameMaxWords: { maxWords } };

      const short = parts.find((p) => p.length < 2);
      if (short) return { nameShortWord: { word: short } };

      const bad = parts.find((p) => !this.NAME_PART_RX.test(p));
      if (bad) return { nameBadChars: { word: bad } };

      return null;
    };
  }

  private fullNameValidator() {
    return this.nameValidator(2, 6);
  }

  private phoneCOValidator() {
    return (c: AbstractControl): ValidationErrors | null => {
      const raw = String(c.value ?? '').trim();
      if (!raw) return null;
      const digits = raw.replace(/\D+/g, '');

      if (/^3\d{9}$/.test(digits)) return null;
      if (/^\d{7}$/.test(digits)) return null;
      if (/^60[1-8]\d{7}$/.test(digits)) return null;

      return { phoneCO: true };
    };
  }

  private docIdValidator() {
    return (c: AbstractControl): ValidationErrors | null => {
      const raw = String(c.value ?? '').trim();
      if (!raw) return null;

      const parent = c.parent;
      const tipo = String(parent?.get('tipoDoc')?.value ?? '').trim().toUpperCase();

      if (tipo === 'CC') {
        const digits = raw.replace(/\D+/g, '');
        if (!/^\d{6,12}$/.test(digits)) return { docId: true };
        return null;
      }

      const compact = raw.replace(/\s+/g, '').toUpperCase();
      if (!/^[A-Z0-9]{4,20}$/.test(compact)) return { docId: true };
      return null;
    };
  }

  private dateReasonableValidator(minYear = 1900) {
    return (c: AbstractControl): ValidationErrors | null => {
      const d = this.toDate(c.value);
      if (!d) return null;

      const now = new Date();
      if (d > now) return { dateFuture: true };
      if (d.getFullYear() < minYear) return { dateMinYear: true };

      return null;
    };
  }

  private graduationYearValidator(minYear = 1950) {
    return (c: AbstractControl): ValidationErrors | null => {
      const d = this.toDate(c.value);
      if (!d) return null;

      const y = d.getFullYear();
      const nowY = new Date().getFullYear();

      if (y < minYear) return { yearMin: true };
      if (y > nowY) return { yearMax: true };

      return null;
    };
  }

  private groupCrossValidator() {
    return (group: AbstractControl): ValidationErrors | null => {
      if (!(group instanceof FormGroup)) return null;

      const fn = group.get('fechaNacimiento')?.value;
      const fe = group.get('fechaExpedicionCC')?.value;

      const dn = this.toDate(fn);
      const de = this.toDate(fe);

      if (dn && de) {
        if (de < dn) return { expeditionBeforeBirth: true };

        const ageAtExp = de.getFullYear() - dn.getFullYear();
        if (ageAtExp < 7) return { expeditionTooEarly: true };
      }

      return null;
    };
  }

  private labelForPath(path: string): string {
    const p = String(path ?? '').trim();
    if (!p) return p;

    const mEdad = /^edadHijo(\d+)$/.exec(p);
    if (mEdad) return `Edad del hijo ${mEdad[1]}`;

    const mArr = /^(hijos|hermanos)\[(\d+)\]\.(.+)$/.exec(p);
    if (mArr) {
      const arrName = mArr[1];
      const idx = Number(mArr[2] ?? 0);
      const field = mArr[3];
      const n = idx + 1;

      if (arrName === 'hijos') {
        const inner: Record<string, string> = {
          nombreHijo: 'Nombre del Hijo',
          sexoHijo: 'Sexo del Hijo',
          fechaNacimientoHijo: 'Fecha de Nacimiento del Hijo',
          docIdentidadHijo: 'Documento de Identidad del Hijo',
          ocupacionHijo: 'Ocupación del Hijo',
          cursoHijo: 'Curso del Hijo',
        };
        return `Hijos > Hijo ${n} > ${inner[field] ?? field}`;
      }

      if (arrName === 'hermanos') {
        const inner: Record<string, string> = {
          nombre: 'Nombre',
          profesion: 'Profesión/ocupación/oficio',
          telefono: 'Teléfono',
        };
        return `Hermanos > Hermano ${n} > ${inner[field] ?? field}`;
      }
    }

    return this.FIELD_LABELS[p] ?? p;
  }
  private readonly isBrowser: any;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private gestionDocumentosService: DocumentManagementS,
    private candidateS: CandidateS,
    private route: ActivatedRoute,
    private parametrizacionS: ParametrizacionS,
    private registroProcesoContratacion: RegistroProcesoContratacion,

    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);

    const addrOpt = [Validators.minLength(6), Validators.maxLength(120), Validators.pattern(this.ADDRESS_RX)];
    const addrReq = [Validators.required, ...addrOpt];

    this.formHojaDeVida2 = new FormGroup(
      {
        tipoDoc: new FormControl('', [Validators.required]),
        numeroCedula: new FormControl('', [Validators.required, this.docIdValidator()]),

        pApellido: new FormControl('', [Validators.required, this.nameValidator(1, 4)]),
        sApellido: new FormControl('', [this.nameValidator(1, 4)]),

        pNombre: new FormControl('', [Validators.required, this.nameValidator(1, 4)]),
        sNombre: new FormControl('', [this.nameValidator(1, 4)]),

        genero: new FormControl('', Validators.required),
        correo: new FormControl('', [Validators.required, Validators.email]),

        numCelular: new FormControl('', [Validators.required, this.phoneCOValidator()]),
        numWha: new FormControl('', [Validators.required, this.phoneCOValidator()]),

        departamento: new FormControl('', Validators.required),
        ciudad: new FormControl({ value: '', disabled: true }, Validators.required),

        estadoCivil: new FormControl('', Validators.required),

        direccionResidencia: new FormControl('', Validators.required),
        zonaResidencia: new FormControl('', [Validators.required, Validators.minLength(3)]),

        fechaExpedicionCC: new FormControl('', [Validators.required, this.dateReasonableValidator(1900)]),
        departamentoExpedicionCC: new FormControl('', Validators.required),
        municipioExpedicionCC: new FormControl({ value: '', disabled: true }, Validators.required),

        departamentoNacimiento: new FormControl('', Validators.required),
        municipioNacimiento: new FormControl({ value: '', disabled: true }, Validators.required),

        rh: new FormControl('', Validators.required),
        lateralidad: new FormControl('', Validators.required),

        tiempoResidenciaZona: new FormControl('', Validators.required),
        lugarAnteriorResidencia: new FormControl('', [Validators.required, Validators.minLength(3)]),
        razonCambioResidencia: new FormControl('', [Validators.required, Validators.minLength(5)]),
        zonasConocidas: new FormControl('', [Validators.required, Validators.minLength(3)]),
        preferenciaResidencia: new FormControl('', [Validators.required, Validators.minLength(3)]),

        fechaNacimiento: new FormControl('', [Validators.required, this.dateReasonableValidator(1900)]),

        familiarEmergencia: new FormControl('', [Validators.required, this.fullNameValidator()]),
        parentescoFamiliarEmergencia: new FormControl('', Validators.required),

        direccionFamiliarEmergencia: new FormControl('', Validators.required),

        barrioFamiliarEmergencia: new FormControl('', [Validators.required, Validators.minLength(3)]),
        telefonoFamiliarEmergencia: new FormControl('', [Validators.required, this.phoneCOValidator()]),
        ocupacionFamiliar_Emergencia: new FormControl('', Validators.required),

        oficina: new FormControl(  '' , Validators.required),

        estudiaActualmente: new FormControl('', Validators.required),

        escolaridad: new FormControl('', Validators.required),
        nombreInstitucion: new FormControl('', Validators.required),
        anoFinalizacion: new FormControl('', [Validators.required, this.graduationYearValidator(1950)]),
        tituloObtenido: new FormControl('', Validators.required),

        // ✅ SOLO queda el multi-select
        estudiosExtrasSelect: new FormControl<string[]>([]),

        tallaChaqueta: new FormControl('', Validators.required),
        tallaPantalon: new FormControl('', Validators.required),
        tallaCamisa: new FormControl('', Validators.required),
        tallaCalzado: new FormControl('', Validators.required),

        nombresConyuge: new FormControl('', [this.nameValidator(1, 6)]),
        apellidosConyuge: new FormControl('', [this.nameValidator(1, 6)]),
        viveConyuge: new FormControl(''),
        documentoIdentidadConyuge: new FormControl('', []),

        direccionConyuge: new FormControl('',),

        telefonoConyuge: new FormControl('', [this.phoneCOValidator()]),
        barrioConyuge: new FormControl('', []),
        ocupacionConyuge: new FormControl('', []),

        nombrePadre: new FormControl('', [Validators.required, this.fullNameValidator()]),
        elPadreVive: new FormControl('', Validators.required),
        ocupacionPadre: new FormControl('', []),

        direccionPadre: new FormControl(''),

        telefonoPadre: new FormControl('', [this.phoneCOValidator()]),
        barrioPadre: new FormControl('', []),

        nombreMadre: new FormControl('', [Validators.required, this.fullNameValidator()]),
        madreVive: new FormControl('', Validators.required),
        ocupacionMadre: new FormControl('', []),

        direccionMadre: new FormControl(''),

        telefonoMadre: new FormControl('', [this.phoneCOValidator()]),
        barrioMadre: new FormControl('', []),

        nombreReferenciaPersonal1: new FormControl('', [Validators.required, this.fullNameValidator()]),
        telefonoReferencia1: new FormControl('', [Validators.required, this.phoneCOValidator()]),
        ocupacionReferencia1: new FormControl('', [Validators.required, Validators.minLength(2)]),
        tiempoConoceReferenciaPersonal1: new FormControl('', Validators.required),

        direccionReferenciaPersonal1: new FormControl('', Validators.required),

        nombreReferenciaPersonal2: new FormControl('', [Validators.required, this.fullNameValidator()]),
        telefonoReferencia2: new FormControl('', [Validators.required, this.phoneCOValidator()]),
        ocupacionReferencia2: new FormControl('', [Validators.required, Validators.minLength(2)]),
        tiempoConoceReferenciaPersonal2: new FormControl('', Validators.required),

        direccionReferenciaPersonal2: new FormControl('', Validators.required),

        nombreReferenciaFamiliar1: new FormControl('', [Validators.required, this.fullNameValidator()]),
        telefonoReferenciaFamiliar1: new FormControl('', [Validators.required, this.phoneCOValidator()]),
        ocupacionReferenciaFamiliar1: new FormControl('', [Validators.required, Validators.minLength(2)]),
        parentescoReferenciaFamiliar1: new FormControl('', Validators.required),

        direccionReferenciaFamiliar1: new FormControl('', Validators.required),

        nombreReferenciaFamiliar2: new FormControl('', [Validators.required, this.fullNameValidator()]),
        telefonoReferenciaFamiliar2: new FormControl('', [Validators.required, this.phoneCOValidator()]),
        ocupacionReferenciaFamiliar2: new FormControl('', [Validators.required, Validators.minLength(2)]),
        parentescoReferenciaFamiliar2: new FormControl('', Validators.required),

        direccionReferenciaFamiliar2: new FormControl('', Validators.required),

        experienciaLaboral: new FormControl('', Validators.required),

        nombreEmpresa1: new FormControl('', [Validators.minLength(2)]),

        direccionEmpresa1: new FormControl(''),

        telefonosEmpresa1: new FormControl('', [this.phoneCOValidator()]),
        nombreJefe1: new FormControl('', [this.fullNameValidator()]),
        fechaRetiro1: new FormControl('', [this.dateReasonableValidator(1900)]),

        tiempoExperiencia: new FormControl(''),

        motivoRetiro1: new FormControl('', []),
        cargoEmpresa1: new FormControl('', []),
        empresas_laborado: new FormControl('', []),
        rendimiento: new FormControl('', []),
        porqueRendimiento: new FormControl('', []),

        numHijosDependientes: new FormControl('', [Validators.required, Validators.min(0), Validators.max(5)]),
        cuidadorHijos: new FormControl(''),
        hijos: this.fb.array([]),

        familiaSolo: new FormControl('', Validators.required),
        numeroHabitaciones: new FormControl('', Validators.required),
        personasPorHabitacion: new FormControl('', Validators.required),
        caracteristicasVivienda: new FormControl('', Validators.required),

        areaExperiencia: new FormControl([]),

        personas_a_cargo: new FormControl([], Validators.required),

        conQuienViveChecks: new FormControl([], Validators.required),
        tiposViviendaChecks: new FormControl([], Validators.required),
        comodidadesChecks: new FormControl([], Validators.required),

        expectativasVidaChecks: new FormControl([], Validators.required),

        fuenteVacante: new FormControl('', Validators.required),

        deseaGenerar: new FormControl(false),
        hojaDeVida: new FormControl(''),

        tieneVehiculo: new FormControl(''),
        licenciaConduccion: new FormControl(''),
        categoriaLicencia: new FormControl([]),
        estaTrabajando: new FormControl(''),
        empresaActual: new FormControl(''),
        tipoTrabajo: new FormControl(''),
        tipoContrato: new FormControl(''),
        trabajoAntes: new FormControl(''),
        solicitoAntes: new FormControl(''),

        tieneParientes: new FormControl(''),
        nombrePariente: new FormControl(''),

        aficiones: new FormControl(''),
        practicaDeportes: new FormControl(''),
        cualDeporte: new FormControl(''),

        tieneHermanos: new FormControl(''),
        numeroHermanos: new FormControl(''),
        hermanos: this.fb.array([]),
      },
      { validators: this.groupCrossValidator() }
    );

    this.formHojaDeVida2.get('viveConyuge')?.valueChanges.subscribe((v) => {
      const dir = this.formHojaDeVida2.get('direccionConyuge');
      if (!dir) return;

      const addrOpt2 = [Validators.minLength(6), Validators.maxLength(120), Validators.pattern(this.ADDRESS_RX)];
      const val = String(v ?? '').toUpperCase().trim();

      if (val === 'SI') {
        dir.setValidators([Validators.required, ...addrOpt2]);
      } else {
        dir.clearValidators();
        dir.setValue('', { emitEvent: false });
      }
      dir.updateValueAndValidity({ emitEvent: false });
    });

    this.route.queryParamMap.subscribe((params) => {
      const oficinaParam = (params.get('oficina') || '').toUpperCase().trim();
      if (oficinaParam && Array.isArray(this.oficinas) && this.oficinas.includes(oficinaParam)) {
        this.formHojaDeVida2.get('oficina')?.setValue(oficinaParam);
        this.oficinaBloqueada = true;
      }
    });

    this.escucharNumeroDeHijos();

    // ✅ Ajuste por escolaridad: si es SIN ESTUDIOS, limpia y deshabilita el multi-select (ya no hay FormArray)
    this.formHojaDeVida2.get('escolaridad')?.valueChanges.subscribe((value) => {
      const estudiosCtrl = this.formHojaDeVida2.get('estudiosExtrasSelect') as FormControl;

      if (value === 'SIN ESTUDIOS') {
        estudiosCtrl.setValue([], { emitEvent: false });
        estudiosCtrl.disable({ emitEvent: false });

        this.formHojaDeVida2.get('nombreInstitucion')?.clearValidators();
        this.formHojaDeVida2.get('anoFinalizacion')?.clearValidators();
        this.formHojaDeVida2.get('tituloObtenido')?.clearValidators();
      } else {
        estudiosCtrl.enable({ emitEvent: false });

        this.formHojaDeVida2.get('nombreInstitucion')?.setValidators([Validators.required]);
        this.formHojaDeVida2
          .get('anoFinalizacion')
          ?.setValidators([Validators.required, this.graduationYearValidator(1950)]);
        this.formHojaDeVida2.get('tituloObtenido')?.setValidators([Validators.required]);
      }

      this.formHojaDeVida2.get('nombreInstitucion')?.updateValueAndValidity({ emitEvent: false });
      this.formHojaDeVida2.get('anoFinalizacion')?.updateValueAndValidity({ emitEvent: false });
      this.formHojaDeVida2.get('tituloObtenido')?.updateValueAndValidity({ emitEvent: false });
    });

    this.formHojaDeVida2.get('tipoDoc')?.valueChanges.subscribe(() => {
      this.formHojaDeVida2.get('numeroCedula')?.updateValueAndValidity({ emitEvent: false });
    });
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    Promise.resolve().then(() => {
      const s = this.stepper;
      if (!s) return;

      const compute = () => {
        const total = s.steps?.length ?? 0;
        const index = total ? s.selectedIndex + 1 : 0;

        this.stepperTotal = total;
        this.stepperIndex = index;
        this.stepperProgress = total ? (index / total) * 100 : 0;

        this.cdr.markForCheck();
      };

      merge(s.selectionChange, s.steps.changes)
        .pipe(startWith(null), takeUntil(this.destroy$))
        .subscribe(() => Promise.resolve().then(compute));

      compute();
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // -------------------------
  // ✅ BULK normalizador robusto
  // -------------------------
  private str(v: any): string {
    return String(v ?? '').trim();
  }

  private valFromDatos(d: any): string {
    return this.str(d?.codigo ?? d?.abbreviation ?? d?.value ?? d?.valor ?? d?.talla ?? d?.nombre ?? d?.name ?? d?.id ?? '');
  }

  private labelFromDatos(d: any): string {
    return this.str(
      d?.descripcion ??
      d?.description ??
      d?.label ??
      d?.nombre ??
      d?.name ??
      d?.talla ??
      d?.codigo ??
      this.valFromDatos(d) ??
      ''
    );
  }

  private buildOptions(items: BulItem[] = []): Option[] {
    const seen = new Set<string>();

    return (items || [])
      .filter((i) => i?.activo !== false)
      .map((i) => {
        const datos = i?.datos ?? {};
        const value = this.valFromDatos(datos);
        const viewValue = this.labelFromDatos(datos);
        return { value, viewValue };
      })
      .filter((o) => {
        if (!o.value) return false;
        const k = o.value.toUpperCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .sort((a, b) => a.viewValue.localeCompare(b.viewValue, 'es', { sensitivity: 'base' }));
  }

  private getDatosArray(results: Record<string, BulItem[]>, codigo: string): BulItem[] {
    const arr = results?.[codigo] ?? [];
    return Array.isArray(arr) ? arr : [];
  }

  private cargarCatalogosBulk(): void {
    this.loadingCatalogos = true;

    this.parametrizacionS.bulkValores([...(this.CATALOGOS as any)], true).subscribe({
      next: (resp) => {
        const results = (resp?.results ?? {}) as Record<string, BulItem[]>;

        const tiposIdOpt = this.buildOptions(this.getDatosArray(results, 'TIPOS_IDENTIFICACION'));
        this.tipoDocs = tiposIdOpt
          .map((o) => ({ abbreviation: o.value, description: o.viewValue || o.value }))
          .filter((x) => x.abbreviation);

        const sexoOpt = this.buildOptions(this.getDatosArray(results, 'SEXO'));
        this.generos = sexoOpt.map((o) => o.viewValue || o.value).filter(Boolean);

        const rhOpt = this.buildOptions(this.getDatosArray(results, 'RH'));
        this.listatiposdesangre = rhOpt.map((o) => o.viewValue || o.value).filter(Boolean);

        const estCivOpt = this.buildOptions(this.getDatosArray(results, 'ESTADOS_CIVILES'));
        this.estadosCiviles = estCivOpt.map((o) => ({ codigo: o.value, descripcion: o.viewValue || o.value })).filter((x) => x.codigo);

        const manosOpt = this.buildOptions(this.getDatosArray(results, 'DOMINANCIA_MANUAL'));
        this.listamanos = manosOpt.map((o) => ({ mano: o.value, descripcion: o.viewValue || o.value })).filter((x) => x.mano);

        const parentOpt = this.buildOptions(this.getDatosArray(results, 'PARENTESCOS_FAMILIARES'));
        this.listaParentescosFamiliares = parentOpt.map((o) => o.viewValue || o.value).filter(Boolean);

        const ocupOpt = this.buildOptions(this.getDatosArray(results, 'OCUPACIONES'));
        this.Ocupacion = ocupOpt.map((o) => o.viewValue || o.value).filter(Boolean);

        const escOpt = this.buildOptions(this.getDatosArray(results, 'CATALOGO_NIVELES_ESCOLARIDAD'));
        this.listaEscolaridad = escOpt.map((o) => o.viewValue || o.value).filter(Boolean);

        const ropaOpt = this.buildOptions(this.getDatosArray(results, 'TALLA_ROPA'));
        this.tallas = ropaOpt.map((o) => o.viewValue || o.value).filter(Boolean);

        const calzadoOpt = this.buildOptions(this.getDatosArray(results, 'TALLAS_CALZADO'));
        this.tallasCalzado = calzadoOpt.map((o) => o.viewValue || o.value).filter(Boolean);

        const servOpt = this.buildOptions(this.getDatosArray(results, 'CATALOGO_SERVICIOS'));
        this.comodidades = servOpt.map((o) => o.viewValue || o.value).filter(Boolean);

        const marketingOpt = this.buildOptions(this.getDatosArray(results, 'CATALOGO_MARKETING'));
        this.opcionesPromocion = marketingOpt.map((o) => o.viewValue || o.value).filter(Boolean);

        const viveOpt = this.buildOptions(this.getDatosArray(results, 'CATALOGO_CON_QUIEN_VIVE'));
        this.listaPosiblesRespuestasConquienVive = viveOpt.map((o) => o.viewValue || o.value).filter(Boolean);

        const cargoOpt = this.buildOptions(this.getDatosArray(results, 'CATALOGO_PERSONAS_ACARGO'));
        const cargoList = cargoOpt.map((o) => o.viewValue || o.value).filter(Boolean);
        this.personasACargoOptions = [...cargoList];
        this.listaPosiblesRespuestasPersonasACargo = [...cargoList];

        const tvOpt = this.buildOptions(this.getDatosArray(results, 'CATALOGO_TIPOS_VIVIENDA'));
        const tvList = tvOpt.map((o) => o.viewValue || o.value).filter(Boolean);
        this.tiposVivienda = [...tvList];
        this.listatiposVivienda = [...tvList];

        const carVivOpt = this.buildOptions(this.getDatosArray(results, 'CATALOGO_CARACTERISTICAS_VIVIENDA'));
        this.caracteristicasVivienda = carVivOpt.map((o) => o.viewValue || o.value).filter(Boolean);

        const areasExpOpt = this.buildOptions(this.getDatosArray(results, 'AREAS_EXPERIENCIA'));
        const areasList = areasExpOpt.map((o) => o.viewValue || o.value).filter(Boolean);
        this.areasExperiencia = [...areasList];
        this.listaAreas = [...areasList];

        const tiempoExpOpt = this.buildOptions(this.getDatosArray(results, 'TIEMPO_EXPERIENCIA'));
        const tiempoList = tiempoExpOpt.map((o) => o.viewValue || o.value).filter(Boolean);
        this.tiempoTrabajado = [...tiempoList];
        this.listaDuracion = [...tiempoList];

        const expVidaOpt = this.buildOptions(this.getDatosArray(results, 'EXPECTATIVAS_VIDA'));
        this.expectativasVida = expVidaOpt.map((o) => o.viewValue || o.value).filter(Boolean);

        const haceCuantoViveEnlaZonaOpt = this.buildOptions(this.getDatosArray(results, 'HACE_CUENTO_ZONA'));
        this.haceCuantoViveEnlaZona = haceCuantoViveEnlaZonaOpt.map((o) => o.viewValue || o.value).filter(Boolean);

        const listaPersonasQueCuidanOpt = this.buildOptions(this.getDatosArray(results, 'CUIDADOR_HIJOS'));
        this.listaPersonasQueCuidan = listaPersonasQueCuidanOpt.map((o) => o.viewValue || o.value).filter(Boolean);

        if (Array.isArray(resp?.missing) && resp.missing.length) console.warn('[CATALOGOS missing]', resp.missing);

        // ✅ opciones del multi-select
        const estudiosOpt = this.buildOptions(this.getDatosArray(results, 'ESTUDIOS'));
        this.cursosDespuesColegio = estudiosOpt.map((o) => o.viewValue || o.value).filter(Boolean);

        this.loadingCatalogos = false;
      },
      error: () => (this.loadingCatalogos = false),
    });
  }

  // -------------------------
  // PDF utils
  // -------------------------
  async listFormFields() {
    const pdfUrl = '../../assets/Archivos/minerva2.pdf';
    const arrayBuffer = await fetch(pdfUrl).then((res) => res.arrayBuffer());
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    const form = pdfDoc.getForm();
    const fields = form.getFields();
    const fieldDetails = fields
      .map((field) => {
        const type = field.constructor.name;
        const name = field.getName();
        let additionalDetails = '';

        if (field instanceof PDFTextField) additionalDetails = ` - Value: ${field.getText()}`;
        else if (field instanceof PDFCheckBox) additionalDetails = ` - Is Checked: ${field.isChecked()}`;

        return `Field na: ${name}, Field type: ${type}${additionalDetails}`;
      })
      .join('\n');

    const blob = new Blob([fieldDetails], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = 'pdfFieldsDetails.txt';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
  }

  async addWatermarkToPdf(pdfBytes: Uint8Array, watermarkText: string): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const pages = pdfDoc.getPages();
    for (const page of pages) {
      const { width, height } = page.getSize();

      page.drawText(watermarkText, {
        x: width / 2 - 230,
        y: height / 2 - 250,
        size: 62,
        font: helveticaFont,
        color: rgb(152 / 255, 227 / 255, 57 / 255),
        opacity: 0.2,
        rotate: degrees(45),
      });
    }
    return await pdfDoc.save();
  }

  // -------------------------
  // Upload / view
  // -------------------------
  onFileUpload(event: Event, fileType: string) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.uploadedFiles[fileType] = { file, fileName: file.name };
    }
  }

  verArchivo(campo: string) {
    const archivo = this.uploadedFiles[campo];

    if (archivo && archivo.file) {
      if (typeof (archivo.file as any) === 'string') {
        const fileUrl = encodeURI(archivo.file as any);
        window.open(fileUrl, '_blank');
      } else if (archivo.file instanceof File) {
        const fileUrl = URL.createObjectURL(archivo.file);
        window.open(fileUrl, '_blank');
        setTimeout(() => URL.revokeObjectURL(fileUrl), 100);
      }
    } else {
      Swal.fire('Error', 'No se pudo encontrar el archivo para este campo', 'error');
    }
  }

  subirArchivo(event: any, campo: string) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      if (file.name.length > 100) {
        Swal.fire('Error', 'El nombre del archivo no debe exceder los 100 caracteres', 'error');
        this.resetInput(input);
        return;
      }
      this.uploadedFiles[campo] = { file, fileName: file.name };
    }

    this.resetInput(input);
  }

  private resetInput(input: HTMLInputElement): void {
    const newInput = input.cloneNode(true) as HTMLInputElement;
    input.parentNode?.replaceChild(newInput, input);
  }

  downloadPDF(pdfBytes: Uint8Array, filename: string) {
    const ab = pdfBytes.buffer as ArrayBuffer;
    const slice = ab.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength);

    const blob = new Blob([slice], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  }

  // -------------------------
  // LocalStorage (solo browser)
  // -------------------------
  guardarCambiosEnLocalStorage(form: FormGroup, key: string): void {
    if (!isPlatformBrowser(this.platformId)) return;

    form.valueChanges.subscribe((val) => {
      const numeroCedula = this.formHojaDeVida2.get('numeroCedula')?.value;
      if (numeroCedula) {
        localStorage.setItem(key, JSON.stringify(val));
        localStorage.setItem('numeroCedula', numeroCedula);
      }
    });
  }

  cargarDatosGuardados(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const formHojaDeVida2Data = localStorage.getItem('formHojaDeVida2');
    const numeroCedulaLocalStorage = localStorage.getItem('numeroCedula');

    if (this.numeroCedula == numeroCedulaLocalStorage) {
      if (formHojaDeVida2Data) this.formHojaDeVida2.patchValue(JSON.parse(formHojaDeVida2Data));
    }
  }

  get hermanosArray(): FormArray {
    return this.formHojaDeVida2.get('hermanos') as FormArray;
  }

  limpiarCamposHermanos() {
    this.formHojaDeVida2.patchValue({ numeroHermanos: '' });
    this.hermanosArray.clear();
  }

  openDialog(): void {
    const dialogRef = this.dialog.open(PoliciesModal, { disableClose: true });
    dialogRef.afterClosed().subscribe(() => { });
  }



  async ngOnInit(): Promise<void> {
    // ✅ Si NO quieres autoguardado, comenta esta línea
    // this.initDraftLocalStorage(this.formHojaDeVida2);
    this.cargarDatosJSON();
    this.cargarCatalogosBulk();

    try {
      this.escucharCambiosEnDepartamento();
    } catch (e) { }

    this.formHojaDeVida2.get('numHijosDependientes')!.valueChanges.subscribe((numHijos) => {
      this.actualizarEdadesHijos(numHijos);
    });

    // ✅ YA NO se construye FormArray de estudiosExtras (porque lo quitaste del HTML)
    // (No hay subscription aquí)

    this.formHojaDeVida2.get('tieneHermanos')?.valueChanges.subscribe((tieneHermanos: string) => {
      if (tieneHermanos === 'SI') {
        this.mostrarCamposHermanos = true;
      } else {
        this.mostrarCamposHermanos = false;
        this.limpiarCamposHermanos();
      }
    });

    this.formHojaDeVida2.get('numeroHermanos')?.valueChanges.subscribe((numeroHermanos: number) => {
      const hermanosArray = this.hermanosArray;
      hermanosArray.clear();

      for (let i = 0; i < (numeroHermanos || 0); i++) {
        hermanosArray.push(
          this.fb.group({
            nombre: ['', [Validators.required, this.fullNameValidator()]],
            profesion: ['', [Validators.required, Validators.minLength(2)]],
            telefono: ['', [Validators.required, this.phoneCOValidator()]],
          })
        );
      }
    });

    this.formHojaDeVida2.get('deseaGenerar')?.valueChanges.subscribe((deseaGenerar: boolean) => {
      if (!deseaGenerar) this.limpiarCamposAdicionales();
    });

    this.guardarCambiosEnLocalStorage(this.formHojaDeVida2, 'formHojaDeVida2');
  }

  // =========================================================
  // ✅ LocalStorage Draft (load + autosave)
  // =========================================================
  private initDraftLocalStorage(form: FormGroup): void {
    if (!this.isBrowser) return;

    const storageKey = this.buildDraftKey(form);

    // 1) Cargar draft si existe
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        const draft = JSON.parse(raw);
        this.applyDraftToForm(form, draft);
      } catch {
        // si está corrupto, lo quitamos para no bloquear
        localStorage.removeItem(storageKey);
      }
    }

    // 2) Autosave (evita escribir si no cambia)
    let lastSaved = '';
    form.valueChanges
      .pipe(debounceTime(400), takeUntil(this.destroy$))
      .subscribe(() => {
        const payload = this.sanitizeForStorage(form.getRawValue());
        const str = JSON.stringify(payload);

        if (str !== lastSaved) {
          localStorage.setItem(storageKey, str);
          lastSaved = str;
        }
      });

  }

  // Key por cédula (si está), si no usa una genérica
  private buildDraftKey(form: FormGroup): string {
    const doc =
      (form.get('numero_documento')?.value ??
        form.get('numeroCedula')?.value ??
        form.get('numerodeceduladepersona')?.value ??
        '') + '';

    const docClean = doc.trim();
    return docClean ? `${this.DRAFT_KEY_BASE}:${docClean}` : this.DRAFT_KEY_BASE;
  }

  // Quita cosas sensibles/no serializables
  private sanitizeForStorage(value: any): any {
    const walk = (v: any): any => {
      if (v === null || v === undefined) return v;

      // files/blobs: no guardar
      if (typeof File !== 'undefined' && v instanceof File) return null;
      if (typeof Blob !== 'undefined' && v instanceof Blob) return null;

      if (Array.isArray(v)) return v.map(walk);

      if (typeof v === 'object') {
        const out: any = {};
        for (const [k, val] of Object.entries(v)) {
          // no guardes password ni campos sensibles si quieres
          if (k.toLowerCase() === 'password') continue;
          out[k] = walk(val);
        }
        return out;
      }

      return v; // string/number/boolean
    };

    return walk(value);
  }

  // Aplica draft al FormGroup + reconstruye FormArray
  private applyDraftToForm(form: FormGroup, draft: any): void {
    if (!draft || typeof draft !== 'object') return;

    // 1) Primero: arrays (para que existan antes de patch)
    for (const [key, val] of Object.entries(draft)) {
      const ctrl = form.get(key);
      if (ctrl instanceof FormArray && Array.isArray(val)) {
        this.rebuildFormArray(ctrl, val);
      }
    }

    // 2) Luego: patch normal
    form.patchValue(draft, { emitEvent: false });

    // 3) Limpieza visual
    form.updateValueAndValidity({ emitEvent: false });
    form.markAsPristine();
    form.markAsUntouched();
  }

  // Reconstruye un FormArray clonando la estructura del primer item (si existe)
  private rebuildFormArray(arr: FormArray, items: any[]): void {
    const template = arr.length ? arr.at(0) : null;

    arr.clear({ emitEvent: false });

    for (const item of items) {
      if (template) {
        const cloned = this.cloneControl(template);
        // set values sin disparar cambios
        if (cloned instanceof FormGroup) cloned.patchValue(item ?? {}, { emitEvent: false });
        else if (cloned instanceof FormControl) cloned.setValue(item ?? null, { emitEvent: false });
        arr.push(cloned, { emitEvent: false });
      } else {
        // si no hay template, crea algo básico
        arr.push(new FormControl(item ?? null), { emitEvent: false });
      }
    }
  }

  // Clona control preservando validators/estructura
  // Clona control preservando validators/estructura
  private cloneControl(control: AbstractControl): AbstractControl {
    if (control instanceof FormControl) {
      return new FormControl(control.value, control.validator, control.asyncValidator);
    }

    if (control instanceof FormGroup) {
      const g = new FormGroup<Record<string, AbstractControl>>(
        {},
        { validators: control.validator ?? undefined, asyncValidators: control.asyncValidator ?? undefined }
      );

      for (const [name, child] of Object.entries(control.controls)) {
        g.addControl(name, this.cloneControl(child));
      }
      return g;
    }

    if (control instanceof FormArray) {
      const a = new FormArray<AbstractControl>(
        [],
        { validators: control.validator ?? undefined, asyncValidators: control.asyncValidator ?? undefined }
      );

      // clonamos 1 elemento como template si existe
      if (control.length) a.push(this.cloneControl(control.at(0)));
      return a;
    }

    return control;
  }

  limpiarCamposAdicionales() {
    this.formHojaDeVida2.patchValue({
      tieneVehiculo: null,
      licenciaConduccion: null,
      categoriaLicencia: null,
      estaTrabajando: null,
      empresaActual: null,
      tipoTrabajo: null,
      tipoContrato: null,
      trabajoAntes: null,
      solicitoAntes: null,
      tieneHermanos: null,
      numeroHermanos: null,
    });

    delete this.uploadedFiles['hojaDeVida'];
    this.hermanosArray.clear();
  }

  subirTodosLosArchivos(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const archivosAEnviar = Object.keys(this.uploadedFiles)
        .filter((key) => {
          const fileData = this.uploadedFiles[key];
          if (!(key in this.typeMap)) {
            return false;
          }
          return fileData && fileData.file;
        })
        .map((key) => ({
          key,
          ...this.uploadedFiles[key],
          typeId: this.typeMap[key],
        }));

      if (archivosAEnviar.length === 0) {
        resolve(true);
        return;
      }

      const promesasDeSubida = archivosAEnviar.map(({ key, file, fileName, typeId }) => {
        return new Promise<void>((resolveSubida, rejectSubida) => {
          this.gestionDocumentosService.guardarDocumento(fileName, this.numeroCedula, typeId, file).subscribe({
            next: () => resolveSubida(),
            error: (error: any) => {
              rejectSubida(`Error al subir archivo "${key}": ${error.message}`);
            },
          });
        });
      });

      Promise.all(promesasDeSubida)
        .then(() => resolve(true))
        .catch((error) => {
          reject(error);
        });
    });
  }

  // -------------------------
  // ✅ ENVIAR + POPUP NORMALIZADO
  // -------------------------
  async imprimirInformacion2(): Promise<void> {
    if (this.formHojaDeVida2.get('departamento')?.value) {
      this.formHojaDeVida2.get('ciudad')?.enable({ emitEvent: false });
    }
    if (this.formHojaDeVida2.get('departamentoExpedicionCC')?.value) {
      this.formHojaDeVida2.get('municipioExpedicionCC')?.enable({ emitEvent: false });
    }
    if (this.formHojaDeVida2.get('departamentoNacimiento')?.value) {
      this.formHojaDeVida2.get('municipioNacimiento')?.enable({ emitEvent: false });
    }

    this.formHojaDeVida2.markAllAsTouched();
    this.formHojaDeVida2.updateValueAndValidity({ emitEvent: false });

    if (this.formHojaDeVida2.invalid) {
      const invalidFields: string[] = [];
      const groupMessages: string[] = [];

      const GROUP_ERROR_LABELS: Record<string, string> = {
        expeditionBeforeBirth:
          'Revisa fechas: la Fecha de Expedición CC no puede ser anterior a la Fecha de Nacimiento.',
        expeditionTooEarly:
          'Revisa fechas: la Fecha de Expedición CC es demasiado cercana a la Fecha de Nacimiento (mínimo 7 años).',
      };

      const walk = (ctrl: AbstractControl, path: string) => {
        if (ctrl instanceof FormGroup) {
          Object.keys(ctrl.controls).forEach((k) => walk(ctrl.controls[k], path ? `${path}.${k}` : k));

          if (ctrl.errors) {
            Object.keys(ctrl.errors).forEach((errKey) => {
              if (!path) groupMessages.push(GROUP_ERROR_LABELS[errKey] ?? `Validación general pendiente: ${errKey}`);
              else groupMessages.push(`${this.labelForPath(path)}: ${GROUP_ERROR_LABELS[errKey] ?? errKey}`);
            });
          }
          return;
        }

        if (ctrl instanceof FormArray) {
          ctrl.controls.forEach((c, i) => walk(c, `${path}[${i}]`));
          if (ctrl.errors) {
            Object.keys(ctrl.errors).forEach((errKey) =>
              groupMessages.push(`${this.labelForPath(path)}: ${errKey}`)
            );
          }
          return;
        }

        if (ctrl.invalid && path) invalidFields.push(path);
      };

      walk(this.formHojaDeVida2, '');

      const uniq = Array.from(new Set(invalidFields));
      const prettyControls = Array.from(new Set(uniq.map((p) => this.labelForPath(p))));
      const prettyGroups = Array.from(new Set(groupMessages));
      const pretty = Array.from(new Set([...prettyGroups, ...prettyControls])).filter(Boolean);

      await Swal.fire({
        icon: 'warning',
        title: 'Formulario incompleto',
        html: `
        <div style="text-align:left;margin-top:8px;color:#1f2937;font-size:13px;line-height:1.4;">
          <div style="margin:0 0 10px 0;color:#4b5563;">Completa los campos obligatorios:</div>

          <div style="max-height:50vh;overflow:auto;padding-right:6px;margin-right:-6px;">
            <div style="display:grid;grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));gap:8px;">
              ${pretty
            .map(
              (x) => `
                  <div style="
                    padding:10px 12px;border:1px solid rgba(0,0,0,.08);border-radius:12px;background:rgba(0,0,0,.02);
                    display:flex;align-items:flex-start;gap:10px;">
                    <span style="width:8px;height:8px;border-radius:999px;background:#f59e0b;margin-top:6px;flex:0 0 8px;"></span>
                    <div style="font-weight:600;color:#111827;">${x}</div>
                  </div>
                `
            )
            .join('')}
            </div>
          </div>

          <div style="margin-top:12px;padding-top:10px;border-top:1px solid rgba(0,0,0,.06);color:#6b7280;font-size:12px;">
            Tip: ve completando de arriba hacia abajo para que no se te escape ninguno.
          </div>
        </div>
      `,
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#111827',
        showCloseButton: true,
        width: 720,
        customClass: {
          popup: 'swal-min',
          title: 'swal-title-min',
          confirmButton: 'swal-btn-min',
        },
      });

      return;
    }

    const raw: any = this.formHojaDeVida2.getRawValue();
    const correo = String(raw?.correo ?? '').trim().toLowerCase();
    const cedula = String(raw?.numeroCedula ?? '').trim();

    try {
      const res: any = await firstValueFrom(this.candidateS.validarCorreoCedula(correo, cedula));
      if (res?.correo_repetido) {
        await Swal.fire({
          title: '¡Correo duplicado!',
          text: 'El correo ingresado ya se encuentra registrado por otra persona, tiene que cambiarlo',
          icon: 'error',
          confirmButtonText: 'Aceptar',
        });
        return;
      }
    } catch (e) {
      await Swal.fire({
        title: 'Error',
        text: 'No se pudo validar el correo en este momento. Intenta de nuevo.',
        icon: 'error',
        confirmButtonText: 'Aceptar',
      });
      return;
    }

    this.numeroCedula = raw?.numeroCedula ?? this.numeroCedula;

    const ea = raw?.estudiaActualmente;
    const estudiaActualmente =
      ea && typeof ea === 'object'
        ? (ea.display ?? ea.value ?? ea.codigo ?? ea.descripcion ?? '')
        : (ea ?? '');

    const datosAEnviar: any = {
      tipoDoc: raw?.tipoDoc,
      numeroCedula: raw?.numeroCedula,

      pApellido: raw?.pApellido,
      sApellido: raw?.sApellido,
      pNombre: raw?.pNombre,
      sNombre: raw?.sNombre,
      genero: raw?.genero,

      correo,
      numCelular: raw?.numCelular,
      numWha: raw?.numWha,

      departamento: raw?.departamento,
      ciudad: raw?.ciudad ?? '',

      estadoCivil: raw?.estadoCivil,
      direccionResidencia: raw?.direccionResidencia,
      barrio: raw?.zonaResidencia,

      fechaExpedicionCc: this.toYmd(raw?.fechaExpedicionCC),
      departamentoExpedicionCc: raw?.departamentoExpedicionCC,
      municipioExpedicionCc: raw?.municipioExpedicionCC,

      lugarNacimientoDepartamento: raw?.departamentoNacimiento,
      lugarNacimientoMunicipio: raw?.municipioNacimiento,

      rh: raw?.rh,
      zurdoDiestro: raw?.lateralidad,

      tiempoResidenciaZona: raw?.tiempoResidenciaZona,
      lugarAnteriorResidencia: raw?.lugarAnteriorResidencia,
      razonCambioResidencia: raw?.razonCambioResidencia,
      zonasConocidas: raw?.zonasConocidas,
      preferenciaResidencia: raw?.preferenciaResidencia,

      fechaNacimiento: this.toYmd(raw?.fechaNacimiento),
      estudiaActualmente: String(estudiaActualmente ?? '').trim(),

      familiarEmergencia: raw?.familiarEmergencia,
      parentescoFamiliarEmergencia: raw?.parentescoFamiliarEmergencia,
      direccionFamiliarEmergencia: raw?.direccionFamiliarEmergencia,
      barrioFamiliarEmergencia: raw?.barrioFamiliarEmergencia,
      telefonoFamiliarEmergencia: raw?.telefonoFamiliarEmergencia,

      ocupacionFamiliarEmergencia: raw?.ocupacionFamiliarEmergencia ?? raw?.ocupacionFamiliar_Emergencia ?? '',

      oficina: raw?.oficina,

      escolaridad: raw?.escolaridad,
      // ✅ sigue igual: se envía como string separado por comas
      estudiosExtra: Array.isArray(raw?.estudiosExtrasSelect) ? raw.estudiosExtrasSelect.join(',') : '',
      nombreInstitucion: raw?.nombreInstitucion,
      anoFinalizacion: this.toYmd(raw?.anoFinalizacion),
      tituloObtenido: raw?.tituloObtenido,

      chaqueta: raw?.tallaChaqueta,
      pantalon: raw?.tallaPantalon,
      camisa: raw?.tallaCamisa,
      calzado: raw?.tallaCalzado,

      nombreConyugue: raw?.nombresConyuge ?? '',
      apellidoConyugue: raw?.apellidosConyuge ?? '',
      numDocIdentidadConyugue: raw?.documentoIdentidadConyuge ?? '',
      viveConElConyugue: raw?.viveConyuge ?? '',
      direccionConyugue: raw?.direccionConyuge ?? '',
      telefonoConyugue: raw?.telefonoConyuge ?? '',
      barrioMunicipioConyugue: raw?.barrioConyuge ?? '',
      ocupacion_conyugue: raw?.ocupacionConyuge ?? '',

      nombrePadre: raw?.nombrePadre,
      vivePadre: raw?.elPadreVive,
      ocupacionPadre: raw?.ocupacionPadre ?? '',
      direccionPadre: raw?.direccionPadre ?? '',
      telefonoPadre: raw?.telefonoPadre ?? '',
      barrioPadre: raw?.barrioPadre ?? '',

      nombreMadre: raw?.nombreMadre,
      viveMadre: raw?.madreVive,
      ocupacionMadre: raw?.ocupacionMadre ?? '',
      direccionMadre: raw?.direccionMadre ?? '',
      telefonoMadre: raw?.telefonoMadre ?? '',
      barrioMadre: raw?.barrioMadre ?? '',

      nombreReferenciaPersonal1: raw?.nombreReferenciaPersonal1,
      telefonoReferenciaPersonal1: raw?.telefonoReferencia1,
      ocupacionReferenciaPersonal1: raw?.ocupacionReferencia1,
      tiempoConoceReferenciaPersonal1: raw?.tiempoConoceReferenciaPersonal1,
      direccionReferenciaPersonal1: raw?.direccionReferenciaPersonal1,

      nombreReferenciaPersonal2: raw?.nombreReferenciaPersonal2,
      telefonoReferenciaPersonal2: raw?.telefonoReferencia2,
      ocupacionReferenciaPersonal2: raw?.ocupacionReferencia2,
      tiempoConoceReferenciaPersonal2: raw?.tiempoConoceReferenciaPersonal2,
      direccionReferenciaPersonal2: raw?.direccionReferenciaPersonal2,

      nombreReferenciaFamiliar1: raw?.nombreReferenciaFamiliar1,
      telefonoReferenciaFamiliar1: raw?.telefonoReferenciaFamiliar1,
      ocupacionReferenciaFamiliar1: raw?.ocupacionReferenciaFamiliar1,
      parentescoReferenciaFamiliar1: raw?.parentescoReferenciaFamiliar1,
      direccionReferenciaFamiliar1: raw?.direccionReferenciaFamiliar1,

      nombreReferenciaFamiliar2: raw?.nombreReferenciaFamiliar2,
      telefonoReferenciaFamiliar2: raw?.telefonoReferenciaFamiliar2,
      ocupacionReferenciaFamiliar2: raw?.ocupacionReferenciaFamiliar2,
      parentescoReferenciaFamiliar2: raw?.parentescoReferenciaFamiliar2,
      direccionReferenciaFamiliar2: raw?.direccionReferenciaFamiliar2,

      nombreExpeLaboral1Empresa: raw?.nombreEmpresa1 ?? '',
      direccionEmpresa1: raw?.direccionEmpresa1 ?? '',
      telefonosEmpresa1: raw?.telefonosEmpresa1 ?? '',
      nombreJefeEmpresa1: raw?.nombreJefe1 ?? '',
      fechaRetiroEmpresa1: this.toYmd(raw?.fechaRetiro1) ?? '',
      motivoRetiroEmpresa1: raw?.motivoRetiro1 ?? '',
      cargoEmpresa1: raw?.cargoEmpresa1 ?? '',
      empresas_laborado: raw?.empresas_laborado ?? '',

      tiempoExperiencia: raw?.tiempoExperiencia ?? '',

      familiaConUnSoloIngreso: raw?.familiaSolo,
      numHabitaciones: raw?.numeroHabitaciones,
      numPersonasPorHabitacion: raw?.personasPorHabitacion,
      caracteristicasVivienda: raw?.caracteristicasVivienda,

      experienciaLaboral: raw?.experienciaLaboral,
      numHijosDependientes: raw?.numHijosDependientes ?? '',
      cuidadorHijos: raw?.cuidadorHijos ?? '',
      fuenteVacante: raw?.fuenteVacante,

      areaExperiencia: Array.isArray(raw?.areaExperiencia) ? raw.areaExperiencia.join(', ') : '',
      expectativasDeVida: Array.isArray(raw?.expectativasVidaChecks) ? raw.expectativasVidaChecks.join(', ') : '',

      servicios: Array.isArray(raw?.comodidadesChecks) ? raw.comodidadesChecks.join(', ') : '',
      tipoVivienda: Array.isArray(raw?.tiposViviendaChecks) ? raw.tiposViviendaChecks.join(', ') : '',
      personasConQuienConvive: Array.isArray(raw?.conQuienViveChecks) ? raw.conQuienViveChecks.join(', ') : '',
      personas_a_cargo: Array.isArray(raw?.personas_a_cargo) ? raw.personas_a_cargo.join(', ') : '',
    };

    const hijosArr = Array.isArray(raw?.hijos) ? raw.hijos : [];
    datosAEnviar.hijos = hijosArr.map((hijo: any) => {
      const h = { ...hijo };
      if (h?.fechaNacimientoHijo) h.fechaNacimientoHijo = this.toYmd(h.fechaNacimientoHijo);
      return h;
    });

    const upperCaseValues = this.convertValuesToUpperCase(datosAEnviar);
    upperCaseValues.correo = correo;

    upperCaseValues.hijos = (Array.isArray(datosAEnviar.hijos) ? datosAEnviar.hijos : []).map((hijo: any) => {
      const h = { ...hijo };
      return this.convertValuesToUpperCase(h);
    });

    Swal.fire({
      title: 'Guardando...',
      text: 'Por favor espere',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    this.registroProcesoContratacion.crearActualizarCandidato2(upperCaseValues).subscribe({
      next: async (respUpsert: any) => {
        try {
          const upsertOk = !!respUpsert?.ok;

          if (!upsertOk) {
            Swal.close();
            await Swal.fire({
              title: 'Error',
              text: 'Hubo un error al guardar (upsert).',
              icon: 'error',
              confirmButtonText: 'Aceptar',
            });
            return;
          }

          let parte2Ok = false;
          try {
            const respParte2: any = await firstValueFrom(
              this.registroProcesoContratacion.formulario_vacantes(upperCaseValues)
            );

            parte2Ok =
              respParte2?.ok === true ||
              respParte2?.success === true ||
              !!respParte2?.message;
          } catch (e2) {
            parte2Ok = false;
          }

          if (!parte2Ok) {
            Swal.close();
            await Swal.fire({
              title: 'Error',
              text: 'Upsert guardó, pero falló la Parte 2 (subirParte2).',
              icon: 'error',
              confirmButtonText: 'Aceptar',
            });
            return;
          }

          this.numeroCedula = respUpsert?.numero_documento ?? this.numeroCedula;

          const allFilesUploaded = await this.subirTodosLosArchivos();
          Swal.close();

          await Swal.fire({
            title: allFilesUploaded ? '¡Éxito!' : 'Advertencia',
            text: allFilesUploaded
              ? 'Datos y archivos guardados exitosamente.'
              : 'Datos guardados, pero hubo problemas al subir archivos.',
            icon: allFilesUploaded ? 'success' : 'warning',
            confirmButtonText: 'Ok',
          });
        } catch (error) {
          Swal.close();
          await Swal.fire({
            title: 'Error',
            text: `Hubo un error al subir los archivos: ${error}`,
            icon: 'error',
            confirmButtonText: 'Ok',
          });
        }
      },
      error: async (error: any) => {
        Swal.close();
        await Swal.fire({
          title: 'Error',
          text: error?.error?.message || error?.message || 'Error desconocido al guardar los datos.',
          icon: 'error',
          confirmButtonText: 'Aceptar',
        });
      },
    });
  }

  // -------------------------
  // ✅ Normalización al enviar
  // -------------------------
  private isPhoneKey(key: string): boolean {
    return [
      'numCelular',
      'numWha',
      'telefonoFamiliarEmergencia',
      'telefonoPadre',
      'telefonoMadre',
      'telefonoConyuge',
      'telefonosEmpresa1',
      'telefonoReferencia1',
      'telefonoReferencia2',
      'telefonoReferenciaFamiliar1',
      'telefonoReferenciaFamiliar2',
      'telefono',
      'docIdentidadHijo',
    ].includes(key);
  }

  private digitsOnly(v: any): string {
    return String(v ?? '').replace(/\D+/g, '').trim();
  }

  convertValuesToUpperCase(formValues: any): any {
    const upperCaseValues: { [key: string]: any } = {};

    for (const key in formValues) {
      if (Object.prototype.hasOwnProperty.call(formValues, key)) {
        const value = formValues[key];

        if (key === 'correo') {
          upperCaseValues[key] = String(value ?? '').trim().toLowerCase();
          continue;
        }

        if (typeof value === 'string') {
          const cleaned = this.normalizeSpaces(value);

          if (this.isPhoneKey(key)) {
            upperCaseValues[key] = this.digitsOnly(cleaned);
          } else {
            upperCaseValues[key] = this.normalizeString(cleaned.toUpperCase());
          }
        } else if (Array.isArray(value)) {
          upperCaseValues[key] = value.map((item) => {
            if (typeof item === 'string') {
              const cleaned = this.normalizeSpaces(item);
              return this.normalizeString(cleaned.toUpperCase());
            }
            return item;
          });
        } else {
          upperCaseValues[key] = value;
        }
      }
    }

    return upperCaseValues;
  }

  normalizeString(value: string): string {
    return value
      .normalize('NFKD')
      .replace(/[\u{1D400}-\u{1D7FF}]/gu, (char) => String.fromCharCode(char.codePointAt(0)! - 0x1d400 + 65));
  }

  compareFn(o1: any, o2: any): boolean {
    return o1 === o2;
  }

  stringToBoolean(stringValue: any) {
    if (stringValue === null || stringValue === undefined || String(stringValue).trim() === '') return false;
    return String(stringValue).toLowerCase() === 'true';
  }

  // -------------------------
  // Hijos
  // -------------------------
  get hijosFormArray() {
    return this.formHojaDeVida2.get('hijos') as FormArray;
  }

  inicializarFormularioHijos() {
    this.formHojaDeVida2.get('numHijosDependientes')!.valueChanges.subscribe((numHijos) => {
      this.actualizarFormularioHijos(numHijos);
    });
  }

  actualizarFormularioHijos(numHijos: number) {
    const hijosArray = this.formHojaDeVida2.get('hijos') as FormArray;

    while (hijosArray.length) hijosArray.removeAt(0);

    for (let i = 0; i < numHijos; i++) hijosArray.push(this.crearFormGroupHijo());
  }

  escucharNumeroDeHijos() {
    this.formHojaDeVida2.get('numHijosDependientes')!.valueChanges.subscribe((numHijos: number) => {
      const hijosArray = this.formHojaDeVida2.get('hijos') as FormArray;
      const hijosActuales = hijosArray.length;

      if (numHijos > hijosActuales) {
        for (let i = hijosActuales; i < numHijos; i++) hijosArray.push(this.crearFormGroupHijo());
      } else {
        for (let i = hijosActuales; i > numHijos; i--) hijosArray.removeAt(i - 1);
      }
    });
  }

  crearFormGroupHijo(): FormGroup {
    return new FormGroup({
      nombreHijo: new FormControl('', [Validators.required, this.nameValidator(1, 6)]),
      sexoHijo: new FormControl('', Validators.required),
      fechaNacimientoHijo: new FormControl('', [Validators.required, this.dateReasonableValidator(1900)]),
      docIdentidadHijo: new FormControl('', [Validators.required, Validators.minLength(3)]),
      ocupacionHijo: new FormControl('', [Validators.required, Validators.minLength(2)]),
      cursoHijo: new FormControl('', [Validators.required, Validators.minLength(1)]),
    });
  }

  generarArrayHijos(): Array<number> {
    const numHijos = this.formHojaDeVida2.get('numHijosDependientes')?.value || 0;
    return Array.from({ length: numHijos }, (_, i) => i);
  }

  actualizarEdadesHijos(numHijos: number) {
    Object.keys(this.formHojaDeVida2.controls).forEach((key) => {
      if (key.startsWith('edadHijo')) this.formHojaDeVida2.removeControl(key);
    });

    for (let i = 0; i < numHijos; i++) {
      this.formHojaDeVida2.addControl(`edadHijo${i + 1}`, new FormControl('', [Validators.min(0), Validators.max(60)]));
    }
  }

  // -------------------------
  // Colombia JSON
  // -------------------------
  escucharCambiosEnDepartamento(): void {
    this.formHojaDeVida2.get('departamento')!.valueChanges.subscribe((departamentoSeleccionado) => {
      this.ciudadesResidencia = this.actualizarMunicipios(departamentoSeleccionado);
      this.formHojaDeVida2.get('ciudad')!.enable();
    });

    this.formHojaDeVida2.get('departamentoExpedicionCC')!.valueChanges.subscribe((departamentoSeleccionado) => {
      this.ciudadesExpedicionCC = this.actualizarMunicipios(departamentoSeleccionado);
      this.formHojaDeVida2.get('municipioExpedicionCC')!.enable();
    });

    this.formHojaDeVida2.get('departamentoNacimiento')!.valueChanges.subscribe((departamentoSeleccionado) => {
      this.ciudadesNacimiento = this.actualizarMunicipios(departamentoSeleccionado);
      this.formHojaDeVida2.get('municipioNacimiento')!.enable();
    });
  }

  actualizarMunicipios(departamentoSeleccionado: string): string[] {
    const departamento = this.datos?.find((d: any) => d.departamento === departamentoSeleccionado);
    return departamento ? departamento.ciudades : [];
  }

  async cargarDatosJSON(): Promise<void> {
    this.http.get('files/utils/colombia.json').subscribe((data) => {
      this.datos = data;
    });
  }

  onSelectionChange() {
    const deseaGenerar = this.formHojaDeVida2.get('deseaGenerar')?.value;
    this.mostrarSubirHojaVida = deseaGenerar === false;
    this.mostrarCamposAdicionales = deseaGenerar === true;
  }

  opcionBinaria: any[] = [
    { value: 'SI', display: 'SÍ' },
    { value: 'NO', display: 'NO' },
  ];

  oficinas: string[] = [
    'ANDES',
    'BOSA',
    'CARTAGENITA',
    'FACA_PRIMERA',
    'FACA_PRINCIPAL',
    'FONTIBÓN',
    'FORANEOS',
    'FUNZA',
    'MADRID',
    'MONTE_VERDE',
    'ROSAL',
    'SOACHA',
    'SUBA',
    'TOCANCIPÁ',
    'USME',
  ];

  shouldShowError(controlName: string): boolean {
    const c = this.formHojaDeVida2.get(controlName);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  private readonly FIELD_ERROR_MESSAGES: Record<string, Record<string, string | ((ctx?: any) => string)>> = {
    pNombre: {
      required: 'Escribe tu primer nombre.',
      nameBadChars: 'El nombre solo debe tener letras. No uses números ni símbolos.',
      nameShortWord: 'Cada palabra del nombre debe tener mínimo 2 letras.',
      nameMaxWords: () => 'Máximo 4 palabras en el nombre.',
    },
    pApellido: {
      required: 'Escribe tu primer apellido.',
      nameBadChars: 'El apellido solo debe tener letras. No uses números ni símbolos.',
      nameShortWord: 'Cada palabra del apellido debe tener mínimo 2 letras.',
      nameMaxWords: () => 'Máximo 4 palabras en el apellido.',
    },

    sNombre: {
      nameBadChars: 'El segundo nombre solo debe tener letras.',
      nameShortWord: 'Cada palabra debe tener mínimo 2 letras.',
      nameMaxWords: () => 'Máximo 4 palabras.',
    },
    sApellido: {
      nameBadChars: 'El segundo apellido solo debe tener letras.',
      nameShortWord: 'Cada palabra debe tener mínimo 2 letras.',
      nameMaxWords: () => 'Máximo 4 palabras.',
    },

    familiarEmergencia: {
      required: 'Escribe nombre y apellido del familiar (mínimo 2 palabras).',
      nameMinWords: () => 'Escribe nombre y apellido del familiar (mínimo 2 palabras).',
    },
    nombrePadre: {
      required: 'Escribe nombre y apellido del padre (mínimo 2 palabras).',
      nameMinWords: () => 'Escribe nombre y apellido del padre (mínimo 2 palabras).',
    },
    nombreMadre: {
      required: 'Escribe nombre y apellido de la madre (mínimo 2 palabras).',
      nameMinWords: () => 'Escribe nombre y apellido de la madre (mínimo 2 palabras).',
    },

    conQuienViveChecks: { required: 'Selecciona al menos una opción.' },
    tiposViviendaChecks: { required: 'Selecciona al menos una opción.' },
    comodidadesChecks: { required: 'Selecciona al menos una opción.' },
    expectativasVidaChecks: { required: 'Selecciona al menos una opción.' },
    personas_a_cargo: { required: 'Selecciona al menos una opción.' },

    numHijosDependientes: {
      required: 'Indica cuántos hijos dependen económicamente de ti.',
      min: () => 'No puede ser menor que 0.',
      max: () => 'Máximo 5.',
    },
  };

  getErrorMessage(controlName: string): string {
    const c = this.formHojaDeVida2.get(controlName);
    if (!c || !c.errors) return '';

    const errors = c.errors;

    const fieldMap = this.FIELD_ERROR_MESSAGES[controlName];
    if (fieldMap) {
      for (const key of Object.keys(errors)) {
        const msg = fieldMap[key];
        if (msg) return typeof msg === 'function' ? msg(errors[key]) : msg;
      }
    }

    if (errors['required']) {
      return Array.isArray(c.value) ? 'Selecciona al menos una opción.' : 'Este campo es obligatorio.';
    }

    if (errors['email']) return 'Ingresa un correo válido.';

    if (errors['minlength']) {
      return `Escribe mínimo ${errors['minlength'].requiredLength} caracteres.`;
    }
    if (errors['maxlength']) {
      return `Escribe máximo ${errors['maxlength'].requiredLength} caracteres.`;
    }

    if (errors['pattern']) {
      return 'El formato no es válido. Revisa lo que escribiste.';
    }

    if (errors['min']) return `El valor mínimo permitido es ${errors['min'].min}.`;
    if (errors['max']) return `El valor máximo permitido es ${errors['max'].max}.`;

    if (errors['docId']) {
      const tipo = String(this.formHojaDeVida2.get('tipoDoc')?.value ?? '').toUpperCase().trim();
      if (tipo === 'CC') return 'Para CC: escribe solo números (6 a 12 dígitos), sin puntos.';
      return 'Documento inválido: usa solo letras y números (4 a 20), sin espacios.';
    }

    if (errors['phoneCO']) {
      return 'Número inválido. Celular: 10 dígitos y empieza por 3. Fijo: 7 dígitos.';
    }

    if (errors['dateFuture']) return 'La fecha no puede ser futura.';
    if (errors['dateMinYear']) return 'La fecha es demasiado antigua.';

    if (errors['yearMin']) return 'El año es demasiado antiguo.';
    if (errors['yearMax']) return 'El año no puede ser mayor al año actual.';

    if (errors['nameMinWords']) return 'Escribe mínimo nombre y apellido.';
    if (errors['nameMaxWords']) return 'Escribiste demasiadas palabras.';
    if (errors['nameShortWord']) return 'Cada palabra debe tener mínimo 2 letras.';
    if (errors['nameBadChars']) return 'Solo letras. No uses números ni símbolos.';

    return 'Revisa este campo.';
  }
}
