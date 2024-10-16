import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
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




export class FormularioPublicoComponent implements OnInit {
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
      zonaResidencia: new FormControl('', Validators.required),
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

      // Experiencia Laboral 1
      nombreEmpresa1: new FormControl('',),
      direccionEmpresa1: new FormControl('',),
      telefonosEmpresa1: new FormControl('', [
        Validators.pattern(/^\d+$/),
      ]),
      nombreJefe1: new FormControl('',),
      fechaRetiro1: new FormControl('',), // Considera usar un DatePicker para fechas
      tiempoExperiencia: new FormControl('',),
      motivoRetiro1: new FormControl('',),
      cargoEmpresa1: new FormControl('',),
      empresas_laborado: new FormControl('',),
      labores_realizadas: new FormControl('',),
      rendimiento: new FormControl('',),
      porqueRendimiento: new FormControl('',),

      // informacion hijos
      numHijosDependientes: new FormControl('', [
        Validators.required,
        Validators.min(0),
        Validators.max(5),
      ]),
      cuidadorHijos: new FormControl('',),
      hijos: this.fb.array([]),

      // informacion con quien vive
      familiaSolo: new FormControl('', Validators.required),
      // vivienda
      numeroHabitaciones: new FormControl('', Validators.required),
      personasPorHabitacion: new FormControl('', Validators.required),
      tipoVivienda2: new FormControl('', Validators.required),
      caracteristicasVivienda: new FormControl('', Validators.required),

      areaExperiencia: new FormControl([]),  // Array vacío
      personas_a_cargo: new FormControl([]),

