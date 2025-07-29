import { Component, OnInit } from '@angular/core';
import { SharedModule } from '../../../../../../shared/shared-module';
import { FormArray, FormBuilder, FormControl, FormGroup, FormsModule, Validators } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PoliciesModal } from '../../components/policies-modal/policies-modal';
import { FormDataS } from '../../services/form-data-s/form-data-s';
import Swal from 'sweetalert2';
import { CandidateS } from '../../../../../../shared/services/candidate-s/candidate-s';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-form-vacancies-test',
  imports: [
    SharedModule,
    FormsModule,
    MatDialogModule
  ],
  templateUrl: './form-vacancies-test.html',
  styleUrl: './form-vacancies-test.css'
})
export class FormVacanciesTest implements OnInit {
  mostrarFormulario: boolean = false;
  numeroCedula!: any;
  formulario_vacantes!: FormGroup;
  debounceTimeout: any;
  mostrarSubirHojaVida = false;
  mostrarCamposAdicionales: boolean = false;
  uploadedFiles: { [key: string]: { file: File; fileName: string } } = {}; // Almacenar tanto el archivo como el nombre
  typeMap: { [key: string]: number } = {
    hojaDeVida: 28,
    hojaDeVidaGenerada: 28,
  };

  // Departamento y ciudadades
  datos: any; // Puedes tipar esto mejor según la estructura de tu JSON
  ciudadesResidencia: string[] = [];
  ciudadesExpedicionCC: string[] = [];
  ciudadesNacimiento: string[] = [];

  // Eps
  epsList: string[] = [
    'COOSALUD EPS-S',
    'NUEVA EPS',
    'MUTUAL SER',
    'ALIANSALUD EPS',
    'SALUD TOTAL EPS S.A.',
    'EPS SANITAS',
    'EPS SURA',
    'FAMISANAR',
    'SERVICIO OCCIDENTAL DE SALUD EPS SOS',
    'SALUD MIA',
    'COMFENALCO VALLE',
    'COMPENSAR EPS',
    'EPM - EMPRESAS PÚBLICAS DE MEDELLÍN',
    'FONDO DE PASIVO SOCIAL DE FERROCARRILES',
    'NACIONALES DE COLOMBIA',
    'CAJACOPI ATLÁNTICO',
    'COMFACHOCO',
    'COMFAORIENTE',
    'EPS FAMILIAR DE COLOMBIA',
    'ASMET SALUD',
    'EMSSANAR',
    'CAPITAL SALUD EPS-S',
    'SAVIA SALUD EPS',
    'DUSAKAWI E.P.S.I.',
    'ANAS WAYUU E.P.S.I.',
    'MALLAMAS E.P.S.I.',
    'PIJAOS SALUD E.P.S.I.',
    'SALUD BÓLIVAR EPS SAS',
    'MUTUAL SER EPS'
  ];



  // Arreglos para los mat selects
  tipoDocumento: any = [];
  generos: any = [];
  estadosCiviles: any = [];
  tiposRh: any = [];
  manoDominante: any = [];
  tiempoResidencia: any = [];
  opcionBinaria: any = [];
  parentescosFamiliares: any = [];
  ocupaciones: any = [];
  sedes: any = [];
  nivelesEstudio: any = [];
  estudiosDespuesDelColegio: any = [];
  tallasRopa: any = [];
  tallasCalzado: any = [];
  duracionTiempo: any = [];
  areasExperiencia: any = [];
  personasACargo: any = [];
  conQuienVive: any = [];
  personasACargoExtendidas: any = [];
  tiposVivienda: any = [];
  tiposViviendaPropiedad: any = [];
  caracteristicasVivienda: any = [];
  comodidadesVivienda: any = [];
  expectativasVida: any = [];
  fuenteVacante: any = [];
  categoriasLicencia: any = [];
  tiposContrato: any = [];
  duracionTrabajo: any = [];

  constructor(
    private dialog: MatDialog,
    private personalDataFormService: FormDataS,
    private candidateService: CandidateS,
    private http: HttpClient,
    private fb: FormBuilder,
  ) {
    // Inicializa el formulario aquí si es necesario
    this.formulario_vacantes = new FormGroup({
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

      numWha: new FormControl('', [Validators.pattern(/^\d{10}$/)]),

      departamento: new FormControl('', Validators.required), // Cambié 'genero' por 'departamento' para que sea más descriptivo
      ciudad: new FormControl({ value: '', disabled: true }),

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
      nacionalidad: new FormControl('', Validators.required),

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
      oficina: new FormControl('', Validators.required),

      estudiaActualmente: new FormControl('', Validators.required),

      escolaridad: new FormControl('', Validators.required),
      nombreInstitucion: new FormControl('', Validators.required),
      anoFinalizacion: new FormControl('', [Validators.required]),
      tituloObtenido: new FormControl('', Validators.required),
      estudiosExtrasSelect: new FormControl([]), // Control para el mat-select
      estudiosExtras: this.fb.array([]), // FormArray para los campos dinámicos

      tallaChaqueta: new FormControl('', Validators.required),
      tallaPantalon: new FormControl('', Validators.required),
      tallaCamisa: new FormControl('', Validators.required),
      tallaCalzado: new FormControl('', Validators.required),

      // conyugue
      nombresConyuge: new FormControl(''),
      viveConyuge: new FormControl(''), // Podría ser un booleano o un string dependiendo de cómo quieras manejarlo

      documentoIdentidadConyuge: new FormControl('', [
        Validators.pattern(/^\d+$/),
      ]),
      direccionConyuge: new FormControl(''),
      telefonoConyuge: new FormControl('', [Validators.pattern(/^\d+$/)]),
      barrioConyuge: new FormControl(''),
      ocupacionConyuge: new FormControl(''),

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
      nombreEmpresa1: new FormControl(''),
      direccionEmpresa1: new FormControl(''),
      telefonosEmpresa1: new FormControl('', [Validators.pattern(/^\d+$/)]),
      nombreJefe1: new FormControl(''),
      fechaRetiro1: new FormControl(''), // Considera usar un DatePicker para fechas
      tiempoExperiencia: new FormControl(''),
      motivoRetiro1: new FormControl(''),
      cargoEmpresa1: new FormControl(''),
      empresas_laborado: new FormControl(''),
      labores_realizadas: new FormControl(''),
      rendimiento: new FormControl(''),
      porqueRendimiento: new FormControl(''),

      // informacion hijos
      numHijosDependientes: new FormControl('', [
        Validators.required,
        Validators.min(0),
        Validators.max(5),
      ]),
      cuidadorHijos: new FormControl(''),
      hijos: this.fb.array([]),

      // informacion con quien vive
      familiaSolo: new FormControl('', Validators.required),
      // vivienda
      numeroHabitaciones: new FormControl('', Validators.required),
      personasPorHabitacion: new FormControl('', Validators.required),
      tipoVivienda2: new FormControl('', Validators.required),
      caracteristicasVivienda: new FormControl('', Validators.required),

      areaExperiencia: new FormControl([]), // Array vacío
      personas_a_cargo: new FormControl([], Validators.required),

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

      deseaGenerar: new FormControl(false),
      hojaDeVida: new FormControl(''),
      tieneVehiculo: new FormControl(''),
      licenciaConduccion: new FormControl(''),
      categoriaLicencia: new FormControl([]),
      estaTrabajando: new FormControl(''),
      empresaActual: new FormControl(''),
      tipoTrabajo: new FormControl(''),
      tipoContrato: new FormControl(''),
      trabajoAntes: new FormControl(''),
      solicitoAntes: new FormControl(''),

      tieneParientes: new FormControl(''),
      nombrePariente: new FormControl(''),

      aficiones: new FormControl(''),
      practicaDeportes: new FormControl(''),
      cualDeporte: new FormControl(''),

      tieneHermanos: new FormControl(''),
      numeroHermanos: new FormControl(''),
      hermanos: this.fb.array([]), // Array para almacenar la información de los hermanos

      direccionReferenciaPersonal1: new FormControl('', Validators.required),
      direccionReferenciaPersonal2: new FormControl('', Validators.required),
      direccionReferenciaFamiliar1: new FormControl('', Validators.required),
    });
  }

