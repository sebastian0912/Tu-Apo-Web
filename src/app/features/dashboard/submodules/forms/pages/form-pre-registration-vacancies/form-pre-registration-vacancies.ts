import { ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { SharedModule } from '../../../../../../shared/shared-module';
import { FormArray, FormBuilder, FormControl, FormGroup, FormsModule, ValidatorFn, Validators } from '@angular/forms';
import { DateAdapter, MAT_DATE_LOCALE, MAT_DATE_FORMATS } from '@angular/material/core';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import Swal from 'sweetalert2';
import { CandidateS } from '../../../../../../shared/services/candidate-s/candidate-s';
import { firstValueFrom, map, Observable, startWith } from 'rxjs';
import { LoginS } from '../../../../../auth/service/login-s';
import { MatDividerModule } from '@angular/material/divider';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { StepperSelectionEvent } from '@angular/cdk/stepper';
import { RegistroProcesoContratacion } from '../../services/registro-proceso-contratacion/registro-proceso-contratacion';
import colombia from '../../../../../../data/colombia.json';
import { MatStepperModule, MatStepper } from '@angular/material/stepper';
import { MatProgressBarModule } from '@angular/material/progress-bar';

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
  imports: [
    SharedModule,
    FormsModule,
    MatDividerModule,
    MatAutocompleteModule,
    MatStepperModule,
    MatProgressBarModule,
  ],
  templateUrl: './form-pre-registration-vacancies.html',
  styleUrl: './form-pre-registration-vacancies.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'es-CO' },
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },
  ],
})
export class FormPreRegistrationVacancies implements OnInit {
  formVacante!: FormGroup;
  isSubmitting = false;
  lockedOffice?: string;

  // Progreso del stepper
  currentStepIndex = 0;
  totalSteps = 7;
  hidePassword = true;

  // Step controls (para [stepControl] en el stepper lineal)
  step1Ctrl = new FormGroup({});
  step2Ctrl = new FormGroup({});
  step3Ctrl = new FormGroup({});
  step4Ctrl = new FormGroup({});
  step5Ctrl = new FormGroup({});
  step6Ctrl = new FormGroup({}); // Historial laboral

  // Control “otro experiencia”
  emailUserPattern = '^[^@\\s]+$';
  otroExperienciaControl = new FormControl('', [Validators.maxLength(64)]);

  // Autocomplete ciudades
  allCities: string[] = [];
  filteredCities$!: Observable<string[]>;
  filteredCitiesNacimiento$!: Observable<string[]>;

  readonly SEED_EXP_COUNT = 3;

  dominiosValidos: string[] = [
    'gmail.com', 'hotmail.com', 'yahoo.com', 'icloud.com', 'outlook.com',
    'outlook.es', 'mail.com', 'yahoo.com.co', 'unicartagena.edu.co',
    'cun.edu.co', 'misena.edu.co', 'uniguajira.edu.co', 'unillanos.edu.co',
    'ucundinamarca.edu.co', 'uncundinamarca.edu.co', 'usantotomas.edu.co',
    'unal.edu.co', 'unicauca.edu.co', 'unimilitar.edu.co', 'hotmail.com.co',
    'hotmail.com.ar', 'lasvillas.email', 'yahoo.es'
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
    { codigo: 'UL', descripcion: 'UL (Unión Libre) ' },
    { codigo: 'CA', descripcion: 'CA (Casado)' },
    { codigo: 'SE', descripcion: 'SE (Separado)' },
    { codigo: 'VI', descripcion: 'VI (Viudo)' },
  ];

  meses = Array.from({ length: 11 }, (_, i) => i + 1);  // 1..11
  anios = Array.from({ length: 80 }, (_, i) => i + 1);  // 1..80

  tipoDocs: any[] = [
    { abbreviation: 'CC', description: 'Cédula de Ciudadanía (CC)' },
    { abbreviation: 'PPT', description: 'Permiso de permanencia temporal (PPT)' },
    { abbreviation: 'CE', description: 'Cédula de Extranjería (CE)' },
  ];

  sexos: any[] = ['M', 'F'];

  oficinas: string[] = [
    'VIRTUAL', 'ADMINISTRATIVOS', 'CARTAGENITA', 'FACA_PRIMERA', 'FACA_PRINCIPAL', 'FONTIBÓN',
    'FORANEOS', 'FUNZA', 'MADRID', 'ROSAL', 'SOACHA', 'SUBA',
    'TOCANCIPÁ', 'ZIPAQUIRÁ', 'BRIGADA'
  ];

