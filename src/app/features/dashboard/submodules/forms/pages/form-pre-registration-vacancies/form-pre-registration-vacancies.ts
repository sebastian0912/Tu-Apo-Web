import { Component, OnInit } from '@angular/core';
import { SharedModule } from '../../../../../../shared/shared-module';
import { FormArray, FormBuilder, FormControl, FormGroup, FormsModule, Validators } from '@angular/forms';
import { DateAdapter, MAT_DATE_LOCALE, MAT_DATE_FORMATS } from '@angular/material/core';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import Swal from 'sweetalert2';
import { CandidateS } from '../../../../../../shared/services/candidate-s/candidate-s';
import { firstValueFrom, map, Observable, startWith } from 'rxjs';
import { LoginS } from '../../../../../auth/service/login-s';
import { MatDividerModule } from '@angular/material/divider';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { HttpClient } from '@angular/common/http';

export const MY_DATE_FORMATS = {
  parse: {
    dateInput: 'D/M/YYYY',
  },
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
    MatAutocompleteModule
  ],
  templateUrl: './form-pre-registration-vacancies.html',
  styleUrl: './form-pre-registration-vacancies.css',
  providers: [
    { provide: DateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE] },
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },
    { provide: MAT_DATE_LOCALE, useValue: 'es-CO' }, // o 'es'
  ]
})
export class FormPreRegistrationVacancies implements OnInit {
  //datosHoja: HojaDeVida = new HojaDeVida();
  formVacante!: FormGroup;
  numeroCedula!: any;
  archivos: any = [];
  mostrarCamposAdicionales: boolean = false; // Controla la visibilidad de los campos adicionales
  otroExperienciaControl = new FormControl('', [Validators.maxLength(64)]); // Control para el campo "Otro" de experiencia
  emailUserPattern = '^[^@\\s]+$'; // No admite @ ni espacios
  allCities: string[] = [];
  filteredCities$!: Observable<string[]>;
  filteredCitiesNacimiento$!: Observable<string[]>;

  dominiosValidos: string[] = [
    'GMAIL.COM', 'HOTMAIL.COM', 'YAHOO.COM', 'ICLOUD.COM', 'OUTLOOK.COM',
    'OUTLOOK.ES', 'MAIL.COM', 'YAHOO.COM.CO', 'UNICARTAGENA.EDU.CO',
    'CUN.EDU.CO', 'MISENA.EDU.CO', 'UNIGUAJIRA.EDU.CO', 'UNILLANOS.EDU.CO',
    'UCUNDINAMARCA.EDU.CO', 'UNCUNDINAMARCA.EDU.CO', 'USANTOTOMAS.EDU.CO',
    'UNAL.EDU.CO', 'UNICAUCA.EDU.CO', 'UNIMILITAR.EDU.CO', 'HOTMAIL.COM.CO',
    'HOTMAIL.COM.AR', 'LASVILLAS.EMAIL', 'YAHOO.ES'
  ];

  escolaridades = [
    {
      esco: 'EDUCACIÓN BÁSICA PRIMARIA',
      descripcion: 'EDUCACIÓN BÁSICA PRIMARIA - 1 A 5 GRADO',
    },
    {
      esco: 'EDUCACIÓN BÁSICA SECUNDARIA',
      descripcion: 'EDUCACIÓN BÁSICA SECUNDARIA - 6 A 9 GRADO',
    },
    {
      esco: 'EDUCACIÓN MEDIA ACADÉMICA',
      descripcion: 'EDUCACIÓN MEDIA ACADÉMICA - 10 A 11 GRADO',
    }
  ];

  //  Lista estado civil
  estadosCiviles: any[] = [
    {
      codigo: 'SO',
      descripcion: 'SO (Soltero)',
    },
    {
      codigo: 'UL',
      descripcion: 'UL (Unión Libre) ',
    },
    {
      codigo: 'CA',
      descripcion: 'CA (Casado)',
    },
    {
      codigo: 'SE',
      descripcion: 'SE (Separado)',
    },
    {
      codigo: 'VI',
      descripcion: 'VI (Viudo)',
    },
  ];




  // Arreglo para el tipo de cedula
  tipoDocs: any[] = [
    { abbreviation: 'CC', description: 'Cédula de Ciudadanía (CC)' },
    { abbreviation: 'PPT', description: 'Permiso de permanencia temporal (PPT)' },
    { abbreviation: 'CE', description: 'Cédula de Extranjería (CE)' },
  ];

