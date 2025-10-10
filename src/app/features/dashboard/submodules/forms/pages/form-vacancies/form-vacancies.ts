import { Component } from '@angular/core';
import { SharedModule } from '../../../../../../shared/shared-module';
import { FormArray, FormBuilder, FormControl, FormGroup, FormsModule, Validators } from '@angular/forms';
import { DateAdapter, MAT_DATE_LOCALE, MAT_DATE_FORMATS } from '@angular/material/core';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { degrees, PDFCheckBox, PDFDocument, PDFTextField, rgb, StandardFonts } from 'pdf-lib';
import { DocumentManagementS } from '../../../../../../shared/services/document-management-s/document-management-s';
import { CandidateS } from '../../../../../../shared/services/candidate-s/candidate-s';
import { PoliciesModal } from '../../components/policies-modal/policies-modal';

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
  selector: 'app-form-vacancies',
  imports: [
    SharedModule,
    FormsModule
  ],
  templateUrl: './form-vacancies.html',
  styleUrl: './form-vacancies.css',
  providers: [
    { provide: DateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE] },
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },
    { provide: MAT_DATE_LOCALE, useValue: 'es-CO' }, // o 'es'
  ]
})
export class FormVacancies {
  [x: string]: any;
  //datosHoja: HojaDeVida = new HojaDeVida();
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
  mostrarCamposAdicionales: boolean = false; // Controla la visibilidad de los campos adicionales

  title = 'Formulario';
  mostrarSubirHojaVida = false;
  mostrarCamposVehiculo = false;
  mostrarCamposTrabajo = false;
  mostrarParientes = false;
  mostrarDeportes = false;
  mostrarCamposHermanos: boolean = false; // Controla si se muestran los campos de hermanos

