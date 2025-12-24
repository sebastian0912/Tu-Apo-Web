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

import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
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
import { MatNativeDateModule } from '@angular/material/core';

import Swal from 'sweetalert2';
import { firstValueFrom, map, Observable, startWith } from 'rxjs';

import { SharedModule } from '../../../../../../shared/shared-module';
import { LoginS } from '../../../../../auth/service/login-s';
import { RegistroProcesoContratacion } from '../../services/registro-proceso-contratacion/registro-proceso-contratacion';

import colombia from '../../../../../../data/colombia.json';

export const MY_DATE_FORMATS = {
  parse: { dateInput: 'D/M/YYYY' },
  display: {
    dateInput: 'D/M/YYYY',
    monthYearLabel: 'MMMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
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
  styleUrl: './form-pre-registration-vacancies.css',
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

  // ===== UI: búsqueda =====
  searchForm: FormGroup;
  isSearching = false;
  foundCandidate: any = null;

  // ===== oficina por URL (persistente aunque resetees el form) =====
  private officeFromQuery?: string;   // valor exacto (ej: 'SUBA')
  private brigadaFromQuery?: string;  // ej: 'ZIPAQUIRÁ' si viene ?brigada=

  private _showForm = false;
  get showForm(): boolean {
    return this._showForm;
  }
  set showForm(v: boolean) {
    this._showForm = v;

    // si se oculta el formulario, reseteamos SIN perder la oficina de URL
    if (!v) {
      this.foundCandidate = null;

      this.formVacante.reset();
      this.experienciasFA.clear();
      this.hijosFA.clear();
      this.seedExperiencias();

      // Doc habilitado para volver a buscar
      this.formVacante.get('tipo_doc')?.enable({ emitEvent: false });
      this.formVacante.get('numero_documento')?.enable({ emitEvent: false });

      // Oficina: si viene por URL => set + disable (NO se pierde)
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
    }

    this.cdr.markForCheck();
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
  step6Ctrl = new FormGroup({}); // Historial laboral

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
    { esco: 'EDUCACIÓN BÁSICA PRIMARIA', descripcion: 'Educación básica primaria — Grados 1 a 5' },
    { esco: 'EDUCACIÓN BÁSICA SECUNDARIA', descripcion: 'Educación básica secundaria — Grados 6 a 9' },
    { esco: 'EDUCACIÓN MEDIA ACADÉMICA', descripcion: 'Educación media académica — Grados 10 y 11' },
    { esco: 'EDUCACIÓN TÉCNICA', descripcion: 'Educación técnica — Formación técnica laboral' },
    { esco: 'EDUCACIÓN TECNOLÓGICA', descripcion: 'Educación tecnológica — Nivel tecnológico' },
    { esco: 'EDUCACIÓN PROFESIONAL', descripcion: 'Educación profesional — Pregrado universitario' },
  ];

  estadosCiviles: any[] = [
    { codigo: 'SO', descripcion: 'SO (Soltero)' },
    { codigo: 'UL', descripcion: 'UL (Unión Libre)' },
    { codigo: 'CA', descripcion: 'CA (Casado)' },
    { codigo: 'SE', descripcion: 'SE (Separado)' },
    { codigo: 'VI', descripcion: 'VI (Viudo)' },
  ];

  meses = Array.from({ length: 12 }, (_, i) => i + 1);
  anios = Array.from({ length: 80 }, (_, i) => i + 1);

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
  ];

  // Stepper refs
  @ViewChild('stepper') stepperRef?: MatStepper;
  @ViewChild('stepperHost') stepperHost!: ElementRef<HTMLDivElement>;

  constructor(
    private fb: FormBuilder,
    private candidateService: RegistroProcesoContratacion,
    private authService: LoginS,
    private dateAdapter: DateAdapter<Date>,
    private route: ActivatedRoute,
  ) {
    this.dateAdapter.setLocale('es-CO');

    // 🔒 evita que SweetAlert deje el body bloqueado si el componente se destruye
    this.destroyRef.onDestroy(() => {
      this.forceReleaseSwalLock();
    });

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
      numero_documento: ['', [Validators.required, Validators.pattern(/^\d+$/), Validators.minLength(6), Validators.maxLength(15)]],
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

    // ===== Reglas condicionales: hijos =====
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
        this.cdr.markForCheck();
      });

    this.formVacante
      .get('numeroHijos')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((n: number) => {
        const parsed = Number(n) || 0;
        this.setHijosCount(parsed);
        this.cdr.markForCheck();
      });
  }

  ngOnInit(): void {
    // ✅ primero lee oficina de URL y la “fija”
    this.hydrateOfficeFromQuery();

    this.loadCities();
    this.setupAutocomplete();
    this.setupAutocompleteNacimiento();

    this.seedExperiencias();

    // Experiencia flores -> validadores condicionales
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
        this.cdr.markForCheck();
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
        this.cdr.markForCheck();
      });

    // ===== Validadores de pasos (stepper lineal) =====
    this.step1Ctrl.setValidators(
      this.makeValidator(['oficina', 'tipo_doc', 'numero_documento', 'fecha_expedicion', 'mpio_expedicion']),
    );

    this.step2Ctrl.setValidators(
      this.makeValidator(['primer_apellido', 'primer_nombre', 'fecha_nacimiento', 'mpio_nacimiento', 'sexo', 'estado_civil']),
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
        const baseOk = this.areValid(['cuidadorHijos', 'numeroHijos']);
        return baseOk && this.hijosFA.valid;
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
      this.cdr.markForCheck();
    });

    this.refreshSteps();
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => {
      if (!this.stepperRef) return;
      this.currentStepIndex = this.stepperRef.selectedIndex ?? 0;
      this.totalSteps = (this.stepperRef.steps?.length as number) || this.totalSteps;
      this.cdr.detectChanges();
    });
  }

  // =========================
  // ✅ FIX: liberar bloqueo de SweetAlert2
  // =========================
  private forceReleaseSwalLock(): void {
    if (!this.isBrowser) return;

    try {
      // Si el modal está visible, ciérralo
      const anySwal: any = Swal as any;
      if (typeof anySwal.isVisible === 'function' && anySwal.isVisible()) {
        anySwal.close();
      } else {
        // por si acaso
        anySwal.close?.();
      }
    } catch {
      // noop
    }

    // elimina cualquier container pegado
    try {
      document.querySelectorAll('.swal2-container').forEach((el) => el.remove());
    } catch {
      // noop
    }

    // limpia clases/estilos que bloquean scroll/click
    try {
      document.body.classList.remove(
        'swal2-shown',
        'swal2-height-auto',
        'swal2-no-backdrop',
        'swal2-toast-shown',
      );
      document.body.style.removeProperty('overflow');
      document.body.style.removeProperty('padding-right');
    } catch {
      // noop
    }
  }

  // ===== Handler búsqueda (con Swal mostrando turnos SIEMPRE que vengan) =====
  async onBuscar(): Promise<void> {
    if (this.isSearching) return;

    // por si quedó un backdrop viejo
    this.forceReleaseSwalLock();

    if (this.searchForm.invalid) {
      this.searchForm.markAllAsTouched();
      await Swal.fire('Error', 'Completa tipo y número de documento para buscar.', 'error');
      this.forceReleaseSwalLock();
      return;
    }

    this.isSearching = true;
    this.cdr.markForCheck();

    try {
      // loader (opcional pero recomendado para UX)
      Swal.fire({
        title: 'Buscando...',
        text: 'Consultando tu documento y turno asignado.',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const raw = this.searchForm.getRawValue() as any;
      const tipo = String(raw.tipo_doc || '').toUpperCase().trim();
      const numeroDigits = String(raw.numero_documento || '').replace(/\D+/g, '').trim();
      const numeroForRequest = this.normalizeDocForSubmit(tipo, numeroDigits);

      // ✅ oficina para enviar al backend (prioridad: query -> form -> vacío)
      const oficinaForRequest =
        (this.officeFromQuery && String(this.officeFromQuery).trim()) ||
        (String(this.formVacante.get('oficina')?.value || '').trim() || '');

      // Oculta form y resetea
      this.showForm = false;
      this.foundCandidate = null;
      this.cdr.detectChanges();

      // =========================
      // exists ahora devuelve:
      //  { exists:false }
      //  { exists:true, turnos:{...} }
      // =========================
      let exists = false;
      let turnos: any = null;

      try {
        const resp: any = await firstValueFrom(
          this.candidateService.existsCandidato(tipo, numeroForRequest, oficinaForRequest),
        );
        exists = !!resp?.exists;
        turnos = resp?.turnos ?? null;
      } catch (err) {
        console.warn('[existsCandidato] Falló, se permitirá continuar:', err);
        exists = false;
        turnos = null;
      } finally {
        Swal.close(); // cierra loading
        this.forceReleaseSwalLock();
      }

      const safe = (v: any) => (v === null || v === undefined || v === '' ? '-' : String(v));

      const turnosHtml = turnos
        ? `
        <div style="margin-top:10px; padding:12px; border:1px solid rgba(0,0,0,.12); border-radius:12px;">
          <div style="font-weight:700; margin-bottom:8px;">Turno asignado</div>
          <div><b>Oficina:</b> ${safe(turnos.oficina)}</div>
          <div><b>Fecha:</b> ${safe(turnos.fecha)}</div>
          <div><b>Turno:</b> ${safe(turnos.turno)}</div>
          <div><b>Pendientes hoy:</b> ${safe(turnos.pendientes_hoy ?? 0)}</div>
          <div><b>Pendientes delante:</b> ${safe(turnos.pendientes_delante ?? 0)}</div>
          <div><b>Mi posición:</b> ${safe(turnos.mi_posicion)}</div>
        </div>
      `
        : '';

      // =========================
      // ✅ SIEMPRE que haya turnos => mostrarlo (exista o no, actualice o no)
      // =========================
      if (turnos) {
        await Swal.fire({
          icon: 'info',
          title: 'Tu turno',
          html: `<div style="text-align:left">${turnosHtml}</div>`,
          confirmButtonColor: '#8dd603',
          allowOutsideClick: false,
        });
        this.forceReleaseSwalLock();
      }

      // =========================
      // SI EXISTE -> CONFIRMAR ACTUALIZACIÓN (mostrando turnos si vinieron)
      // =========================
      if (exists) {
        const res = await Swal.fire({
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

        this.forceReleaseSwalLock();

        // NO quiere actualizar -> NO mostrar formulario, pero ya vio turnos arriba
        if (!res.isConfirmed) {
          await Swal.fire({
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

          this.forceReleaseSwalLock();

          this.showForm = false;

          // por si quedaron deshabilitados de intentos previos
          this.formVacante.get('tipo_doc')?.enable({ emitEvent: false });
          this.formVacante.get('numero_documento')?.enable({ emitEvent: false });

          // Reaplica oficina por URL si existe
          if (this.officeFromQuery) {
            this.formVacante.get('oficina')?.setValue(this.officeFromQuery, { emitEvent: false });
            this.formVacante.get('oficina')?.disable({ emitEvent: false });
            this.lockedOffice = this.officeFromQuery;
          }

          this.refreshSteps();
          this.cdr.detectChanges();
          return;
        }

        // SI quiere actualizar
        this.foundCandidate = { exists: true, tipo_doc: tipo, numero_documento: numeroForRequest };
      }

      // =========================
      // MOSTRAR FORMULARIO (si no existe, o existe y confirmó actualizar)
      // =========================
      this.showForm = true;

      // Precarga documento en el form principal
      this.formVacante.get('tipo_doc')?.setValue(tipo, { emitEvent: false });
      this.formVacante.get('numero_documento')?.setValue(numeroDigits, { emitEvent: false });

      // Bloquear doc para que no lo cambien después de buscar
      this.formVacante.get('tipo_doc')?.disable({ emitEvent: false });
      this.formVacante.get('numero_documento')?.disable({ emitEvent: false });

      // ✅ Oficina: si viene por URL => set + disable SIEMPRE
      if (this.officeFromQuery) {
        this.formVacante.get('oficina')?.setValue(this.officeFromQuery, { emitEvent: false });
        this.formVacante.get('oficina')?.disable({ emitEvent: false });
        this.lockedOffice = this.officeFromQuery;

        if (this.officeFromQuery === 'BRIGADA' && this.brigadaFromQuery) {
          this.formVacante.get('brigadaDe')?.setValue(this.brigadaFromQuery, { emitEvent: false });
        }
      }

      // Reinicia stepper al paso 0 y actualiza progreso
      queueMicrotask(() => {
        if (this.stepperRef) {
          this.stepperRef.selectedIndex = 0;
          this.currentStepIndex = 0;
          this.totalSteps = (this.stepperRef.steps?.length as number) || this.totalSteps;
        }
        this.refreshSteps();
        this.cdr.detectChanges();
      });
    } finally {
      this.isSearching = false;
      this.cdr.markForCheck();

      // por si SweetAlert dejó algo pegado
      this.forceReleaseSwalLock();
    }
  }



  // ===== Stepper events =====
  onStepChange(e: StepperSelectionEvent): void {
    this.currentStepIndex = e.selectedIndex;

    // ✅ scroll horizontal al header del stepper (el contenedor real es .mat-horizontal-stepper-header-container)
    const host = this.stepperHost?.nativeElement;
    if (host) {
      const ctn = host.querySelector<HTMLElement>('.mat-horizontal-stepper-header-container');
      const headers = ctn?.querySelectorAll<HTMLElement>('.mat-step-header');
      const target = headers?.[e.selectedIndex];
      target?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }

    this.cdr.markForCheck();
  }

  scrollHeaders(direction: 1 | -1): void {
    const ctn = this.stepperHost?.nativeElement.querySelector<HTMLElement>('.mat-horizontal-stepper-header-container');
    if (!ctn) return;
    const delta = Math.round(ctn.clientWidth * 0.85) * direction;
    ctn.scrollBy({ left: delta, behavior: 'smooth' });
  }

  // ===== Autocomplete ciudades =====
  private loadCities(): void {
    const list = colombia as Array<{ id: number; departamento: string; ciudades: string[] }>;
    const set = new Set<string>();
    list.forEach((d) => d.ciudades?.forEach((c) => set.add(c)));
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
    this.cdr.markForCheck();
  }

  removeExperiencia(i: number): void {
    if (i < this.SEED_EXP_COUNT) return;
    this.experienciasFA.removeAt(i);
    this.refreshSteps();
    this.cdr.markForCheck();
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

  /** Normaliza número (solo dígitos) y añade 'X' al INICIO si tipo != CC */
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

  async onSubmit(): Promise<void> {
    if (this.isSubmitting) return;

    // por si quedó un backdrop viejo
    this.forceReleaseSwalLock();

    if (this.formVacante.invalid) {
      this.formVacante.markAllAsTouched();
      await Swal.fire('Error', 'Por favor complete todos los campos requeridos.', 'error');
      this.forceReleaseSwalLock();
      return;
    }

    this.isSubmitting = true;
    this.cdr.markForCheck();

    try {
      const formValue: any = { ...this.formVacante.getRawValue() };

      // (A) Correo
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

      // (B) Oficina BRIGADA
      const rawOficina = String(formValue.oficina || '').trim();
      if (rawOficina === 'BRIGADA' && formValue.brigadaDe) {
        formValue.oficina = `BRIGADA DE ${String(formValue.brigadaDe).toUpperCase().trim()}`;
      } else {
        formValue.oficina = rawOficina;
      }
      delete formValue.brigadaDe;

      // (C) Fechas -> YYYY-MM-DD
      const normDate = (v: any) => {
        if (!v) return v;
        if (v instanceof Date) return v.toISOString().slice(0, 10);
        if (typeof v === 'string') return v.length > 10 ? v.slice(0, 10) : v;
        return v;
      };
      formValue.fecha_nacimiento = normDate(formValue.fecha_nacimiento);
      formValue.fecha_expedicion = normDate(formValue.fecha_expedicion);

      // (D) Documento: prefijar X si no es CC
      formValue.numero_documento = this.normalizeDocForSubmit(
        String(formValue.tipo_doc || '').toUpperCase(),
        formValue.numero_documento,
      );

      // (E) Convive: array -> string
      if (Array.isArray(formValue.personas_con_quien_convive)) {
        formValue.personas_con_quien_convive = formValue.personas_con_quien_convive.filter((x: any) => !!x).join(', ');
      }

      // (F) Proyección
      formValue.como_se_proyecta = formValue.proyeccion1Ano;
      delete formValue.proyeccion1Ano;

      // (G) Experiencia flores
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

      // Filtrar experiencias vacías
      formValue.experiencias = (formValue.experiencias || []).filter((exp: any) => {
        if (!exp || typeof exp !== 'object') return false;
        const hasEmpresa = String(exp.empresa || '').trim().length > 0;
        const hasOtherData = Object.keys(exp).some((k) => k !== 'empresa' && String(exp[k] || '').trim().length > 0);
        return hasEmpresa || hasOtherData;
      });

      // (H) Hijos
      formValue.hijos = this.hijosFA.controls
        .map((c) => {
          const nd = String(c.get('numero_de_documento')?.value ?? '').replace(/\D+/g, '');
          const fn = c.get('fecha_nac')?.value;
          return {
            numero_de_documento: nd || undefined,
            fecha_nac: normDate(fn),
          };
        })
        .filter((h) => !!h.fecha_nac);

      // =========================
      // 1) Registrar usuario (tolerante: Observable o Promise)
      // =========================
      let registerAlreadyExists = false;
      try {
        const dto = await this.authService.buildRegisterDto(formValue);

        const regAny: any = this.authService.register(dto);
        if (regAny && typeof regAny.subscribe === 'function') {
          await firstValueFrom(regAny);
        } else {
          await regAny;
        }
      } catch (e: any) {
        registerAlreadyExists = this.isAlreadyRegisteredError(e);
        if (!registerAlreadyExists) {
          console.warn('Fallo de registro no esperado:', e);
        }
      }

      // =========================
      // 2) Uppercase (except correo/username/password)
      // =========================
      Object.keys(formValue).forEach((key) => {
        const isString = typeof formValue[key] === 'string';
        if (!isString) return;
        if (['correo_electronico', 'username', 'password'].includes(key)) return;
        formValue[key] = formValue[key].toUpperCase();
      });

      // Limpieza UI-only
      delete formValue.tieneHijos;
      delete formValue.numeroHijos;
      delete formValue.estudiaActualmente;

      // =========================
      // 3) Guardar candidato y mostrar turnos
      // =========================
      try {
        const resp: any = await firstValueFrom(this.candidateService.guardarInfoPersonal(formValue));

        const t = resp?.turnos;
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
                <div><b>Fecha:</b> ${t.fecha}</div>
                <div><b>Turno asignado:</b> <b>${t.turno}</b></div>
                <div><b>Pendientes hoy:</b> ${t.pendientes_hoy}</div>
                <div><b>Pendientes delante de ti:</b> <b>${t.pendientes_delante}</b></div>
                <div><b>Tu posición:</b> <b>${t.mi_posicion}</b></div>
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
        const t = payload?.turnos;

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
                  <div><b>Fecha:</b> ${t.fecha}</div>
                  <div><b>Turno:</b> <b>${t.turno}</b></div>
                  <div><b>Pendientes hoy:</b> ${t.pendientes_hoy}</div>
                  <div><b>Pendientes delante de ti:</b> <b>${t.pendientes_delante}</b></div>
                  <div><b>Tu posición:</b> <b>${t.mi_posicion}</b></div>
                  ${extraLogin}
                </div>
              `
              : (payload?.detail || `Ya existe un registro reciente para la cédula ${numero} en ${oficina}.`),
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
      this.cdr.markForCheck();
      this.forceReleaseSwalLock();
    }
  }

  processErrors(errors: any): string {
    const msgs: string[] = [];
    if (errors?.correo_electronico) msgs.push('Ya existe un usuario con este correo electrónico.');
    if (errors?.numero_documento) msgs.push('Ya existe un usuario con este número de documento.');
    return msgs.join('\n');
  }

  get tiempoResidenciaParsed() {
    const v = this.formVacante.value.hace_cuanto_vive as string | null;
    if (!v) return null;
    if (v === 'LIFETIME') return { unit: 'LIFETIME', quantity: null, label: 'Toda la vida' };
    const [u, q] = v.split(':');
    const n = Number(q);
    if (u === 'M') return { unit: 'MONTH', quantity: n, label: `${n} ${n === 1 ? 'mes' : 'meses'}` };
    if (u === 'Y') return { unit: 'YEAR', quantity: n, label: `${n} ${n === 1 ? 'año' : 'años'}` };
    return null;
  }

  // ===== Query param oficina =====
  private hydrateOfficeFromQuery(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const raw = (params.get('oficina') || params.get('o') || '').trim();
      const brigada = (params.get('brigada') || '').trim();

      if (!raw) {
        this.officeFromQuery = undefined;
        this.brigadaFromQuery = undefined;

        // ojo: si no viene oficina, queda editable (solo cuando el form esté visible)
        this.formVacante.get('oficina')?.enable({ emitEvent: false });
        this.lockedOffice = undefined;

        this.refreshSteps();
        this.cdr.markForCheck();
        return;
      }

      const norm = this.normalizeOffice(raw);
      const mapOffice = new Map(this.oficinas.map((o) => [this.normalizeOffice(o), o]));
      const match = mapOffice.get(norm);

      if (match) {
        this.officeFromQuery = match;
        this.lockedOffice = match;

        // ✅ SIEMPRE set + disable
        this.formVacante.get('oficina')?.setValue(match, { emitEvent: false });
        this.formVacante.get('oficina')?.disable({ emitEvent: false });

        if (match === 'BRIGADA') {
          this.brigadaFromQuery = brigada || undefined;
          if (brigada) {
            this.formVacante.get('brigadaDe')?.setValue(brigada, { emitEvent: false });
          }
        } else {
          this.brigadaFromQuery = undefined;
          this.formVacante.get('brigadaDe')?.setValue('', { emitEvent: false });
        }
      }

      this.refreshSteps();
      this.cdr.markForCheck();
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
