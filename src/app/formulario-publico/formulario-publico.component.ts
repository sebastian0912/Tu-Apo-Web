import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import {
  FormsModule,
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
  FormArray,
  FormBuilder,
} from '@angular/forms';

import { CommonModule } from '@angular/common'; // Importa CommonModule
import {
  HttpClient,
  HttpClientModule,
  HttpHeaders,
} from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import {
  MatCheckboxChange,
  MatCheckboxModule,
} from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core'; // Importa MatOptionModule
import { MatInputModule } from '@angular/material/input';
import { DomSanitizer } from '@angular/platform-browser';
import { FirmaComponent } from '../firma/firma.component';
import { urlBack } from '../model/Usuario';
import Swal from 'sweetalert2';
import { PDFCheckBox, PDFDocument, PDFTextField } from 'pdf-lib';
import { ValidationErrors, ValidatorFn } from '@angular/forms';

// Importa Router
import { Router } from '@angular/router';

@Component({
  selector: 'app-formulario-publico',
  standalone: true,
  imports: [
    RouterOutlet,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatSelectModule,
    CommonModule,
    MatOptionModule,
    HttpClientModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    FirmaComponent,
  ],
  templateUrl: './formulario-publico.component.html',
  styleUrl: './formulario-publico.component.css',
})




export class FormularioPublicoComponent {
  [x: string]: any;
  //datosHoja: HojaDeVida = new HojaDeVida();
  formHojaDeVida!: FormGroup;
  formHojaDeVida2!: FormGroup;
  datos: any; // Puedes tipar esto mejor según la estructura de tu JSON
  ciudadesResidencia: string[] = [];
  ciudadesExpedicionCC: string[] = [];
  ciudadesNacimiento: string[] = [];
  // visualizaciones las capturas de la cedula
  previsualizacion: string | undefined;
  previsualizacion2: string | undefined;
  previsualizacion3: string | undefined;

  guardarObjeti: string | undefined;
  guardarObjeti2: string | undefined;
  guardarObjeti3: string | undefined;

  firma: string | undefined;
  mostrarFormulario: boolean = false;

  numeroCedula!: any;

  archivos: any = [];