      conQuienViveChecks: new FormControl([], Validators.required),
      tiposViviendaChecks: new FormControl([], Validators.required),
      comodidadesChecks: new FormControl([], Validators.required),
      expectativasVidaChecks: new FormControl([], Validators.required),
      porqueLofelicitarian: new FormControl('', Validators.required),
      malentendido: new FormControl('', Validators.required),
      actividadesDi: new FormControl('', Validators.required),
      fuenteVacante: new FormControl('', Validators.required),
      como_es_su_relacion_familiar: new FormControl('', Validators.required),
      experienciaSignificativa: new FormControl('', Validators.required),
      motivacion: new FormControl('', Validators.required),

    });

    this.escucharNumeroDeHijos();



  }

  personasACargoOptions: string[] = ['Hijos', 'Abuelos', 'Papas', 'Hermanos', 'Personas con cuidados especiales', 'Ninguno'];


  async ngOnInit(): Promise<void> {
    this.cargarDatosJSON();

    try {
      this.escucharCambiosEnDepartamento();
    } catch (e) {
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
    if (this.formHojaDeVida.invalid) {
      Swal.fire({
        title: '¡Formulario incompleto!',
        text: 'Por favor, llena todos los campos obligatorios.',
        icon: 'warning',
        confirmButtonText: 'Aceptar',
      });
    }
    else {
      this.imprimirInformacion()
    }
    if (this.formHojaDeVida2.invalid) {
      Object.keys(this.formHojaDeVida2.controls).forEach(key => {
        const control = this.formHojaDeVida2.get(key);
        if (control?.invalid) {
          console.log(`El campo ${key} es inválido`, control.errors);
        }
      });
    }
    else {
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
        fechaRetiroEmpresa1: this.formHojaDeVida2.value.fechaRetiro1 ?? '',
        motivoRetiroEmpresa1: this.formHojaDeVida2.value.motivoRetiro1 ?? '',
        cargoEmpresa1: this.formHojaDeVida2.value.cargoEmpresa1 ?? '',
        empresas_laborado: this.formHojaDeVida2.value.empresas_laborado ?? '',
        labores_realizadas: this.formHojaDeVida2.value.labores_realizadas ?? '',
        rendimiento: this.formHojaDeVida2.value.rendimiento ?? '',
        porqueRendimiento: this.formHojaDeVida2.value.porqueRendimiento ?? '',

        familiaConUnSoloIngreso: this.formHojaDeVida2.value.familiaSolo,
        numHabitaciones: this.formHojaDeVida2.value.numeroHabitaciones,
        numPersonasPorHabitacion: this.formHojaDeVida2.value.personasPorHabitacion,
        tipoVivienda2p: this.formHojaDeVida2.value.tipoVivienda2, // Corregido para alinear con Django
        caracteristicasVivienda:
          this.formHojaDeVida2.value.caracteristicasVivienda,
        malentendido: this.formHojaDeVida2.value.malentendido,
        hijos: this.formHojaDeVida2.value.hijos,
        como_es_su_relacion_familiar: this.formHojaDeVida2.value.como_es_su_relacion_familiar,
        experienciaLaboral: this.formHojaDeVida2.value.experienciaLaboral,
        porqueLofelicitarian: this.formHojaDeVida2.value.porqueLofelicitarian,
        areaCultivoPoscosecha: this.formHojaDeVida2.value.areaCultivoPoscosecha ?? '',
        laboresRealizadas: this.formHojaDeVida2.value.laboresRealizadas ?? '',
        tiempoExperiencia: this.formHojaDeVida2.value.tiempoExperiencia ?? '',
        actividadesDi: this.formHojaDeVida2.value.actividadesDi ?? '',
        numHijosDependientes: this.formHojaDeVida2.value.numHijosDependientes ?? '',
        experienciaSignificativa: this.formHojaDeVida2.value.experienciaSignificativa ?? '',
        motivacion: this.formHojaDeVida2.value.motivacion ?? '',

        edadHijo1: this.formHojaDeVida2.value.edadHijo1 ?? '',
        edadHijo2: this.formHojaDeVida2.value.edadHijo2 ?? '',
        edadHijo3: this.formHojaDeVida2.value.edadHijo3 ?? '',
        edadHijo4: this.formHojaDeVida2.value.edadHijo4 ?? '',
        edadHijo5: this.formHojaDeVida2.value.edadHijo5 ?? '',
        cuidadorHijos: this.formHojaDeVida2.value.cuidadorHijos ?? '',

        fuenteVacante: this.formHojaDeVida2.value.fuenteVacante,

        areaExperiencia: Array.isArray(this.formHojaDeVida2.value.areaExperiencia) ?
          this.formHojaDeVida2.value.areaExperiencia.join(', ') : '',
        expectativasDeVida: Array.isArray(this.formHojaDeVida2.value.expectativasVidaChecks) ?
          this.formHojaDeVida2.value.expectativasVidaChecks.join(', ') : '',
        servicios: Array.isArray(this.formHojaDeVida2.value.comodidadesChecks) ?
          this.formHojaDeVida2.value.comodidadesChecks.join(', ') : '',
        tipoVivienda: Array.isArray(this.formHojaDeVida2.value.tiposViviendaChecks) ?
          this.formHojaDeVida2.value.tiposViviendaChecks.join(', ') : '',
        personasConQuienConvive: Array.isArray(this.formHojaDeVida2.value.conQuienViveChecks) ?
          this.formHojaDeVida2.value.conQuienViveChecks.join(', ') : '',
        personas_a_cargo: Array.isArray(this.formHojaDeVida2.value.personas_a_cargo) ?
          this.formHojaDeVida2.value.personas_a_cargo.join(', ') : '',

      };

      console.log(datosAEnviar);
      const upperCaseValues = this.convertValuesToUpperCase(datosAEnviar);


      const url = `${urlBack.url}/contratacion/subirParte2`; // Asegúrate de sustituir `elEndpointEspecifico` con el path correcto
      // Realizar la petición HTTP POST
      this.http.post(url, upperCaseValues).subscribe(
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

  }

  convertValuesToUpperCase(formValues: any): any {
    const upperCaseValues: { [key: string]: any } = {}; // Se especifica el tipo de 'upperCaseValues'
    
    for (const key in formValues) {
      if (formValues.hasOwnProperty(key) && typeof formValues[key] === 'string') {
        upperCaseValues[key] = formValues[key].toUpperCase();
      } else {
        upperCaseValues[key] = formValues[key];
      }
    }
    
    return upperCaseValues;
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
      barrio: this.formHojaDeVida.value.zonaResidencia,
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


    };

    console.log(datosAEnviar);
    const upperCaseValues = this.convertValuesToUpperCase(datosAEnviar);


    const url = `${urlBack.url}/contratacion/subirParte1`; // Asegúrate de sustituir `elEndpointEspecifico` con el path correcto

    // Realizar la petición HTTP POST
    this.http.post(url, upperCaseValues).subscribe(
      (response) => {
        console.log(response);
        /* swal y que cuando le de click a aceptar lo redireccione a la pagina de inicio */
        Swal.fire({
          title: '¡Datos guardados!',
          text: 'Los datos se guardaron correctamente. Puedes continuar con la segunda parte.',
          icon: 'success',
          confirmButtonText: 'Aceptar',
        })

      },
      (error) => {
        console.error(error.error.message);
      }
    );
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

    /* Mostrar un Swal de confirmación antes de proceder */
    Swal.fire({
      title: 'Confirmar búsqueda',
      text: `¿Deseas buscar la cédula ${this.numeroCedula}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, buscar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        // Si el usuario confirma, proceder con la búsqueda
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
            console.error(error);
            if (error.error.message.startsWith('No se encontraron datos para la cédula ingresada')) {
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
    });
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

      // SEXO, FECHA NACIMIENTO, DOCUMENTO DE IDENTIDAD, OCUPACION, Curso

      sexoHijo: new FormControl(datosHijo.sexo, Validators.required),

      fechaNacimientoHijo: new FormControl(
        datosHijo.fecha_nacimiento,
        Validators.required
      ),

      docIdentidadHijo: new FormControl(
        datosHijo.no_documento,
        Validators.required
      ),

      ocupacionHijo: new FormControl(datosHijo.estudia_o_trabaja, Validators.required),

      cursoHijo: new FormControl(datosHijo.curso, Validators.required),

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
          numeroCedula2: datosHoja.numerodeceduladepersona,
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
          zonaResidencia: datosHoja.barrio,
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
          cargoEmpresa1: datosHoja.cargoEmpresa1,
          empresas_laborado: datosHoja.empresas_laborado,
          labores_realizadas: datosHoja.labores_realizadas,
          rendimiento: datosHoja.rendimiento,
          porqueRendimiento: datosHoja.porqueRendimiento,

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

          areaExperiencia: datosHoja.area_experiencia ? datosHoja.area_experiencia.split(',').map((item: string) => item.trim()) : [],
          conQuienViveChecks: datosHoja.personas_con_quien_convive ? datosHoja.personas_con_quien_convive.split(',').map((item: string) => item.trim()) : [],
          tiposViviendaChecks: datosHoja.tipo_vivienda ? datosHoja.tipo_vivienda.split(',').map((item: string) => item.trim()) : [],
          comodidadesChecks: datosHoja.servicios ? datosHoja.servicios.split(',').map((item: string) => item.trim()) : [],
          expectativasVidaChecks: datosHoja.expectativas_de_vida ? datosHoja.expectativas_de_vida.split(',').map((item: string) => item.trim()) : [],
          personas_a_cargo: datosHoja.personas_a_cargo ? datosHoja.personas_a_cargo.split(',').map((item: string) => item.trim()) : [],


          como_es_su_relacion_familiar: datosHoja.como_es_su_relacion_familiar,
          porqueLofelicitarian: datosHoja.porqueLofelicitarian,
          malentendido: datosHoja.malentendido,
          actividadesDi: datosHoja.actividadesDi,
          experienciaSignificativa: datosHoja.experienciaSignificativa,
          motivacion: datosHoja.motivacion,

        });

        // Suponiendo que datosHoja.hijos es el array con los datos de los hijos
        this.llenarDatosHijos(datosHoja.hijos);

      } else {
        console.error(
          'La propiedad numerodeceduladepersona no se encontró en los datos recibidos'
        );
      }
    } else {
      console.error('No se recibieron datos para llenar el formulario');
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
      // SEXO, FECHA NACIMIENTO, DOCUMENTO DE IDENTIDAD, OCUPACION, Curso
      sexoHijo: new FormControl('', Validators.required),
      fechaNacimientoHijo: new FormControl('', Validators.required),
      docIdentidadHijo: new FormControl('', Validators.required),
      ocupacionHijo: new FormControl('', Validators.required),
      cursoHijo: new FormControl('', Validators.required),
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

  generos: any[] = ['M', 'F'];

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
  ];

  cursosDespuesColegio: any[] = [
    'Técnico',
    'Tecnólogo',
    'Universidad',
    'Especialización',
    'Ninguna',
    'Otros',
  ];



  areasExperiencia: string[] = [
    'Sector Floricultor (Poscosecha- Clasificación, Boncheo, Empaque, Cuarto frío)',
    'Sector Floricultor (Calidad- Mipe)',
    'Sector Floricultor (área de mantenimiento- Ornatos, Trabajo en alturas, Mecánicos, electricistas)',
    'Jefaturas y supervisión',
    'Sector Comercial (Ventas)',
    'Sector Industrial (Alimentos- Textil- Transporte)',
    'Sector Financiero',
    'Sector Administrativo y Contable',
    'Sin experiencia'
  ];

}


