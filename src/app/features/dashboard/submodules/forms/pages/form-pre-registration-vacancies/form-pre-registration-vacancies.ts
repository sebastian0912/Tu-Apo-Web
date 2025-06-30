import { Component } from '@angular/core';
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
export class FormPreRegistrationVacancies {
  //datosHoja: HojaDeVida = new HojaDeVida();
  formVacante!: FormGroup;
  numeroCedula!: any;
  archivos: any = [];
  mostrarCamposAdicionales: boolean = false; // Controla la visibilidad de los campos adicionales

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
      oficina: ['', Validators.required],
      brigadaDe: [''],
      correo_electronico: [
        '',
        [
          Validators.required,
          Validators.email
        ]
      ]
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
    'ANDES', 'BOSA', 'CARTAGENITA', 'FACA_PRIMERA', 'FACA_PRINCIPAL', 'FONTIBÓN',
    'FORANEOS', 'FUNZA', 'MADRID', 'MONTE_VERDE', 'ROSAL', 'SOACHA', 'SUBA',
    'TOCANCIPÁ', 'USME', 'ZIPAQUIRÁ', 'BRIGADA'
  ];


  async onSubmit() {
    if (this.formVacante.invalid) {
      this.formVacante.markAllAsTouched();
      return;
    }

    const formValue = { ...this.formVacante.value };

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

    let showWarning = false;
    let warningMsg = '';

    try {
      const response = await this.authService.register(formValue);
      console.log('Registro exitoso:', response);
      if (response) {

        console.log('Form Value:', formValue);
        await firstValueFrom(this.candidateService.crearActualizarCandidato(formValue));
        await firstValueFrom(this.candidateService.guardarInfoPersonal(formValue));
        Swal.fire({
          icon: 'success',
          title: 'Registro Exitoso',
          text: 'Tu cuenta ha sido creada correctamente',
        });
        return;
      }
    } catch (error: any) {
      const errors = error?.error || {};

      // --------- NUEVO: Procesar arrays y los textos reales ---------
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
    console.log('Form Value:', formValue);

    // Si llegas aquí, es warning, así que guarda la info igual
    await firstValueFrom(this.candidateService.crearActualizarCandidato(formValue));
    await firstValueFrom(this.candidateService.guardarInfoPersonal(formValue));

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
