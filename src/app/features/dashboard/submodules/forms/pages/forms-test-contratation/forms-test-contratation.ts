import {  Component, Inject, OnInit, Optional, PLATFORM_ID, ViewChild, ChangeDetectorRef, AfterViewInit, OnDestroy, Injectable , ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, Validators, FormControl, FormArray, ReactiveFormsModule, AbstractControl, ValidatorFn, ValidationErrors } from '@angular/forms';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, MAT_DATE_LOCALE, DateAdapter, MAT_DATE_FORMATS, NativeDateAdapter } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatMenuModule } from '@angular/material/menu';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, merge, firstValueFrom, fromEvent } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { takeUntil, debounceTime, startWith } from 'rxjs/operators';
import Swal from 'sweetalert2';

import { ParametrizacionS } from '../../services/parametrizacion/parametrizacion-s';
import { RegistroProcesoContratacion } from '../../services/registro-proceso-contratacion/registro-proceso-contratacion';
import { CandidateS } from '../../../../../../shared/services/candidate-s/candidate-s';
import { DocumentManagementS } from '../../../../../../shared/services/document-management-s/document-management-s';

const STORAGE_KEY = 'formHojaDeVida2';
const CEDULA_KEY = 'numeroCedula';

const REGEX_NAMES = /^[a-zA-ZñÑáéíóúÁÉÍÓÚ\s]+$/;
const REGEX_NUMERIC = /^\d+$/;
const REGEX_PHONE_CO = /^3\d{9}$/;

const OPCION_BINARIA = [{ value: 'SI', display: 'SÍ' }, { value: 'NO', display: 'NO' }];
const PARENT_STATUS_OPTIONS = [
  { value: 'VIVE', display: 'VIVE' },
  { value: 'NO VIVE', display: 'NO VIVE' },
  { value: 'NO LO CONOCE', display: 'NO LO CONOCE' }
];
const MOTIVO_RETIRO_OPTIONS = ['VOLUNTARIO', 'TERMINACION DE CONTRATO', 'ABANDONO DE CARGO'];

const OFICINAS = [
  'ADMINISTRATIVOS',
  'ANDES',
  'BOSA',
  'CARTAGENITA',
  'FACA_PRIMERA',
  'FACA_PRINCIPAL',
  'FONTIBON',
  'FORANEOS',
  'FUNZA',
  'MADRID',
  'MONTE_VERDE',
  'ROSAL',
  'SOACHA',
  'SOTAQUIRA',
  'SUBA',
  'TOCANCIPA',
  'USME',
  'VIRTUAL',
  'ZIPAQUIRA',
];

interface BulItem {
  activo?: boolean;
  datos?: any;
}
interface Option {
  value: string;
  viewValue: string;
}

@Injectable()
export class CustomDateAdapter extends NativeDateAdapter {
  override format(date: Date, displayFormat: Object): string {
    if (displayFormat === 'input') {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return date.toDateString();
  }
}

@Component({
  selector: 'app-forms-test-contratation',
  imports: [
    CommonModule, ReactiveFormsModule, RouterModule,
    MatStepperModule, MatInputModule, MatButtonModule, MatSelectModule,
    MatDatepickerModule, MatNativeDateModule, MatIconModule, MatCheckboxModule,
    MatRadioModule, MatDialogModule, MatMenuModule
  ],
  templateUrl: './forms-test-contratation.html',
  styleUrl: './forms-test-contratation.css',
  providers: [
    { provide: DateAdapter, useClass: CustomDateAdapter },
    {
      provide: MAT_DATE_FORMATS, useValue: {
        parse: { dateInput: { month: 'short', year: 'numeric', day: 'numeric' } },
        display: {
          dateInput: 'input',
          monthYearLabel: { year: 'numeric', month: 'short' },
          dateA11yLabel: { year: 'numeric', month: 'long', day: 'numeric' },
          monthYearA11yLabel: { year: 'numeric', month: 'long' },
        }
      }
    },
    { provide: MAT_DATE_LOCALE, useValue: 'es-CO' }
  ],
})

export class FormsTestContratation implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('stepper') stepper!: MatStepper;
  private readonly destroy$ = new Subject<void>();
  isBrowser: boolean;

  searchForm: FormGroup; // Pre-check form
  isSearching = false;
  showForm = false; // Toggles between search and main form
  foundCandidate: any = null;

  formHojaDeVida2: FormGroup;
  loadingCatalogos = false;
  oficinaBloqueada = false;

  // Stepper State
  stepperTotal = 0;
  stepperIndex = 0;
  stepperProgress = 0;

  hidePassword = true;

  // Data & Catalogs
  numeroCedula = '';
  datos: any[] = []; // Colombia JSON
  uploadedFiles: { [key: string]: { file: File | string; fileName: string } | undefined } = {};

  // Catalogs (Public properties for HTML access)
  tipoDocs: any[] = [];
  generos: string[] = [];
  listatiposdesangre: string[] = [];
  estadosCiviles: any[] = [];
  listamanos: any[] = [];
  listaParentescosFamiliares: string[] = [];
  Ocupacion: string[] = [];
  listaEscolaridad: string[] = [];
  tallas: string[] = [];
  tallasCalzado: string[] = [];
  comodidades: string[] = [];
  opcionesPromocion: string[] = [];
  listaPosiblesRespuestasConquienVive: string[] = [];
  personasACargoOptions: string[] = [];
  tiposVivienda: string[] = [];
  caracteristicasVivienda: string[] = [];
  areasExperiencia: string[] = [];
  tiempoTrabajado: string[] = [];
  expectativasVida: string[] = [];
  haceCuantoViveEnlaZona: string[] = [];
  listaPersonasQueCuidan: string[] = [];
  cursosDespuesColegio: string[] = []; // Multi-select studies

  // Search Controls for Selects
  searchDeptoRes = new FormControl('');
  searchMunRes = new FormControl('');
  searchDeptoExp = new FormControl('');
  searchMunExp = new FormControl('');
  searchDeptoNac = new FormControl('');
  searchMunNac = new FormControl('');

  // Computed / Dynamic Lists (+ Filtered versions)
  ciudadesResidencia: string[] = [];
  filteredDeptoRes: any[] = [];
  filteredMunRes: string[] = [];

  ciudadesExpedicionCC: string[] = [];
  filteredDeptoExp: any[] = [];
  filteredMunExp: string[] = [];

  ciudadesNacimiento: string[] = [];
  filteredDeptoNac: any[] = [];
  filteredMunNac: string[] = [];

  // Options
  opcionBinaria = OPCION_BINARIA;
  parentStatusOptions = PARENT_STATUS_OPTIONS;
  motivoRetiroOptions = MOTIVO_RETIRO_OPTIONS;
  oficinas = OFICINAS;
  categoriasLicencia = ['A1', 'A2', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3'];
  tiposContrato = ['Obra labor', 'Prestación de servicios', 'Fijo', 'Indefinido', 'Aprendizaje'];
  tallasRopa = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

  dominiosCorreo = [
    'GMAIL.COM', 'HOTMAIL.COM', 'YAHOO.COM', 'ICLOUD.COM', 'OUTLOOK.COM',
    'OUTLOOK.ES', 'MAIL.COM', 'YAHOO.COM.CO', 'UNICARTAGENA.EDU.CO',
    'CUN.EDU.CO', 'MISENA.EDU.CO', 'UNIGUAJIRA.EDU.CO', 'UNILLANOS.EDU.CO',
    'UCUNDINAMARCA.EDU.CO', 'UNCUNDINAMARCA.EDU.CO', 'USANTOTOMAS.EDU.CO',
    'UNAL.EDU.CO', 'UNICAUCA.EDU.CO', 'UNIMILITAR.EDU.CO', 'HOTMAIL.COM.CO',
    'HOTMAIL.COM.AR', 'LASVILLAS.EMAIL', 'YAHOO.ES'
  ].sort(); // Sorted alphabetically for better UX

  // Search Controls for Selects
  searchDominio = new FormControl('');
  filteredDominios: string[] = [];

  // Search Controls for Selects
  mostrarCamposHermanos = false;
  mostrarSubirHojaVida = false;
  mostrarCamposAdicionales = false;

  // File Types Mapping
  typeMap: { [key: string]: number } = {
    hojaDeVida: 23
  };

  // Catalog Config Map - Updated to match JSON structure
  private readonly CATALOG_CONFIG = {
    'TIPOS_IDENTIFICACION': { prop: 'tipoDocs', map: (d: any) => ({ abbreviation: d.codigo, description: d.descripcion }) },
    'SEXO': { prop: 'generos', map: (d: any) => d.codigo }, // M/F
    'RH': { prop: 'listatiposdesangre', map: (d: any) => d.nombre }, // RH uses 'nombre'
    'ESTADOS_CIVILES': { prop: 'estadosCiviles', map: (d: any) => ({ codigo: d.codigo, descripcion: d.descripcion }) },
    'DOMINANCIA_MANUAL': { prop: 'listamanos', map: (d: any) => ({ mano: d.codigo, descripcion: d.descripcion }) },
    // Improve Parentesco to show description if available, else name, else code
    'PARENTESCOS_FAMILIARES': { prop: 'listaParentescosFamiliares', map: (d: any) => ({ codigo: d.codigo, descripcion: d.descripcion || d.nombre || d.codigo }) },
    'OCUPACIONES': { prop: 'Ocupacion', map: (d: any) => d.codigo },
    'CATALOGO_NIVELES_ESCOLARIDAD': { prop: 'listaEscolaridad', map: (d: any) => d.codigo },
    'TALLA_ROPA': { prop: 'tallas', map: (d: any) => d.talla }, // Uses 'talla'
    'TALLAS_CALZADO': { prop: 'tallasCalzado', map: (d: any) => d.talla }, // Uses 'talla'
    'CATALOGO_SERVICIOS': { prop: 'comodidades', map: (d: any) => d.codigo },
    'CATALOGO_MARKETING': { prop: 'opcionesPromocion', map: (d: any) => d.codigo },
    'CATALOGO_CON_QUIEN_VIVE': { prop: 'listaPosiblesRespuestasConquienVive', map: (d: any) => d.codigo },
    'CATALOGO_PERSONAS_ACARGO': { prop: 'personasACargoOptions', map: (d: any) => d.codigo },
    'CATALOGO_TIPOS_VIVIENDA': { prop: 'tiposVivienda', map: (d: any) => d.codigo },
    'CATALOGO_CARACTERISTICAS_VIVIENDA': { prop: 'caracteristicasVivienda', map: (d: any) => d.codigo },
    'AREAS_EXPERIENCIA': { prop: 'areasExperiencia', map: (d: any) => d.codigo },
    'TIEMPO_EXPERIENCIA': { prop: 'tiempoTrabajado', map: (d: any) => d.nombre }, // Uses 'nombre'
    'EXPECTATIVAS_VIDA': { prop: 'expectativasVida', map: (d: any) => d.codigo },
    'HACE_CUENTO_ZONA': { prop: 'haceCuantoViveEnlaZona', map: (d: any) => d.nombre }, // Uses 'nombre'
    'CUIDADOR_HIJOS': { prop: 'listaPersonasQueCuidan', map: (d: any) => d.nombre }, // Uses 'nombre'
    'ESTUDIOS': { prop: 'cursosDespuesColegio', map: (d: any) => d.codigo },
  };

  private readonly CATALOG_KEYS = Object.keys(this.CATALOG_CONFIG);

  constructor(
    private fb: FormBuilder,
    private parametrizacionS: ParametrizacionS,
    private route: ActivatedRoute,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
    private registroProcesoContratacion: RegistroProcesoContratacion,
    private gestionDocumentosService: DocumentManagementS,
    private candidateS: CandidateS,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);

    // 1. Init Search Form (Pre-check)
    this.searchForm = this.fb.group({
      tipo_doc: ['CC', Validators.required],
      numero_documento: ['', [Validators.required, Validators.pattern(REGEX_NUMERIC), Validators.minLength(6), Validators.maxLength(15), this.notPhoneNumberValidator()]]
    });

    // 2. Init Main Form
    this.formHojaDeVida2 = this.initForm();
  }

