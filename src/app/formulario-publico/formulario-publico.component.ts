import { Component, OnInit, ViewChild, viewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators, FormArray, FormBuilder, AbstractControl } from '@angular/forms';
import { CommonModule } from '@angular/common'; // Importa CommonModule
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core'; // Importa MatOptionModule
import { MatInputModule } from '@angular/material/input';
import { DomSanitizer } from '@angular/platform-browser';
import { FirmaComponent,  } from '../firma/firma.component';

@Component({
  selector: 'app-formulario-publico',
  standalone: true,
  imports: [RouterOutlet,
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
    FirmaComponent
  ],
  templateUrl: './formulario-publico.component.html',
  styleUrl: './formulario-publico.component.css'
})
export class FormularioPublicoComponent {
[x: string]: any;
  //datosHoja: HojaDeVida = new HojaDeVida();
  formHojaDeVida!: FormGroup;
  datos: any; // Puedes tipar esto mejor según la estructura de tu JSON
  ciudadesResidencia: string[] = [];
  ciudadesExpedicionCC: string[] = [];
  ciudadesNacimiento: string[] = [];
  // visualizaciones las capturas de la cedula
  previsualizacion: string | undefined;
  previsualizacion2: string | undefined;
  archivos: any = [];

  title = 'Formulario';