  async ngOnInit(): Promise<void> {
    this.numeroCedula = localStorage.getItem('cedula') || '';

    // Si hay cédula y es válida, hacer búsqueda automática al cargar
    if (this.numeroCedula) {
      // Aquí puedes llamar directo el método:
      this.buscarCedulaAuto(this.numeroCedula);
    }
    this.openDialog();

    (await this.personalDataFormService.traerSucursales()).subscribe(
      (data: any) => {
        // ordenar por nombre
        data.sucursal.sort((a: any, b: any) =>
          a.nombre.localeCompare(b.nombre)
        );
        this.sedes = data.sucursal;
      }
    );

    this.personalDataFormService.searchOptionForms().subscribe((data: any) => {
      // Tipos de Identificación
      this.tipoDocumento = data[1].opciones;
      // generos
      this.generos = data[2].opciones;
      // estadosCiviles
      this.estadosCiviles = data[4].opciones;
      // "Tipos de Sangre"
      this.tiposRh = data[5].opciones;
      // "Dominancia Manual"
      this.manoDominante = data[7].opciones;
      // "Tiempo de Residencia"
      this.tiempoResidencia = data[3].opciones;
      // "Opción Binaria"
      this.opcionBinaria = data[6].opciones;
      // "Parentescos Familiares"
      this.parentescosFamiliares = data[17].opciones;
      // "Ocupaciones"
      this.ocupaciones = data[18].opciones;
      // "Niveles de Escolaridad"
      this.nivelesEstudio = data[13].opciones;
      // "Cursos Después del Colegio"
      this.estudiosDespuesDelColegio = data[26].opciones;
      // "Tallas de Ropa"
      this.tallasRopa = data[15].opciones;
      // "Tallas de Calzado"
      this.tallasCalzado = data[16].opciones;
      // "Duración de Tiempo"
      this.duracionTiempo = data[20].opciones;
      // "Áreas de Experiencia"
      this.areasExperiencia = data[23].opciones;
      // "Personas a Cargo"
      this.personasACargo = data[24].opciones;
      // "Con Quién Vive"
      this.conQuienVive = data[22].opciones;
      // "Personas a Cargo (Opciones Extendidas)"
      this.personasACargoExtendidas = data[27].opciones;
      // "Tipos de Vivienda"
      this.tiposVivienda = data[8].opciones;
      // "Formas de Tenencia de Vivienda"
      this.tiposViviendaPropiedad = data[9].opciones;
      // "Características de la Vivienda"
      this.caracteristicasVivienda = data[10].opciones;
      // "Comodidades de Vivienda"
      this.comodidadesVivienda = data[11].opciones;
      // "Expectativas de Vida"
      this.expectativasVida = data[12].opciones;
      // "Origen de Promoción"
      this.fuenteVacante = data[0].opciones;
      // "CATEGORÍAS DE LICENCIA"
      this.categoriasLicencia = data[28].opciones;
      // "TIPOS DE CONTRATO"
      this.tiposContrato = data[29].opciones;
      // "Duración del Trabajo"
      this.duracionTrabajo = data[25].opciones;
    });

    this.cargarDatosJSON();

    try {
      this.escucharCambiosEnDepartamento();
    } catch (e) { }

    this.formulario_vacantes
      .get('numHijosDependientes')!
      .valueChanges.subscribe((numHijos) => {
        this.actualizarEdadesHijos(numHijos);
      });

    this.formulario_vacantes.get('departamentoNacimiento')?.valueChanges.subscribe(depto => {
      if (depto && depto.toUpperCase() === 'VENEZUELA') {
        this.formulario_vacantes.get('nacionalidad')?.setValue('VENEZOLANA');
      } else if (depto) {
        this.formulario_vacantes.get('nacionalidad')?.setValue('COLOMBIANA');
      }
      // Deshabilita el control siempre (opcional: puedes alternar enabled/disabled según la lógica)
      this.formulario_vacantes.get('nacionalidad')?.disable({ onlySelf: true });
    });

  }

  async cargarDatosJSON(): Promise<void> {
    this.http.get('/files/utils/colombia.json').subscribe((data) => {
      this.datos = data;
    });
  }

  // Función para extraer el contenido del otro html
  openDialog(): void {
    const dialogRef = this.dialog.open(PoliciesModal, {
      disableClose: true, // Esto evita que el modal se cierre al hacer clic fuera de él
    });

    dialogRef.afterClosed().subscribe((result) => { });
  }

  // Detecta cambios en el input
  onCedulaChange(valor: any) {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    if (!valor || valor.toString().length < 8) {
      this.mostrarFormulario = false;
      return;
    }

    this.debounceTimeout = setTimeout(() => {
      this.buscarCedulaAuto(valor);
    }, 500);
  }

  buscarCedulaAuto(cedula: string) {
    if (!cedula) {
      return;
    }

    localStorage.setItem('cedula', cedula);

    this.candidateService.buscarCandidatoPorCedula(cedula)
      .subscribe({
        next: (response: any) => {
          this.llenarFormularioConDatos(response);
          if (response.data.length > 0) {
            this.mostrarFormulario = true;
            Swal.fire({
              title: 'Cédula encontrada',
              text: 'Actualiza tus datos',
              icon: 'success',
              confirmButtonText: 'Aceptar',
            });
          } else {
            Swal.fire({
              title: 'Cédula no encontrada',
              text: 'Procede a llenar el formulario con los datos por favor.',
              icon: 'success',
              confirmButtonText: 'Aceptar',
            });
            this.mostrarFormulario = true;
          }
        },
        error: (error) => {
          console.error('Error al buscar cédula:', error);
          // si el error es 404, significa que no se encontró la cédula
          if (error.status === 404) {
            Swal.fire({
              title: 'Cédula no encontrada',
              text: 'Procede a llenar el formulario con los datos por favor.',
              icon: 'info',
              confirmButtonText: 'Aceptar',
            });
            this.mostrarFormulario = true;
          } else {
            Swal.fire({
              title: 'Error al buscar cédula',
              text: 'Ocurrió un error al buscar la cédula. Por favor, intenta nuevamente.',
              icon: 'error',
              confirmButtonText: 'Aceptar',
            });
          }
        }
      });
  }

  ngOnDestroy() {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
  }

  normalizeText(text: string): string {
    return text
      ? text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remueve los acentos
        .trim() // Remueve espacios adicionales
      : '';
  }