  generos: any[] = ['M', 'F'];

  oficinas: string[] = [
    'VIRTUAL', 'ADMINISTRATIVO', 'CARTAGENITA', 'FACA_PRIMERA', 'FACA_PRINCIPAL', 'FONTIBÓN',
    'FORANEOS', 'FUNZA', 'MADRID', 'ROSAL', 'SOACHA', 'SUBA',
    'TOCANCIPÁ', 'ZIPAQUIRÁ', 'BRIGADA'
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
    'SOLO'
  ];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private candidateService: CandidateS,
    private authService: LoginS,
  ) {
    this.formVacante = this.fb.group({
      tipoDoc: ['', Validators.required],
      numero_de_documento: [
        '',
        [
          Validators.required,
          Validators.pattern(/^\d+$/),
          Validators.minLength(6),
          Validators.maxLength(15)
        ]
      ],
      primerApellido: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(30)
        ]
      ],
      segundoApellido: [
        '',
        [
          Validators.maxLength(30)
        ]
      ],
      primerNombre: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(30)
        ]
      ],
      segundoNombre: [
        '',
        [
          Validators.maxLength(30)
        ]
      ],
      fechaNacimiento: ['', Validators.required],
      lugarNacimiento: ['', Validators.required],
      fechaExpedicion: ['', Validators.required],
      municipioExpedicion: ['', Validators.required],

      barrio: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(40)
        ]
      ],
      numeroCelular: [
        '',
        [
          Validators.required,
          Validators.pattern(/^3\d{9}$/), // Celular colombiano: 10 dígitos, empieza con 3
        ]
      ],
      numeroWhatsapp: [
        '',
        [
          Validators.required,
          Validators.pattern(/^3\d{9}$/), // Celular colombiano: 10 dígitos, empieza con 3
          Validators.maxLength(10)
        ]
      ],
      genero: ['', Validators.required],
      experienciaFlores: ['', Validators.required],
      tipoExperienciaFlores: [''],
      otroExperiencia: [''],
      oficina: ['', Validators.required],
      brigadaDe: [''],
      correo_usuario: ['', [Validators.required, Validators.pattern(this.emailUserPattern)]],
      correo_dominio: ['', Validators.required],
      estadoCivil: ['', Validators.required],
      conQuienViveChecks: [[], Validators.required],
      tieneHijos: [null, Validators.required],    // boolean
      cuidadorHijos: [''],                        // requerido si tieneHijos = true
      numeroHijos: [0],                           // requerido si tieneHijos = true (>=1)
      hijos: this.fb.array([]),                   // arreglo dinámico
      tiempoResidencia: ['', Validators.required],
      proyeccion1Ano: ['', Validators.required],
      escolaridad: [null, Validators.required],
      estudiaActualmente: [null, Validators.required],
      // --- Experiencias laborales (arreglo dinámico)
      experiencias: this.fb.array([]),
    });


    // Reglas condicionales
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

    this.formVacante.addControl('otroExperiencia', this.otroExperienciaControl);
  }

  ngOnInit(): void {
    this.loadCities();
    this.setupAutocomplete();
    this.setupAutocompleteNacimiento();

    // Tipo experiencia cambia
    this.formVacante.get('tipoExperienciaFlores')?.valueChanges.subscribe(value => {
      if (value === 'OTROS') {
        this.otroExperienciaControl.setValidators([Validators.required, Validators.maxLength(64)]);
      } else {
        this.otroExperienciaControl.setValue('');
        this.otroExperienciaControl.clearValidators();
      }
      this.otroExperienciaControl.updateValueAndValidity();
    });

    // Experiencia en flores cambia
    this.formVacante.get('experienciaFlores')?.valueChanges.subscribe(val => {
      if (val !== 'Sí') {
        this.formVacante.get('tipoExperienciaFlores')?.setValue('');
        this.otroExperienciaControl.setValue('');
        this.formVacante.get('tipoExperienciaFlores')?.clearValidators();
        this.formVacante.get('tipoExperienciaFlores')?.updateValueAndValidity();
        this.otroExperienciaControl.clearValidators();
        this.otroExperienciaControl.updateValueAndValidity();
      } else {
        this.formVacante.get('tipoExperienciaFlores')?.setValidators([Validators.required]);
        this.formVacante.get('tipoExperienciaFlores')?.updateValueAndValidity();
      }
    });
  }

  get municipioCtrl() {
    return this.formVacante.get('municipioExpedicion')!;
  }

  get lugarNacimientoCtrl() {
    return this.formVacante.get('lugarNacimiento')!;
  }


  private loadCities(): void {
    // ⚠️ Ruta pública. Si aún no sirve /files/utils, mira nota al final.
    this.http
      .get<Array<{ id: number; departamento: string; ciudades: string[] }>>('files/utils/colombia.json')
      .pipe(
        map(list => {
          const set = new Set<string>();
          list.forEach(d => d.ciudades?.forEach(c => set.add(c)));
          // Orden alfabético en español, ignorando tildes/mayúsculas
          return Array.from(set).sort((a, b) =>
            a.localeCompare(b, 'es', { sensitivity: 'base' })
          );
        })
      )
      .subscribe(ciudades => this.allCities = ciudades);
  }

  private setupAutocomplete(): void {
    this.filteredCities$ = this.municipioCtrl.valueChanges.pipe(
      startWith(this.municipioCtrl.value || ''),
      map(value => this.filterCities(String(value ?? '')))
    );
  }

  // Búsqueda insensitive a tildes y mayúsculas
  private filterCities(value: string): string[] {
    const norm = (s: string) =>
      s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

    const q = norm(value);
    if (!q) return this.allCities.slice(0, 50);

    return this.allCities
      .filter(c => norm(c).includes(q))
      .slice(0, 50); // limita resultados
  }

  onMunicipioSelected(event: MatAutocompleteSelectedEvent): void {
    this.municipioCtrl.setValue(event.option.value);
  }


  private setupAutocompleteNacimiento(): void {
    this.filteredCitiesNacimiento$ = this.lugarNacimientoCtrl.valueChanges.pipe(
      startWith(this.lugarNacimientoCtrl.value || ''),
      map(value => this.filterCities(String(value ?? '')))
    );
  }

  onLugarNacimientoSelected(event: MatAutocompleteSelectedEvent): void {
    this.lugarNacimientoCtrl.setValue(event.option.value);
  }

  // ------- Hijos
  get hijosFA(): FormArray {
    return this.formVacante.get('hijos') as FormArray;
  }

  private buildHijoGroup(): FormGroup {
    return this.fb.group({
      edad: [null, [Validators.required, Validators.min(0), Validators.max(99)]],
    });
  }

  private setHijosCount(n: number): void {
    const fa = this.hijosFA;
    // Agregar
    while (fa.length < n) fa.push(this.buildHijoGroup());
    // Quitar
    while (fa.length > n) fa.removeAt(fa.length - 1);
  }

  // ------- Experiencias
  get experienciasFA(): FormArray {
    return this.formVacante.get('experiencias') as FormArray;
  }

  addExperiencia(): void {
    this.experienciasFA.push(this.fb.group({
      empresa: ['', [Validators.required, Validators.maxLength(120)]],
      labores: ['', [Validators.required, Validators.maxLength(800)]],
      tiempo: ['', [Validators.required, Validators.maxLength(80)]],  // p.ej. "8 meses", "2 años"
      labores_principales: ['', [Validators.required, Validators.maxLength(800)]],
    }));
  }

  removeExperiencia(i: number): void {
    this.experienciasFA.removeAt(i);
  }


  // En tu componente:
  // En tu componente
  isSubmitting = false;

  async onSubmit() {
    // Evita doble envío
    if (this.isSubmitting) return;

    if (this.formVacante.invalid) {
      this.formVacante.markAllAsTouched();
      Swal.fire('Error', 'Por favor complete todos los campos requeridos.', 'error');

      return;
    }

    this.isSubmitting = true;

    try {
      const formValue: any = { ...this.formVacante.value };
      console.log('Formulario enviado:', formValue);

      // 1) Validaciones básicas de correo
      if (/@|\s/.test(formValue.correo_usuario)) {
        await Swal.fire('Error', 'El usuario del correo no debe incluir el símbolo @ ni espacios ni el dominio.', 'error');
        return;
      }
      if (!formValue.correo_dominio) {
        await Swal.fire('Error', 'Debe seleccionar un dominio para el correo.', 'error');
        return;
      }

      // 2) Armar el correo completo
      formValue.correo_electronico = `${formValue.correo_usuario}@${formValue.correo_dominio}`;
      delete formValue.correo_usuario;
      delete formValue.correo_dominio;

      // 3) Normalizar oficina (incluida brigada)
      const rawOficina = String(formValue.oficina || '').trim();
      if (rawOficina === 'BRIGADA' && formValue.brigadaDe) {
        formValue.oficina = `BRIGADA DE ${String(formValue.brigadaDe).toUpperCase().trim()}`;
      } else {
        formValue.oficina = rawOficina;
      }
      delete formValue.brigadaDe;

      // 4) Fechas a YYYY-MM-DD
      const normDate = (v: any) => {
        if (!v) return v;
        if (v instanceof Date) return v.toISOString().slice(0, 10);
        if (typeof v === 'string') return v.length > 10 ? v.slice(0, 10) : v;
        return v;
      };
      formValue.fechaNacimiento = normDate(formValue.fechaNacimiento);
      formValue.fechaExpedicion = normDate(formValue.fechaExpedicion);

      // 5) Usuario/clave y nombres
      formValue.username = formValue.correo_electronico;
      formValue.password = String(formValue.numero_de_documento).trim();
      formValue.primer_apellido = formValue.primerApellido;
      formValue.primer_nombre = formValue.primerNombre;

      // 6) Si experiencia = OTROS, usar el texto ingresado
      if (
        formValue.experienciaFlores === 'Sí' &&
        formValue.tipoExperienciaFlores === 'OTROS' &&
        this.otroExperienciaControl?.value
      ) {
        formValue.tipoExperienciaFlores = String(this.otroExperienciaControl.value).trim();
      }

      // -------------------------------------------------
      // 7) Guardar info personal primero (puede responder 409)
      // -------------------------------------------------
      try {
        await firstValueFrom(this.candidateService.guardarInfoPersonal(formValue));
      } catch (error: any) {
        const status = error?.status;
        const errDetail = error?.error?.detail;

        if (status === 409) {
          const numero = formValue?.numero_de_documento;
          const oficina = formValue?.oficina;
          await Swal.fire({
            icon: 'warning',
            title: 'Registro reciente',
            text: errDetail || `Ya existe un registro reciente para la cédula ${numero} en ${oficina}. Por favor espere su turno.`,
          });
          return;
        }

        await Swal.fire({
          icon: 'error',
          title: 'Error',
          text: errDetail || 'No se pudo guardar la información personal.',
        });
        return;
      }

      // -------------------------------------------------
      // 8) Intentar registro de usuario PERO ignorar errores
      // -------------------------------------------------
      try {
        const response = await this.authService.register(formValue);
        console.log('Registro usuario (ignorar errores) -> respuesta:', response);
      } catch (err) {
        // Ignorar cualquier error de register
        console.warn('register() falló, se continúa igual.', err);
      }

      // -------------------------------------------------
      // 9) Crear/actualizar candidato SIEMPRE (tras info personal)
      //    Mayúsculas en strings excepto correo y username
      // -------------------------------------------------
      Object.keys(formValue).forEach(key => {
        if (key !== 'correo_electronico' && key !== 'username' && typeof formValue[key] === 'string') {
          formValue[key] = formValue[key].toUpperCase();
        }
      });

      await firstValueFrom(this.candidateService.crearActualizarCandidato(formValue));

      await Swal.fire({
        icon: 'success',
        title: 'Registro Exitoso',
        text: 'Tu información ha sido guardada correctamente.',
      });

      this.formVacante.reset();
    } finally {
      this.isSubmitting = false;
    }
  }





  /**
 * Función para procesar los errores y excluir el del username.
 * También traduce los mensajes de error al español.
 */
  processErrors(errors: any): string {
    const errorMessages = [];

    if (errors.correo_electronico) {
      errorMessages.push('Ya existe un usuario con este correo electrónico.');
    }

    if (errors.numero_de_documento) {
      errorMessages.push('Ya existe un usuario con este número de documento.');
    }

    // Ignorar el error del username
    // Puedes agregar más campos según tus necesidades

    // Unir todos los mensajes de error en una sola cadena
    return errorMessages.join('\n');
  }





}