  listaPosiblesRespuestasConquienVive: any[] = [
    'AMIGOS', 'ABUELO', 'ABUELA', 'PAREJA', 'PAPÁ', 'MAMÁ', 'HERMANO', 'HERMANA',
    'TÍO', 'TÍA', 'PRIMO', 'PRIMA', 'SOBRINO', 'SOBRINA', 'SOLO'
  ];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private candidateService: RegistroProcesoContratacion,
    private authService: LoginS,
    private router: Router,
    private dateAdapter: DateAdapter<Date>,
    private route: ActivatedRoute,
  ) {
    this.dateAdapter.setLocale('es-CO');

    this.formVacante = this.fb.group({
      // Paso 1: Identificación (Candidato + InfoCcCandidato) + oficina (Entrevista)
      oficina: ['', Validators.required], // habilitada por defecto; se deshabilita si viene por query
      tipo_doc: ['', Validators.required],
      numero_documento: [
        '',
        [Validators.required, Validators.pattern(/^\d+$/), Validators.minLength(6), Validators.maxLength(15)]
      ],
      fecha_expedicion: ['', Validators.required],
      mpio_expedicion: ['', Validators.required],

      // Paso 2: Datos personales (Candidato) + nacimiento (InfoCcCandidato)
      primer_apellido: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(30)]],
      segundo_apellido: ['', [Validators.maxLength(30)]],
      primer_nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(30)]],
      segundo_nombre: ['', [Validators.maxLength(30)]],
      fecha_nacimiento: ['', Validators.required],
      mpio_nacimiento: ['', Validators.required],
      sexo: ['', Validators.required],
      estado_civil: ['', Validators.required],

      // Paso 3: Contacto y domicilio (ContactoCandidato + ResidenciaCandidato + ViviendaCandidato)
      barrio: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(40)]],
      celular: ['', [Validators.required, Validators.pattern(/^3\d{9}$/)]],
      whatsapp: ['', [Validators.required, Validators.pattern(/^3\d{9}$/), Validators.maxLength(10)]],
      personas_con_quien_convive: [[], Validators.required], // array → string en submit
      hace_cuanto_vive: ['', Validators.required],

      // Correo (en BD va como ContactoCandidato.email; lo armas antes de enviar)
      correo_usuario: ['', [Validators.required, Validators.pattern(this.emailUserPattern)]],
      correo_dominio: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(32)]],

      // Paso 4: Información familiar (solo UI)
      tieneHijos: [null, Validators.required], // UI-only (no va a BD)
      cuidadorHijos: [''],                     // UI-only → vivienda.responsable_hijos (vía servicio)
      numeroHijos: [0],                        // UI-only
      hijos: this.fb.array([]),

      // Paso 5: Formación + experiencia (FormacionCandidato + ExperienciaResumen + Entrevista)
      nivel: [null, Validators.required],
      estudiaActualmente: [null, Validators.required], // UI-only
      proyeccion1Ano: ['', Validators.required],       // → Entrevista.como_se_proyecta

      // Experiencia en flores → ExperienciaResumen
      experienciaFlores: ['', Validators.required],    // 'Sí'/'No' → bool
      tipoExperienciaFlores: [''],                     // CULTIVO/POSCOSECHA/AMBAS/OTROS
      otroExperiencia: this.otroExperienciaControl,

      // Paso 6: Historial laboral (ExperienciaLaboral — N)
      experiencias: this.fb.array([]),

      // Auxiliar de BRIGADA (para armar oficina final)
      brigadaDe: [''],
    });

    // Reglas condicionales: hijos
    this.formVacante.get('tieneHijos')?.valueChanges.subscribe((tiene: boolean) => {
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
      cuidador?.updateValueAndValidity();
      num?.updateValueAndValidity();
    });

    // Ajustar cantidad de hijos cuando cambia el número
    this.formVacante.get('numeroHijos')?.valueChanges.subscribe((n: number) => {
      const parsed = Number(n) || 0;
      this.setHijosCount(parsed);
    });
  }

  ngOnInit(): void {
    this.hydrateOfficeFromQuery();
    this.loadCities();
    this.setupAutocomplete();
    this.setupAutocompleteNacimiento();
    this.seedExperiencias();

    // “Tipo de experiencia” depende de experienciaFlores y de OTROS
    this.formVacante.get('experienciaFlores')?.valueChanges.subscribe(val => {
      const tipoCtrl = this.formVacante.get('tipoExperienciaFlores');
      if (val !== 'Sí') {
        tipoCtrl?.setValue('');
        tipoCtrl?.clearValidators();
        tipoCtrl?.updateValueAndValidity();

        this.otroExperienciaControl.setValue('');
        this.otroExperienciaControl.clearValidators();
        this.otroExperienciaControl.updateValueAndValidity();
      } else {
        tipoCtrl?.setValidators([Validators.required]);
        tipoCtrl?.updateValueAndValidity();
      }
      this.refreshSteps();
    });

    this.formVacante.get('tipoExperienciaFlores')?.valueChanges.subscribe(value => {
      if (value === 'OTROS') {
        this.otroExperienciaControl.setValidators([Validators.required, Validators.maxLength(64)]);
      } else {
        this.otroExperienciaControl.setValue('');
        this.otroExperienciaControl.clearValidators();
      }
      this.otroExperienciaControl.updateValueAndValidity();
      this.refreshSteps();
    });

    // === Validadores de pasos (stepper lineal) ===

    // Paso 1: Identificación
    this.step1Ctrl.setValidators(this.makeValidator([
      'oficina', 'tipo_doc', 'numero_documento', 'fecha_expedicion', 'mpio_expedicion'
    ]));

    // Paso 2: Datos personales
    this.step2Ctrl.setValidators(this.makeValidator([
      'primer_apellido', 'primer_nombre', 'fecha_nacimiento', 'mpio_nacimiento', 'sexo', 'estado_civil'
    ]));

    // Paso 3: Contacto y correo
    this.step3Ctrl.setValidators(this.makeValidator([
      'barrio', 'celular', 'whatsapp', 'personas_con_quien_convive', 'hace_cuanto_vive', 'correo_usuario', 'correo_dominio', 'password'
    ]));

    // Paso 4: Información familiar (condicional)
    this.step4Ctrl.setValidators(this.makeValidator(['tieneHijos'], () => {
      const tiene = this.formVacante.get('tieneHijos')?.value === true;
      if (!tiene) return true;
      const baseOk = this.areValid(['cuidadorHijos', 'numeroHijos']);
      return baseOk && this.hijosFA.valid;
    }));

    // Paso 5: Educación + Experiencia en flores (condicional)
    this.step5Ctrl.setValidators(this.makeValidator(
      ['nivel', 'estudiaActualmente', 'proyeccion1Ano', 'experienciaFlores'],
      () => {
        const exp = this.formVacante.get('experienciaFlores')?.value === 'Sí';
        if (!exp) return true;
        if (!this.areValid(['tipoExperienciaFlores'])) return false;
        const tipo = this.formVacante.get('tipoExperienciaFlores')?.value;
        if (tipo === 'OTROS') return this.otroExperienciaControl.valid;
        return true;
      }
    ));

    // Paso 6: Historial laboral
    this.step6Ctrl.setValidators(() => (this.experienciasFA.valid ? null : { stepInvalid: true }));

    // Recalcular validez de pasos ante cualquier cambio del formulario
    this.formVacante.statusChanges.subscribe(() => this.refreshSteps());
    this.refreshSteps();
  }

  // Stepper refs para progreso + scroll de headers
  @ViewChild('stepper') stepperRef?: MatStepper;
  @ViewChild('stepperHost') stepperHost!: ElementRef<HTMLDivElement>;

  ngAfterViewInit(): void {
    queueMicrotask(() => {
      if (!this.stepperRef) return;
      this.currentStepIndex = this.stepperRef.selectedIndex ?? 0;
      this.totalSteps = (this.stepperRef.steps?.length as number) || this.totalSteps;
    });
  }

  onStepChange(e: StepperSelectionEvent) {
    this.currentStepIndex = e.selectedIndex;
    const host = this.stepperHost?.nativeElement;
    if (!host) return;
    const headers = host.querySelectorAll<HTMLElement>('.mat-step-header');
    const target = headers?.[e.selectedIndex];
    target?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
  }

  scrollHeaders(direction: 1 | -1) {
    const ctn = this.stepperHost?.nativeElement
      .querySelector<HTMLElement>('.mat-horizontal-stepper-header-container');
    if (!ctn) return;
    const delta = Math.round(ctn.clientWidth * 0.85) * direction;
    ctn.scrollBy({ left: delta, behavior: 'smooth' });
  }

  // ===== Autocomplete ciudades
  private loadCities(): void {
    const list = colombia as Array<{ id: number; departamento: string; ciudades: string[] }>;
    const set = new Set<string>();
    list.forEach(d => d.ciudades?.forEach(c => set.add(c)));
    this.allCities = Array.from(set).sort((a, b) =>
      a.localeCompare(b, 'es', { sensitivity: 'base' })
    );
  }

  get municipioCtrl() { return this.formVacante.get('mpio_expedicion')!; }
  get lugarNacimientoCtrl() { return this.formVacante.get('mpio_nacimiento')!; }

  private setupAutocomplete(): void {
    this.filteredCities$ = this.municipioCtrl.valueChanges.pipe(
      startWith(this.municipioCtrl.value || ''),
      map(value => this.filterCities(String(value ?? '')))
    );
  }

  private setupAutocompleteNacimiento(): void {
    this.filteredCitiesNacimiento$ = this.lugarNacimientoCtrl.valueChanges.pipe(
      startWith(this.lugarNacimientoCtrl.value || ''),
      map(value => this.filterCities(String(value ?? '')))
    );
  }

  private filterCities(value: string): string[] {
    const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
    const q = norm(value);
    if (!q) return this.allCities.slice(0, 50);
    return this.allCities.filter(c => norm(c).includes(q)).slice(0, 50);
  }

  onMunicipioSelected(event: MatAutocompleteSelectedEvent): void {
    this.municipioCtrl.setValue(event.option.value);
  }
  onLugarNacimientoSelected(event: MatAutocompleteSelectedEvent): void {
    this.lugarNacimientoCtrl.setValue(event.option.value);
  }

  // ===== Hijos
  get hijosFA(): FormArray {
    return this.formVacante.get('hijos') as FormArray;
  }

  private buildHijoGroup(): FormGroup {
    return this.fb.group({
      numero_de_documento: [
        '',
        [Validators.pattern(/^\d+$/), Validators.minLength(6), Validators.maxLength(15)]
      ],
      fecha_nac: [null, [Validators.required]],
    });
  }

  private setHijosCount(n: number): void {
    const fa = this.hijosFA;
    while (fa.length < n) fa.push(this.buildHijoGroup());
    while (fa.length > n) fa.removeAt(fa.length - 1);
    this.refreshSteps();
  }

  // ===== Experiencias
  get experienciasFA(): FormArray {
    return this.formVacante.get('experiencias') as FormArray;
  }

  addExperiencia(): void {
    this.experienciasFA.push(this.buildExperienciaGroup(true)); // requeridas
    this.refreshSteps();
  }

  removeExperiencia(i: number): void {
    if (i < this.SEED_EXP_COUNT) return; // no borrar las 3 primeras “semilla”
    this.experienciasFA.removeAt(i);
    this.refreshSteps();
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
    while (fa.length < n) fa.push(this.buildExperienciaGroup(false)); // opcionales
  }

  // Utilidades para validación de pasos
  private areValid(keys: string[]): boolean {
    return keys.every(k => {
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

  /** Normaliza el número de documento (solo dígitos) y añade 'X' al INICIO si el tipo NO es CC */
  private normalizeDocForSubmit(tipo: string, raw: any): string {
    const digits = String(raw ?? '').replace(/\D+/g, '').trim();
    if (!digits) return digits;
    return tipo === 'CC' ? digits : `X${digits}`;
  }

  private isAlreadyRegisteredError(err: any): boolean {
    const p = err?.error ?? err;
    const docMsg = Array.isArray(p?.numero_de_documento) ? p.numero_de_documento.join(" ") : "";
    const mailMsg = Array.isArray(p?.correo_electronico) ? p.correo_electronico.join(" ") : "";
    return /ya registrado/i.test(docMsg) || /ya registrado/i.test(mailMsg) || err?.status === 409;
  }

  async onSubmit() {
    if (this.isSubmitting) return;

    if (this.formVacante.invalid) {
      this.formVacante.markAllAsTouched();
      await Swal.fire('Error', 'Por favor complete todos los campos requeridos.', 'error');
      return;
    }

    this.isSubmitting = true;
    try {
      // incluye deshabilitados (p.ej. oficina fijada por QR)
      const formValue: any = { ...this.formVacante.getRawValue() };

      // (A) Correo → username
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

      // (B) Oficina BRIGADA (si aplica)
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
        formValue.numero_documento
      );

      // (E) Personas con quien convive: array → string
      if (Array.isArray(formValue.personas_con_quien_convive)) {
        formValue.personas_con_quien_convive = formValue.personas_con_quien_convive
          .filter((x: any) => !!x)
          .join(', ');
      }

      // (F) “¿Cómo se proyecta?” → Entrevista.como_se_proyecta
      formValue.como_se_proyecta = formValue.proyeccion1Ano;
      delete formValue.proyeccion1Ano;

      // (G) Experiencia en flores → ExperienciaResumen
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
        const hasOtherData = Object.keys(exp).some(k =>
          k !== 'empresa' && String(exp[k] || '').trim().length > 0
        );
        return hasEmpresa || hasOtherData;
      });

      // (H) HIJOS → normalizar
      formValue.hijos = this.hijosFA.controls
        .map(c => {
          const nd = String(c.get('numero_de_documento')?.value ?? '').replace(/\D+/g, '');
          const fn = c.get('fecha_nac')?.value;
          return {
            numero_de_documento: nd || undefined,
            fecha_nac: normDate(fn),
          };
        })
        .filter(h => !!h.fecha_nac);

      // =========================
      // 1) Registrar usuario
      // =========================
      let registerAlreadyExists = false;
      try {
        const dto = await this.authService.buildRegisterDto(formValue);
        await this.authService.register(dto);  // POST a /gestion_admin/auth/register/
      } catch (e: any) {
        registerAlreadyExists = this.isAlreadyRegisteredError(e);
        // No bloquea el flujo. Si NO es “ya registrado”, puedes mostrar un aviso suave:
        if (!registerAlreadyExists) {
          console.warn('Fallo de registro no esperado:', e);
        }
      }

      // =========================
      // 2) Normalizar strings (MAYÚSCULAS excepto correo/username/password)
      // =========================
      Object.keys(formValue).forEach(key => {
        const isString = typeof formValue[key] === 'string';
        if (!isString) return;
        if (['correo_electronico', 'username', 'password'].includes(key)) return;
        formValue[key] = formValue[key].toUpperCase();
      });

      // Limpieza de campos de UI
      delete formValue.tieneHijos;
      delete formValue.numeroHijos;
      delete formValue.estudiaActualmente;

      // =========================
      // 3) Guardar candidato y mostrar TURNOS
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
            confirmButtonText: 'Entendido'
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
          `
          });
        }

        // this.router.navigate(['/siguiente-paso']);

      } catch (error: any) {
        // Compat 409 (backend antiguo devuelve turnos dentro del error)
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
            html: t ? `
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
          ` : (payload?.detail || `Ya existe un registro reciente para la cédula ${numero} en ${oficina}.`),
            confirmButtonText: 'Entendido'
          });
          return;
        }

        await Swal.fire({
          icon: 'error',
          title: 'Error',
          text: payload?.detail || 'No se pudo guardar la información personal.'
        });
      }

    } finally {
      this.isSubmitting = false;
    }
  }

  // Utilidad de errores backend agrupados (si lo usas)
  processErrors(errors: any): string {
    const msgs: string[] = [];
    if (errors?.correo_electronico) msgs.push('Ya existe un usuario con este correo electrónico.');
    if (errors?.numero_documento) msgs.push('Ya existe un usuario con este número de documento.');
    return msgs.join('\n');
  }

  // Helpers opcionales
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

  // 2) al hidratar la oficina desde la URL, vuelve a evaluar el step
  private hydrateOfficeFromQuery() {
    this.route.queryParamMap.subscribe(params => {
      const raw = (params.get('oficina') || params.get('o') || '').trim();

      if (!raw) {
        this.formVacante.get('oficina')?.enable({ emitEvent: false });
        this.lockedOffice = undefined;
        this.refreshSteps();                // <--- fuerza recálculo
        return;
      }

      const norm = this.normalizeOffice(raw);
      const map = new Map(this.oficinas.map(o => [this.normalizeOffice(o), o]));
      const match = map.get(norm);

      if (match) {
        this.formVacante.get('oficina')?.setValue(match);
        this.formVacante.get('oficina')?.disable({ emitEvent: false });
        this.lockedOffice = match;
      }

      if (match === 'BRIGADA') {
        const brigada = params.get('brigada');
        if (brigada) this.formVacante.get('brigadaDe')?.setValue(brigada);
      }

      this.refreshSteps();                  // <--- fuerza recálculo
    });
  }

  private normalizeOffice(s: string): string {
    return s
      .normalize('NFD').replace(/\p{Diacritic}/gu, '') // sin acentos
      .replace(/[\s-]+/g, '_')                         // espacios/guiones a _
      .toUpperCase();
  }
}