  booleanToText(value: boolean | string): string {
    if (typeof value === 'boolean') {
      return value ? 'SÍ' : 'NO';
    }

    const normalizedValue = this.normalizeText(value);

    // Comprobaciones para valores que representan "verdadero"
    const trueValues = ['si', 'sí', 'true', '1'];
    if (trueValues.includes(normalizedValue)) {
      return 'SÍ';
    }

    // Comprobaciones para valores que representan "falso"
    const falseValues = ['no', 'false', '0'];
    if (falseValues.includes(normalizedValue)) {
      return 'NO';
    }

    // Si no coincide, retorna vacío
    return '';
  }

  booleanToNormalizedText(value: boolean | string): string {
    return this.normalizeText(this.booleanToText(value));
  }

  toTitleCase(str: string | null | undefined): string {
    if (!str || typeof str !== 'string') {
      return '';
    }

    const minorWords = ['del', 'de', 'y', 'la', 'el', 'en', 'a'];
    const words = str.toLowerCase().split(' ');

    return words
      .map((word, index) => {
        if (index === 0 || !minorWords.includes(word)) {
          return word.charAt(0).toUpperCase() + word.slice(1);
        } else {
          return word;
        }
      })
      .join(' ');
  }

  normalizeString2(str: string): string {
    return str.normalize('NFC');
  }