  constructor(private http: HttpClient, private fb: FormBuilder, private sanitizer: DomSanitizer) {
    this.formHojaDeVida = new FormGroup({
      tipoDoc: new FormControl('', Validators.required),
      numeroCedula: new FormControl('', Validators.required),
      pApellido: new FormControl('', Validators.required),
      sApellido: new FormControl(''),
      pNombre: new FormControl('', Validators.required),
      sNombre: new FormControl(''),
      genero: new FormControl('', Validators.required),
      correo: new FormControl('', [Validators.required, Validators.email]),
      numCelular: new FormControl('', [Validators.required, Validators.pattern(/^\d{10}$/)]),
      numWha: new FormControl('', [Validators.required, Validators.pattern(/^\d{10}$/)]),
      departamento: new FormControl('', Validators.required), // Cambié 'genero' por 'departamento' para que sea más descriptivo
      ciudad: new FormControl({ value: '', disabled: true }, Validators.required),
      tiempoResidenciaZona: new FormControl('', Validators.required),
      lugarAnteriorResidencia: new FormControl('', Validators.required),
      razonCambioResidencia: new FormControl('', Validators.required),
      zonasConocidas: new FormControl('', Validators.required),
      preferenciaResidencia: new FormControl('', Validators.required),
      fechaNacimiento: new FormControl('', Validators.required),
      estudiaActualmente: new FormControl('', Validators.required),
      experienciaLaboral: new FormControl('', Validators.required),
      areaExperiencia: new FormControl('', Validators.required),
      areaCultivoPoscosecha: new FormControl('', Validators.required),
      laboresRealizadas: new FormControl('', Validators.required),
      empresasLaboradas: new FormControl('', Validators.required),
      tiempoExperiencia: new FormControl('', Validators.required),
      nivelEscolaridad: new FormControl('', Validators.required),
      numHijosDependientes: new FormControl('', [Validators.required, Validators.min(0), Validators.max(5)]),
      cuidadorHijos: new FormControl('', Validators.required),
      fuenteVacante: new FormControl('', Validators.required),

      // Formulario publico segunda parte

      estadoCivil: new FormControl('', Validators.required),
      direccionResidencia: new FormControl('', Validators.required),

      fechaExpedicionCC: new FormControl('', Validators.required),
      departamentoExpedicionCC: new FormControl('', Validators.required),
      municipioExpedicionCC: new FormControl({ value: '', disabled: true }, Validators.required),
      departamentoNacimiento: new FormControl('', Validators.required),
      municipioNacimiento: new FormControl({ value: '', disabled: true }, Validators.required),

      rh: new FormControl('', Validators.required),
      lateralidad: new FormControl('', Validators.required),
      escolaridad: new FormControl('', Validators.required),
      estudiosExtras: new FormControl('', Validators.required),
      nombreInstitucion: new FormControl('', Validators.required),
      anoFinalizacion: new FormControl('', [Validators.required, Validators.pattern(/^\d{4}$/)]),
      tituloObtenido: new FormControl('', Validators.required),
      tallaChaqueta: new FormControl('', Validators.required),
      tallaPantalon: new FormControl('', Validators.required),
      tallaCamisa: new FormControl('', Validators.required),
      tallaCalzado: new FormControl('', Validators.required),
      parentescoFamiliarEmergencia: new FormControl('', Validators.required),
      direccionFamiliarEmergencia: new FormControl('', Validators.required),
      barrioFamiliarEmergencia: new FormControl('', Validators.required),
      telefonoFamiliarEmergencia: new FormControl('', [Validators.required, Validators.pattern(/^\d+$/)]),
      ocupacionFamiliarEmergencia: new FormControl('', Validators.required),

      // conyugue
      nombresConyuge: new FormControl('', Validators.required),
      apellidosConyuge: new FormControl('', Validators.required),
      documentoIdentidadConyuge: new FormControl('', [Validators.required, Validators.pattern(/^\d+$/)]), // Asumiendo que es numérico
      viveConyuge: new FormControl('', Validators.required), // Podría ser un booleano o un string dependiendo de cómo quieras manejarlo
      direccionConyuge: new FormControl('', Validators.required),
      telefonoConyuge: new FormControl('', [Validators.required, Validators.pattern(/^\d+$/)]), // Asumiendo que es numérico
      barrioConyuge: new FormControl('', Validators.required),
      ocupacionConyuge: new FormControl('', Validators.required),
      telefonoLaboralConyuge: new FormControl('', [Validators.required, Validators.pattern(/^\d+$/)]), // Asumiendo que es numérico
      direccionLaboralConyuge: new FormControl('', Validators.required),

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
      telefonoReferencia1: new FormControl('', [Validators.required, Validators.pattern(/^\d+$/)]),
      ocupacionReferencia1: new FormControl('', Validators.required),
      nombreReferenciaPersonal2: new FormControl('', Validators.required),
      telefonoReferencia2: new FormControl('', [Validators.required, Validators.pattern(/^\d+$/)]),
      ocupacionReferencia2: new FormControl('', Validators.required),

      // Referencias Familiares
      nombreReferenciaFamiliar1: new FormControl('', Validators.required),
      telefonoReferenciaFamiliar1: new FormControl('', [Validators.required, Validators.pattern(/^\d+$/)]),
      ocupacionReferenciaFamiliar1: new FormControl('', Validators.required),
      nombreReferenciaFamiliar2: new FormControl('', Validators.required),
      telefonoReferenciaFamiliar2: new FormControl('', [Validators.required, Validators.pattern(/^\d+$/)]),
      ocupacionReferenciaFamiliar2: new FormControl('', Validators.required),

      // Experiencia Laboral 1
      nombreEmpresa1: new FormControl('', Validators.required),
      direccionEmpresa1: new FormControl('', Validators.required),
      telefonosEmpresa1: new FormControl('', [Validators.required, Validators.pattern(/^\d+$/)]),
      nombreJefe1: new FormControl('', Validators.required),
      cargoTrabajador1: new FormControl('', Validators.required),
      fechaRetiro1: new FormControl('', Validators.required), // Considera usar un DatePicker para fechas
      motivoRetiro1: new FormControl('', Validators.required),

      // Experiencia Laboral 2
      nombreEmpresa2: new FormControl('', Validators.required),
      direccionEmpresa2: new FormControl('', Validators.required),
      telefonosEmpresa2: new FormControl('', [Validators.required, Validators.pattern(/^\d+$/)]),
      nombreJefe2: new FormControl('', Validators.required),
      cargoTrabajador2: new FormControl('', Validators.required),
      fechaRetiro2: new FormControl('', Validators.required),
      motivoRetiro2: new FormControl('', Validators.required),

      // informacion hijos
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



    });

    // Llamada a la función para inicializar el formulario con base en el número de hijos
    this.escucharNumeroDeHijos();
  }