  ngOnInit(): void {
    this.loadCatalogs();
    this.cargarDatosJSON(); // Colombia
    this.initObservables();
    this.initSearchFilters();
    this.initAutoSave();

    // Query Params
    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const ofi = (params.get('oficina') || '').toUpperCase().trim();
      if (ofi && this.oficinas.includes(ofi)) {
        this.formHojaDeVida2.get('oficina')?.setValue(ofi);
        this.formHojaDeVida2.get('oficina')?.disable();
        this.oficinaBloqueada = true;
      }
    });
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    Promise.resolve().then(() => {
      this.updateStepperStats();
      this.updateStickyOffset();
    });

    if (this.stepper) {
      merge(this.stepper.selectionChange, this.stepper.steps.changes)
        .pipe(startWith(null), takeUntil(this.destroy$))
        .subscribe(() => {
          Promise.resolve().then(() => {
            this.updateStepperStats();
            // Recalculate offset in case lines wrap or stats appear
            setTimeout(() => this.updateStickyOffset(), 100);
          });
        });
    }

    // Resize Listener for sticky adjustment
    fromEvent(window, 'resize')
      .pipe(debounceTime(100), takeUntil(this.destroy$))
      .subscribe(() => this.updateStickyOffset());
  }

  updateStickyOffset() {
    if (!this.isBrowser) return;
    const mobileHeader = document.querySelector('.mobile-sticky-group') as HTMLElement;
    if (mobileHeader) {
      const height = mobileHeader.offsetHeight;
      document.documentElement.style.setProperty('--mobile-sticky-height', `${height}px`);
    } else {
      document.documentElement.style.setProperty('--mobile-sticky-height', '0px');
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  cancelar() { this.formHojaDeVida2.reset(); }
  onSelectionChange() { /* Triggered by UI updates handled in sub */ }

  async cargarDatosJSON() {
    this.http.get('files/utils/colombia.json').subscribe({
      next: (d: any) => {
        this.datos = d;
        this.searchDeptoRes.setValue('');
        this.searchDeptoExp.setValue('');
        this.searchDeptoNac.setValue('');
      },
      error: () => {
        console.error('No se pudo cargar colombia.json');
        Swal.fire({
          icon: 'error',
          title: 'Error cargando datos',
          text: 'No se pudieron cargar los departamentos y municipios. Recargue la página. Si el problema persiste, contacte a soporte.',
          confirmButtonColor: '#111827'
        });
      }
    });
  }

  // ----------------------------------------------------
  // 1. Form Initialization
  // ----------------------------------------------------
  private initForm(): FormGroup {
    const req = Validators.required;
    const txt = [req, Validators.minLength(2), this.noSpecialCharsValidator()];

    // Strict Validators
    const name = [req, Validators.minLength(2), Validators.maxLength(30), this.nameValidator()]; // Letters only
    const fullName = [req, Validators.maxLength(60), this.fullNameValidator()]; // Full Name Strict
    const address = [req, Validators.minLength(5), this.addressCOValidator()]; // strict address
    const email = [req, Validators.email, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)];
    const phone = [req, this.phoneCOValidator()]; // 3xxxxxxxxx
    const doc = [req, this.docValidator()]; // Numeric only

    // Email Split Validators
    const emailUserVal = [req, Validators.pattern(/^[^@]+$/)]; // No @ allowed
    const emailDomainVal = [req, Validators.pattern(/^[^@]+\.[a-zA-Z]{2,}$/)]; // No @, valid domain structure

    return this.fb.group({
      // Step 1: Personal (Pre-registration subset)
      oficina: ['', req],
      tipoDoc: ['', req],
      numeroCedula: ['', doc],
      fechaExpedicionCC: ['', req],
      departamentoExpedicionCC: ['', req],
      municipioExpedicionCC: [{ value: '', disabled: true }, req],

      pNombre: ['', name],
      sNombre: ['', this.nameValidator(false)], // Optional
      pApellido: ['', name],
      sApellido: ['', this.nameValidator(false)], // Optional
      genero: ['', req],
      fechaNacimiento: ['', [req]],
      departamentoNacimiento: ['', req],
      municipioNacimiento: [{ value: '', disabled: true }, req],
      estadoCivil: ['', req],

      // Contact & Housing (Step 1 subset)
      correoUsuario: ['', emailUserVal], // NEW
      correoDominio: ['', emailDomainVal], // NEW
      correo: [{ value: '', disabled: true }, email], // Managed automatically, kept for payload/compat

      numCelular: ['', phone],
      numWha: ['', phone],
      direccionResidencia: ['', address],
      zonaResidencia: ['', req],
      departamento: ['', req],
      ciudad: [{ value: '', disabled: true }, req],
      tiempoResidenciaZona: ['', req],
      conQuienViveChecks: [[], req],

      // Password: se usa el número de cédula automáticamente (no visible al usuario)
      password: [''],
      // Escolaridad moved here effectively by validation keys logic, control stays same
      // Expectativas moved here effectively


      // Fields NOT in Step 1 but required later
      rh: ['', req], // Moved out of step 1 list
      lateralidad: ['', req],
      tallaChaqueta: ['', req],
      tallaPantalon: ['', req],
      tallaCamisa: ['', req],
      tallaCalzado: ['', req],

      lugarAnteriorResidencia: ['', req],
      razonCambioResidencia: ['', req],
      zonasConocidas: [''],

      // Familiar Emergencia
      familiarEmergencia: ['', fullName],
      parentescoFamiliarEmergencia: ['', req],
      telefonoFamiliarEmergencia: ['', phone],
      ocupacionFamiliarEmergencia: [''],
      direccionFamiliarEmergencia: ['', [Validators.required]],
      barrioFamiliarEmergencia: [''],

      // Education
      escolaridad: ['', req],
      estudiosExtrasSelect: [[]],
      nombreInstitucion: [''],
      anoFinalizacion: [''],
      tituloObtenido: [''],
      estudiaActualmente: ['', req],

      // Step 3: Family
      // Conyuge (Validators applied via toggle in observable logic)
      nombresConyuge: [''],
      apellidosConyuge: [''],
      viveConyuge: [''], // Note: old code had viveConyuge AND viveConElConyugue? Checking usage.. 
      // Checking old code: viveConElConyugue line 75 service. viveConyuge line 359 initForm.
      // I will keep what was there to be safe.
      viveConElConyugue: [''],

      documentoIdentidadConyuge: ['', doc],
      direccionConyuge: ['', [Validators.required]],
      telefonoConyuge: ['', phone],
      barrioMunicipioConyugue: [''],
      ocupacionConyuge: [''],

      // Padres
      nombrePadre: [{ value: '', disabled: false }, this.fullNameValidator(true)],
      elPadreVive: ['', req],
      ocupacionPadre: [''],
      direccionPadre: ['', [Validators.required]],
      telefonoPadre: ['', phone],
      barrioPadre: [''],

      nombreMadre: [{ value: '', disabled: false }, this.fullNameValidator(true)],
      madreVive: ['', req],
      ocupacionMadre: [''],
      direccionMadre: ['', [Validators.required]],
      telefonoMadre: ['', phone],
      barrioMadre: [''],

      // Referencias
      nombreReferenciaPersonal1: ['', fullName],
      telefonoReferencia1: ['', phone],
      ocupacionReferencia1: [''],
      direccionReferenciaPersonal1: ['', [Validators.required]],
      tiempoConoceReferenciaPersonal1: [''], // Was tiempoConoceReferencia1 in HTML bound? 
      // Old initForm calls it 'tiempoConoceReferenciaPersonal1'. HTML binding 'tiempoConoceReferencia1'.
      // Wait, let's verify old code key.
      tiempoConoceReferencia1: [''], // Binding alias if needed or actual control.
      // barrioReferenciaPersonal1 REMOVED

      nombreReferenciaPersonal2: ['', fullName],
      telefonoReferencia2: ['', phone],
      ocupacionReferencia2: [''],
      direccionReferenciaPersonal2: ['', [Validators.required]],
      tiempoConoceReferenciaPersonal2: [''],
      tiempoConoceReferencia2: [''], // Match
      // barrioReferenciaPersonal2 REMOVED

      nombreReferenciaFamiliar1: ['', fullName],
      telefonoReferenciaFamiliar1: ['', phone],
      ocupacionReferenciaFamiliar1: [''],
      direccionReferenciaFamiliar1: ['', [Validators.required]],
      parentescoReferenciaFamiliar1: ['', req],
      // barrioReferenciaFamiliar1 REMOVED

      nombreReferenciaFamiliar2: ['', fullName],
      telefonoReferenciaFamiliar2: ['', phone],
      ocupacionReferenciaFamiliar2: [''],
      direccionReferenciaFamiliar2: ['', [Validators.required]],
      parentescoReferenciaFamiliar2: ['', req],
      // barrioReferenciaFamiliar2 REMOVED

      // Step 4: Experience & Housing
      experienciaLaboral: ['', req],
      nombreEmpresa1: [''],
      telefonosEmpresa1: [''],
      nombreJefe1: [''],
      cargoEmpresa1: [''],
      areaExperiencia: [[]],
      fechaRetiro1: [''],
      // tiempoExperiencia duplicated in old code? 414 vs 333 (laboral info).
      // I'll keep one.
      motivoRetiro1: [''],
      empresas_laborado: [''],
      direccionEmpresa1: [''],
      // barrioEmpresa1 MERGED into direccionEmpresa1 per request

      // Hijos
      numHijosDependientes: [0, [req, Validators.min(0), Validators.max(10)]],
      cuidadorHijos: [''],
      hijos: this.fb.array([]),

      // Housing
      familiaSolo: ['', req],
      personas_a_cargo: [[], req],
      tiposViviendaChecks: [[], req],
      numeroHabitaciones: ['', req],
      personasPorHabitacion: ['', req],
      caracteristicasVivienda: ['', req],
      comodidadesChecks: [[], req],
      expectativasVidaChecks: [[], req],
      fuenteVacante: ['', req],

      // Evaluación (Opcional) — preguntas que llenaba el evaluador en TesoroApp
      // y que ahora puede llenar el candidato desde la web.
      relacionFamiliar: [''],
      desempenoLaboral: [''],
      felicitaciones: [''],
      situacionConflictiva: [''],
      actividadesDiferentes: [''],

      // Step 5: Final
      deseaGenerar: [false, req],
      hojaDeVida: ['']
    }, { validators: this.groupCrossValidator() });
  }

  // ----------------------------------------------------
  // 2. Logic & Observables
  // ----------------------------------------------------
  private initObservables(): void {
    const f = this.formHojaDeVida2;

    // Helper for conditional validation
    const toggle = (ctrlName: string, required: boolean, validators: ValidatorFn[] = []) => {
      const c = f.get(ctrlName);
      if (!c) return;
      if (required) {
        c.setValidators([Validators.required, ...validators]);
        c.enable({ emitEvent: false });
      } else {
        c.clearValidators();
        c.setValue('', { emitEvent: false });
        // Optional: Disable if you want them greyed out
        // c.disable({emitEvent: false}); 
      }
      c.updateValueAndValidity({ emitEvent: false });
    };

    // Email Construction Logic
    merge(f.get('correoUsuario')!.valueChanges, f.get('correoDominio')!.valueChanges)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const user = f.get('correoUsuario')?.value || '';
        const domain = f.get('correoDominio')?.value || '';
        const correoCtrl = f.get('correo');

        // Check internal validity of parts (no @)
        const userValid = f.get('correoUsuario')?.valid;
        const domainValid = f.get('correoDominio')?.valid;

        if (user && domain && userValid && domainValid) {
          const fullEmail = `${user.trim()}@${domain.trim()}`.toLowerCase();
          correoCtrl?.setValue(fullEmail, { emitEvent: false });
          // If needed, re-verify standard email validity
          if (!correoCtrl?.valid) {
            // Maybe custom error if pattern fails even with correct parts?
            // But domain regex prevents bad chars.
          }
        } else {
          correoCtrl?.setValue('', { emitEvent: false });
        }
      });

    // Escolaridad Logic
    f.get('escolaridad')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(val => {
      const isSinEstudios = val === 'SIN ESTUDIOS';
      toggle('nombreInstitucion', !isSinEstudios);
      toggle('anoFinalizacion', !isSinEstudios);
      toggle('tituloObtenido', !isSinEstudios);

      const extras = f.get('estudiosExtrasSelect');
      if (isSinEstudios) {
        extras?.setValue([], { emitEvent: false });
        extras?.disable({ emitEvent: false });
      } else {
        extras?.enable({ emitEvent: false });
      }
    });

    // Validar Doc on Type Change
    f.get('tipoDoc')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      f.get('numeroCedula')?.updateValueAndValidity();
    });

    // Hermanos Logic
    f.get('tieneHermanos')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(val => {
      this.mostrarCamposHermanos = val === 'SI';
      toggle('numeroHermanos', val === 'SI');
      if (val !== 'SI') {
        (f.get('hermanos') as FormArray).clear();
      }
    });

    f.get('numeroHermanos')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(num => {
      const arr = f.get('hermanos') as FormArray;
      arr.clear();
      for (let i = 0; i < (num || 0); i++) {
        arr.push(this.fb.group({
          nombre: ['', [this.fullNameValidator(true)]], // Full Name for sibling
          profesion: ['', [Validators.required, Validators.minLength(2)]],
          telefono: ['', [Validators.required, this.phoneCOValidator()]]
        }));
      }
    });

    // Desea Generar Logic
    // Desea Generar Logic
    f.get('deseaGenerar')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(val => {
      // Valid if true/SI (depending on value type, HTML says boolean true/false but let's handle truthy)
      const req = !!val;

      toggle('tieneVehiculo', req);
      toggle('estaTrabajando', req);
      toggle('trabajoAntes', req);
      toggle('solicitoAntes', req);
      toggle('tieneHermanos', req);

      if (!req) {
        this.limpiarCamposAdicionales();
        // Force update of children if their parent became hidden/disabled
        // But toggle logic above enables/disables them? 
        // No, 'toggle' inside 'tieneVehiculo' subscription handles sub-sub-fields like 'licencia'.
        // But if 'tieneVehiculo' is disabled, its subscription might not trigger or we just set value to empty.
        // limpiarCamposAdicionales sets them to null.
      }
    });

    // Vehiculo
    f.get('tieneVehiculo')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(val => {
      const req = val === 'SI';
      toggle('licenciaConduccion', req);
      toggle('categoriaLicencia', req);
      // Note: For mat-select multiple, 'required' works for checking length > 0
    });

    // Trabajo Actual
    f.get('estaTrabajando')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(val => {
      const req = val === 'SI';
      toggle('empresaActual', req);
      toggle('tipoTrabajo', req);
      toggle('tipoContrato', req);
    });

    // Hijos Logic (Consolidated)
    f.get('numHijosDependientes')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(num => {
      const n = Number(num) || 0;

      // Sanitize input (remove leading zeros, e.g. "01" -> "1")
      if (String(num) !== String(n)) {
        f.get('numHijosDependientes')?.setValue(n, { emitEvent: false });
      }

      this.actualizarHijos(n);
      toggle('cuidadorHijos', n > 0);
    });

    // Experiencia Logic
    f.get('experienciaLaboral')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(val => {
      const req = val === 'SI';
      toggle('nombreEmpresa1', req);
      toggle('telefonosEmpresa1', req);
      // Relaxed Validator: Just required, no full name enforcement
      toggle('nombreJefe1', req, [Validators.required]);
      toggle('cargoEmpresa1', req);
      toggle('fechaRetiro1', req);
      toggle('tiempoExperiencia', req);
      toggle('motivoRetiro1', req);
      toggle('tiempoExperiencia', req);
      toggle('motivoRetiro1', req);
      toggle('direccionEmpresa1', req, [Validators.required]);
      // toggle('barrioEmpresa1', req); // MERGED into address

      // Area check is multi-select
      const area = f.get('areaExperiencia');
      if (req) area?.setValidators(Validators.required); else area?.clearValidators();
      area?.updateValueAndValidity();
    });

    // Conyuge / Padres Validators Logic
    f.get('viveConyuge')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(val => {
      const req = val === 'SI';
      // Toggle plural fields (used in HTML)
      toggle('nombresConyuge', req, [this.nameValidator()]);
      toggle('apellidosConyuge', req, [this.nameValidator()]);

      toggle('documentoIdentidadConyuge', req);
      toggle('direccionConyuge', req, [Validators.required]);
      toggle('telefonoConyuge', req);
      // toggle('barrioConyuge', req); // REMOVED
      toggle('ocupacionConyuge', req);
    });

    // Estado Civil Logic - Auto-toggle Spouse
    f.get('estadoCivil')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(val => {
      // IDs: CA (Casado), UL (Unión Libre) -> Require Spouse Info
      const requiresRef = ['CA', 'UL'].includes(val);
      const conyugeCtrl = f.get('viveConyuge');

      if (requiresRef) {
        if (!conyugeCtrl?.value) conyugeCtrl?.setValue('SI');
      } else {
        // No casado/unión libre → limpiar TODOS los campos de cónyuge
        conyugeCtrl?.setValue('');
        const conyugeFields = [
          'nombresConyuge', 'apellidosConyuge', 'documentoIdentidadConyuge',
          'viveConElConyugue', 'direccionConyuge', 'telefonoConyuge',
          'barrioMunicipioConyugue', 'ocupacionConyuge'
        ];
        for (const field of conyugeFields) {
          f.get(field)?.setValue('', { emitEvent: false });
          f.get(field)?.clearValidators();
          f.get(field)?.updateValueAndValidity({ emitEvent: false });
        }
      }
    });

    // Padres Logic (Updated for 3 states)
    // "SI" (VIVE) -> Campos obligatorios
    // "NO" (NO VIVE) -> Campos NO obligatorios? Or just Name?
    // "NO LO CONOCE" -> Nada obligatorio
    const updateParent = (prefix: 'Padre' | 'Madre', val: string) => {
      const isVive = val === 'VIVE';
      const isNoConoce = val === 'NO LO CONOCE';
      const isNoVive = val === 'NO VIVE';

      // Address/Phone/Job -> Required ONLY if Alive (VIVE)
      toggle(`direccion${prefix}`, isVive, [Validators.required]);
      toggle(`telefono${prefix}`, isVive);
      // toggle(`barrio${prefix}`, isVive); // REMOVED
      toggle(`ocupacion${prefix}`, isVive);

      // Name: 
      // User said: "lo conoce? si o no, si si klos campos son obligatorios, y no no"
      // Interpretation: 
      // VIVE -> Required
      // NO VIVE -> Not Required? Or maybe Name is kept but not invalid?
      // NO LO CONOCE -> Not Required (and cleared)

      // Let's assume Name is required if VIVE or NO VIVE (since they exist), 
      // BUT user explicitly complained about logic.
      // If "NO VIVE", usually we still want the name for record.
      // But if user insists "no no", I'll make it optional if NO VIVE.
      const nameRequired = isVive;

      toggle(`nombre${prefix}`, nameRequired, [this.fullNameValidator(nameRequired)]);

      if (isNoConoce) {
        f.get(`nombre${prefix}`)?.setValue('');
        f.get(`nombre${prefix}`)?.disable({ emitEvent: false });
      } else {
        f.get(`nombre${prefix}`)?.enable({ emitEvent: false });
      }
    };

    f.get('elPadreVive')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(val => updateParent('Padre', val));
    f.get('madreVive')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(val => updateParent('Madre', val));

    // Location Listeners
    this.setupLocationListener('departamento', 'ciudad', 'ciudadesResidencia');
    this.setupLocationListener('departamentoExpedicionCC', 'municipioExpedicionCC', 'ciudadesExpedicionCC');
    this.setupLocationListener('departamentoNacimiento', 'municipioNacimiento', 'ciudadesNacimiento');
  }

  private setupLocationListener(deptKey: string, cityKey: string, listProp: 'ciudadesResidencia' | 'ciudadesExpedicionCC' | 'ciudadesNacimiento') {
    this.formHojaDeVida2.get(deptKey)?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(dept => {
      const dData = this.datos?.find((d: any) => d.departamento === dept);
      this[listProp] = dData ? dData.ciudades : [];
      this.formHojaDeVida2.get(cityKey)?.enable();

      // Sync Search & Filter
      if (listProp === 'ciudadesResidencia') this.searchMunRes.setValue('');
      if (listProp === 'ciudadesExpedicionCC') this.searchMunExp.setValue('');
      if (listProp === 'ciudadesNacimiento') this.searchMunNac.setValue('');

      if (!dept) this.formHojaDeVida2.get(cityKey)?.setValue('');
    });
  }

  private initSearchFilters() {
    // Dept Res
    this.searchDeptoRes.valueChanges.pipe(startWith(''), takeUntil(this.destroy$)).subscribe(val => {
      this.filteredDeptoRes = this.filterList(this.datos, val, 'departamento');
    });
    // Mun Res
    this.searchMunRes.valueChanges.pipe(startWith(''), takeUntil(this.destroy$)).subscribe(val => {
      this.filteredMunRes = this.filterList(this.ciudadesResidencia, val);
    });

    // Dept Exp
    this.searchDeptoExp.valueChanges.pipe(startWith(''), takeUntil(this.destroy$)).subscribe(val => {
      this.filteredDeptoExp = this.filterList(this.datos, val, 'departamento');
    });
    // Mun Exp
    this.searchMunExp.valueChanges.pipe(startWith(''), takeUntil(this.destroy$)).subscribe(val => {
      this.filteredMunExp = this.filterList(this.ciudadesExpedicionCC, val);
    });

    // Dept Nac
    this.searchDeptoNac.valueChanges.pipe(startWith(''), takeUntil(this.destroy$)).subscribe(val => {
      this.filteredDeptoNac = this.filterList(this.datos, val, 'departamento');
    });
    // Mun Nac
    this.searchMunNac.valueChanges.pipe(startWith(''), takeUntil(this.destroy$)).subscribe(val => {
      this.filteredMunNac = this.filterList(this.ciudadesNacimiento, val);
    });

    // Dominio
    this.searchDominio.valueChanges.pipe(startWith(''), takeUntil(this.destroy$)).subscribe(val => {
      this.filteredDominios = this.filterList(this.dominiosCorreo, val);
    });
  }

  private filterList(list: any[], term: any, key?: string): any[] {
    const t = String(term || '').toLowerCase();
    if (!t) return list || [];
    return (list || []).filter(item => {
      const v = key ? item[key] : item;
      return String(v || '').toLowerCase().includes(t);
    });
  }

  private actualizarHijos(num: number): void {
    const arr = this.formHojaDeVida2.get('hijos') as FormArray;
    while (arr.length > num) arr.removeAt(arr.length - 1);
    while (arr.length < num) {
      const g = this.fb.group({
        nombreHijo: ['', [Validators.required]],
        sexoHijo: ['', Validators.required],
        fechaNacimientoHijo: ['', [Validators.required]],
        // Doc ID Required
        docIdentidadHijo: ['', Validators.required],
        ocupacionHijo: ['', [Validators.required]],
        // Curso conditional
        cursoHijo: ['']
      });

      // Conditional Logic for Curso
      g.get('ocupacionHijo')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(occ => {
        const isEstudiante = occ === 'ESTUDIANTE';
        const curso = g.get('cursoHijo');
        if (isEstudiante) {
          curso?.setValidators(Validators.required);
        } else {
          curso?.clearValidators();
          curso?.setValue(''); // Reset value
        }
        curso?.updateValueAndValidity({ emitEvent: false });
      });

      arr.push(g);
    }
  }

  // ----------------------------------------------------
  // 3. Storage & Persistence
  // ----------------------------------------------------
  private initAutoSave(): void {
    if (!this.isBrowser) return;

    // Load
    const raw = localStorage.getItem(STORAGE_KEY);
    const savedCedula = localStorage.getItem(CEDULA_KEY);
    if (this.numeroCedula === savedCedula && raw) {
      try {
        const data = JSON.parse(raw);
        // Reconstruct Arrays before patch
        if (data.hijos) this.actualizarHijos(data.hijos.length);

        // We need to restore the state of the toggles (validators) based on loaded data
        // Since we use valueChanges to toggle, patching *should* trigger them if we use emitEvent:true (default)
        // But sometimes patchValue with complex forms is tricky.
        // Let's rely on the flows triggering.
        this.formHojaDeVida2.patchValue(data);
      } catch (e) {
        console.error('Error loading draft', e);
      }
    }

    // Save
    this.formHojaDeVida2.valueChanges.pipe(
      debounceTime(1000),
      takeUntil(this.destroy$)
    ).subscribe(val => {
      const cedula = this.formHojaDeVida2.get('numeroCedula')?.value;
      if (cedula) {
        const cleanVal = this.sanitizeForStorage(val);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanVal));
        localStorage.setItem(CEDULA_KEY, cedula);
      }
    });
  }

  private sanitizeForStorage(v: any): any {
    // Simple cyclic breaker / clean
    if (v === null || v === undefined) return v;
    if (typeof v !== 'object') return v;
    const copy: any = Array.isArray(v) ? [] : {};
    for (const k in v) {
      if (k === 'hojaDeVida') continue; // Don't save files
      if (v[k] instanceof File) continue;
      copy[k] = this.sanitizeForStorage(v[k]);
    }
    return copy;
  }

  // ----------------------------------------------------
  // 4. Catalogs
  // ----------------------------------------------------
  private loadCatalogs(): void {
    this.loadingCatalogos = true;
    this.parametrizacionS.bulkValores([...this.CATALOG_KEYS], true).subscribe({
      next: (resp: any) => {
        const results = resp?.results ?? {};
        // Iterate config and map values
        for (const key of this.CATALOG_KEYS) {
          const config: any = (this.CATALOG_CONFIG as any)[key];
          const rawItems: any[] = results[key] ?? []; // Raw response from new format

          // Map logic based on the config.map provided
          // The JSON structure has `datos` object inside each item.
          // We need to access `i.datos` before mapping with our callbacks if the callback expects `datos`.
          // WAIT - My config map callbacks expect `d` which I intended to be `i.datos`.

          const mapped = rawItems
            .filter(i => i.activo !== false)
            .map(i => {
              const d = i.datos || {};
              // Use the specific map function from config
              const val = config.map(d); // This returns the value or object

              // If the result is an object (for code/desc pairs), guard it
              if (typeof val === 'object' && val !== null) {
                return { value: val.code ?? val.codigo ?? val.mano ?? val.abbreviation ?? val.talla, viewValue: val.desc ?? val.descripcion ?? val.nombre ?? val.talla ?? val.abbreviation };
              }
              // scalar
              return { value: val, viewValue: val };
            })
            .filter(o => o.value != null)
            .sort((a, b) => String(a.viewValue || '').localeCompare(String(b.viewValue || ''), 'es', { sensitivity: 'base' }));

          // Remove dups (generic)
          const seen = new Set();
          const unique = [];
          for (const item of mapped) {
            const k = String(item.value).toUpperCase();
            if (!seen.has(k)) {
              seen.add(k);
              unique.push(item);
            }
          }

          // Assign
          // If original config prop expects objects (like tipoDocs), we keep the objects.
          // But my HTML templates expect `optionsKey` / `valueKey` if it's an object.
          // Checking `CATALOG_CONFIG`:
          // TIPOS_IDENTIFICACION -> map returns obj. 
          // SEXO -> scalar.
          // So `mapped` is always { value, viewValue }.
          // We need to unwrap if the original map was scalar?
          // Actually, my `selectField` template handles objects. 
          // But `tipoDocs` in HTML uses `optionsKey='description'`, `valueKey='abbreviation'`.
          // My `mapped` above creates `{value, viewValue}` which is standardized.

          // CORRECTION: The HTML expects specific keys for some, and just list of strings for others.
          // I should adapt usage to be consistent or just return what HTML expects.

          // Case 1: HTML uses `optionsKey`. (e.g. `tipoDocs`, `estadosCiviles`, `lateralidad`)
          // I should reshape `mapped` to match what HTML expects or update HTML.
          // Updating TS is safer.

          // Let's refine the mapping loop to be smarter.
          if (['tipoDocs', 'estadosCiviles', 'listamanos', 'oficinas'].includes(config.prop)) {
            // Keep as structured objects but standardized?
            // No, let's just push generic [{..., ...}] and user standardization in HTML or re-map here.
            // TIPOS_IDENTIFICACION: HTML expects `description`, `abbreviation`.
            // My mapping returns that.

            // Wait, my `mapped` logic above wraps everything in `{value, viewValue}`.
            // This breaks `TIPOS_IDENTIFICACION` which needs `abbreviation`.

            // RE-WRITE of loop:
            (this as any)[config.prop] = rawItems
              .filter(i => i.activo !== false)
              .map(i => config.map(i.datos || {})) // Raw map from config
              .sort((a: any, b: any) => {
                const va = a.description || a.descripcion || a.nombre || a;
                const vb = b.description || b.descripcion || b.nombre || b;
                return String(va).localeCompare(String(vb));
              });
          } else {
            // Simple string arrays (Generos, RH, etc.)
            (this as any)[config.prop] = rawItems
              .filter(i => i.activo !== false)
              .map(i => config.map(i.datos || {}))
              .sort(); // Simple sort
          }
        }
        this.loadingCatalogos = false;
      },
      error: () => {
        this.loadingCatalogos = false;
        Swal.fire({
          icon: 'error',
          title: 'Error cargando opciones',
          text: 'No se pudieron cargar las listas de selección (tipo documento, género, escolaridad, etc.). Recargue la página.',
          confirmButtonColor: '#111827'
        });
      }
    });
  }

  private str(v: any): string { return String(v ?? '').trim(); }

  // ----------------------------------------------------
  // 5. Actions (Submit & Upload)
  // ----------------------------------------------------


  private buildPayload(raw: any): any {
    // Helper to safe get
    const g = (k: string) => raw[k];
    const upper = (v: any) => typeof v === 'string' ? v.toUpperCase().trim() : v;
    const addr = (k: string) => this.normalizeAddressCO(raw[k]); // Normalize Address

    // Strict Mapping matching original
    const p: any = {
      tipoDoc: g('tipoDoc'),
      numeroCedula: g('numeroCedula'),
      pApellido: g('pApellido'),
      sApellido: g('sApellido'),
      pNombre: g('pNombre'),
      sNombre: g('sNombre'),
      genero: g('genero'),
      correo: g('correo')?.toLowerCase(),
      numCelular: g('numCelular'),
      numWha: g('numWha'),
      departamento: g('departamento'),
      ciudad: g('ciudad'),
      estadoCivil: g('estadoCivil'),
      direccionResidencia: addr('direccionResidencia'),
      barrio: g('zonaResidencia'),
      fechaExpedicionCc: this.toYmd(g('fechaExpedicionCC')),
      departamentoExpedicionCc: g('departamentoExpedicionCC'),
      municipioExpedicionCc: g('municipioExpedicionCC'),
      lugarNacimientoDepartamento: g('departamentoNacimiento'),
      lugarNacimientoMunicipio: g('municipioNacimiento'),
      rh: g('rh'),
      zurdoDiestro: g('lateralidad'),
      tiempoResidenciaZona: g('tiempoResidenciaZona'),
      lugarAnteriorResidencia: g('lugarAnteriorResidencia'),
      razonCambioResidencia: g('razonCambioResidencia'),
      zonasConocidas: g('zonasConocidas'),
      preferenciaResidencia: g('preferenciaResidencia'),
      fechaNacimiento: this.toYmd(g('fechaNacimiento')),
      estudiaActualmente: g('estudiaActualmente'),
      familiarEmergencia: g('familiarEmergencia'),
      parentescoFamiliarEmergencia: g('parentescoFamiliarEmergencia'),
      direccionFamiliarEmergencia: addr('direccionFamiliarEmergencia'),
      barrioFamiliarEmergencia: g('barrioFamiliarEmergencia'),
      telefonoFamiliarEmergencia: g('telefonoFamiliarEmergencia'),
      ocupacionFamiliarEmergencia: g('ocupacionFamiliarEmergencia'),
      oficina: g('oficina'),
      escolaridad: g('escolaridad'),
      estudiosExtra: (g('estudiosExtrasSelect') || []).join(','),
      nombreInstitucion: g('nombreInstitucion'),
      anoFinalizacion: this.toYmd(g('anoFinalizacion')),
      tituloObtenido: g('tituloObtenido'),
      chaqueta: g('tallaChaqueta'),
      pantalon: g('tallaPantalon'),
      camisa: g('tallaCamisa'),
      calzado: g('tallaCalzado'),
      nombreConyugue: g('nombresConyuge'),
      apellidoConyugue: g('apellidosConyuge'),
      numDocIdentidadConyugue: g('documentoIdentidadConyuge'),
      viveConElConyugue: g('viveConyuge'),
      direccionConyugue: addr('direccionConyugue'),
      telefonoConyugue: g('telefonoConyugue'),
      barrioMunicipioConyugue: g('barrioMunicipioConyugue'),
      ocupacion_conyugue: g('ocupacionConyuge'),
      nombrePadre: g('nombrePadre'),
      vivePadre: g('elPadreVive'),
      ocupacionPadre: g('ocupacionPadre'),
      direccionPadre: addr('direccionPadre'),
      telefonoPadre: g('telefonoPadre'),
      barrioPadre: g('barrioPadre'),
      nombreMadre: g('nombreMadre'),
      viveMadre: g('madreVive'),
      ocupacionMadre: g('ocupacionMadre'),
      direccionMadre: addr('direccionMadre'),
      telefonoMadre: g('telefonoMadre'),
      barrioMadre: g('barrioMadre'),
      nombreReferenciaPersonal1: g('nombreReferenciaPersonal1'),
      telefonoReferenciaPersonal1: g('telefonoReferencia1'),
      ocupacionReferenciaPersonal1: g('ocupacionReferencia1'),
      tiempoConoceReferenciaPersonal1: g('tiempoConoceReferenciaPersonal1'),
      direccionReferenciaPersonal1: addr('direccionReferenciaPersonal1'),
      nombreReferenciaPersonal2: g('nombreReferenciaPersonal2'),
      telefonoReferenciaPersonal2: g('telefonoReferencia2'),
      ocupacionReferenciaPersonal2: g('ocupacionReferencia2'),
      tiempoConoceReferenciaPersonal2: g('tiempoConoceReferenciaPersonal2'),
      direccionReferenciaPersonal2: addr('direccionReferenciaPersonal2'),
      nombreReferenciaFamiliar1: g('nombreReferenciaFamiliar1'),
      telefonoReferenciaFamiliar1: g('telefonoReferenciaFamiliar1'),
      ocupacionReferenciaFamiliar1: g('ocupacionReferenciaFamiliar1'),
      parentescoReferenciaFamiliar1: g('parentescoReferenciaFamiliar1'),
      direccionReferenciaFamiliar1: addr('direccionReferenciaFamiliar1'),
      nombreReferenciaFamiliar2: g('nombreReferenciaFamiliar2'),
      telefonoReferenciaFamiliar2: g('telefonoReferenciaFamiliar2'),
      ocupacionReferenciaFamiliar2: g('ocupacionReferenciaFamiliar2'),
      parentescoReferenciaFamiliar2: g('parentescoReferenciaFamiliar2'),
      direccionReferenciaFamiliar2: addr('direccionReferenciaFamiliar2'),
      nombreExpeLaboral1Empresa: g('nombreEmpresa1'),
      direccionEmpresa1: addr('direccionEmpresa1'),
      telefonosEmpresa1: g('telefonosEmpresa1'),
      nombreJefeEmpresa1: g('nombreJefe1'),
      fechaRetiroEmpresa1: this.toYmd(g('fechaRetiro1')),
      motivoRetiroEmpresa1: g('motivoRetiro1'),
      cargoEmpresa1: g('cargoEmpresa1'),
      empresas_laborado: g('empresas_laborado'),
      tiempoExperiencia: g('tiempoExperiencia'),
      familiaConUnSoloIngreso: g('familiaSolo'),
      numHabitaciones: g('numeroHabitaciones'),
      numPersonasPorHabitacion: g('personasPorHabitacion'),
      caracteristicasVivienda: g('caracteristicasVivienda'),
      experienciaLaboral: g('experienciaLaboral'),
      numHijosDependientes: g('numHijosDependientes'),
      cuidadorHijos: g('cuidadorHijos'),
      fuenteVacante: g('fuenteVacante'),
      areaExperiencia: (g('areaExperiencia') || []).join(', '),
      expectativasDeVida: (g('expectativasVidaChecks') || []).join(', '),
      servicios: (g('comodidadesChecks') || []).join(', '),
      tipoVivienda: (g('tiposViviendaChecks') || []).join(', '),
      personasConQuienConvive: (g('conQuienViveChecks') || []).join(', '),
      personas_a_cargo: (g('personas_a_cargo') || []).join(', '),

      // Evaluación (Opcional) — backend acepta estos nombres en snake_case
      relacion_familiar: g('relacionFamiliar'),
      rendimiento_laboral: g('desempenoLaboral'),
      porque_lo_felicitarian: g('felicitaciones'),
      malentendido: g('situacionConflictiva'),
      actividades_diarias: g('actividadesDiferentes'),
    };

    // Hijos Array
    const hijosArr = g('hijos') || [];
    p.hijos = hijosArr.map((h: any) => ({
      ...h,
      fechaNacimientoHijo: this.toYmd(h.fechaNacimientoHijo)
    }));

    // Convert to Uppercase Recursively
    return this.convertValuesToUpperCase(p);
  }

  convertValuesToUpperCase(v: any): any {
    if (typeof v === 'string') {
      // Phones: Keep digits only
      if (/^\d+$/.test(v) && v.length > 5) return v;
      // Emails: Keep lowercase
      if (v.includes('@')) return v.toLowerCase();
      return v.toUpperCase().trim();
    }
    if (Array.isArray(v)) return v.map(i => this.convertValuesToUpperCase(i));
    if (v && typeof v === 'object') {
      const out: any = {};
      for (const k in v) out[k] = this.convertValuesToUpperCase(v[k]);
      return out;
    }
    return v;
  }

  // ----------------------------------------------------
  // 6. Helpers
  // ----------------------------------------------------
  subirArchivo(event: any, campo: string) {
    const file = event.target.files?.[0];
    if (file) {
      if (file.name.length > 100) {
        Swal.fire('Error', 'El nombre es muy largo (máximo 100).', 'error');
        event.target.value = '';
        return;
      }
      this.uploadedFiles[campo] = { file, fileName: file.name };
      this.formHojaDeVida2.patchValue({ [campo]: file.name });
    }
  }

  verArchivo(campo: string) {
    const f = this.uploadedFiles[campo]?.file;
    if (f) {
      const url = f instanceof File ? URL.createObjectURL(f) : f;
      window.open(url as string, '_blank');
    } else {
      Swal.fire('Error', 'No hay archivo', 'error');
    }
  }

  subirTodosLosArchivos(): Promise<boolean> {
    const pend = Object.keys(this.uploadedFiles).filter(k => this.typeMap[k] && this.uploadedFiles[k]?.file instanceof File);
    if (!pend.length) return Promise.resolve(true);

    const promises = pend.map(k => {
      const d = this.uploadedFiles[k];
      if (!d) return Promise.resolve(true);
      return firstValueFrom(this.gestionDocumentosService.guardarDocumento(d.fileName, this.numeroCedula, this.typeMap[k], d.file as File));
    });
    return Promise.all(promises).then(() => true).catch(() => false);
  }

  limpiarCamposAdicionales() {
    this.uploadedFiles['hojaDeVida'] = { file: '', fileName: '' };
  }

  updateStepperStats() {
    if (!this.stepper) return;
    this.stepperTotal = this.stepper.steps.length;
    this.stepperIndex = this.stepper.selectedIndex + 1;
    this.stepperProgress = this.stepperTotal ? (this.stepperIndex / this.stepperTotal) * 100 : 0;
    this.cdr.markForCheck();
  }

  // ----------------------------------------------------
  getControl(name: string, form: FormGroup = this.formHojaDeVida2): FormControl {
    return form.get(name) as FormControl;
  }

  asFormGroup(c: AbstractControl): FormGroup {
    return c as FormGroup;
  }

  shouldShowError(controlName: string, form: FormGroup = this.formHojaDeVida2): boolean {
    const control = form.get(controlName);
    return !!(control && control.invalid && (control.touched || control.dirty));
  }

  getErrorMessage(controlName: string, form: FormGroup = this.formHojaDeVida2): string {
    const control = form.get(controlName);
    if (!control || !control.errors) return '';

    const errors = control.errors;
    if (errors['required']) return 'Campo requerido';
    if (errors['email']) return 'Correo inválido';
    if (errors['minlength']) return `Mínimo ${errors['minlength'].requiredLength} caracteres`;
    if (errors['maxlength']) return `Máximo ${errors['maxlength'].requiredLength} caracteres`;
    if (errors['pattern']) return 'Formato inválido';

    // Custom & New
    if (errors['invalidAddress']) return 'Dirección inválida. Ej: CL 12 33 24'; // UX Rule

    if (errors['invalidName']) return 'Solo letras y espacios'; // Custom
    if (errors['invalidPhone']) return 'Formato 3xxxxxxxxx'; // Custom
    if (errors['invalidDoc']) return 'Solo números'; // Custom
    if (errors['looksLikePhone']) return 'Parece un número de celular, ingrese un documento válido.';
    if (errors['specialChars']) return 'Sin caracteres especiales';
    if (errors['invalidDate']) return 'Fecha no válida';

    // New Validation Messages
    if (errors['nameMinWords']) return 'Escribe mínimo nombre y apellido.';
    if (errors['nameStopword']) return 'Nombre inválido. Escribe un nombre real (mínimo nombre y apellido).';
    if (errors['nameRepeatedWord']) return 'Nombre inválido. Evita repetir la misma palabra.';
    if (errors['nameRepeatedChar']) return `Nombre inválido. Revisa la palabra: ${errors['nameRepeatedChar'].word}.`;

    if (errors['duplicateReferenceName']) return 'Este nombre ya fue usado en otra referencia.';
    if (errors['duplicateReferencePhone']) return 'Este teléfono ya fue usado en otra referencia.';

    return 'Valor inválido';
  }

  showInvalidFormAlert() {
    Swal.fire({
      icon: 'warning', title: 'Formulario Incompleto',
      html: 'Hay campos obligatorios sin llenar o con errores. <b>Revise los campos marcados en rojo</b> en cada paso del formulario y asegúrese de completarlos correctamente.',
      confirmButtonColor: '#111827'
    });
  }

  // Utils
  toYmd(d: any): string {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  }

  // ----------------------------------------------------
  // 3. Validation Helpers (Strict)
  // ----------------------------------------------------

  // Stopwords Set
  private readonly STOPWORDS = new Set([
    'NO', 'NA', 'N/A', 'SN', 'S/N', 'NULL', 'NULO', 'NONE', 'SIN',
    'PRUEBA', 'TEST', 'DEMO', 'XXX', 'XXXX', 'ASD', 'QWERTY',
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L',
    'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
  ]); // Added single letters as stopwords for full names? User request says "NO, NA..."
  // User didn't ask for single letters, but "Normalización" implies checking against this list.

  private normalizeSpaces(val: string): string {
    return val ? val.trim().replace(/\s+/g, ' ') : '';
  }

  // --- Address Normalization (Colombia Standard) ---
  // --- Address Normalization (Colombia Standard) ---
  normalizeAddressCO(value: string): string {
    if (!value) return '';
    let v = value.toUpperCase().trim();

    // 1. Remove special chars except space
    v = v.replace(/[#º°\.,:;\/\-\_\(\)\[\]\{\}"'&]/g, ' ');
    v = v.replace(/\s+/g, ' ').trim();

    // 2. Remove accents
    v = v.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const tokens = v.split(' ');
    const out: string[] = [];

    // Mappings Strict per user request
    const VIAS: { [key: string]: string } = {
      'CALLE': 'CL', 'CLL': 'CL', 'CLLE': 'CL', 'CL': 'CL',
      'CARRERA': 'CR', 'CRA': 'CR', 'CRRA': 'CR', 'KR': 'CR', 'KRA': 'CR', 'KRR': 'CR', 'CRR': 'CR', 'CR': 'CR',
      'DIAGONAL': 'DG', 'DIAG': 'DG', 'DG': 'DG',
      'TRANSVERSAL': 'TV', 'TRANSV': 'TV', 'TRV': 'TV', 'TV': 'TV',
      'AVENIDA': 'AV', 'AV': 'AV', 'AVDA': 'AV', 'AVEN': 'AV',
      'AUTOPISTA': 'AUT', 'AUTO': 'AUT', 'AUT': 'AUT',
      'CIRCULAR': 'CIRC', 'CIRC': 'CIRC',
      'VIA': 'VIA', 'VÍA': 'VIA'
    };

    const COMPLEMENTS: { [key: string]: string } = {
      'SUR': 'SUR', 'S': 'SUR',
      'NORTE': 'NORTE', 'N': 'NORTE',
      'ESTE': 'ESTE', 'E': 'ESTE',
      'ORIENTE': 'O', 'O': 'O',
      'OCCIDENTE': 'OCC', 'OESTE': 'OCC', 'OCC': 'OCC', 'W': 'OCC',
      'BIS': 'BIS',
      'INTERIOR': 'INT', 'INT': 'INT',
      'APARTAMENTO': 'APTO', 'APTO': 'APTO',
      'TORRE': 'TORRE',
      'BLOQUE': 'BLOQUE',
      'ETAPA': 'ETAPA',
      'MANZANA': 'MZ', 'MZ': 'MZ',
      'CASA': 'CASA',
      'LOTE': 'LOTE',
      'KILOMETRO': 'KM', 'KM': 'KM', 'KILÓMETRO': 'KM'
    };

    for (const t of tokens) {
      if (VIAS[t]) {
        out.push(VIAS[t]);
      } else if (COMPLEMENTS[t]) {
        out.push(COMPLEMENTS[t]);
      } else {
        if (t.length > 0) out.push(t);
      }
    }

    const final: string[] = [];
    for (let i = 0; i < out.length; i++) {
      const curr = out[i];
      const next = out[i + 1];

      // Fix: AV CALLE -> AV, AV CARRERA -> AK
      if (curr === 'AV' && next === 'CL') { final.push('AV'); i++; continue; }
      if (curr === 'AV' && next === 'CR') { final.push('AK'); i++; continue; }

      final.push(curr);
    }

    return final.join(' ');
  }

  addressCOValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const val = this.normalizeAddressCO(control.value);
      const tokens = val.split(' ');

      // 1. Min Tokens
      if (tokens.length < 4) return { invalidAddress: true };

      // 2. Must start with VIA
      const VALID_VIAS = new Set(['CL', 'CR', 'DG', 'TV', 'AV', 'AK', 'AUT', 'CIRC', 'VIA']);
      if (!VALID_VIAS.has(tokens[0])) return { invalidAddress: true };

      // 3. At least 2 numeric tokens
      const numTokens = tokens.filter(t => /^\d/.test(t) || /\d$/.test(t));
      if (numTokens.length < 2) return { invalidAddress: true };

      return null;
    };
  }

  normalizeAddressControl(ctrlName: any, form: FormGroup = this.formHojaDeVida2) {
    const control = form.get(ctrlName);
    if (control && control.value) {
      const norm = this.normalizeAddressCO(control.value);
      if (norm !== control.value) {
        control.setValue(norm, { emitEvent: false });
        control.updateValueAndValidity();
      }
    }
  }



  private noSpecialCharsValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      const valid = /^[a-zA-Z0-9\s]*$/.test(control.value);
      return valid ? null : { specialChars: true };
    };
  }

  private nameValidator(required = true): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const val = control.value;
      if (!val && !required) return null;
      if (!val) return required ? { required: true } : null;

      // 1. Regex Check
      if (!REGEX_NAMES.test(val)) return { invalidName: true };

      const norm = this.normalizeSpaces(val).toUpperCase();
      const words = norm.split(' ');

      // 2. Stopwords & Garbage Check per word
      for (const w of words) {
        if (this.STOPWORDS.has(w)) return { nameStopword: { word: w } };

        // Repeated Chars (AAA, BBB) - 3+ same char
        if (/^(.)\1{2,}$/.test(w)) return { nameRepeatedChar: { word: w } };
      }

      return null;
    };
  }

  private fullNameValidator(required = true): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const val = control.value;
      if (!val && !required) return null;
      if (!val) return { required: true };

      // 1. Basic Name Check
      const nameVal = this.nameValidator(required)(control);

      if (nameVal) return nameVal;

      const norm = this.normalizeSpaces(val).toUpperCase();
      const words = norm.split(' ');

      // 2. Min 2 Words (Name + Surname)
      if (words.length < 2) return { nameMinWords: true };

      // 3. Repeated Words (e.g. "NO NO", "TEST TEST")
      // Check if all words are identical
      const first = words[0];
      if (words.every(w => w === first)) return { nameRepeatedWord: true };

      return null;
    };
  }

  private phoneCOValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const val = control.value;
      if (!val) return null;
      const valid = REGEX_PHONE_CO.test(val);
      return valid ? null : { invalidPhone: true };
    };
  }

  private docValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const val = control.value;
      if (!val) return null;
      const valid = REGEX_NUMERIC.test(val);
      if (!valid) return { invalidDoc: true };
      // Reject Colombian cellphone numbers (10 digits starting with 3)
      if (/^3\d{9}$/.test(val)) return { looksLikePhone: true };
      return null;
    };
  }

  private notPhoneNumberValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const val = control.value;
      if (!val) return null;
      if (/^3\d{9}$/.test(val)) return { looksLikePhone: true };
      return null;
    };
  }

  private dateReasonableValidator(minYear: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const val = control.value;
      if (!val) return null;
      const d = new Date(val);
      const year = d.getFullYear();
      if (year < minYear || year > new Date().getFullYear()) {
        return { invalidDate: true };
      }
      return null;
    };
  }

  // ----------------------------------------------------
  // 4. Pre-check Search Logic
  // ----------------------------------------------------
  onSearch() {
    if (this.searchForm.invalid) {
      this.searchForm.markAllAsTouched();
      return;
    }

    const { tipo_doc, numero_documento } = this.searchForm.value;
    this.startForm(tipo_doc, numero_documento);
  }

  // ----------------------------------------------------
  // 5. Background Save (Step 1)
  // ----------------------------------------------------
  // ----------------------------------------------------
  // Helper: Step Mapping
  // ----------------------------------------------------
  readonly STEP1_KEYS = [
    'oficina', 'tipoDoc', 'numeroCedula',
    'fechaExpedicionCC', 'departamentoExpedicionCC', 'municipioExpedicionCC',
    'pNombre', 'sNombre', 'pApellido', 'sApellido', 'genero',
    'fechaNacimiento', 'departamentoNacimiento', 'municipioNacimiento', 'estadoCivil',
    'correoUsuario', 'correoDominio', 'correo',
    'numCelular', 'numWha', 'direccionResidencia', 'zonaResidencia',
    'departamento', 'ciudad', 'tiempoResidenciaZona', 'conQuienViveChecks',
    // Moved/New Fields
    'escolaridad',
    'expectativasVidaChecks'
  ];

  /*
   * Returns the step index (0-based) where the control resides.
   * Based on structure in HTML.
   * Step 0: Pre-registro (STEP1_KEYS)
   * Step 1: Detalles (rh, lateralidad, tallas, educación, contacto emergencia, etc.)
   * Step 2: Familia (conyuge, padres, referencias)
   * Step 3: Experiencia (experiencia, hijos, vivienda)
   * Step 4: Final (docs, deseaGenerar)
   */
  private getStepIndex(ctrl: string): number {
    if (this.STEP1_KEYS.includes(ctrl)) return 0;

    // Step 2: Familia & Referencias
    if (ctrl.includes('Conyuge') || ctrl.includes('Padre') || ctrl.includes('Madre') || ctrl.includes('Referencia')) return 2;

    // Step 3: Experiencia, Hijos, Vivienda
    if (ctrl.includes('Empresa') || ctrl.includes('Jefe') || ctrl.includes('Retiro') ||
      ctrl.includes('experiencia') || ctrl.includes('Hijos') || ctrl.includes('hijos') ||
      ctrl.includes('Vivienda') || ctrl.includes('Habitaciones') || ctrl.includes('Personas') ||
      ctrl.includes('comodidades') || ctrl.includes('expectativas') || ctrl.includes('fuente') ||
      ctrl.includes('cuidador') || ctrl.includes('laborado')) return 3;

    // Step 4: Final
    if (ctrl.includes('deseaGenerar') || ctrl.includes('Vehiculo') || ctrl.includes('Licencia') ||
      ctrl.includes('estaTrabajando') || ctrl.includes('Actual') || ctrl.includes('Trabajo') ||
      ctrl.includes('Contrato') || ctrl.includes('Antes') || ctrl.includes('Hermanos') || ctrl.includes('hermanos') ||
      ctrl.includes('hojaDeVida')) return 4;

    // Default to Step 1 (Detalles) for everything else (rh, lateralidad, tallas, educacion, etc.)
    return 1;
  }

  // ----------------------------------------------------
  // 5. Actions (Submit & Upload)
  // ----------------------------------------------------
  async imprimirInformacion2(): Promise<void> {
    if (this.formHojaDeVida2.invalid) {
      this.formHojaDeVida2.markAllAsTouched();

      // Check Group Errors (Cross Validators)
      const errors = this.formHojaDeVida2.errors;
      if (errors) {
        if (errors['expeditionBeforeBirth']) {
          Swal.fire('Fecha Inválida', 'La fecha de expedición no puede ser anterior a la fecha de nacimiento.', 'error');
          this.stepper.selectedIndex = 0; // Go to Step 1
          return;
        }
      }

      // Check Duplicates in Referencias (Usually assigned to controls, but check global just in case)
      // The validator assigns errors to specific controls (e.g., 'nombreReferenciaPersonal2').
      // We find the first invalid control to navigate.

      let firstInvalidControl = '';
      const controls = this.formHojaDeVida2.controls;
      for (const key in controls) {
        if (controls[key].invalid) {
          firstInvalidControl = key;
          break;
        }
      }

      if (firstInvalidControl) {
        const stepIdx = this.getStepIndex(firstInvalidControl);
        this.stepper.selectedIndex = stepIdx;
        const humanName = this.fieldHumanName(firstInvalidControl);
        Swal.fire({
          icon: 'warning',
          title: 'Formulario Incompleto',
          html: `Revise el campo <b>"${humanName}"</b> en el <b>paso ${stepIdx + 1}</b>. Está vacío o tiene un formato incorrecto.`,
          confirmButtonColor: '#111827'
        });
      } else {
        // Fallback
        this.showInvalidFormAlert();
      }
      return;
    }

    // Backend duplicate check
    const raw = this.formHojaDeVida2.getRawValue();
    const correo = String(raw.correo || '').trim().toLowerCase();
    const cedula = String(raw.numeroCedula || '').trim();

    try {
      const check: any = await firstValueFrom(this.candidateS.validarCorreoCedula(correo, cedula));
      if (check?.correo_repetido) {
        let msg = 'El correo ya existe en nuestro sistema.';
        if (check.duplicado_info) {
          msg = `El correo ya está en uso por:<br><b>${check.duplicado_info.nombres} ${check.duplicado_info.apellidos}</b><br>Documento: <b>${check.duplicado_info.documento}</b>`;
        }
        Swal.fire({
          icon: 'error',
          title: '¡Correo duplicado!',
          html: msg
        });
        return;
      }
    } catch {
      Swal.fire('Error', 'No se pudo validar el correo.', 'error');
      return;
    }

    // Build Payload
    this.numeroCedula = cedula;
    const payload = this.buildPayload(raw);

    // Send
    Swal.fire({ title: 'Guardando...', didOpen: () => Swal.showLoading() });

    this.registroProcesoContratacion.crearActualizarCandidato2(payload).subscribe({
      next: async (upsertResp: any) => {
        try {
          // Detectar respuesta falsa del offline interceptor
          if (upsertResp?.offline === true) {
            Swal.fire({
              icon: 'info',
              title: 'Guardado localmente',
              html: 'No hay conexión a internet. Sus datos se guardaron en su dispositivo y se enviarán automáticamente cuando vuelva la conexión.',
              confirmButtonColor: '#111827'
            });
            return;
          }

          if (!upsertResp?.ok && !upsertResp?.numero_documento) {
            return this.handleBackendError(upsertResp, 'No se pudo guardar la información personal.');
          }
          this.numeroCedula = upsertResp.numero_documento ?? this.numeroCedula;

          // Formulario Vacantes Part 2
          const part2: any = await firstValueFrom(this.registroProcesoContratacion.formulario_vacantes(payload));
          if (!part2 || (!part2.ok && !part2.success && !part2.message)) {
            return this.handleBackendError(part2, 'Ocurrió un error guardando tu experiencia/vacante.');
          }

          // Upload Files
          let filesOk = true;
          try {
            filesOk = await this.subirTodosLosArchivos();
          } catch(e) {
            filesOk = false;
          }
          
          Swal.fire(filesOk ? '¡Éxito!' : 'Proceso Incompleto', filesOk ? 'Tu información general ha sido guardada exitosamente.' : 'La información guardó, pero hubo un problema subiendo tu Hoja de Vida. Intenta enviarla más tarde.', filesOk ? 'success' : 'warning');
        } catch (error) {
           this.handleBackendError(error, 'Fallo procesando la carga (Parte 2)');
        }
      },
      error: (err: any) => {
        this.handleBackendError(err);
      }
    });
  }

  // Traductor Maestro de Errores Django -> Humano
  private handleBackendError(err: any, fallbackMessage: string = 'Revisa los datos del formulario e intenta de nuevo.') {
    Swal.close(); // Cerramos el "Guardando..."
    console.error('Error de Backend Interceptado:', err);

    // Nombres humanos de los campos (de técnico a lo que ve el usuario)
    const campos: Record<string, string> = {
      'numero_documento': 'el número de cédula',
      'tipo_documento': 'el tipo de documento',
      'tipo_doc': 'el tipo de documento',
      'correo_electronico': 'el correo electrónico',
      'correo': 'el correo electrónico',
      'email': 'el correo electrónico',
      'password': 'la contraseña',
      'fecha_nacimiento': 'la fecha de nacimiento',
      'fecha_expedicion': 'la fecha de expedición del documento',
      'primer_nombre': 'el primer nombre',
      'segundo_nombre': 'el segundo nombre',
      'primer_apellido': 'el primer apellido',
      'segundo_apellido': 'el segundo apellido',
      'celular': 'el número de celular',
      'whatsapp': 'el número de WhatsApp',
      'telefono': 'el número de teléfono',
      'sexo': 'el género',
      'estado_civil': 'el estado civil',
      'oficina': 'la oficina',
      'contacto': 'los datos de contacto',
      'residencia': 'los datos de residencia',
      'experiencia': 'la experiencia laboral',
      'hermanos': 'los hermanos',
      'hijos': 'los hijos',
      'familiares': 'los familiares',
      'referencias': 'las referencias',
      'estudios': 'los estudios',
      'nombre': 'el nombre',
      'apellido': 'el apellido',
      'edad': 'la edad',
      'direccion': 'la dirección',
      'ciudad': 'la ciudad',
      'departamento': 'el departamento',
      'pais': 'el país',
      'barrio': 'el barrio',
      'parentesco': 'el parentesco',
      'empresa': 'la empresa',
      'cargo': 'el cargo',
      'non_field_errors': 'los datos del formulario'
    };

    // Mensajes del backend traducidos a frases humanas
    const traducciones: Array<{ re: RegExp; msg: string }> = [
      { re: /this field must be unique/i, msg: 'ya está registrado en el sistema. Revise si usted (o alguien) ya se inscribió antes.' },
      { re: /user with this .* already exists/i, msg: 'ya existe una persona registrada con este dato. Use otro.' },
      { re: /this field must be unique for the given/i, msg: 'ya existe un registro con este tipo y número de documento.' },
      { re: /this field may not be blank/i, msg: 'no puede quedar vacío. Por favor llénelo.' },
      { re: /this field may not be null/i, msg: 'es obligatorio. Por favor llénelo.' },
      { re: /this field is required/i, msg: 'es obligatorio. Falta llenarlo.' },
      { re: /ensure this field has at least (\d+) characters/i, msg: 'es demasiado corto.' },
      { re: /ensure this field has no more than (\d+) characters/i, msg: 'es demasiado largo.' },
      { re: /enter a valid email/i, msg: 'no tiene el formato correcto. Ejemplo: nombre@gmail.com' },
      { re: /a valid integer is required/i, msg: 'debe ser un número (sin letras ni símbolos).' },
      { re: /a valid number is required/i, msg: 'debe ser un número válido.' },
      { re: /date has wrong format/i, msg: 'tiene un formato de fecha incorrecto. Use año-mes-día, ejemplo: 2025-01-15.' },
      { re: /is not a valid choice/i, msg: 'tiene un valor no permitido. Seleccione una opción de la lista.' },
      { re: /invalid password/i, msg: 'no es válida.' },
    ];

    const traducirMensaje = (msg: any): string => {
      const t = typeof msg === 'string' ? msg.trim() : String(msg ?? '').trim();
      if (!t) return 'tiene un error.';
      for (const { re, msg: human } of traducciones) {
        if (re.test(t)) return human;
      }
      return t;
    };

    // Convierte una "ruta" de campo en frase: ['hermanos','1','nombre'] -> 'en el hermano 2, el nombre'
    const rutaAFrase = (path: string[]): string => {
      if (path.length === 0) return '';
      const partes: string[] = [];
      for (let i = 0; i < path.length; i++) {
        const seg = path[i];
        if (/^\d+$/.test(seg)) {
          const anterior = path[i - 1];
          const nombreItem = anterior && campos[anterior]
            ? campos[anterior].replace(/^(los |las |el |la )/, '').replace(/s$/, '')
            : 'elemento';
          partes.push(`en el ${nombreItem} ${Number(seg) + 1}`);
        } else {
          partes.push(campos[seg] || seg.replace(/_/g, ' '));
        }
      }
      return partes.join(', ');
    };

    // Aplana recursivamente la estructura de errores DRF
    const aplanar = (node: any, path: string[] = [], acc: Array<{ campo: string; mensaje: string }> = []) => {
      if (node == null) return acc;

      if (Array.isArray(node)) {
        node.forEach((child, idx) => {
          if (typeof child === 'string') {
            acc.push({ campo: rutaAFrase(path), mensaje: traducirMensaje(child) });
          } else {
            aplanar(child, [...path, String(idx)], acc);
          }
        });
        return acc;
      }

      if (typeof node === 'object') {
        for (const [key, value] of Object.entries(node)) {
          // Ignorar metadatos al nivel raíz
          if (path.length === 0 && (key === 'detail' || key === 'ok' || key === 'success' || key === 'status_code' || key === 'message')) {
            continue;
          }
          aplanar(value, [...path, key], acc);
        }
        return acc;
      }

      if (typeof node === 'string') {
        acc.push({ campo: rutaAFrase(path), mensaje: traducirMensaje(node) });
      }
      return acc;
    };

    const rawBody = err?.error ?? err;
    const errorsNode = (rawBody && typeof rawBody === 'object' && rawBody.errors !== undefined)
      ? rawBody.errors
      : rawBody;

    const problemas = aplanar(errorsNode);

    // Capitaliza la primera letra de una frase
    const cap = (s: string) => s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s;

    let htmlMensaje = '';

    if (problemas.length > 0) {
      htmlMensaje += `<p style="text-align:left;font-size:15px;margin:0 0 10px 0;">Por favor revisa lo siguiente y vuelve a intentar:</p>`;
      htmlMensaje += `<ul style="text-align:left;font-size:14px;color:#b71c1c;padding-left:22px;margin:0;line-height:1.5;">`;
      for (const { campo, mensaje } of problemas) {
        const frase = campo
          ? `${cap(campo)} ${mensaje}`
          : cap(mensaje);
        htmlMensaje += `<li style="margin-bottom:6px;">${frase}</li>`;
      }
      htmlMensaje += `</ul>`;
    } else {
      // Sin detalles por campo → mensaje simple
      let simpleMsg: string;
      if (err?.status === 0) {
        simpleMsg = 'No se pudo conectar con el servidor. Revisa tu conexión a internet y vuelve a intentar.';
      } else if (err?.status === 401) {
        simpleMsg = 'Tu sesión expiró. Cierra y vuelve a iniciar sesión.';
      } else if (err?.status === 403) {
        simpleMsg = 'No tienes permisos para realizar esta acción.';
      } else if (err?.status === 404) {
        simpleMsg = 'No se encontró la información solicitada.';
      } else if (err?.status >= 500) {
        simpleMsg = 'El servidor está teniendo problemas. Espera un momento y vuelve a intentar.';
      } else {
        const msgCrudo = (rawBody && typeof rawBody === 'object' ? (rawBody.detail || rawBody.message) : null)
          || err?.message
          || fallbackMessage;
        simpleMsg = traducirMensaje(msgCrudo);
      }
      htmlMensaje = `<p style="text-align:left;font-size:15px;margin:0;">${simpleMsg}</p>`;
    }

    htmlMensaje += `<p style="font-size:12px;color:#888;margin-top:14px;text-align:left;">Si el problema continúa, comuníquese con soporte${this.numeroCedula ? ` con su cédula: <b>${this.numeroCedula}</b>` : ''}.</p>`;

    Swal.fire({
      icon: 'error',
      title: 'No se pudo guardar',
      html: htmlMensaje,
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#111827',
      width: 520
    });
  }

  // Updated Background Save (Step 1)
  saveStep1InBackgroundAndNext() {
    const f = this.formHojaDeVida2;
    let invalid = false;

    // Validate only Step 1 keys
    for (const k of this.STEP1_KEYS) {
      const c = f.get(k);
      if (c && c.invalid) {
        c.markAsTouched();
        invalid = true;
      }
    }

    if (invalid) {
      // Show alert if user tries to proceed with invalid Step 1
      Swal.fire('Información Incompleta', 'Por favor completa los campos obligatorios del paso 1.', 'warning');
      return;
    }

    // Prepare Payload (Subset)
    const raw = f.getRawValue();
    const g = (k: string) => (raw[k] || ''); // Safe accessor
    const upper = (v: string) => String(v || '').toUpperCase().trim();

    // Construct Dynamic Payload
    const formValue = {
      "oficina": upper(g('oficina')),
      "tipo_doc": g('tipoDoc'),
      "numero_documento": g('numeroCedula'),
      "primer_apellido": upper(g('pApellido')),
      "segundo_apellido": upper(g('sApellido')),
      "primer_nombre": upper(g('pNombre')),
      "segundo_nombre": upper(g('sNombre')),
      "fecha_nacimiento": this.toYmd(g('fechaNacimiento')),
      "sexo": g('genero'),
      "estado_civil": g('estadoCivil'),

      "contacto": {
        "email": (g('correo') || '').toLowerCase(),
        "celular": g('numCelular'),
        "whatsapp": g('numWha')
      },

      "residencia": {
        "barrio": upper(g('zonaResidencia')),
        "hace_cuanto_vive": upper(g('tiempoResidenciaZona'))
      },

      "info_cc": {
        "fecha_expedicion": this.toYmd(g('fechaExpedicionCC')),
        "mpio_expedicion": upper(g('municipioExpedicionCC')),
        "mpio_nacimiento": upper(g('municipioNacimiento'))
      },

      "vivienda": {
        "personas_con_quien_convive": (g('conQuienViveChecks') || []).join(', ')
      },

      "formaciones": [
        { "nivel": g('escolaridad') }
      ],

      "entrevistas": [
        {
          "oficina": upper(g('oficina')),
          "como_se_proyecta": (g('expectativasVidaChecks') || []).join(', ')
        }
      ],

      // Password = número de cédula (automático, no lo ingresa el usuario)
      "password": g('numeroCedula')
    };

    // Guardar paso 1 con feedback al usuario
    Swal.fire({ title: 'Guardando paso 1...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    this.registroProcesoContratacion.crearActualizarCandidato(formValue)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          console.log('Step 1 Saved', res);

          // Detectar respuesta offline falsa
          if (res?.offline === true) {
            Swal.fire({
              icon: 'info',
              title: 'Sin conexión',
              html: 'Sus datos se guardaron localmente y se enviarán cuando vuelva la conexión. Puede seguir llenando el formulario.',
              timer: 3000,
              showConfirmButton: false
            });
            this.stepper.next();
            return;
          }

          // Crear usuario en background (no bloquea al usuario)
          this.createUserInBackground(raw);
          Swal.fire({
            icon: 'success',
            title: 'Paso 1 guardado',
            text: 'Sus datos básicos se guardaron correctamente.',
            timer: 2000,
            showConfirmButton: false
          });
          this.stepper.next();
        },
        error: (err) => {
          console.error('Step 1 Save Failed', err);
          this.handleBackendError(err, 'No se pudo guardar el paso 1. Revise los datos e intente de nuevo.');
        }
      });
  }

  /**
   * Crea o actualiza un usuario en gestion_admin.
   *
   * Flujo:
   * 1. POST /auth/register/ → si funciona, listo.
   * 2. Si falla por documento duplicado → buscar ese usuario y hacerle PATCH.
   * 3. Si falla por correo duplicado (otra persona lo tiene) → mostrar quién.
   * 4. Si falla por otra razón → mostrar error traducido.
   */
  private createUserInBackground(raw: any): void {
    const apiUrl = (environment.apiUrl || '').replace(/\/$/, '');
    const g = (k: string) => (raw[k] || '');
    const upper = (v: string) => String(v || '').toUpperCase().trim();

    const numeroCedula = String(g('numeroCedula')).substring(0, 20);
    const tipoDoc = String(g('tipoDoc')).substring(0, 4);
    const correo = (g('correo') || '').toLowerCase().trim();
    const password = numeroCedula; // Password = número de cédula
    const nombres = [upper(g('pNombre')), upper(g('sNombre'))].filter(Boolean).join(' ').substring(0, 64);
    const apellidos = [upper(g('pApellido')), upper(g('sApellido'))].filter(Boolean).join(' ').substring(0, 64);
    const celular = g('numCelular') || null;

    if (!numeroCedula || !correo || !password || !tipoDoc) {
      console.warn('[createUser] Faltan datos mínimos, se omite creación.');
      return;
    }

    const registerPayload: any = {
      numero_de_documento: numeroCedula,
      tipo_documento: tipoDoc,
      correo_electronico: correo,
      password,
      nombres,
      apellidos,
      celular,
      estado_solicitudes: true,
      rol: '136d38f8e3a04ca299a6e8b9105c1900',
    };

    this.http.post<any>(`${apiUrl}/gestion_admin/auth/register/`, registerPayload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          if (res?.offline === true) {
            Swal.fire({
              icon: 'info',
              title: 'Sin conexión a internet',
              html: `Sus datos del formulario quedaron guardados en este dispositivo.<br><br>
                     <b>Su cuenta de acceso se creará automáticamente</b> cuando vuelva la conexión a internet.<br><br>
                     Puede seguir llenando el resto del formulario con tranquilidad.`,
              confirmButtonColor: '#111827'
            });
            return;
          }
          console.log('[createUser] Usuario creado OK:', res?.id || res);
        },
        error: (err: any) => {
          const status = err?.status;
          const errBody = err?.error;
          console.warn('[createUser] Registro falló (status ' + status + '):', errBody);

          // Sin conexión con el servidor
          if (status === 0) {
            Swal.fire({
              icon: 'warning',
              title: 'No hay conexión con el servidor',
              html: `<p style="text-align:left;">Sus datos del formulario <b>sí se guardaron correctamente</b>.</p>
                     <p style="text-align:left;">Pero no pudimos crear su cuenta de acceso porque no hay conexión a internet en este momento.</p>
                     <p style="text-align:left;">Continúe llenando el formulario. Si al terminar todavía tiene problemas para ingresar, comuníquese con la oficina con su cédula: <b>${numeroCedula}</b>.</p>`,
              confirmButtonText: 'Entendido',
              confirmButtonColor: '#111827',
              width: 520
            });
            return;
          }

          // El servidor respondió pero tiene problemas
          if (status >= 500) {
            Swal.fire({
              icon: 'warning',
              title: 'El servidor tiene un problema',
              html: `<p style="text-align:left;">Sus datos del formulario <b>sí se guardaron correctamente</b>.</p>
                     <p style="text-align:left;">No pudimos crear su cuenta de acceso porque el servidor no está respondiendo bien en este momento.</p>
                     <p style="text-align:left;">Espere unos minutos y, si todavía tiene problemas para ingresar, comuníquese con la oficina con su cédula: <b>${numeroCedula}</b>.</p>`,
              confirmButtonText: 'Entendido',
              confirmButtonColor: '#111827',
              width: 520
            });
            return;
          }

          // 401/403: problemas de permisos (no debería pasar con /auth/register pero por si acaso)
          if (status === 401 || status === 403) {
            Swal.fire({
              icon: 'warning',
              title: 'No tenemos permisos para crear la cuenta',
              html: `<p style="text-align:left;">Sus datos del formulario <b>sí se guardaron correctamente</b>.</p>
                     <p style="text-align:left;">Pero no pudimos crear su cuenta de acceso. Comuníquese con la oficina con su cédula: <b>${numeroCedula}</b> para que lo ayuden.</p>`,
              confirmButtonText: 'Entendido',
              confirmButtonColor: '#111827',
              width: 520
            });
            return;
          }

          // Error inesperado sin cuerpo JSON
          if (status !== 400 || !errBody || typeof errBody !== 'object') {
            Swal.fire({
              icon: 'warning',
              title: 'No se pudo crear su cuenta',
              html: `<p style="text-align:left;">Sus datos del formulario <b>sí se guardaron correctamente</b>.</p>
                     <p style="text-align:left;">Ocurrió un problema inesperado al crear su cuenta de acceso.</p>
                     <p style="text-align:left;">Comuníquese con la oficina con su cédula: <b>${numeroCedula}</b>.</p>`,
              confirmButtonText: 'Entendido',
              confirmButtonColor: '#111827',
              width: 520
            });
            return;
          }

          // Error 400: analizar QUÉ campo falló
          const docErr = JSON.stringify(errBody.numero_de_documento || '').toLowerCase();
          const emailErr = JSON.stringify(errBody.correo_electronico || '').toLowerCase();
          const isDocDuplicate = docErr.includes('ya registrado') || docErr.includes('unique') || docErr.includes('already exists');
          const isEmailDuplicate = emailErr.includes('ya registrado') || emailErr.includes('unique') || emailErr.includes('already exists');

          // CASO 1: El documento ya existe → significa que es la MISMA persona intentando volver a registrarse. Actualizamos sus datos.
          if (isDocDuplicate) {
            console.log('[createUser] Documento duplicado → actualizar usuario existente');
            this.updateExistingUserByDoc(apiUrl, numeroCedula, correo, password, raw, isEmailDuplicate);
            return;
          }

          // CASO 2: Solo el correo está duplicado (OTRA persona distinta lo tiene) → mostrar quién
          if (isEmailDuplicate) {
            console.log('[createUser] Correo duplicado por otra persona');
            this.showEmailOwner(correo, numeroCedula);
            return;
          }

          // CASO 3: Otro error de validación (password corto, formato inválido, etc.)
          this.showUserCreationError(errBody, numeroCedula);
        }
      });
  }

  /**
   * Busca quién tiene el correo duplicado y le muestra al usuario.
   * Usa el endpoint público validar-correo-cedula que no requiere auth.
   */
  /**
   * Consulta al backend si el correo pertenece a otra cédula distinta a `cedulaActual`.
   * Retorna { ownedByOther: true, info } si pertenece a otra persona, o null si no.
   */
  private async comprobarDuenoCorreo(correo: string, cedulaActual: string): Promise<{ ownedByOther: boolean; info: any } | null> {
    try {
      const check: any = await firstValueFrom(this.candidateS.validarCorreoCedula(correo, cedulaActual));
      if (check?.duplicado_info) {
        const info = check.duplicado_info;
        const docOtro = String(info.documento || '').replace(/\D/g, '').trim();
        const docActual = String(cedulaActual || '').replace(/\D/g, '').trim();
        // Solo marcar como "de otra persona" si las cédulas son distintas
        if (docOtro && docActual && docOtro !== docActual) {
          return { ownedByOther: true, info };
        }
      }
      // Fallback: si el backend solo dice 'correo_repetido' sin info, asumimos que es de otro
      if (check?.correo_repetido && !check?.duplicado_info) {
        return { ownedByOther: true, info: null };
      }
      return null;
    } catch (e) {
      console.warn('[comprobarDuenoCorreo] No se pudo validar:', e);
      return null;
    }
  }

  /** Muestra el modal del dueño del correo cuando YA tenemos la info del backend */
  private showEmailOwnerWithInfo(correo: string, cedulaActual: string, info: any): void {
    if (info) {
      const nombreCompleto = `${info.nombres || ''} ${info.apellidos || ''}`.trim() || 'otra persona';
      Swal.fire({
        icon: 'error',
        title: 'Ese correo pertenece a otra cédula',
        html: `<p style="text-align:left;">El correo <b>${correo}</b> ya está registrado, pero <b>bajo otra cédula distinta a la suya</b>.</p>
               <p style="text-align:left;">Está registrado a nombre de:</p>
               <p style="text-align:left;background:#f5f5f5;padding:12px;border-radius:6px;margin:10px 0;">
                 <b>${nombreCompleto}</b><br>
                 Cédula: <b>${info.documento || 'no disponible'}</b>
               </p>
               <p style="text-align:left;"><b>No podemos continuar</b> con su registro usando ese correo.</p>
               <p style="text-align:left;">Por favor, <b>vuelva al Paso 1 y escriba un correo electrónico diferente</b> (por ejemplo, el suyo personal que nadie más use).</p>
               <p style="font-size:12px;color:#888;margin-top:12px;text-align:left;">Si esa persona es usted y ya tiene cuenta, comuníquese con la oficina para recuperar su contraseña en vez de crear una nueva.</p>`,
        confirmButtonText: 'Entendido, voy a cambiarlo',
        confirmButtonColor: '#111827',
        width: 540
      });
    } else {
      // El backend dice que está duplicado pero no nos da los datos del dueño
      Swal.fire({
        icon: 'error',
        title: 'Ese correo pertenece a otra cédula',
        html: `<p style="text-align:left;">El correo <b>${correo}</b> ya está registrado <b>bajo otra cédula distinta a la suya</b>.</p>
               <p style="text-align:left;"><b>No podemos continuar</b> con su registro usando ese correo.</p>
               <p style="text-align:left;"><b>Vuelva al Paso 1 y use un correo electrónico diferente</b> (por ejemplo, el suyo personal que nadie más use).</p>
               <p style="font-size:12px;color:#888;margin-top:12px;text-align:left;">Si usted ya tiene cuenta con ese correo, comuníquese con la oficina para recuperar su contraseña${cedulaActual ? ` (su cédula: <b>${cedulaActual}</b>)` : ''}.</p>`,
        confirmButtonText: 'Entendido, voy a cambiarlo',
        confirmButtonColor: '#111827',
        width: 540
      });
    }
  }

  /** Consulta al backend y muestra al dueño del correo. NO actualiza nada. */
  private async showEmailOwner(correo: string, cedulaActual: string): Promise<void> {
    const ownerInfo = await this.comprobarDuenoCorreo(correo, cedulaActual);
    this.showEmailOwnerWithInfo(correo, cedulaActual, ownerInfo?.info ?? null);
  }

  /** Muestra al usuario final los errores específicos al crear su cuenta de acceso */
  private showUserCreationError(errBody: any, cedula: string): void {
    const campos: Record<string, string> = {
      'numero_de_documento': 'el número de documento',
      'correo_electronico': 'el correo electrónico',
      'password': 'la contraseña',
      'tipo_documento': 'el tipo de documento',
      'nombres': 'los nombres',
      'apellidos': 'los apellidos',
      'celular': 'el número de celular',
      'rol': 'el rol de usuario',
      'non_field_errors': 'los datos de la cuenta',
      'detail': 'los datos'
    };

    const traducciones: Array<{ re: RegExp; msg: string }> = [
      { re: /ya registrado/i, msg: 'ya está registrado en el sistema.' },
      { re: /this field must be unique/i, msg: 'ya está registrado en el sistema.' },
      { re: /already exists/i, msg: 'ya está registrado en el sistema.' },
      { re: /ensure this field has at least (\d+) characters/i, msg: 'es demasiado corto. Debe tener al menos $1 caracteres.' },
      { re: /ensure this field has no more than (\d+) characters/i, msg: 'es demasiado largo.' },
      { re: /this field may not be blank/i, msg: 'no puede estar vacío. Por favor llénelo.' },
      { re: /this field may not be null/i, msg: 'es obligatorio. Por favor llénelo.' },
      { re: /this field is required/i, msg: 'es obligatorio. Falta llenarlo.' },
      { re: /enter a valid email/i, msg: 'no tiene el formato correcto. Debe ser algo como nombre@gmail.com' },
      { re: /is not a valid choice/i, msg: 'tiene un valor no permitido.' },
      { re: /a valid integer is required/i, msg: 'debe ser solo números.' },
    ];

    const traducir = (msg: any, cedulaContext: string): string => {
      const t = String(msg ?? '').trim();
      if (!t) return 'tiene un error.';
      for (const { re, msg: human } of traducciones) {
        if (re.test(t)) return t.replace(re, human);
      }
      return t;
    };

    const cap = (s: string) => s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s;

    let items = '';
    for (const [key, msgs] of Object.entries(errBody)) {
      if (key === 'detail' && typeof msgs === 'string' && !Object.keys(errBody).some(k => k !== 'detail')) {
        // si el único campo es 'detail', lo tratamos como mensaje simple
        items += `<li style="margin-bottom:6px;">${cap(traducir(msgs, cedula))}</li>`;
        continue;
      }
      if (key === 'detail') continue;

      const label = campos[key] || key.replace(/_/g, ' ');
      const arr = Array.isArray(msgs) ? msgs : [msgs];
      const traducciones_campo = arr.map(m => traducir(m, cedula)).join(' ');
      items += `<li style="margin-bottom:6px;">${cap(label)} ${traducciones_campo}</li>`;
    }

    if (!items) {
      items = `<li>No pudimos identificar exactamente qué falló. Comuníquese con la oficina para ayuda.</li>`;
    }

    Swal.fire({
      icon: 'warning',
      title: 'No se pudo crear su cuenta de acceso',
      html: `<p style="text-align:left;font-size:14px;margin:0 0 6px 0;">
               Sus datos del formulario <b>sí se guardaron correctamente</b>.
             </p>
             <p style="text-align:left;font-size:14px;margin:0 0 10px 0;">
               Pero al crear su cuenta de acceso encontramos estos problemas:
             </p>
             <ul style="text-align:left;font-size:14px;color:#b71c1c;padding-left:22px;margin:0;line-height:1.5;">${items}</ul>
             <p style="font-size:12px;color:#888;margin-top:14px;text-align:left;">
               Si el problema continúa, comuníquese con la oficina con su cédula: <b>${cedula}</b>.
             </p>`,
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#111827',
      width: 520
    });
  }

  /**
   * El documento ya existe → buscar al usuario por cédula y actualizarlo.
   * Si el correo también está duplicado (por la MISMA persona), el PATCH lo actualiza.
   * Si el correo está en uso por OTRA persona, se le avisa.
   */
  private async updateExistingUserByDoc(apiUrl: string, cedula: string, correo: string, password: string, raw: any, emailAlsoDuplicate: boolean): Promise<void> {
    const g = (k: string) => (raw[k] || '');
    const upper = (v: string) => String(v || '').toUpperCase().trim();

    const patchPayload: any = {
      password,
      correo_electronico: correo,
      nombres: [upper(g('pNombre')), upper(g('sNombre'))].filter(Boolean).join(' ').substring(0, 64),
      apellidos: [upper(g('pApellido')), upper(g('sApellido'))].filter(Boolean).join(' ').substring(0, 64),
    };
    if (g('numCelular')) patchPayload.celular = g('numCelular');

    // Verificar SIEMPRE si el correo pertenece a otra cédula antes de tocar nada.
    // Si es de otra persona -> mostrar dueño y NO actualizar.
    const ownerInfo = await this.comprobarDuenoCorreo(correo, cedula);
    if (ownerInfo?.ownedByOther) {
      this.showEmailOwnerWithInfo(correo, cedula, ownerInfo.info);
      return;
    }

    try {
      // Buscar el usuario existente por cédula
      const cleanCedula = String(cedula).replace(/\D/g, '').trim();
      let userToUpdate: any = null;
      let authBlocked = false;
      let networkProblem = false;

      for (const doc of [cleanCedula, cedula]) {
        if (userToUpdate || !doc) continue;
        try {
          const resp = await firstValueFrom(this.http.get<any>(`${apiUrl}/gestion_admin/usuarios/?numero_de_documento=${doc}`));
          const list = Array.isArray(resp) ? resp : (resp?.results ?? []);
          if (list.length > 0) userToUpdate = list[0];
        } catch (e: any) {
          if (e?.status === 401 || e?.status === 403) {
            authBlocked = true;
            break;
          }
          if (e?.status === 0) {
            networkProblem = true;
            break;
          }
        }
      }

      // Caso: existe usuario con esa cédula pero no tenemos permisos para verlo
      // (el candidato no está logueado, lo cual es normal en este flujo público).
      if (authBlocked) {
        console.warn('[updateUser] Sin permisos para buscar usuario existente.');
        Swal.fire({
          icon: 'info',
          title: 'Usted ya tiene una cuenta registrada',
          html: `<p style="text-align:left;">Ya existe una cuenta con la cédula <b>${cedula}</b>.</p>
                 <p style="text-align:left;">Sus datos del formulario <b>se guardaron correctamente</b>.</p>
                 <p style="text-align:left;">Si no recuerda su contraseña o tiene problemas para ingresar, comuníquese con la oficina con su cédula: <b>${cedula}</b>.</p>`,
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#111827',
          width: 520
        });
        return;
      }

      if (networkProblem) {
        Swal.fire({
          icon: 'warning',
          title: 'Sin conexión con el servidor',
          html: `<p style="text-align:left;">Sus datos del formulario <b>sí se guardaron</b>.</p>
                 <p style="text-align:left;">No pudimos actualizar su cuenta de acceso porque se perdió la conexión a internet.</p>
                 <p style="text-align:left;">Si al terminar el formulario todavía tiene problemas para ingresar, comuníquese con la oficina con su cédula: <b>${cedula}</b>.</p>`,
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#111827',
          width: 520
        });
        return;
      }

      if (!userToUpdate) {
        console.warn('[updateUser] El backend dijo que la cédula ya estaba, pero no la encontramos.');
        Swal.fire({
          icon: 'warning',
          title: 'Su cuenta necesita revisión',
          html: `<p style="text-align:left;">Sus datos del formulario <b>sí se guardaron correctamente</b>.</p>
                 <p style="text-align:left;">Pero hubo un problema actualizando su cuenta de acceso.</p>
                 <p style="text-align:left;">Comuníquese con la oficina con su cédula: <b>${cedula}</b>.</p>`,
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#111827',
          width: 520
        });
        return;
      }

      // Intentamos actualizar la cuenta existente
      try {
        await firstValueFrom(this.http.patch(`${apiUrl}/gestion_admin/usuarios/${userToUpdate.id}/`, patchPayload));
        console.log('[updateUser] Usuario actualizado OK:', userToUpdate.id);
        Swal.fire({
          icon: 'success',
          title: 'Su cuenta fue actualizada',
          html: `<p style="text-align:left;">Ya teníamos registrada la cédula <b>${cedula}</b>.</p>
                 <p style="text-align:left;">Actualizamos sus datos de acceso con la información más reciente.</p>
                 <p style="text-align:left;">Puede ingresar con:</p>
                 <p style="text-align:left;background:#f5f5f5;padding:10px;border-radius:6px;margin:10px 0;">
                   <b>Correo:</b> ${correo}<br>
                   <b>Contraseña:</b> su número de cédula
                 </p>`,
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#111827',
          width: 520,
          timer: 6000,
          timerProgressBar: true
        });
      } catch (patchErr: any) {
        const patchStatus = patchErr?.status;
        const patchBody = patchErr?.error;
        const patchEmailErr = JSON.stringify(patchBody?.correo_electronico || '').toLowerCase();

        // El correo pertenece a OTRA persona distinta → ya lo detectamos al principio normalmente,
        // pero puede ocurrir si se creó entre medias. Avisar.
        if (patchEmailErr.includes('ya registrado') || patchEmailErr.includes('unique')) {
          this.showEmailOwner(correo, cedula);
          return;
        }

        if (patchStatus === 401 || patchStatus === 403) {
          Swal.fire({
            icon: 'info',
            title: 'Usted ya tiene una cuenta registrada',
            html: `<p style="text-align:left;">Ya existe una cuenta con la cédula <b>${cedula}</b>.</p>
                   <p style="text-align:left;">Sus datos del formulario <b>se guardaron correctamente</b>.</p>
                   <p style="text-align:left;">Si no recuerda su contraseña, comuníquese con la oficina con su cédula: <b>${cedula}</b>.</p>`,
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#111827',
            width: 520
          });
          return;
        }

        console.error('[updateUser] PATCH falló:', patchBody);
        Swal.fire({
          icon: 'warning',
          title: 'Su cuenta no pudo actualizarse',
          html: `<p style="text-align:left;">Sus datos del formulario <b>sí se guardaron correctamente</b>.</p>
                 <p style="text-align:left;">Pero no pudimos actualizar su cuenta de acceso en este momento.</p>
                 <p style="text-align:left;">Comuníquese con la oficina con su cédula: <b>${cedula}</b>.</p>`,
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#111827',
          width: 520
        });
      }
    } catch (err: any) {
      console.error('[updateUser] Error general:', err);
      Swal.fire({
        icon: 'warning',
        title: 'Problema con su cuenta de acceso',
        html: `<p style="text-align:left;">Sus datos del formulario <b>sí se guardaron correctamente</b>.</p>
               <p style="text-align:left;">Ocurrió un problema inesperado con su cuenta de acceso.</p>
               <p style="text-align:left;">Comuníquese con la oficina con su cédula: <b>${cedula}</b>.</p>`,
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#111827',
        width: 520
      });
    }
  }


  private startForm(tipo: string, num: string) {
    this.showForm = true;
    this.formHojaDeVida2.patchValue({
      tipoDoc: tipo,
      numeroCedula: num
    });
    this.formHojaDeVida2.get('tipoDoc')?.disable();
    this.formHojaDeVida2.get('numeroCedula')?.disable();
  }
  groupCrossValidator(): ValidatorFn {
    return (g: AbstractControl) => {
      const v = g.value;
      if (v.fechaExpedicionCC && v.fechaNacimiento) {
        if (new Date(v.fechaExpedicionCC) < new Date(v.fechaNacimiento)) return { expeditionBeforeBirth: true };
      }

      // Helper for duplicates
      const checkDup = (n1: string, n2: string, c2: AbstractControl | null, errKey: string, isPhone = false) => {
        if (!n1 || !n2 || !c2) return;
        let v1 = n1.trim().toUpperCase().replace(/\s+/g, '');
        let v2 = n2.trim().toUpperCase().replace(/\s+/g, '');

        if (isPhone) { // digits only
          v1 = v1.replace(/\D/g, '');
          v2 = v2.replace(/\D/g, '');
        }

        if (v1 && v2 && v1 === v2) {
          c2.setErrors({ ...c2.errors, [errKey]: true });
        } else {
          if (c2.errors && c2.errors[errKey]) {
            const { [errKey]: removed, ...rest } = c2.errors;
            c2.setErrors(Object.keys(rest).length ? rest : null);
          }
        }
      };

      // Check Names
      checkDup(v.nombreReferenciaPersonal1, v.nombreReferenciaPersonal2, g.get('nombreReferenciaPersonal2'), 'duplicateReferenceName');
      checkDup(v.nombreReferenciaFamiliar1, v.nombreReferenciaFamiliar2, g.get('nombreReferenciaFamiliar2'), 'duplicateReferenceName');

      // Check Phones
      checkDup(v.telefonoReferencia1, v.telefonoReferencia2, g.get('telefonoReferencia2'), 'duplicateReferencePhone', true);
      checkDup(v.telefonoReferenciaFamiliar1, v.telefonoReferenciaFamiliar2, g.get('telefonoReferenciaFamiliar2'), 'duplicateReferencePhone', true);

      return null;
    };
  }

  /** Traduce nombres internos de campos a etiquetas legibles para el usuario */
  private fieldHumanName(key: string): string {
    const map: { [k: string]: string } = {
      oficina: 'Oficina',
      tipoDoc: 'Tipo de Documento',
      numeroCedula: 'Número de Documento',
      fechaExpedicionCC: 'Fecha de Expedición',
      departamentoExpedicionCC: 'Departamento de Expedición',
      municipioExpedicionCC: 'Ciudad de Expedición',
      pNombre: 'Primer Nombre',
      sNombre: 'Segundo Nombre',
      pApellido: 'Primer Apellido',
      sApellido: 'Segundo Apellido',
      genero: 'Género',
      fechaNacimiento: 'Fecha de Nacimiento',
      departamentoNacimiento: 'Departamento de Nacimiento',
      municipioNacimiento: 'Ciudad de Nacimiento',
      estadoCivil: 'Estado Civil',
      correoUsuario: 'Usuario del Correo',
      correoDominio: 'Dominio del Correo',
      correo: 'Correo Electrónico',
      numCelular: 'Número de Celular',
      numWha: 'Número de WhatsApp',
      direccionResidencia: 'Dirección de Residencia',
      zonaResidencia: 'Barrio',
      departamento: 'Departamento de Residencia',
      ciudad: 'Ciudad de Residencia',
      tiempoResidenciaZona: 'Tiempo en la Zona',
      conQuienViveChecks: '¿Con quién vive?',
      password: 'Contraseña',
      escolaridad: 'Nivel de Escolaridad',
      expectativasVidaChecks: '¿Cómo se proyecta?',
      rh: 'Tipo de Sangre (RH)',
      lateralidad: 'Mano Dominante',
      tallaChaqueta: 'Talla de Chaqueta',
      tallaPantalon: 'Talla de Pantalón',
      tallaCamisa: 'Talla de Camisa',
      tallaCalzado: 'Talla de Calzado',
      lugarAnteriorResidencia: 'Lugar Anterior de Residencia',
      razonCambioResidencia: 'Razón de Cambio de Residencia',
      familiarEmergencia: 'Contacto de Emergencia (Nombre)',
      parentescoFamiliarEmergencia: 'Parentesco del Contacto',
      telefonoFamiliarEmergencia: 'Teléfono del Contacto',
      direccionFamiliarEmergencia: 'Dirección del Contacto',
      estudiaActualmente: '¿Estudia Actualmente?',
      nombresConyuge: 'Nombres del Cónyuge',
      apellidosConyuge: 'Apellidos del Cónyuge',
      viveConyuge: '¿Vive con el Cónyuge?',
      documentoIdentidadConyuge: 'Documento del Cónyuge',
      direccionConyuge: 'Dirección del Cónyuge',
      telefonoConyuge: 'Teléfono del Cónyuge',
      nombrePadre: 'Nombre del Padre',
      elPadreVive: '¿El Padre Vive?',
      direccionPadre: 'Dirección del Padre',
      telefonoPadre: 'Teléfono del Padre',
      nombreMadre: 'Nombre de la Madre',
      madreVive: '¿La Madre Vive?',
      direccionMadre: 'Dirección de la Madre',
      telefonoMadre: 'Teléfono de la Madre',
      nombreReferenciaPersonal1: 'Referencia Personal 1 (Nombre)',
      telefonoReferencia1: 'Referencia Personal 1 (Teléfono)',
      nombreReferenciaPersonal2: 'Referencia Personal 2 (Nombre)',
      telefonoReferencia2: 'Referencia Personal 2 (Teléfono)',
      nombreReferenciaFamiliar1: 'Referencia Familiar 1 (Nombre)',
      telefonoReferenciaFamiliar1: 'Referencia Familiar 1 (Teléfono)',
      parentescoReferenciaFamiliar1: 'Referencia Familiar 1 (Parentesco)',
      nombreReferenciaFamiliar2: 'Referencia Familiar 2 (Nombre)',
      telefonoReferenciaFamiliar2: 'Referencia Familiar 2 (Teléfono)',
      parentescoReferenciaFamiliar2: 'Referencia Familiar 2 (Parentesco)',
      experienciaLaboral: '¿Tiene Experiencia Laboral?',
      familiaSolo: '¿Familia con un solo ingreso?',
      personas_a_cargo: 'Personas a Cargo',
      tiposViviendaChecks: 'Tipo de Vivienda',
      numeroHabitaciones: 'Número de Habitaciones',
      personasPorHabitacion: 'Personas por Habitación',
      caracteristicasVivienda: 'Características de la Vivienda',
      comodidadesChecks: 'Servicios / Comodidades',
      fuenteVacante: '¿Cómo se enteró de la vacante?',
      numHijosDependientes: 'Número de Hijos',
    };
    return map[key] || key;
  }

  // Legacy PDF method (stubbed but functional)
  async downloadPDF(bytes: Uint8Array, name: string) {
    const blob = new Blob([bytes as any], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  }

  // Hijos Generar Array (for template)
  generarArrayHijos() {
    // Not needed if using FormArray loops in HTML, but kept if HTML uses it
    const num = this.formHojaDeVida2.get('numHijosDependientes')?.value || 0;
    return Array(num).fill(0).map((_, i) => i);
  }

  // Public accessor for Hijos FormArray
  get hijosFormArray(): FormArray {
    return this.formHojaDeVida2.get('hijos') as FormArray;
  }




}