  llenarFormularioConDatos(datos: any) {
    console.log(datos.data[0]);
    if (datos.data && datos.data.length > 0) {
      let datosHoja = datos.data[0]; // Asume que quieres llenar el formulario con el primer objeto en el array 'data'

      const fechaExpedicion =
        datosHoja.fecha_expedicion_cc !== '-'
          ? new Date(
            datosHoja.fecha_expedicion_cc.split('/').reverse().join('-')
          ) // Convierte "03/01/2025" a un formato válido para Date
          : null;

      // fecha_nacimiento
      const fechaNacimiento =
        datosHoja.fecha_nacimiento !== '-'
          ? new Date(datosHoja.fecha_nacimiento.split('/').reverse().join('-')) // Convierte "03/01/2025" a un formato válido para Date
          : null;

      // ano_finalizacion
      const anoFinalizacionRaw = datosHoja.ano_finalizacion;

      const anoFinalizacion = anoFinalizacionRaw && anoFinalizacionRaw !== '-' && anoFinalizacionRaw.trim() !== ''
        ? new Date(anoFinalizacionRaw.split('/').reverse().join('-'))
        : null;


      // fecha_retiro_empresa1
      const fechaRetiroEmpresa1Raw = datosHoja.fecha_retiro_empresa1;

      const fechaRetiroEmpresa1 =
        fechaRetiroEmpresa1Raw &&
          fechaRetiroEmpresa1Raw !== '-' &&
          fechaRetiroEmpresa1Raw.trim() !== ''
          ? new Date(fechaRetiroEmpresa1Raw.split('/').reverse().join('-'))
          : null;


      // Lógica para asignar valor al formulario
      const estudiaActualmenteNormalized =
        datosHoja.estudia_actualmente !== '-'
          ? this.normalizeText(datosHoja.estudia_actualmente)
          : '';

      // vive_con_el_conyugue
      const viveConyugueNormalized =
        datosHoja.vive_con_el_conyugue !== '-'
          ? this.normalizeText(datosHoja.vive_con_el_conyugue)
          : '';

      // elPadreVive
      const elPadreViveNormalized =
        datosHoja.vive_padre !== '-'
          ? this.normalizeText(datosHoja.vive_padre)
          : '';

      // madreVive
      const madreViveNormalized =
        datosHoja.vive_madre !== '-'
          ? this.normalizeText(datosHoja.vive_madre)
          : '';

      // experienciaLaboral
      const experienciaLaboralNormalized =
        datosHoja.tiene_experiencia_laboral !== '-'
          ? this.normalizeText(datosHoja.tiene_experiencia_laboral)
          : '';

      // familia_con_un_solo_ingreso
      // familia_con_un_solo_ingreso
      const familiaConUnSoloIngresoNormalized =
        datosHoja.familia_con_un_solo_ingreso !== '-'
          ? this.booleanToNormalizedText(datosHoja.familia_con_un_solo_ingreso)
          : '';

      //
      const depForm = this.toTitleCase(datosHoja.departamento); // Este viene "ANTIOQUIA"

      // municipio
      const munForm = this.toTitleCase(datosHoja.municipio);

      // departamentoExpedicionCC
      const depExpForm = this.toTitleCase(datosHoja.departamento_expedicion_cc); // Este viene "ANTIOQUIA"

      // municipioExpedicionCC
      const munExpForm = this.toTitleCase(datosHoja.municipio_expedicion_cc);

      // departamentoNacimiento
      const depNacForm = this.toTitleCase(datosHoja.lugar_nacimiento_departamento); // Este viene "ANTIOQUIA"

      // municipioNacimiento
      const munNacForm = this.toTitleCase(datosHoja.lugar_nacimiento_municipio);

      //this.actualizarEdadesHijos(datosHoja.num_hijos_dependen_economicamente);
      if (datosHoja && datosHoja.numerodeceduladepersona !== undefined) {
        this.formulario_vacantes.patchValue({
          tipoDoc:
            datosHoja.tipodedocumento !== '-' ? datosHoja.tipodedocumento : '',
          numeroCedula:
            datosHoja.numerodeceduladepersona !== '-'
              ? datosHoja.numerodeceduladepersona
              : '',
          numeroCedula2:
            datosHoja.numerodeceduladepersona !== '-'
              ? datosHoja.numerodeceduladepersona
              : '',
          pApellido:
            datosHoja.primer_apellido !== '-' ? datosHoja.primer_apellido : '',
          sApellido:
            datosHoja.segundo_apellido !== '-'
              ? datosHoja.segundo_apellido
              : '',
          pNombre:
            datosHoja.primer_nombre !== '-' ? datosHoja.primer_nombre : '',
          sNombre:
            datosHoja.segundo_nombre !== '-' ? datosHoja.segundo_nombre : '',
          genero: datosHoja.genero !== '-' ? datosHoja.genero : '',
          correo:
            datosHoja.primercorreoelectronico !== '-'
              ? datosHoja.primercorreoelectronico
              : '',
          numCelular: datosHoja.celular !== '-' ? datosHoja.celular : '',
          numWha: datosHoja.whatsapp !== '-' ? datosHoja.whatsapp : '',
          departamento: depForm,
          ciudad: munForm,
          estadoCivil:
            datosHoja.estado_civil !== '-' ? datosHoja.estado_civil : '',
          direccionResidencia:
            datosHoja.direccion_residencia !== '-'
              ? datosHoja.direccion_residencia
              : '',
          zonaResidencia: datosHoja.barrio !== '-' ? datosHoja.barrio : '',
          fechaExpedicionCC: fechaExpedicion,
          departamentoExpedicionCC: depExpForm,
          municipioExpedicionCC: munExpForm,
          departamentoNacimiento: depNacForm,
          municipioNacimiento: munNacForm,
          rh: datosHoja.rh !== '-' ? datosHoja.rh : '',
          lateralidad:
            datosHoja.zurdo_diestro !== '-' ? datosHoja.zurdo_diestro : '',
          tiempoResidenciaZona:
            datosHoja.hacecuantoviveenlazona !== '-'
              ? datosHoja.hacecuantoviveenlazona
              : '',
          lugarAnteriorResidencia:
            datosHoja.lugar_anterior_residencia !== '-'
              ? datosHoja.lugar_anterior_residencia
              : '',
          razonCambioResidencia:
            datosHoja.hace_cuanto_se_vino_y_porque !== '-'
              ? datosHoja.hace_cuanto_se_vino_y_porque
              : '',
          zonasConocidas:
            datosHoja.zonas_del_pais !== '-' ? datosHoja.zonas_del_pais : '',
          preferenciaResidencia:
            datosHoja.donde_le_gustaria_vivir !== '-'
              ? datosHoja.donde_le_gustaria_vivir
              : '',
          fechaNacimiento: fechaNacimiento,
          estudiaActualmente:
            estudiaActualmenteNormalized === 'si'
              ? 'SÍ' // Coincide con la opción del select
              : estudiaActualmenteNormalized === 'no'
                ? 'NO' // Coincide con la opción del select
                : null, // Valor vacío si no es "si" ni "no"
          familiarEmergencia:
            datosHoja.familiar_emergencia !== '-'
              ? datosHoja.familiar_emergencia
              : '',
          parentescoFamiliarEmergencia:
            datosHoja.parentesco_familiar_emergencia !== '-'
              ? datosHoja.parentesco_familiar_emergencia
              : '',
          direccionFamiliarEmergencia:
            datosHoja.direccion_familiar_emergencia !== '-'
              ? datosHoja.direccion_familiar_emergencia
              : '',
          barrioFamiliarEmergencia:
            datosHoja.barrio_familiar_emergencia !== '-'
              ? datosHoja.barrio_familiar_emergencia
              : '',
          telefonoFamiliarEmergencia:
            datosHoja.telefono_familiar_emergencia !== '-'
              ? datosHoja.telefono_familiar_emergencia
              : '',
          ocupacionFamiliar_Emergencia:
            datosHoja.ocupacion_familiar_emergencia !== '-'
              ? datosHoja.ocupacion_familiar_emergencia
              : '',
          oficina: datosHoja.oficina !== '-' ? datosHoja.oficina : '',

          // Datos académicos
          escolaridad:
            datosHoja.escolaridad !== '-' ? datosHoja.escolaridad : '',
          nombreInstitucion:
            datosHoja.nombre_institucion !== '-'
              ? datosHoja.nombre_institucion
              : '',
          anoFinalizacion: anoFinalizacion,
          tituloObtenido:
            datosHoja.titulo_obtenido !== '-' ? datosHoja.titulo_obtenido : '',

          // Datos tallas
          tallaChaqueta: datosHoja.chaqueta !== '-' ? datosHoja.chaqueta : '',
          tallaPantalon: datosHoja.pantalon !== '-' ? datosHoja.pantalon : '',
          tallaCamisa: datosHoja.camisa !== '-' ? datosHoja.camisa : '',
          tallaCalzado: datosHoja.calzado !== '-' ? datosHoja.calzado : '',

          // Datos conyuge
          nombresConyuge:
            datosHoja.nombre_conyugue !== '-' ? datosHoja.nombre_conyugue : '',
          apellidosConyuge:
            datosHoja.apellido_conyugue !== '-'
              ? datosHoja.apellido_conyugue
              : '',
          documentoIdentidadConyuge:
            datosHoja.num_doc_identidad_conyugue !== '-'
              ? datosHoja.num_doc_identidad_conyugue
              : '',
          viveConyuge:
            viveConyugueNormalized === 'si'
              ? 'SÍ' // Coincide con la opción del select
              : viveConyugueNormalized === 'no'
                ? 'NO' // Coincide con la opción del select
                : null, // Valor vacío si no es "si" ni "no"
          direccionConyuge:
            datosHoja.direccion_conyugue !== '-'
              ? datosHoja.direccion_conyugue
              : '',
          telefonoConyuge:
            datosHoja.telefono_conyugue !== '-'
              ? datosHoja.telefono_conyugue
              : '',
          barrioConyuge:
            datosHoja.barrio_municipio_conyugue !== '-'
              ? datosHoja.barrio_municipio_conyugue
              : '',
          ocupacionConyuge:
            datosHoja.ocupacion_conyugue !== '-'
              ? datosHoja.ocupacion_conyugue
              : '',

          // Datos padres
          nombrePadre:
            datosHoja.nombre_padre !== '-' ? datosHoja.nombre_padre : '',
          elPadreVive:
            elPadreViveNormalized === 'si'
              ? 'SÍ' // Coincide con la opción del select
              : elPadreViveNormalized === 'no'
                ? 'NO' // Coincide con la opción del select
                : null, // Valor vacío si no es "si" ni "no"
          ocupacionPadre:
            datosHoja.ocupacion_padre !== '-' ? datosHoja.ocupacion_padre : '',
          direccionPadre:
            datosHoja.direccion_padre !== '-' ? datosHoja.direccion_padre : '',
          telefonoPadre:
            datosHoja.telefono_padre !== '-' ? datosHoja.telefono_padre : '',
          barrioPadre:
            datosHoja.barrio_padre !== '-' ? datosHoja.barrio_padre : '',

          // Datos madre
          nombreMadre:
            datosHoja.nombre_madre !== '-' ? datosHoja.nombre_madre : '',
          madreVive:
            madreViveNormalized === 'si'
              ? 'SÍ' // Coincide con la opción del select
              : madreViveNormalized === 'no'
                ? 'NO' // Coincide con la opción del select
                : null, // Valor vacío si no es "si" ni "no"
          ocupacionMadre:
            datosHoja.ocupacion_madre !== '-' ? datosHoja.ocupacion_madre : '',
          direccionMadre:
            datosHoja.direccion_madre !== '-' ? datosHoja.direccion_madre : '',
          telefonoMadre:
            datosHoja.telefono_madre !== '-' ? datosHoja.telefono_madre : '',
          barrioMadre:
            datosHoja.barrio_madre !== '-' ? datosHoja.barrio_madre : '',

          // Datos referencias
          nombreReferenciaPersonal1:
            datosHoja.nombre_referencia_personal1 !== '-'
              ? datosHoja.nombre_referencia_personal1
              : '',
          telefonoReferencia1:
            datosHoja.telefono_referencia_personal1 !== '-'
              ? datosHoja.telefono_referencia_personal1
              : '',
          ocupacionReferencia1:
            datosHoja.ocupacion_referencia_personal1 !== '-'
              ? datosHoja.ocupacion_referencia_personal1
              : '',
          tiempoConoceReferenciaPersonal1:
            datosHoja.tiempo_conoce_referencia_personal1 !== '-'
              ? datosHoja.tiempo_conoce_referencia_personal1
              : '',
          direccionReferenciaPersonal1:
            datosHoja.direccion_referencia_personal1 !== '-'
              ? datosHoja.direccion_referencia_personal1
              : '',

          nombreReferenciaPersonal2:
            datosHoja.nombre_referencia_personal2 !== '-'
              ? datosHoja.nombre_referencia_personal2
              : '',
          telefonoReferencia2:
            datosHoja.telefono_referencia_personal2 !== '-'
              ? datosHoja.telefono_referencia_personal2
              : '',
          ocupacionReferencia2:
            datosHoja.ocupacion_referencia_personal2 !== '-'
              ? datosHoja.ocupacion_referencia_personal2
              : '',
          tiempoConoceReferenciaPersonal2:
            datosHoja.tiempo_conoce_referencia_personal2 !== '-'
              ? datosHoja.tiempo_conoce_referencia_personal2
              : '',
          direccionReferenciaPersonal2:
            datosHoja.direccion_referencia_personal2 !== '-'
              ? datosHoja.direccion_referencia_personal2
              : '',

          nombreReferenciaFamiliar1:
            datosHoja.nombre_referencia_familiar1 !== '-'
              ? datosHoja.nombre_referencia_familiar1
              : '',
          telefonoReferenciaFamiliar1:
            datosHoja.telefono_referencia_familiar1 !== '-'
              ? datosHoja.telefono_referencia_familiar1
              : '',
          ocupacionReferenciaFamiliar1:
            datosHoja.ocupacion_referencia_familiar1 !== '-'
              ? datosHoja.ocupacion_referencia_familiar1
              : '',
          parentescoReferenciaFamiliar1:
            datosHoja.parentesco_referencia_familiar1 !== '-'
              ? datosHoja.parentesco_referencia_familiar1
              : '',
          direccionReferenciaFamiliar1:
            datosHoja.direccion_referencia_familiar1 !== '-'
              ? datosHoja.direccion_referencia_familiar1
              : '',

          nombreReferenciaFamiliar2:
            datosHoja.nombre_referencia_familiar2 !== '-'
              ? datosHoja.nombre_referencia_familiar2
              : '',
          telefonoReferenciaFamiliar2:
            datosHoja.telefono_referencia_familiar2 !== '-'
              ? datosHoja.telefono_referencia_familiar2
              : '',
          ocupacionReferenciaFamiliar2:
            datosHoja.ocupacion_referencia_familiar2 !== '-'
              ? datosHoja.ocupacion_referencia_familiar2
              : '',
          parentescoReferenciaFamiliar2:
            datosHoja.parentesco_referencia_familiar2 !== '-'
              ? datosHoja.parentesco_referencia_familiar2
              : '',

          experienciaLaboral:
            experienciaLaboralNormalized === 'si'
              ? 'SÍ' // Coincide con la opción del select
              : experienciaLaboralNormalized === 'no'
                ? 'NO' // Coincide con la opción del select
                : null, // Valor vacío si no es "si" ni "no"
          nombreEmpresa1:
            datosHoja.nombre_expe_laboral1_empresa !== '-'
              ? datosHoja.nombre_expe_laboral1_empresa
              : '',
          direccionEmpresa1:
            datosHoja.direccion_empresa1 !== '-'
              ? datosHoja.direccion_empresa1
              : '',
          telefonosEmpresa1:
            datosHoja.telefonos_empresa1 !== '-'
              ? datosHoja.telefonos_empresa1
              : '',
          nombreJefe1:
            datosHoja.nombre_jefe_empresa1 !== '-'
              ? datosHoja.nombre_jefe_empresa1
              : '',
          cargoEmpresa1:
            datosHoja.cargo_empresa1 !== '-' ? datosHoja.cargo_empresa1 : '',

          // areaExperiencia
          areaExperiencia:
            datosHoja.area_experiencia &&
              datosHoja.area_experiencia !== '-' &&
              datosHoja.area_experiencia.trim() !== ''
              ? datosHoja.area_experiencia
                .split(',')
                .map((item: string) => item.trim())
              : [],

          fechaRetiro1: fechaRetiroEmpresa1,
          tiempoExperiencia:
            datosHoja.tiempo_experiencia !== '-'
              ? datosHoja.tiempo_experiencia
              : '',
          motivoRetiro1:
            datosHoja.motivo_retiro_empresa1 !== '-'
              ? datosHoja.motivo_retiro_empresa1
              : '',
          empresas_laborado:
            datosHoja.empresas_laborado !== '-'
              ? datosHoja.empresas_laborado
              : '',
          labores_realizadas:
            datosHoja.labores_realizadas !== '-'
              ? datosHoja.labores_realizadas
              : '',
          rendimiento:
            datosHoja.rendimiento !== '-' ? datosHoja.rendimiento : '',
          porqueRendimiento:
            datosHoja.porqueRendimiento !== '-'
              ? datosHoja.porqueRendimiento
              : '',
          porqueLofelicitarian:
            datosHoja.porqueLofelicitarian !== '-'
              ? datosHoja.porqueLofelicitarian
              : '',
          malentendido:
            datosHoja.malentendido !== '-' ? datosHoja.malentendido : '',

          familiaSolo:
            familiaConUnSoloIngresoNormalized === 'si'
              ? 'SÍ' // Coincide con la opción del select
              : familiaConUnSoloIngresoNormalized === 'no'
                ? 'NO' // Coincide con la opción del select
                : null, // Valor vacío si no es "si" ni "no"

          como_es_su_relacion_familiar:
            datosHoja.como_es_su_relacion_familiar !== '-'
              ? datosHoja.como_es_su_relacion_familiar
              : '',

          numeroHabitaciones:
            datosHoja.num_habitaciones !== '-'
              ? parseFloat(datosHoja.num_habitaciones)
              : '',
          personasPorHabitacion:
            datosHoja.num_personas_por_habitacion !== '-'
              ? parseFloat(datosHoja.num_personas_por_habitacion)
              : '',
          caracteristicasVivienda:
            datosHoja.caractteristicas_vivienda !== '-'
              ? datosHoja.caractteristicas_vivienda
              : '',
          tipoVivienda2:
            datosHoja.tipo_vivienda_2p !== '-'
              ? datosHoja.tipo_vivienda_2p
              : '',

          fuenteVacante:
            datosHoja.como_se_entero !== '-' ? datosHoja.como_se_entero : '',
          actividadesDi:
            datosHoja.actividadesDi !== '-' ? datosHoja.actividadesDi : '',
          experienciaSignificativa:
            datosHoja.experienciaSignificativa !== '-'
              ? datosHoja.experienciaSignificativa
              : '',
          motivacion: datosHoja.motivacion !== '-' ? datosHoja.motivacion : '',
          conQuienViveChecks: datosHoja.personas_con_quien_convive
            ? datosHoja.personas_con_quien_convive
              .split(',')
              .map((item: string) => item.trim())
            : [],
          personas_a_cargo: datosHoja.personas_a_cargo
            ? datosHoja.personas_a_cargo
              .split(',')
              .map((item: string) => item.trim())
            : [],
          tiposViviendaChecks: datosHoja.tipo_vivienda
            ? datosHoja.tipo_vivienda
              .split(',')
              .map((item: string) => item.trim())
            : [],
          comodidadesChecks: datosHoja.servicios
            ? datosHoja.servicios.split(',').map((item: string) => item.trim())
            : [],
          expectativasVidaChecks: datosHoja.expectativas_de_vida
            ? datosHoja.expectativas_de_vida
              .split(',')
              .map((item: string) => item.trim())
            : [],

          numHijosDependientes:
            datosHoja.num_hijos_dependen_economicamente !== '-'
              ? datosHoja.num_hijos_dependen_economicamente
              : '',
          cuidadorHijos:
            datosHoja.quien_los_cuida !== '-' ? datosHoja.quien_los_cuida : '',
          edadHijo1: datosHoja.edad_hijo1 !== '-' ? datosHoja.edad_hijo1 : '',
          edadHijo2: datosHoja.edad_hijo2 !== '-' ? datosHoja.edad_hijo2 : '',
          edadHijo3: datosHoja.edad_hijo3 !== '-' ? datosHoja.edad_hijo3 : '',
          edadHijo4: datosHoja.edad_hijo4 !== '-' ? datosHoja.edad_hijo4 : '',
          edadHijo5: datosHoja.edad_hijo5 !== '-' ? datosHoja.edad_hijo5 : '',

          /*
            // Formulario publico segunda parte
            estudiosExtras: datosHoja.estudiosExtra !== '-' ? datosHoja.estudiosExtra : '',
          */
        });

        // Suponiendo que datosHoja.hijos es el array con los datos de los hijos
        // this.llenarDatosHijos(datosHoja.hijos);
      } else {
        console.error(
          'La propiedad numerodeceduladepersona no se encontró en los datos recibidos'
        );
      }
    } else {
      console.error('No se recibieron datos para llenar el formulario');
    }
  }