  ngOnInit(): void {
    this.cargarDatosJSON();

    this.escucharCambiosEnDepartamento();

    this.formHojaDeVida.get('numHijosDependientes')!.valueChanges.subscribe(numHijos => {
      this.actualizarEdadesHijos(numHijos);
    });


  }


  @ViewChild(FirmaComponent)
  firmaComponent: FirmaComponent = new FirmaComponent;

  limpiarFirma() {
    this.firmaComponent.clearSignature();
  }

  guardarFirma() {
    this.firmaComponent.saveSignature();
  }


  imprimirInformacion(): void {
    console.log(this.formHojaDeVida.value);
  }

  
  // Funciones para seleccionar la foto o tamarla desde el celular
  capturarFile(event: any) {
    const archivoCapturado = event.target.files[0]
    this.extraerBase64(archivoCapturado).then((imagen: any) => {
      this.previsualizacion = imagen.base;
      console.log(imagen);
    })
  }

  capturarFile2(event: any) {
    const archivoCapturado = event.target.files[0]
    this.extraerBase64(archivoCapturado).then((imagen: any) => {
      this.previsualizacion2 = imagen.base;
      console.log(imagen);
    })
  }

  extraerBase64 = async ($event: any) => new Promise((resolve, reject) => {
    try {
      const unsafeImg = window.URL.createObjectURL($event);
      const image = this.sanitizer.bypassSecurityTrustUrl(unsafeImg);
      const reader = new FileReader();
      reader.readAsDataURL($event);
      reader.onload = () => {
        resolve({
          base: reader.result
        });
      };
      reader.onerror = error => {
        resolve({
          base: null
        });
      };
      return image;
    } catch (e) {
      return null;
    }
  }
  )

  clearImage(): any {
    this.previsualizacion = '';
    this.archivos = [];
  }

  get hijosFormArray() {
    return this.formHojaDeVida.get('hijos') as FormArray;
  }

  inicializarFormularioHijos() {
    this.formHojaDeVida.get('numHijosDependientes')!.valueChanges.subscribe(numHijos => {
      this.actualizarFormularioHijos(numHijos);
    });
  }


