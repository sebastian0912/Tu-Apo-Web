import { Component, OnInit } from '@angular/core';
import { SharedModule } from '../../../../../../shared/shared-module';
import { FormArray, FormBuilder, FormControl, FormGroup, FormsModule, Validators } from '@angular/forms';
import { DateAdapter, MAT_DATE_LOCALE, MAT_DATE_FORMATS } from '@angular/material/core';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import Swal from 'sweetalert2';
import { CandidateS } from '../../../../../../shared/services/candidate-s/candidate-s';
import { firstValueFrom } from 'rxjs';
import { LoginS } from '../../../../../auth/service/login-s';

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
    FormsModule
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

  dominiosValidos: string[] = [
    'GMAIL.COM', 'HOTMAIL.COM', 'YAHOO.COM', 'ICLOUD.COM', 'OUTLOOK.COM',
    'OUTLOOK.ES', 'MAIL.COM', 'YAHOO.COM.CO', 'UNICARTAGENA.EDU.CO',
    'CUN.EDU.CO', 'MISENA.EDU.CO', 'UNIGUAJIRA.EDU.CO', 'UNILLANOS.EDU.CO',
    'UCUNDINAMARCA.EDU.CO', 'UNCUNDINAMARCA.EDU.CO', 'USANTOTOMAS.EDU.CO',
    'UNAL.EDU.CO', 'UNICAUCA.EDU.CO', 'UNIMILITAR.EDU.CO', 'HOTMAIL.COM.CO',
    'HOTMAIL.COM.AR', 'LASVILLAS.EMAIL', 'YAHOO.ES'
  ];

  constructor(
    private fb: FormBuilder,
    private candidateService: CandidateS,
    private authService: LoginS,
  ) {


    this.formVacante = this.fb.group({
      comoSeEntero: ['', Validators.required],
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
      fechaExpedicion: ['', Validators.required],
      barrio: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(40)
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
    });

    this.formVacante.addControl('otroExperiencia', this.otroExperienciaControl);
  }

  ngOnInit(): void {
    // Si seleccionan OTROS, que el campo sea obligatorio, si no, lo limpia
    this.formVacante.get('tipoExperienciaFlores')?.valueChanges.subscribe(value => {
      if (value === 'OTROS') {
        this.otroExperienciaControl.setValidators([Validators.required, Validators.maxLength(64)]);
      } else {
        this.otroExperienciaControl.setValue('');
        this.otroExperienciaControl.clearValidators();
      }
      this.otroExperienciaControl.updateValueAndValidity();
    });
  }


  opcionesPromocion: string[] = [
    "RED SOCIAL (FACEBOOK, INSTAGRAM, TIKTOK)",
    "YA HABÍA TRABAJADO CON NOSOTROS",
    "REFERENCIADO POR ALGUIEN QUE YA TRABAJA/O EN LA TEMPORAL",
    "PERIFONEO (CARRO, MOTO)",
    "VOLANTES (A PIE)",
    "CONVOCATORIA EXTERNA (MUNICIPIO, LOCALIDAD, BARRIO)",
    "PUNTO FÍSICO DIRECTO (PREGUNTÓ EN LA OFICINA TEMPORAL)",
    "CONVOCATORIA EXTERNA (MUNICIPIO, LOCALIDAD, BARRIO)",
    "CHAT SERVICIO AL CLIENTE (WHATSAPP, REDES SOCIALES)",
  ];

  // Arreglo para el tipo de cedula
  tipoDocs: any[] = [
    { abbreviation: 'CC', description: 'Cédula de Ciudadanía (CC)' },
    { abbreviation: 'PPT', description: 'Permiso de permanencia temporal (PPT)' },
    { abbreviation: 'CE', description: 'Cédula de Extranjería (CE)' },
  ];

  generos: any[] = ['M', 'F'];

  oficinas: string[] = [
    'VIRTUAL','CARTAGENITA', 'FACA_PRIMERA', 'FACA_PRINCIPAL', 'FONTIBÓN',
    'FORANEOS', 'FUNZA', 'MADRID', 'ROSAL', 'SOACHA', 'SUBA',
    'TOCANCIPÁ', 'ZIPAQUIRÁ', 'BRIGADA'
  ];

  async onSubmit() {
    if (this.formVacante.invalid) {
      this.formVacante.markAllAsTouched();
      return;
    }

    const formValue = { ...this.formVacante.value };

    // Validar que el usuario del correo NO tenga arroba ni dominio
    if (/@|\s/.test(formValue.correo_usuario)) {
      Swal.fire('Error', 'El usuario del correo no debe incluir el símbolo @ ni espacios ni el dominio.', 'error');
      return;
    }
    if (!formValue.correo_dominio) {
      Swal.fire('Error', 'Debe seleccionar un dominio para el correo.', 'error');
      return;
    }

    // Armar el correo completo
    // Al enviar:
    formValue.correo_electronico = `${formValue.correo_usuario}@${formValue.correo_dominio}`;
    // O si en el select ya agregas el @, no agregues aquí
    delete formValue.correo_usuario;
    delete formValue.correo_dominio;

    // Combina oficina solo si aplica
    if (formValue.oficina === 'BRIGADA' && formValue.brigadaDe) {
      formValue.oficina = `BRIGADA DE ${formValue.brigadaDe.toUpperCase()}`;
    }
    delete formValue.brigadaDe;

    // Fechas a ISO YYYY-MM-DD
    if (formValue.fechaNacimiento instanceof Date) {
      formValue.fechaNacimiento = formValue.fechaNacimiento.toISOString().slice(0, 10);
    }
    if (formValue.fechaExpedicion instanceof Date) {
      formValue.fechaExpedicion = formValue.fechaExpedicion.toISOString().slice(0, 10);
    }

    formValue.username = formValue.correo_electronico;
    formValue.password = formValue.numero_de_documento;
    formValue.primer_apellido = formValue.primerApellido;
    formValue.primer_nombre = formValue.primerNombre;

    // 🔹 Si seleccionó OTROS y escribió algo, lo pones en tipoExperienciaFlores
    if (
      formValue.experienciaFlores === 'Sí' &&
      formValue.tipoExperienciaFlores === 'OTROS' &&
      this.otroExperienciaControl.value
    ) {
      formValue.tipoExperienciaFlores = this.otroExperienciaControl.value.trim();
    }

    let showWarning = false;
    let warningMsg = '';

    // 1. Guardar info personal primero. Si existe registro reciente, no seguir.
    try {
      await firstValueFrom(this.candidateService.guardarInfoPersonal(formValue));
    } catch (error: any) {
      const errDetail = error?.error?.detail;
      if (typeof errDetail === 'string' && errDetail.includes('Ya existe un registro para este número en la última media hora')) {
        Swal.fire({
          icon: 'warning',
          title: 'Registro reciente',
          text: 'Ya registraste tus datos el dia de hoy. Intenta mañana.',
        });
        return;
      }
      // Otro error desconocido
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errDetail || 'No se pudo guardar la información personal.',
      });
      return;
    }

    // 2. Si la info personal fue guardada, intentamos el registro de usuario
    try {
      const response = await this.authService.register(formValue);
      console.log('Registro exitoso:', response);
      if (response) {
        Object.keys(formValue).forEach(key => {
          if (typeof formValue[key] === 'string') {
            formValue[key] = formValue[key].toUpperCase();
          }
        });
        console.log('Form Value:', formValue);

        await firstValueFrom(this.candidateService.crearActualizarCandidato(formValue));
        Swal.fire({
          icon: 'success',
          title: 'Registro Exitoso',
          text: 'Tu cuenta ha sido creada correctamente',
          confirmButtonText: 'Aceptar'
        }).then((result) => {
          if (result.isConfirmed) {
            this.formVacante.reset(); // Aquí resetea tu form reactivo
          }
        });

        return;
      }
    } catch (error: any) {
      const errors = error?.error || {};

      // Procesar arrays y los textos reales
      const emailExists =
        Array.isArray(errors.correo_electronico) &&
        errors.correo_electronico.some((msg: string) =>
          msg.toLowerCase().includes('correo electronico already exists')
        );

      const docExists =
        Array.isArray(errors.numero_de_documento) &&
        errors.numero_de_documento.some((msg: string) =>
          msg.toLowerCase().includes('numero de documento already exists')
        );

      // Solo debe haber estas keys (username la ignoramos porque depende del correo)
      const keys = Object.keys(errors).filter(k => k !== 'username');
      const onlyAllowedErrors = (
        (keys.length === 1 && (emailExists || docExists)) ||
        (keys.length === 2 && emailExists && docExists)
      );

      if (onlyAllowedErrors) {
        // Warning, pero sigue con el flujo
        showWarning = true;
        warningMsg = [
          emailExists ? 'Ya existe un usuario con este correo electrónico.' : '',
          docExists ? 'Ya existe un usuario con este número de documento.' : ''
        ].filter(Boolean).join('\n');
        // No retornes aquí, sigue el flujo!
      } else {
        // Otro error diferente
        Swal.fire({
          icon: 'error',
          title: 'Error en el Registro',
          text: this.processErrors(errors) || 'Hubo un problema al intentar crear la cuenta.',
        });
        return;
      }
    }

    // Si llegas aquí, es warning, así que guarda el candidato igual
    await firstValueFrom(this.candidateService.crearActualizarCandidato(formValue));

    if (showWarning) {
      Swal.fire({
        icon: 'warning',
        title: 'Usuario ya existe',
        text: warningMsg + '\nSin embargo, tu información personal ha sido guardada.',
      });
    } else {
      Swal.fire({
        icon: 'success',
        title: 'Registro Exitoso',
        text: 'Tu cuenta ha sido creada correctamente',
      });
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