  title = 'Formulario';



  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private sanitizer: DomSanitizer,
    private cdRef: ChangeDetectorRef,
    private router: Router
  ) {
    this.formHojaDeVida = new FormGroup({

      tipoDoc: new FormControl('', Validators.required),
      numeroCedula: new FormControl('', Validators.required),
      numeroCedula2: new FormControl('', Validators.required),
      pApellido: new FormControl('', Validators.required),


      sApellido: new FormControl(''),
      pNombre: new FormControl('', Validators.required),
      sNombre: new FormControl(''),


      genero: new FormControl('', Validators.required),
      correo: new FormControl('', [Validators.required, Validators.email]),
      numCelular: new FormControl('', [
        Validators.required,
        Validators.pattern(/^\d{10}$/),
      ]),

      numWha: new FormControl('', [

        Validators.pattern(/^\d{10}$/),
      ]),

      departamento: new FormControl('', Validators.required), // Cambié 'genero' por 'departamento' para que sea más descriptivo
      ciudad: new FormControl(
        { value: '', disabled: true },

      ),

      estadoCivil: new FormControl('', Validators.required),
      direccionResidencia: new FormControl('', Validators.required),

      fechaExpedicionCC: new FormControl('', Validators.required),
      departamentoExpedicionCC: new FormControl('', Validators.required),
      municipioExpedicionCC: new FormControl(
        { value: '', disabled: true },
        Validators.required
      ),
      departamentoNacimiento: new FormControl('', Validators.required),
      municipioNacimiento: new FormControl(
        { value: '', disabled: true },
        Validators.required
      ),

      rh: new FormControl('', Validators.required),
      lateralidad: new FormControl('', Validators.required),

      tiempoResidenciaZona: new FormControl('', Validators.required),
      lugarAnteriorResidencia: new FormControl('', Validators.required),
      razonCambioResidencia: new FormControl('', Validators.required),
      zonasConocidas: new FormControl('', Validators.required),
      preferenciaResidencia: new FormControl('', Validators.required),
      fechaNacimiento: new FormControl('', Validators.required),

      familiarEmergencia: new FormControl('', Validators.required),
      parentescoFamiliarEmergencia: new FormControl('', Validators.required),
      direccionFamiliarEmergencia: new FormControl('', Validators.required),

      barrioFamiliarEmergencia: new FormControl('', Validators.required),
      telefonoFamiliarEmergencia: new FormControl('', [
        Validators.required,
        Validators.pattern(/^\d+$/),
      ]),
      ocupacionFamiliar_Emergencia: new FormControl('', Validators.required),


      estudiaActualmente: new FormControl('', Validators.required),


      cedulaFrontal: new FormControl('',),
      cedulaTrasera: new FormControl('',),
      firma: new FormControl('',),
    }), { validators: this.validar };

    // Llamada a la función para inicializar el formulario con base en el número de hijos

    this.formHojaDeVida2 = new FormGroup({      // Formulario publico segunda parte


      escolaridad: new FormControl('', Validators.required),
      estudiosExtras: new FormControl('', Validators.required),
      nombreInstitucion: new FormControl('', Validators.required),
      anoFinalizacion: new FormControl('', [
        Validators.required,
        Validators.pattern(/^\d{4}$/),
      ]),

      tituloObtenido: new FormControl('', Validators.required),



      tallaChaqueta: new FormControl('', Validators.required),
      tallaPantalon: new FormControl('', Validators.required),
      tallaCamisa: new FormControl('', Validators.required),
      tallaCalzado: new FormControl('', Validators.required),



      // conyugue
      nombresConyuge: new FormControl('',),
      apellidosConyuge: new FormControl('',),
      viveConyuge: new FormControl('',), // Podría ser un booleano o un string dependiendo de cómo quieras manejarlo

      documentoIdentidadConyuge: new FormControl('', [
        Validators.pattern(/^\d+$/),
      ]),
      direccionConyuge: new FormControl('',),
      telefonoConyuge: new FormControl('', [
        Validators.pattern(/^\d+$/),
      ]),
      barrioConyuge: new FormControl('',),
      ocupacionConyuge: new FormControl('',),
      telefonoLaboralConyuge: new FormControl('', [
        Validators.pattern(/^\d+$/),
      ]), // Asumiendo que es numérico
      direccionLaboralConyuge: new FormControl('',),

      // Padre
      nombrePadre: new FormControl('', Validators.required),
      elPadreVive: new FormControl('', Validators.required), // Podría ser un booleano o un string dependiendo de cómo quieras manejarlo
      ocupacionPadre: new FormControl(''),
      direccionPadre: new FormControl(''),
      telefonoPadre: new FormControl('', Validators.pattern(/^\d+$/)), // Asegúrate de que sea numérico
      barrioPadre: new FormControl(''),

      // Información de la Madre
      nombreMadre: new FormControl('', Validators.required),
      madreVive: new FormControl('', Validators.required),
      ocupacionMadre: new FormControl(''),
      direccionMadre: new FormControl(''),
      telefonoMadre: new FormControl('', Validators.pattern(/^\d+$/)),
      barrioMadre: new FormControl(''),

      // Referencias Personales
      nombreReferenciaPersonal1: new FormControl('', Validators.required),
      telefonoReferencia1: new FormControl('', [
        Validators.required,
        Validators.pattern(/^\d+$/),
      ]),
      ocupacionReferencia1: new FormControl('', Validators.required),
      tiempoConoceReferenciaPersonal1: new FormControl('', Validators.required),

      nombreReferenciaPersonal2: new FormControl('', Validators.required),
      telefonoReferencia2: new FormControl('', [
        Validators.required,
        Validators.pattern(/^\d+$/),
      ]),
      ocupacionReferencia2: new FormControl('', Validators.required),
      tiempoConoceReferenciaPersonal2: new FormControl('', Validators.required),

      // Referencias Familiares
      nombreReferenciaFamiliar1: new FormControl('', Validators.required),
      telefonoReferenciaFamiliar1: new FormControl('', [
        Validators.required,
        Validators.pattern(/^\d+$/),
      ]),
      ocupacionReferenciaFamiliar1: new FormControl('', Validators.required),
      parentescoReferenciaFamiliar1: new FormControl('', Validators.required),

      nombreReferenciaFamiliar2: new FormControl('', Validators.required),
      telefonoReferenciaFamiliar2: new FormControl('', [
        Validators.required,
        Validators.pattern(/^\d+$/),
      ]),
      ocupacionReferenciaFamiliar2: new FormControl('', Validators.required),
      parentescoReferenciaFamiliar2: new FormControl('', Validators.required),

      // Experiencia Laboral
      experienciaLaboral: new FormControl('', Validators.required),
      experienciaLaboralCuanto: new FormControl('',),
      areaExperiencia: new FormControl('',) ?? '',
      areaCultivoPoscosecha: new FormControl('',),
      laboresRealizadas: new FormControl('',),

      tiempoExperiencia: new FormControl('',),

      // Experiencia Laboral 1
      nombreEmpresa1: new FormControl('',),
      direccionEmpresa1: new FormControl('',),
      telefonosEmpresa1: new FormControl('', [
        Validators.pattern(/^\d+$/),
      ]),
      nombreJefe1: new FormControl('',),
      cargoTrabajador1: new FormControl('',),
      fechaRetiro1: new FormControl('',), // Considera usar un DatePicker para fechas
      motivoRetiro1: new FormControl('',),

      // Experiencia Laboral 2
      nombreEmpresa2: new FormControl(''),
      direccionEmpresa2: new FormControl(''),
      telefonosEmpresa2: new FormControl('', Validators.pattern(/^\d+$/)),
      nombreJefe2: new FormControl(''),
      cargoTrabajador2: new FormControl(''),

      fechaRetiro2: new FormControl('') ?? '',
      motivoRetiro2: new FormControl(''),

      // informacion hijos
      numHijosDependientes: new FormControl('', [
        Validators.required,
        Validators.min(0),
        Validators.max(5),
      ]),
      cuidadorHijos: new FormControl('',),
      hijos: this.fb.array([]),

      // informacion con quien vive
      conQuienViveChecks: new FormArray([]),
      familiaSolo: new FormControl('', Validators.required),

      // vivienda
      tiposViviendaChecks: new FormArray([]),
      numeroHabitaciones: new FormControl('', Validators.required),
      personasPorHabitacion: new FormControl('', Validators.required),
      tipoVivienda2: new FormControl('', Validators.required),
      caracteristicasVivienda: new FormControl('', Validators.required),
      comodidadesChecks: new FormArray([], Validators.required),
      expectativasVidaChecks: new FormArray([], Validators.required),

      fuenteVacante: new FormControl('', Validators.required),

    });

    this.escucharNumeroDeHijos();



  }

  ngOnInit(): void {
    this.cargarDatosJSON();

    try {
      this.escucharCambiosEnDepartamento();
    }
    catch (e) {
      console.log(e);
    }


    this.formHojaDeVida2
      .get('numHijosDependientes')!
      .valueChanges.subscribe((numHijos) => {
        this.actualizarEdadesHijos(numHijos);
      });





  }

  // campos numeroCedula y numeroCedula2 son los mismos
  validar() {
    if (this.formHojaDeVida.value.numeroCedula === this.formHojaDeVida2.value.numeroCedula2) {
      this.formHojaDeVida.setErrors(null);
    } else {
      this.formHojaDeVida.setErrors({ noCoincide: true });
    }
  }








  imprimirInformacion2(): void {
    // recoger numero de cedula del local storage
    const cedula = localStorage.getItem('cedula');

    // Crear un objeto con solo los datos que quieres enviar
    const datosAEnviar = {
      numeroCedula: cedula,
      escolaridad: this.formHojaDeVida2.value.escolaridad,
      estudiosExtra: this.formHojaDeVida2.value.estudiosExtras, // Corregido "Extras" a "Extra"
      nombreInstitucion: this.formHojaDeVida2.value.nombreInstitucion,
      anoFinalizacion: this.formHojaDeVida2.value.anoFinalizacion,
      tituloObtenido: this.formHojaDeVida2.value.tituloObtenido,
      chaqueta: this.formHojaDeVida2.value.tallaChaqueta, // Cambiado a "chaqueta"
      pantalon: this.formHojaDeVida2.value.tallaPantalon, // Cambiado a "pantalon"
      camisa: this.formHojaDeVida2.value.tallaCamisa, // Cambiado a "camisa"
      calzado: this.formHojaDeVida2.value.tallaCalzado, // Cambiado a "calzado"

      nombreConyugue: this.formHojaDeVida2.value.nombresConyuge, // Cambiado de "nombresConyuge" a "nombreConyugue"
      apellidoConyugue: this.formHojaDeVida2.value.apellidosConyuge, // Cambiado de "apellidosConyuge" a "apellidoConyugue"
      numDocIdentidadConyugue:
        this.formHojaDeVida2.value.documentoIdentidadConyuge ?? '', // Cambiado a "numDocIdentidadConyugue"
      viveConElConyugue: this.formHojaDeVida2.value.viveConyuge, // Cambiado de "viveConyuge" a "viveConElConyugue"
      direccionConyugue: this.formHojaDeVida2.value.direccionConyuge ?? '',
      telefonoConyugue: this.formHojaDeVida2.value.telefonoConyuge ?? '',
      barrioMunicipioConyugue: this.formHojaDeVida2.value.barrioConyuge ?? '', // Cambiado de "barrioConyuge" a "barrioMunicipioConyugue"
      ocupacionConyugue: this.formHojaDeVida2.value.ocupacionConyuge ?? '',
      telefonoLaboralConyugue:
        this.formHojaDeVida2.value.telefonoLaboralConyuge ?? '',
      direccionLaboralConyugue:
        this.formHojaDeVida2.value.direccionLaboralConyuge ?? '',

      nombrePadre: this.formHojaDeVida2.value.nombrePadre,
      vivePadre: this.formHojaDeVida2.value.elPadreVive, // Cambiado de "elPadreVive" a "vivePadre"
      ocupacionPadre: this.formHojaDeVida2.value.ocupacionPadre ?? '',
      direccionPadre: this.formHojaDeVida2.value.direccionPadre ?? '',
      telefonoPadre: this.formHojaDeVida2.value.telefonoPadre ?? '',
      barrioPadre: this.formHojaDeVida2.value.barrioPadre ?? '',
      nombreMadre: this.formHojaDeVida2.value.nombreMadre,
      viveMadre: this.formHojaDeVida2.value.madreVive, // Cambiado de "madreVive" a "viveMadre"
      ocupacionMadre: this.formHojaDeVida2.value.ocupacionMadre ?? '',
      direccionMadre: this.formHojaDeVida2.value.direccionMadre ?? '',
      telefonoMadre: this.formHojaDeVida2.value.telefonoMadre ?? '',
      barrioMadre: this.formHojaDeVida2.value.barrioMadre ?? '',

      nombreReferenciaPersonal1:
        this.formHojaDeVida2.value.nombreReferenciaPersonal1,
      telefonoReferenciaPersonal1:
        this.formHojaDeVida2.value.telefonoReferencia1, // Cambiado de "telefonoReferencia1" a "telefonoReferenciaPersonal1"
      ocupacionReferenciaPersonal1:
        this.formHojaDeVida2.value.ocupacionReferencia1, // Cambiado de "ocupacionReferencia1" a "ocupacionReferenciaPersonal1"
      tiempoConoceReferenciaPersonal1:
        this.formHojaDeVida2.value.tiempoConoceReferenciaPersonal1,

      nombreReferenciaPersonal2:
        this.formHojaDeVida2.value.nombreReferenciaPersonal2,
      telefonoReferenciaPersonal2:
        this.formHojaDeVida2.value.telefonoReferencia2, // Cambiado de "telefonoReferencia2" a "telefonoReferenciaPersonal2"
      ocupacionReferenciaPersonal2:
        this.formHojaDeVida2.value.ocupacionReferencia2, // Cambiado de "ocupacionReferencia2" a "ocupacionReferenciaPersonal2"
      tiempoConoceReferenciaPersonal2:
        this.formHojaDeVida2.value.tiempoConoceReferenciaPersonal2,

      nombreReferenciaFamiliar1:
        this.formHojaDeVida2.value.nombreReferenciaFamiliar1,
      telefonoReferenciaFamiliar1:
        this.formHojaDeVida2.value.telefonoReferenciaFamiliar1,
      ocupacionReferenciaFamiliar1:
        this.formHojaDeVida2.value.ocupacionReferenciaFamiliar1,
      parentescoReferenciaFamiliar1:
        this.formHojaDeVida2.value.parentescoReferenciaFamiliar1,

      nombreReferenciaFamiliar2:
        this.formHojaDeVida2.value.nombreReferenciaFamiliar2,
      telefonoReferenciaFamiliar2:
        this.formHojaDeVida2.value.telefonoReferenciaFamiliar2,
      ocupacionReferenciaFamiliar2:
        this.formHojaDeVida2.value.ocupacionReferenciaFamiliar2,
      parentescoReferenciaFamiliar2:
        this.formHojaDeVida2.value.parentescoReferenciaFamiliar2,

      nombreExpeLaboral1Empresa: this.formHojaDeVida2.value.nombreEmpresa1 ?? '',
      direccionEmpresa1: this.formHojaDeVida2.value.direccionEmpresa1 ?? '',
      telefonosEmpresa1: this.formHojaDeVida2.value.telefonosEmpresa1 ?? '',
      nombreJefeEmpresa1: this.formHojaDeVida2.value.nombreJefe1 ?? '',
      cargoEmpresa1: this.formHojaDeVida2.value.cargoTrabajador1 ?? '',
      fechaRetiroEmpresa1: this.formHojaDeVida2.value.fechaRetiro1 ?? '',
      motivoRetiroEmpresa1: this.formHojaDeVida2.value.motivoRetiro1 ?? '',

      nombreExpeLaboral2Empresa: this.formHojaDeVida2.value.nombreEmpresa2 ?? '',
      direccionEmpresa2: this.formHojaDeVida2.value.direccionEmpresa2 ?? '',
      telefonosEmpresa2: this.formHojaDeVida2.value.telefonosEmpresa2 ?? '',
      nombreJefeEmpresa2: this.formHojaDeVida2.value.nombreJefe2 ?? '',
      cargoEmpresa2: this.formHojaDeVida2.value.cargoTrabajador2 ?? '',
      fechaRetiroEmpresa2: this.formHojaDeVida2.value.fechaRetiro2 ?? '',
      motivoRetiroEmpresa2: this.formHojaDeVida2.value.motivoRetiro2 ?? '',

      personasConQuienConvive: this.formHojaDeVida2.value.conQuienViveChecks,
      familiaConUnSoloIngreso: this.formHojaDeVida2.value.familiaSolo,
      tipoVivienda: this.formHojaDeVida2.value.tiposViviendaChecks,
      numHabitaciones: this.formHojaDeVida2.value.numeroHabitaciones,
      numPersonasPorHabitacion: this.formHojaDeVida2.value.personasPorHabitacion,
      tipoVivienda2p: this.formHojaDeVida2.value.tipoVivienda2, // Corregido para alinear con Django
      caracteristicasVivienda:
        this.formHojaDeVida2.value.caracteristicasVivienda,
      servicios: this.formHojaDeVida2.value.comodidadesChecks,
      expectativasDeVida: this.formHojaDeVida2.value.expectativasVidaChecks,

      hijos: this.formHojaDeVida2.value.hijos,

      experienciaLaboral: this.formHojaDeVida2.value.experienciaLaboral,
      experienciaLaboralCuanto:
        this.formHojaDeVida2.value.experienciaLaboralCuanto ?? '',
      areaExperiencia: this.formHojaDeVida2.value.areaExperiencia ?? '',
      areaCultivoPoscosecha: this.formHojaDeVida2.value.areaCultivoPoscosecha ?? '',
      laboresRealizadas: this.formHojaDeVida2.value.laboresRealizadas ?? '',
      tiempoExperiencia: this.formHojaDeVida2.value.tiempoExperiencia ?? '',
      numHijosDependientes: this.formHojaDeVida2.value.numHijosDependientes ?? '',

      edadHijo1: this.formHojaDeVida2.value.edadHijo1 ?? '',
      edadHijo2: this.formHojaDeVida2.value.edadHijo2 ?? '',
      edadHijo3: this.formHojaDeVida2.value.edadHijo3 ?? '',
      edadHijo4: this.formHojaDeVida2.value.edadHijo4 ?? '',
      edadHijo5: this.formHojaDeVida2.value.edadHijo5 ?? '',
      cuidadorHijos: this.formHojaDeVida2.value.cuidadorHijos ?? '',

      fuenteVacante: this.formHojaDeVida2.value.fuenteVacante,

    };

    console.log(datosAEnviar);

    const url = `${urlBack.url}/contratacion/subirParte2`; // Asegúrate de sustituir `elEndpointEspecifico` con el path correcto
    // Realizar la petición HTTP POST
    this.http.post(url, datosAEnviar).subscribe(
      (response: any) => {
        // Imprimir solo el mensaje de respuesta
        if (response && response.message) {
          console.log(response.message);
          /* swal y que cuando le de click a aceptar lo redireccione a la pagina de inicio */
          Swal.fire({
            title: '¡Datos guardados!',
            text: 'Los datos se guardaron correctamente.',
            icon: 'success',
            confirmButtonText: 'Aceptar',
          })
            .then(() => {
              window.location.reload();
            })
            .catch((error) => {
              console.error('Error al redirigir:', error);
            });



        } else {
          console.log('No se encontró un mensaje en la respuesta.');
        }
      },
      (error) => {
        console.error(error.error.message);
      }
    );
  }

  imprimirInformacion(): void {
    // Crear un objeto con solo los datos que quieres enviar
    const datosAEnviar = {
      tipoDoc: this.formHojaDeVida.value.tipoDoc,
      numeroCedula: this.formHojaDeVida.value.numeroCedula,
      pApellido: this.formHojaDeVida.value.pApellido,
      sApellido: this.formHojaDeVida.value.sApellido,
      pNombre: this.formHojaDeVida.value.pNombre,
      sNombre: this.formHojaDeVida.value.sNombre,
      genero: this.formHojaDeVida.value.genero,
      correo: this.formHojaDeVida.value.correo,
      numCelular: this.formHojaDeVida.value.numCelular,
      numWha: this.formHojaDeVida.value.numWha,
      departamento: this.formHojaDeVida.value.departamento,
      ciudad: this.formHojaDeVida.value.ciudad ?? '',

      estadoCivil: this.formHojaDeVida.value.estadoCivil,
      direccionResidencia: this.formHojaDeVida.value.direccionResidencia,
      fechaExpedicionCc: this.formHojaDeVida.value.fechaExpedicionCC,
      departamentoExpedicionCc:
        this.formHojaDeVida.value.departamentoExpedicionCC,
      municipioExpedicionCc: this.formHojaDeVida.value.municipioExpedicionCC,
      lugarNacimientoDepartamento:
        this.formHojaDeVida.value.departamentoNacimiento,
      lugarNacimientoMunicipio: this.formHojaDeVida.value.municipioNacimiento,
      rh: this.formHojaDeVida.value.rh,
      zurdoDiestro: this.formHojaDeVida.value.lateralidad,

      tiempoResidenciaZona: this.formHojaDeVida.value.tiempoResidenciaZona,
      lugarAnteriorResidencia:
        this.formHojaDeVida.value.lugarAnteriorResidencia,
      razonCambioResidencia: this.formHojaDeVida.value.razonCambioResidencia,
      zonasConocidas: this.formHojaDeVida.value.zonasConocidas,
      preferenciaResidencia: this.formHojaDeVida.value.preferenciaResidencia,
      fechaNacimiento: this.formHojaDeVida.value.fechaNacimiento,
      estudiaActualmente:
        this.formHojaDeVida.value.estudiaActualmente.display ?? '',

      familiarEmergencia: this.formHojaDeVida.value.familiarEmergencia, // Asumiendo que falta este campo en TS, agregar si es necesario
      parentescoFamiliarEmergencia:
        this.formHojaDeVida.value.parentescoFamiliarEmergencia,
      direccionFamiliarEmergencia:
        this.formHojaDeVida.value.direccionFamiliarEmergencia,
      barrioFamiliarEmergencia:
        this.formHojaDeVida.value.barrioFamiliarEmergencia,
      telefonoFamiliarEmergencia:
        this.formHojaDeVida.value.telefonoFamiliarEmergencia,
      ocupacionFamiliarEmergencia:
        this.formHojaDeVida.value.ocupacionFamiliar_Emergencia,

      firmaCapturada: this.firma ?? '',
      fotocedulafrontal: this.guardarObjeti ?? '',
      fotocedulatrasera: this.guardarObjeti2 ?? '',
      fotoPersonal: this.guardarObjeti3 ?? '',
    };

    console.log(datosAEnviar);

    const url = `${urlBack.url}/contratacion/subirParte1`; // Asegúrate de sustituir `elEndpointEspecifico` con el path correcto

    // Realizar la petición HTTP POST
    this.http.post(url, datosAEnviar).subscribe(
      (response) => {
        console.log(response);
        /* swal y que cuando le de click a aceptar lo redireccione a la pagina de inicio */
        Swal.fire({
          title: '¡Datos guardados!',
          text: 'Los datos se guardaron correctamente.',
          icon: 'success',
          confirmButtonText: 'Aceptar',
        })
          .then(() => {
            window.location.reload();
          })
          .catch((error) => {
            console.error('Error al redirigir:', error);
          });

      },
      (error) => {
        console.error(error.error.message);
      }
    );
  }

  async listFormFields() {
    // Asume que tienes un PDF en la carpeta de activos; ajusta la ruta según sea necesario
    const pdfUrl = '../../assets/Archivos/minerva2.pdf';
    const arrayBuffer = await fetch(pdfUrl).then((res) => res.arrayBuffer());
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    const form = pdfDoc.getForm();
    const fields = form.getFields();
    let fieldDetails = fields
      .map((field) => {
        const type = field.constructor.name;
        const name = field.getName();
        let additionalDetails = '';

        if (field instanceof PDFTextField) {
          additionalDetails = ` - Value: ${field.getText()}`;
        } else if (field instanceof PDFCheckBox) {
          additionalDetails = ` - Is Checked: ${field.isChecked()}`;
        } // Puedes añadir más condiciones para otros tipos de campos como PDFDropdown, etc.

        return `Field name: ${name}, Field type: ${type}${additionalDetails}`;
      })
      .join('\n');

    // Crear un Blob con los detalles de los campos
    const blob = new Blob([fieldDetails], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    // Crear un enlace para descargar el Blob como un archivo
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = 'pdfFieldsDetails.txt';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
  }

  async fillForm() {

    if (this.guardarObjeti3 === undefined) {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Debes subir una foto para continuar',
      });
      return;
    }

    console.log(this.formHojaDeVida.value);
    console.log(this.formHojaDeVida2.value);

    const pdfUrl = '../../assets/Archivos/minerva.pdf';
    const arrayBuffer = await fetch(pdfUrl).then((res) => res.arrayBuffer());
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    const form = pdfDoc.getForm();
    let date: Date = new Date();
    // campotexto 0: dia, 1: mes, 2: año del dia
    form
      .getTextField('topmostSubform[0].Page1[0].CampoTexto2[0]')
      .setText(date.getDate().toString());
    form
      .getTextField('topmostSubform[0].Page1[0].CampoTexto2[1]')
      .setText((date.getMonth() + 1).toString());
    form
      .getTextField('topmostSubform[0].Page1[0].CampoTexto2[2]')
      .setText(date.getFullYear().toString());
    // Ejemplo de cómo actualizar campos específicos
    form
      .getTextField('topmostSubform[0].Page1[0].CampoTexto1[0]')
      .setText('HOJA DE VIDA');
    form
      .getTextField('topmostSubform[0].Page1[0].CampoTexto2[5]')
      .setText(
        this.formHojaDeVida.value.pApellido +
        ' ' +
        this.formHojaDeVida.value.sApellido
      );
    form
      .getTextField('topmostSubform[0].Page1[0].CampoTexto2[6]')
      .setText(
        this.formHojaDeVida.value.pNombre +
        ' ' +
        this.formHojaDeVida.value.sNombre
      );
    if (this.formHojaDeVida.value.departamento === 'Venezuela') {
      form
        .getTextField('topmostSubform[0].Page1[0].CampoTexto2[12]')
        .setText('Venezolana');
    }
    else {
      form
        .getTextField('topmostSubform[0].Page1[0].CampoTexto2[12]')
        .setText('Colombiana');
    }


    form
      .getTextField('topmostSubform[0].Page1[0].CampoTexto2[7]')
      .setText(this.formHojaDeVida.value.direccionResidencia);

    form
      .getTextField('topmostSubform[0].Page1[0].CampoTexto2[8]')
      .setText(this.formHojaDeVida.value.ciudad);
    form
      .getTextField('topmostSubform[0].Page1[0].CampoTexto2[9]')
      .setText(this.formHojaDeVida.value.numCelular);
    form
      .getTextField('topmostSubform[0].Page1[0].CampoTexto2[10]')
      .setText(this.formHojaDeVida.value.numCelular);
    form
      .getTextField('topmostSubform[0].Page1[0].CampoTexto2[11]')
      .setText(this.formHojaDeVida.value.correo);
    form
      .getTextField('topmostSubform[0].Page1[0].CampoTexto2[16]')
      .setText(this.formHojaDeVida.value.numeroCedula);
    if (this.formHojaDeVida.value.tipoDoc === 'CC') {
      form
        .getCheckBox('topmostSubform[0].Page1[0].CasillaVerificación1[2]')
        .check();
    }
    if (this.formHojaDeVida.value.tipoDoc === 'CE') {
      form
        .getCheckBox('topmostSubform[0].Page1[0].CasillaVerificación1[3]')
        .check();
    }

    form
      .getTextField('topmostSubform[0].Page1[0].CampoTexto2[17]')
      .setText(this.formHojaDeVida.value.municipioExpedicionCC);
    form
      .getTextField('topmostSubform[0].Page1[0].CampoTexto2[14]')
      .setText(this.formHojaDeVida2.value.estadoCivil);

    form
      .getTextField('topmostSubform[0].Page2[0].CampoTexto2[0]')
      .setText(
        this.formHojaDeVida2.value.nombresConyuge +
        ' ' +
        this.formHojaDeVida2.value.apellidosConyuge
      );
    form
      .getTextField('topmostSubform[0].Page2[0].CampoTexto2[1]')
      .setText(this.formHojaDeVida2.value.ocupacionConyuge);
    form
      .getTextField('topmostSubform[0].Page2[0].CampoTexto2[4]')
      .setText(this.formHojaDeVida2.value.direccionLaboralConyuge);
    form
      .getTextField('topmostSubform[0].Page2[0].CampoTexto2[5]')
      .setText(this.formHojaDeVida2.value.telefonoConyuge);

    // foto

    const base64Image = this.guardarObjeti3;
    const imageBytes = this.base64ToUint8Array(base64Image);
    const format = this.getImageFormat(base64Image);

    const x = 175 * 2.83465;
    let y = (297 - 51.9 - 40) * 2.83465;
    const width = 30 * 2.83465;
    const height = 41 * 2.83465;
    y -= 51; // Mover la imagen 30 puntos más abajo como ejemplo

    let image!: any;
    if (format === 'jpeg') {
      image = await pdfDoc.embedJpg(imageBytes);
    } else if (format === 'png') {
      image = await pdfDoc.embedPng(imageBytes);
    }

    const page = pdfDoc.getPage(0);
    page.drawImage(image, { x, y, width, height });

    // info padre
    form
      .getTextField('topmostSubform[0].Page2[0].CampoTexto2[10]')
      .setText(this.formHojaDeVida2.value.nombrePadre);
    form
      .getTextField('topmostSubform[0].Page2[0].CampoTexto2[11]')
      .setText(this.formHojaDeVida2.value.ocupacionPadre);
    form
      .getTextField('topmostSubform[0].Page2[0].CampoTexto2[12]')
      .setText(this.formHojaDeVida2.value.telefonoPadre);

    // info madre
    form
      .getTextField('topmostSubform[0].Page2[0].CampoTexto2[16]')
      .setText(this.formHojaDeVida2.value.nombreMadre);
    form
      .getTextField('topmostSubform[0].Page2[0].CampoTexto2[17]')
      .setText(this.formHojaDeVida2.value.ocupacionMadre);
    form
      .getTextField('topmostSubform[0].Page2[0].CampoTexto2[13]')
      .setText(this.formHojaDeVida2.value.telefonoMadre);

    // si this.formHojaDeVida.value.tipoVivienda2 contiene la palabra propia
    if (this.formHojaDeVida2.value.tipoVivienda2.includes('Propia')) {
      form
        .getCheckBox('topmostSubform[0].Page1[0].CasillaVerificación1[26]')
        .check();
    }
    // si this.formHojaDeVida.value.tipoVivienda2 contiene la palabra arrendada
    if (this.formHojaDeVida2.value.tipoVivienda2.includes('Arriendo')) {
      form
        .getCheckBox('topmostSubform[0].Page1[0].CasillaVerificación1[25]')
        .check();
    }
    // si this.formHojaDeVida.value.tipoVivienda2 contiene la palabra familiar
    if (this.formHojaDeVida2.value.tipoVivienda2.includes('Familiar')) {
      form
        .getCheckBox('topmostSubform[0].Page1[0].CasillaVerificación1[24]')
        .check();
    }

    // si estudios extra contiene la palabra tecnico
    if (this.formHojaDeVida2.value.estudiosExtras.includes('Técnico')) {
      form
        .getCheckBox('topmostSubform[0].Page2[0].CasillaVerificación1[5]')
        .check();
      form
        .getTextField('topmostSubform[0].Page2[0].CampoTexto2[52]')
        .setText(this.formHojaDeVida2.value.anoFinalizacion);
      form
        .getTextField('topmostSubform[0].Page2[0].CampoTexto2[50]')
        .setText(this.formHojaDeVida2.value.tituloObtenido);
      form
        .getTextField('topmostSubform[0].Page2[0].CampoTexto2[49]')
        .setText(this.formHojaDeVida2.value.nombreInstitucion);
    }
    // si estudios extra contiene la palabra tecnologo
    if (this.formHojaDeVida2.value.estudiosExtras.includes('Tecnólogo')) {
      form
        .getCheckBox('topmostSubform[0].Page2[0].CasillaVerificación1[6]')
        .check();
      form
        .getTextField('topmostSubform[0].Page2[0].CampoTexto2[34]')
        .setText(this.formHojaDeVida2.value.anoFinalizacion);
      form
        .getTextField('topmostSubform[0].Page2[0].CampoTexto2[46]')
        .setText(this.formHojaDeVida2.value.tituloObtenido);
      form
        .getTextField('topmostSubform[0].Page2[0].CampoTexto2[47]')
        .setText(this.formHojaDeVida2.value.nombreInstitucion);
    }
    // si estudios extra contiene la palabra profesional
    if (this.formHojaDeVida2.value.estudiosExtras.includes('Profesional')) {
      form
        .getCheckBox('topmostSubform[0].Page2[0].CasillaVerificación1[7]')
        .check();
      form
        .getTextField('topmostSubform[0].Page2[0].CampoTexto2[44]')
        .setText(this.formHojaDeVida2.value.anoFinalizacion);
      form
        .getTextField('topmostSubform[0].Page2[0].CampoTexto2[42]')
        .setText(this.formHojaDeVida2.value.tituloObtenido);
      form
        .getTextField('topmostSubform[0].Page2[0].CampoTexto2[41]')
        .setText(this.formHojaDeVida2.value.nombreInstitucion);
    }
    // si estudios extra contiene la palabra especializacion o maestria o doctorado
    if (
      this.formHojaDeVida2.value.estudiosExtras.includes('Especialización') ||
      this.formHojaDeVida2.value.estudiosExtras.includes('Maestría') ||
      this.formHojaDeVida2.value.estudiosExtras.includes('Doctorado')
    ) {
      form
        .getTextField('topmostSubform[0].Page2[0].CampoTexto2[36]')
        .setText(this.formHojaDeVida2.value.anoFinalizacion);
      form
        .getTextField('topmostSubform[0].Page2[0].CampoTexto2[38]')
        .setText(this.formHojaDeVida2.value.tituloObtenido);
      form
        .getTextField('topmostSubform[0].Page2[0].CampoTexto2[39]')
        .setText(this.formHojaDeVida2.value.nombreInstitucion);
    }

    // informacion empresa
    form
      .getTextField('topmostSubform[0].Page3[0].CampoTexto2[0]')
      .setText(this.formHojaDeVida2.value.nombreEmpresa1);
    form
      .getTextField('topmostSubform[0].Page3[0].CampoTexto2[1]')
      .setText(this.formHojaDeVida2.value.direccionEmpresa1);
    form
      .getTextField('topmostSubform[0].Page3[0].CampoTexto2[2]')
      .setText(this.formHojaDeVida2.value.telefonosEmpresa1);
    form
      .getTextField('topmostSubform[0].Page3[0].CampoTexto2[3]')
      .setText(this.formHojaDeVida2.value.cargoTrabajador1);
    form
      .getTextField('topmostSubform[0].Page3[0].CampoTexto2[4]')
      .setText(this.formHojaDeVida2.value.nombreJefe1);
    // fecha asi 2024-03-12T05:00:00.000Z se debe cambiar a 12/03/2024 para separar por / y poder usar
    // si contiene - se debe cambiar a / para poder usar
    if (this.formHojaDeVida2.value.fechaRetiro1.includes('-')) {
      let fecha = this.formHojaDeVida2.value.fechaRetiro1;
      let fechaArray = fecha.split('-');
      let fechaRetiro = fechaArray[2].split('T');
      let fechaRetiroFinal =
        fechaRetiro[0] + '/' + fechaArray[1] + '/' + fechaArray[0];
      // dia en topmostSubform[0].Page3[0].CampoTexto2[8]
      form
        .getTextField('topmostSubform[0].Page3[0].CampoTexto2[8]')
        .setText(fechaRetiro[0]);
      // mes en topmostSubform[0].Page3[0].CampoTexto2[9]
      form
        .getTextField('topmostSubform[0].Page3[0].CampoTexto2[9]')
        .setText(fechaArray[1]);
      // año en topmostSubform[0].Page3[0].CampoTexto2[10]
      form
        .getTextField('topmostSubform[0].Page3[0].CampoTexto2[10]')
        .setText(fechaArray[0]);

      form
        .getTextField('topmostSubform[0].Page3[0].CampoTexto2[19]')
        .setText(this.formHojaDeVida.value.motivoRetiro1);
    }

    // informacion empresa
    form
      .getTextField('topmostSubform[0].Page3[0].CampoTexto2[21]')
      .setText(this.formHojaDeVida2.value.nombreEmpresa2);
    form
      .getTextField('topmostSubform[0].Page3[0].CampoTexto2[41]')
      .setText(this.formHojaDeVida2.value.direccionEmpresa2);
    form
      .getTextField('topmostSubform[0].Page3[0].CampoTexto2[40]')
      .setText(this.formHojaDeVida2.value.telefonosEmpresa2);
    form
      .getTextField('topmostSubform[0].Page3[0].CampoTexto2[38]')
      .setText(this.formHojaDeVida2.value.cargoTrabajador2);
    form
      .getTextField('topmostSubform[0].Page3[0].CampoTexto2[39]')
      .setText(this.formHojaDeVida2.value.nombreJefe2);
    // fecha asi 2024-03-12T05:00:00.000Z se debe cambiar a 12/03/2024 para separar por / y poder usar
    // si contiene - se debe cambiar a / para poder usar
    if (this.formHojaDeVida2.value.fechaRetiro2.includes('-')) {
      let fecha2 = this.formHojaDeVida.value.fechaRetiro2;
      let fechaArray2 = fecha2.split('-');
      let fechaRetiro2 = fechaArray2[2].split('T');
      let fechaRetiroFinal2 =
        fechaRetiro2[0] + '/' + fechaArray2[1] + '/' + fechaArray2[0];
      // dia en topmostSubform[0].Page3[0].CampoTexto2[8]
      form
        .getTextField('topmostSubform[0].Page3[0].CampoTexto2[33]')
        .setText(fechaRetiro2[0]);
      // mes en topmostSubform[0].Page3[0].CampoTexto2[9]
      form
        .getTextField('topmostSubform[0].Page3[0].CampoTexto2[34]')
        .setText(fechaArray2[1]);
      // año en topmostSubform[0].Page3[0].CampoTexto2[10]
      form
        .getTextField('topmostSubform[0].Page3[0].CampoTexto2[35]')
        .setText(fechaArray2[0]);
    }
    form
      .getTextField('topmostSubform[0].Page3[0].CampoTexto2[23]')
      .setText(this.formHojaDeVida2.value.motivoRetiro2);

    // refencias personales
    form
      .getTextField('topmostSubform[0].Page4[0].CampoTexto2[0]')
      .setText(this.formHojaDeVida2.value.nombreReferenciaPersonal1);
    form
      .getTextField('topmostSubform[0].Page4[0].CampoTexto2[9]')
      .setText(this.formHojaDeVida2.value.telefonoReferencia1);
    form
      .getTextField('topmostSubform[0].Page4[0].CampoTexto2[4]')
      .setText(this.formHojaDeVida2.value.ocupacionReferencia1);

    form
      .getTextField('topmostSubform[0].Page4[0].CampoTexto2[1]')
      .setText(this.formHojaDeVida2.value.nombreReferenciaPersonal2);
    form
      .getTextField('topmostSubform[0].Page4[0].CampoTexto2[10]')
      .setText(this.formHojaDeVida2.value.telefonoReferencia2);
    form
      .getTextField('topmostSubform[0].Page4[0].CampoTexto2[3]')
      .setText(this.formHojaDeVida2.value.ocupacionReferencia2);

    // refencias familiares
    form
      .getTextField('topmostSubform[0].Page4[0].CampoTexto2[2]')
      .setText(this.formHojaDeVida2.value.nombreReferenciaFamiliar1);
    form
      .getTextField('topmostSubform[0].Page4[0].CampoTexto2[11]')
      .setText(this.formHojaDeVida2.value.telefonoReferenciaFamiliar1);
    form
      .getTextField('topmostSubform[0].Page4[0].CampoTexto2[5]')
      .setText(this.formHojaDeVida2.value.ocupacionReferenciaFamiliar1);

    // Bloquear todos los campos del formulario
    const fields = form.getFields();
    fields.forEach((field) => {
      field.enableReadOnly(); // Habilita el modo de solo lectura para el campo
    });

    const pdfBytes = await pdfDoc.save();

    this.imprimirInformacion();
    this.imprimirInformacion2();

    // Descargar el PDF en el cliente
    this.downloadPDF(
      pdfBytes,
      `Minerva-${this.formHojaDeVida.value.pApellido}-${this.formHojaDeVida.value.sApellido}${this.formHojaDeVida.value.sNombre}.pdf`
    );

    // Enviar el PDF al servidor
    this.uploadPDF(
      pdfBytes,
      `Minerva-${this.formHojaDeVida.value.pApellido}-${this.formHojaDeVida.value.sApellido}${this.formHojaDeVida.value.sNombre}.pdf`
    );
  }

  // Método para detectar el formato de la imagen desde una cadena Base64
  getImageFormat(base64: any) {
    const marker = base64.slice(0, 10);
    if (marker.includes('/9j')) {
      return 'jpeg';
    } else if (marker.includes('iVBOR')) {
      return 'png';
    } else {
      throw new Error('Unsupported image format');
    }
  }

  // Función auxiliar para convertir Base64 a Uint8Array
  base64ToUint8Array(base64: any) {
    // Verificar si el string Base64 incluye un prefijo y removerlo
    const base64Actual = base64.split(',').pop();

    try {
      const binaryString = window.atob(base64Actual); // Decodificar base64
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    } catch (e) {
      console.error('Error decodificando Base64:', e);
      // Retorna un Uint8Array vacío o maneja el error de manera apropiada
      return new Uint8Array();
    }
  }

  downloadPDF(pdfBytes: Uint8Array, filename: string) {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = filename;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    window.URL.revokeObjectURL(url);
  }

  async uploadPDF(pdfBytes: Uint8Array, filename: string) {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    // Convertir el blob a base64
    const pdfBase64 = await this.blobToBase64(blob);

    // Preparar el objeto con los datos a enviar
    const dataToSend = {
      numeroCedula: this.formHojaDeVida.value.numeroCedula, // Ajusta según tu implementación
      pdf_base64: pdfBase64,
    };

    const url = `${urlBack.url}/contratacion/pdf`;

    // Asegúrate de enviar una solicitud con el contenido JSON apropiado
    this.http
      .post(url, dataToSend, {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
        }),
      })
      .subscribe(
        (response) => {
          console.log(response);
          Swal.fire({
            title: '¡Datos guardados!',
            text: 'Los datos se guardaron correctamente.',
            icon: 'success',
            confirmButtonText: 'Aceptar',
          });
        },
        (error) => {
          console.error(error.error.message);
          Swal.fire({
            title: 'Error',
            text: 'Hubo un problema al guardar los datos.',
            icon: 'error',
            confirmButtonText: 'Aceptar',
          });
        }
      );
  }

  blobToBase64(blob: any) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result); // Convertido a base64
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  buscarCedula() {

    /* Validar que el campo no esté vacío */
    if (this.numeroCedula == null || this.numeroCedula == undefined || this.numeroCedula == '') {
      Swal.fire({
        title: 'Campo vacío',
        text: 'Por favor, ingresa un número de cédula.',
        icon: 'warning',
        confirmButtonText: 'Aceptar',
      });
      return;
    }

    localStorage.setItem('cedula', this.numeroCedula.toString() ?? '');

    const url = `${urlBack.url}/contratacion/buscarCandidato/${this.numeroCedula}`;
    this.http.get(url).subscribe(
      (response) => {
        this.mostrarFormulario = true; // Mostrar el formulario
        Swal.fire({
          title: 'Cédula encontrada',
          text: 'Procede por favor a verificar cada dato para poder actualizarlo.',
          icon: 'success',
          confirmButtonText: 'Aceptar',
        });
        this.llenarFormularioConDatos(response);
      },
      (error) => {
        if (
          error.error.message ===
          'No se encontraron datos para la cédula ingresada'
        ) {
          Swal.fire({
            title: 'Cédula no encontrada',
            text: 'Procede a llenar el formulario con los datos por favor.',
            icon: 'success',
            confirmButtonText: 'Aceptar',
          });
          this.mostrarFormulario = true; // También mostrar el formulario en caso de error
        }
      }
    );
  }

  llenarDatosHijos(hijos: any[]): void {
    const hijosArray = this.hijosFormArray;
    // Primero, limpia el FormArray para asegurarte de que esté vacío
    while (hijosArray.length !== 0) {
      hijosArray.removeAt(0);
    }

    // Ahora, llena el FormArray con la información de cada hijo
    hijos.forEach((hijo) => {
      hijosArray.push(this.crearFormGroupHijoConDatos(hijo));
    });
  }

  crearFormGroupHijoConDatos(datosHijo: any): FormGroup {
    const auxViveConTrabajador = this.stringToBoolean(
      datosHijo.vive_con_trabajador
    );

    return new FormGroup({
      nombreHijo: new FormControl(datosHijo.nombre, Validators.required),
      viveConTrabajador: new FormControl(
        this.stringToBoolean(datosHijo.vive_con_trabajador),
        Validators.required
      ),
      estudiaFundacion: new FormControl(
        this.stringToBoolean(datosHijo.estudia_en_fundacion),
        Validators.required
      ),
      discapacidad: new FormControl(
        this.stringToBoolean(datosHijo.discapacidad),
        Validators.required
      ),
      empleadoCompania: new FormControl(
        this.stringToBoolean(datosHijo.empleado_compania),
        Validators.required
      ),
      nombrePadreMadre: new FormControl(
        datosHijo.nombre_padre_madre,
        Validators.required
      ),
      docIdentidadOtroPadre: new FormControl(
        datosHijo.doc_identidad_otro_padre,
        Validators.required
      ),
      otroPadreTrabajaCompania: new FormControl(
        this.stringToBoolean(datosHijo.otro_padre_trabaja_compania),
        Validators.required
      ),
      hijastro: new FormControl(
        this.stringToBoolean(datosHijo.hijastro),
        Validators.required
      ),
      custodiaLegal: new FormControl(
        this.stringToBoolean(datosHijo.custodia_legal),
        Validators.required
      ),
    });
  }

  llenarFormularioConDatos(datos: any) {
    if (datos.data && datos.data.length > 0) {
      let datosHoja = datos.data[0]; // Asume que quieres llenar el formulario con el primer objeto en el array 'data'
      console.log(datosHoja);
      // Encuentra el objeto correspondiente a "Sí" o "No" en opcionBinaria
      const opcionSeleccionada = this.opcionBinaria.find(
        (opcion) =>
          (datosHoja.estudia_actualmente === 'Sí' && opcion.value === true) ||
          (datosHoja.estudia_actualmente === 'No' && opcion.value === false)
      );

      //this.actualizarEdadesHijos(datosHoja.num_hijos_dependen_economicamente);

      if (datosHoja && datosHoja.numerodeceduladepersona !== undefined) {
        this.formHojaDeVida.patchValue({
          tipoDoc: datosHoja.tipodedocumento,
          numeroCedula: datosHoja.numerodeceduladepersona,
          pApellido: datosHoja.primer_apellido,
          sApellido: datosHoja.segundo_apellido,
          pNombre: datosHoja.primer_nombre,
          sNombre: datosHoja.segundo_nombre,
          genero: datosHoja.genero,
          correo: datosHoja.primercorreoelectronico,
          numCelular: datosHoja.celular,
          numWha: datosHoja.whatsapp,
          departamento: datosHoja.departamento,

          estadoCivil: datosHoja.estado_civil,
          direccionResidencia: datosHoja.direccion_residencia,
          fechaExpedicionCC: datosHoja.fecha_expedicion_cc,
          departamentoExpedicionCC: datosHoja.departamento_expedicion_cc,
          municipioExpedicionCC: datosHoja.municipio_expedicion_cc,
          departamentoNacimiento: datosHoja.lugar_nacimiento_departamento,
          municipioNacimiento: datosHoja.lugar_nacimiento_municipio,
          rh: datosHoja.rh,
          lateralidad: datosHoja.zurdo_diestro,

          ciudad: datosHoja.municipio ?? '',
          tiempoResidenciaZona: datosHoja.hacecuantoviveenlazona,
          lugarAnteriorResidencia: datosHoja.lugar_anterior_residencia,
          razonCambioResidencia: datosHoja.hace_cuanto_se_vino_y_porque,
          zonasConocidas: datosHoja.zonas_del_pais,
          preferenciaResidencia: datosHoja.donde_le_gustaria_vivir,
          fechaNacimiento: datosHoja.fecha_nacimiento,
          estudiaActualmente: opcionSeleccionada, // Asigna el objeto encontrado

          familiarEmergencia: datosHoja.familiar_emergencia,
          parentescoFamiliarEmergencia:
            datosHoja.parentesco_familiar_emergencia,
          direccionFamiliarEmergencia: datosHoja.direccion_familiar_emergencia,
          barrioFamiliarEmergencia: datosHoja.barrio_familiar_emergencia,
          telefonoFamiliarEmergencia: datosHoja.telefono_familiar_emergencia,
          ocupacionFamiliar_Emergencia: datosHoja.ocupacion_familiar_emergencia,




          //fotocedulafrontal: this.getImageUrl(datosHoja.fotocedulafrontal),
          //fotocedulatrasera: this.getImageUrl(datosHoja.fotocedulatrasera),
          //fotoPersonal: this.getImageUrl(datosHoja.fotoPersonal),
        });

        // Guardar los datos base64 en variables para su visualización
        this.previsualizacion = this.formHojaDeVida.value.fotocedulafrontal;
        this.previsualizacion2 = this.formHojaDeVida.value.fotocedulatrasera;
        this.previsualizacion3 = this.formHojaDeVida.value.fotoPersonal;



        this.formHojaDeVida2.patchValue({
          // Formulario publico segunda parte

          escolaridad: datosHoja.escolaridad,
          estudiosExtras: datosHoja.estudiosExtra,
          nombreInstitucion: datosHoja.nombre_institucion,
          anoFinalizacion: datosHoja.ano_finalizacion,
          tituloObtenido: datosHoja.titulo_obtenido,
          tallaChaqueta: datosHoja.chaqueta,
          tallaPantalon: datosHoja.pantalon,
          tallaCamisa: datosHoja.camisa,
          tallaCalzado: datosHoja.calzado,


          nombresConyuge: datosHoja.nombre_conyugue,
          apellidosConyuge: datosHoja.apellido_conyugue,
          documentoIdentidadConyuge: datosHoja.num_doc_identidad_conyugue,
          viveConyuge:
            this.stringToBoolean(datosHoja.vive_con_el_conyugue) ?? '',
          direccionConyuge: datosHoja.direccion_conyugue,
          telefonoConyuge: datosHoja.telefono_conyugue,
          barrioConyuge: datosHoja.barrio_municipio_conyugue,
          ocupacionConyuge: datosHoja.ocupacion_conyugue,
          telefonoLaboralConyuge: datosHoja.telefono_laboral_conyugue,
          direccionLaboralConyuge: datosHoja.direccion_laboral_conyugue,

          nombrePadre: datosHoja.nombre_padre,
          elPadreVive: this.stringToBoolean(datosHoja.vive_padre) ?? '',
          ocupacionPadre: datosHoja.ocupacion_padre,
          direccionPadre: datosHoja.direccion_padre,
          telefonoPadre: datosHoja.telefono_padre,
          barrioPadre: datosHoja.barrio_padre,
          nombreMadre: datosHoja.nombre_madre,

          madreVive: this.stringToBoolean(datosHoja.vive_madre) ?? '',
          ocupacionMadre: datosHoja.ocupacion_madre,
          direccionMadre: datosHoja.direccion_madre,
          telefonoMadre: datosHoja.telefono_madre,
          barrioMadre: datosHoja.barrio_madre,

          nombreReferenciaPersonal1: datosHoja.nombre_referencia_personal1,
          telefonoReferencia1: datosHoja.telefono_referencia_personal1,
          ocupacionReferencia1: datosHoja.ocupacion_referencia_personal1,
          tiempoConoceReferenciaPersonal1: datosHoja.tiempo_conoce_referencia_personal1,

          nombreReferenciaPersonal2: datosHoja.nombre_referencia_personal2,
          telefonoReferencia2: datosHoja.telefono_referencia_personal2,
          ocupacionReferencia2: datosHoja.ocupacion_referencia_personal2,
          tiempoConoceReferenciaPersonal2: datosHoja.tiempo_conoce_referencia_personal2,

          nombreReferenciaFamiliar1: datosHoja.nombre_referencia_familiar1,
          telefonoReferenciaFamiliar1: datosHoja.telefono_referencia_familiar1,
          ocupacionReferenciaFamiliar1:
            datosHoja.ocupacion_referencia_familiar1,
          parentescoReferenciaFamiliar1:
            datosHoja.parentesco_referencia_familiar1,

          nombreReferenciaFamiliar2: datosHoja.nombre_referencia_familiar2,
          telefonoReferenciaFamiliar2: datosHoja.telefono_referencia_familiar2,
          ocupacionReferenciaFamiliar2:
            datosHoja.ocupacion_referencia_familiar2,
          parentescoReferenciaFamiliar2: datosHoja.parentesco_referencia_familiar2,


          // expericiencia laboral tiene un False pero para que lo caja es false en minuscula
          experienciaLaboral: this.stringToBoolean(
            datosHoja.tiene_experiencia_laboral ?? ''
          ),
          experienciaLaboralCuanto:
            this.stringToBoolean(datosHoja.experienciaLaboralCuantoTiempo) ??
            '',
          areaExperiencia: datosHoja.area_experiencia,
          areaCultivoPoscosecha: datosHoja.area_cultivo_poscosecha,
          laboresRealizadas: datosHoja.labores_realizadas,
          tiempoExperiencia: datosHoja.tiempo_experiencia,

          nombreEmpresa1: datosHoja.nombre_expe_laboral1_empresa,
          direccionEmpresa1: datosHoja.direccion_empresa1,
          telefonosEmpresa1: datosHoja.telefonos_empresa1,
          nombreJefe1: datosHoja.nombre_jefe_empresa1,
          cargoTrabajador1: datosHoja.cargo_empresa1,
          fechaRetiro1: datosHoja.fecha_retiro_empresa1,
          motivoRetiro1: datosHoja.motivo_retiro_empresa1,

          nombreEmpresa2: datosHoja.nombre_expe_laboral2_empresa,
          direccionEmpresa2: datosHoja.direccion_empresa2,
          telefonosEmpresa2: datosHoja.telefonos_empresa2,
          nombreJefe2: datosHoja.nombre_jefe_empresa2,
          cargoTrabajador2: datosHoja.cargo_empresa2,
          fechaRetiro2: datosHoja.fecha_retiro_empresa2,
          motivoRetiro2: datosHoja.motivo_retiro_empresa2,

          numHijosDependientes: datosHoja.num_hijos_dependen_economicamente,
          edadHijo1: datosHoja.edad_hijo1 ?? '',
          edadHijo2: datosHoja.edad_hijo2 ?? '',
          edadHijo3: datosHoja.edad_hijo3 ?? '',
          edadHijo4: datosHoja.edad_hijo4 ?? '',
          edadHijo5: datosHoja.edad_hijo5 ?? '',

          cuidadorHijos: datosHoja.quien_los_cuida,

          familiaSolo:
            this.stringToBoolean(datosHoja.familia_con_un_solo_ingreso) ?? '',
          numeroHabitaciones: datosHoja.num_habitaciones,
          personasPorHabitacion: datosHoja.num_personas_por_habitacion,
          tipoVivienda2: datosHoja.tipo_vivienda_2p,
          caracteristicasVivienda: datosHoja.caractteristicas_vivienda,
          fuenteVacante: datosHoja.como_se_entero,

        });

        // Suponiendo que datosHoja.hijos es el array con los datos de los hijos
        this.llenarDatosHijos(datosHoja.hijos);
        this.llenarFormArrayDesdeDatos(
          'conQuienViveChecks',
          datosHoja.personas_con_quien_convive
        );
        this.llenarFormArrayDesdeDatos(
          'tiposViviendaChecks',
          datosHoja.tipo_vivienda
        );
        this.llenarFormArrayDesdeDatos(
          'comodidadesChecks',
          datosHoja.servicios
        );
        this.llenarFormArrayDesdeDatos(
          'expectativasVidaChecks',
          datosHoja.expectativas_de_vida
        );
      } else {
        console.error(
          'La propiedad numerodeceduladepersona no se encontró en los datos recibidos'
        );
      }
    } else {
      console.error('No se recibieron datos para llenar el formulario');
    }
  }

  private determineImageFormat(base64Data: string): string {
    if (base64Data.startsWith('/9j')) {
      return 'jpeg';
    } else if (base64Data.startsWith('iVBOR')) {
      return 'png';
    } else {
      return 'unknown'; // Asumir un formato predeterminado o gestionar como un error
    }
  }

  private getImageUrl(base64Data: string): string {
    const format = this.determineImageFormat(base64Data);
    let prefix = '';
    switch (format) {
      case 'jpeg':
        prefix = 'data:image/jpeg;base64,';
        break;
      case 'png':
        prefix = 'data:image/png;base64,';
        break;
      default:
        prefix = 'data:image/jpeg;base64,'; // O manejar un caso predeterminado o un error
    }
    return prefix + base64Data;
  }


  // Esta función toma el nombre del FormArray y el arreglo de valores para llenarlo
  llenarFormArrayDesdeDatos(nombreFormArray: string, valoresString: string) {
    const formArray = this.formHojaDeVida2.get(nombreFormArray) as FormArray;
    formArray.clear(); // Limpia el array para asegurar que está vacío

    // Si valoresString es null, undefined o una cadena vacía, termina la función
    if (
      valoresString === null ||
      valoresString === undefined ||
      valoresString.trim() === ''
    ) {
      return;
    }

    // Intenta convertir la cadena a un arreglo
    let valores = [];
    try {
      valores = JSON.parse(valoresString.replace(/'/g, '"'));
    } catch (e) {
      console.error('Error al parsear los valores:', e);
      // Considera manejar este error de manera que tenga sentido para tu aplicación
      return; // Sale de la función si hay un error en el parseo
    }

    // Verifica si es un arreglo y tiene elementos antes de proceder
    if (Array.isArray(valores) && valores.length > 0) {
      valores.forEach((valor) => {
        formArray.push(new FormControl(valor));
      });
    }
  }

  compareFn(o1: any, o2: any): boolean {
    return o1 === o2;
  }

  stringToBoolean(stringValue: any) {
    if (
      stringValue === null ||
      stringValue === undefined ||
      stringValue.trim() === ''
    ) {
      // Retorna false o true dependiendo de lo que consideres adecuado para tu aplicación
      // cuando el valor de entrada es nulo, undefined o una cadena vacía.
      return false;
    }
    return stringValue.toLowerCase() === 'true';
  }

  capturarFile(event: any) {
    const archivoCapturado = event.target.files[0];
    this.extraerBase64(archivoCapturado).then((imagen: any) => {
      // Asegurarse de que imagen.base sea una cadena y contenga el prefijo esperado
      this.previsualizacion = imagen.base;
      if (typeof imagen.base === 'string') {
        // Si imagen.base es una cadena válida, extraemos solo la parte base64
        const base64Data = imagen.base.split(',')[1];
        this.guardarObjeti = base64Data; // Almacenamos solo la cadena base64
      }
    });
  }

  capturarFile2(event: any) {
    const archivoCapturado = event.target.files[0];
    this.extraerBase64(archivoCapturado).then((imagen: any) => {
      this.previsualizacion2 = imagen.base;
      // Repetir el mismo proceso para el segundo archivo
      if (typeof imagen.base === 'string') {
        const base64Data = imagen.base.split(',')[1];
        this.guardarObjeti2 = base64Data;
      }
    });
  }

  capturarFile3(event: any) {
    const archivoCapturado = event.target.files[0];
    this.extraerBase64(archivoCapturado).then((imagen: any) => {
      this.previsualizacion3 = imagen.base;
      // Repetir el mismo proceso para el segundo archivo
      if (typeof imagen.base === 'string') {
        const base64Data = imagen.base.split(',')[1];
        this.guardarObjeti3 = base64Data;
      }
    });
  }

  extraerBase64 = async ($event: any) =>
    new Promise((resolve, reject) => {
      try {
        const unsafeImg = window.URL.createObjectURL($event);
        const image = this.sanitizer.bypassSecurityTrustUrl(unsafeImg);
        const reader = new FileReader();
        reader.readAsDataURL($event);
        reader.onload = () => {
          resolve({
            base: reader.result,
          });
        };
        reader.onerror = (error) => {
          resolve({
            base: null,
          });
        };
        return image;
      } catch (e) {
        return null;
      }
    });

  clearImage(): any {
    this.previsualizacion = '';
    this.archivos = [];
  }

  @ViewChild(FirmaComponent)
  firmaComponent!: FirmaComponent;

  limpiarFirma() {
    this.firmaComponent.clearSignature();
  }

  guardarFirma() {
    this.firma = this.firmaComponent.saveSignature();
  }

  get hijosFormArray() {
    return this.formHojaDeVida2.get('hijos') as FormArray;
  }

  inicializarFormularioHijos() {
    this.formHojaDeVida
      .get('numHijosDependientes')!
      .valueChanges.subscribe((numHijos) => {
        this.actualizarFormularioHijos(numHijos);
      });
  }

  // Ajusta la firma de la función para aceptar MatCheckboxChange
  onCheckboxChange(
    event: MatCheckboxChange,
    valor: string,
    nombreFormArray: string
  ) {
    const checksArray: FormArray = this.formHojaDeVida2.get(
      nombreFormArray
    ) as FormArray;

    if (event.checked) {
      checksArray.push(new FormControl(valor));
    } else {
      let index = checksArray.controls.findIndex(
        (ctrl) => ctrl.value === valor
      );
      if (index >= 0) {
        checksArray.removeAt(index);
      }
    }
  }

  actualizarFormularioHijos(numHijos: number) {
    const hijosArray = this.formHojaDeVida.get('hijos') as FormArray;

    // Eliminar todos los FormGroup existentes
    while (hijosArray.length) {
      hijosArray.removeAt(0);
    }

    // Crear un nuevo FormGroup para cada hijo
    for (let i = 0; i < numHijos; i++) {
      hijosArray.push(this.crearFormGroupHijo());
    }
  }

  escucharNumeroDeHijos() {
    this.formHojaDeVida2
      .get('numHijosDependientes')!
      .valueChanges.subscribe((numHijos: number) => {
        const hijosArray = this.formHojaDeVida2.get('hijos') as FormArray;
        const hijosActuales = hijosArray.length;

        if (numHijos > hijosActuales) {
          for (let i = hijosActuales; i < numHijos; i++) {
            hijosArray.push(this.crearFormGroupHijo());
          }
        } else {
          for (let i = hijosActuales; i > numHijos; i--) {
            hijosArray.removeAt(i - 1);
          }
        }
      });
  }

  crearFormGroupHijo(): FormGroup {
    return new FormGroup({
      nombreHijo: new FormControl('', Validators.required),
      viveConTrabajador: new FormControl('', Validators.required),
      estudiaFundacion: new FormControl('', Validators.required),
      discapacidad: new FormControl('', Validators.required),
      empleadoCompania: new FormControl('', Validators.required),
      nombrePadreMadre: new FormControl('', Validators.required),
      docIdentidadOtroPadre: new FormControl('', Validators.required),
      otroPadreTrabajaCompania: new FormControl('', Validators.required),
      hijastro: new FormControl('', Validators.required),
      custodiaLegal: new FormControl('', Validators.required),
    });
  }

  generarArrayHijos(): Array<number> {
    const numHijos =
      this.formHojaDeVida2.get('numHijosDependientes')?.value || 0;
    return Array.from({ length: numHijos }, (_, i) => i);
  }

  actualizarEdadesHijos(numHijos: number) {
    // Primero, elimina los controles existentes para las edades de los hijos
    Object.keys(this.formHojaDeVida2.controls).forEach((key) => {
      if (key.startsWith('edadHijo')) {
        this.formHojaDeVida2.removeControl(key);
      }
    });

    // Luego, agrega nuevos controles basándose en el número de hijos ingresado
    for (let i = 0; i < numHijos; i++) {
      this.formHojaDeVida2.addControl(
        `edadHijo${i + 1}`,
        new FormControl('', Validators.min(0))
      );
    }
  }

  escucharCambiosEnDepartamento(): void {
    this.formHojaDeVida
      .get('departamento')!
      .valueChanges.subscribe((departamentoSeleccionado) => {
        this.ciudadesResidencia = this.actualizarMunicipios(
          departamentoSeleccionado
        );
        this.formHojaDeVida.get('ciudad')!.enable();
      });

    this.formHojaDeVida
      .get('departamentoExpedicionCC')!
      .valueChanges.subscribe((departamentoSeleccionado) => {
        this.ciudadesExpedicionCC = this.actualizarMunicipios(
          departamentoSeleccionado
        );
        this.formHojaDeVida.get('municipioExpedicionCC')!.enable();
      });

    this.formHojaDeVida
      .get('departamentoNacimiento')!
      .valueChanges.subscribe((departamentoSeleccionado) => {
        this.ciudadesNacimiento = this.actualizarMunicipios(
          departamentoSeleccionado
        );
        this.formHojaDeVida.get('municipioNacimiento')!.enable();
      });
  }

  actualizarMunicipios(departamentoSeleccionado: string): string[] {
    const departamento = this.datos.find(
      (d: any) => d.departamento === departamentoSeleccionado
    );
    return departamento ? departamento.ciudades : [];
  }

  cargarDatosJSON(): void {
    this.http.get('../../assets/colombia.json').subscribe(
      (data) => {
        this.datos = data;
      },
      (error) => {
        console.error('Error al leer el archivo JSON', error);
      }
    );
  }






  opcionesPromocion: string[] = [
    "Referido (amigo, familiar, conocido)",
    "Ya había trabajado con nosotros",
    "Perifoneo (carro, moto)",
    "Volantes (a pie)",
    "Red social WhatsApp",
    "Red social Facebook",
    "Red social Instagram",
    "Punto físico directo (pregunto en la oficina temporal)",
    "Convocatoria externa (municipio, localidad, barrio)"
  ];

  // Arreglo para el tipo de cedula
  tipoDocs: any[] = [
    { abbreviation: 'CC', description: 'Cédula de Ciudadanía (CC)' },
    { abbreviation: 'PPT', description: 'Permiso de permanencia temporal (PPT)' },
    { abbreviation: 'CE', description: 'Cédula de Extranjería (CE)' },
  ];

  generos: any[] = ['MASCULINO', 'FEMENINO', 'NO BINARIO'];

  haceCuantoViveEnlaZona: any[] = [
    'Menos de un mes',
    'Un mes',
    'Mas de 2 mes',
    'Mas de 6 meses',
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

  listadoDeNacionalidades: any[] = [
    'Colombiana',
    'Venezolana',
    'Estadounidense',
    'Ecuatoriana',
    'Peruana',
    'Española',
    'Cubana',
    'Argentina',
    'Mexicana',
  ];

  listatiposdesangre: any[] = [
    'AB+',
    'AB-',
    'A+',
    'A-',
    'B+',
    'B-',
    'O+',
    'O-',
  ];

  opcionBinaria: any[] = [
    { value: true, display: 'Sí' },
    { value: false, display: 'No' },
  ];

  listamanos: any[] = [
    {
      mano: 'Zurdo',
      descripcion: 'Zurdo (Escribe con la mano izquierda)',
    },
    {
      mano: 'Diestro',
      descripcion: 'Diestro (Escribe con la mano derecha)',
    },
    {
      mano: 'Ambidiestro',
      descripcion: 'Ambidiestro (Escribe con ambas manos)',
    },
  ];

  tiposVivienda = ['Casa', 'Apartamento', 'Finca', 'Habitación'];
  tiposVivienda2: string[] = [
    'Propia Totalmente Paga',
    'Propia la están pagando',
    'Arriendo',
    'Familiar',
  ];

  caracteristicasVivienda: string[] = ['Obra Negra', 'Obra Gris', 'Terminada'];

  comodidades: string[] = [
    'Gas Natural',
    'Teléfono Fijo',
    'Internet',
    'Lavadero',
    'Patio',
    'Luz',
    'Agua',
    'Televisión',
  ];

  expectativasVida: string[] = [
    'Educación Propia',
    'Educación de los hijos',
    'Compra de Vivienda',
    'Compra de Automóvil',
    'Viajar',
    'Otro',
  ];

  listaEscolaridad: any[] = [
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    '10',
    '11',
    'Sin Estudios',
    'Otro',
  ];

  listaEscoText: any[] = [
    {
      esco: 'Educación básica primaria',
      descripcion: 'Educación básica primaria - 1 a 5 Grado',
    },
    {
      esco: 'Educación básica secundaria',
      descripcion: 'Educación básica secundaria - 6 a 9 Grado',
    },
    {
      esco: 'Educación media académica',
      descripcion: 'Educación básica secundaria - 10 a 11 Grado',
    },
    {
      esco: 'Otro',
      descripcion:
        'Otro (Escribir primero titulo luego nombre) Ej: Técnico Electricista',
    },
  ];

  tallas: any[] = [
    '4',
    '6',
    '8',
    '10',
    '12',
    '14',
    '16',
    '34',
    '36',
    '38',
    '40',
    '42',
    '44',
  ];

  tallasCalzado: any[] = ['35', '36', '37', '39', '40', '41', '42', '44'];

  listaParentescosFamiliares: any[] = [
    'Padre',
    'Madre',
    'Abuelo/Abuela',
    'Bisabuelo/Bisabuela',
    'Tío/Tía',
    'Primo/Prima',
    'Sobrino/Sobrina',
    'Hermano/Hermana',
    'Cuñado/Cuñada',
    'Esposo/Esposa',
    'Hijo/Hija',
    'Nieto/Nieta',
    'Bisnieto/Bisnieta',
    'Suegro/Suegra',
    'Yerno/Nuera',
    'Hermanastro/Hermanastra',
    'Medio hermano/Media hermana',
    'Padre adoptivo',
    'Madre adoptiva',
    'Hijo adoptivo',
    'Hija adoptiva',
    'Abuelo adoptivo',
    'Abuela adoptiva',
    'Padre biológico',
    'Madre biológica',
    'Hijo biológico',
    'Hija biológica',
    'Padre de crianza',
    'Madre de crianza',
    'Hijo de crianza',
    'Hija de crianza',
    'Tutor legal',
    'Curador legal',
    'Padrino/Madrina',
    'Compadre/Comadre',
    'Concubino/Concubina',
    'Ex-esposo/Ex-esposa',
    'Amigo/Amiga',
    'Ninguno',
  ];

  Ocupacion: any[] = [
    'Empleado',
    'Independiente',
    'Hogar (Am@ de casa)',
    'Desempleado',
    'Otro',
  ];

  listaMotivosRetiro: any[] = [
    'Renuncia voluntaria',
    'Despido',
    'Reducción de personal',
    'Cierre de la empresa',
    'Fin de contrato temporal',
    'Abandono de cargo',
  ];

  listaAreas: any[] = ['Cultivo', 'Poscosecha', 'Ambas', 'Otro'];

  listaCalificaciones: any[] = ['Bajo', 'Medio', 'Excelente'];

  listaDuracion: any[] = [
    'Menos de un mes',
    '3 meses',
    '6 meses',
    '1 año',
    '2 años',
    'Mas de 2 años',
    'Toda la vida',
  ];

  listatiposVivienda: any[] = [
    'Casa',
    'Apartamento',
    'Casa-lote',
    'Finca',
    'Habitación',
  ];

  listaPosiblesRespuestasConquienVive: any[] = [
    'Amigos',
    'Abuelo',
    'Abuela',
    'Pareja',
    'Papa',
    'Mama',
    'Hermano',
    'Hermana',
    'Tio',
    'Tia',
    'Primo',
    'Prima',
    'Sobrino',
    'Sobrina',
  ];

  listaPersonasQueCuidan: any[] = [
    'Yo',
    'Pareja o esposa',
    'Amigos',
    'Jardín',
    'Son independientes',
    'Familiar',
    'Colegio',
    'Universidad',
    'Amig@s',
    'Niñera',
    'Dueña apartamento',
  ];

  listaPosiblesRespuestasPersonasACargo: any[] = [
    'Hijos',
    'Abuelos',
    'Papas',
    'Hermanos',
    'Personas con cuidados especialas',
    'Otro',
    'Tios',
  ];

  opcionesDeExperiencia: any[] = [
    'Sector Floricultor (Poscosecha- Clasificación, Boncheo, Empaque, Cuarto frío)',
    'Sector Floricultor (Calidad- Mipe)',
    'Sector Floricultor (área de mantenimiento- Ornatos, Trabajo en alturas, Mecánicos, Jefaturas y supervisión)',
    'Sector Comercial (Ventas)',
    'Sector Industrial (Alimentos- Textil- Transporte)',
    'Sector Financiero',
    'Sector Administrativo y Contable',
    'Sin experiencia',
  ];

  tiempoTrabajado: any[] = [
    'De 15 días a 1 mes (Una temporada)',
    'De 2 a 6 meses',
    'Más de 6 meses',
    'Un año o más',
    "Añadir opción o añadir respuesta 'Otro'",
  ];

  cursosDespuesColegio: any[] = [
    'Técnico',
    'Tecnólogo',
    'Universidad',
    'Especialización',
    'Ninguna',
    'Otros',
  ];
}