  get hijosFormArray() {
    return this.formulario_vacantes.get('hijos') as FormArray;
  }

  generarArrayHijos(): Array<number> {
    const numHijos =
      this.formulario_vacantes.get('numHijosDependientes')?.value || 0;
    return Array.from({ length: numHijos }, (_, i) => i);
  }

  actualizarEdadesHijos(numHijos: number) {
    // Primero, elimina los controles existentes para las edades de los hijos
    Object.keys(this.formulario_vacantes.controls).forEach((key) => {
      if (key.startsWith('edadHijo')) {
        this.formulario_vacantes.removeControl(key);
      }
    });

    // Luego, agrega nuevos controles basándose en el número de hijos ingresado
    for (let i = 0; i < numHijos; i++) {
      this.formulario_vacantes.addControl(
        `edadHijo${i + 1}`,
        new FormControl('', Validators.min(0))
      );
    }
  }

  // Manejo del cambio de selección en el select
  onSelectionChange() {
    const deseaGenerar = this.formulario_vacantes.get('deseaGenerar')?.value;
    this.mostrarSubirHojaVida = deseaGenerar === false;
    this.mostrarCamposAdicionales = deseaGenerar === true;
  }

  // Manejar la carga de archivos
  onFileUpload(event: Event, fileType: string) {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      const file = input.files[0]; // Obtiene el archivo
      this.uploadedFiles[fileType] = { file, fileName: file.name }; // Almacena el archivo y el nombre
    }
  }

  // Método para abrir un archivo en una nueva pestaña
  verArchivo(campo: string) {
    const archivo = this.uploadedFiles[campo];

    if (archivo && archivo.file) {
      if (typeof archivo.file === 'string') {
        // Asegurarse de que la URL esté correctamente codificada para evitar problemas
        const fileUrl = encodeURI(archivo.file);
        // Abrir el archivo en una nueva pestaña
        window.open(fileUrl, '_blank');
      } else if (archivo.file instanceof File) {
        // Crear una URL temporal para el archivo si es un objeto File
        const fileUrl = URL.createObjectURL(archivo.file);
        window.open(fileUrl, '_blank');

        // Revocar la URL después de que el archivo ha sido abierto para liberar memoria
        setTimeout(() => {
          URL.revokeObjectURL(fileUrl);
        }, 100);
      }
    } else {
      Swal.fire(
        'Error',
        'No se pudo encontrar el archivo para este campo',
        'error'
      );
    }
  }

  subirArchivo(event: any, campo: string) {
    const input = event.target as HTMLInputElement; // Referencia al input
    const file = input.files?.[0]; // Obtén el archivo seleccionado

    if (file) {
      // Verificar si el nombre del archivo tiene más de 100 caracteres
      if (file.name.length > 100) {
        Swal.fire(
          'Error',
          'El nombre del archivo no debe exceder los 100 caracteres',
          'error'
        );

        // Limpiar el input
        this.resetInput(input);
        return; // Salir de la función si la validación falla
      }

      // Si la validación es exitosa, almacenar el archivo
      this.uploadedFiles[campo] = { file: file, fileName: file.name }; // Guarda el archivo y el nombre
    }

    // Limpiar el input para permitir seleccionar el mismo archivo nuevamente
    this.resetInput(input);
  }

  // Método para reiniciar el input en el DOM
  private resetInput(input: HTMLInputElement): void {
    const newInput = input.cloneNode(true) as HTMLInputElement;
    input.parentNode?.replaceChild(newInput, input);
  }


  imprimirInformacion2(): void {
    const camposInvalidos: string[] = [];
    const camposIgnorados = [
      'tipoVivienda2',
      'expectativasVidaChecks',
      'porqueLofelicitarian',
      'malentendido',
      'actividadesDi',
      'como_es_su_relacion_familiar',
      'experienciaSignificativa',
      'motivacion',
    ];

    // Validar los controles y agregar nombres inválidos que no están ignorados
    Object.keys(this.formulario_vacantes.controls).forEach((campo) => {
      const control = this.formulario_vacantes.get(campo);
      if (control?.invalid && !camposIgnorados.includes(campo)) {
        camposInvalidos.push(campo);
      }
    });

    if (camposInvalidos.length > 0) {
      Swal.fire({
        title: '¡Formulario incompleto!',
        text: `Por favor, completa todos los campos obligatorios: ${camposInvalidos.join(
          ', '
        )}`,
        icon: 'warning',
        confirmButtonText: 'Aceptar',
      });
    }

    // Si hay campos inválidos en cualquiera de los dos formularios, mostramos el Swal
    if (camposInvalidos.length > 0) {
      Swal.fire({
        title: '¡Formulario incompleto!',
        html: `<ul>${camposInvalidos
          .map((campo) => `<li>${campo}</li>`)
          .join('')}</ul>`,
        icon: 'warning',
        confirmButtonText: 'Aceptar',
      });
    } else {
      // recoger numero de cedula del local storage
      const cedula = localStorage.getItem('cedula');

      // Crear un objeto con solo los datos que quieres enviar
      const datosAEnviar = {
        // DATOS PERSONALES PARTE 1
        tipoDoc: this.formulario_vacantes.value.tipoDoc,
        numeroCedula: this.formulario_vacantes.value.numeroCedula,
        pApellido: this.formulario_vacantes.value.pApellido,
        sApellido: this.formulario_vacantes.value.sApellido,
        pNombre: this.formulario_vacantes.value.pNombre,
        sNombre: this.formulario_vacantes.value.sNombre,
        genero: this.formulario_vacantes.value.genero,
        correo: this.formulario_vacantes.value.correo,
        numCelular: this.formulario_vacantes.value.numCelular,
        numWha: this.formulario_vacantes.value.numWha,
        departamento: this.formulario_vacantes.value.departamento,
        ciudad: this.formulario_vacantes.value.ciudad ?? '',
        estadoCivil: this.formulario_vacantes.value.estadoCivil,
        direccionResidencia: this.formulario_vacantes.value.direccionResidencia,
        barrio: this.formulario_vacantes.value.zonaResidencia,
        fechaExpedicionCc: this.formulario_vacantes.value.fechaExpedicionCC,
        departamentoExpedicionCc:
          this.formulario_vacantes.value.departamentoExpedicionCC,
        municipioExpedicionCc: this.formulario_vacantes.value.municipioExpedicionCC,
        lugarNacimientoDepartamento:
          this.formulario_vacantes.value.departamentoNacimiento,
        lugarNacimientoMunicipio:
          this.formulario_vacantes.value.municipioNacimiento,
        rh: this.formulario_vacantes.value.rh,
        zurdoDiestro: this.formulario_vacantes.value.lateralidad,
        tiempoResidenciaZona: this.formulario_vacantes.value.tiempoResidenciaZona,
        lugarAnteriorResidencia:
          this.formulario_vacantes.value.lugarAnteriorResidencia,
        razonCambioResidencia: this.formulario_vacantes.value.razonCambioResidencia,
        zonasConocidas: this.formulario_vacantes.value.zonasConocidas,
        preferenciaResidencia: this.formulario_vacantes.value.preferenciaResidencia,
        fechaNacimiento: this.formulario_vacantes.value.fechaNacimiento,
        estudiaActualmente: this.formulario_vacantes.value.estudiaActualmente ?? '',
        familiarEmergencia: this.formulario_vacantes.value.familiarEmergencia,
        parentescoFamiliarEmergencia:
          this.formulario_vacantes.value.parentescoFamiliarEmergencia,
        direccionFamiliarEmergencia:
          this.formulario_vacantes.value.direccionFamiliarEmergencia,
        barrioFamiliarEmergencia:
          this.formulario_vacantes.value.barrioFamiliarEmergencia,
        telefonoFamiliarEmergencia:
          this.formulario_vacantes.value.telefonoFamiliarEmergencia,
        ocupacionFamiliarEmergencia:
          this.formulario_vacantes.value.ocupacionFamiliar_Emergencia,
        oficina: this.formulario_vacantes.value.oficina,

        // DATOS PERSONALES PARTE 2
        escolaridad: this.formulario_vacantes.value.escolaridad,
        nombreInstitucion: this.formulario_vacantes.value.nombreInstitucion,
        anoFinalizacion: this.formulario_vacantes.value.anoFinalizacion,
        tituloObtenido: this.formulario_vacantes.value.tituloObtenido,
        estudiosExtra:
          this.formulario_vacantes.value.estudiosExtrasSelect.join(','),

        // Datos tallas
        chaqueta: this.formulario_vacantes.value.tallaChaqueta,
        pantalon: this.formulario_vacantes.value.tallaPantalon,
        camisa: this.formulario_vacantes.value.tallaCamisa,
        calzado: this.formulario_vacantes.value.tallaCalzado,

        // Datos conyuge
        nombreConyugue: this.formulario_vacantes.value.nombresConyuge,
        apellidoConyugue: this.formulario_vacantes.value.apellidosConyuge,
        numDocIdentidadConyugue:
          this.formulario_vacantes.value.documentoIdentidadConyuge ?? '',
        viveConElConyugue: this.formulario_vacantes.value.viveConyuge,
        direccionConyugue: this.formulario_vacantes.value.direccionConyuge ?? '',
        telefonoConyugue: this.formulario_vacantes.value.telefonoConyuge ?? '',
        barrioMunicipioConyugue: this.formulario_vacantes.value.barrioConyuge ?? '',
        ocupacionConyugue: this.formulario_vacantes.value.ocupacionConyuge ?? '',

        // Datos padres
        nombrePadre: this.formulario_vacantes.value.nombrePadre,
        vivePadre: this.formulario_vacantes.value.elPadreVive,
        ocupacionPadre: this.formulario_vacantes.value.ocupacionPadre ?? '',
        direccionPadre: this.formulario_vacantes.value.direccionPadre ?? '',
        telefonoPadre: this.formulario_vacantes.value.telefonoPadre ?? '',
        barrioPadre: this.formulario_vacantes.value.barrioPadre ?? '',

        // Datos madre
        nombreMadre: this.formulario_vacantes.value.nombreMadre,
        viveMadre: this.formulario_vacantes.value.madreVive,
        ocupacionMadre: this.formulario_vacantes.value.ocupacionMadre ?? '',
        direccionMadre: this.formulario_vacantes.value.direccionMadre ?? '',
        telefonoMadre: this.formulario_vacantes.value.telefonoMadre ?? '',
        barrioMadre: this.formulario_vacantes.value.barrioMadre ?? '',

        // Datos referencias
        nombreReferenciaPersonal1:
          this.formulario_vacantes.value.nombreReferenciaPersonal1,
        telefonoReferenciaPersonal1:
          this.formulario_vacantes.value.telefonoReferencia1,
        ocupacionReferenciaPersonal1:
          this.formulario_vacantes.value.ocupacionReferencia1,
        tiempoConoceReferenciaPersonal1:
          this.formulario_vacantes.value.tiempoConoceReferenciaPersonal1,
        direccionReferenciaPersonal1:
          this.formulario_vacantes.value.direccionReferenciaPersonal1,

        nombreReferenciaPersonal2:
          this.formulario_vacantes.value.nombreReferenciaPersonal2,
        telefonoReferenciaPersonal2:
          this.formulario_vacantes.value.telefonoReferencia2,
        ocupacionReferenciaPersonal2:
          this.formulario_vacantes.value.ocupacionReferencia2,
        tiempoConoceReferenciaPersonal2:
          this.formulario_vacantes.value.tiempoConoceReferenciaPersonal2,
        direccionReferenciaPersonal2:
          this.formulario_vacantes.value.direccionReferenciaPersonal2,

        nombreReferenciaFamiliar1:
          this.formulario_vacantes.value.nombreReferenciaFamiliar1,
        telefonoReferenciaFamiliar1:
          this.formulario_vacantes.value.telefonoReferenciaFamiliar1,
        ocupacionReferenciaFamiliar1:
          this.formulario_vacantes.value.ocupacionReferenciaFamiliar1,
        parentescoReferenciaFamiliar1:
          this.formulario_vacantes.value.parentescoReferenciaFamiliar1,
        direccionReferenciaFamiliar1:
          this.formulario_vacantes.value.direccionReferenciaFamiliar1,

        nombreReferenciaFamiliar2:
          this.formulario_vacantes.value.nombreReferenciaFamiliar2,
        telefonoReferenciaFamiliar2:
          this.formulario_vacantes.value.telefonoReferenciaFamiliar2,
        ocupacionReferenciaFamiliar2:
          this.formulario_vacantes.value.ocupacionReferenciaFamiliar2,
        parentescoReferenciaFamiliar2:
          this.formulario_vacantes.value.parentescoReferenciaFamiliar2,

        // Datos laborales
        experienciaLaboral: this.formulario_vacantes.value.experienciaLaboral,
        nombreExpeLaboral1Empresa:
          this.formulario_vacantes.value.nombreEmpresa1 ?? '',
        direccionEmpresa1: this.formulario_vacantes.value.direccionEmpresa1 ?? '',
        telefonosEmpresa1: this.formulario_vacantes.value.telefonosEmpresa1 ?? '',
        nombreJefeEmpresa1: this.formulario_vacantes.value.nombreJefe1 ?? '',
        cargoEmpresa1: this.formulario_vacantes.value.cargoEmpresa1 ?? '',
        areaExperiencia: Array.isArray(
          this.formulario_vacantes.value.areaExperiencia
        )
          ? this.formulario_vacantes.value.areaExperiencia.join(', ')
          : '',
        fechaRetiroEmpresa1: this.formulario_vacantes.value.fechaRetiro1 ?? '',
        tiempoExperiencia: this.formulario_vacantes.value.tiempoExperiencia ?? '',
        motivoRetiroEmpresa1: this.formulario_vacantes.value.motivoRetiro1 ?? '',
        empresas_laborado: this.formulario_vacantes.value.empresas_laborado ?? '',
        labores_realizadas: this.formulario_vacantes.value.labores_realizadas ?? '',
        rendimiento: this.formulario_vacantes.value.rendimiento ?? '',
        porqueRendimiento: this.formulario_vacantes.value.porqueRendimiento ?? '',
        porqueLofelicitarian:
          this.formulario_vacantes.value.porqueLofelicitarian ?? '',
        malentendido: this.formulario_vacantes.value.malentendido ?? '',

        personasConQuienConvive: Array.isArray(
          this.formulario_vacantes.value.conQuienViveChecks
        )
          ? this.formulario_vacantes.value.conQuienViveChecks.join(', ')
          : '',
        familiaConUnSoloIngreso: this.formulario_vacantes.value.familiaSolo,
        personas_a_cargo: Array.isArray(
          this.formulario_vacantes.value.personas_a_cargo
        )
          ? this.formulario_vacantes.value.personas_a_cargo.join(', ')
          : '',
        como_es_su_relacion_familiar:
          this.formulario_vacantes.value.como_es_su_relacion_familiar,

        tipoVivienda: Array.isArray(
          this.formulario_vacantes.value.tiposViviendaChecks
        )
          ? this.formulario_vacantes.value.tiposViviendaChecks.join(', ')
          : '',
        numHabitaciones: this.formulario_vacantes.value.numeroHabitaciones,
        numPersonasPorHabitacion:
          this.formulario_vacantes.value.personasPorHabitacion,
        tipoVivienda2p: this.formulario_vacantes.value.tipoVivienda2 ?? '',
        caracteristicasVivienda:
          this.formulario_vacantes.value.caracteristicasVivienda,
        servicios: Array.isArray(this.formulario_vacantes.value.comodidadesChecks)
          ? this.formulario_vacantes.value.comodidadesChecks.join(', ')
          : '',
        expectativasDeVida: Array.isArray(
          this.formulario_vacantes.value.expectativasVidaChecks
        )
          ? this.formulario_vacantes.value.expectativasVidaChecks.join(', ')
          : '',
        fuenteVacante: this.formulario_vacantes.value.fuenteVacante,

        actividadesDi: this.formulario_vacantes.value.actividadesDi ?? '',
        experienciaSignificativa:
          this.formulario_vacantes.value.experienciaSignificativa ?? '',
        motivacion: this.formulario_vacantes.value.motivacion ?? '',

        numHijosDependientes:
          this.formulario_vacantes.value.numHijosDependientes ?? '',
        hijos: this.formulario_vacantes.value.hijos,
        cuidadorHijos: this.formulario_vacantes.value.cuidadorHijos ?? '',
        edadHijo1: this.formulario_vacantes.value.edadHijo1 ?? '',
        edadHijo2: this.formulario_vacantes.value.edadHijo2 ?? '',
        edadHijo3: this.formulario_vacantes.value.edadHijo3 ?? '',
        edadHijo4: this.formulario_vacantes.value.edadHijo4 ?? '',
        edadHijo5: this.formulario_vacantes.value.edadHijo5 ?? '',
      };

      const upperCaseValues = this.convertValuesToUpperCase(datosAEnviar);
      // parte de hijos tambien en mayuscula
      const hijos = this.formulario_vacantes.value.hijos;
      const upperCaseHijos = hijos.map((hijo: any) =>
        this.convertValuesToUpperCase(hijo)
      );
      upperCaseValues.hijos = upperCaseHijos;
      // Si uploadFiles tiene hoja de vida generada, agregarla a los datos a enviar
      if (this.formulario_vacantes.value.deseaGenerar) {
        // this.fillForm();
      }

      this.candidateService
        .formulario_vacantes(upperCaseValues)
        .subscribe(
          (response: any) => {
            Swal.fire({
              title: 'Datos enviados',
              text: 'Tus datos han sido enviados correctamente',
              icon: 'success',
              confirmButtonText: 'Aceptar',
            });
          },
          (error) => {
            console.error(error);
            Swal.fire({
              title: 'Error al enviar datos',
              text: 'Ocurrió un error al enviar tus datos. Por favor, intenta nuevamente.',
              icon: 'error',
              confirmButtonText: 'Aceptar',
            });
          }
        );
    }
  }

  normalizeString(value: string): string {
    return value
      .normalize('NFKD') // Normalización para separar caracteres combinados
      .replace(/[\u{1D400}-\u{1D7FF}]/gu, (char) =>
        String.fromCharCode(char.codePointAt(0)! - 0x1d400 + 65)
      ); // Rango matemático
  }

  convertValuesToUpperCase(formValues: any): any {
    const upperCaseValues: { [key: string]: any } = {}; // Objeto para almacenar los valores formateados

    for (const key in formValues) {
      if (formValues.hasOwnProperty(key)) {
        const value = formValues[key];

        if (typeof value === 'string') {
          // Normalizar texto: eliminar caracteres decorativos y convertir a mayúsculas
          upperCaseValues[key] = this.normalizeString(
            value.trim().toUpperCase()
          );
        } else if (Array.isArray(value)) {
          // Si es un arreglo, normalizar cada elemento
          upperCaseValues[key] = value.map((item) =>
            typeof item === 'string'
              ? this.normalizeString(item.trim().toUpperCase())
              : item
          );
        } else {
          // Dejar el valor tal como está si no es una cadena o arreglo
          upperCaseValues[key] = value;
        }
      }
    }

    return upperCaseValues;
  }


  // Getter para el FormControl del select
  get estudiosExtrasSelectControl(): FormControl {
    return this.formulario_vacantes.get('estudiosExtrasSelect') as FormControl;
  }

  // Getter para el FormArray
  get estudiosExtras(): FormArray {
    return this.formulario_vacantes.get('estudiosExtras') as FormArray;
  }


  escucharCambiosEnDepartamento(): void {
    this.formulario_vacantes
      .get('departamento')!
      .valueChanges.subscribe((departamentoSeleccionado) => {
        this.ciudadesResidencia = this.actualizarMunicipios(
          departamentoSeleccionado
        );
        this.formulario_vacantes.get('ciudad')!.enable();
      });

    this.formulario_vacantes
      .get('departamentoExpedicionCC')!
      .valueChanges.subscribe((departamentoSeleccionado) => {
        this.ciudadesExpedicionCC = this.actualizarMunicipios(
          departamentoSeleccionado
        );
        this.formulario_vacantes.get('municipioExpedicionCC')!.enable();
      });

    this.formulario_vacantes
      .get('departamentoNacimiento')!
      .valueChanges.subscribe((departamentoSeleccionado) => {
        this.ciudadesNacimiento = this.actualizarMunicipios(
          departamentoSeleccionado
        );
        this.formulario_vacantes.get('municipioNacimiento')!.enable();
      });
  }

  actualizarMunicipios(departamentoSeleccionado: string): string[] {
    const departamento = this.datos.find(
      (d: any) => d.departamento === departamentoSeleccionado
    );
    return departamento ? departamento.ciudades : [];
  }
}
