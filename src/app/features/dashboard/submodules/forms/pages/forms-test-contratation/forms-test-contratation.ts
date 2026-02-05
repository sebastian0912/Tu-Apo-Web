
import { Component, Inject, OnInit, Optional, PLATFORM_ID, ViewChild, ChangeDetectorRef, AfterViewInit, OnDestroy, Injectable } from '@angular/core';
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
import { takeUntil, debounceTime, startWith } from 'rxjs/operators';
import Swal from 'sweetalert2';

// Corrected Imports
import { ParametrizacionS } from '../../services/parametrizacion/parametrizacion-s';
import { RegistroProcesoContratacion } from '../../services/registro-proceso-contratacion/registro-proceso-contratacion';
import { CandidateS } from '../../../../../../shared/services/candidate-s/candidate-s';
import { DocumentManagementS } from '../../../../../../shared/services/document-management-s/document-management-s';

// --- Constants ---
const STORAGE_KEY = 'formHojaDeVida2';
const CEDULA_KEY = 'numeroCedula';

// Strict Regex Patterns (Colombian Context)
const REGEX_NAMES = /^[a-zA-ZñÑáéíóúÁÉÍÓÚ\s]+$/; // Only letters and spaces
const REGEX_NUMERIC = /^\d+$/; // Only numbers
const REGEX_PHONE_CO = /^3\d{9}$/; // 3xxxxxxxxx (10 digits)

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
    hojaDeVida: 121
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
      numero_documento: ['', [Validators.required, Validators.pattern(REGEX_NUMERIC), Validators.minLength(6), Validators.maxLength(15)]]
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
    this.http.get('files/utils/colombia.json').subscribe((d: any) => {
      this.datos = d;
      // Trigger update of filtered lists
      this.searchDeptoRes.setValue('');
      this.searchDeptoExp.setValue('');
      this.searchDeptoNac.setValue('');
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
      fechaDiligenciamiento: [new Date(), req],
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
      fechaNacimiento: ['', [req, this.dateReasonableValidator(1900)]],
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

      // New Step 1 Fields (Moved/Added)
      password: ['', [req, Validators.minLength(6)]],
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
      preferenciaResidencia: [''],

      // Familiar Emergencia
      familiarEmergencia: ['', fullName],
      parentescoFamiliarEmergencia: ['', req],
      telefonoFamiliarEmergencia: ['', phone],
      ocupacionFamiliarEmergencia: [''],
      direccionFamiliarEmergencia: ['', [Validators.required]],
      // barrioFamiliarEmergencia REMOVED

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
      // barrioConyuge REMOVED
      // barrioMunicipioConyuge REMOVED (if present)
      ocupacionConyuge: [''],

      // REMOVED dead singular fields: nombreConyuge, apellidoConyuge
      tipoDocConyuge: [''],

      // Padres
      nombrePadre: [{ value: '', disabled: false }, this.fullNameValidator(true)],
      elPadreVive: ['', req],
      ocupacionPadre: [''],
      direccionPadre: ['', [Validators.required]],
      telefonoPadre: ['', phone],
      // barrioPadre REMOVED

      nombreMadre: [{ value: '', disabled: false }, this.fullNameValidator(true)],
      madreVive: ['', req],
      ocupacionMadre: [''],
      direccionMadre: ['', [Validators.required]],
      telefonoMadre: ['', phone],
      // barrioMadre REMOVED

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

      // Utils (from Step 5 but some used earlier?)
      vehiculo: [''],
      licenciaConduccion: [''],
      categoriaLicencia: [''],
      tieneVehiculo: [''],
      estaTrabajando: [''],
      empresaActual: [''],
      salarioActual: [''],
      horarioActual: [''],
      tipoTrabajo: [''],
      tipoContrato: [''],
      trabajoAntes: [''],
      solicitoAntes: [''],
      tieneHermanos: [''],
      numeroHermanos: [0],

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

      // Step 5: Final
      deseaGenerar: [false, req],
      hojaDeVida: [''],
      hermanos: this.fb.array([])
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
        // If married/union, auto-set Vive=SI if empty, or just ensure it's handled.
        // User might be separated but legally married? 
        // Typically checks flow: Estado Civil -> Show "Vive con conyuge?" -> If SI, Show Details.
        // My HTML only shows "Cónyuge" section if CA/UL.
        // Inside that section, "Vive con cónyuge?" defaults?
        if (!conyugeCtrl?.value) conyugeCtrl?.setValue('SI');
      } else {
        // Not married/union -> Clear everything
        conyugeCtrl?.setValue(''); // Was 'NO', changed per user request "no enviar NO"
        // Clear manual fields just in case
        f.get('nombresConyuge')?.setValue('');
        f.get('apellidosConyuge')?.setValue('');
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
        fechaNacimientoHijo: ['', [Validators.required, this.dateReasonableValidator(2000)]],
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
      error: () => this.loadingCatalogos = false
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
      barrioFamiliarEmergencia: '',
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
      barrioMunicipioConyugue: '',
      ocupacion_conyugue: g('ocupacionConyuge'),
      nombrePadre: g('nombrePadre'),
      vivePadre: g('elPadreVive'),
      ocupacionPadre: g('ocupacionPadre'),
      direccionPadre: addr('direccionPadre'),
      telefonoPadre: g('telefonoPadre'),
      barrioPadre: '',
      nombreMadre: g('nombreMadre'),
      viveMadre: g('madreVive'),
      ocupacionMadre: g('ocupacionMadre'),
      direccionMadre: addr('direccionMadre'),
      telefonoMadre: g('telefonoMadre'),
      barrioMadre: '',
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
    this.formHojaDeVida2.patchValue({
      tieneVehiculo: null, licenciaConduccion: null, categoriaLicencia: null,
      estaTrabajando: null, empresaActual: null, tipoTrabajo: null, tipoContrato: null,
      trabajoAntes: null, solicitoAntes: null, tieneHermanos: null, numeroHermanos: null
    });
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
      icon: 'warning', title: 'Incompleto',
      text: 'Por favor revisa los campos en rojo.',
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
      return valid ? null : { invalidDoc: true };
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
  async onSearch() {
    if (this.searchForm.invalid) {
      this.searchForm.markAllAsTouched();
      return;
    }

    this.isSearching = true;
    this.showForm = false;
    this.foundCandidate = null;

    const { tipo_doc, numero_documento } = this.searchForm.value;

    try {
      // 1. Check existence
      const res = await firstValueFrom(this.registroProcesoContratacion.existsCandidato(tipo_doc, numero_documento));

      // Use explicit type casting if needed or 'any' if the service returns any
      const exists = (res as any)?.exists;

      if (exists) {
        // 2. Setup Candidate context (Upsert mode)
        this.foundCandidate = res; // Can be used to show "Welcome back" or turn info
        Swal.fire({
          icon: 'info',
          title: 'Candidato Encontrado',
          text: 'Hemos encontrado tus datos. Puedes actualizar tu información.',
          confirmButtonText: 'Continuar'
        });
      }

      // 3. Whether new or exists, we unlock the form and prefill ID
      this.startForm(tipo_doc, numero_documento);

    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'No se pudo verificar el candidato. Intenta nuevamente.', 'error');
    } finally {
      this.isSearching = false;
    }
  }

  // ----------------------------------------------------
  // 5. Background Save (Step 1)
  // ----------------------------------------------------
  // ----------------------------------------------------
  // Helper: Step Mapping
  // ----------------------------------------------------
  readonly STEP1_KEYS = [
    'oficina', 'fechaDiligenciamiento', 'tipoDoc', 'numeroCedula',
    'fechaExpedicionCC', 'departamentoExpedicionCC', 'municipioExpedicionCC',
    'pNombre', 'sNombre', 'pApellido', 'sApellido', 'genero',
    'fechaNacimiento', 'departamentoNacimiento', 'municipioNacimiento', 'estadoCivil',
    'correoUsuario', 'correoDominio', 'correo',
    'numCelular', 'numWha', 'direccionResidencia', 'zonaResidencia',
    'departamento', 'ciudad', 'tiempoResidenciaZona', 'conQuienViveChecks',
    // Moved/New Fields
    'escolaridad',
    'expectativasVidaChecks', 'password'
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
        Swal.fire({
          icon: 'warning',
          title: 'Formulario Incompleto',
          text: `Por favor revisa el campo inválido en el paso ${stepIdx + 1}: ${firstInvalidControl}`, // Debug friendly
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
        Swal.fire('¡Correo duplicado!', 'El correo ya existe.', 'error');
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
        if (!upsertResp?.ok) throw new Error('Falló upsert');
        this.numeroCedula = upsertResp.numero_documento ?? this.numeroCedula;

        // Formulario Vacantes Part 2
        const part2: any = await firstValueFrom(this.registroProcesoContratacion.formulario_vacantes(payload)).catch(() => null);
        if (!part2 || (!part2.ok && !part2.success && !part2.message)) throw new Error('Falló parte 2');

        // Upload Files
        const filesOk = await this.subirTodosLosArchivos().catch(() => false);
        Swal.fire(filesOk ? '¡Éxito!' : 'Advertencia', filesOk ? 'Guardado exitoso.' : 'Guardado, pero fallaron archivos.', filesOk ? 'success' : 'warning');
      },
      error: (err: any) => Swal.fire('Error', err?.message || 'Error al guardar.', 'error')
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

      // Hidden password at root (or move to custom location if needed? User didn't specify, likely root is fine for systems)
      // User request didn't explicitly show password in the JSON snippet, but previously requested it. 
      // I will keep it at root for now to ensure account creation still works unless told otherwise.
      "password": g('password')
    };

    // Silent Call
    this.registroProcesoContratacion.crearActualizarCandidato(formValue)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => { console.log('Step 1 Saved Background', res); },
        error: (err) => { console.error('Step 1 Background Save Failed', err); }
      });

    // Advance Stepper
    this.stepper.next();
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

  get hermanosArray(): FormArray {
    return this.formHojaDeVida2.get('hermanos') as FormArray;
  }


}
