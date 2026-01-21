import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';

import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE, MatNativeDateModule } from '@angular/material/core';
import { StepperSelectionEvent } from '@angular/cdk/stepper';

import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatStepperModule, MatStepper } from '@angular/material/stepper';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';

import Swal from 'sweetalert2';
import { firstValueFrom, map, Observable, startWith } from 'rxjs';

import { SharedModule } from '../../../../../../shared/shared-module';
import { LoginS } from '../../../../../auth/service/login-s';

import colombia from '../../../../../../data/colombia.json';
import { CandidateS } from '../../../../../../shared/services/candidate-s/candidate-s';

export const MY_DATE_FORMATS = {
  parse: { dateInput: 'D/M/YYYY' },
  display: {
    dateInput: 'D/M/YYYY',
    monthYearLabel: 'MMMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

type TurnosInfo = {
  oficina?: string;
  fecha?: string;
  turno?: number | string;
  pendientes_hoy?: number;
  pendientes_delante?: number;
  mi_posicion?: number | string;
};

@Component({
  selector: 'app-form-pre-registration-vacancies',
  standalone: true,
  imports: [
    SharedModule,
    ReactiveFormsModule,

    MatCardModule,
    MatDividerModule,
    MatAutocompleteModule,
    MatStepperModule,
    MatProgressBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  templateUrl: './form-pre-registration-vacancies.html',
  styleUrls: ['./form-pre-registration-vacancies.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'es-CO' },
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },
  ],
})
export class FormPreRegistrationVacancies implements OnInit, AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

  /**
   * ✅ SweetAlert “safe”
   * - didDestroy: corre al final del ciclo de vida (mejor que didClose/willClose para no romper encadenados)
   * - NO cerramos ni removemos contenedores desde hooks
   */
  private readonly swal = Swal.mixin({
    heightAuto: false,
    scrollbarPadding: false,
    returnFocus: false,
    didDestroy: () => this.releaseLocksOnly(),
  });

  // ===== UI: búsqueda =====
  searchForm: FormGroup;
  isSearching = false;
  foundCandidate: any = null;

  // estados UI
  turnos: TurnosInfo | null = null;
  existsCandidate = false;
  isPrefilling = false;
  searchError: string | null = null;

  private lastSearch?: {
    tipo: string;
    numeroDigits: string;
    numeroForRequest: string;
    oficinaForRequest: string;
  };

  // ===== oficina por URL =====
  private officeFromQuery?: string;
  private brigadaFromQuery?: string;

  private _showForm = false;
  get showForm(): boolean {
    return this._showForm;
  }
  set showForm(v: boolean) {
    this._showForm = v;

    if (!v) {
      this.foundCandidate = null;

      // reset UI estados
      this.turnos = null;
      this.existsCandidate = false;
      this.isPrefilling = false;
      this.searchError = null;
      this.lastSearch = undefined;

      // reset form principal
      this.formVacante.reset();
      this.experienciasFA.clear();
      this.hijosFA.clear();
      this.seedExperiencias();

      // Doc habilitado para volver a buscar
      this.formVacante.get('tipo_doc')?.enable({ emitEvent: false });
      this.formVacante.get('numero_documento')?.enable({ emitEvent: false });

      // Oficina fija por URL si existe
      if (this.officeFromQuery) {
        this.formVacante.get('oficina')?.setValue(this.officeFromQuery, { emitEvent: false });
        this.formVacante.get('oficina')?.disable({ emitEvent: false });
        this.lockedOffice = this.officeFromQuery;

        if (this.officeFromQuery === 'BRIGADA' && this.brigadaFromQuery) {
          this.formVacante.get('brigadaDe')?.setValue(this.brigadaFromQuery, { emitEvent: false });
        }
      } else {
        this.formVacante.get('oficina')?.enable({ emitEvent: false });
        this.lockedOffice = undefined;
      }

      this.refreshSteps();
      this.resetStepperToFirst();
    }

    this.markUi();
  }

  // ===== Form principal =====
  formVacante!: FormGroup;
  isSubmitting = false;
  lockedOffice?: string;

  // Progreso stepper
  currentStepIndex = 0;
  totalSteps = 7;
  hidePassword = true;

  // Step controls para stepper lineal
  step1Ctrl = new FormGroup({});
  step2Ctrl = new FormGroup({});
  step3Ctrl = new FormGroup({});
  step4Ctrl = new FormGroup({});
  step5Ctrl = new FormGroup({});
  step6Ctrl = new FormGroup({});

  emailUserPattern = '^[^@\\s]+$';
  otroExperienciaControl = new FormControl('', [Validators.maxLength(64)]);

  // Autocomplete ciudades
  allCities: string[] = [];
  filteredCities$!: Observable<string[]>;
  filteredCitiesNacimiento$!: Observable<string[]>;

  readonly SEED_EXP_COUNT = 3;

  dominiosValidos: string[] = [
    'gmail.com',
    'hotmail.com',
    'yahoo.com',
    'icloud.com',
    'outlook.com',
    'outlook.es',
    'mail.com',
    'yahoo.com.co',
    'unicartagena.edu.co',
    'cun.edu.co',
    'misena.edu.co',
    'uniguajira.edu.co',
    'unillanos.edu.co',
    'ucundinamarca.edu.co',
    'uncundinamarca.edu.co',
    'usantotomas.edu.co',
    'unal.edu.co',
    'unicauca.edu.co',
    'unimilitar.edu.co',
    'hotmail.com.co',
    'hotmail.com.ar',
    'lasvillas.email',
    'yahoo.es',
  ];

  escolaridades = [
    { value: 'SIN_ESTUDIOS', label: 'SIN ESTUDIOS' },
    { value: 'OTROS', label: 'OTROS' },
    ...Array.from({ length: 11 }, (_, i) => {
      const g = String(11 - i);
      return { value: g, label: g };
    }),
  ];

  estadosCiviles: any[] = [
    { codigo: 'SO', descripcion: 'SO (Soltero)' },
    { codigo: 'UL', descripcion: 'UL (Unión Libre)' },
    { codigo: 'CA', descripcion: 'CA (Casado)' },
    { codigo: 'SE', descripcion: 'SE (Separado)' },
    { codigo: 'VI', descripcion: 'VI (Viudo)' },
  ];

  tipoDocs: any[] = [
    { abbreviation: 'CC', description: 'Cédula de Ciudadanía (CC)' },
    { abbreviation: 'PPT', description: 'Permiso de permanencia temporal (PPT)' },
    { abbreviation: 'CE', description: 'Cédula de Extranjería (CE)' },
  ];

  sexos: any[] = ['M', 'F'];

  oficinas: string[] = [
    'VIRTUAL',
    'ADMINISTRATIVOS',
    'CARTAGENITA',
    'FACA_PRIMERA',
    'FACA_PRINCIPAL',
    'FONTIBÓN',
    'FORANEOS',
    'FUNZA',
    'MADRID',
    'ROSAL',
    'SOACHA',
    'SUBA',
    'TOCANCIPÁ',
    'ZIPAQUIRÁ',
    'BRIGADA',
  ];

  listaPosiblesRespuestasConquienVive: any[] = [
    'AMIGOS',
    'ABUELO',
    'ABUELA',
    'PAREJA',
    'PAPÁ',
    'MAMÁ',
    'HERMANO',
    'HERMANA',
    'TÍO',
    'TÍA',
    'PRIMO',
    'PRIMA',
    'SOBRINO',
    'SOBRINA',
    'SOLO',
    'HIJOS',
  ];

  CUIDADOR_HIJOS = [
    "DUEÑA APARTAMENTO",
    "NIÑERA",
    "AMIG@S",
    "UNIVERSIDAD",
    "COLEGIO",
    "FAMILIAR",
    "SON INDEPENDIENTES",
    "JARDÍN",
    "AMIGOS",
    "PAREJA O ESPOSA",
    "YO",
  ]

  tiemposZona = [
    { value: 'TODO LA VIDA', label: 'TODO LA VIDA' },
    { value: 'MAS DE 6 MESES', label: 'MAS DE 6 MESES' },
    { value: 'MAS DE 2 MESES', label: 'MAS DE 2 MESES' },
    { value: 'UN MES', label: 'UN MES' },
    { value: 'MENOS DE UN MES', label: 'MENOS DE UN MES' },
  ];

  // =========================
  // ✅ Stepper refs (con setter para *ngIf)
  // =========================
  private pendingStepperReset = false;

  stepperRef?: MatStepper;

  @ViewChild('stepper')
  set stepperSetter(v: MatStepper | undefined) {
    this.stepperRef = v;
    if (!v) return;

    queueMicrotask(() => {
      this.totalSteps = (v.steps?.length as number) || this.totalSteps;

      if (this.pendingStepperReset) {
        v.selectedIndex = 0;
        this.currentStepIndex = 0;
        this.pendingStepperReset = false;
      } else {
        this.currentStepIndex = v.selectedIndex ?? 0;
      }

      this.refreshSteps();
      this.markUi();
    });
  }

  // ⚠️ opcional por si el host también vive dentro del *ngIf
  @ViewChild('stepperHost') stepperHost?: ElementRef<HTMLDivElement>;

  constructor(
    private fb: FormBuilder,
    private candidateService: CandidateS,
    private authService: LoginS,
    private dateAdapter: DateAdapter<Date>,
    private route: ActivatedRoute,
  ) {
    this.dateAdapter.setLocale('es-CO');

    // 🔥 Si se destruye el componente, ahí sí hacemos release “fuerte”
    this.destroyRef.onDestroy(() => this.forceReleaseSwalLock());

    // ===== Form buscador =====
    this.searchForm = this.fb.group({
      tipo_doc: ['', Validators.required],
      numero_documento: [
        '',
        [Validators.required, Validators.pattern(/^\d+$/), Validators.minLength(6), Validators.maxLength(15)],
      ],
    });

    // ===== Form principal =====
    this.formVacante = this.fb.group({
      // Paso 1
      oficina: ['', Validators.required],
      tipo_doc: ['', Validators.required],
      numero_documento: [
        '',
        [Validators.required, Validators.pattern(/^\d+$/), Validators.minLength(6), Validators.maxLength(15)],
      ],
      fecha_expedicion: ['', Validators.required],
      mpio_expedicion: ['', Validators.required],

      // Paso 2
      primer_apellido: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(30)]],
      segundo_apellido: ['', [Validators.maxLength(30)]],
      primer_nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(30)]],
      segundo_nombre: ['', [Validators.maxLength(30)]],
      fecha_nacimiento: ['', Validators.required],
      mpio_nacimiento: ['', Validators.required],
      sexo: ['', Validators.required],
      estado_civil: ['', Validators.required],

      // Paso 3
      barrio: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(40)]],
      celular: ['', [Validators.required, Validators.pattern(/^3\d{9}$/)]],
      whatsapp: ['', [Validators.required, Validators.pattern(/^3\d{9}$/), Validators.maxLength(10)]],
      personas_con_quien_convive: [[], Validators.required],
      hace_cuanto_vive: ['', Validators.required],

      correo_usuario: ['', [Validators.required, Validators.pattern(this.emailUserPattern)]],
      correo_dominio: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(32)]],

      // Paso 4
      tieneHijos: [null, Validators.required],
      cuidadorHijos: [''],
      numeroHijos: [0],
      hijos: this.fb.array([]),

      // Paso 5
      nivel: [null, Validators.required],
      estudiaActualmente: [null, Validators.required],
      proyeccion1Ano: ['', Validators.required],

      experienciaFlores: ['', Validators.required],
      tipoExperienciaFlores: [''],
      otroExperiencia: this.otroExperienciaControl,

      // Paso 6
      experiencias: this.fb.array([]),

      // Aux BRIGADA
      brigadaDe: [''],
    });

    this.formVacante
      .get('tieneHijos')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((tiene: boolean) => {
        const cuidador = this.formVacante.get('cuidadorHijos');
        const num = this.formVacante.get('numeroHijos');

        if (tiene) {
          cuidador?.addValidators([Validators.required, Validators.maxLength(120)]);
          num?.addValidators([Validators.required, Validators.min(1)]);
        } else {
          cuidador?.clearValidators();
          cuidador?.setValue('');
          num?.clearValidators();
          num?.setValue(0);
          this.setHijosCount(0);
        }

        cuidador?.updateValueAndValidity({ emitEvent: false });
        num?.updateValueAndValidity({ emitEvent: false });

        this.refreshSteps();
        this.markUi();
      });

    this.formVacante
      .get('numeroHijos')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((n: number) => {
        const parsed = Number(n) || 0;
        this.setHijosCount(parsed);
        this.markUi();
      });
  }

  ngOnInit(): void {
    this.hydrateOfficeFromQuery();

    this.loadCities();
    this.setupAutocomplete();
    this.setupAutocompleteNacimiento();

    this.seedExperiencias();

    this.formVacante
      .get('experienciaFlores')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((val) => {
        const tipoCtrl = this.formVacante.get('tipoExperienciaFlores');

        if (val !== 'Sí') {
          tipoCtrl?.setValue('');
          tipoCtrl?.clearValidators();
          tipoCtrl?.updateValueAndValidity({ emitEvent: false });

          this.otroExperienciaControl.setValue('');
          this.otroExperienciaControl.clearValidators();
          this.otroExperienciaControl.updateValueAndValidity({ emitEvent: false });
        } else {
          tipoCtrl?.setValidators([Validators.required]);
          tipoCtrl?.updateValueAndValidity({ emitEvent: false });
        }

        this.refreshSteps();
        this.markUi();
      });

    this.formVacante
      .get('tipoExperienciaFlores')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        if (value === 'OTROS') {
          this.otroExperienciaControl.setValidators([Validators.required, Validators.maxLength(64)]);
        } else {
          this.otroExperienciaControl.setValue('');
          this.otroExperienciaControl.clearValidators();
        }

        this.otroExperienciaControl.updateValueAndValidity({ emitEvent: false });
        this.refreshSteps();
        this.markUi();
      });

    this.step1Ctrl.setValidators(
      this.makeValidator(['oficina', 'tipo_doc', 'numero_documento', 'fecha_expedicion', 'mpio_expedicion']),
    );

    this.step2Ctrl.setValidators(
      this.makeValidator([
        'primer_apellido',
        'primer_nombre',
        'fecha_nacimiento',
        'mpio_nacimiento',
        'sexo',
        'estado_civil',
      ]),
    );

    this.step3Ctrl.setValidators(
      this.makeValidator([
        'barrio',
        'celular',
        'whatsapp',
        'personas_con_quien_convive',
        'hace_cuanto_vive',
        'correo_usuario',
        'correo_dominio',
        'password',
      ]),
    );

    this.step4Ctrl.setValidators(
      this.makeValidator(['tieneHijos'], () => {
        const tiene = this.formVacante.get('tieneHijos')?.value === true;
        if (!tiene) return true;
        return this.areValid(['cuidadorHijos', 'numeroHijos']) && this.hijosFA.valid;
      }),
    );

    this.step5Ctrl.setValidators(
      this.makeValidator(['nivel', 'estudiaActualmente', 'proyeccion1Ano', 'experienciaFlores'], () => {
        const exp = this.formVacante.get('experienciaFlores')?.value === 'Sí';
        if (!exp) return true;

        if (!this.areValid(['tipoExperienciaFlores'])) return false;
        const tipo = this.formVacante.get('tipoExperienciaFlores')?.value;
        if (tipo === 'OTROS') return this.otroExperienciaControl.valid;
        return true;
      }),
    );

    this.step6Ctrl.setValidators(() => (this.experienciasFA.valid ? null : { stepInvalid: true }));

    this.formVacante.statusChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.refreshSteps();
      this.markUi();
    });

    this.refreshSteps();
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => {
      if (!this.stepperRef) return;
      this.currentStepIndex = this.stepperRef.selectedIndex ?? 0;
      this.totalSteps = (this.stepperRef.steps?.length as number) || this.totalSteps;
      this.markUi();
    });
  }

  // =========================
  // UI helpers (OnPush)
  // =========================
  private markUi(): void {
    this.cdr.markForCheck();
    queueMicrotask(() => {
      try {
        this.cdr.detectChanges();
      } catch {
        // noop
      }
    });
  }

  private resetStepperToFirst(): void {
    queueMicrotask(() => {
      if (this.stepperRef) {
        this.stepperRef.selectedIndex = 0;
        this.currentStepIndex = 0;
        this.totalSteps = (this.stepperRef.steps?.length as number) || this.totalSteps;
      } else {
        this.pendingStepperReset = true;
        this.currentStepIndex = 0;
      }
      this.refreshSteps();
      this.markUi();
    });
  }

  /**
   * ✅ Release “suave”:
   * SOLO quita locks de scroll (cdk / swal) sin cerrar popups ni borrar overlays.
   */
  private releaseLocksOnly(): void {
    if (!this.isBrowser) return;

    const html = document.documentElement;
    const body = document.body;

    const classes = [
      'swal2-shown',
      'swal2-height-auto',
      'swal2-no-backdrop',
      'swal2-toast-shown',
      'cdk-global-scrollblock',
    ];

    try {
      classes.forEach((c) => html.classList.remove(c));
      classes.forEach((c) => body.classList.remove(c));

      const props = ['overflow', 'padding-right', 'height', 'position', 'top', 'left', 'right', 'bottom', 'width'];
      props.forEach((p) => html.style.removeProperty(p));
      props.forEach((p) => body.style.removeProperty(p));

      body.style.removeProperty('pointer-events');
    } catch {
      // noop
    }
  }

  /**
   * ✅ Release “fuerte” (solo para casos extremos / destroy)
   */
  private forceReleaseSwalLock(): void {
    if (!this.isBrowser) return;

    try {
      const anySwal: any = Swal as any;
      if (typeof anySwal.isVisible === 'function' && anySwal.isVisible()) anySwal.close();
    } catch {
      // noop
    }

    this.releaseLocksOnly();

    try {
      const anySwal: any = Swal as any;
      const visible = typeof anySwal.isVisible === 'function' ? anySwal.isVisible() : false;
      if (!visible) {
        document.querySelectorAll('.swal2-container').forEach((el) => el.remove());
      }
    } catch {
      // noop
    }
  }

  // =========================
  // Helpers: turnos html
  // =========================
  private safe(v: any): string {
    return v === null || v === undefined || v === '' ? '-' : String(v);
  }

  private buildTurnosHtml(turnos: TurnosInfo | null): string {
    if (!turnos) return '';
    return `
      <div style="margin-top:10px; padding:12px; border:1px solid rgba(0,0,0,.12); border-radius:12px;">
        <div style="font-weight:700; margin-bottom:8px;">Turno asignado</div>
        <div><b>Oficina:</b> ${this.safe(turnos.oficina)}</div>
        <div><b>Fecha:</b> ${this.safe(turnos.fecha)}</div>
        <div><b>Turno:</b> ${this.safe(turnos.turno)}</div>
        <div><b>Pendientes hoy:</b> ${this.safe(turnos.pendientes_hoy ?? 0)}</div>
        <div><b>Pendientes delante:</b> ${this.safe(turnos.pendientes_delante ?? 0)}</div>
        <div><b>Mi posición:</b> ${this.safe(turnos.mi_posicion)}</div>
      </div>
    `;
  }

  // =========================
  // Auto-fields + locks
  // =========================
  private applyAutoFields(tipo: string, numeroDigits: string): void {
    this.formVacante.get('tipo_doc')?.setValue(tipo, { emitEvent: false });
    this.formVacante.get('numero_documento')?.setValue(numeroDigits, { emitEvent: false });

    this.formVacante.get('tipo_doc')?.disable({ emitEvent: false });
    this.formVacante.get('numero_documento')?.disable({ emitEvent: false });

    if (this.officeFromQuery) {
      this.formVacante.get('oficina')?.setValue(this.officeFromQuery, { emitEvent: false });
      this.formVacante.get('oficina')?.disable({ emitEvent: false });
      this.lockedOffice = this.officeFromQuery;

      if (this.officeFromQuery === 'BRIGADA' && this.brigadaFromQuery) {
        this.formVacante.get('brigadaDe')?.setValue(this.brigadaFromQuery, { emitEvent: false });
      }
    }
  }

  // =========================
  // Candidate fetch helper
  // =========================
  private async tryFetchCandidate(tipo: string, numeroForRequest: string, oficina: string): Promise<any | null> {
    const svc: any = this.candidateService as any;
    const candidates = [
      'getCandidato',
      'getCandidate',
      'obtenerCandidato',
      'consultarCandidato',
      'getInfoPersonal',
      'getInfoPersonalByDoc',
      'buscarCandidato',
      'detailCandidato',
      'getCandidatoByDoc',
    ];

    const callMaybe = async (fnName: string, args: any[]): Promise<any> => {
      const out = svc[fnName](...args);
      if (out && typeof out.subscribe === 'function') return await firstValueFrom(out);
      return await out;
    };

    for (const name of candidates) {
      if (typeof svc[name] !== 'function') continue;

      try {
        const r1 = await callMaybe(name, [tipo, numeroForRequest, oficina]);
        return r1?.candidato ?? r1?.data ?? r1;
      } catch { }

      try {
        const r2 = await callMaybe(name, [tipo, numeroForRequest]);
        return r2?.candidato ?? r2?.data ?? r2;
      } catch { }

      try {
        const r3 = await callMaybe(name, [{ tipo_doc: tipo, numero_documento: numeroForRequest, oficina }]);
        return r3?.candidato ?? r3?.data ?? r3;
      } catch { }
    }

    return null;
  }

  private async tryExistsCandidato(tipo: string, numeroForRequest: string, oficina: string): Promise<any> {
    const svc: any = this.candidateService as any;
    const fns = ['existsCandidato', 'existeCandidato', 'candidateExists', 'exists'];

    const callMaybe = async (fnName: string, args: any[]): Promise<any> => {
      const out = svc[fnName](...args);
      if (out && typeof out.subscribe === 'function') return await firstValueFrom(out);
      return await out;
    };

    for (const name of fns) {
      if (typeof svc[name] !== 'function') continue;
      try {
        return await callMaybe(name, [tipo, numeroForRequest, oficina]);
      } catch { }
    }

    for (const name of fns) {
      if (typeof svc[name] !== 'function') continue;
      try {
        return await callMaybe(name, [{ tipo_doc: tipo, numero_documento: numeroForRequest, oficina }]);
      } catch { }
    }

    throw new Error('No existe método existsCandidato en el servicio');
  }

  private pickAny(obj: any, keys: string[]): any {
    for (const k of keys) {
      const v = obj?.[k];
      if (v !== undefined && v !== null && v !== '') return v;
    }
    return undefined;
  }

  // =========================
  // Prefill form from candidate
  // =========================
  private prefillFormFromCandidate(data: any): void {
    if (!data || typeof data !== 'object') return;

    const normDateIn = (v: any) => {
      if (!v) return v;
      if (v instanceof Date) return v;
      if (typeof v === 'string') return v.length > 10 ? v.slice(0, 10) : v;
      return v;
    };

    const patch: any = {
      fecha_expedicion: normDateIn(this.pickAny(data, ['fecha_expedicion', 'fechaExpedicion'])),
      mpio_expedicion: this.pickAny(data, ['mpio_expedicion', 'municipio_expedicion', 'mpioExpedicion']),
      primer_apellido: this.pickAny(data, ['primer_apellido', 'primerApellido']),
      segundo_apellido: this.pickAny(data, ['segundo_apellido', 'segundoApellido']),
      primer_nombre: this.pickAny(data, ['primer_nombre', 'primerNombre']),
      segundo_nombre: this.pickAny(data, ['segundo_nombre', 'segundoNombre']),
      fecha_nacimiento: normDateIn(this.pickAny(data, ['fecha_nacimiento', 'fechaNacimiento'])),
      mpio_nacimiento: this.pickAny(data, ['mpio_nacimiento', 'municipio_nacimiento', 'mpioNacimiento']),
      sexo: this.pickAny(data, ['sexo', 'genero']),
      estado_civil: this.pickAny(data, ['estado_civil', 'estadoCivil']),
      barrio: this.pickAny(data, ['barrio']),
      celular: this.pickAny(data, ['celular', 'telefono', 'telefono_celular']),
      whatsapp: this.pickAny(data, ['whatsapp']),
      hace_cuanto_vive: this.pickAny(data, ['hace_cuanto_vive', 'haceCuantoVive']),
      nivel: this.pickAny(data, ['nivel']),
      estudiaActualmente: this.pickAny(data, ['estudiaActualmente', 'estudia_actualmente']),
      proyeccion1Ano: this.pickAny(data, ['proyeccion1Ano', 'como_se_proyecta', 'comoSeProyecta']),
      experienciaFlores: this.pickAny(data, ['experienciaFlores', 'tiene_experiencia', 'tieneExperiencia'])
        ? 'Sí'
        : this.pickAny(data, ['experienciaFlores']) || '',
    };

    const conviveRaw = this.pickAny(data, ['personas_con_quien_convive', 'personasConQuienConvive']);
    if (typeof conviveRaw === 'string') {
      patch.personas_con_quien_convive = conviveRaw
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);
    } else if (Array.isArray(conviveRaw)) {
      patch.personas_con_quien_convive = conviveRaw;
    }

    const mail = this.pickAny(data, ['correo_electronico', 'correoElectronico', 'email']);
    if (typeof mail === 'string' && mail.includes('@')) {
      const [u, d] = mail.split('@');
      patch.correo_usuario = u || '';
      patch.correo_dominio = d || '';
    }

    if (!this.officeFromQuery) {
      const off = this.pickAny(data, ['oficina']);
      if (off) patch.oficina = String(off).trim();
    }

    this.formVacante.patchValue(patch, { emitEvent: false });

    const hijos = this.pickAny(data, ['hijos']) as any[];
    if (Array.isArray(hijos) && hijos.length) {
      this.formVacante.get('tieneHijos')?.setValue(true, { emitEvent: false });
      this.formVacante.get('numeroHijos')?.setValue(hijos.length, { emitEvent: false });
      this.setHijosCount(hijos.length);

      hijos.forEach((h, idx) => {
        const g = this.hijosFA.at(idx) as FormGroup;
        if (!g) return;
        g.patchValue(
          {
            numero_de_documento: String(h?.numero_de_documento ?? h?.numeroDocumento ?? '').replace(/\D+/g, ''),
            fecha_nac: normDateIn(h?.fecha_nac ?? h?.fechaNac),
          },
          { emitEvent: false },
        );
      });
    }

    const exps = this.pickAny(data, ['experiencias', 'experiencia', 'historial_laboral']) as any[];
    if (Array.isArray(exps) && exps.length) {
      this.experienciasFA.clear();
      exps.forEach((e) => {
        this.experienciasFA.push(
          this.fb.group({
            empresa: [String(e?.empresa ?? ''), [Validators.maxLength(255)]],
            tiempo_trabajado: [String(e?.tiempo_trabajado ?? e?.tiempoTrabajado ?? ''), [Validators.maxLength(50)]],
            labores_realizadas: [
              String(e?.labores_realizadas ?? e?.laboresRealizadas ?? ''),
              [Validators.maxLength(255)],
            ],
            labores_principales: [
              String(e?.labores_principales ?? e?.laboresPrincipales ?? ''),
              [Validators.maxLength(255)],
            ],
          }),
        );
      });
      this.seedExperiencias();
    }
  }

  // =========================
  // BÚSQUEDA
  // =========================
  async onBuscar(): Promise<void> {
    if (this.isSearching) return;

    this.releaseLocksOnly();

    this.turnos = null;
    this.existsCandidate = false;
    this.isPrefilling = false;
    this.searchError = null;
    this.lastSearch = undefined;

    if (this.searchForm.invalid) {
      this.searchForm.markAllAsTouched();
      await this.swal.fire({ icon: 'error', title: 'Error', text: 'Completa tipo y número de documento para buscar.' });
      return;
    }

    this.isSearching = true;
    this.markUi();

    try {
      const raw = this.searchForm.getRawValue() as any;
      const tipo = String(raw.tipo_doc || '').toUpperCase().trim();
      const numeroDigits = String(raw.numero_documento || '').replace(/\D+/g, '').trim();
      const numeroForRequest = this.normalizeDocForSubmit(tipo, numeroDigits);

      const oficinaForRequest =
        (this.officeFromQuery && String(this.officeFromQuery).trim()) ||
        (String(this.formVacante.get('oficina')?.value || '').trim() || '');

      this.lastSearch = { tipo, numeroDigits, numeroForRequest, oficinaForRequest };

      this.showForm = false;

      let exists = false;
      let turnos: TurnosInfo | null = null;

      try {
        const resp: any = await this.tryExistsCandidato(tipo, numeroForRequest, oficinaForRequest);
        exists = !!resp?.exists;
        turnos = (resp?.turnos ?? null) as TurnosInfo | null;
      } catch (err: any) {
        console.warn('[existsCandidato] Falló:', err);
        this.searchError = 'No se pudo consultar el documento. Intenta nuevamente.';
        exists = false;
        turnos = null;
      }

      this.existsCandidate = exists;
      this.turnos = turnos;

      const turnosHtml = this.buildTurnosHtml(turnos);

      if (turnos) {
        await this.swal.fire({
          icon: 'info',
          title: 'Tu turno',
          html: `<div style="text-align:left">${turnosHtml}</div>`,
          confirmButtonColor: '#8dd603',
          allowOutsideClick: false,
        });
      }

      let candidateData: any | null = null;

      if (exists) {
        const res = await this.swal.fire({
          icon: 'question',
          title: 'Documento encontrado',
          html: `
            <div style="text-align:left">
              Ya existe información asociada a este documento.<br/>
              ¿Deseas <b>actualizarla</b>?
              ${turnosHtml}
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: 'Sí, actualizar',
          cancelButtonText: 'No',
          confirmButtonColor: '#8dd603',
          reverseButtons: true,
          allowOutsideClick: false,
        });

        if (!res.isConfirmed) {
          await this.swal.fire({
            icon: 'success',
            title: 'Listo',
            html: `
              <div style="text-align:left">
                Tu información ya está registrada. Ya serás atendido, por favor espera.
                ${turnosHtml}
              </div>
            `,
            confirmButtonColor: '#8dd603',
            allowOutsideClick: false,
          });

          this.showForm = false;

          this.formVacante.get('tipo_doc')?.enable({ emitEvent: false });
          this.formVacante.get('numero_documento')?.enable({ emitEvent: false });

          if (this.officeFromQuery) {
            this.formVacante.get('oficina')?.setValue(this.officeFromQuery, { emitEvent: false });
            this.formVacante.get('oficina')?.disable({ emitEvent: false });
            this.lockedOffice = this.officeFromQuery;
          }

          this.refreshSteps();
          this.markUi();
          return;
        }

        this.isPrefilling = true;
        this.markUi();

        try {
          candidateData = await this.tryFetchCandidate(tipo, numeroForRequest, oficinaForRequest);
        } catch (e) {
          console.warn('[tryFetchCandidate] No se pudo traer data:', e);
          candidateData = null;
        } finally {
          this.isPrefilling = false;
          this.markUi();
        }

        this.foundCandidate = { exists: true, tipo_doc: tipo, numero_documento: numeroForRequest, data: candidateData };
      }

      this.showForm = true;

      if (candidateData) this.prefillFormFromCandidate(candidateData);

      this.applyAutoFields(tipo, numeroDigits);

      this.refreshSteps();
      this.resetStepperToFirst();
      this.markUi();
    } finally {
      this.isSearching = false;
      this.markUi();
      this.releaseLocksOnly();
    }
  }

  // ===== Stepper events =====
  onStepChange(e: StepperSelectionEvent): void {
    this.currentStepIndex = e.selectedIndex;

    const host = this.stepperHost?.nativeElement;
    if (host) {
      const ctn = host.querySelector<HTMLElement>('.mat-horizontal-stepper-header-container');
      const headers = ctn?.querySelectorAll<HTMLElement>('.mat-step-header');
      const target = headers?.[e.selectedIndex];
      target?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }

    this.markUi();
  }

  scrollHeaders(direction: 1 | -1): void {
    const ctn = this.stepperHost?.nativeElement.querySelector<HTMLElement>('.mat-horizontal-stepper-header-container');
    if (!ctn) return;
    const delta = Math.round(ctn.clientWidth * 0.85) * direction;
    ctn.scrollBy({ left: delta, behavior: 'smooth' });
  }

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
    this.markUi();
  }

  // ===== Autocomplete ciudades =====
  private loadCities(): void {
    const list = colombia as Array<{ id: number; departamento: string; ciudades: string[] }>;
    const set = new Set<string>();
    for (const d of list) for (const c of d.ciudades ?? []) set.add(c);
    this.allCities = Array.from(set).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  }

  get municipioCtrl() {
    return this.formVacante.get('mpio_expedicion')!;
  }
  get lugarNacimientoCtrl() {
    return this.formVacante.get('mpio_nacimiento')!;
  }

  private setupAutocomplete(): void {
    this.filteredCities$ = this.municipioCtrl.valueChanges.pipe(
      startWith(this.municipioCtrl.value || ''),
      map((value) => this.filterCities(String(value ?? ''))),
    );
  }

  private setupAutocompleteNacimiento(): void {
    this.filteredCitiesNacimiento$ = this.lugarNacimientoCtrl.valueChanges.pipe(
      startWith(this.lugarNacimientoCtrl.value || ''),
      map((value) => this.filterCities(String(value ?? ''))),
    );
  }

  private filterCities(value: string): string[] {
    const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
    const q = norm(value);
    if (!q) return this.allCities.slice(0, 50);
    return this.allCities.filter((c) => norm(c).includes(q)).slice(0, 50);
  }

  onMunicipioSelected(event: MatAutocompleteSelectedEvent): void {
    this.municipioCtrl.setValue(event.option.value);
  }

  onLugarNacimientoSelected(event: MatAutocompleteSelectedEvent): void {
    this.lugarNacimientoCtrl.setValue(event.option.value);
  }

  // ===== Hijos =====
  get hijosFA(): FormArray {
    return this.formVacante.get('hijos') as FormArray;
  }

  private buildHijoGroup(): FormGroup {
    return this.fb.group({
      numero_de_documento: ['', [Validators.pattern(/^\d+$/), Validators.minLength(6), Validators.maxLength(15)]],
      fecha_nac: [null, [Validators.required]],
    });
  }

  private setHijosCount(n: number): void {
    const fa = this.hijosFA;
    while (fa.length < n) fa.push(this.buildHijoGroup());
    while (fa.length > n) fa.removeAt(fa.length - 1);
    this.refreshSteps();
  }

  // ===== Experiencias =====
  get experienciasFA(): FormArray {
    return this.formVacante.get('experiencias') as FormArray;
  }

  addExperiencia(): void {
    this.experienciasFA.push(this.buildExperienciaGroup(true));
    this.refreshSteps();
    this.markUi();
  }

  removeExperiencia(i: number): void {
    if (i < this.SEED_EXP_COUNT) return;
    this.experienciasFA.removeAt(i);
    this.refreshSteps();
    this.markUi();
  }

  private buildExperienciaGroup(required = true): FormGroup {
    return this.fb.group({
      empresa: ['', required ? [Validators.required, Validators.maxLength(255)] : [Validators.maxLength(255)]],
      tiempo_trabajado: ['', [Validators.maxLength(50)]],
      labores_realizadas: ['', [Validators.maxLength(255)]],
      labores_principales: ['', [Validators.maxLength(255)]],
    });
  }

  private seedExperiencias(n = this.SEED_EXP_COUNT): void {
    const fa = this.experienciasFA;
    while (fa.length < n) fa.push(this.buildExperienciaGroup(false));
  }

  // ===== Validación pasos =====
  private areValid(keys: string[]): boolean {
    return keys.every((k) => {
      const c = this.formVacante.get(k);
      return !!c && (c.disabled || c.valid);
    });
  }

  private makeValidator(keys: string[], extra?: () => boolean): ValidatorFn {
    return (): null | { stepInvalid: true } => {
      const base = this.areValid(keys);
      const cond = extra ? extra() : true;
      return base && cond ? null : { stepInvalid: true };
    };
  }

  private refreshSteps(): void {
    this.step1Ctrl.updateValueAndValidity({ onlySelf: true, emitEvent: false });
    this.step2Ctrl.updateValueAndValidity({ onlySelf: true, emitEvent: false });
    this.step3Ctrl.updateValueAndValidity({ onlySelf: true, emitEvent: false });
    this.step4Ctrl.updateValueAndValidity({ onlySelf: true, emitEvent: false });
    this.step5Ctrl.updateValueAndValidity({ onlySelf: true, emitEvent: false });
    this.step6Ctrl.updateValueAndValidity({ onlySelf: true, emitEvent: false });
  }

  private normalizeDocForSubmit(tipo: string, raw: any): string {
    const digits = String(raw ?? '').replace(/\D+/g, '').trim();
    if (!digits) return digits;
    return tipo === 'CC' ? digits : `X${digits}`;
  }

  private isAlreadyRegisteredError(err: any): boolean {
    const p = err?.error ?? err;
    const docMsg = Array.isArray(p?.numero_de_documento) ? p.numero_de_documento.join(' ') : '';
    const mailMsg = Array.isArray(p?.correo_electronico) ? p.correo_electronico.join(' ') : '';
    return /ya registrado/i.test(docMsg) || /ya registrado/i.test(mailMsg) || err?.status === 409;
  }

  private toYmd(v: any): any {
    if (!v) return v;
    if (typeof v === 'string') return v.length > 10 ? v.slice(0, 10) : v;

    if (v instanceof Date && !isNaN(v.getTime())) {
      const y = v.getFullYear();
      const m = String(v.getMonth() + 1).padStart(2, '0');
      const d = String(v.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    return v;
  }

  // =========================
  // SUBMIT (completo)
  // =========================
  async onSubmit(): Promise<void> {
    if (this.isSubmitting) return;

    this.forceReleaseSwalLock();

    if (this.formVacante.invalid) {
      this.formVacante.markAllAsTouched();
      await Swal.fire('Error', 'Por favor complete todos los campos requeridos.', 'error');
      this.forceReleaseSwalLock();
      return;
    }

    this.isSubmitting = true;
    this.markUi();

    try {
      const rawForm = this.formVacante.getRawValue() as any;
      const formValue: any = { ...rawForm };

      const tipoFromForm = (rawForm.tipo_doc ?? '').toString().trim();
      const tipoFromSearch = (this.searchForm.get('tipo_doc')?.value ?? '').toString().trim();
      const tipoSafe = (tipoFromForm || tipoFromSearch).toUpperCase().trim();

      const numFromForm = (rawForm.numero_documento ?? '').toString().trim();
      const numFromSearch = (this.searchForm.get('numero_documento')?.value ?? '').toString().trim();
      const numSafeDigits = (numFromForm || numFromSearch).replace(/\D+/g, '').trim();

      const oficinaFromForm = (rawForm.oficina ?? '').toString().trim();
      const oficinaSafe = (oficinaFromForm || this.lockedOffice || this.officeFromQuery || '').toString().trim();

      formValue.tipo_doc = tipoSafe;
      formValue.numero_documento = numSafeDigits;
      formValue.oficina = oficinaSafe;

      const missingAuto = ['oficina', 'tipo_doc', 'numero_documento'].filter((k) => !String(formValue[k] ?? '').trim());
      if (missingAuto.length) {
        await Swal.fire('Error', `Faltan datos obligatorios: ${missingAuto.join(', ')}`, 'error');
        return;
      }

      if (/@|\s/.test(formValue.correo_usuario)) {
        await Swal.fire('Error', 'El usuario del correo no debe incluir @, espacios ni el dominio.', 'error');
        return;
      }
      if (!formValue.correo_dominio) {
        await Swal.fire('Error', 'Debe seleccionar un dominio para el correo.', 'error');
        return;
      }
      formValue.correo_electronico = `${formValue.correo_usuario}@${formValue.correo_dominio}`;
      formValue.username = formValue.correo_electronico;
      delete formValue.correo_usuario;
      delete formValue.correo_dominio;

      formValue.tipo_documento = String(formValue.tipo_doc || '').toUpperCase();

      const rawOficina = String(formValue.oficina || '').trim();
      if (rawOficina === 'BRIGADA' && formValue.brigadaDe) {
        formValue.oficina = `BRIGADA DE ${String(formValue.brigadaDe).toUpperCase().trim()}`;
      } else {
        formValue.oficina = rawOficina;
      }
      delete formValue.brigadaDe;

      const normDate = (v: any) => {
        if (!v) return v;
        if (v instanceof Date) return v.toISOString().slice(0, 10);
        if (typeof v === 'string') return v.length > 10 ? v.slice(0, 10) : v;
        return v;
      };
      formValue.fecha_nacimiento = normDate(formValue.fecha_nacimiento);
      formValue.fecha_expedicion = normDate(formValue.fecha_expedicion);

      formValue.numero_documento = this.normalizeDocForSubmit(
        String(formValue.tipo_doc || '').toUpperCase(),
        formValue.numero_documento,
      );

      // equivalentes
      formValue.numeroCedula = formValue.numero_documento;
      formValue.tipoDoc = formValue.tipo_doc;

      if (Array.isArray(formValue.personas_con_quien_convive)) {
        formValue.personas_con_quien_convive = formValue.personas_con_quien_convive.filter(Boolean).join(', ');
      }

      // cuidadorHijos por responsable_hijos
      formValue.vivienda ??= {};
      formValue.vivienda.responsable_hijos = formValue.cuidadorHijos ?? null;
      delete formValue.cuidadorHijos;

      formValue.como_se_proyecta = formValue.proyeccion1Ano;
      delete formValue.proyeccion1Ano;

      const tieneExp = formValue.experienciaFlores === 'Sí';
      formValue.tiene_experiencia = !!tieneExp;

      if (tieneExp) {
        let area = formValue.tipoExperienciaFlores || '';
        if (area === 'OTROS' && this.otroExperienciaControl.value) {
          area = String(this.otroExperienciaControl.value).trim();
        }
        formValue.area_cultivo_poscosecha = area || null;
        formValue.area_experiencia = area || null;
      }

      delete formValue.experienciaFlores;
      delete formValue.tipoExperienciaFlores;
      delete formValue.otroExperiencia;

      formValue.experiencias = (formValue.experiencias || []).filter((exp: any) => {
        if (!exp || typeof exp !== 'object') return false;
        const hasEmpresa = String(exp.empresa || '').trim().length > 0;
        const hasOtherData = Object.keys(exp).some((k) => k !== 'empresa' && String(exp[k] || '').trim().length > 0);
        return hasEmpresa || hasOtherData;
      });

      // ✅ HIJOS
      formValue.hijos = this.hijosFA.controls
        .map((c) => {
          const nd = String(c.get('numero_de_documento')?.value ?? '').replace(/\D+/g, '');
          const fn = c.get('fecha_nac')?.value;
          return { numero_de_documento: nd || undefined, fecha_nac: normDate(fn) };
        })
        .filter((h) => !!h.fecha_nac);

      let registerAlreadyExists = false;
      try {
        const registerSource =
          typeof structuredClone === 'function' ? structuredClone(formValue) : JSON.parse(JSON.stringify(formValue));
        const dto = await (this.authService as any).buildRegisterDto(registerSource);

        const regAny: any = (this.authService as any).register(dto);
        if (regAny && typeof regAny.subscribe === 'function') await firstValueFrom(regAny);
        else await regAny;
      } catch (e: any) {
        registerAlreadyExists = this.isAlreadyRegisteredError(e);
        if (!registerAlreadyExists) console.warn('Fallo de registro no esperado:', e);
      }

      Object.keys(formValue).forEach((key) => {
        const isString = typeof formValue[key] === 'string';
        if (!isString) return;
        if (['correo_electronico', 'username', 'password'].includes(key)) return;
        formValue[key] = formValue[key].toUpperCase();
      });

      delete formValue.tieneHijos;
      delete formValue.numeroHijos;
      delete formValue.estudiaActualmente;

      try {
        console.log('Enviando formulario con payload:', formValue);

        // ✅ CAMBIO: enviar DIRECTO a crearActualizarCandidato
        const resp: any = await firstValueFrom(this.candidateService.crearActualizarCandidato(formValue));

        const t = resp?.turnos as TurnosInfo | undefined;
        const numero = formValue?.numero_documento;
        const oficina = t?.oficina || formValue?.oficina || 'VIRTUAL';

        const extraLogin = registerAlreadyExists
          ? `
            <hr/>
            <div style="margin-top:8px">
              <b>Tu usuario ya existe.</b><br/>
              Por favor <b>inicia sesión</b> con <b>${formValue.correo_electronico}</b> y tu contraseña para
              <b>terminar de llenar el formulario</b> y continuar el proceso.
            </div>
          `
          : '';

        if (t) {
          await Swal.fire({
            icon: 'success',
            title: 'Registro guardado',
            html: `
              <div style="text-align:left">
                <div>Se registró la cédula <b>${numero}</b> en <b>${oficina}</b>.</div>
                <hr/>
                <div><b>Fecha:</b> ${this.safe(t.fecha)}</div>
                <div><b>Turno asignado:</b> <b>${this.safe(t.turno)}</b></div>
                <div><b>Pendientes hoy:</b> ${this.safe(t.pendientes_hoy)}</div>
                <div><b>Pendientes delante de ti:</b> <b>${this.safe(t.pendientes_delante)}</b></div>
                <div><b>Tu posición:</b> <b>${this.safe(t.mi_posicion)}</b></div>
                ${extraLogin}
              </div>
            `,
            confirmButtonText: 'Entendido',
          });
        } else {
          await Swal.fire({
            icon: 'success',
            title: 'Registro guardado',
            html: `
              <div style="text-align:left">
                Se guardó la información de la cédula <b>${numero}</b>.
                ${extraLogin}
              </div>
            `,
          });
        }
      } catch (error: any) {
        const status = error?.status;
        const payload = error?.error;
        const t = payload?.turnos as TurnosInfo | undefined;

        const numero = formValue?.numero_documento;
        const oficina = t?.oficina || formValue?.oficina || 'VIRTUAL';

        const extraLogin = registerAlreadyExists
          ? `
            <hr/>
            <div style="margin-top:8px">
              <b>Tu usuario ya existe.</b><br/>
              Por favor <b>inicia sesión</b> con <b>${formValue.correo_electronico}</b> y tu contraseña para
              <b>terminar de llenar el formulario</b> y continuar el proceso.
            </div>
          `
          : '';

        if (status === 409) {
          await Swal.fire({
            icon: 'warning',
            title: 'Registro reciente',
            html: t
              ? `
                <div style="text-align:left">
                  <div>Ya existe un registro reciente para la cédula <b>${numero}</b> en <b>${oficina}</b>.</div>
                  <hr/>
                  <div><b>Fecha:</b> ${this.safe(t.fecha)}</div>
                  <div><b>Turno:</b> <b>${this.safe(t.turno)}</b></div>
                  <div><b>Pendientes hoy:</b> ${this.safe(t.pendientes_hoy)}</div>
                  <div><b>Pendientes delante de ti:</b> <b>${this.safe(t.pendientes_delante)}</b></div>
                  <div><b>Tu posición:</b> <b>${this.safe(t.mi_posicion)}</b></div>
                  ${extraLogin}
                </div>
              `
              : payload?.detail || `Ya existe un registro reciente para la cédula ${numero} en ${oficina}.`,
            confirmButtonText: 'Entendido',
          });
          return;
        }

        await Swal.fire({
          icon: 'error',
          title: 'Error',
          text: payload?.detail || 'No se pudo guardar la información personal.',
        });
      }
    } finally {
      this.isSubmitting = false;
      this.markUi();
      this.forceReleaseSwalLock();
    }
  }

  // ===== Query param oficina =====
  private hydrateOfficeFromQuery(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const raw = (params.get('oficina') || params.get('o') || '').trim();
      const brigada = (params.get('brigada') || '').trim();

      if (!raw) {
        this.officeFromQuery = undefined;
        this.brigadaFromQuery = undefined;

        this.formVacante.get('oficina')?.enable({ emitEvent: false });
        this.lockedOffice = undefined;

        this.refreshSteps();
        this.markUi();
        return;
      }

      const norm = this.normalizeOffice(raw);
      const mapOffice = new Map(this.oficinas.map((o) => [this.normalizeOffice(o), o]));
      const match = mapOffice.get(norm);

      if (match) {
        this.officeFromQuery = match;
        this.lockedOffice = match;

        this.formVacante.get('oficina')?.setValue(match, { emitEvent: false });
        this.formVacante.get('oficina')?.disable({ emitEvent: false });

        if (match === 'BRIGADA') {
          this.brigadaFromQuery = brigada || undefined;
          if (brigada) this.formVacante.get('brigadaDe')?.setValue(brigada, { emitEvent: false });
        } else {
          this.brigadaFromQuery = undefined;
          this.formVacante.get('brigadaDe')?.setValue('', { emitEvent: false });
        }
      }

      this.refreshSteps();
      this.markUi();
    });
  }

  private normalizeOffice(s: string): string {
    return s
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[\s-]+/g, '_')
      .toUpperCase();
  }
}