  // Ajusta la firma de la función para aceptar MatCheckboxChange
  onCheckboxChange(event: MatCheckboxChange, valor: string, nombreFormArray: string) {
    const checksArray: FormArray = this.formHojaDeVida.get(nombreFormArray) as FormArray;

    if (event.checked) {
      checksArray.push(new FormControl(valor));
    } else {
      let index = checksArray.controls.findIndex(ctrl => ctrl.value === valor);
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
    this.formHojaDeVida.get('numHijosDependientes')!.valueChanges.subscribe((numHijos: number) => {
      const hijosArray = this.formHojaDeVida.get('hijos') as FormArray;
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
      documentoIdentidadOtroPadre: new FormControl('', Validators.required),
      otroPadreTrabajaCompania: new FormControl('', Validators.required),
      esHijastro: new FormControl('', Validators.required),
      custodiaLegal: new FormControl('', Validators.required)
    });
  }





  generarArrayHijos(): Array<number> {
    const numHijos = this.formHojaDeVida.get('numHijosDependientes')?.value || 0;
    return Array.from({ length: numHijos }, (_, i) => i);
  }


  actualizarEdadesHijos(numHijos: number) {
    // Primero, elimina los controles existentes para las edades de los hijos
    Object.keys(this.formHojaDeVida.controls).forEach(key => {
      if (key.startsWith('edadHijo')) {
        this.formHojaDeVida.removeControl(key);
      }
    });

    // Luego, agrega nuevos controles basándose en el número de hijos ingresado
    for (let i = 0; i < numHijos; i++) {
      this.formHojaDeVida.addControl(`edadHijo${i + 1}`, new FormControl('', Validators.min(0)));
    }
  }


  escucharCambiosEnDepartamento(): void {
    this.formHojaDeVida.get('departamento')!.valueChanges.subscribe(departamentoSeleccionado => {
      this.ciudadesResidencia = this.actualizarMunicipios(departamentoSeleccionado);
      this.formHojaDeVida.get('ciudad')!.enable();
    });

    this.formHojaDeVida.get('departamentoExpedicionCC')!.valueChanges.subscribe(departamentoSeleccionado => {
      this.ciudadesExpedicionCC = this.actualizarMunicipios(departamentoSeleccionado);
      this.formHojaDeVida.get('municipioExpedicionCC')!.enable();
    });

    this.formHojaDeVida.get('departamentoNacimiento')!.valueChanges.subscribe(departamentoSeleccionado => {
      this.ciudadesNacimiento = this.actualizarMunicipios(departamentoSeleccionado);
      this.formHojaDeVida.get('municipioNacimiento')!.enable();
    });
  }

  actualizarMunicipios(departamentoSeleccionado: string): string[] {
    const departamento = this.datos.find((d: any) => d.departamento === departamentoSeleccionado);
    return departamento ? departamento.ciudades : [];
  }



  cargarDatosJSON(): void {
    this.http.get('../../assets/colombia.json').subscribe(data => {
      this.datos = data;
    }, error => {
      console.error('Error al leer el archivo JSON', error);
    });
  }

  // Arreglo para el tipo de cedula
  tipoDocs: any[] = [
    { abbreviation: 'CC', description: 'Cédula de Ciudadanía (CC)' },
    { abbreviation: 'TI', description: 'Tarjeta de Identidad (TI)' },
    { abbreviation: 'P', description: 'Pasaporte (P)' },
    { abbreviation: 'CE', description: 'Cédula de Extranjería (CE)' },
    { abbreviation: 'RC', description: 'Registro Civil (CR)' },
  ];

  generos: any[] = [
    "MASCULINO", "FEMENINO", "NO BINARIO"
  ]

  haceCuantoViveEnlaZona: any[] = ["Menos de un mes", "Un mes", "Mas de 2 mes", "Mas de 6 meses"]

  //  Lista estado civil
  estadosCiviles: any[] = [
    {
      codigo: "SO",
      descripcion: "SO (Soltero)"
    },
    {
      codigo: "UL",
      descripcion: "UL (Unión Libre) "
    },
    {
      codigo: "CA",
      descripcion: "CA (Casado)"
    },
    {
      codigo: "SE",
      descripcion: "SE (Separado)"
    },
    {
      codigo: "VI",
      descripcion: "VI (Viudo)"
    }
  ];

  listadoDeNacionalidades: any[] = ["Colombiana", "Venezolana", "Estadounidense", "Ecuatoriana", "Peruana", "Española", "Cubana", "Argentina", "Mexicana"];

  listatiposdesangre: any[] = ["AB+", "AB-", "A+", "A-", "B+", "B-", "O+", "O-"];

  opcionBinaria: any[] = [
    { value: true, display: 'Sí' },
    { value: false, display: 'No' }
  ];

  listamanos: any[] = [
    {
      mano: "Zurdo",
      descripcion: "Zurdo (Escribe con la mano izquierda)"
    },
    {
      mano: "Diestro",
      descripcion: "Diestro (Escribe con la mano derecha)"
    }
  ];

  tiposVivienda = ["Casa", "Apartamento", "Finca", "Habitación"];
  tiposVivienda2: string[] = ['Propia Totalmente Paga', 'Propia la están pagando', 'Arriendo', 'Familiar'];
  caracteristicasVivienda: string[] = ['Obra Negra', 'Obra Gris', 'Terminada'];
  comodidades: string[] = ['Gas Natural', 'Teléfono Fijo', 'Internet', 'Lavadero', 'Patio'];

  expectativasVida: string[] = ['Educación Propia', 'Educación de los hijos', 'Compra de Vivienda', 'Compra de Automóvil', 'Viajar', 'Otro'];

  listaEscolaridad: any[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "Otro"];

  listaEscoText: any[] = [
    {
      esco: "Educación básica primaria",
      descripcion: "Educación básica primaria - 1 a 5 Grado"
    },
    {
      esco: "Educación básica secundaria",
      descripcion: "Educación básica secundaria - 6 a 9 Grado"
    },
    {
      esco: "Educación media académica",
      descripcion: "Educación básica secundaria - 10 a 11 Grado"
    },
    {
      esco: "Otro",
      descripcion: "Otro (Escribir primero titulo luego nombre) Ej: Técnico Electricista"
    }
  ];

  tallas: any[] = ["4", "6", "8", "10", "12", "14", "16", "34", "36", "38", "40", "42", "44"];

  tallasCalzado: any[] = ["35", "36", "37", "39", "40", "41", "42", "44"];

  listaParentescosFamiliares: any[] = [
    "Padre", "Madre", "Abuelo/Abuela", "Bisabuelo/Bisabuela", "Tío/Tía", "Primo/Prima", "Sobrino/Sobrina", "Hermano/Hermana", "Cuñado/Cuñada", "Esposo/Esposa", "Hijo/Hija", "Nieto/Nieta", "Bisnieto/Bisnieta", "Suegro/Suegra", "Yerno/Nuera", "Hermanastro/Hermanastra", "Medio hermano/Media hermana", "Padre adoptivo", "Madre adoptiva", "Hijo adoptivo", "Hija adoptiva", "Abuelo adoptivo", "Abuela adoptiva", "Padre biológico", "Madre biológica", "Hijo biológico", "Hija biológica", "Padre de crianza", "Madre de crianza", "Hijo de crianza", "Hija de crianza", "Tutor legal", "Curador legal", "Padrino/Madrina", "Compadre/Comadre", "Concubino/Concubina", "Ex-esposo/Ex-esposa", "Amigo/Amiga", "Ninguno"
  ];

  Ocupacion: any[] = ["Empleado", "Independiente", "Hogar (Am@ de casa)", "Desempleado", "Otro"];

  listaMotivosRetiro: any[] = ["Renuncia voluntaria", "Despido", "Reducción de personal", "Cierre de la empresa", "Fin de contrato temporal", "Abandono de cargo"]

  listaAreas: any[] = ["Cultivo", "Poscosecha", "Ambas", "Otro"];

  listaCalificaciones: any[] = ["Bajo", "Medio", "Excelente"];

  listaDuracion: any[] = ["Menos de un mes", "3 meses", "6 meses", "1 año", "2 años", "Mas de 2 años", "Toda la vida"];

  listatiposVivienda: any[] = ["Casa", "Apartamento", "Casa-lote", "Finca", "Habitación"];

  listaPosiblesRespuestasConquienVive: any[] = [
    "Amigos", "Abuelo", "Abuela", "Pareja", "Papa", "Mama", "Hermano", "Hermana",
    "Tio", "Tia", "Primo", "Prima", "Sobrino", "Sobrina"
  ];

  listaPersonasQueCuidan: any[] = ["Yo", "Pareja", "Abuelos", "Tios", "Amigos", "Jardín", "Son independientes", "Familia (Si los cuida mas de un familiar o son parientes de mi pareja)", "No tiene hijos", "Colegio", "Universidad", "Amig@s", "Niñera", "Cuñad@", "Dueña apartamento"]

  listaPosiblesRespuestasPersonasACargo: any[] = ["Hijos", "Abuelos", "Papas", "Hermanos", "Personas con cuidados especialas", "Otro", "Tios"]

  opcionesDeExperiencia: any[] = ["Sector Floricultor (Poscosecha- Clasificación, Boncheo, Empaque, Cuarto frío)", "Sector Floricultor (Calidad- Mipe)", "Sector Floricultor (área de mantenimiento- Ornatos, Trabajo en alturas, Mecánicos, Jefaturas y supervisión)", "Sector Comercial (Ventas)", "Sector Industrial (Alimentos- Textil- Transporte)", "Sector Financiero", "Sector Administrativo y Contable", "Sin experiencia"]

  tiempoTrabajado: any[] = ["De 15 días a 1 mes (Una temporada)", "De 2 a 6 meses", "Más de 6 meses", "Un año o más", "Añadir opción o añadir respuesta 'Otro'"]

  cursosDespuesColegio: any[] = ["Técnico", "Tecnólogo", "Universidad", "Especialización", "Ninguna", "Otros"]

}