  categoriasLicencia = ['A1', 'A2', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3'];
  tiposContrato = ['Fijo', 'Indefinido', 'Prestación de servicios', 'Obra o labor'];
  uploadedFiles: { [key: string]: { file: File, fileName: string } } = {}; // Almacenar tanto el archivo como el nombre
  typeMap: { [key: string]: number } = {
    "hojaDeVida": 28,
    hojaDeVidaGenerada: 28,
  };

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private dialog: MatDialog,
    private gestionDocumentosService: DocumentManagementS,
    private candidateS: CandidateS,
  ) {

    // Llamada a la función para inicializar el formulario con base en el número de hijos

    this.formHojaDeVida2 = new FormGroup({      // Formulario publico segunda parte

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
        Validators.pattern(/^3\d{9}$/) // Debe empezar con 3 y tener 10 dígitos en total
      ]),
      numWha: new FormControl('', [
        Validators.required,  // Si este campo debe ser obligatorio
        Validators.pattern(/^3\d{9}$/)
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
      oficina: new FormControl('', Validators.required),

      estudiaActualmente: new FormControl('', Validators.required),

      escolaridad: new FormControl('', Validators.required),
      nombreInstitucion: new FormControl('', Validators.required),
      anoFinalizacion: new FormControl('', [
        Validators.required,
      ]),
      tituloObtenido: new FormControl('', Validators.required),
      estudiosExtrasSelect: new FormControl([]), // Control para el mat-select
      estudiosExtras: this.fb.array([]), // FormArray para los campos dinámicos


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
      personas_a_cargo: new FormControl([], Validators.required),

      conQuienViveChecks: new FormControl([], Validators.required),
      tiposViviendaChecks: new FormControl([], Validators.required),
      comodidadesChecks: new FormControl([], Validators.required),
      expectativasVidaChecks: new FormControl([], Validators.required),
      porqueLofelicitarian: new FormControl('', Validators.required),
      malentendido: new FormControl('', Validators.required),
      actividadesDi: new FormControl('', Validators.required),
      fuenteVacante: new FormControl('', Validators.required),
      experienciaSignificativa: new FormControl('', Validators.required),
      motivacion: new FormControl('', Validators.required),

      deseaGenerar: new FormControl(false,),
      hojaDeVida: new FormControl('',),
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

    }), { validators: this.validar };

    this.escucharNumeroDeHijos();

    // Escucha cambios en escolaridad
    this.formHojaDeVida2.get('escolaridad')?.valueChanges.subscribe((value) => {
      const estudiosExtras = this.formHojaDeVida2.get('estudiosExtras') as FormArray;

      if (value === 'SIN ESTUDIOS') {
        // Limpia el FormArray
        while (estudiosExtras.length !== 0) {
          estudiosExtras.removeAt(0);
        }

        // Limpia los valores seleccionados en el control de selección múltiple
        this.estudiosExtrasSelectControl.setValue([]);

        // Limpia validaciones de campos relacionados
        this.formHojaDeVida2.get('nombreInstitucion')?.clearValidators();
        this.formHojaDeVida2.get('anoFinalizacion')?.clearValidators();
        this.formHojaDeVida2.get('tituloObtenido')?.clearValidators();

        // Opcionalmente, desactiva el control de "Estudios Extras"
        estudiosExtras.disable();
      } else {
        // Habilita el control de "Estudios Extras"
        estudiosExtras.enable();

        // Vuelve a aplicar validaciones según sea necesario
        this.formHojaDeVida2.get('nombreInstitucion')?.setValidators(Validators.required);
        this.formHojaDeVida2.get('anoFinalizacion')?.setValidators(Validators.required);
        this.formHojaDeVida2.get('tituloObtenido')?.setValidators(Validators.required);
      }

      // Actualiza el estado de validación de los controles
      this.formHojaDeVida2.get('nombreInstitucion')?.updateValueAndValidity();
      this.formHojaDeVida2.get('anoFinalizacion')?.updateValueAndValidity();
      this.formHojaDeVida2.get('tituloObtenido')?.updateValueAndValidity();
    });
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

        return `Field na: ${name}, Field type: ${type}${additionalDetails}`;
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



  // Función para agregar una marca de agua al PDF
  async addWatermarkToPdf(pdfBytes: Uint8Array, watermarkText: string): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Usar una fuente integrada en PDF-Lib
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const pages = pdfDoc.getPages();
    for (const page of pages) {
      const { width, height } = page.getSize();

      // Agregar texto como marca de agua
      page.drawText(watermarkText, {
        x: (width / 2) - 230, // Ajusta para centrar horizontalmente
        y: (height / 2) - 250, // Ajusta para centrar verticalmente
        size: 62, // Tamaño del texto
        font: helveticaFont, // Usar la fuente integrada
        color: rgb(152 / 255, 227 / 255, 57 / 255), // Convertir valores a fracciones
        opacity: 0.20, // Transparencia
        rotate: degrees(45), // Rotación del texto
      });
    }
    return await pdfDoc.save();
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
      Swal.fire('Error', 'No se pudo encontrar el archivo para este campo', 'error');
    }
  }

  subirArchivo(event: any, campo: string) {
    const input = event.target as HTMLInputElement; // Referencia al input
    const file = input.files?.[0]; // Obtén el archivo seleccionado

    if (file) {
      // Verificar si el nombre del archivo tiene más de 100 caracteres
      if (file.name.length > 100) {
        Swal.fire('Error', 'El nombre del archivo no debe exceder los 100 caracteres', 'error');

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

  downloadPDF(pdfBytes: Uint8Array, filename: string) {
    // Asegurar un ArrayBuffer “puro” y del rango correcto
    const ab = pdfBytes.buffer as ArrayBuffer;
    const slice = ab.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength);

    const blob = new Blob([slice], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    document.body.appendChild(a); // mejora compatibilidad iOS/Safari
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  }


  // Función que escucha los cambios de cualquier campo del formulario y guarda en localStorage
  guardarCambiosEnLocalStorage(form: FormGroup, key: string): void {
    form.valueChanges.subscribe((val) => {
      const numeroCedula = this.formHojaDeVida2.get('numeroCedula')?.value;
      if (numeroCedula) {
        localStorage.setItem(key, JSON.stringify(val));
        localStorage.setItem('numeroCedula', numeroCedula); // Guardar el número de cédula en localStorage
      }
    });
  }

  // Función para cargar datos guardados en localStorage solo si el número de cédula coincide
  cargarDatosGuardados(): void {
    const formHojaDeVida2Data = localStorage.getItem('formHojaDeVida2');
    const numeroCedulaLocalStorage = localStorage.getItem('numeroCedula');
    // Solo cargar los datos si el número de cédula en el formulario coincide con el almacenado
    if (this.numeroCedula == numeroCedulaLocalStorage) {
      if (formHojaDeVida2Data) {
        this.formHojaDeVida2.patchValue(JSON.parse(formHojaDeVida2Data));
      }
    }
  }

  // Método para agregar un nuevo grupo de estudios extras
  addEstudioExtra(nivel: string) {
    const estudiosExtras = this.formHojaDeVida2.get('estudiosExtras') as FormArray;
    if (nivel !== 'NINGUNA') {
      estudiosExtras.push(
        this.fb.group({
          nivel: [nivel, Validators.required],
          anoFinalizacion: ['', Validators.required],
          anosCursados: ['', Validators.required],
          tituloObtenido: ['', Validators.required],
          nombreInstitucion: ['', Validators.required],
          ciudad: ['', Validators.required],
        })
      );
    }
  }

  // Método para eliminar un grupo de estudios extras
  removeEstudioExtra(index: number) {
    const estudiosExtras = this.formHojaDeVida2.get('estudiosExtras') as FormArray;
    estudiosExtras.removeAt(index);
  }

  // Getter para el FormControl del select
  get estudiosExtrasSelectControl(): FormControl {
    return this.formHojaDeVida2.get('estudiosExtrasSelect') as FormControl;
  }

  // Getter para el FormArray
  get estudiosExtras(): FormArray {
    return this.formHojaDeVida2.get('estudiosExtras') as FormArray;
  }

  // Getter para obtener el array de hermanos
  get hermanosArray(): FormArray {
    return this.formHojaDeVida2.get('hermanos') as FormArray;
  }

  // Limpia los campos de hermanos
  limpiarCamposHermanos() {
    this.formHojaDeVida2.patchValue({
      numeroHermanos: '',
    });
    this.hermanosArray.clear();
  }


  personasACargoOptions: string[] = [
    'HIJOS',
    'ABUELOS',
    'PAPÁS',
    'HERMANOS',
    'PERSONAS CON CUIDADOS ESPECIALES',
    'NINGUNO',
  ];

  // Función para extraer el contenido del otro html
  openDialog(): void {
    const dialogRef = this.dialog.open(PoliciesModal, {
      disableClose: true // Esto evita que el modal se cierre al hacer clic fuera de él
    });

    dialogRef.afterClosed().subscribe(result => {
    });
  }



  async ngOnInit(): Promise<void> {
    // this.openDialog();
    this.cargarDatosJSON();

    try {
      this.escucharCambiosEnDepartamento();
    } catch (e) {
    }

    this.formHojaDeVida2
      .get('numHijosDependientes')!
      .valueChanges.subscribe((numHijos) => {
        this.actualizarEdadesHijos(numHijos);
      });

    // Nos suscribimos a los cambios en el control del FormControl del select
    this.estudiosExtrasSelectControl.valueChanges.subscribe((selectedValues: string[]) => {
      const estudiosExtras = this.formHojaDeVida2.get('estudiosExtras') as FormArray;

      // Limpiamos el FormArray antes de agregar los seleccionados
      estudiosExtras.clear();

      // Agregamos un grupo por cada opción seleccionada
      selectedValues?.forEach((nivel) => this.addEstudioExtra(nivel));
    });

    // Suscripción a cambios en "¿Tiene hermanos?"
    this.formHojaDeVida2.get('tieneHermanos')?.valueChanges.subscribe((tieneHermanos: string) => {
      if (tieneHermanos === 'SI') {
        this.mostrarCamposHermanos = true;
      } else {
        this.mostrarCamposHermanos = false;
        this.limpiarCamposHermanos(); // Limpia el array de hermanos si selecciona "No"
      }
    });

    // Suscripción a cambios en "¿Cuántos hermanos?"
    this.formHojaDeVida2.get('numeroHermanos')?.valueChanges.subscribe((numeroHermanos: number) => {
      const hermanosArray = this.hermanosArray;

      // Limpia el FormArray antes de añadir nuevos controles
      hermanosArray.clear();

      // Añade un FormGroup para cada hermano
      for (let i = 0; i < (numeroHermanos || 0); i++) {
        hermanosArray.push(
          this.fb.group({
            nombre: ['', Validators.required],
            profesion: ['', Validators.required],
            telefono: ['', [Validators.required, Validators.pattern(/^\d+$/)]]
          })
        );
      }
    });

    // Suscripción al control "deseaGenerar"
    this.formHojaDeVida2.get('deseaGenerar')?.valueChanges.subscribe((deseaGenerar: boolean) => {
      if (!deseaGenerar) {
        this.limpiarCamposAdicionales();
      }
    });
    this.guardarCambiosEnLocalStorage(this.formHojaDeVida2, 'formHojaDeVida2');
  }


  // campos numeroCedula y numeroCedula2 son los mismos
  validar() {
    if (this.formHojaDeVida2.value.numeroCedula === this.formHojaDeVida2.value.numeroCedula2) {
      this.formHojaDeVida2.setErrors(null);
    } else {
      this.formHojaDeVida2.setErrors({ noCoincide: true });
    }
  }

  // Método para limpiar los campos asociados
  limpiarCamposAdicionales() {
    this.formHojaDeVida2.patchValue({
      tieneVehiculo: null,
      licenciaConduccion: null,
      categoriaLicencia: null,
      estaTrabajando: null,
      empresaActual: null,
      tipoTrabajo: null,
      tipoContrato: null,
      trabajoAntes: null,
      solicitoAntes: null,
      tieneHermanos: null,
      numeroHermanos: null
    });

    // Eliminar hoja de vida de uploadedFiles
    delete this.uploadedFiles['hojaDeVida'];

    // Limpia los arrays o grupos anidados, si existen
    this.hermanosArray.clear();
  }

  // Método para subir todos los archivos almacenados en uploadedFiles
  subirTodosLosArchivos(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // Filtrar y preparar los archivos para subir
      const archivosAEnviar = Object.keys(this.uploadedFiles)
        .filter((key) => {
          const fileData = this.uploadedFiles[key];
          // Verificar si la clave tiene un tipo documental válido
          if (!(key in this.typeMap)) {
            console.error(`La clave "${key}" no tiene un tipo documental asignado en typeMap`);
            return false;
          }
          // Verificar si el archivo es válido
          return fileData && fileData.file;
        })
        .map((key) => ({
          key,
          ...this.uploadedFiles[key],
          typeId: this.typeMap[key], // Asignar el tipo documental correspondiente
        }));

      if (archivosAEnviar.length === 0) {
        resolve(true); // Resolver si no hay archivos
        return;
      }

      // Crear promesas para subir cada archivo
      const promesasDeSubida = archivosAEnviar.map(({ key, file, fileName, typeId }) => {
        return new Promise<void>((resolveSubida, rejectSubida) => {
          this.gestionDocumentosService
            .guardarDocumento(fileName, this.numeroCedula, typeId, file)
            .subscribe({
              next: () => {
                resolveSubida();
              },
              error: (error: any) => {
                console.error(`Error al subir archivo "${fileName}" (${key}):`, error);
                rejectSubida(`Error al subir archivo "${key}": ${error.message}`);
              },
            });
        });
      });

      // Esperar a que todas las subidas terminen
      Promise.all(promesasDeSubida)
        .then(() => {
          resolve(true);
        })
        .catch((error) => {
          console.error('Ocurrió un error durante la subida de archivos:', error);
          reject(error);
        });
    });
  }

  async imprimirInformacion2(): Promise<void> {
    // veririficar q ese correo no exista en la base de datos
    await this.candidateS.validarCorreoCedula(this.formHojaDeVida2.value.correo, this.formHojaDeVida2.value.numeroCedula).subscribe((res) => {
      if (res.correo_repetido) {
        Swal.fire({
          title: '¡Correo duplicado!',
          text: 'El correo ingresado ya se encuentra registrado por otra persona, tiene que cambiarlo',
          icon: 'error',
          confirmButtonText: 'Aceptar',
        });
        return;
      }
    });


    const camposInvalidos: string[] = [];
    const camposIgnorados = [
      'tipoVivienda2',
      'expectativasVidaChecks',
      'porqueLofelicitarian',
      'malentendido',
      'actividadesDi',
      'experienciaSignificativa',
      'motivacion',
    ];

    // Validar los controles y agregar nombres inválidos que no están ignorados
    Object.keys(this.formHojaDeVida2.controls).forEach(campo => {
      const control = this.formHojaDeVida2.get(campo);
      if (control?.invalid && !camposIgnorados.includes(campo)) {
        camposInvalidos.push(campo);
      }
    });

    if (camposInvalidos.length > 0) {
      Swal.fire({
        title: '¡Formulario incompleto!',
        text: `Por favor, completa todos los campos obligatorios: ${camposInvalidos.join(', ')}`,
        icon: 'warning',
        confirmButtonText: 'Aceptar',
      });
    }

    // Si hay campos inválidos en cualquiera de los dos formularios, mostramos el Swal
    if (camposInvalidos.length > 0) {
      Swal.fire({
        title: '¡Formulario incompleto!',
        html: `<ul>${camposInvalidos.map(campo => `<li>${campo}</li>`).join('')}</ul>`,
        icon: 'warning',
        confirmButtonText: 'Aceptar',
      });
    } else {
      console.log('Formulario válido');
      // recoger numero de cedula del local storage
      const cedula = localStorage.getItem('cedula');

      // Crear un objeto con solo los datos que quieres enviar
      const datosAEnviar = {
        tipoDoc: this.formHojaDeVida2.value.tipoDoc,
        numeroCedula: this.formHojaDeVida2.value.numeroCedula,
        pApellido: this.formHojaDeVida2.value.pApellido,
        sApellido: this.formHojaDeVida2.value.sApellido,
        pNombre: this.formHojaDeVida2.value.pNombre,
        sNombre: this.formHojaDeVida2.value.sNombre,
        genero: this.formHojaDeVida2.value.genero,
        correo: this.formHojaDeVida2.value.correo,
        numCelular: this.formHojaDeVida2.value.numCelular,
        numWha: this.formHojaDeVida2.value.numWha,
        departamento: this.formHojaDeVida2.value.departamento,
        ciudad: this.formHojaDeVida2.value.ciudad ?? '',

        estadoCivil: this.formHojaDeVida2.value.estadoCivil,
        direccionResidencia: this.formHojaDeVida2.value.direccionResidencia,
        barrio: this.formHojaDeVida2.value.zonaResidencia,
        fechaExpedicionCc: this.formHojaDeVida2.value.fechaExpedicionCC,
        departamentoExpedicionCc:
          this.formHojaDeVida2.value.departamentoExpedicionCC,
        municipioExpedicionCc: this.formHojaDeVida2.value.municipioExpedicionCC,
        lugarNacimientoDepartamento:
          this.formHojaDeVida2.value.departamentoNacimiento,
        lugarNacimientoMunicipio: this.formHojaDeVida2.value.municipioNacimiento,
        rh: this.formHojaDeVida2.value.rh,
        zurdoDiestro: this.formHojaDeVida2.value.lateralidad,

        tiempoResidenciaZona: this.formHojaDeVida2.value.tiempoResidenciaZona,
        lugarAnteriorResidencia:
          this.formHojaDeVida2.value.lugarAnteriorResidencia,
        razonCambioResidencia: this.formHojaDeVida2.value.razonCambioResidencia,
        zonasConocidas: this.formHojaDeVida2.value.zonasConocidas,
        preferenciaResidencia: this.formHojaDeVida2.value.preferenciaResidencia,
        fechaNacimiento: this.formHojaDeVida2.value.fechaNacimiento,
        estudiaActualmente:
          this.formHojaDeVida2.value.estudiaActualmente.display ?? '',

        familiarEmergencia: this.formHojaDeVida2.value.familiarEmergencia, // Asumiendo que falta este campo en TS, agregar si es necesario
        parentescoFamiliarEmergencia:
          this.formHojaDeVida2.value.parentescoFamiliarEmergencia,
        direccionFamiliarEmergencia:
          this.formHojaDeVida2.value.direccionFamiliarEmergencia,
        barrioFamiliarEmergencia:
          this.formHojaDeVida2.value.barrioFamiliarEmergencia,
        telefonoFamiliarEmergencia:
          this.formHojaDeVida2.value.telefonoFamiliarEmergencia,
        ocupacionFamiliarEmergencia:
          this.formHojaDeVida2.value.ocupacionFamiliar_Emergencia,
        oficina: this.formHojaDeVida2.value.oficina,

        escolaridad: this.formHojaDeVida2.value.escolaridad,
        estudiosExtra: this.formHojaDeVida2.value.estudiosExtrasSelect.join(','),
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
        direccionReferenciaPersonal1:
          this.formHojaDeVida2.value.direccionReferenciaPersonal1,

        nombreReferenciaPersonal2:
          this.formHojaDeVida2.value.nombreReferenciaPersonal2,
        telefonoReferenciaPersonal2:
          this.formHojaDeVida2.value.telefonoReferencia2, // Cambiado de "telefonoReferencia2" a "telefonoReferenciaPersonal2"
        ocupacionReferenciaPersonal2:
          this.formHojaDeVida2.value.ocupacionReferencia2, // Cambiado de "ocupacionReferencia2" a "ocupacionReferenciaPersonal2"
        tiempoConoceReferenciaPersonal2:
          this.formHojaDeVida2.value.tiempoConoceReferenciaPersonal2,
        direccionReferenciaPersonal2:
          this.formHojaDeVida2.value.direccionReferenciaPersonal2,

        nombreReferenciaFamiliar1:
          this.formHojaDeVida2.value.nombreReferenciaFamiliar1,
        telefonoReferenciaFamiliar1:
          this.formHojaDeVida2.value.telefonoReferenciaFamiliar1,
        ocupacionReferenciaFamiliar1:
          this.formHojaDeVida2.value.ocupacionReferenciaFamiliar1,
        parentescoReferenciaFamiliar1:
          this.formHojaDeVida2.value.parentescoReferenciaFamiliar1,
        direccionReferenciaFamiliar1:
          this.formHojaDeVida2.value.direccionReferenciaFamiliar1,

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
        tipoVivienda2p: this.formHojaDeVida2.value.tipoVivienda2 ?? '',
        caracteristicasVivienda:
          this.formHojaDeVida2.value.caracteristicasVivienda,
        malentendido: this.formHojaDeVida2.value.malentendido ?? '',
        hijos: this.formHojaDeVida2.value.hijos,
        experienciaLaboral: this.formHojaDeVida2.value.experienciaLaboral,
        porqueLofelicitarian: this.formHojaDeVida2.value.porqueLofelicitarian ?? '',
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

      // Convertir datos y campos hijos a mayúscula
      const upperCaseValues = this.convertValuesToUpperCase(datosAEnviar);

      // Convertir hijos también
      const hijos = this.formHojaDeVida2.value.hijos;
      const upperCaseHijos = hijos.map((hijo: any) => this.convertValuesToUpperCase(hijo));
      upperCaseValues.hijos = upperCaseHijos;

      // Si hay opción de generar hoja de vida
      if (this.formHojaDeVida2.value.deseaGenerar) {
        // this.fillForm();
      }

      // Mostrar loader de carga
      Swal.fire({
        title: 'Guardando...',
        text: 'Por favor espere',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      this.candidateS.formulario_vacantes(upperCaseValues).subscribe({
        next: async (response: any) => {
          if (response && response.message) {
            try {
              const allFilesUploaded = await this.subirTodosLosArchivos();
              Swal.close();

              if (allFilesUploaded) {
                await Swal.fire({
                  title: '¡Éxito!',
                  text: 'Datos y archivos guardados exitosamente.',
                  icon: 'success',
                  confirmButtonText: 'Ok'
                });
              } else {
                await Swal.fire({
                  title: 'Advertencia',
                  text: 'Datos guardados, pero hubo problemas al subir archivos.',
                  icon: 'warning',
                  confirmButtonText: 'Ok'
                });
              }
            } catch (error) {
              Swal.close();
              await Swal.fire({
                title: 'Error',
                text: `Hubo un error al subir los archivos: ${error}`,
                icon: 'error',
                confirmButtonText: 'Ok'
              });
            }

            await Swal.fire({
              title: '¡Datos guardados!',
              text: 'Los datos se guardaron correctamente.',
              icon: 'success',
              confirmButtonText: 'Aceptar',
            });
          } else {
            Swal.close();
            await Swal.fire({
              title: 'Error',
              text: 'Hubo un error al guardar los datos.',
              icon: 'error',
              confirmButtonText: 'Aceptar',
            });
          }
        },
        error: (error) => {
          Swal.close();
          Swal.fire({
            title: 'Error',
            text: error.error?.message || 'Error desconocido al guardar los datos.',
            icon: 'error',
            confirmButtonText: 'Aceptar',
          });
          console.error(error.error?.message || error);
        }
      });
    }
  }

  convertValuesToUpperCase(formValues: any): any {
    const upperCaseValues: { [key: string]: any } = {}; // Objeto para almacenar los valores formateados

    for (const key in formValues) {
      if (formValues.hasOwnProperty(key)) {
        const value = formValues[key];

        if (typeof value === 'string') {
          // Normalizar texto: eliminar caracteres decorativos y convertir a mayúsculas
          upperCaseValues[key] = this.normalizeString(value.trim().toUpperCase());
        } else if (Array.isArray(value)) {
          // Si es un arreglo, normalizar cada elemento
          upperCaseValues[key] = value.map(item =>
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

  normalizeString(value: string): string {
    return value
      .normalize('NFKD') // Normalización para separar caracteres combinados
      .replace(/[\u{1D400}-\u{1D7FF}]/gu, char => String.fromCharCode(char.codePointAt(0)! - 0x1D400 + 65)); // Rango matemático
  }


  buscarCedula() {
    console.log('Buscando cédula:', this.numeroCedula);
    // verificar si el campo de cédula está vacío
    if (!this.numeroCedula) {
      Swal.fire({
        title: 'Error',
        text: 'Por favor, ingresa una cédula válida.',
        icon: 'error',
        confirmButtonText: 'Aceptar',
      });
      return;
    }


    Swal.fire({
      title: 'Confirmar búsqueda',
      text: `¿Deseas buscar la cédula ${this.numeroCedula}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, buscar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        // Puedes cargar datos guardados aquí si lo necesitas
        this.cargarDatosGuardados?.();

        localStorage.setItem('cedula', this.numeroCedula);

        this.candidateS.buscarCandidatoPorCedula(this.numeroCedula).subscribe({
          next: (response) => {
            this.mostrarFormulario = true;
            Swal.fire({
              title: 'Cédula encontrada',
              text: 'Actualiza tus datos',
              icon: 'success',
              confirmButtonText: 'Aceptar',
            });
            this.llenarFormularioConDatos(response);
          },
          error: (error) => {
            console.error(error);
            if (error.error?.message?.startsWith('No se encontraron datos para la cédula ingresada')) {
              Swal.fire({
                title: 'Cédula no encontrada',
                text: 'Procede a llenar el formulario con los datos por favor.',
                icon: 'success',
                confirmButtonText: 'Aceptar',
              });
              this.mostrarFormulario = true;
            }
          }
        });
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
      // Encuentra el objeto correspondiente a "Sí" o "No" en opcionBinaria
      const opcionSeleccionada = this.opcionBinaria.find(
        (opcion) =>
          (datosHoja.estudia_actualmente === 'Sí' && opcion.value === true) ||
          (datosHoja.estudia_actualmente === 'No' && opcion.value === false)
      );

      //this.actualizarEdadesHijos(datosHoja.num_hijos_dependen_economicamente);

      if (datosHoja && datosHoja.numerodeceduladepersona !== undefined) {

        this.formHojaDeVida2.patchValue({
          tipoDoc: datosHoja.tipodedocumento !== '-' ? datosHoja.tipodedocumento : '',
          numeroCedula: datosHoja.numerodeceduladepersona !== '-' ? datosHoja.numerodeceduladepersona : '',
          numeroCedula2: datosHoja.numerodeceduladepersona !== '-' ? datosHoja.numerodeceduladepersona : '',
          pApellido: datosHoja.primer_apellido !== '-' ? datosHoja.primer_apellido : '',
          sApellido: datosHoja.segundo_apellido !== '-' ? datosHoja.segundo_apellido : '',
          pNombre: datosHoja.primer_nombre !== '-' ? datosHoja.primer_nombre : '',
          sNombre: datosHoja.segundo_nombre !== '-' ? datosHoja.segundo_nombre : '',
          genero: datosHoja.genero !== '-' ? datosHoja.genero : '',
          correo: datosHoja.primercorreoelectronico !== '-' ? datosHoja.primercorreoelectronico : '',
          numCelular: datosHoja.celular !== '-' ? datosHoja.celular : '',
          numWha: datosHoja.whatsapp !== '-' ? datosHoja.whatsapp : '',
          departamento: datosHoja.departamento !== '-' ? datosHoja.departamento : '',

          estadoCivil: datosHoja.estado_civil !== '-' ? datosHoja.estado_civil : '',
          direccionResidencia: datosHoja.direccion_residencia !== '-' ? datosHoja.direccion_residencia : '',
          zonaResidencia: datosHoja.barrio !== '-' ? datosHoja.barrio : '',
          fechaExpedicionCC: datosHoja.fecha_expedicion_cc !== '-' ? datosHoja.fecha_expedicion_cc : '',
          departamentoExpedicionCC: datosHoja.departamento_expedicion_cc !== '-' ? datosHoja.departamento_expedicion_cc : '',
          municipioExpedicionCC: datosHoja.municipio_expedicion_cc !== '-' ? datosHoja.municipio_expedicion_cc : '',
          departamentoNacimiento: datosHoja.lugar_nacimiento_departamento !== '-' ? datosHoja.lugar_nacimiento_departamento : '',
          municipioNacimiento: datosHoja.lugar_nacimiento_municipio !== '-' ? datosHoja.lugar_nacimiento_municipio : '',
          rh: datosHoja.rh !== '-' ? datosHoja.rh : '',
          lateralidad: datosHoja.zurdo_diestro !== '-' ? datosHoja.zurdo_diestro : '',

          ciudad: datosHoja.municipio !== '-' ? datosHoja.municipio : '',
          tiempoResidenciaZona: datosHoja.hacecuantoviveenlazona !== '-' ? datosHoja.hacecuantoviveenlazona : '',
          lugarAnteriorResidencia: datosHoja.lugar_anterior_residencia !== '-' ? datosHoja.lugar_anterior_residencia : '',
          razonCambioResidencia: datosHoja.hace_cuanto_se_vino_y_porque !== '-' ? datosHoja.hace_cuanto_se_vino_y_porque : '',
          zonasConocidas: datosHoja.zonas_del_pais !== '-' ? datosHoja.zonas_del_pais : '',
          preferenciaResidencia: datosHoja.donde_le_gustaria_vivir !== '-' ? datosHoja.donde_le_gustaria_vivir : '',
          fechaNacimiento: datosHoja.fecha_nacimiento !== '-' ? datosHoja.fecha_nacimiento : '',
          estudiaActualmente: opcionSeleccionada, // Asigna el objeto encontrado

          familiarEmergencia: datosHoja.familiar_emergencia !== '-' ? datosHoja.familiar_emergencia : '',
          parentescoFamiliarEmergencia: datosHoja.parentesco_familiar_emergencia !== '-' ? datosHoja.parentesco_familiar_emergencia : '',
          direccionFamiliarEmergencia: datosHoja.direccion_familiar_emergencia !== '-' ? datosHoja.direccion_familiar_emergencia : '',
          barrioFamiliarEmergencia: datosHoja.barrio_familiar_emergencia !== '-' ? datosHoja.barrio_familiar_emergencia : '',
          telefonoFamiliarEmergencia: datosHoja.telefono_familiar_emergencia !== '-' ? datosHoja.telefono_familiar_emergencia : '',
          ocupacionFamiliar_Emergencia: datosHoja.ocupacion_familiar_emergencia !== '-' ? datosHoja.ocupacion_familiar_emergencia : '',

          // Formulario publico segunda parte
          escolaridad: datosHoja.escolaridad !== '-' ? datosHoja.escolaridad : '',
          estudiosExtras: datosHoja.estudiosExtra !== '-' ? datosHoja.estudiosExtra : '',
          nombreInstitucion: datosHoja.nombre_institucion !== '-' ? datosHoja.nombre_institucion : '',
          anoFinalizacion: datosHoja.ano_finalizacion !== '-' ? datosHoja.ano_finalizacion : '',
          tituloObtenido: datosHoja.titulo_obtenido !== '-' ? datosHoja.titulo_obtenido : '',
          tallaChaqueta: datosHoja.chaqueta !== '-' ? datosHoja.chaqueta : '',
          tallaPantalon: datosHoja.pantalon !== '-' ? datosHoja.pantalon : '',
          tallaCamisa: datosHoja.camisa !== '-' ? datosHoja.camisa : '',
          tallaCalzado: datosHoja.calzado !== '-' ? datosHoja.calzado : '',

          nombresConyuge: datosHoja.nombre_conyugue !== '-' ? datosHoja.nombre_conyugue : '',
          apellidosConyuge: datosHoja.apellido_conyugue !== '-' ? datosHoja.apellido_conyugue : '',
          documentoIdentidadConyuge: datosHoja.num_doc_identidad_conyugue !== '-' ? datosHoja.num_doc_identidad_conyugue : '',
          viveConyuge: datosHoja.vive_con_el_conyugue !== '-' ? this.stringToBoolean(datosHoja.vive_con_el_conyugue) : '',
          direccionConyuge: datosHoja.direccion_conyugue !== '-' ? datosHoja.direccion_conyugue : '',
          telefonoConyuge: datosHoja.telefono_conyugue !== '-' ? datosHoja.telefono_conyugue : '',
          barrioConyuge: datosHoja.barrio_municipio_conyugue !== '-' ? datosHoja.barrio_municipio_conyugue : '',
          ocupacionConyuge: datosHoja.ocupacion_conyugue !== '-' ? datosHoja.ocupacion_conyugue : '',
          telefonoLaboralConyuge: datosHoja.telefono_laboral_conyugue !== '-' ? datosHoja.telefono_laboral_conyugue : '',
          direccionLaboralConyuge: datosHoja.direccion_laboral_conyugue !== '-' ? datosHoja.direccion_laboral_conyugue : '',

          nombrePadre: datosHoja.nombre_padre !== '-' ? datosHoja.nombre_padre : '',
          elPadreVive: datosHoja.vive_padre !== '-' ? this.stringToBoolean(datosHoja.vive_padre) : '',
          ocupacionPadre: datosHoja.ocupacion_padre !== '-' ? datosHoja.ocupacion_padre : '',
          direccionPadre: datosHoja.direccion_padre !== '-' ? datosHoja.direccion_padre : '',
          telefonoPadre: datosHoja.telefono_padre !== '-' ? datosHoja.telefono_padre : '',
          barrioPadre: datosHoja.barrio_padre !== '-' ? datosHoja.barrio_padre : '',
          nombreMadre: datosHoja.nombre_madre !== '-' ? datosHoja.nombre_madre : '',

          madreVive: datosHoja.vive_madre !== '-' ? this.stringToBoolean(datosHoja.vive_madre) : '',
          ocupacionMadre: datosHoja.ocupacion_madre !== '-' ? datosHoja.ocupacion_madre : '',
          direccionMadre: datosHoja.direccion_madre !== '-' ? datosHoja.direccion_madre : '',
          telefonoMadre: datosHoja.telefono_madre !== '-' ? datosHoja.telefono_madre : '',
          barrioMadre: datosHoja.barrio_madre !== '-' ? datosHoja.barrio_madre : '',


          nombreReferenciaPersonal1: datosHoja.nombre_referencia_personal1 !== '-' ? datosHoja.nombre_referencia_personal1 : '',
          telefonoReferencia1: datosHoja.telefono_referencia_personal1 !== '-' ? datosHoja.telefono_referencia_personal1 : '',
          ocupacionReferencia1: datosHoja.ocupacion_referencia_personal1 !== '-' ? datosHoja.ocupacion_referencia_personal1 : '',
          tiempoConoceReferenciaPersonal1: datosHoja.tiempo_conoce_referencia_personal1 !== '-' ? datosHoja.tiempo_conoce_referencia_personal1 : '',

          nombreReferenciaPersonal2: datosHoja.nombre_referencia_personal2 !== '-' ? datosHoja.nombre_referencia_personal2 : '',
          telefonoReferencia2: datosHoja.telefono_referencia_personal2 !== '-' ? datosHoja.telefono_referencia_personal2 : '',
          ocupacionReferencia2: datosHoja.ocupacion_referencia_personal2 !== '-' ? datosHoja.ocupacion_referencia_personal2 : '',
          tiempoConoceReferenciaPersonal2: datosHoja.tiempo_conoce_referencia_personal2 !== '-' ? datosHoja.tiempo_conoce_referencia_personal2 : '',

          nombreReferenciaFamiliar1: datosHoja.nombre_referencia_familiar1 !== '-' ? datosHoja.nombre_referencia_familiar1 : '',
          telefonoReferenciaFamiliar1: datosHoja.telefono_referencia_familiar1 !== '-' ? datosHoja.telefono_referencia_familiar1 : '',
          ocupacionReferenciaFamiliar1: datosHoja.ocupacion_referencia_familiar1 !== '-' ? datosHoja.ocupacion_referencia_familiar1 : '',
          parentescoReferenciaFamiliar1: datosHoja.parentesco_referencia_familiar1 !== '-' ? datosHoja.parentesco_referencia_familiar1 : '',

          nombreReferenciaFamiliar2: datosHoja.nombre_referencia_familiar2 !== '-' ? datosHoja.nombre_referencia_familiar2 : '',
          telefonoReferenciaFamiliar2: datosHoja.telefono_referencia_familiar2 !== '-' ? datosHoja.telefono_referencia_familiar2 : '',
          ocupacionReferenciaFamiliar2: datosHoja.ocupacion_referencia_familiar2 !== '-' ? datosHoja.ocupacion_referencia_familiar2 : '',
          parentescoReferenciaFamiliar2: datosHoja.parentesco_referencia_familiar2 !== '-' ? datosHoja.parentesco_referencia_familiar2 : '',

          experienciaLaboral: this.stringToBoolean(datosHoja.tiene_experiencia_laboral !== '-' ? datosHoja.tiene_experiencia_laboral : ''),

          areaCultivoPoscosecha: datosHoja.area_cultivo_poscosecha !== '-' ? datosHoja.area_cultivo_poscosecha : '',
          laboresRealizadas: datosHoja.labores_realizadas !== '-' ? datosHoja.labores_realizadas : '',
          tiempoExperiencia: datosHoja.tiempo_experiencia !== '-' ? datosHoja.tiempo_experiencia : '',


          nombreEmpresa1: datosHoja.nombre_expe_laboral1_empresa !== '-' ? datosHoja.nombre_expe_laboral1_empresa : '',
          direccionEmpresa1: datosHoja.direccion_empresa1 !== '-' ? datosHoja.direccion_empresa1 : '',
          telefonosEmpresa1: datosHoja.telefonos_empresa1 !== '-' ? datosHoja.telefonos_empresa1 : '',
          nombreJefe1: datosHoja.nombre_jefe_empresa1 !== '-' ? datosHoja.nombre_jefe_empresa1 : '',
          cargoTrabajador1: datosHoja.cargo_empresa1 !== '-' ? datosHoja.cargo_empresa1 : '',
          fechaRetiro1: datosHoja.fecha_retiro_empresa1 !== '-' ? datosHoja.fecha_retiro_empresa1 : '',
          motivoRetiro1: datosHoja.motivo_retiro_empresa1 !== '-' ? datosHoja.motivo_retiro_empresa1 : '',
          cargoEmpresa1: datosHoja.cargoEmpresa1 !== '-' ? datosHoja.cargoEmpresa1 : '',
          empresas_laborado: datosHoja.empresas_laborado !== '-' ? datosHoja.empresas_laborado : '',
          labores_realizadas: datosHoja.labores_realizadas !== '-' ? datosHoja.labores_realizadas : '',
          rendimiento: datosHoja.rendimiento !== '-' ? datosHoja.rendimiento : '',
          porqueRendimiento: datosHoja.porqueRendimiento !== '-' ? datosHoja.porqueRendimiento : '',

          nombreEmpresa2: datosHoja.nombre_expe_laboral2_empresa !== '-' ? datosHoja.nombre_expe_laboral2_empresa : '',
          direccionEmpresa2: datosHoja.direccion_empresa2 !== '-' ? datosHoja.direccion_empresa2 : '',
          telefonosEmpresa2: datosHoja.telefonos_empresa2 !== '-' ? datosHoja.telefonos_empresa2 : '',
          nombreJefe2: datosHoja.nombre_jefe_empresa2 !== '-' ? datosHoja.nombre_jefe_empresa2 : '',
          cargoTrabajador2: datosHoja.cargo_empresa2 !== '-' ? datosHoja.cargo_empresa2 : '',
          fechaRetiro2: datosHoja.fecha_retiro_empresa2 !== '-' ? datosHoja.fecha_retiro_empresa2 : '',
          motivoRetiro2: datosHoja.motivo_retiro_empresa2 !== '-' ? datosHoja.motivo_retiro_empresa2 : '',

          numHijosDependientes: datosHoja.num_hijos_dependen_economicamente !== '-' ? datosHoja.num_hijos_dependen_economicamente : '',
          edadHijo1: datosHoja.edad_hijo1 !== '-' ? datosHoja.edad_hijo1 : '',
          edadHijo2: datosHoja.edad_hijo2 !== '-' ? datosHoja.edad_hijo2 : '',
          edadHijo3: datosHoja.edad_hijo3 !== '-' ? datosHoja.edad_hijo3 : '',
          edadHijo4: datosHoja.edad_hijo4 !== '-' ? datosHoja.edad_hijo4 : '',
          edadHijo5: datosHoja.edad_hijo5 !== '-' ? datosHoja.edad_hijo5 : '',

          cuidadorHijos: datosHoja.quien_los_cuida !== '-' ? datosHoja.quien_los_cuida : '',

          familiaSolo: this.stringToBoolean(datosHoja.familia_con_un_solo_ingreso !== '-' ? datosHoja.familia_con_un_solo_ingreso : ''),
          numeroHabitaciones: datosHoja.num_habitaciones !== '-' ? datosHoja.num_habitaciones : '',
          personasPorHabitacion: datosHoja.num_personas_por_habitacion !== '-' ? datosHoja.num_personas_por_habitacion : '',
          tipoVivienda2: datosHoja.tipo_vivienda_2p !== '-' ? datosHoja.tipo_vivienda_2p : '',
          caracteristicasVivienda: datosHoja.caractteristicas_vivienda !== '-' ? datosHoja.caractteristicas_vivienda : '',
          fuenteVacante: datosHoja.como_se_entero !== '-' ? datosHoja.como_se_entero : '',


          areaExperiencia: datosHoja.area_experiencia ? datosHoja.area_experiencia.split(',').map((item: string) => item.trim()) : [],
          conQuienViveChecks: datosHoja.personas_con_quien_convive ? datosHoja.personas_con_quien_convive.split(',').map((item: string) => item.trim()) : [],
          tiposViviendaChecks: datosHoja.tipo_vivienda ? datosHoja.tipo_vivienda.split(',').map((item: string) => item.trim()) : [],
          comodidadesChecks: datosHoja.servicios ? datosHoja.servicios.split(',').map((item: string) => item.trim()) : [],
          expectativasVidaChecks: datosHoja.expectativas_de_vida ? datosHoja.expectativas_de_vida.split(',').map((item: string) => item.trim()) : [],
          personas_a_cargo: datosHoja.personas_a_cargo ? datosHoja.personas_a_cargo.split(',').map((item: string) => item.trim()) : [],

          porqueLofelicitarian: datosHoja.porqueLofelicitarian !== '-' ? datosHoja.porqueLofelicitarian : '',
          malentendido: datosHoja.malentendido !== '-' ? datosHoja.malentendido : '',
          actividadesDi: datosHoja.actividadesDi !== '-' ? datosHoja.actividadesDi : '',
          experienciaSignificativa: datosHoja.experienciaSignificativa !== '-' ? datosHoja.experienciaSignificativa : '',
          motivacion: datosHoja.motivacion !== '-' ? datosHoja.motivacion : '',


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
    this.formHojaDeVida2
      .get('numHijosDependientes')!
      .valueChanges.subscribe((numHijos) => {
        this.actualizarFormularioHijos(numHijos);
      });
  }


  actualizarFormularioHijos(numHijos: number) {
    const hijosArray = this.formHojaDeVida2.get('hijos') as FormArray;

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
    this.formHojaDeVida2
      .get('departamento')!
      .valueChanges.subscribe((departamentoSeleccionado) => {
        this.ciudadesResidencia = this.actualizarMunicipios(
          departamentoSeleccionado
        );
        this.formHojaDeVida2.get('ciudad')!.enable();
      });

    this.formHojaDeVida2
      .get('departamentoExpedicionCC')!
      .valueChanges.subscribe((departamentoSeleccionado) => {
        this.ciudadesExpedicionCC = this.actualizarMunicipios(
          departamentoSeleccionado
        );
        this.formHojaDeVida2.get('municipioExpedicionCC')!.enable();
      });

    this.formHojaDeVida2
      .get('departamentoNacimiento')!
      .valueChanges.subscribe((departamentoSeleccionado) => {
        this.ciudadesNacimiento = this.actualizarMunicipios(
          departamentoSeleccionado
        );
        this.formHojaDeVida2.get('municipioNacimiento')!.enable();
      });
  }

  actualizarMunicipios(departamentoSeleccionado: string): string[] {
    const departamento = this.datos.find(
      (d: any) => d.departamento === departamentoSeleccionado
    );
    return departamento ? departamento.ciudades : [];
  }

  async cargarDatosJSON(): Promise<void> {
    this.http.get('files/utils/colombia.json').subscribe(
      (data) => {
        this.datos = data;
      },
    );
  }

  // Manejo del cambio de selección en el select
  onSelectionChange() {
    const deseaGenerar = this.formHojaDeVida2.get('deseaGenerar')?.value;
    this.mostrarSubirHojaVida = deseaGenerar === false;
    this.mostrarCamposAdicionales = deseaGenerar === true;
  }


  onArchivoSeleccionado(event: any) {
    const archivo = event.target.files[0]; // Obtiene el primer archivo seleccionado

    if (archivo) {
      // Verificar si el tamaño del archivo es válido (ejemplo: máximo 5 MB)
      const maxSize = 5 * 1024 * 1024; // 5 MB
      if (archivo.size > maxSize) {
        Swal.fire({
          title: 'Archivo demasiado grande',
          text: 'El archivo no debe exceder 5 MB.',
          icon: 'error',
          confirmButtonText: 'Ok'
        });
        return; // Terminar si el archivo excede el tamaño máximo
      }

      // Verificar si el tipo de archivo es válido (solo PDF, Word, etc.)
      const extensionesValidas = ['application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!extensionesValidas.includes(archivo.type)) {
        Swal.fire({
          title: 'Formato no permitido',
          text: 'Solo se permiten archivos PDF o Word.',
          icon: 'error',
          confirmButtonText: 'Ok'
        });
        return; // Terminar si el formato no es válido
      }

      // Si el archivo es válido, almacenarlo en una variable
      this.formHojaDeVida2.patchValue({
        archivoHojaDeVida: archivo
      });

      Swal.fire({
        title: 'Archivo cargado',
        text: `El archivo "${archivo.name}" se cargó correctamente.`,
        icon: 'success',
        confirmButtonText: 'Ok'
      });
    }
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

  haceCuantoViveEnlaZona: any[] = [
    'MENOS DE UN MES',
    'UN MES',
    'MÁS DE 2 MESES',
    'MÁS DE 6 MESES',
    'TODA LA VIDA'
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
    'COLOMBIANA',
    'VENEZOLANA',
    'ESTADOUNIDENSE',
    'ECUATORIANA',
    'PERUANA',
    'ESPAÑOLA',
    'CUBANA',
    'ARGENTINA',
    'MEXICANA',
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
    { value: true, display: 'SÍ' },
    { value: false, display: 'NO' },
  ];

  listamanos: any[] = [
    {
      mano: 'ZURDO',
      descripcion: 'ZURDO (ESCRIBE CON LA MANO IZQUIERDA)',
    },
    {
      mano: 'DIESTRO',
      descripcion: 'DIESTRO (ESCRIBE CON LA MANO DERECHA)',
    },
    {
      mano: 'AMBIDIESTRO',
      descripcion: 'AMBIDIESTRO (ESCRIBE CON AMBAS MANOS)',
    },
  ];


  tiposVivienda = ['CASA', 'APARTAMENTO', 'FINCA', 'HABITACIÓN'];

  tiposVivienda2: string[] = [
    'PROPIA TOTALMENTE PAGA',
    'PROPIA LA ESTÁN PAGANDO',
    'ARRIENDO',
    'FAMILIAR',
  ];


  caracteristicasVivienda: string[] = ['OBRA NEGRA', 'OBRA GRIS', 'TERMINADA'];

  comodidades: string[] = [
    'GAS NATURAL',
    'TELÉFONO FIJO',
    'INTERNET',
    'LAVADERO',
    'PATIO',
    'LUZ',
    'AGUA',
    'TELEVISIÓN',
  ];


  expectativasVida: string[] = [
    'EDUCACIÓN PROPIA',
    'EDUCACIÓN DE LOS HIJOS',
    'COMPRA DE VIVIENDA',
    'COMPRA DE AUTOMÓVIL',
    'VIAJAR',
    'OTRO',
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
    'SIN ESTUDIOS',
    'OTROS',
  ];

  listaEscoText: any[] = [
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
    },
    {
      esco: 'OTRO',
      descripcion:
        'OTRO (ESCRIBIR PRIMERO TÍTULO LUEGO NOMBRE) EJ: TÉCNICO ELECTRICISTA',
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
    'PADRE',
    'MADRE',
    'ABUELO/ABUEL@',
    'BISABUELO/BISABUEL@',
    'TÍ@',
    'PRIM@',
    'SOBRIN@',
    'HERMAN@',
    'CUÑAD@',
    'ESPOS@',
    'HIJ@',
    'NIET@',
    'BISNIET@',
    'SUEGR@',
    'YERN@',
    'HERMANASTR@',
    'MEDI@ HERMAN@',
    'PADRE ADOPTIVO',
    'MADRE ADOPTIVA',
    'HIJ@ ADOPTIV@',
    'ABUEL@ ADOPTIV@',
    'PADRE BIOLÓGICO',
    'MADRE BIOLÓGICA',
    'HIJ@ BIOLÓGIC@',
    'PADRE DE CRIANZA',
    'MADRE DE CRIANZA',
    'HIJ@ DE CRIANZA',
    'TUTOR LEGAL',
    'CURADOR LEGAL',
    'PADRIN@',
    'COMPADR@',
    'CONCUBIN@',
    'EX-ESPOS@',
    'AMIG@',
    'NINGUNO',
  ];


  Ocupacion: any[] = [
    'EMPLEADO',
    'INDEPENDIENTE',
    'HOGAR (AM@ DE CASA)',
    'DESEMPLEADO',
    'OTRO',
  ];

  listaMotivosRetiro: any[] = [
    'RENUNCIA VOLUNTARIA',
    'DESPIDO',
    'REDUCCIÓN DE PERSONAL',
    'CIERRE DE LA EMPRESA',
    'FIN DE CONTRATO TEMPORAL',
    'ABANDONO DE CARGO',
  ];


  listaAreas: any[] = ['CULTIVO', 'POSCOSECHA', 'AMBAS', 'OTRO'];

  listaCalificaciones: any[] = ['BAJO', 'MEDIO', 'EXCELENTE'];

  listaDuracion: any[] = [
    'MENOS DE UN MES',
    '3 MESES',
    '6 MESES',
    '1 AÑO',
    '2 AÑOS',
    'MÁS DE 2 AÑOS',
    'TODA LA VIDA',
  ];

  listatiposVivienda: any[] = [
    'CASA',
    'APARTAMENTO',
    'CASA-LOTE',
    'FINCA',
    'HABITACIÓN',
  ];

  oficinas: string[] = [
    'ANDES', 'BOSA', 'CARTAGENITA', 'FACA_PRIMERA', 'FACA_PRINCIPAL', 'FONTIBÓN',
    'FORANEOS', 'FUNZA', 'MADRID', 'MONTE_VERDE', 'ROSAL', 'SOACHA', 'SUBA',
    'TOCANCIPÁ', 'USME'
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

  listaPersonasQueCuidan: any[] = [
    'YO',
    'PAREJA O ESPOSA',
    'AMIGOS',
    'JARDÍN',
    'SON INDEPENDIENTES',
    'FAMILIAR',
    'COLEGIO',
    'UNIVERSIDAD',
    'AMIG@S',
    'NIÑERA',
    'DUEÑA APARTAMENTO',
  ];

  listaPosiblesRespuestasPersonasACargo: any[] = [
    'HIJOS',
    'ABUELOS',
    'PAPÁS',
    'HERMANOS',
    'PERSONAS CON CUIDADOS ESPECIALES',
    'OTRO',
    'TÍOS',
  ];


  opcionesDeExperiencia: any[] = [
    'SECTOR FLORICULTOR (POSCOSECHA- CLASIFICACIÓN, BONCHEO, EMPAQUE, CUARTO FRÍO)',
    'SECTOR FLORICULTOR (CALIDAD- MIPE)',
    'SECTOR FLORICULTOR (ÁREA DE MANTENIMIENTO- ORNATOS, TRABAJO EN ALTURAS, MECÁNICOS, JEFATURAS Y SUPERVISIÓN)',
    'SECTOR COMERCIAL (VENTAS)',
    'SECTOR INDUSTRIAL (ALIMENTOS- TEXTIL- TRANSPORTE)',
    'SECTOR FINANCIERO',
    'SECTOR ADMINISTRATIVO Y CONTABLE',
    'SIN EXPERIENCIA',
  ];

  tiempoTrabajado: any[] = [
    'DE 15 DÍAS A 1 MES (UNA TEMPORADA)',
    'DE 2 A 6 MESES',
    'MÁS DE 6 MESES',
    'UN AÑO O MÁS',
  ];

  cursosDespuesColegio: any[] = [
    'TÉCNICO',
    'TECNÓLOGO',
    'UNIVERSIDAD',
    'ESPECIALIZACIÓN',
    'NINGUNA',
  ];

  areasExperiencia: string[] = [
    'SECTOR FLORICULTOR (POSCOSECHA- CLASIFICACIÓN, BONCHEO, EMPAQUE, CUARTO FRÍO)',
    'SECTOR FLORICULTOR (CALIDAD- MIPE)',
    'SECTOR FLORICULTOR (ÁREA DE MANTENIMIENTO- ORNATOS, TRABAJO EN ALTURAS, MECÁNICOS, ELECTRICISTAS)',
    'JEFATURAS Y SUPERVISIÓN',
    'SECTOR COMERCIAL (VENTAS)',
    'SECTOR INDUSTRIAL (ALIMENTOS- TEXTIL- TRANSPORTE)',
    'SECTOR FINANCIERO',
    'SECTOR ADMINISTRATIVO Y CONTABLE',
    'SIN EXPERIENCIA',
  ];

}
