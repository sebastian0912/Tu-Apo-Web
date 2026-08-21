import {  Component, Inject, OnInit, Optional, PLATFORM_ID, ViewChild, ChangeDetectorRef, AfterViewInit, OnDestroy, Injectable , ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, Validators, FormControl, FormArray, ReactiveFormsModule, AbstractControl, ValidatorFn, ValidationErrors } from '@angular/forms';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, MAT_DATE_LOCALE, DateAdapter, MAT_DATE_FORMATS, NativeDateAdapter } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatMenuModule } from '@angular/material/menu';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, merge, firstValueFrom, fromEvent } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { takeUntil, debounceTime, startWith } from 'rxjs/operators';
import Swal from 'sweetalert2';

import { ParametrizacionS } from '../../services/parametrizacion/parametrizacion-s';
import { RegistroProcesoContratacion } from '../../services/registro-proceso-contratacion/registro-proceso-contratacion';
import { CandidateS } from '../../../../../../shared/services/candidate-s/candidate-s';
import { DocumentManagementS } from '../../../../../../shared/services/document-management-s/document-management-s';
import { CandidatoNewS } from '../../../../../../shared/services/candidato-new/candidato-new-s';
import { CapturaCedula } from '../../../../../../shared/components/captura-cedula/captura-cedula';
import { CapturaFoto } from '../../../../../../shared/components/captura-foto/captura-foto';
import { PoliciesModal } from '../../components/policies-modal/policies-modal';
import { detectarDominioEnUsuario } from './email-warning.util';

// Claves con prefijo propio. Antes la guardia del borrador vivía en
// 'numeroCedula', la MISMA clave que escribe form-vacancies.ts:527; si la
// persona pasaba por esa pantalla, la cédula guardada cambiaba y restoreDraft
// descartaba el borrador en silencio aunque siguiera almacenado.
const STORAGE_KEY = 'tuapo.hv2.draft';
const CEDULA_KEY = 'tuapo.hv2.cedula';
const STEP_KEY = 'tuapo.hv2.step';
// Momento en que se guardó el borrador. Sin esto los datos personales se
// quedaban en el equipo indefinidamente (el formulario se llena en oficinas
// con computadores compartidos). Ver `BORRADOR_TTL_MS` y `limpiarBorrador()`.
const STAMP_KEY = 'tuapo.hv2.ts';

// Claves anteriores: se leen una sola vez para no perder borradores en curso.
const STORAGE_KEY_LEGACY = 'formHojaDeVida2';
const CEDULA_KEY_LEGACY = 'numeroCedula';

// Campos que guardan un `Date`. `JSON.stringify` de un Date da una cadena ISO,
// pero antes de eso `sanitizeForStorage` lo copiaba campo por campo y un Date
// no tiene propiedades enumerables: quedaba `{}`. Al restaurar, ese `{}` pasaba
// `Validators.required` (no está vacío) y `aFecha()` lo volvía null, así que el
// candado de edad mínima dejaba de aplicar y la fecha viajaba vacía al backend.
const CAMPOS_FECHA = ['fechaNacimiento', 'fechaExpedicionCC', 'anoFinalizacion', 'fechaRetiro1'] as const;
const CAMPOS_FECHA_HIJO = ['fechaNacimientoHijo'] as const;

// Empresa para el modal de tratamiento de datos. Se resuelve por el query param
// ?empresa= del link (slugs alineados con firma/:empresa y foto/:empresa).
// Default: TU ALIANZA SAS cuando el link no trae empresa o trae un slug inválido.
const EMPRESAS: Record<string, string> = {
  'apoyo-laboral': 'APOYO LABORAL T.S. S.A.S.',
  'tu-alianza': 'TU ALIANZA SAS',
};
const EMPRESA_DEFAULT = 'tu-alianza';

// Apellidos reales llevan apóstrofo y guion (O'CONNOR, ANA-MARÍA) y la diéresis
// existe en español (ARGÜELLO). El punto permite la inicial intermedia ("J.").
const REGEX_NAMES = /^[a-zA-ZñÑáéíóúüÁÉÍÓÚÜ'’\-.\s]+$/;
const REGEX_NUMERIC = /^\d+$/;
const REGEX_PHONE_CO = /^3\d{9}$/;

// Tope de hijos que se pueden detallar (coincide con Validators.max del control).
const MAX_HIJOS = 10;
// Adjunto de hoja de vida: solo PDF real y con tope de tamaño.
// 50 MB para no rechazar en el navegador lo que el backend sí acepta
// (`MAX_UPLOAD_MB` en gestion_documental/models.py). Una HV escaneada con el
// celular pasa de 10 MB con facilidad.
const MAX_ARCHIVO_MB = 50;
const MIME_PDF = new Set(['application/pdf', 'application/x-pdf', 'application/acrobat']);

const OPCION_BINARIA = [{ value: 'SI', display: 'SÍ' }, { value: 'NO', display: 'NO' }];
const PARENT_STATUS_OPTIONS = [
  { value: 'VIVE', display: 'VIVE' },
  { value: 'NO VIVE', display: 'NO VIVE' },
  { value: 'NO LO CONOCE', display: 'NO LO CONOCE' }
];
const MOTIVO_RETIRO_OPTIONS = ['VOLUNTARIO', 'TERMINACION DE CONTRATO', 'ABANDONO DE CARGO'];

// Fuente de verdad: gestion_admin.Sede == NUMERO_POR_OFICINA del backend
// (GET /gestion_contratacion/oficinas/). Toda oficina de esta lista TIENE
// rango de numeracion de contratos; si se agrega una que no lo tenga, el
// backend rechaza el guardado con 400.
const OFICINAS = [
  'ADMINISTRATIVOS',
  'ANDES',
  'BOSA',
  'CARTAGENITA',
  'FACA_PRIMERA',
  'FACA_PRINCIPAL',
  'FONTIBÓN',
  'FORANEOS',
  'FUNZA',
  'MADRID',
  'MONTE_VERDE',
  'ROSAL',
  'SOACHA',
  'SOTAQUIRA',
  'SUBA',
  'TOCANCIPÁ',
  'USME',
  'VIRTUAL',
  'ZIPAQUIRÁ',
];

/**
 * Reglas de número de documento POR TIPO. Este par (tipo, número) es la llave
 * con la que se consulta y se registra a la persona en todo el sistema: si entra
 * mal acá, se crea un registro paralelo y no hay forma de que la persona se
 * encuentre a sí misma después.
 *
 * Los tipos son los del catálogo canónico del backend
 * (`gestion_catalogos/tipos_doc.py` → CANONICOS + TOLERADOS). `CTRA` es la
 * contraseña: el comprobante de una cédula en trámite, así que lleva el MISMO
 * número que la cédula y comparte regla con `CC`.
 *
 * Los rangos son deliberadamente amplios: bloquear a alguien con un documento
 * real es peor que dejar pasar un dígito de más. Solo se rechaza lo que no puede
 * existir.
 */
const REGLAS_DOC: Record<string, { min: number; max: number; nombre: string; ejemplo: string; nuip?: boolean }> = {
  // Cédula de ciudadanía. Dos generaciones conviven:
  //  - Antiguas: la numeración arrancó en 1 (1952) y las de mujeres desde
  //    20'000.001 (1956), así que llegan hasta 8 dígitos.
  //  - NUIP: desde 2003-2004 la Registraduría numera consecutivo DESDE
  //    1.000.000.000, sin distinguir sexo. Desde ~2023 también expide la serie
  //    2.000.000.000 (cédulas reales, p.ej. 2.000.013.887 exp. feb-2023).
  //    Por eso una cédula de 10 dígitos empieza por 1 o por 2.
  CC: { min: 6, max: 10, nombre: 'Cédula de Ciudadanía', ejemplo: '1005851505', nuip: true },
  // Contraseña = cédula en trámite: mismo número que la CC.
  CTRA: { min: 6, max: 10, nombre: 'Contraseña', ejemplo: '1005851505', nuip: true },
  // Cédula de extranjería: Migración Colombia la numera en paralelo a las
  // cédulas y el largo es variable (se ven desde 5-6 dígitos hasta 10).
  CE: { min: 5, max: 10, nombre: 'Cédula de Extranjería', ejemplo: '428531' },
  // Permiso por Protección Temporal (Migración Colombia). PET/PEP son sus
  // antecesores: el backend todavía aterriza en 'PET' (TIPO_PERMISO_CANONICO en
  // gestion_catalogos/tipos_doc.py) hasta que se migren las filas viejas, así
  // que las tres claves comparten regla.
  // OJO: a diferencia de CC y CE, no hay norma pública que fije el largo del
  // número de PPT; este rango sale de los ~4.900 permisos ya registrados (el
  // 96% son de 7 dígitos). Ante la duda se dejó ancho: bloquear a un migrante
  // con un permiso legítimo es peor que aceptarle un dígito de más.
  PPT: { min: 6, max: 11, nombre: 'Permiso de Permanencia Temporal', ejemplo: '7654321' },
  PET: { min: 6, max: 11, nombre: 'Permiso de Permanencia Temporal', ejemplo: '7654321' },
  PEP: { min: 6, max: 11, nombre: 'Permiso de Permanencia Temporal', ejemplo: '7654321' },
  // Tarjeta de identidad: tolerada por el backend, no se ofrece en el desplegable.
  TI: { min: 10, max: 11, nombre: 'Tarjeta de Identidad', ejemplo: '1012345678' },
};

/** Rango a usar cuando el tipo no está en la tabla (catálogo con un valor nuevo). */
const REGLA_DOC_POR_DEFECTO = { min: 5, max: 15, nombre: 'Documento', ejemplo: '1005851505' };

@Injectable()
export class CustomDateAdapter extends NativeDateAdapter {
  override format(date: Date, displayFormat: Object): string {
    if (displayFormat === 'input') {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return date.toDateString();
  }
}

@Component({
  selector: 'app-forms-test-contratation',
  imports: [
    CommonModule, ReactiveFormsModule, RouterModule,
    MatStepperModule, MatInputModule, MatButtonModule, MatSelectModule, MatAutocompleteModule,
    MatDatepickerModule, MatNativeDateModule, MatIconModule, MatCheckboxModule,
    MatRadioModule, MatDialogModule, MatMenuModule,
    CapturaCedula, CapturaFoto
  ],
  templateUrl: './forms-test-contratation.html',
  styleUrl: './forms-test-contratation.css',
  providers: [
    { provide: DateAdapter, useClass: CustomDateAdapter },
    {
      provide: MAT_DATE_FORMATS, useValue: {
        parse: { dateInput: { month: 'short', year: 'numeric', day: 'numeric' } },
        display: {
          dateInput: 'input',
          monthYearLabel: { year: 'numeric', month: 'short' },
          dateA11yLabel: { year: 'numeric', month: 'long', day: 'numeric' },
          monthYearA11yLabel: { year: 'numeric', month: 'long' },
        }
      }
    },
    { provide: MAT_DATE_LOCALE, useValue: 'es-CO' },
    // Varios hints/errores ocupan 2-3 líneas y con el subscript "fixed" de
    // Material (reserva exactamente 1 línea) el texto se pintaba ENCIMA de la
    // fila siguiente. "dynamic" hace crecer el campo y nada se superpone.
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: { appearance: 'outline', subscriptSizing: 'dynamic' }
    }
  ],
})

export class FormsTestContratation implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('stepper') stepper!: MatStepper;
  private readonly destroy$ = new Subject<void>();
  isBrowser: boolean;

  searchForm: FormGroup; // Pre-check form
  isSearching = false;
  showForm = false; // Toggles between search and main form

  // Precarga (Modelo A) disparada por la fecha de expedición dentro del form.
  // `prefillEnCurso` corta la reentrada (la precarga escribe fechaExpedicionCC)
  // y `prefillResuelto` solo se marca cuando la precarga REALMENTE trajo datos:
  // antes se marcaba siempre, así que equivocarse en la fecha de expedición
  // (lo más común) mataba la precarga para el resto de la sesión.
  private prefillEnCurso = false;
  private prefillResuelto = false;
  /** Última fecha ya consultada: evita repetir la misma llamada fallida. */
  private ultimaFechaPrefill = '';
  cargandoPrefill = false;

  /** Envío en curso: bloquea el botón para que no salgan dos registros. */
  enviando = false;
  // RF-024/025: bloquea "Siguiente" mientras se persiste el paso (evita doble-clic y el
  // avance optimista antes de confirmar el guardado en BD).
  guardandoPaso = false;

  /** `cedula|correo` para el que ya se intentó crear la cuenta de acceso. */
  private usuarioRegistradoPara = '';

  formHojaDeVida2: FormGroup;
  loadingCatalogos = false;

  // Stepper State
  stepperTotal = 0;
  stepperIndex = 0;
  stepperProgress = 0;

  hidePassword = true;

  // Data & Catalogs
  numeroCedula = '';
  datos: any[] = []; // Colombia JSON
  uploadedFiles: { [key: string]: { file: File | string; fileName: string } | undefined } = {};

  // Catalogs (Public properties for HTML access)
  tipoDocs: any[] = [];
  generos: string[] = [];
  listatiposdesangre: string[] = [];
  estadosCiviles: any[] = [];
  listamanos: any[] = [];
  listaParentescosFamiliares: string[] = [];
  // RF-046: tipos de documento del dependiente (RC/TI/CC/CE) — catálogo TIPOS_DOC_DEPENDIENTE.
  tiposDocDependiente: { codigo: string; descripcion: string }[] = [];
  Ocupacion: string[] = [];
  listaEscolaridad: string[] = [];
  // RF-014/016 (solo presentación): el GRADO se muestra con nombre legible y "Sin estudio"
  // va primero, pero el `value` guardado sigue siendo el código del catálogo
  // CATALOGO_NIVELES_ESCOLARIDAD ('1'..'11','SIN ESTUDIOS','OTROS'). No cambia backend ni BD.
  listaEscolaridadOpts: { codigo: string; label: string }[] = [];
  private static readonly GRADO_ESCOLARIDAD_LABEL: Record<string, string> = {
    'SIN ESTUDIOS': 'Sin estudio', '1': 'Primero', '2': 'Segundo', '3': 'Tercero',
    '4': 'Cuarto', '5': 'Quinto', '6': 'Sexto', '7': 'Séptimo', '8': 'Octavo',
    '9': 'Noveno', '10': 'Décimo', '11': 'Undécimo', 'OTROS': 'Otros',
  };
  private static readonly GRADO_ESCOLARIDAD_ORDEN = [
    'SIN ESTUDIOS', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', 'OTROS',
  ];
  // RF-017: opciones de "Nivel de educación superior" (aparecen al elegir 'Otros' en el grado).
  // Catálogo definitivo pendiente de validación → hardcodeado provisional. El `codigo` va en
  // MAYÚSCULAS porque el payload se envía en mayúsculas; así el prefill vuelve a casar el valor
  // guardado en `estudios_extra`. La etiqueta legible es solo presentación.
  readonly nivelSuperiorOpts: { codigo: string; label: string }[] = [
    { codigo: 'TÉCNICO', label: 'Técnico' },
    { codigo: 'TECNÓLOGO', label: 'Tecnólogo' },
    { codigo: 'PROFESIONAL', label: 'Profesional' },
    { codigo: 'ESPECIALIZACIÓN', label: 'Especialización' },
    { codigo: 'MAESTRÍA', label: 'Maestría' },
    { codigo: 'DOCTORADO', label: 'Doctorado' },
    { codigo: 'CURSO / DIPLOMADO', label: 'Curso / Diplomado' },
    { codigo: 'CERTIFICACIÓN', label: 'Certificación' },
    { codigo: 'OTRO', label: 'Otro' },
  ];
  // RF-029: catálogo DOTACION_TALLA (sexo + tipo de prenda + talla, parametrizable en meta_valores) y
  // listas derivadas por prenda según el género. Administrable sin tocar la lógica del formulario.
  dotacionTallasRaw: { codigo: string; sexo: string; tipoPrenda: string; talla: string; orden: number }[] = [];
  tallasCamisa: string[] = [];
  tallasPantalon: string[] = [];
  tallasChaqueta: string[] = [];
  tallasCalzado: string[] = [];
  comodidades: string[] = [];
  opcionesPromocion: string[] = [];
  listaPosiblesRespuestasConquienVive: string[] = [];
  personasACargoOptions: string[] = [];
  tiposVivienda: string[] = [];
  caracteristicasVivienda: string[] = [];
  areasExperiencia: string[] = [];
  tiempoTrabajado: string[] = [];
  expectativasVida: string[] = [];
  haceCuantoViveEnlaZona: string[] = [];
  listaPersonasQueCuidan: string[] = [];
  cursosDespuesColegio: string[] = []; // Multi-select studies

  // Search Controls for Selects
  searchDeptoRes = new FormControl('');
  searchMunRes = new FormControl('');
  searchDeptoExp = new FormControl('');
  searchMunExp = new FormControl('');
  searchDeptoNac = new FormControl('');
  searchMunNac = new FormControl('');
  // RF-032/035: cascadas nuevas (residencia anterior y contacto de emergencia).
  searchDeptoResAnt = new FormControl('');
  searchMunResAnt = new FormControl('');
  searchDeptoEmer = new FormControl('');
  searchMunEmer = new FormControl('');
  // RF-036/044: cascada territorial de la empresa anterior (experiencia laboral #1).
  searchDeptoEmp = new FormControl('');
  searchMunEmp = new FormControl('');

  // Computed / Dynamic Lists (+ Filtered versions)
  ciudadesResidencia: string[] = [];
  filteredDeptoRes: any[] = [];
  filteredMunRes: string[] = [];

  ciudadesExpedicionCC: string[] = [];
  filteredDeptoExp: any[] = [];
  filteredMunExp: string[] = [];

  ciudadesNacimiento: string[] = [];
  filteredDeptoNac: any[] = [];
  filteredMunNac: string[] = [];

  ciudadesResidenciaAnterior: string[] = [];
  filteredDeptoResAnt: any[] = [];
  filteredMunResAnt: string[] = [];

  ciudadesEmergencia: string[] = [];
  filteredDeptoEmer: any[] = [];
  filteredMunEmer: string[] = [];

  ciudadesEmpresa: string[] = [];
  filteredDeptoEmp: any[] = [];
  filteredMunEmp: string[] = [];

  // RF-036 (familia): cascadas territoriales de TODAS las direcciones del paso Familia
  // (cónyuge, padre, madre y las 4 referencias). Se manejan por diccionario para no
  // declarar 21 propiedades sueltas; el patrón (depto→municipio, texto de colombia.json)
  // es el mismo que residencia/empresa. Claves = sufijo del control (departamento<Key>).
  readonly FAM_DIRECCIONES = ['Conyuge', 'Padre', 'Madre', 'RefPersonal1', 'RefPersonal2', 'RefFamiliar1', 'RefFamiliar2'] as const;
  busqFam: Record<string, FormControl> = {};      // '<Key>Dep' / '<Key>Mun' (buscadores del selectField)
  ciudadesFam: Record<string, string[]> = {};     // municipios del depto elegido, por dirección
  filteredDeptoFam: Record<string, any[]> = {};
  filteredMunFam: Record<string, string[]> = {};

  // Options
  opcionBinaria = OPCION_BINARIA;
  parentStatusOptions = PARENT_STATUS_OPTIONS;
  motivoRetiroOptions = MOTIVO_RETIRO_OPTIONS;
  oficinas = OFICINAS;

  dominiosCorreo = [
    'GMAIL.COM', 'HOTMAIL.COM', 'YAHOO.COM', 'ICLOUD.COM', 'OUTLOOK.COM',
    'OUTLOOK.ES', 'MAIL.COM', 'YAHOO.COM.CO', 'UNICARTAGENA.EDU.CO',
    'CUN.EDU.CO', 'MISENA.EDU.CO', 'UNIGUAJIRA.EDU.CO', 'UNILLANOS.EDU.CO',
    'UCUNDINAMARCA.EDU.CO', 'UNCUNDINAMARCA.EDU.CO', 'USANTOTOMAS.EDU.CO',
    'UNAL.EDU.CO', 'UNICAUCA.EDU.CO', 'UNIMILITAR.EDU.CO', 'HOTMAIL.COM.CO',
    'HOTMAIL.COM.AR', 'LASVILLAS.EMAIL', 'YAHOO.ES'
  ].sort(); // Sorted alphabetically for better UX

  /**
   * ADVERTENCIA (no validación): el Usuario parece traer un dominio pegado
   * ("ivvangmail.com", "ivvan@gmail.com"). Solo pinta el campo en amarillo y
   * muestra un aviso; el control sigue válido y el formulario se puede guardar.
   * Se recalcula en la misma suscripción que arma el correo completo.
   */
  avisoDominioEnUsuario = false;

  // Search Controls for Selects
  searchDominio = new FormControl('');
  filteredDominios: string[] = [];

  // File Types Mapping
  // 28 = HOJA_DE_VIDA_M en table_document_type (prod)
  typeMap: { [key: string]: number } = {
    hojaDeVida: 28
  };

  // Catalog Config Map - Updated to match JSON structure
  private readonly CATALOG_CONFIG = {
    'TIPOS_IDENTIFICACION': { prop: 'tipoDocs', map: (d: any) => ({ abbreviation: d.codigo, description: d.descripcion }) },
    'SEXO': { prop: 'generos', map: (d: any) => d.codigo }, // M/F
    'RH': { prop: 'listatiposdesangre', map: (d: any) => d.nombre }, // RH uses 'nombre'
    'ESTADOS_CIVILES': { prop: 'estadosCiviles', map: (d: any) => ({ codigo: d.codigo, descripcion: d.descripcion }) },
    'DOMINANCIA_MANUAL': { prop: 'listamanos', map: (d: any) => ({ mano: d.codigo, descripcion: d.descripcion }) },
    // Improve Parentesco to show description if available, else name, else code
    'PARENTESCOS_FAMILIARES': { prop: 'listaParentescosFamiliares', map: (d: any) => ({ codigo: d.codigo, descripcion: d.descripcion || d.nombre || d.codigo }) },
    // RF-046: tipos de documento del dependiente (RC/TI/CC/CE).
    'TIPOS_DOC_DEPENDIENTE': { prop: 'tiposDocDependiente', map: (d: any) => ({ codigo: d.codigo, descripcion: d.descripcion || d.nombre || d.codigo }) },
    'OCUPACIONES': { prop: 'Ocupacion', map: (d: any) => d.codigo },
    'CATALOGO_NIVELES_ESCOLARIDAD': { prop: 'listaEscolaridad', map: (d: any) => d.codigo },
    // RF-029: se conserva el `sexo` del valor del catálogo (hoy vacío = unisex) para poder filtrar
    // las tallas según el género seleccionado sin hardcodear rangos (catálogo productivo pendiente).
    // RF-029: catálogo único parametrizado por sexo + tipo de prenda. `codigo` = sexo|prenda|talla
    // para que el dedup de loadCatalogs NO colapse tallas iguales de prendas/sexos distintos.
    'DOTACION_TALLA': { prop: 'dotacionTallasRaw', map: (d: any) => ({ codigo: `${d.sexo ?? ''}|${d.tipo_prenda ?? ''}|${d.talla ?? ''}`, sexo: String(d.sexo ?? '').toUpperCase().trim(), tipoPrenda: String(d.tipo_prenda ?? '').toUpperCase().trim(), talla: String(d.talla ?? ''), orden: Number(d.orden ?? 0) }) },
    'CATALOGO_SERVICIOS': { prop: 'comodidades', map: (d: any) => d.codigo },
    'CATALOGO_MARKETING': { prop: 'opcionesPromocion', map: (d: any) => d.codigo },
    'CATALOGO_CON_QUIEN_VIVE': { prop: 'listaPosiblesRespuestasConquienVive', map: (d: any) => d.codigo },
    'CATALOGO_PERSONAS_ACARGO': { prop: 'personasACargoOptions', map: (d: any) => d.codigo },
    'CATALOGO_TIPOS_VIVIENDA': { prop: 'tiposVivienda', map: (d: any) => d.codigo },
    'CATALOGO_CARACTERISTICAS_VIVIENDA': { prop: 'caracteristicasVivienda', map: (d: any) => d.codigo },
    'AREAS_EXPERIENCIA': { prop: 'areasExperiencia', map: (d: any) => d.codigo },
    'TIEMPO_EXPERIENCIA': { prop: 'tiempoTrabajado', map: (d: any) => d.nombre }, // Uses 'nombre'
    'EXPECTATIVAS_VIDA': { prop: 'expectativasVida', map: (d: any) => d.codigo },
    'HACE_CUENTO_ZONA': { prop: 'haceCuantoViveEnlaZona', map: (d: any) => d.nombre }, // Uses 'nombre'
    'CUIDADOR_HIJOS': { prop: 'listaPersonasQueCuidan', map: (d: any) => d.nombre }, // Uses 'nombre'
    'ESTUDIOS': { prop: 'cursosDespuesColegio', map: (d: any) => d.codigo },
  };

  private readonly CATALOG_KEYS = Object.keys(this.CATALOG_CONFIG);

  /**
   * Orden alfabético en español para las listas que vienen de meta-tabla.
   * `sensitivity: 'base'` iguala acentos y mayúsculas (Á = A) para que no
   * partan el alfabeto; `numeric` ordena "2" antes que "10".
   */
  private static readonly COLLATOR_ES = new Intl.Collator('es', {
    sensitivity: 'base',
    numeric: true,
  });

  /** Texto que ve el usuario en una opción de catálogo (objeto o escalar). */
  private textoCatalogo(v: any): string {
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') {
      return String(
        v.description ?? v.descripcion ?? v.nombre ?? v.talla ?? v.codigo ?? v.abbreviation ?? v.mano ?? ''
      ).trim();
    }
    return String(v).trim();
  }

  /**
   * Texto comparable: mayúsculas y sin tildes. `colombia.json` guarda los
   * departamentos en capitalización normal ("Cundinamarca") pero el backend los
   * devuelve en MAYÚSCULAS, así que comparar con `===` dejaba la lista de
   * municipios vacía en toda precarga.
   */
  private normalizarTexto(v: any): string {
    return String(v ?? '').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  /** Departamento tal como está escrito en colombia.json (o el original si no existe). */
  private canonDepto(v: any): string {
    const t = this.normalizarTexto(v);
    if (!t) return '';
    const d = this.datos?.find((x: any) => this.normalizarTexto(x.departamento) === t);
    return d?.departamento ?? String(v ?? '').trim();
  }

  /** Municipio tal como está escrito en colombia.json (o el original si no existe). */
  private canonCiudad(depto: any, v: any): string {
    const t = this.normalizarTexto(v);
    if (!t) return '';
    const d = this.datos?.find((x: any) => this.normalizarTexto(x.departamento) === this.normalizarTexto(depto));
    return (d?.ciudades ?? []).find((c: string) => this.normalizarTexto(c) === t) ?? String(v ?? '').trim();
  }

  /** Escapa texto que viene del backend o del usuario antes de meterlo en el HTML de un Swal. */
  private esc(v: any): string {
    return String(v ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /** Clave de deduplicación: el código si existe, si no el texto visible. */
  private claveCatalogo(v: any): string {
    if (v !== null && typeof v === 'object') {
      return String(
        v.abbreviation ?? v.codigo ?? v.mano ?? v.talla ?? this.textoCatalogo(v)
      ).toUpperCase().trim();
    }
    return String(v ?? '').toUpperCase().trim();
  }

  constructor(
    private fb: FormBuilder,
    private parametrizacionS: ParametrizacionS,
    private route: ActivatedRoute,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
    private registroProcesoContratacion: RegistroProcesoContratacion,
    private gestionDocumentosService: DocumentManagementS,
    private candidateS: CandidateS,
    private candidatoNewS: CandidatoNewS,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);

    // RF-036 (familia): crea los buscadores y listas de cada cascada territorial de
    // familia antes de construir el formulario (la plantilla los enlaza por diccionario).
    for (const k of this.FAM_DIRECCIONES) {
      this.busqFam[k + 'Dep'] = new FormControl('');
      this.busqFam[k + 'Mun'] = new FormControl('');
      this.ciudadesFam[k] = [];
      this.filteredDeptoFam[k] = [];
      this.filteredMunFam[k] = [];
    }

    // 1. Init Search Form (Pre-check)
    // La fecha de expedición NO se pide acá: vive en el paso "Identificación"
    // del formulario y desde allí dispara la precarga (segundo factor del
    // endpoint prefill-by-document). Ver `initPrefillPorFechaExpedicion()`.
    // El largo ya NO se fija acá: lo decide `numeroSegunTipoValidator` según el
    // tipo elegido (una CE de 5 dígitos es válida y una CC de 5 no lo es).
    this.searchForm = this.fb.group({
      tipo_doc: ['CC', Validators.required],
      numero_documento: ['', [
        Validators.required,
        Validators.pattern(REGEX_NUMERIC),
        this.notPhoneNumberValidator(),
        this.numeroSegunTipoValidator('tipo_doc'),
      ]],
    });

    // 2. Init Main Form
    this.formHojaDeVida2 = this.initForm();
  }

  ngOnInit(): void {
    this.openPoliciesDialog();
    this.loadCatalogs();
    this.cargarDatosJSON(); // Colombia
    this.initObservables();
    this.initSearchFilters();
    this.initAutocompleteMirror();
    this.initPrefillPorFechaExpedicion();
    this.vigilarFechasIdentidad();
    this.revalidarNumeroAlCambiarTipo(this.searchForm, 'tipo_doc', 'numero_documento');
    this.revalidarNumeroAlCambiarTipo(this.formHojaDeVida2, 'tipoDoc', 'numeroCedula');
    this.initAutoSave();

    // Oficina desacoplada del enlace público: hay UN solo link general por empresa
    // (?empresa=apoyo-laboral) para todas las sedes. El candidato elige su oficina en
    // el formulario (control 'oficina', required). Un ?oficina= de un enlace antiguo se
    // ignora a propósito: no precarga, no bloquea el campo y no rompe la página.
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    Promise.resolve().then(() => {
      this.updateStepperStats();
      this.updateStickyOffset();
    });

    if (this.stepper) {
      merge(this.stepper.selectionChange, this.stepper.steps.changes)
        .pipe(startWith(null), takeUntil(this.destroy$))
        .subscribe(() => {
          Promise.resolve().then(() => {
            this.updateStepperStats();
            // Recalculate offset in case lines wrap or stats appear
            setTimeout(() => this.updateStickyOffset(), 100);
          });
        });
    }

    // Resize Listener for sticky adjustment
    fromEvent(window, 'resize')
      .pipe(debounceTime(100), takeUntil(this.destroy$))
      .subscribe(() => this.updateStickyOffset());
  }

  updateStickyOffset() {
    if (!this.isBrowser) return;
    const mobileHeader = document.querySelector('.mobile-sticky-group') as HTMLElement;
    if (mobileHeader) {
      const height = mobileHeader.offsetHeight;
      document.documentElement.style.setProperty('--mobile-sticky-height', `${height}px`);
    } else {
      document.documentElement.style.setProperty('--mobile-sticky-height', '0px');
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Habeas Data: el candidato debe aceptar sí o sí antes de llenar el formulario.
  // disableClose evita cerrar con ESC o click fuera. PoliciesModal.btnDecline()
  // recarga la página, así que no hay que manejar el resultado.
  private openPoliciesDialog(): void {
    if (!this.isBrowser) return;
    const slug = (this.route.snapshot.queryParamMap.get('empresa') || '').toLowerCase().trim();
    const empresaNombre = EMPRESAS[slug] ?? EMPRESAS[EMPRESA_DEFAULT];
    this.dialog.open(PoliciesModal, {
      disableClose: true,
      data: { empresaNombre },
    });
  }

  async cargarDatosJSON() {
    // La URL es relativa y el error abre un Swal (necesita `document`): en SSR
    // ambas cosas revientan el render del servidor.
    if (!this.isBrowser) return;
    this.http.get('files/utils/colombia.json').subscribe({
      next: (d: any) => {
        this.datos = d;
        this.searchDeptoRes.setValue('');
        this.searchDeptoExp.setValue('');
        this.searchDeptoNac.setValue('');
      },
      error: () => {
        console.error('No se pudo cargar colombia.json');
        Swal.fire({
          icon: 'error',
          title: 'Error cargando datos',
          text: 'No se pudieron cargar los departamentos y municipios. Recargue la página. Si el problema persiste, contacte a soporte.',
          confirmButtonColor: '#111827'
        });
      }
    });
  }

  // ----------------------------------------------------
  // 1. Form Initialization
  // ----------------------------------------------------
  private initForm(): FormGroup {
    const req = Validators.required;

    // Strict Validators
    const name = [req, Validators.minLength(2), Validators.maxLength(30), this.nameValidator()]; // Letters only
    const fullName = [req, Validators.maxLength(60), this.fullNameValidator()]; // Full Name Strict
    const address = [req, Validators.minLength(5), this.addressCOValidator()]; // strict address
    const email = [req, Validators.email, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)];
    const phone = [req, this.phoneCOValidator()]; // 3xxxxxxxxx
    // Mismo criterio que el paso de Validación Previa: el número se juzga contra
    // el tipo. Aplica al borrador restaurado, que entra por el form principal.
    const doc = [req, this.docValidator(), this.numeroSegunTipoValidator('tipoDoc')];

    // Email Split Validators
    const emailUserVal = [req, this.usuarioCorreoValidator()]; // sin tildes, sin espacios, sin @
    const emailDomainVal = [req, Validators.pattern(/^[^@]+\.[a-zA-Z]{2,}$/)]; // No @, valid domain structure

    return this.fb.group({
      // Step 1: Personal (Pre-registration subset)
      oficina: ['', req],
      tipoDoc: ['', req],
      numeroCedula: ['', doc],
      fechaExpedicionCC: ['', [req, this.noFuturaValidator()]],
      departamentoExpedicionCC: ['', req],
      municipioExpedicionCC: [{ value: '', disabled: true }, req],

      pNombre: ['', name],
      sNombre: ['', this.nameValidator(false)], // Optional
      pApellido: ['', name],
      sApellido: ['', this.nameValidator(false)], // Optional
      genero: ['', req],
      fechaNacimiento: ['', [req, this.edadMinimaValidator()]],
      departamentoNacimiento: ['', req],
      municipioNacimiento: [{ value: '', disabled: true }, req],
      estadoCivil: ['', req],

      // Contact & Housing (Step 1 subset)
      correoUsuario: ['', emailUserVal], // NEW
      correoDominio: ['', emailDomainVal], // NEW
      correo: [{ value: '', disabled: true }, email], // Managed automatically, kept for payload/compat

      numCelular: ['', phone],
      numWha: ['', phone],
      direccionResidencia: ['', address],
      zonaResidencia: ['', req],
      departamento: ['', req],
      ciudad: [{ value: '', disabled: true }, req],
      tiempoResidenciaZona: ['', req],
      conQuienViveChecks: [[], req],

      // Fields NOT in Step 1 but required later
      rh: ['', req], // Moved out of step 1 list
      lateralidad: ['', req],
      tallaChaqueta: ['', req],
      tallaPantalon: ['', req],
      tallaCamisa: ['', req],
      tallaCalzado: ['', req],

      // Legacy: el control se conserva por compatibilidad pero ya no se captura ni es obligatorio
      // (RF-030/032: reemplazado por la residencia anterior estructurada de abajo).
      lugarAnteriorResidencia: [''],
      razonCambioResidencia: [''],   // RF-031: obligatorio solo si hubo residencia anterior
      zonasConocidas: [''],
      // RF-032: residencia anterior estructurada (condicional a tiempo != TODO LA VIDA; validators
      // dinámicos vía toggle). Territorio texto (colombia.json), como la residencia actual.
      departamentoResidenciaAnterior: [''],
      municipioResidenciaAnterior: [{ value: '', disabled: true }],
      direccionResidenciaAnterior: [''],
      barrioResidenciaAnterior: [''],

      // Familiar Emergencia (RF-033/034/035): nombre en componentes + ubicación territorial.
      // `familiarEmergencia` (nombre completo) se conserva como DERIVADO por compatibilidad.
      familiarEmergencia: [''],
      emergenciaPrimerNombre: ['', name],
      emergenciaSegundoNombre: ['', this.nameValidator(false)],
      emergenciaPrimerApellido: ['', name],
      emergenciaSegundoApellido: ['', this.nameValidator(false)],
      parentescoFamiliarEmergencia: ['', req],
      telefonoFamiliarEmergencia: ['', phone],
      ocupacionFamiliarEmergencia: [''],
      departamentoEmergencia: ['', req],
      municipioEmergencia: [{ value: '', disabled: true }, req],
      barrioFamiliarEmergencia: ['', req],
      direccionFamiliarEmergencia: ['', [Validators.required]],

      // Education
      escolaridad: ['', req],
      estudiosExtrasSelect: [[]],
      nombreInstitucion: [''],
      anoFinalizacion: [''],
      tituloObtenido: [''],
      // RF-017: educación superior; solo aplica (y es obligatoria) cuando el grado es 'OTROS'.
      // El toggle en initObservables los habilita/valida o los vacía. Persisten en las
      // columnas existentes estudios_extra (nivel) y titulo_obtenido (carrera).
      nivelEducacionSuperior: [''],
      carreraEstudio: [''],
      estudiaActualmente: ['', req],

      // Step 3: Family
      // Conyuge (Validators applied via toggle in observable logic)
      //
      // OJO: estos campos NO nacen obligatorios. Solo se dibujan cuando el
      // estado civil es CA/UL y "¿vive con el cónyuge?" es SI, y es el `toggle`
      // de `initObservables()` el que les pone `required`. Cuando nacían
      // obligatorios, el aviso de "faltan datos" pedía la dirección y el
      // documento del cónyuge sin que existiera ningún campo en pantalla.
      nombresConyuge: [''],
      apellidosConyuge: [''],
      viveConyuge: [''],

      documentoIdentidadConyuge: ['', this.docValidator()],
      direccionConyuge: [''],
      telefonoConyuge: ['', this.phoneCOValidator()],
      barrioMunicipioConyugue: [''],
      ocupacionConyuge: [''],

      // Padres. Igual que el cónyuge: dirección/teléfono/ocupación solo se
      // dibujan (y solo se exigen) cuando el estado es "VIVE".
      // RF-040: nombres en componentes (fuente primaria). El nombre completo legacy
      // `nombrePadre`/`nombreMadre` se conserva como DERIVADO (sin validador propio,
      // ya no se captura directo). Para padre/madre los componentes son OPCIONALES
      // (paridad con el comportamiento previo: el nombre del progenitor no era obligatorio).
      nombrePadre: [''],
      padrePrimerNombre: ['', this.nameValidator(false)],
      padreSegundoNombre: ['', this.nameValidator(false)],
      padrePrimerApellido: ['', this.nameValidator(false)],
      padreSegundoApellido: ['', this.nameValidator(false)],
      elPadreVive: ['', req],
      ocupacionPadre: [''],
      direccionPadre: [''],
      telefonoPadre: ['', this.phoneCOValidator()],
      barrioPadre: [''],

      nombreMadre: [''],
      madrePrimerNombre: ['', this.nameValidator(false)],
      madreSegundoNombre: ['', this.nameValidator(false)],
      madrePrimerApellido: ['', this.nameValidator(false)],
      madreSegundoApellido: ['', this.nameValidator(false)],
      madreVive: ['', req],
      ocupacionMadre: [''],
      direccionMadre: [''],
      telefonoMadre: ['', this.phoneCOValidator()],
      barrioMadre: [''],

      // Referencias — RF-040: primer nombre y primer apellido obligatorios (paridad con el
      // `fullName` previo, que ya exigía el nombre); segundo nombre/apellido opcionales.
      // El `nombreReferencia*` legacy queda derivado, sin validador propio.
      nombreReferenciaPersonal1: [''],
      refPersonal1PrimerNombre: ['', name],
      refPersonal1SegundoNombre: ['', this.nameValidator(false)],
      refPersonal1PrimerApellido: ['', name],
      refPersonal1SegundoApellido: ['', this.nameValidator(false)],
      telefonoReferencia1: ['', phone],
      ocupacionReferencia1: [''],
      direccionReferenciaPersonal1: ['', [Validators.required]],
      tiempoConoceReferenciaPersonal1: [''],
      // Parentesco también en las PERSONALES (p. ej. AMIGO(A)): la entrevista
      // de Selección en TesoroApp lo precarga y quedaba siempre vacío.
      parentescoReferenciaPersonal1: ['', req],

      nombreReferenciaPersonal2: [''],
      refPersonal2PrimerNombre: ['', name],
      refPersonal2SegundoNombre: ['', this.nameValidator(false)],
      refPersonal2PrimerApellido: ['', name],
      refPersonal2SegundoApellido: ['', this.nameValidator(false)],
      telefonoReferencia2: ['', phone],
      ocupacionReferencia2: [''],
      direccionReferenciaPersonal2: ['', [Validators.required]],
      tiempoConoceReferenciaPersonal2: [''],
      parentescoReferenciaPersonal2: ['', req],

      nombreReferenciaFamiliar1: [''],
      refFamiliar1PrimerNombre: ['', name],
      refFamiliar1SegundoNombre: ['', this.nameValidator(false)],
      refFamiliar1PrimerApellido: ['', name],
      refFamiliar1SegundoApellido: ['', this.nameValidator(false)],
      telefonoReferenciaFamiliar1: ['', phone],
      ocupacionReferenciaFamiliar1: [''],
      direccionReferenciaFamiliar1: ['', [Validators.required]],
      parentescoReferenciaFamiliar1: ['', req],
      // barrioReferenciaFamiliar1 REMOVED

      nombreReferenciaFamiliar2: [''],
      refFamiliar2PrimerNombre: ['', name],
      refFamiliar2SegundoNombre: ['', this.nameValidator(false)],
      refFamiliar2PrimerApellido: ['', name],
      refFamiliar2SegundoApellido: ['', this.nameValidator(false)],
      telefonoReferenciaFamiliar2: ['', phone],
      ocupacionReferenciaFamiliar2: [''],
      direccionReferenciaFamiliar2: ['', [Validators.required]],
      parentescoReferenciaFamiliar2: ['', req],
      // barrioReferenciaFamiliar2 REMOVED

      // RF-036 (familia): territorio (departamento → municipio) de cada dirección del paso
      // Familia. Texto de colombia.json, mismo mecanismo que residencia. Municipio arranca
      // deshabilitado (lo habilita la cascada). Opcionales (paridad con las direcciones actuales).
      departamentoConyuge: [''],       municipioConyuge: [{ value: '', disabled: true }],
      departamentoPadre: [''],         municipioPadre: [{ value: '', disabled: true }],
      departamentoMadre: [''],         municipioMadre: [{ value: '', disabled: true }],
      departamentoRefPersonal1: [''],  municipioRefPersonal1: [{ value: '', disabled: true }],
      departamentoRefPersonal2: [''],  municipioRefPersonal2: [{ value: '', disabled: true }],
      departamentoRefFamiliar1: [''],  municipioRefFamiliar1: [{ value: '', disabled: true }],
      departamentoRefFamiliar2: [''],  municipioRefFamiliar2: [{ value: '', disabled: true }],

      // Step 4: Experience & Housing
      experienciaLaboral: ['', req],
      // --- DATOS DE LA EMPRESA (RF-043/044) ---
      nombreEmpresa1: [''],
      // RF-036/044: territorio estructurado de la empresa anterior (texto, colombia.json,
      // mismo mecanismo que residencia). Municipio arranca deshabilitado (cascada por depto).
      departamentoEmpresa1: [''],
      municipioEmpresa1: [{ value: '', disabled: true }],
      barrioEmpresa1: [''],
      direccionEmpresa1: [''],
      telefonosEmpresa1: ['', this.telefonoEmpresaValidator()],   // teléfono de la EMPRESA
      // --- CARGO DEL CANDIDATO (RF-043) ---
      cargoEmpresa1: [''],                                        // cargo desempeñado por el CANDIDATO
      areaExperiencia: [[]],
      fechaRetiro1: [''],
      tiempoExperiencia: [''], // Declarado: se ata en HTML (selectField) y se lee en buildPayload
      motivoRetiro1: [''],
      empresas_laborado: [''],
      // --- REFERENCIA / JEFE INMEDIATO (RF-043/044) ---
      // Legacy `nombreJefe1` (nombre completo) se conserva como DERIVADO. Nombre del jefe en
      // componentes; cargo y teléfono del jefe SEPARADOS de los de la empresa.
      nombreJefe1: [''],
      jefePrimerNombre1: ['', this.nameValidator(false)],
      jefePrimerApellido1: ['', this.nameValidator(false)],
      cargoJefe1: [''],                                           // cargo del JEFE (distinto de cargoEmpresa1)
      telefonoJefe1: ['', this.phoneCOValidator()],               // teléfono del JEFE/referencia

      // Hijos
      numHijosDependientes: [0, [req, Validators.min(0), Validators.max(10)]],
      cuidadorHijos: [''],
      hijos: this.fb.array([]),

      // Housing
      familiaSolo: ['', req],
      personas_a_cargo: [[], req],
      tiposViviendaChecks: [[], req],
      numeroHabitaciones: ['', req],
      personasPorHabitacion: ['', req],
      caracteristicasVivienda: ['', req],
      comodidadesChecks: [[], req],
      expectativasVidaChecks: [[], req],
      fuenteVacante: ['', req],

      // Evaluación (Opcional) — preguntas que llenaba el evaluador en TesoroApp
      // y que ahora puede llenar el candidato desde la web.
      relacionFamiliar: [''],
      desempenoLaboral: [''],
      felicitaciones: [''],
      situacionConflictiva: [''],
      actividadesDiferentes: [''],

      // Step 5: Final
      // `deseaGenerar` se eliminó: no existe en el backend (ni como campo ni en
      // ningún serializer), `buildPayload` nunca lo enviaba, y su observable
      // llamaba a `limpiarCamposAdicionales()` — así que responder "No" borraba
      // en silencio el PDF de hoja de vida que la persona acababa de adjuntar.
      hojaDeVida: ['']
    }, { validators: this.groupCrossValidator() });
  }

  // ----------------------------------------------------
  // 2. Logic & Observables
  // ----------------------------------------------------
  private initObservables(): void {
    const f = this.formHojaDeVida2;

    // Helper for conditional validation
    //
    // `setValidators` REEMPLAZA los validadores del control, así que al activar
    // un campo condicional se perdía su validador de formato y, por ejemplo, el
    // teléfono del padre pasaba a aceptar "ABC". Este mapa vuelve a añadirlo
    // siempre, sin que cada llamada tenga que acordarse.
    const FORMATO: Record<string, ValidatorFn> = {
      telefonoConyuge: this.phoneCOValidator(),
      telefonoPadre: this.phoneCOValidator(),
      telefonoMadre: this.phoneCOValidator(),
      documentoIdentidadConyuge: this.docValidator(),
      // El teléfono de la empresa nunca tuvo formato y aceptaba cualquier cosa
      // ("ABC"). Ahora exige un número real, pero admite fijo además de celular.
      telefonosEmpresa1: this.telefonoEmpresaValidator(),
      // Un retiro o una graduación no pueden estar en el futuro; sin esto el
      // datepicker (sin [max]) aceptaba cualquier fecha.
      fechaRetiro1: this.noFuturaValidator(),
      anoFinalizacion: this.noFuturaValidator(),
    };

    const toggle = (ctrlName: string, required: boolean, validators: ValidatorFn[] = []) => {
      const c = f.get(ctrlName);
      if (!c) return;
      if (required) {
        const propio = FORMATO[ctrlName];
        c.setValidators([Validators.required, ...(propio ? [propio] : []), ...validators]);
        c.enable({ emitEvent: false });
        this.restaurarRecordado(ctrlName);
      } else {
        c.clearValidators();
        // Se vacía para no enviar datos que ya no aplican, pero recordando el
        // valor: un clic equivocado en "¿el padre vive?" borraba nombre,
        // dirección y teléfono sin posibilidad de recuperarlos.
        this.vaciarRecordando(ctrlName);
      }
      c.updateValueAndValidity({ emitEvent: false });
    };

    // Email Construction Logic
    merge(f.get('correoUsuario')!.valueChanges, f.get('correoDominio')!.valueChanges)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const user = f.get('correoUsuario')?.value || '';
        const domain = f.get('correoDominio')?.value || '';
        const correoCtrl = f.get('correo');

        // Advertencia no bloqueante: usa el catálogo completo de dominios (no
        // solo el seleccionado), así "ivvanyahoo.com" también avisa aunque el
        // dominio elegido sea GMAIL.COM. Nunca toca errores ni validez.
        this.avisoDominioEnUsuario = detectarDominioEnUsuario(user, this.dominiosCorreo);

        // Check internal validity of parts (no @)
        const userValid = f.get('correoUsuario')?.valid;
        const domainValid = f.get('correoDominio')?.valid;

        if (user && domain && userValid && domainValid) {
          const fullEmail = `${user.trim()}@${domain.trim()}`.toUpperCase();
          correoCtrl?.setValue(fullEmail, { emitEvent: false });
          // If needed, re-verify standard email validity
          if (!correoCtrl?.valid) {
            // Maybe custom error if pattern fails even with correct parts?
            // But domain regex prevents bad chars.
          }
        } else {
          correoCtrl?.setValue('', { emitEvent: false });
        }
      });

    // Escolaridad Logic
    f.get('escolaridad')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(val => {
      const isSinEstudios = val === 'SIN ESTUDIOS';
      const isOtros = val === 'OTROS';
      // Bloque de colegio (Institución/Fecha/Título/Otros estudios): solo para grados 1..11.
      // Con 'OTROS' se oculta para no capturar dos veces en las mismas columnas.
      const mostrarColegio = !isSinEstudios && !isOtros;
      toggle('nombreInstitucion', mostrarColegio);
      toggle('anoFinalizacion', mostrarColegio);
      toggle('tituloObtenido', mostrarColegio);

      const extras = f.get('estudiosExtrasSelect');
      if (mostrarColegio) {
        extras?.enable({ emitEvent: false });
      } else {
        extras?.setValue([], { emitEvent: false });
        extras?.disable({ emitEvent: false });
      }

      // RF-017: educación superior solo cuando el grado es 'Otros'. El toggle deja los
      // campos obligatorios y habilitados si aplica, o los vacía (sin enviar residuales).
      toggle('nivelEducacionSuperior', isOtros);
      toggle('carreraEstudio', isOtros, [Validators.maxLength(120), Validators.minLength(3)]);
    });

    // RF-029: al cambiar el género se recalculan las tallas aplicables y se limpian las incompatibles.
    f.get('genero')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.recomputarTallas());

    // RF-031: residencia anterior condicional. "TODO LA VIDA" (catálogo HACE_CUENTO_ZONA) => no hubo
    // residencia anterior: se ocultan los campos, se quitan sus validators (no bloquean) y se vacían.
    f.get('tiempoResidenciaZona')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(val => {
      const hayAnterior = !this.esTodaLaVida(val);
      toggle('departamentoResidenciaAnterior', hayAnterior);
      toggle('municipioResidenciaAnterior', hayAnterior);
      toggle('direccionResidenciaAnterior', hayAnterior);
      toggle('barrioResidenciaAnterior', hayAnterior);
      toggle('razonCambioResidencia', hayAnterior);
      if (!hayAnterior) {
        this.searchDeptoResAnt.setValue('');
        this.searchMunResAnt.setValue('');
        this.ciudadesResidenciaAnterior = [];
      }
    });

    // Validar Doc on Type Change
    f.get('tipoDoc')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      f.get('numeroCedula')?.updateValueAndValidity();
    });

    // Hijos Logic (Consolidated)
    f.get('numHijosDependientes')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(num => {
      // El valor se acota ANTES de tocar el FormArray. El input es `type=number`
      // y no tenía tope: con un número negativo (basta bajar el spinner desde 0)
      // `actualizarHijos` entraba en un bucle infinito síncrono y congelaba la
      // pestaña; con uno enorme creaba miles de FormGroup.
      const n = this.acotarHijos(num);

      // Sanitize input (remove leading zeros, e.g. "01" -> "1", y descarta -4 / 2.5)
      if (String(num) !== String(n)) {
        f.get('numHijosDependientes')?.setValue(n, { emitEvent: false });
      }

      this.actualizarHijos(n);
      toggle('cuidadorHijos', n > 0);
    });

    // Experiencia Logic
    f.get('experienciaLaboral')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(val => {
      const req = val === 'SI';
      toggle('nombreEmpresa1', req);
      toggle('telefonosEmpresa1', req);
      // RF-043: el jefe se captura ahora en componentes (jefePrimerNombre1/jefePrimerApellido1),
      // opcionales; `nombreJefe1` legacy queda derivado y sin obligatoriedad propia.
      toggle('cargoEmpresa1', req);
      toggle('fechaRetiro1', req);
      toggle('tiempoExperiencia', req);
      toggle('motivoRetiro1', req);
      toggle('direccionEmpresa1', req, [Validators.required]);
      // toggle('barrioEmpresa1', req); // MERGED into address

      // Area check is multi-select
      const area = f.get('areaExperiencia');
      if (req) area?.setValidators(Validators.required); else area?.clearValidators();
      area?.updateValueAndValidity();
    });

    // Conyuge / Padres Validators Logic
    f.get('viveConyuge')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(val => {
      const req = val === 'SI';
      // Nombres/apellidos del cónyuge NO se tocan acá: dependen del estado civil
      // (CA/UL), no de la convivencia. Cuando se toggleaban con "¿vive con el
      // cónyuge? NO", el nombre recién escrito se borraba EN PANTALLA (el campo
      // sigue visible) y un casado que no convive quedaba sin cónyuge registrado.
      toggle('documentoIdentidadConyuge', req);
      toggle('direccionConyuge', req, [Validators.required]);
      toggle('telefonoConyuge', req);
      toggle('ocupacionConyuge', req);
      // El barrio se guarda (el backend lo persiste como `barrio_municipio_conyugue`)
      // pero no se exige: se limpia cuando la sección no aplica y se devuelve si vuelve.
      if (req) this.restaurarRecordado('barrioMunicipioConyugue');
      else this.vaciarRecordando('barrioMunicipioConyugue');
    });

    // Estado Civil Logic - Auto-toggle Spouse
    f.get('estadoCivil')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(val => {
      // IDs: CA (Casado), UL (Unión Libre) -> Require Spouse Info
      const requiresRef = ['CA', 'UL'].includes(val);
      const conyugeCtrl = f.get('viveConyuge');

      if (requiresRef) {
        // El NOMBRE del cónyuge se exige por el estado civil (hay cónyuge),
        // conviva o no. Los datos de contacto (documento, dirección, teléfono)
        // sí dependen de "¿vive con el cónyuge?" — ver el toggle de arriba.
        toggle('nombresConyuge', true, [this.nameValidator()]);
        toggle('apellidosConyuge', true, [this.nameValidator()]);
        if (!conyugeCtrl?.value) conyugeCtrl?.setValue('SI');
      } else {
        // No casado/unión libre → limpiar TODOS los campos de cónyuge.
        // Se vacían recordando el valor: si vuelve a marcar CASADO/UNIÓN LIBRE
        // (o se equivocó al elegir), `toggle()` se lo devuelve.
        conyugeCtrl?.setValue('');
        const conyugeFields = [
          'nombresConyuge', 'apellidosConyuge', 'documentoIdentidadConyuge',
          'direccionConyuge', 'telefonoConyuge',
          'barrioMunicipioConyugue', 'ocupacionConyuge'
        ];
        for (const field of conyugeFields) {
          this.vaciarRecordando(field);
          f.get(field)?.clearValidators();
          f.get(field)?.updateValueAndValidity({ emitEvent: false });
        }
      }
    });

    // Padres Logic (Updated for 3 states)
    // "SI" (VIVE) -> Campos obligatorios
    // "NO" (NO VIVE) -> Campos NO obligatorios? Or just Name?
    // "NO LO CONOCE" -> Nada obligatorio
    // RF-039/040: padre y madre son INDEPENDIENTES; cada suscripción solo toca sus
    // propios controles (nunca los del otro progenitor). El nombre vive en componentes.
    const updateParent = (prefix: 'Padre' | 'Madre', val: string) => {
      const isVive = val === 'VIVE';
      const isNoConoce = val === 'NO LO CONOCE';
      const base = prefix.toLowerCase(); // padre | madre

      // Address/Phone/Job -> Required ONLY if Alive (VIVE)
      toggle(`direccion${prefix}`, isVive, [Validators.required]);
      toggle(`telefono${prefix}`, isVive);
      toggle(`ocupacion${prefix}`, isVive);
      // El barrio se guarda (el backend lo persiste como `barrio_padre` /
      // `barrio_madre`) pero es opcional, igual que el del contacto de emergencia.
      if (isVive) this.restaurarRecordado(`barrio${prefix}`);
      else this.vaciarRecordando(`barrio${prefix}`);

      // RF-040: nombre en componentes. Primer nombre y primer apellido requeridos solo si
      // VIVE. "NO VIVE" NUNCA borra el nombre (bug histórico: se conserva el del fallecido).
      // Solo "NO LO CONOCE" lo vacía (recordándolo, por si fue un clic errado) y bloquea.
      const claves = [`${base}PrimerNombre`, `${base}SegundoNombre`, `${base}PrimerApellido`, `${base}SegundoApellido`];
      f.get(`${base}PrimerNombre`)?.setValidators([this.nameValidator(isVive)]);
      f.get(`${base}SegundoNombre`)?.setValidators([this.nameValidator(false)]);
      f.get(`${base}PrimerApellido`)?.setValidators([this.nameValidator(isVive)]);
      f.get(`${base}SegundoApellido`)?.setValidators([this.nameValidator(false)]);
      if (isNoConoce) {
        claves.forEach(k => { this.vaciarRecordando(k); f.get(k)?.disable({ emitEvent: false }); });
      } else {
        claves.forEach(k => { f.get(k)?.enable({ emitEvent: false }); this.restaurarRecordado(k); });
      }
      claves.forEach(k => f.get(k)?.updateValueAndValidity({ emitEvent: false }));
    };

    f.get('elPadreVive')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(val => updateParent('Padre', val));
    f.get('madreVive')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(val => updateParent('Madre', val));

    // Location Listeners
    this.setupLocationListener('departamento', 'ciudad', 'ciudadesResidencia', this.searchMunRes);
    this.setupLocationListener('departamentoExpedicionCC', 'municipioExpedicionCC', 'ciudadesExpedicionCC', this.searchMunExp);
    this.setupLocationListener('departamentoNacimiento', 'municipioNacimiento', 'ciudadesNacimiento', this.searchMunNac);
    // RF-032/035: cascadas territoriales nuevas (residencia anterior y contacto de emergencia).
    this.setupLocationListener('departamentoResidenciaAnterior', 'municipioResidenciaAnterior', 'ciudadesResidenciaAnterior', this.searchMunResAnt);
    this.setupLocationListener('departamentoEmergencia', 'municipioEmergencia', 'ciudadesEmergencia', this.searchMunEmer);
    // RF-036/044: empresa anterior.
    this.setupLocationListener('departamentoEmpresa1', 'municipioEmpresa1', 'ciudadesEmpresa', this.searchMunEmp);
    // RF-036 (familia): cónyuge, padre, madre y las 4 referencias.
    for (const k of this.FAM_DIRECCIONES) {
      this.setupLocationListenerFam(`departamento${k}`, `municipio${k}`, k, this.busqFam[k + 'Mun']);
    }
  }

  /**
   * Vacía un control recordando lo que tenía, para poder devolvérselo si la
   * condición que lo ocultó vuelve a cumplirse.
   */
  private vaciarRecordando(nombre: string): void {
    const c = this.formHojaDeVida2.get(nombre);
    if (!c) return;
    const v = c.value;
    if (v !== '' && v !== null && v !== undefined) this.valoresRecordados.set(nombre, v);
    c.setValue('', { emitEvent: false });
  }

  /** Devuelve el valor recordado si el campo volvió a aplicar y está vacío. */
  private restaurarRecordado(nombre: string): void {
    const c = this.formHojaDeVida2.get(nombre);
    if (!c) return;
    const actual = c.value;
    if (actual !== '' && actual !== null && actual !== undefined) return;
    const guardado = this.valoresRecordados.get(nombre);
    if (guardado === undefined) return;
    c.setValue(guardado, { emitEvent: false });
    this.valoresRecordados.delete(nombre);
  }

  /** Último valor de cada campo condicional antes de vaciarse. Ver `toggle()`. */
  private readonly valoresRecordados = new Map<string, any>();

  private setupLocationListener(deptKey: string, cityKey: string, listProp: string, searchMun?: FormControl) {
    this.formHojaDeVida2.get(deptKey)?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(dept => {
      // Comparación normalizada: colombia.json trae "Cundinamarca" y el backend
      // devuelve "CUNDINAMARCA". Con `===` la lista de municipios quedaba vacía
      // en toda precarga y la persona no podía elegir ciudad.
      const objetivo = this.normalizarTexto(dept);
      const dData = objetivo
        ? this.datos?.find((d: any) => this.normalizarTexto(d.departamento) === objetivo)
        : null;
      (this as any)[listProp] = dData ? dData.ciudades : [];
      this.formHojaDeVida2.get(cityKey)?.enable();
      // Al cambiar de departamento se limpia el municipio (RF-021/037: no dejar uno incompatible).
      searchMun?.setValue('');
      this.formHojaDeVida2.get(cityKey)?.setValue('');
    });
  }

  /**
   * RF-036 (familia): como `setupLocationListener` pero volcando la lista de municipios
   * en el diccionario `ciudadesFam[famKey]` (una dirección de familia por clave).
   */
  private setupLocationListenerFam(deptKey: string, cityKey: string, famKey: string, searchMun?: FormControl) {
    this.formHojaDeVida2.get(deptKey)?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(dept => {
      const objetivo = this.normalizarTexto(dept);
      const dData = objetivo
        ? this.datos?.find((d: any) => this.normalizarTexto(d.departamento) === objetivo)
        : null;
      this.ciudadesFam[famKey] = dData ? dData.ciudades : [];
      this.formHojaDeVida2.get(cityKey)?.enable();
      // Al cambiar de departamento se limpia el municipio (no dejar uno incompatible).
      searchMun?.setValue('');
      this.formHojaDeVida2.get(cityKey)?.setValue('');
    });
  }

  private initSearchFilters() {
    // Dept Res
    this.searchDeptoRes.valueChanges.pipe(startWith(''), takeUntil(this.destroy$)).subscribe(val => {
      this.filteredDeptoRes = this.filterList(this.datos, val, 'departamento');
    });
    // Mun Res
    this.searchMunRes.valueChanges.pipe(startWith(''), takeUntil(this.destroy$)).subscribe(val => {
      this.filteredMunRes = this.filterList(this.ciudadesResidencia, val);
    });

    // Dept Exp
    this.searchDeptoExp.valueChanges.pipe(startWith(''), takeUntil(this.destroy$)).subscribe(val => {
      this.filteredDeptoExp = this.filterList(this.datos, val, 'departamento');
    });
    // Mun Exp
    this.searchMunExp.valueChanges.pipe(startWith(''), takeUntil(this.destroy$)).subscribe(val => {
      this.filteredMunExp = this.filterList(this.ciudadesExpedicionCC, val);
    });

    // Dept Nac
    this.searchDeptoNac.valueChanges.pipe(startWith(''), takeUntil(this.destroy$)).subscribe(val => {
      this.filteredDeptoNac = this.filterList(this.datos, val, 'departamento');
    });
    // Mun Nac
    this.searchMunNac.valueChanges.pipe(startWith(''), takeUntil(this.destroy$)).subscribe(val => {
      this.filteredMunNac = this.filterList(this.ciudadesNacimiento, val);
    });

    // RF-032: Residencia anterior
    this.searchDeptoResAnt.valueChanges.pipe(startWith(''), takeUntil(this.destroy$)).subscribe(val => {
      this.filteredDeptoResAnt = this.filterList(this.datos, val, 'departamento');
    });
    this.searchMunResAnt.valueChanges.pipe(startWith(''), takeUntil(this.destroy$)).subscribe(val => {
      this.filteredMunResAnt = this.filterList(this.ciudadesResidenciaAnterior, val);
    });
    // RF-035: Contacto de emergencia
    this.searchDeptoEmer.valueChanges.pipe(startWith(''), takeUntil(this.destroy$)).subscribe(val => {
      this.filteredDeptoEmer = this.filterList(this.datos, val, 'departamento');
    });
    this.searchMunEmer.valueChanges.pipe(startWith(''), takeUntil(this.destroy$)).subscribe(val => {
      this.filteredMunEmer = this.filterList(this.ciudadesEmergencia, val);
    });
    // RF-036/044: empresa anterior
    this.searchDeptoEmp.valueChanges.pipe(startWith(''), takeUntil(this.destroy$)).subscribe(val => {
      this.filteredDeptoEmp = this.filterList(this.datos, val, 'departamento');
    });
    this.searchMunEmp.valueChanges.pipe(startWith(''), takeUntil(this.destroy$)).subscribe(val => {
      this.filteredMunEmp = this.filterList(this.ciudadesEmpresa, val);
    });
    // RF-036 (familia): filtros de búsqueda de cada cascada territorial de familia.
    for (const k of this.FAM_DIRECCIONES) {
      this.busqFam[k + 'Dep'].valueChanges.pipe(startWith(''), takeUntil(this.destroy$)).subscribe(val => {
        this.filteredDeptoFam[k] = this.filterList(this.datos, val, 'departamento');
      });
      this.busqFam[k + 'Mun'].valueChanges.pipe(startWith(''), takeUntil(this.destroy$)).subscribe(val => {
        this.filteredMunFam[k] = this.filterList(this.ciudadesFam[k], val);
      });
    }

    // Dominio
    this.searchDominio.valueChanges.pipe(startWith(''), takeUntil(this.destroy$)).subscribe(val => {
      this.filteredDominios = this.filterList(this.dominiosCorreo, val);
    });
  }

  private filterList(list: any[], term: any, key?: string): any[] {
    const t = String(term || '').toLowerCase();
    if (!t) return list || [];
    return (list || []).filter(item => {
      const v = key ? item[key] : item;
      return String(v || '').toLowerCase().includes(t);
    });
  }

  /** Número de hijos utilizable: entero, entre 0 y `MAX_HIJOS`. */
  private acotarHijos(v: any): number {
    const n = Math.floor(Number(v));
    if (!Number.isFinite(n)) return 0;
    return Math.min(MAX_HIJOS, Math.max(0, n));
  }

  private actualizarHijos(num: number): void {
    const arr = this.formHojaDeVida2.get('hijos') as FormArray;
    // Segunda red: si `num` llegara negativo, `removeAt(-1)` sobre un FormArray
    // vacío no quita nada y el `while` no termina nunca.
    const total = this.acotarHijos(num);
    while (arr.length > total) arr.removeAt(arr.length - 1);
    while (arr.length < total) {
      const g = this.fb.group({
        // RF-045: nombres estructurados del hijo (primer nombre y primer apellido obligatorios;
        // el nombre completo se deriva en buildPayload). `nombreHijo` se conserva para compat.
        hijoPrimerNombre: ['', [Validators.required, this.nameValidator()]],
        hijoSegundoNombre: ['', this.nameValidator(false)],
        hijoPrimerApellido: ['', [Validators.required, this.nameValidator()]],
        hijoSegundoApellido: ['', this.nameValidator(false)],
        nombreHijo: [''],
        sexoHijo: ['', Validators.required],
        // Un hijo no puede nacer en el futuro (el datepicker además acota con [max]).
        fechaNacimientoHijo: ['', [Validators.required, this.noFuturaValidator()]],
        // RF-046: tipo de documento del hijo (RC/TI/CC/CE) — catálogo TIPOS_DOC_DEPENDIENTE.
        tipoDocHijo: ['', [Validators.required]],
        // Registro civil / TI del hijo: solo dígitos, igual de estricto que el
        // documento principal (antes aceptaba cualquier texto).
        docIdentidadHijo: ['', [Validators.required, Validators.pattern(REGEX_NUMERIC), Validators.maxLength(11)]],
        ocupacionHijo: ['', [Validators.required]],
        // Curso conditional
        cursoHijo: ['']
      });

      // Conditional Logic for Curso
      g.get('ocupacionHijo')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(occ => {
        const isEstudiante = occ === 'ESTUDIANTE';
        const curso = g.get('cursoHijo');
        if (isEstudiante) {
          curso?.setValidators(Validators.required);
        } else {
          curso?.clearValidators();
          curso?.setValue(''); // Reset value
        }
        curso?.updateValueAndValidity({ emitEvent: false });
      });

      arr.push(g);
    }
  }

  // ----------------------------------------------------
  // 3. Storage & Persistence
  // ----------------------------------------------------
  private initAutoSave(): void {
    if (!this.isBrowser) return;

    // La carga del borrador se hace en startForm(), cuando ya se conoce la cédula
    // buscada. Antes se hacía aquí comparando this.numeroCedula (todavía '') contra
    // la cédula guardada, por lo que NUNCA restauraba.

    // Save
    this.formHojaDeVida2.valueChanges.pipe(
      debounceTime(1000),
      takeUntil(this.destroy$)
    ).subscribe(() => this.guardarBorrador());

    // El debounce de 1s pierde lo último escrito si la persona cierra la
    // pestaña justo después. Estos dos eventos fuerzan el guardado:
    // 'visibilitychange' cubre el caso de móvil (mandar la app al fondo, que es
    // donde el sistema puede matar la pestaña sin avisar) y 'pagehide' cubre
    // cerrar, recargar o navegar fuera. 'beforeunload' no dispara en iOS.
    const flush = () => this.guardarBorrador();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', onVisibility);
    this.destroy$.subscribe(() => {
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', flush);
      // Con la función anónima de antes este listener quedaba vivo tras salir
      // de la página y seguía guardando borradores del componente destruido.
      document.removeEventListener('visibilitychange', onVisibility);
    });
  }

  /** Cuánto vive un borrador antes de descartarse (equipos compartidos). */
  private static readonly BORRADOR_TTL_MS = 7 * 24 * 60 * 60 * 1000;

  /** Tras enviar con éxito ya no se guarda nada más en este dispositivo. */
  private borradorDeshabilitado = false;

  /** Vuelca el formulario a localStorage. Requiere cédula: es la llave del borrador. */
  private guardarBorrador(): void {
    if (!this.isBrowser || this.borradorDeshabilitado) return;
    const cedula = this.formHojaDeVida2.get('numeroCedula')?.value;
    if (!cedula) return;
    try {
      const limpio = this.sanitizeForStorage(this.formHojaDeVida2.getRawValue());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(limpio));
      localStorage.setItem(CEDULA_KEY, String(cedula));
      // 0-based (índice del stepper). `stepperIndex` es el contador VISIBLE
      // (1-based): guardarlo tal cual hacía que el borrador restaurara a la
      // persona un paso ADELANTE de donde iba.
      localStorage.setItem(STEP_KEY, String(Math.max(0, (this.stepperIndex || 1) - 1)));
      localStorage.setItem(STAMP_KEY, String(Date.now()));
    } catch (e) {
      // QuotaExceeded u otro fallo de storage: no debe tumbar el formulario.
      console.warn('[borrador] no se pudo guardar', e);
    }
  }

  /**
   * Borra el borrador del equipo. Se llama al enviar con éxito y cuando el
   * borrador está caducado: son datos personales (cédula, celular, dirección,
   * fecha de nacimiento) en un computador que suele ser compartido.
   */
  private limpiarBorrador(): void {
    if (!this.isBrowser) return;
    try {
      for (const k of [STORAGE_KEY, CEDULA_KEY, STEP_KEY, STAMP_KEY, STORAGE_KEY_LEGACY, CEDULA_KEY_LEGACY]) {
        localStorage.removeItem(k);
      }
    } catch (e) {
      console.warn('[borrador] no se pudo limpiar', e);
    }
  }

  private sanitizeForStorage(v: any): any {
    // Simple cyclic breaker / clean
    if (v === null || v === undefined) return v;
    // Un Date se guarda como cadena ISO. Si se deja caer al recorrido genérico
    // de abajo se convierte en `{}` (no tiene propiedades enumerables) y al
    // restaurar el borrador se perdían TODAS las fechas del formulario.
    if (v instanceof Date) return isNaN(v.getTime()) ? '' : v.toISOString();
    if (typeof v !== 'object') return v;
    const copy: any = Array.isArray(v) ? [] : {};
    for (const k in v) {
      if (k === 'hojaDeVida') continue; // Don't save files
      if (v[k] instanceof File) continue;
      copy[k] = this.sanitizeForStorage(v[k]);
    }
    return copy;
  }

  /**
   * Devuelve las fechas del borrador a objetos `Date` (el datepicker los exige).
   * Lo que no sea una fecha usable se deja vacío para que el campo vuelva a
   * pedirse, en vez de colarse como valor "no vacío" que burla los validadores.
   */
  private revivirFechas(data: any): any {
    if (!data || typeof data !== 'object') return data;
    for (const k of CAMPOS_FECHA) {
      if (k in data) data[k] = this.aFecha(data[k]) ?? '';
    }
    if (Array.isArray(data.hijos)) {
      for (const h of data.hijos) {
        if (!h || typeof h !== 'object') continue;
        for (const k of CAMPOS_FECHA_HIJO) {
          if (k in h) h[k] = this.aFecha(h[k]) ?? '';
        }
      }
    }
    return data;
  }

  // ----------------------------------------------------
  // 4. Catalogs
  // ----------------------------------------------------
  /**
   * RF-029: recalcula las tallas visibles según el género. `sexo` vacío en el catálogo = unisex
   * (aplica a ambos); 'M'/'F' solo al género correspondiente. Sin género, listas vacías (selects
   * deshabilitados). Al cambiar el género limpia SOLO las tallas ya incompatibles.
   */
  recomputarTallas(): void {
    const g = String(this.formHojaDeVida2?.get('genero')?.value || '').toUpperCase().trim();
    const porPrenda = (prenda: string): string[] => !g ? [] : this.dotacionTallasRaw
      .filter(t => t.sexo === g && t.tipoPrenda === prenda)
      .sort((a, b) => a.orden - b.orden)
      .map(t => t.talla);
    this.tallasCamisa = porPrenda('CAMISA');
    this.tallasPantalon = porPrenda('PANTALON');
    this.tallasChaqueta = porPrenda('CHAQUETA');
    this.tallasCalzado = porPrenda('CALZADO');
    const limpiar = (ctrl: string, lista: string[]) => {
      const v = this.formHojaDeVida2?.get(ctrl)?.value;
      if (v && !lista.includes(String(v))) this.formHojaDeVida2.get(ctrl)?.setValue('', { emitEvent: false });
    };
    limpiar('tallaCamisa', this.tallasCamisa);
    limpiar('tallaPantalon', this.tallasPantalon);
    limpiar('tallaChaqueta', this.tallasChaqueta);
    limpiar('tallaCalzado', this.tallasCalzado);
    this.cdr?.markForCheck();
  }

  /** RF-029: true cuando aún no hay género → los selects de talla se muestran vacíos con ayuda. */
  get faltaGeneroParaTallas(): boolean {
    return !String(this.formHojaDeVida2?.get('genero')?.value || '').trim();
  }

  /** RF-031: el valor real del catálogo es "TODO LA VIDA"; se compara normalizado y tolerante. */
  esTodaLaVida(v: any): boolean {
    const t = String(v ?? '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    return /^TOD[AO]\s+LA\s+VIDA/.test(t);
  }

  /** RF-031: la sección "Residencia Anterior" se muestra salvo que el tiempo sea "TODO LA VIDA". */
  get mostrarResidenciaAnterior(): boolean {
    const v = this.formHojaDeVida2?.get('tiempoResidenciaZona')?.value;
    return !!v && !this.esTodaLaVida(v);
  }

  private loadCatalogs(): void {
    this.loadingCatalogos = true;
    this.parametrizacionS.bulkValores([...this.CATALOG_KEYS], true).subscribe({
      next: (resp: any) => {
        const results = resp?.results ?? {};
        // Iterate config and map values
        for (const key of this.CATALOG_KEYS) {
          const config: any = (this.CATALOG_CONFIG as any)[key];
          const rawItems: any[] = results[key] ?? []; // Raw response from new format

          // Cada item del catálogo trae sus campos dentro de `datos`; el
          // `config.map` de arriba decide la forma final de la opción.
          const mapped = rawItems
            .filter(i => i.activo !== false)
            .map(i => config.map(i.datos || {}))
            .filter((v: any) => v !== null && v !== undefined && this.textoCatalogo(v) !== '');

          // Dedup por código (o por texto si no hay código).
          const seen = new Set<string>();
          const unique: any[] = [];
          for (const item of mapped) {
            const k = this.claveCatalogo(item);
            if (!seen.has(k)) {
              seen.add(k);
              unique.push(item);
            }
          }

          // Orden alfabético por el texto que ve el usuario. Se usa un
          // Intl.Collator en español: el `.sort()` por defecto compara unidades
          // UTF-16, así que mandaba al final del listado todo lo que empezara
          // por vocal acentuada o Ñ. `numeric` evita que "10" quede antes de "2".
          unique.sort((a, b) => FormsTestContratation.COLLATOR_ES.compare(
            this.textoCatalogo(a), this.textoCatalogo(b)
          ));

          // Se asigna conservando la forma que devuelve `config.map` (objeto
          // {codigo, descripcion} o escalar), porque el HTML la consume vía
          // `optionsKey`/`valueKey`. Solo se deduplica y se ordena.
          (this as any)[config.prop] = unique;
        }
        // RF-014/016: opciones legibles del GRADO ("Sin estudio" primero, luego 1..11,
        // OTROS al final). El `value` se mantiene = código; solo cambia texto y orden.
        const ordenG = FormsTestContratation.GRADO_ESCOLARIDAD_ORDEN;
        const rankG = (c: string) => { const i = ordenG.indexOf(c); return i === -1 ? ordenG.length : i; };
        this.listaEscolaridadOpts = [...this.listaEscolaridad]
          .sort((a, b) => rankG(a) - rankG(b) || a.localeCompare(b))
          .map(c => ({ codigo: c, label: FormsTestContratation.GRADO_ESCOLARIDAD_LABEL[c] ?? c }));
        this.recomputarTallas();   // RF-029: derivar tallas visibles según el género ya cargado
        this.loadingCatalogos = false;
        this.avisarSiNoHayCatalogos();
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingCatalogos = false;
        this.avisarCatalogosCaidos();
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * `bulkValores` atrapa sus propios errores y responde con listas vacías, así
   * que la rama `error:` de arriba casi nunca se ejecuta: sin esta comprobación
   * el formulario quedaba con TODOS los desplegables vacíos y sin un solo aviso.
   * Se avisa solo si no llegó ni un catálogo (fallo total, no una tabla suelta).
   */
  private avisarSiNoHayCatalogos(): void {
    const vacios = this.CATALOG_KEYS.filter((k) => {
      const prop = (this.CATALOG_CONFIG as any)[k].prop;
      return !((this as any)[prop]?.length);
    });
    if (vacios.length === this.CATALOG_KEYS.length) this.avisarCatalogosCaidos();
  }

  private avisarCatalogosCaidos(): void {
    if (!this.isBrowser) return;
    Swal.fire({
      icon: 'error',
      title: 'No se pudieron cargar las opciones',
      html: '<p style="text-align:left;">No pudimos traer las listas del formulario ' +
        '(tipo de documento, escolaridad, tallas, etc.), así que los desplegables ' +
        'aparecerán vacíos.</p>' +
        '<p style="text-align:left;">Revise su conexión y <b>recargue la página</b>. ' +
        'Si sigue igual, avise en la oficina antes de seguir llenando.</p>',
      confirmButtonText: 'Recargar',
      confirmButtonColor: '#111827',
      showCancelButton: true,
      cancelButtonText: 'Seguir así',
    }).then((r) => { if (r.isConfirmed && typeof window !== 'undefined') window.location.reload(); });
  }

  private str(v: any): string { return String(v ?? '').trim(); }

  // ----------------------------------------------------
  // 5. Actions (Submit & Upload)
  // ----------------------------------------------------


  private buildPayload(raw: any): any {
    // Helper to safe get
    const g = (k: string) => raw[k];
    const upper = (v: any) => typeof v === 'string' ? v.toUpperCase().trim() : v;
    const addr = (k: string) => this.normalizeAddressCO(raw[k]); // Normalize Address
    // RF-040/045: nombre completo derivado de los componentes (primer nombre, segundo nombre,
    // primer apellido, segundo apellido). Se conserva como legacy para compatibilidad.
    const nombreDe = (pn: string, sn: string, pa: string, sa: string, legacy?: string) =>
      [g(pn), g(sn), g(pa), g(sa)].map((x: any) => (x || '').trim()).filter(Boolean).join(' ')
      || (legacy ? (g(legacy) || '') : '');

    // Strict Mapping matching original
    const p: any = {
      tipoDoc: g('tipoDoc'),
      numeroCedula: g('numeroCedula'),
      pApellido: g('pApellido'),
      sApellido: g('sApellido'),
      pNombre: g('pNombre'),
      sNombre: g('sNombre'),
      genero: g('genero'),
      correo: g('correo')?.toUpperCase(),
      numCelular: g('numCelular'),
      numWha: g('numWha'),
      departamento: g('departamento'),
      ciudad: g('ciudad'),
      estadoCivil: g('estadoCivil'),
      direccionResidencia: addr('direccionResidencia'),
      barrio: g('zonaResidencia'),
      fechaExpedicionCc: this.toYmd(g('fechaExpedicionCC')),
      departamentoExpedicionCc: g('departamentoExpedicionCC'),
      municipioExpedicionCc: g('municipioExpedicionCC'),
      lugarNacimientoDepartamento: g('departamentoNacimiento'),
      lugarNacimientoMunicipio: g('municipioNacimiento'),
      rh: g('rh'),
      zurdoDiestro: g('lateralidad'),
      tiempoResidenciaZona: g('tiempoResidenciaZona'),
      lugarAnteriorResidencia: g('lugarAnteriorResidencia'),
      razonCambioResidencia: g('razonCambioResidencia'),
      zonasConocidas: g('zonasConocidas'),
      // RF-032: residencia anterior estructurada (planos; el servicio los anida en `residencia`).
      departamentoResidenciaAnterior: g('departamentoResidenciaAnterior'),
      municipioResidenciaAnterior: g('municipioResidenciaAnterior'),
      direccionResidenciaAnterior: g('direccionResidenciaAnterior'),
      barrioResidenciaAnterior: g('barrioResidenciaAnterior'),
      fechaNacimiento: this.toYmd(g('fechaNacimiento')),
      estudiaActualmente: g('estudiaActualmente'),
      // RF-033: componentes separados + nombre completo derivado (compat).
      emergenciaPrimerNombre: g('emergenciaPrimerNombre'),
      emergenciaSegundoNombre: g('emergenciaSegundoNombre'),
      emergenciaPrimerApellido: g('emergenciaPrimerApellido'),
      emergenciaSegundoApellido: g('emergenciaSegundoApellido'),
      familiarEmergencia: [g('emergenciaPrimerNombre'), g('emergenciaSegundoNombre'), g('emergenciaPrimerApellido'), g('emergenciaSegundoApellido')].filter((x: any) => x).join(' ').trim() || g('familiarEmergencia'),
      parentescoFamiliarEmergencia: g('parentescoFamiliarEmergencia'),
      direccionFamiliarEmergencia: addr('direccionFamiliarEmergencia'),
      barrioFamiliarEmergencia: g('barrioFamiliarEmergencia'),
      telefonoFamiliarEmergencia: g('telefonoFamiliarEmergencia'),
      ocupacionFamiliarEmergencia: g('ocupacionFamiliarEmergencia'),
      // RF-035: ubicación territorial del contacto.
      departamentoEmergencia: g('departamentoEmergencia'),
      municipioEmergencia: g('municipioEmergencia'),
      oficina: g('oficina'),
      escolaridad: g('escolaridad'),
      // RF-017: con 'OTROS', la educación superior reutiliza estudios_extra (nivel) y
      // titulo_obtenido (carrera); el bloque de colegio no aplica y no se envía.
      estudiosExtra: g('escolaridad') === 'OTROS'
        ? (g('nivelEducacionSuperior') || '')
        : (g('estudiosExtrasSelect') || []).join(','),
      nombreInstitucion: g('escolaridad') === 'OTROS' ? '' : g('nombreInstitucion'),
      anoFinalizacion: g('escolaridad') === 'OTROS' ? '' : this.toYmd(g('anoFinalizacion')),
      tituloObtenido: g('escolaridad') === 'OTROS' ? (g('carreraEstudio') || '') : g('tituloObtenido'),
      chaqueta: g('tallaChaqueta'),
      pantalon: g('tallaPantalon'),
      camisa: g('tallaCamisa'),
      calzado: g('tallaCalzado'),
      nombreConyugue: g('nombresConyuge'),
      apellidoConyugue: g('apellidosConyuge'),
      numDocIdentidadConyugue: g('documentoIdentidadConyuge'),
      viveConElConyugue: g('viveConyuge'),
      direccionConyugue: addr('direccionConyuge'),
      departamentoConyuge: g('departamentoConyuge'), municipioConyuge: g('municipioConyuge'),
      // El control se llama `telefonoConyuge` (sin la "u"): leerlo con el nombre
      // del payload devolvía undefined y el teléfono del cónyuge nunca viajaba.
      telefonoConyugue: g('telefonoConyuge'),
      barrioMunicipioConyugue: g('barrioMunicipioConyugue'),
      ocupacion_conyugue: g('ocupacionConyuge'),
      // RF-040: nombre del padre derivado + componentes.
      nombrePadre: nombreDe('padrePrimerNombre', 'padreSegundoNombre', 'padrePrimerApellido', 'padreSegundoApellido', 'nombrePadre'),
      padrePrimerNombre: g('padrePrimerNombre'),
      padreSegundoNombre: g('padreSegundoNombre'),
      padrePrimerApellido: g('padrePrimerApellido'),
      padreSegundoApellido: g('padreSegundoApellido'),
      vivePadre: g('elPadreVive'),
      ocupacionPadre: g('ocupacionPadre'),
      direccionPadre: addr('direccionPadre'),
      departamentoPadre: g('departamentoPadre'), municipioPadre: g('municipioPadre'),
      telefonoPadre: g('telefonoPadre'),
      barrioPadre: g('barrioPadre'),
      // RF-040: nombre de la madre derivado + componentes.
      nombreMadre: nombreDe('madrePrimerNombre', 'madreSegundoNombre', 'madrePrimerApellido', 'madreSegundoApellido', 'nombreMadre'),
      madrePrimerNombre: g('madrePrimerNombre'),
      madreSegundoNombre: g('madreSegundoNombre'),
      madrePrimerApellido: g('madrePrimerApellido'),
      madreSegundoApellido: g('madreSegundoApellido'),
      viveMadre: g('madreVive'),
      ocupacionMadre: g('ocupacionMadre'),
      direccionMadre: addr('direccionMadre'),
      departamentoMadre: g('departamentoMadre'), municipioMadre: g('municipioMadre'),
      telefonoMadre: g('telefonoMadre'),
      barrioMadre: g('barrioMadre'),
      // RF-040: referencias con nombre derivado + componentes.
      nombreReferenciaPersonal1: nombreDe('refPersonal1PrimerNombre', 'refPersonal1SegundoNombre', 'refPersonal1PrimerApellido', 'refPersonal1SegundoApellido', 'nombreReferenciaPersonal1'),
      refPersonal1PrimerNombre: g('refPersonal1PrimerNombre'),
      refPersonal1SegundoNombre: g('refPersonal1SegundoNombre'),
      refPersonal1PrimerApellido: g('refPersonal1PrimerApellido'),
      refPersonal1SegundoApellido: g('refPersonal1SegundoApellido'),
      telefonoReferenciaPersonal1: g('telefonoReferencia1'),
      ocupacionReferenciaPersonal1: g('ocupacionReferencia1'),
      tiempoConoceReferenciaPersonal1: g('tiempoConoceReferenciaPersonal1'),
      direccionReferenciaPersonal1: addr('direccionReferenciaPersonal1'),
      departamentoRefPersonal1: g('departamentoRefPersonal1'), municipioRefPersonal1: g('municipioRefPersonal1'),
      parentescoReferenciaPersonal1: g('parentescoReferenciaPersonal1'),
      nombreReferenciaPersonal2: nombreDe('refPersonal2PrimerNombre', 'refPersonal2SegundoNombre', 'refPersonal2PrimerApellido', 'refPersonal2SegundoApellido', 'nombreReferenciaPersonal2'),
      refPersonal2PrimerNombre: g('refPersonal2PrimerNombre'),
      refPersonal2SegundoNombre: g('refPersonal2SegundoNombre'),
      refPersonal2PrimerApellido: g('refPersonal2PrimerApellido'),
      refPersonal2SegundoApellido: g('refPersonal2SegundoApellido'),
      telefonoReferenciaPersonal2: g('telefonoReferencia2'),
      ocupacionReferenciaPersonal2: g('ocupacionReferencia2'),
      tiempoConoceReferenciaPersonal2: g('tiempoConoceReferenciaPersonal2'),
      direccionReferenciaPersonal2: addr('direccionReferenciaPersonal2'),
      departamentoRefPersonal2: g('departamentoRefPersonal2'), municipioRefPersonal2: g('municipioRefPersonal2'),
      parentescoReferenciaPersonal2: g('parentescoReferenciaPersonal2'),
      nombreReferenciaFamiliar1: nombreDe('refFamiliar1PrimerNombre', 'refFamiliar1SegundoNombre', 'refFamiliar1PrimerApellido', 'refFamiliar1SegundoApellido', 'nombreReferenciaFamiliar1'),
      refFamiliar1PrimerNombre: g('refFamiliar1PrimerNombre'),
      refFamiliar1SegundoNombre: g('refFamiliar1SegundoNombre'),
      refFamiliar1PrimerApellido: g('refFamiliar1PrimerApellido'),
      refFamiliar1SegundoApellido: g('refFamiliar1SegundoApellido'),
      telefonoReferenciaFamiliar1: g('telefonoReferenciaFamiliar1'),
      ocupacionReferenciaFamiliar1: g('ocupacionReferenciaFamiliar1'),
      parentescoReferenciaFamiliar1: g('parentescoReferenciaFamiliar1'),
      direccionReferenciaFamiliar1: addr('direccionReferenciaFamiliar1'),
      departamentoRefFamiliar1: g('departamentoRefFamiliar1'), municipioRefFamiliar1: g('municipioRefFamiliar1'),
      nombreReferenciaFamiliar2: nombreDe('refFamiliar2PrimerNombre', 'refFamiliar2SegundoNombre', 'refFamiliar2PrimerApellido', 'refFamiliar2SegundoApellido', 'nombreReferenciaFamiliar2'),
      refFamiliar2PrimerNombre: g('refFamiliar2PrimerNombre'),
      refFamiliar2SegundoNombre: g('refFamiliar2SegundoNombre'),
      refFamiliar2PrimerApellido: g('refFamiliar2PrimerApellido'),
      refFamiliar2SegundoApellido: g('refFamiliar2SegundoApellido'),
      telefonoReferenciaFamiliar2: g('telefonoReferenciaFamiliar2'),
      ocupacionReferenciaFamiliar2: g('ocupacionReferenciaFamiliar2'),
      parentescoReferenciaFamiliar2: g('parentescoReferenciaFamiliar2'),
      direccionReferenciaFamiliar2: addr('direccionReferenciaFamiliar2'),
      departamentoRefFamiliar2: g('departamentoRefFamiliar2'), municipioRefFamiliar2: g('municipioRefFamiliar2'),
      // RF-036/043/044: empresa (territorio + teléfono empresa) y jefe (nombre/cargo/teléfono separados).
      nombreExpeLaboral1Empresa: g('nombreEmpresa1'),
      departamentoEmpresa1: g('departamentoEmpresa1'),
      municipioEmpresa1: g('municipioEmpresa1'),
      barrioEmpresa1: g('barrioEmpresa1'),
      direccionEmpresa1: addr('direccionEmpresa1'),
      telefonosEmpresa1: g('telefonosEmpresa1'),
      nombreJefeEmpresa1: nombreDe('jefePrimerNombre1', '', 'jefePrimerApellido1', '', 'nombreJefe1'),
      jefePrimerNombre1: g('jefePrimerNombre1'),
      jefePrimerApellido1: g('jefePrimerApellido1'),
      cargoJefe1: g('cargoJefe1'),
      telefonoJefe1: g('telefonoJefe1'),
      fechaRetiroEmpresa1: this.toYmd(g('fechaRetiro1')),
      motivoRetiroEmpresa1: g('motivoRetiro1'),
      cargoEmpresa1: g('cargoEmpresa1'),
      empresas_laborado: g('empresas_laborado'),
      tiempoExperiencia: g('tiempoExperiencia'),
      familiaConUnSoloIngreso: g('familiaSolo'),
      numHabitaciones: g('numeroHabitaciones'),
      numPersonasPorHabitacion: g('personasPorHabitacion'),
      caracteristicasVivienda: g('caracteristicasVivienda'),
      experienciaLaboral: g('experienciaLaboral'),
      numHijosDependientes: g('numHijosDependientes'),
      cuidadorHijos: g('cuidadorHijos'),
      fuenteVacante: g('fuenteVacante'),
      areaExperiencia: (g('areaExperiencia') || []).join(', '),
      expectativasDeVida: (g('expectativasVidaChecks') || []).join(', '),
      servicios: (g('comodidadesChecks') || []).join(', '),
      tipoVivienda: (g('tiposViviendaChecks') || []).join(', '),
      personasConQuienConvive: (g('conQuienViveChecks') || []).join(', '),
      personas_a_cargo: (g('personas_a_cargo') || []).join(', '),

      // Evaluación (Opcional) — backend acepta estos nombres en snake_case
      relacion_familiar: g('relacionFamiliar'),
      rendimiento_laboral: g('desempenoLaboral'),
      porque_lo_felicitarian: g('felicitaciones'),
      malentendido: g('situacionConflictiva'),
      actividades_diarias: g('actividadesDiferentes'),
    };

    // Hijos Array — RF-045: el nombre completo legacy se deriva de las partes
    // estructuradas para conservar compatibilidad con `nombre`.
    const hijosArr = g('hijos') || [];
    p.hijos = hijosArr.map((h: any) => {
      const nombreCompleto = [h.hijoPrimerNombre, h.hijoSegundoNombre, h.hijoPrimerApellido, h.hijoSegundoApellido]
        .map((s: any) => (s || '').trim()).filter(Boolean).join(' ');
      return {
        ...h,
        nombreHijo: (h.nombreHijo || '').trim() || nombreCompleto,
        fechaNacimientoHijo: this.toYmd(h.fechaNacimientoHijo)
      };
    });

    // Convert to Uppercase Recursively
    return this.convertValuesToUpperCase(p);
  }

  convertValuesToUpperCase(v: any): any {
    if (typeof v === 'string') {
      // Phones: Keep digits only
      if (/^\d+$/.test(v) && v.length > 5) return v;
      // Emails: Uppercase (igual que el resto de los datos del formulario)
      if (v.includes('@')) return v.toUpperCase().trim();
      return v.toUpperCase().trim();
    }
    if (Array.isArray(v)) return v.map(i => this.convertValuesToUpperCase(i));
    if (v && typeof v === 'object') {
      const out: any = {};
      for (const k in v) out[k] = this.convertValuesToUpperCase(v[k]);
      return out;
    }
    return v;
  }

  // ----------------------------------------------------
  // 6. Helpers
  // ----------------------------------------------------
  /**
   * Adjunta la hoja de vida. Valida extensión, MIME declarado, tamaño y la
   * FIRMA REAL del archivo: antes solo se miraba el largo del nombre, así que
   * un ejecutable de 500 MB renombrado a `.pdf` entraba sin problema
   * (`accept=".pdf"` del input es solo una sugerencia del navegador).
   */
  async subirArchivo(event: any, campo: string) {
    const input = event?.target as HTMLInputElement | undefined;
    const file: File | undefined = input?.files?.[0];
    if (!file) return;

    const rechazar = (titulo: string, texto: string) => {
      if (input) input.value = '';
      Swal.fire({ icon: 'error', title: titulo, text: texto, confirmButtonColor: '#111827' });
    };

    if (file.name.length > 100) {
      return rechazar('Nombre muy largo', 'El nombre del archivo no puede pasar de 100 caracteres. Renómbrelo e inténtelo de nuevo.');
    }
    if (!/\.pdf$/i.test(file.name)) {
      return rechazar('Solo se acepta PDF', 'El archivo debe terminar en .pdf. Si tiene una foto o un Word, conviértalo a PDF primero.');
    }
    if (file.type && !MIME_PDF.has(file.type.toLowerCase())) {
      return rechazar('El archivo no es un PDF', `Se recibió un archivo de tipo "${file.type}". Adjunte su hoja de vida en PDF.`);
    }
    if (!file.size) {
      return rechazar('Archivo vacío', 'El archivo está vacío (0 KB). Revise que se haya guardado bien.');
    }
    if (file.size > MAX_ARCHIVO_MB * 1024 * 1024) {
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      return rechazar('Archivo muy pesado', `Su archivo pesa ${mb} MB y el máximo son ${MAX_ARCHIVO_MB} MB. Comprímalo o escanee con menor calidad.`);
    }
    if (!(await this.esPdfReal(file))) {
      return rechazar('El archivo no es un PDF real', 'El archivo dice ser PDF pero su contenido no lo es. Vuelva a exportarlo como PDF.');
    }

    this.uploadedFiles[campo] = { file, fileName: file.name };
    this.formHojaDeVida2.patchValue({ [campo]: file.name });
    // Vaciar el input también en éxito: el navegador no dispara `change` si se
    // vuelve a elegir el MISMO archivo (típico al re-exportar el PDF corregido
    // con el mismo nombre) y el botón parecía muerto.
    if (input) input.value = '';
    this.cdr.markForCheck();
  }

  /** Un PDF siempre empieza por la firma `%PDF-`, independientemente del nombre. */
  private async esPdfReal(file: File): Promise<boolean> {
    try {
      const buf = await file.slice(0, 5).arrayBuffer();
      return new TextDecoder().decode(new Uint8Array(buf)) === '%PDF-';
    } catch {
      return false; // Si no se puede leer, no se sube.
    }
  }

  verArchivo(campo: string) {
    const f = this.uploadedFiles[campo]?.file;
    if (f) {
      const url = f instanceof File ? URL.createObjectURL(f) : f;
      window.open(url as string, '_blank');
      // Liberar el blob cuando la pestaña nueva ya lo cargó: cada vista previa
      // dejaba un object URL vivo (y su PDF en memoria) hasta cerrar la página.
      if (f instanceof File) setTimeout(() => URL.revokeObjectURL(url as string), 60_000);
    } else {
      Swal.fire('Error', 'No hay archivo', 'error');
    }
  }

  subirTodosLosArchivos(): Promise<boolean> {
    const pend = Object.keys(this.uploadedFiles).filter(k => this.typeMap[k] && this.uploadedFiles[k]?.file instanceof File);
    if (!pend.length) return Promise.resolve(true);

    const promises = pend.map(k => {
      const d = this.uploadedFiles[k];
      if (!d) return Promise.resolve(true);
      return firstValueFrom(this.gestionDocumentosService.guardarDocumento(d.fileName, this.numeroCedula, this.typeMap[k], d.file as File));
    });
    return Promise.all(promises).then(() => true).catch(() => false);
  }

  // ----------------------------------------------------
  // Cédula escaneada + foto del candidato (paso 1)
  // ----------------------------------------------------

  /** Foto capturada en el paso 1, pendiente de subir. Se sube al FINAL del
   *  registro porque el endpoint de biometría exige que el candidato exista. */
  fotoCapturada: File | null = null;

  onFotoLista(archivo: File | null): void {
    this.fotoCapturada = archivo;
    this.cdr.markForCheck();
  }

  /** Cédula que reciben los componentes de captura del paso 1. Solo se entrega
   *  cuando el número es plausible: un documento archivado bajo una cédula
   *  equivocada es un documento perdido. */
  get cedulaParaCaptura(): string {
    const v = String(this.formHojaDeVida2?.get('numeroCedula')?.value || '').trim();
    return /^[1-9]\d{4,10}$/.test(v) ? v : '';
  }

  /** Sube la foto a biometría (FOTO=89). Se llama tras el upsert del candidato;
   *  si falla no tumba el registro: la foto se puede volver a tomar después. */
  private async subirFotoCapturada(): Promise<boolean> {
    if (!(this.fotoCapturada instanceof File)) return true;
    try {
      await firstValueFrom(this.candidatoNewS.uploadFoto(this.numeroCedula, this.fotoCapturada));
      this.fotoCapturada = null;
      return true;
    } catch (e) {
      console.error('[foto] no se pudo subir la foto del candidato', e);
      return false;
    }
  }

  updateStepperStats() {
    if (!this.stepper) return;
    this.stepperTotal = this.stepper.steps.length;
    this.stepperIndex = this.stepper.selectedIndex + 1;
    this.stepperProgress = this.stepperTotal ? (this.stepperIndex / this.stepperTotal) * 100 : 0;
    this.cdr.markForCheck();
  }

  // ----------------------------------------------------
  getControl(name: string, form: FormGroup = this.formHojaDeVida2): FormControl {
    return form.get(name) as FormControl;
  }

  asFormGroup(c: AbstractControl): FormGroup {
    return c as FormGroup;
  }

  // NOTA (2026-08-19): acá vivía la versión Django del subsistema
  // "multi-credencial por cédula" (updateExistingUserByDoc /
  // agregarCredencialPersonal / showEmailOwner / comprobarDuenoCorreo), que
  // analizaba los cuerpos de error DRF y llamaba endpoints que no existen en
  // Java. El multi-correo real vive ahora en ms-auth-admin (V42,
  // /gestion_admin/auth/agregar-credenciales/) y se usa desde
  // `manejarCuentaExistente` + `agregarCorreoComoCredencial` (más abajo).
  // El correo ajeno lo frena el upsert con EMAIL_BELONGS_TO_OTHER_CEDULA
  // (handleBackendError → showEmailOwnerWithInfo).

  shouldShowError(controlName: string, form: FormGroup = this.formHojaDeVida2): boolean {
    const control = form.get(controlName);
    return !!(control && control.invalid && (control.touched || control.dirty));
  }

  /**
   * Campo "resuelto": tiene valor Y es válido. Pinta el borde en verde.
   * Deliberadamente NO exige `touched`: un valor precargado desde backend
   * también cuenta como resuelto. Y nunca se solapa con `shouldShowError`,
   * porque un control inválido no puede ser válido a la vez.
   */
  isFieldOk(controlName: string, form: FormGroup = this.formHojaDeVida2): boolean {
    const control = form.get(controlName);
    if (!control || control.invalid) return false;
    const v = control.value;
    if (v === null || v === undefined) return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'boolean') return v;
    return String(v).trim().length > 0;
  }

  /**
   * Estado AMARILLO (advertencia) del usuario del correo. Solo aplica a ese
   * control y nunca compite con el rojo: si el campo tiene un error visible,
   * gana el error y el aviso se calla para no mezclar dos mensajes.
   * Es puramente visual: no toca validez ni impide guardar.
   */
  tieneAvisoDominio(controlName: string, form: FormGroup = this.formHojaDeVida2): boolean {
    return controlName === 'correoUsuario'
      && form === this.formHojaDeVida2
      && this.avisoDominioEnUsuario
      && !this.shouldShowError(controlName, form);
  }

  // ----------------------------------------------------
  // Autocompletado de listas largas (departamentos / ciudades / dominios).
  // `searchControl` es el texto visible y filtra; el control real del form
  // solo se compromete cuando se elige una opción, para que no quede un
  // término de búsqueda a medias haciéndose pasar por valor seleccionado.
  // ----------------------------------------------------

  /** Texto a mostrar de una opción (objeto o string). */
  private optionLabel(op: any, optionsKey?: string): string {
    if (op === null || op === undefined) return '';
    return String(optionsKey ? op[optionsKey] : op);
  }

  /**
   * Al enfocar, re-emite el término actual para que la lista filtrada sea
   * coherente con lo que se ve.
   *
   * En móvil además sube el campo al centro de la pantalla: los campos del
   * final del formulario quedaban pegados al borde inferior y el panel del
   * autocompletado abría fuera de la vista (agravado por el teclado virtual).
   */
  onAutocompleteFocus(searchControl: FormControl, event?: Event): void {
    searchControl.setValue(searchControl.value ?? '');

    if (typeof window === 'undefined' || window.innerWidth > 600) return;
    const campo = (event?.target as HTMLElement | null)?.closest('mat-form-field');
    if (!campo) return;
    // Tras el frame en que se abre el panel, para no pelear con su animación.
    setTimeout(() => campo.scrollIntoView({ block: 'center', behavior: 'smooth' }), 150);
  }

  onAutocompleteSelected(
    event: MatAutocompleteSelectedEvent,
    controlName: string,
    searchControl: FormControl,
    optionsKey: string | undefined,
    valueKey: string | undefined,
    form: FormGroup = this.formHojaDeVida2,
  ): void {
    const op = event.option.value;
    const real = form.get(controlName);
    if (!real) return;
    real.setValue(valueKey ? op[valueKey] : op);
    real.markAsDirty();
    real.markAsTouched();
    searchControl.setValue(this.optionLabel(op, optionsKey), { emitEvent: false });
    searchControl.setErrors(null);
    this.cdr.markForCheck();
  }

  /**
   * Al salir del campo: si lo escrito no corresponde a una opción, se descarta
   * y se restaura el texto del valor ya comprometido (o se limpia si no hay).
   * Además espeja el estado de error del control real para que `mat-error`
   * se pinte, ya que el input está atado a `searchControl`, no al control real.
   */
  onAutocompleteBlur(
    controlName: string,
    searchControl: FormControl,
    options: any[],
    optionsKey: string | undefined,
    valueKey: string | undefined,
    form: FormGroup = this.formHojaDeVida2,
  ): void {
    const real = form.get(controlName);
    if (!real) return;

    const typed = String(searchControl.value ?? '').trim();
    const match = (options || []).find(
      op => this.optionLabel(op, optionsKey).toLowerCase() === typed.toLowerCase()
    );

    if (match) {
      real.setValue(valueKey ? match[valueKey] : match);
      searchControl.setValue(this.optionLabel(match, optionsKey), { emitEvent: false });
    } else {
      const committed = real.value;
      searchControl.setValue(committed ? String(committed) : '', { emitEvent: false });
    }

    real.markAsTouched();
    searchControl.setErrors(this.shouldShowError(controlName, form) ? { mirror: true } : null);
    this.cdr.markForCheck();
  }

  /**
   * Botón del sufijo del autocompletado: limpia si ya hay un valor elegido y,
   * si no, enfoca el input (matAutocomplete abre el panel al recibir el foco),
   * para que la flecha se comporte como el desplegable que aparenta ser.
   */
  toggleAutocomplete(
    event: Event,
    controlName: string,
    searchControl: FormControl,
    form: FormGroup = this.formHojaDeVida2,
  ): void {
    const real = form.get(controlName);
    if (real?.value) {
      this.clearAutocomplete(controlName, searchControl, form);
      return;
    }
    const campo = (event.currentTarget as HTMLElement | null)?.closest('mat-form-field');
    campo?.querySelector('input')?.focus();
  }

  clearAutocomplete(controlName: string, searchControl: FormControl, form: FormGroup = this.formHojaDeVida2): void {
    const real = form.get(controlName);
    if (real) {
      real.setValue('');
      real.markAsDirty();
      real.markAsTouched();
    }
    searchControl.setValue('');
    this.cdr.markForCheck();
  }

  /**
   * Mantiene el texto visible del autocompletado sincronizado con el valor real
   * del formulario (precarga desde backend, y los reset en cascada
   * departamento → ciudad). En todos estos campos el valor guardado ES el texto
   * mostrado, así que el espejo es directo.
   */
  private initAutocompleteMirror(): void {
    for (const { control, search } of this.paresAutocompletado()) {
      const real = this.formHojaDeVida2.get(control);
      if (!real) continue;

      const inicial = real.value == null ? '' : String(real.value);
      if (inicial.trim()) search.setValue(inicial, { emitEvent: false });

      real.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(v => {
        const texto = v == null ? '' : String(v);
        if (String(search.value ?? '') !== texto) search.setValue(texto, { emitEvent: false });
      });
    }
  }

  getErrorMessage(controlName: string, form: FormGroup = this.formHojaDeVida2): string {
    const control = form.get(controlName);
    if (!control || !control.errors) return '';

    const errors = control.errors;
    if (errors['required']) return 'Campo requerido';
    if (errors['email']) return 'Correo inválido';
    if (errors['minlength']) return `Mínimo ${errors['minlength'].requiredLength} caracteres`;
    if (errors['maxlength']) return `Máximo ${errors['maxlength'].requiredLength} caracteres`;
    if (errors['pattern']) return 'Formato inválido';

    // Custom & New
    if (errors['invalidAddress']) {
      return 'Dirección inválida. Urbana: CL 12 33 24 · Rural: KM 5 VIA FUNZA o VEREDA EL ROSAL FINCA LA ESPERANZA';
    }

    if (errors['invalidName']) return 'Solo letras y espacios'; // Custom
    if (errors['invalidPhone']) return 'Formato 3xxxxxxxxx'; // Custom
    if (errors['invalidPhoneEmpresa']) return 'Celular (3101234567) o fijo (6012345678)';
    if (errors['invalidDoc']) return 'Solo números'; // Custom
    if (errors['looksLikePhone']) return 'Parece un número de celular, ingrese un documento válido.';

    // Número de documento contra el tipo elegido
    if (errors['faltaTipo']) return 'Primero elija el tipo de documento';
    if (errors['soloNumeros']) return 'Solo números: sin puntos, comas, espacios ni letras';
    if (errors['ceroInicial']) return 'No empiece por cero: escriba el número tal como aparece en el documento';
    if (errors['docNoPlausible']) return 'Ese número no es válido. Escriba el número real de su documento';
    if (errors['largoPorTipo']) {
      const e = errors['largoPorTipo'];
      const rango = e.min === e.max ? `${e.min} dígitos` : `entre ${e.min} y ${e.max} dígitos`;
      return `Escribió ${e.actual} dígito${e.actual === 1 ? '' : 's'}. Una ${e.nombre} tiene ${rango} (ej: ${e.ejemplo}). Verifique el tipo de documento y el número`;
    }
    if (errors['nuipInvalido']) {
      return `Una ${errors['nuipInvalido'].nombre} de 10 dígitos siempre empieza por 1 o por 2. Revise el número o cambie el tipo de documento`;
    }

    // Usuario del correo
    if (errors['espacioEnUsuario']) return 'No puede llevar espacios';
    if (errors['tildeEnUsuario']) return 'Sin tildes ni ñ (escriba "sebastian", no "sebastián")';
    if (errors['arrobaEnUsuario']) return 'No escriba el @, se agrega solo';
    if (errors['caracterInvalidoUsuario']) return 'Solo letras, números y . _ - +';

    // Fechas del documento
    if (errors['fechaFutura']) return 'La fecha no puede ser futura';
    if (errors['menorDeEdad']) {
      const edad = errors['menorDeEdad']?.edad;
      return `Debe tener al menos ${FormsTestContratation.EDAD_MINIMA} años cumplidos` +
        (typeof edad === 'number' && edad >= 0 ? ` (según esta fecha tiene ${edad})` : '');
    }
    if (errors['edadNoPlausible']) return 'Revise la fecha: la edad no es válida';
    if (errors['expedicionAntesDeNacer']) return 'No puede ser anterior a la fecha de nacimiento';
    if (errors['expedicionAntesDeEdadMinima']) {
      return `Con esta fecha la cédula se habría expedido antes de los ${FormsTestContratation.EDAD_EXPEDICION_CC} años: revise la fecha de nacimiento`;
    }
    // El datepicker acota el calendario con [min]/[max]; sin esto el valor
    // precargado fuera de rango solo decía "Valor inválido".
    if (errors['matDatepickerMax']) {
      return controlName === 'fechaNacimiento'
        ? `Debe tener al menos ${FormsTestContratation.EDAD_MINIMA} años cumplidos`
        : 'La fecha no puede ser futura';
    }
    if (errors['matDatepickerMin']) return 'Revise la fecha: está fuera del rango permitido';
    if (errors['specialChars']) return 'Sin caracteres especiales';
    if (errors['invalidDate']) return 'Fecha no válida';

    // New Validation Messages
    if (errors['nameMinWords']) return 'Escribe mínimo nombre y apellido.';
    if (errors['nameStopword']) return 'Nombre inválido. Escribe un nombre real (mínimo nombre y apellido).';
    if (errors['nameRepeatedWord']) return 'Nombre inválido. Evita repetir la misma palabra.';
    if (errors['nameRepeatedChar']) return `Nombre inválido. Revisa la palabra: ${errors['nameRepeatedChar'].word}.`;

    if (errors['duplicateReferenceName']) return 'Este nombre ya fue usado en otra referencia.';
    if (errors['duplicateReferencePhone']) return 'Este teléfono ya lo usó en otra referencia o es el suyo propio.';

    return 'Valor inválido';
  }

  showInvalidFormAlert() {
    Swal.fire({
      icon: 'warning', title: 'Formulario Incompleto',
      html: 'Hay campos obligatorios sin llenar o con errores. <b>Revise los campos marcados en rojo</b> en cada paso del formulario y asegúrese de completarlos correctamente.',
      confirmButtonColor: '#111827'
    });
  }

  // Utils
  toYmd(d: any): string {
    if (!d) return '';
    // Cadena que ya viene como YYYY-MM-DD (borrador/prefill): se respeta tal
    // cual. Pasarla por `new Date()` la interpreta en UTC y corre el día.
    if (typeof d === 'string') {
      const m = /^(\d{4}-\d{2}-\d{2})/.exec(d.trim());
      if (m) return m[1];
    }
    const date = d instanceof Date ? d : new Date(d);
    if (isNaN(date.getTime())) return '';
    // En LOCAL, no UTC: con `toISOString()` la fecha retrocedía un día para
    // quien llenara el formulario desde un huso horario positivo (Europa).
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${mm}-${dd}`;
  }

  // ----------------------------------------------------
  // 3. Validation Helpers (Strict)
  // ----------------------------------------------------

  // Palabras que delatan un nombre inventado. Las letras sueltas NO están en la
  // lista: son iniciales intermedias legítimas ("MARIA J GOMEZ"), que antes se
  // rechazaban. Que el nombre no sea solo iniciales lo controla
  // `fullNameValidator` exigiendo dos palabras de dos letras o más.
  private readonly STOPWORDS = new Set([
    'NO', 'NA', 'N/A', 'SN', 'S/N', 'NULL', 'NULO', 'NONE', 'SIN',
    'PRUEBA', 'TEST', 'DEMO', 'XXX', 'XXXX', 'ASD', 'QWERTY'
  ]);

  private normalizeSpaces(val: string): string {
    return val ? val.trim().replace(/\s+/g, ' ') : '';
  }

  // --- Address Normalization (Colombia Standard) ---
  // --- Address Normalization (Colombia Standard) ---
  normalizeAddressCO(value: string): string {
    if (!value) return '';
    let v = value.toUpperCase().trim();

    // 1. Remove special chars except space
    v = v.replace(/[#º°\.,:;\/\-\_\(\)\[\]\{\}"'&]/g, ' ');
    v = v.replace(/\s+/g, ' ').trim();

    // 2. Remove accents
    v = v.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // 3. Separar la v\u00eda pegada al n\u00famero ("CL12 33 24" -> "CL 12 33 24"): as\u00ed la
    //    escribe mucha gente y la direcci\u00f3n se rechazaba sin motivo aparente.
    v = v.replace(
      /\b(CALLE|CLLE|CLL|CL|CARRERA|CRRA|CRA|CRR|KRA|KRR|KR|CR|DIAGONAL|DIAG|DG|TRANSVERSAL|TRANSV|TRV|TV|AVENIDA|AVDA|AVEN|AV|AUTOPISTA|AUTO|AUT|CIRCULAR|CIRC|KILOMETRO|KM|MANZANA|MZ)(\d)/g,
      '$1 $2'
    );

    const tokens = v.split(' ');
    const out: string[] = [];

    // Mappings Strict per user request
    const VIAS: { [key: string]: string } = {
      'CALLE': 'CL', 'CLL': 'CL', 'CLLE': 'CL', 'CL': 'CL',
      'CARRERA': 'CR', 'CRA': 'CR', 'CRRA': 'CR', 'KR': 'CR', 'KRA': 'CR', 'KRR': 'CR', 'CRR': 'CR', 'CR': 'CR',
      'DIAGONAL': 'DG', 'DIAG': 'DG', 'DG': 'DG',
      'TRANSVERSAL': 'TV', 'TRANSV': 'TV', 'TRV': 'TV', 'TV': 'TV',
      'AVENIDA': 'AV', 'AV': 'AV', 'AVDA': 'AV', 'AVEN': 'AV',
      'AUTOPISTA': 'AUT', 'AUTO': 'AUT', 'AUT': 'AUT',
      'CIRCULAR': 'CIRC', 'CIRC': 'CIRC',
      'VIA': 'VIA', 'VÍA': 'VIA'
    };

    const COMPLEMENTS: { [key: string]: string } = {
      'SUR': 'SUR', 'S': 'SUR',
      'NORTE': 'NORTE', 'N': 'NORTE',
      'ESTE': 'ESTE', 'E': 'ESTE',
      'ORIENTE': 'O', 'O': 'O',
      'OCCIDENTE': 'OCC', 'OESTE': 'OCC', 'OCC': 'OCC', 'W': 'OCC',
      'BIS': 'BIS',
      'INTERIOR': 'INT', 'INT': 'INT',
      'APARTAMENTO': 'APTO', 'APTO': 'APTO',
      'TORRE': 'TORRE',
      'BLOQUE': 'BLOQUE',
      'ETAPA': 'ETAPA',
      'MANZANA': 'MZ', 'MZ': 'MZ',
      'CASA': 'CASA',
      'LOTE': 'LOTE',
      'KILOMETRO': 'KM', 'KM': 'KM', 'KILÓMETRO': 'KM',
      // Zona rural: buena parte de las oficinas (FORANEOS, SOTAQUIRA, ANDES)
      // recibe direcciones sin nomenclatura urbana.
      'VEREDA': 'VEREDA', 'VDA': 'VEREDA', 'FINCA': 'FINCA',
      'SECTOR': 'SECTOR', 'CONJUNTO': 'CONJUNTO',
      'BARRIO': 'BARRIO', 'BRR': 'BARRIO', 'BR': 'BARRIO',
      'CORREGIMIENTO': 'CORREGIMIENTO', 'CGTO': 'CORREGIMIENTO'
    };

    for (const t of tokens) {
      if (VIAS[t]) {
        out.push(VIAS[t]);
      } else if (COMPLEMENTS[t]) {
        out.push(COMPLEMENTS[t]);
      } else {
        if (t.length > 0) out.push(t);
      }
    }

    const final: string[] = [];
    for (let i = 0; i < out.length; i++) {
      const curr = out[i];
      const next = out[i + 1];

      // Fix: AV CALLE -> AV, AV CARRERA -> AK
      if (curr === 'AV' && next === 'CL') { final.push('AV'); i++; continue; }
      if (curr === 'AV' && next === 'CR') { final.push('AK'); i++; continue; }

      final.push(curr);
    }

    return final.join(' ');
  }

  /** Vías urbanas con nomenclatura numérica (CL 12 33 24). */
  private static readonly VIAS_URBANAS = new Set(['CL', 'CR', 'DG', 'TV', 'AV', 'AK', 'AUT', 'CIRC', 'VIA']);
  /**
   * Encabezados de dirección rural o de conjunto. No llevan la doble
   * numeración urbana ("VEREDA EL ROSAL FINCA LA ESPERANZA" no tiene números),
   * así que se validan solo por longitud: antes se rechazaban todas y las
   * oficinas de FORANEOS/SOTAQUIRA/ANDES no podían registrar a nadie.
   */
  private static readonly VIAS_RURALES = new Set([
    'KM', 'MZ', 'VEREDA', 'FINCA', 'LOTE', 'SECTOR', 'CASA', 'CONJUNTO', 'BARRIO', 'CORREGIMIENTO',
  ]);

  addressCOValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const val = this.normalizeAddressCO(control.value);
      const tokens = val.split(' ').filter(Boolean);
      const cabeza = tokens[0] ?? '';

      if (FormsTestContratation.VIAS_URBANAS.has(cabeza)) {
        // Urbana: al menos 4 partes y dos de ellas con números (vía, placa y nº).
        if (tokens.length < 4) return { invalidAddress: true };
        const numTokens = tokens.filter(t => /^\d/.test(t) || /\d$/.test(t));
        if (numTokens.length < 2) return { invalidAddress: true };
        return null;
      }

      if (FormsTestContratation.VIAS_RURALES.has(cabeza)) {
        // Rural: basta con que diga algo más que el encabezado.
        return tokens.length >= 3 ? null : { invalidAddress: true };
      }

      return { invalidAddress: true };
    };
  }

  normalizeAddressControl(ctrlName: any, form: FormGroup = this.formHojaDeVida2) {
    const control = form.get(ctrlName);
    if (control && control.value) {
      const norm = this.normalizeAddressCO(control.value);
      if (norm !== control.value) {
        control.setValue(norm, { emitEvent: false });
        control.updateValueAndValidity();
      }
    }
  }



  private nameValidator(required = true): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const val = control.value;
      if (!val && !required) return null;
      if (!val) return required ? { required: true } : null;

      // 1. Regex Check
      if (!REGEX_NAMES.test(val)) return { invalidName: true };

      const norm = this.normalizeSpaces(val).toUpperCase();
      const words = norm.split(' ');

      // 2. Stopwords & Garbage Check per word
      for (const w of words) {
        if (this.STOPWORDS.has(w)) return { nameStopword: { word: w } };

        // Repeated Chars (AAA, BBB) - 3+ same char
        if (/^(.)\1{2,}$/.test(w)) return { nameRepeatedChar: { word: w } };
      }

      return null;
    };
  }

  private fullNameValidator(required = true): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const val = control.value;
      if (!val && !required) return null;
      if (!val) return { required: true };

      // 1. Basic Name Check
      const nameVal = this.nameValidator(required)(control);

      if (nameVal) return nameVal;

      const norm = this.normalizeSpaces(val).toUpperCase();
      const words = norm.split(' ');

      // 2. Min 2 Words (Name + Surname). Solo cuentan las palabras de dos letras
      // o más: así "MARIA J GOMEZ" pasa (la inicial no estorba) pero "J A" no.
      const reales = words.filter(w => w.replace(/[^A-ZÑÁÉÍÓÚÜ]/g, '').length >= 2);
      if (reales.length < 2) return { nameMinWords: true };

      // 3. Repeated Words (e.g. "NO NO", "TEST TEST")
      // Check if all words are identical
      const first = words[0];
      if (words.every(w => w === first)) return { nameRepeatedWord: true };

      return null;
    };
  }

  private phoneCOValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const val = control.value;
      if (!val) return null;
      const valid = REGEX_PHONE_CO.test(val);
      return valid ? null : { invalidPhone: true };
    };
  }

  /**
   * Teléfono de una EMPRESA: puede ser celular o fijo, a diferencia del de una
   * persona. Se comparan solo los dígitos, así que "601 234 5678" o
   * "(601) 234-5678" valen igual que "6012345678".
   *
   * Acepta:
   *  - celular:            3XXXXXXXXX          (10 dígitos)
   *  - fijo nacional:      60X + 7 dígitos     (10 dígitos, desde 2022)
   *  - fijo local viejo:   7 dígitos
   */
  private telefonoEmpresaValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const val = control.value;
      if (!val) return null;
      const d = String(val).replace(/\D/g, '');
      const ok =
        REGEX_PHONE_CO.test(d) ||        // celular
        /^60[1-8]\d{7}$/.test(d) ||      // fijo nacional
        /^[2-8]\d{6}$/.test(d);          // fijo local (7 dígitos)
      return ok ? null : { invalidPhoneEmpresa: true };
    };
  }

  /** Deja solo dígitos mientras se escribe (teléfonos). */
  normalizarTelefono(event: Event, controlName: string, form: FormGroup = this.formHojaDeVida2): void {
    const input = event.target as HTMLInputElement;
    const limpio = String(input.value ?? '').replace(/\D/g, '');
    if (limpio === input.value) return;
    input.value = limpio;
    form.get(controlName)?.setValue(limpio);
  }

  /** Punto único de limpieza en vivo para el template (`sanitizar`). */
  sanitizarCampo(modo: string, event: Event, controlName: string, form: FormGroup = this.formHojaDeVida2): void {
    if (modo === 'usuarioCorreo') this.normalizarUsuarioCorreo(event, controlName, form);
    else if (modo === 'telefono') this.normalizarTelefono(event, controlName, form);
    else if (modo === 'documento') this.normalizarDocumento(event, controlName, form);
  }

  /**
   * Deja solo dígitos mientras se escribe. La cédula se dicta y se copia con
   * puntos ("1.005.851.505") todo el tiempo; rechazarlo con un error rojo es
   * hacerle perder el tiempo a la persona por un separador de miles.
   */
  private normalizarDocumento(event: Event, controlName: string, form: FormGroup): void {
    const input = event.target as HTMLInputElement;
    const limpio = String(input.value ?? '').replace(/\D+/g, '');
    if (limpio === input.value) return;

    // Conservar la posición del cursor: reescribir el value lo manda al final y
    // corregir un dígito del medio se vuelve imposible.
    const posicion = input.selectionStart ?? limpio.length;
    const removidosAntes = String(input.value ?? '').slice(0, posicion).replace(/\d/g, '').length;

    input.value = limpio;
    form.get(controlName)?.setValue(limpio, { emitEvent: true });
    const nueva = Math.max(0, posicion - removidosAntes);
    input.setSelectionRange(nueva, nueva);
  }

  private docValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const val = control.value;
      if (!val) return null;
      const valid = REGEX_NUMERIC.test(val);
      if (!valid) return { invalidDoc: true };
      // Reject Colombian cellphone numbers (10 digits starting with 3)
      if (/^3\d{9}$/.test(val)) return { looksLikePhone: true };
      return null;
    };
  }

  /** Caracteres que un buzón real admite antes del @. */
  private static readonly USUARIO_CORREO_OK = /^[a-zA-Z0-9._%+-]+$/;

  /**
   * Usuario del correo (lo que va antes del @). Ni tildes ni ñ ni espacios:
   * "sebastián" o "sebastian guarnizo" no arman una dirección válida y el
   * correo termina rebotando. Se distingue el motivo para poder decírselo.
   */
  private usuarioCorreoValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const v = String(control.value ?? '');
      if (!v) return null;
      if (/\s/.test(v)) return { espacioEnUsuario: true };
      if (v.includes('@')) return { arrobaEnUsuario: true };
      // Cualquier cosa fuera de ASCII: tildes, ñ, diéresis…
      if (/[^\x00-\x7F]/.test(v)) return { tildeEnUsuario: true };
      if (!FormsTestContratation.USUARIO_CORREO_OK.test(v)) return { caracterInvalidoUsuario: true };
      return null;
    };
  }

  /**
   * Limpia el usuario del correo mientras se escribe: quita tildes (NFD deja la
   * letra base y se descartan los diacríticos, así ñ→n), espacios y símbolos
   * que no valen. Validar solo no basta: en móvil el teclado mete la tilde sin
   * que la persona se dé cuenta y el campo queda en rojo sin saber por qué.
   */
  normalizarUsuarioCorreo(event: Event, controlName: string, form: FormGroup = this.formHojaDeVida2): void {
    const input = event.target as HTMLInputElement;
    const limpio = String(input.value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')   // diacriticos: a-acento -> a, enie -> n
      .replace(/\s+/g, '')
      .replace(/[^a-zA-Z0-9._%+-]/g, '');

    if (limpio === input.value) return;
    input.value = limpio;
    form.get(controlName)?.setValue(limpio);
  }

  private notPhoneNumberValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const val = control.value;
      if (!val) return null;
      if (/^3\d{9}$/.test(val)) return { looksLikePhone: true };
      return null;
    };
  }

  /** Regla vigente para el tipo elegido (o la genérica si el tipo es desconocido). */
  private reglaDoc(tipo: any) {
    return REGLAS_DOC[String(tipo || '').toUpperCase().trim()] ?? REGLA_DOC_POR_DEFECTO;
  }

  /**
   * Valida el número CONTRA el tipo elegido, leyendo el tipo del control hermano.
   *
   * Va como validador del control del número (no del grupo) a propósito: un
   * validador de grupo tendría que escribir el error con `setErrors` sobre el
   * hijo, y eso revalida los ancestros y vuelve a disparar el mismo validador.
   * Lo que sí hace falta es re-evaluar cuando cambia el tipo — de eso se encarga
   * `revalidarNumeroAlCambiarTipo()`.
   *
   * Rechaza únicamente lo imposible; lo dudoso se advierte en la confirmación.
   */
  private numeroSegunTipoValidator(campoTipo: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const num = String(control.value ?? '').trim();
      if (!num) return null;

      const tipo = String(control.parent?.get(campoTipo)?.value || '').toUpperCase().trim();
      if (!tipo) return { faltaTipo: true };
      if (!/^\d+$/.test(num)) return { soloNumeros: true };
      if (/^0/.test(num)) return { ceroInicial: true };

      // Basura evidente: todos los dígitos iguales, o una secuencia corrida de 6+
      // dígitos. "1010101010" NO cae acá a propósito: es un patrón, no una serie.
      const serie = num.length >= 6 && ('01234567890'.includes(num) || '09876543210'.includes(num));
      if (/^(\d)\1+$/.test(num) || serie) return { docNoPlausible: true };

      const regla = this.reglaDoc(tipo);
      if (num.length < regla.min || num.length > regla.max) {
        return { largoPorTipo: { tipo, ...regla, actual: num.length } };
      }

      // NUIP: las cédulas de 10 dígitos van en las series 1.xxx (2003+) y
      // 2.xxx (2023+). Un 10 dígitos que arranque distinto es otro documento.
      if ((regla as any).nuip && num.length === 10 && !/^[12]/.test(num)) {
        return { nuipInvalido: { tipo, nombre: regla.nombre } };
      }

      return null;
    };
  }

  /**
   * Cambiar el tipo tiene que volver a juzgar el número ya escrito. Sin esto,
   * escribir una cédula de 10 y luego cambiar a CE dejaba el número validado con
   * la regla anterior.
   */
  private revalidarNumeroAlCambiarTipo(form: FormGroup, campoTipo: string, campoNumero: string): void {
    form.get(campoTipo)?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const n = form.get(campoNumero);
        n?.updateValueAndValidity({ emitEvent: false });
        this.cdr.markForCheck();
      });
  }

  /**
   * Edad EXACTA en años cumplidos a la fecha de hoy. Comparar solo años
   * (`hoy.getFullYear() - nacimiento.getFullYear()`) da un año de más a quien
   * todavía no cumple, que es justo el borde que hay que cuidar acá.
   */
  private edadCumplida(nacimiento: Date, referencia: Date = new Date()): number {
    let edad = referencia.getFullYear() - nacimiento.getFullYear();
    const cumpleEsteAno =
      referencia.getMonth() > nacimiento.getMonth() ||
      (referencia.getMonth() === nacimiento.getMonth() && referencia.getDate() >= nacimiento.getDate());
    if (!cumpleEsteAno) edad -= 1;
    return edad;
  }

  /** Convierte a Date local a medianoche; null si no es una fecha usable. */
  private aFecha(v: any): Date | null {
    if (!v) return null;
    if (v instanceof Date) return isNaN(v.getTime()) ? null : new Date(v.getFullYear(), v.getMonth(), v.getDate());
    // Solo cadenas y números: un objeto suelto (`{}` de un borrador viejo)
    // no es una fecha, y dejarlo pasar como valor "no vacío" desactivaba en
    // silencio el candado de edad mínima.
    if (typeof v !== 'string' && typeof v !== 'number') return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v).trim());
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  /**
   * Un campo de fecha con contenido que no es una fecha. Sin esto, cualquier
   * cosa distinta de vacío pasaba `Validators.required` y los validadores de
   * fecha devolvían `null` (no había fecha que juzgar), así que el campo se
   * daba por bueno y al backend viajaba una fecha vacía.
   */
  private fechaIlegible(control: AbstractControl): ValidationErrors | null {
    const v = control.value;
    if (v === '' || v === null || v === undefined) return null;
    return this.aFecha(v) ? null : { invalidDate: true };
  }

  /** Fecha de hoy a medianoche local (para comparar sin arrastrar la hora). */
  private get hoyLocal(): Date {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }

  /** Máximo del datepicker de nacimiento: hoy menos `EDAD_MINIMA` años. */
  get maxFechaNacimiento(): Date {
    const h = this.hoyLocal;
    return new Date(h.getFullYear() - FormsTestContratation.EDAD_MINIMA, h.getMonth(), h.getDate());
  }

  /** Mínimo razonable del datepicker de nacimiento (evita años absurdos). */
  get minFechaNacimiento(): Date {
    const h = this.hoyLocal;
    return new Date(h.getFullYear() - FormsTestContratation.EDAD_MAXIMA, h.getMonth(), h.getDate());
  }

  /** Ninguna fecha del documento puede ser futura. */
  get hoy(): Date { return this.hoyLocal; }

  /** Edad mínima aceptada para postularse. */
  static readonly EDAD_MINIMA = 17;
  static readonly EDAD_MAXIMA = 90;
  /**
   * Edad a la que se expide la cédula de ciudadanía en Colombia. NO es lo mismo
   * que `EDAD_MINIMA` para postularse: antes se usaba la misma constante y una
   * CC "expedida a los 17" se daba por buena.
   */
  static readonly EDAD_EXPEDICION_CC = 18;

  /** Fecha de nacimiento: no futura y con al menos `EDAD_MINIMA` años cumplidos. */
  private edadMinimaValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const ilegible = this.fechaIlegible(control);
      if (ilegible) return ilegible;
      const nac = this.aFecha(control.value);
      if (!nac) return null;
      if (nac > this.hoyLocal) return { fechaFutura: true };

      const edad = this.edadCumplida(nac);
      if (edad < FormsTestContratation.EDAD_MINIMA) return { menorDeEdad: { edad } };
      if (edad > FormsTestContratation.EDAD_MAXIMA) return { edadNoPlausible: true };
      return null;
    };
  }

  /** Misma fecha, `n` años después (para el corte de edad mínima). */
  private sumarAnios(d: Date, n: number): Date {
    return new Date(d.getFullYear() + n, d.getMonth(), d.getDate());
  }

  /**
   * Problema de las dos fechas del documento, o null si están sanas.
   * Es la ÚNICA fuente de verdad del bloqueo por edad: la usan el aviso
   * inmediato, el candado de "Siguiente" y el de "Enviar formulario".
   */
  private problemaDeFechasIdentidad(): { clave: string; titulo: string; html: string } | null {
    const v = this.formHojaDeVida2.getRawValue();
    const nac = this.aFecha(v.fechaNacimiento);
    const exp = this.aFecha(v.fechaExpedicionCC);
    const min = FormsTestContratation.EDAD_MINIMA;

    // Sin fecha de nacimiento no hay nada que juzgar todavía.
    if (!nac) return null;

    if (nac > this.hoyLocal) {
      return {
        clave: 'nacimiento-futuro',
        titulo: 'Fecha de nacimiento inválida',
        html: 'La fecha de nacimiento no puede estar en el futuro.',
      };
    }

    const edad = this.edadCumplida(nac);
    if (edad < min) {
      return {
        clave: `menor-${edad}`,
        titulo: 'No cumple la edad mínima',
        html:
          `<p style="text-align:left;margin:0 0 10px;">Según la fecha de nacimiento registrada, ` +
          `la persona tiene <b>${edad} ${edad === 1 ? 'año' : 'años'}</b>.</p>` +
          `<p style="text-align:left;margin:0 0 10px;">Para postularse debe tener al menos ` +
          `<b>${min} años cumplidos</b>, así que <b>no es posible enviar el formulario</b>.</p>` +
          `<p style="text-align:left;margin:0;font-size:13px;color:#666;">Si la fecha está mal escrita, ` +
          `corríjala en el paso 1 (Identificación).</p>`,
      };
    }

    if (edad > FormsTestContratation.EDAD_MAXIMA) {
      return {
        clave: `edad-alta-${edad}`,
        titulo: 'Revise la fecha de nacimiento',
        html: `Según esa fecha la persona tendría <b>${edad} años</b>. Corrija la fecha en el paso 1.`,
      };
    }

    if (!exp) return null;

    if (exp < nac) {
      return {
        clave: 'expedicion-antes-de-nacer',
        titulo: 'Fechas incoherentes',
        html: 'La <b>fecha de expedición</b> del documento no puede ser anterior a la <b>fecha de nacimiento</b>.',
      };
    }

    // La cédula de ciudadanía se expide a los 18: si la expedición cae antes,
    // una de las dos fechas está mal (lo típico es el año de nacimiento).
    // Solo aplica a CC; la tarjeta de identidad sí se expide a menores.
    const expedicionCC = FormsTestContratation.EDAD_EXPEDICION_CC;
    const esCedula = String(v.tipoDoc ?? '').trim().toUpperCase() === 'CC';
    if (esCedula && exp < this.sumarAnios(nac, expedicionCC)) {
      const edadAlExpedir = this.edadCumplida(nac, exp);
      return {
        clave: `expedicion-prematura-${edadAlExpedir}`,
        titulo: 'Fechas incoherentes',
        html:
          `<p style="text-align:left;margin:0 0 10px;">Con esas fechas, la cédula se habría expedido ` +
          `cuando la persona tenía <b>${edadAlExpedir} ${edadAlExpedir === 1 ? 'año' : 'años'}</b>, ` +
          `y la cédula de ciudadanía no se expide antes de los <b>${expedicionCC}</b>.</p>` +
          `<p style="text-align:left;margin:0;">Revise la <b>fecha de nacimiento</b> y la ` +
          `<b>fecha de expedición</b> en el paso 1. Si todavía usa <b>tarjeta de identidad</b>, ` +
          `cámbielo en "Tipo de documento".</p>`,
      };
    }

    return null;
  }

  /** Aviso ya mostrado, para no repetir el mismo Swal mientras no cambie el dato. */
  private ultimoAvisoFechas = '';

  /**
   * Avisa apenas las fechas del documento quedan mal (no espera al "Enviar"):
   * el caso crítico es el menor de `EDAD_MINIMA`, que no puede continuar.
   */
  private vigilarFechasIdentidad(): void {
    const f = this.formHojaDeVida2;
    const nac = f.get('fechaNacimiento');
    const exp = f.get('fechaExpedicionCC');
    if (!nac || !exp) return;

    merge(nac.valueChanges, exp.valueChanges)
      .pipe(debounceTime(120), takeUntil(this.destroy$))
      .subscribe(() => this.avisarProblemaDeFechas());
  }

  /** Muestra el aviso una sola vez por problema; se rearma al corregir. */
  private avisarProblemaDeFechas(): void {
    const problema = this.problemaDeFechasIdentidad();
    const clave = problema?.clave ?? '';
    if (clave === this.ultimoAvisoFechas) return;
    this.ultimoAvisoFechas = clave;
    if (!problema) return;

    Swal.fire({
      icon: 'error',
      title: problema.titulo,
      html: problema.html,
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#111827',
      width: 520,
    });
  }

  /** Fecha de expedición: no puede estar en el futuro. */
  private noFuturaValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const ilegible = this.fechaIlegible(control);
      if (ilegible) return ilegible;
      const d = this.aFecha(control.value);
      if (!d) return null;
      return d > this.hoyLocal ? { fechaFutura: true } : null;
    };
  }

  // ----------------------------------------------------
  // 4. Pre-check Search Logic
  // ----------------------------------------------------
  async onSearch() {
    if (this.searchForm.invalid) {
      this.searchForm.markAllAsTouched();
      return;
    }

    const { tipo_doc, numero_documento } = this.searchForm.getRawValue();

    // Última barrera antes de abrir el formulario. El par (tipo, número) es la
    // llave con la que se consulta y se registra todo: si está mal, la persona
    // termina con un registro paralelo que nadie vuelve a encontrar. Se le
    // muestra tal cual quedó, en grande, para que lo lea de verdad.
    if (!(await this.confirmarDocumento(tipo_doc, numero_documento))) return;

    this.isSearching = true;
    try {
      this.startForm(tipo_doc, numero_documento);
      // El borrador local manda sobre la precarga del servidor: si hay uno de
      // esta misma cédula, ya no se consulta el backend (evita pisar lo tecleado
      // cuando el borrador trae la fecha de expedición).
      this.prefillEnCurso = false;
      this.prefillResuelto = this.restoreDraft(numero_documento);
    } finally {
      this.isSearching = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Confirmación del par (tipo, número) antes de abrir el formulario.
   *
   * Además de repetir el dato, avisa de los casos dudosos que el validador NO
   * bloquea (una CC corta o una CE larga son posibles pero raras): así se evita
   * frenar a quien sí tiene ese documento, sin dejar pasar el error en silencio.
   */
  private async confirmarDocumento(tipo: string, numero: string): Promise<boolean> {
    const t = String(tipo || '').toUpperCase().trim();
    const n = String(numero || '').trim();
    const regla = this.reglaDoc(t);
    const etiqueta = this.esc(this.nombreTipoDoc(t) || regla.nombre);

    // Avisos blandos: no impiden continuar, solo obligan a mirar.
    const avisos: string[] = [];
    if ((t === 'CC' || t === 'CTRA') && n.length <= 7) {
      avisos.push('Una cédula de 7 dígitos o menos suele ser de una persona mayor. Si usted es joven, revise que no le falten números.');
    }
    // La numeración de cédulas salta de 8 dígitos (las antiguas) a 10 (el NUIP,
    // que arranca en 1.000.000.000): nunca se asignaron cédulas de 9 dígitos.
    // Casi siempre es un NUIP al que se le cayó un número al teclear. No se
    // bloquea porque hay filas históricas así y no hay norma que lo prohíba.
    if ((t === 'CC' || t === 'CTRA') && n.length === 9) {
      avisos.push('No existen cédulas de <b>9 dígitos</b>: la numeración pasa de 8 a 10. Es muy probable que le falte un número.');
    }
    if (t !== 'CC' && t !== 'CTRA' && n.length === 10 && n.startsWith('1')) {
      avisos.push(`Ese número tiene forma de <b>cédula de ciudadanía</b>, pero eligió <b>${etiqueta}</b>. Verifique el tipo.`);
    }

    const res = await Swal.fire({
      icon: 'question',
      title: 'Confirme su documento',
      html: `
        <p style="text-align:left;margin:0 0 10px;">Con estos datos se <b>consultará y registrará</b> toda su información. Revíselos antes de continuar.</p>
        <div style="background:#f3f4f6;border-radius:10px;padding:14px;margin:12px 0;text-align:center;">
          <div style="font-size:13px;color:#6b7280;letter-spacing:.04em;text-transform:uppercase;">${etiqueta}</div>
          <div style="font-size:28px;font-weight:700;letter-spacing:.06em;color:#111827;margin-top:4px;">${this.esc(n)}</div>
        </div>
        ${avisos.map(a => `<p style="text-align:left;background:#fffbeb;border-left:3px solid #f59e0b;padding:8px 10px;margin:8px 0;font-size:13px;color:#92400e;">${a}</p>`).join('')}
        <p style="text-align:left;font-size:12px;color:#6b7280;margin:10px 0 0;">Si se equivoca, sus datos quedarán guardados bajo otro documento y no podrá ingresar después.</p>
      `,
      showCancelButton: true,
      confirmButtonText: 'Sí, es correcto',
      cancelButtonText: 'Corregir',
      reverseButtons: true,
      confirmButtonColor: '#111827',
      width: 520,
    });
    return !!res.isConfirmed;
  }

  /** Ayuda bajo el campo: qué se espera para el tipo que está elegido ahora. */
  hintDocumento(): string {
    const tipo = String(this.searchForm.get('tipo_doc')?.value || '').toUpperCase().trim();
    if (!tipo) return 'Elija primero el tipo de documento';
    const r = this.reglaDoc(tipo);
    const rango = r.min === r.max ? `${r.min} dígitos` : `entre ${r.min} y ${r.max} dígitos`;
    return `${this.nombreTipoDoc(tipo) || r.nombre}: ${rango} (ej: ${r.ejemplo})`;
  }

  /** Nombre visible del tipo de documento según el catálogo cargado. */
  private nombreTipoDoc(abbr: string): string {
    const hit = (this.tipoDocs || []).find(
      (d: any) => String(d?.abbreviation || '').toUpperCase().trim() === String(abbr || '').toUpperCase().trim()
    );
    return String(hit?.description || '').trim();
  }

  /**
   * Dispara la precarga (Modelo A) cuando la persona elige la fecha de
   * expedición dentro del formulario. Esa fecha es el segundo factor que exige
   * `prefill-by-document`, por eso la consulta no puede salir antes.
   *
   * Un solo intento por llenado: si el backend responde, `patchValue` vuelve a
   * emitir `fechaExpedicionCC` y sin el candado se reconsultaría en bucle.
   */
  private initPrefillPorFechaExpedicion(): void {
    const f = this.formHojaDeVida2;
    f.get('fechaExpedicionCC')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(async (valor) => {
        if (this.prefillEnCurso || this.prefillResuelto) return;

        // Una consulta por fecha distinta: si la persona se equivocó al digitar
        // la expedición puede corregirla y se vuelve a intentar. Antes se daba
        // por "resuelta" incluso con 404 y la precarga moría para toda la sesión.
        const ymd = this.toYmd(valor);
        if (!ymd || ymd === this.ultimaFechaPrefill) return;

        const tipo = f.get('tipoDoc')?.value;
        const numero = f.get('numeroCedula')?.value;
        if (!tipo || !numero) return;

        this.ultimaFechaPrefill = ymd;
        this.prefillEnCurso = true;
        this.cargandoPrefill = true;
        try {
          // Solo se marca como resuelta si de verdad trajo datos.
          this.prefillResuelto = await this.precargarDesdeCandidato(tipo, numero, valor);
        } finally {
          this.prefillEnCurso = false;
          this.cargandoPrefill = false;
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Precarga (Modelo A) el formulario con los datos ya registrados del candidato.
   * Espeja el mapeo de `rellenarForm` de TesoroApp pero hacia los controles del web.
   * Solo trae datos propios de baja sensibilidad (el backend excluye PII de terceros).
   * Si no hay match (404) o falla la red, el formulario queda en blanco.
   *
   * @returns true solo si llegó un registro y se rellenaron los campos.
   */
  private async precargarDesdeCandidato(tipoDoc: string, numero: string, fechaExpedicion: any): Promise<boolean> {
    const fechaYmd = this.toYmd(fechaExpedicion);
    if (!fechaYmd) return false;

    let cand: any = null;
    try {
      cand = await firstValueFrom(this.candidateS.getPrefillByDocumento(tipoDoc, numero, fechaYmd));
    } catch {
      cand = null; // 404 (sin datos / fecha no coincide) o error de red → form en blanco.
    }
    if (!cand) return false;

    const f = this.formHojaDeVida2;

    const toDate = (v: any): Date | null => {
      if (!v) return null;
      if (typeof v === 'string') {
        const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v.trim());
        if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])); // midnight local
      }
      const d = v instanceof Date ? v : new Date(v);
      return isNaN(d.getTime()) ? null : d;
    };
    const splitMulti = (s: any): string[] =>
      String(s ?? '').split(',').map((x) => x.trim()).filter(Boolean);
    const boolToSiNo = (v: any): string => (v === true ? 'SI' : v === false ? 'NO' : '');

    const info = cand.info_cc ?? {};
    const contacto = cand.contacto ?? {};
    const residencia = cand.residencia ?? {};
    const vivienda = cand.vivienda ?? {};
    const expResumen = cand.experiencia_resumen ?? {};
    const formacion0 = Array.isArray(cand.formaciones) && cand.formaciones.length ? cand.formaciones[0] : {};
    // RF-026: bloques adicionales que ahora devuelve el prefill.
    const dot = cand.dotacion ?? {};
    const emer = cand.emergencia ?? {};
    const cony = cand.conyuge ?? {};
    const padre = cand.padre ?? {};
    const madre = cand.madre ?? {};
    const evalc = cand.evaluacion ?? {};
    const entr = cand.entrevista ?? {};
    const exp0 = Array.isArray(cand.experiencias) && cand.experiencias.length ? cand.experiencias[0] : {};
    const rp = Array.isArray(cand.referencias_personales) ? cand.referencias_personales : [];
    const rf = Array.isArray(cand.referencias_familiares) ? cand.referencias_familiares : [];
    const rp0 = rp[0] ?? {}, rp1 = rp[1] ?? {};
    const rf0 = rf[0] ?? {}, rf1 = rf[1] ?? {};
    const esOtros = formacion0.nivel === 'OTROS';
    const hijosBk: any[] = Array.isArray(cand.hijos) ? cand.hijos : [];

    // Email → usuario + dominio (el observable de `correo` arma el correo completo).
    const email = String(contacto.email || '');
    const at = email.indexOf('@');
    const correoUsuario = at > 0 ? email.slice(0, at) : '';
    const correoDominio = at > 0 ? email.slice(at + 1) : '';

    // El orden de las claves importa: cada gatillo condicional (estadoCivil, viveConyuge,
    // elPadreVive/madreVive, escolaridad, experienciaLaboral, numHijosDependientes) va ANTES
    // que los campos que su toggle habilita, para que patchValue asigne el valor DESPUÉS de
    // que el toggle haya corrido (si no, el toggle los vaciaría).
    f.patchValue({
      pNombre: cand.primer_nombre || '',
      sNombre: cand.segundo_nombre || '',
      pApellido: cand.primer_apellido || '',
      sApellido: cand.segundo_apellido || '',
      genero: cand.sexo || '',
      fechaNacimiento: toDate(cand.fecha_nacimiento),
      fechaExpedicionCC: toDate(info.fecha_expedicion),

      correoUsuario,
      correoDominio,

      numCelular: contacto.celular || '',
      numWha: contacto.whatsapp || '',

      direccionResidencia: residencia.direccion || '',
      zonaResidencia: residencia.barrio || '',
      tiempoResidenciaZona: residencia.hace_cuanto_vive || '',
      lugarAnteriorResidencia: residencia.lugar_anterior || '',
      // RF-032: residencia anterior (DESPUÉS de tiempoResidenciaZona para que el toggle ya haya
      // habilitado los controles). Depto/municipio se rehidratan por setDeptCity más abajo.
      razonCambioResidencia: residencia.razon_mudanza || '',
      direccionResidenciaAnterior: residencia.residencia_anterior_direccion || '',
      barrioResidenciaAnterior: residencia.residencia_anterior_barrio || '',
      zonasConocidas: residencia.zonas_del_pais || '',

      // Datos propios que antes no se rehidrataban (RF-026/028)
      rh: cand.rh || '',
      lateralidad: cand.zurdo_diestro || '',
      tallaChaqueta: dot.chaqueta ?? '',
      tallaPantalon: dot.pantalon ?? '',
      tallaCamisa: dot.camisa ?? '',
      tallaCalzado: dot.calzado ?? '',

      // Contacto de emergencia (RF-033/035). Compat legacy (RF-029 caso 2): si no hay componentes
      // separados pero sí `nombre` completo, se muestra en "primer nombre" (editable) sin perderlo.
      // Depto/municipio se rehidratan por setDeptCity más abajo.
      emergenciaPrimerNombre: emer.primer_nombre || emer.nombre || '',
      emergenciaSegundoNombre: emer.segundo_nombre || '',
      emergenciaPrimerApellido: emer.primer_apellido || '',
      emergenciaSegundoApellido: emer.segundo_apellido || '',
      familiarEmergencia: emer.nombre || '',
      parentescoFamiliarEmergencia: emer.parentesco || '',
      telefonoFamiliarEmergencia: emer.telefono || '',
      ocupacionFamiliarEmergencia: emer.ocupacion || '',
      direccionFamiliarEmergencia: emer.direccion || '',
      barrioFamiliarEmergencia: emer.barrio || '',

      // Cónyuge (estadoCivil primero → viveConyuge → detalles)
      estadoCivil: cand.estado_civil || '',
      viveConyuge: cony.vive_con || '',
      nombresConyuge: cony.nombre || '',
      apellidosConyuge: cony.apellido || '',
      documentoIdentidadConyuge: cony.numero_de_documento || '',
      ocupacionConyuge: cony.ocupacion || '',
      telefonoConyuge: cony.telefono || '',
      direccionConyuge: cony.direccion || '',
      barrioMunicipioConyugue: cony.barrio || '',

      // Padre (elPadreVive primero → detalles) — RF-040: nombre en componentes.
      elPadreVive: padre.vive_con || '',
      nombrePadre: padre.nombre || '',
      padrePrimerNombre: padre.primer_nombre || '',
      padreSegundoNombre: padre.segundo_nombre || '',
      padrePrimerApellido: padre.primer_apellido || '',
      padreSegundoApellido: padre.segundo_apellido || '',
      ocupacionPadre: padre.ocupacion || '',
      direccionPadre: padre.direccion || '',
      telefonoPadre: padre.telefono || '',
      barrioPadre: padre.barrio || '',

      // Madre — RF-040: nombre en componentes.
      madreVive: madre.vive_con || '',
      nombreMadre: madre.nombre || '',
      madrePrimerNombre: madre.primer_nombre || '',
      madreSegundoNombre: madre.segundo_nombre || '',
      madrePrimerApellido: madre.primer_apellido || '',
      madreSegundoApellido: madre.segundo_apellido || '',
      ocupacionMadre: madre.ocupacion || '',
      direccionMadre: madre.direccion || '',
      telefonoMadre: madre.telefono || '',
      barrioMadre: madre.barrio || '',

      // Referencias personales — RF-040: nombre en componentes.
      nombreReferenciaPersonal1: rp0.nombre || '',
      refPersonal1PrimerNombre: rp0.primer_nombre || '',
      refPersonal1SegundoNombre: rp0.segundo_nombre || '',
      refPersonal1PrimerApellido: rp0.primer_apellido || '',
      refPersonal1SegundoApellido: rp0.segundo_apellido || '',
      telefonoReferencia1: rp0.telefono || '',
      ocupacionReferencia1: rp0.ocupacion || '',
      direccionReferenciaPersonal1: rp0.direccion || '',
      tiempoConoceReferenciaPersonal1: rp0.tiempo_conoce || '',
      parentescoReferenciaPersonal1: rp0.parentesco || '',
      nombreReferenciaPersonal2: rp1.nombre || '',
      refPersonal2PrimerNombre: rp1.primer_nombre || '',
      refPersonal2SegundoNombre: rp1.segundo_nombre || '',
      refPersonal2PrimerApellido: rp1.primer_apellido || '',
      refPersonal2SegundoApellido: rp1.segundo_apellido || '',
      telefonoReferencia2: rp1.telefono || '',
      ocupacionReferencia2: rp1.ocupacion || '',
      direccionReferenciaPersonal2: rp1.direccion || '',
      tiempoConoceReferenciaPersonal2: rp1.tiempo_conoce || '',
      parentescoReferenciaPersonal2: rp1.parentesco || '',
      // Referencias familiares — RF-040: nombre en componentes.
      nombreReferenciaFamiliar1: rf0.nombre || '',
      refFamiliar1PrimerNombre: rf0.primer_nombre || '',
      refFamiliar1SegundoNombre: rf0.segundo_nombre || '',
      refFamiliar1PrimerApellido: rf0.primer_apellido || '',
      refFamiliar1SegundoApellido: rf0.segundo_apellido || '',
      telefonoReferenciaFamiliar1: rf0.telefono || '',
      ocupacionReferenciaFamiliar1: rf0.ocupacion || '',
      direccionReferenciaFamiliar1: rf0.direccion || '',
      parentescoReferenciaFamiliar1: rf0.parentesco || '',
      nombreReferenciaFamiliar2: rf1.nombre || '',
      refFamiliar2PrimerNombre: rf1.primer_nombre || '',
      refFamiliar2SegundoNombre: rf1.segundo_nombre || '',
      refFamiliar2PrimerApellido: rf1.primer_apellido || '',
      refFamiliar2SegundoApellido: rf1.segundo_apellido || '',
      telefonoReferenciaFamiliar2: rf1.telefono || '',
      ocupacionReferenciaFamiliar2: rf1.ocupacion || '',
      direccionReferenciaFamiliar2: rf1.direccion || '',
      parentescoReferenciaFamiliar2: rf1.parentesco || '',

      // Escolaridad (grado primero → detalle de colegio / educación superior)
      escolaridad: formacion0.nivel || '',
      nivelEducacionSuperior: esOtros ? (formacion0.estudios_extra || '') : '',
      carreraEstudio: esOtros ? (formacion0.titulo_obtenido || '') : '',
      nombreInstitucion: esOtros ? '' : (formacion0.institucion || ''),
      anoFinalizacion: esOtros || !formacion0.anio_finalizacion ? '' : toDate(`${formacion0.anio_finalizacion}-01-01`),
      tituloObtenido: esOtros ? '' : (formacion0.titulo_obtenido || ''),
      estudiosExtrasSelect: esOtros ? [] : splitMulti(formacion0.estudios_extra),
      estudiaActualmente: boolToSiNo(vivienda.estudia_actualmente),

      // Experiencia laboral (gatillo primero → detalle)
      // RF-036/043/044: territorio empresa (depto/mpio vía setDeptCity abajo) + jefe separado.
      experienciaLaboral: boolToSiNo(expResumen.tiene_experiencia),
      nombreEmpresa1: exp0.empresa || '',
      telefonosEmpresa1: exp0.telefonos || '',
      barrioEmpresa1: exp0.barrio || '',
      direccionEmpresa1: exp0.direccion || '',
      nombreJefe1: exp0.nombre_jefe || '',
      jefePrimerNombre1: exp0.jefe_primer_nombre || '',
      jefePrimerApellido1: exp0.jefe_primer_apellido || '',
      cargoJefe1: exp0.cargo_jefe || '',
      telefonoJefe1: exp0.telefono_jefe || '',
      cargoEmpresa1: exp0.cargo || '',
      fechaRetiro1: toDate(exp0.fecha_retiro),
      motivoRetiro1: exp0.motivo_retiro || '',
      tiempoExperiencia: expResumen.tiempo_experiencia_texto || exp0.tiempo_trabajado || '',
      empresas_laborado: expResumen.empresas_laborado || '',
      areaExperiencia: splitMulti(expResumen.area_experiencia),

      // Evaluación
      relacionFamiliar: evalc.relacion_familiar || '',
      desempenoLaboral: evalc.rendimiento_laboral || '',
      felicitaciones: evalc.porque_lo_felicitarian || '',
      situacionConflictiva: evalc.malentendido || '',
      actividadesDiferentes: evalc.actividades_diarias || '',
      personas_a_cargo: splitMulti(evalc.personas_a_cargo),

      // Vivienda / entrevista
      familiaSolo: boolToSiNo(vivienda.familia_un_solo_ingreso),
      caracteristicasVivienda: vivienda.caracteristicas_vivienda || '',
      numeroHabitaciones: vivienda.num_habitaciones ?? '',
      personasPorHabitacion: vivienda.personas_por_habitacion ?? '',
      cuidadorHijos: vivienda.responsable_hijos || '',
      fuenteVacante: entr.como_se_entero || '',
      numHijosDependientes: hijosBk.length || (vivienda.num_hijos_dependen_economicamente ?? 0),

      conQuienViveChecks: splitMulti(vivienda.personas_con_quien_convive),
      expectativasVidaChecks: splitMulti(vivienda.expectativas_de_vida),
      tiposViviendaChecks: splitMulti(vivienda.tipo_vivienda),
      comodidadesChecks: splitMulti(vivienda.servicios),
    });

    // Hijos: numHijosDependientes ya reconstruyó el FormArray; se pueblan las filas.
    const arrHijos: any = f.get('hijos');
    hijosBk.forEach((h, i) => {
      const g = arrHijos?.at?.(i);
      if (g) g.patchValue({
        // RF-045: reponer partes estructuradas; el nombre legacy queda de respaldo.
        hijoPrimerNombre: h.primer_nombre || '',
        hijoSegundoNombre: h.segundo_nombre || '',
        hijoPrimerApellido: h.primer_apellido || '',
        hijoSegundoApellido: h.segundo_apellido || '',
        nombreHijo: h.nombre || '',
        sexoHijo: h.sexo || '',
        fechaNacimientoHijo: toDate(h.fecha_nac),
        // RF-046: tipo de documento del dependiente.
        tipoDocHijo: h.tipo_documento || '',
        docIdentidadHijo: h.numero_de_documento || '',
        ocupacionHijo: h.ocupacion || '',
        cursoHijo: h.curso || '',
      });
    });

    // Cascadas departamento → municipio: set del depto dispara el listener que
    // puebla la lista y habilita el municipio; luego se setea el municipio.
    this.setDeptCity('departamentoExpedicionCC', 'municipioExpedicionCC', info.depto_expedicion, info.mpio_expedicion);
    this.setDeptCity('departamentoNacimiento', 'municipioNacimiento', info.depto_nacimiento, info.mpio_nacimiento);
    this.setDeptCity('departamento', 'ciudad', cand.departamento, cand.municipio);
    // RF-032/035: cascadas nuevas. Residencia anterior solo tiene valor si NO era "TODO LA VIDA"
    // (si vacío, canonDepto lo ignora). El contacto de emergencia siempre puede hidratarse.
    this.setDeptCity('departamentoResidenciaAnterior', 'municipioResidenciaAnterior', residencia.residencia_anterior_departamento, residencia.residencia_anterior_municipio);
    this.setDeptCity('departamentoEmergencia', 'municipioEmergencia', emer.departamento, emer.municipio);
    // RF-036/044: territorio de la empresa anterior.
    this.setDeptCity('departamentoEmpresa1', 'municipioEmpresa1', exp0.departamento, exp0.municipio);
    // RF-036 (familia): territorio de cónyuge, padre, madre y las 4 referencias.
    this.setDeptCity('departamentoConyuge', 'municipioConyuge', cony.departamento, cony.municipio);
    this.setDeptCity('departamentoPadre', 'municipioPadre', padre.departamento, padre.municipio);
    this.setDeptCity('departamentoMadre', 'municipioMadre', madre.departamento, madre.municipio);
    this.setDeptCity('departamentoRefPersonal1', 'municipioRefPersonal1', rp0.departamento, rp0.municipio);
    this.setDeptCity('departamentoRefPersonal2', 'municipioRefPersonal2', rp1.departamento, rp1.municipio);
    this.setDeptCity('departamentoRefFamiliar1', 'municipioRefFamiliar1', rf0.departamento, rf0.municipio);
    this.setDeptCity('departamentoRefFamiliar2', 'municipioRefFamiliar2', rf1.departamento, rf1.municipio);

    f.updateValueAndValidity();
    this.cdr.markForCheck();

    Swal.fire({
      icon: 'success',
      title: 'Datos precargados',
      text: 'Encontramos su registro y llenamos los campos que ya teníamos. Revíselos y corrija lo que haga falta.',
      timer: 3500,
      showConfirmButton: false,
    });

    // RF-026/032: reanudar desde el último paso guardado (no siempre en el paso 1). Solo si
    // el preregistro está incompleto; un formulario ya FINALIZADO se deja en el paso 0.
    const destino = Math.min(Number(cand.formulario_paso) || 0, 4);
    const completo = Number(cand.formulario_completo) === 1;
    if (destino > 0 && !completo && this.stepper) {
      const wasLinear = this.stepper.linear;
      this.stepper.linear = false;
      this.stepper.selectedIndex = destino;
      Promise.resolve().then(() => { if (this.stepper) this.stepper.linear = wasLinear; });
    }
    return true;
  }

  /**
   * Setea depto (dispara la cascada) y luego el municipio dependiente.
   *
   * Los nombres se llevan a la grafía de `colombia.json`: el backend los guarda
   * en MAYÚSCULAS y el desplegable trabaja con "Cundinamarca", así que sin esto
   * la lista de municipios quedaba vacía y la persona no podía elegir ciudad.
   */
  private setDeptCity(deptKey: string, cityKey: string, dept: any, city: any): void {
    const f = this.formHojaDeVida2;
    const d = this.canonDepto(dept);
    if (!d) return;
    f.get(deptKey)?.setValue(d); // dispara setupLocationListener (puebla lista + habilita municipio)
    const c = this.canonCiudad(d, city);
    if (c) f.get(cityKey)?.setValue(c);
  }

  // ----------------------------------------------------
  // 5. Background Save (Step 1)
  // ----------------------------------------------------
  // ----------------------------------------------------
  // Helper: Step Mapping
  // ----------------------------------------------------
  /**
   * El formulario tal como se ve: paso → sección (el `<h4>` del HTML) →
   * controles, **en el mismo orden en que aparecen en pantalla**.
   *
   * Es la fuente de verdad del candado por paso y del aviso de "faltan datos".
   * El orden importa: el mensaje nombra el primer pendiente de la lista y el
   * scroll salta al primer campo en rojo del DOM. Cuando el arreglo no seguía
   * el orden visual (expedición antes que nacimiento, por ejemplo) el aviso
   * nombraba un campo y la pantalla se movía a otro.
   *
   * Se listan también los opcionales y los deshabilitados: `invalid` es false
   * para ellos, así que nunca bloquean. Los condicionales (cónyuge, padres,
   * experiencia, hijos, formación) tampoco, porque `initObservables()` les
   * quita los validadores cuando la condición no aplica.
   */
  readonly MAPA_PASOS: ReadonlyArray<{
    titulo: string;
    secciones: ReadonlyArray<{ titulo: string; controles: readonly string[] }>;
  }> = [
      {
        titulo: 'Pre-registro',
        secciones: [
          { titulo: 'Origen de la postulación', controles: ['fuenteVacante'] },
          {
            titulo: 'Identificación',
            controles: [
              'oficina', 'tipoDoc', 'numeroCedula',
              'fechaNacimiento', 'departamentoNacimiento', 'municipioNacimiento',
              'fechaExpedicionCC', 'departamentoExpedicionCC', 'municipioExpedicionCC',
            ],
          },
          {
            titulo: 'Datos Personales',
            controles: ['pApellido', 'sApellido', 'pNombre', 'sNombre', 'genero', 'estadoCivil'],
          },
          {
            titulo: 'Contacto y Domicilio',
            controles: [
              'zonaResidencia', 'departamento', 'ciudad', 'direccionResidencia',
              'numCelular', 'numWha', 'conQuienViveChecks', 'tiempoResidenciaZona',
              'departamentoResidenciaAnterior', 'municipioResidenciaAnterior',
              'barrioResidenciaAnterior', 'direccionResidenciaAnterior', 'razonCambioResidencia',
            ],
          },
          { titulo: 'Correo Electrónico', controles: ['correoUsuario', 'correoDominio', 'correo'] },
          { titulo: 'Información de Perfil', controles: ['escolaridad', 'nivelEducacionSuperior', 'carreraEstudio', 'expectativasVidaChecks'] },
        ],
      },
      {
        titulo: 'Detalles',
        secciones: [
          { titulo: 'Información Adicional', controles: ['rh', 'lateralidad'] },
          {
            titulo: 'Talla de dotación',
            controles: ['tallaCamisa', 'tallaPantalon', 'tallaChaqueta', 'tallaCalzado'],
          },
          {
            titulo: 'Residencia (Detalles)',
            controles: ['zonasConocidas'],
          },
          {
            titulo: 'Contacto de Emergencia',
            controles: [
              'emergenciaPrimerNombre', 'emergenciaSegundoNombre', 'emergenciaPrimerApellido',
              'emergenciaSegundoApellido', 'parentescoFamiliarEmergencia', 'telefonoFamiliarEmergencia',
              'ocupacionFamiliarEmergencia', 'departamentoEmergencia', 'municipioEmergencia',
              'barrioFamiliarEmergencia', 'direccionFamiliarEmergencia',
            ],
          },
          {
            titulo: 'Formación Académica (Detalles)',
            controles: [
              'nombreInstitucion', 'anoFinalizacion', 'tituloObtenido',
              'estudiosExtrasSelect', 'estudiaActualmente',
            ],
          },
        ],
      },
      {
        titulo: 'Familia y Referencias',
        secciones: [
          {
            titulo: 'Cónyuge',
            controles: [
              'nombresConyuge', 'apellidosConyuge', 'viveConyuge', 'documentoIdentidadConyuge',
              'ocupacionConyuge', 'telefonoConyuge',
              // RF-036 (familia): territorio antes de la dirección.
              'departamentoConyuge', 'municipioConyuge', 'direccionConyuge', 'barrioMunicipioConyugue',
            ],
          },
          {
            titulo: 'Padres',
            controles: [
              // RF-040: nombre en componentes (opcionales).
              'padrePrimerNombre', 'padreSegundoNombre', 'padrePrimerApellido', 'padreSegundoApellido',
              'elPadreVive', 'ocupacionPadre', 'departamentoPadre', 'municipioPadre', 'direccionPadre', 'barrioPadre', 'telefonoPadre',
              'madrePrimerNombre', 'madreSegundoNombre', 'madrePrimerApellido', 'madreSegundoApellido',
              'madreVive', 'ocupacionMadre', 'departamentoMadre', 'municipioMadre', 'direccionMadre', 'barrioMadre', 'telefonoMadre',
            ],
          },
          {
            titulo: 'Referencia Personal 1',
            controles: [
              // RF-040: primer nombre/apellido obligatorios.
              'refPersonal1PrimerNombre', 'refPersonal1SegundoNombre', 'refPersonal1PrimerApellido', 'refPersonal1SegundoApellido',
              'telefonoReferencia1', 'ocupacionReferencia1',
              'departamentoRefPersonal1', 'municipioRefPersonal1',
              'direccionReferenciaPersonal1', 'tiempoConoceReferenciaPersonal1',
              'parentescoReferenciaPersonal1',
            ],
          },
          {
            titulo: 'Referencia Personal 2',
            controles: [
              'refPersonal2PrimerNombre', 'refPersonal2SegundoNombre', 'refPersonal2PrimerApellido', 'refPersonal2SegundoApellido',
              'telefonoReferencia2', 'ocupacionReferencia2',
              'departamentoRefPersonal2', 'municipioRefPersonal2',
              'direccionReferenciaPersonal2', 'tiempoConoceReferenciaPersonal2',
              'parentescoReferenciaPersonal2',
            ],
          },
          {
            titulo: 'Referencia Familiar 1',
            controles: [
              'refFamiliar1PrimerNombre', 'refFamiliar1SegundoNombre', 'refFamiliar1PrimerApellido', 'refFamiliar1SegundoApellido',
              'telefonoReferenciaFamiliar1', 'ocupacionReferenciaFamiliar1',
              'departamentoRefFamiliar1', 'municipioRefFamiliar1',
              'direccionReferenciaFamiliar1', 'parentescoReferenciaFamiliar1',
            ],
          },
          {
            titulo: 'Referencia Familiar 2',
            controles: [
              'refFamiliar2PrimerNombre', 'refFamiliar2SegundoNombre', 'refFamiliar2PrimerApellido', 'refFamiliar2SegundoApellido',
              'telefonoReferenciaFamiliar2', 'ocupacionReferenciaFamiliar2',
              'departamentoRefFamiliar2', 'municipioRefFamiliar2',
              'direccionReferenciaFamiliar2', 'parentescoReferenciaFamiliar2',
            ],
          },
        ],
      },
      {
        titulo: 'Experiencia, Hijos y Vivienda',
        secciones: [
          {
            titulo: 'Experiencia Laboral',
            controles: [
              // RF-036/043/044: empresa (territorio+tel) / cargo candidato / jefe (nombre+cargo+tel) separados.
              'experienciaLaboral', 'nombreEmpresa1', 'departamentoEmpresa1', 'municipioEmpresa1',
              'barrioEmpresa1', 'direccionEmpresa1', 'telefonosEmpresa1',
              'cargoEmpresa1', 'areaExperiencia', 'fechaRetiro1', 'tiempoExperiencia', 'motivoRetiro1', 'empresas_laborado',
              'jefePrimerNombre1', 'jefePrimerApellido1', 'cargoJefe1', 'telefonoJefe1',
            ],
          },
          { titulo: 'Hijos', controles: ['numHijosDependientes', 'cuidadorHijos', 'hijos'] },
          {
            // `conQuienViveChecks` también se edita acá, pero se reporta en el
            // paso 1 (su otra ubicación) para no listarlo dos veces.
            titulo: 'Vivienda y Economía',
            controles: [
              'familiaSolo', 'personas_a_cargo', 'tiposViviendaChecks',
              'numeroHabitaciones', 'personasPorHabitacion', 'caracteristicasVivienda',
              'comodidadesChecks',
            ],
          },
          {
            titulo: 'Evaluación (Opcional)',
            controles: [
              'relacionFamiliar', 'desempenoLaboral', 'felicitaciones',
              'situacionConflictiva', 'actividadesDiferentes',
            ],
          },
        ],
      },
      {
        titulo: 'Datos Finales y Adjuntos',
        secciones: [
          { titulo: 'Información Adicional', controles: ['hojaDeVida'] },
        ],
      },
    ];

  /** Controles de cada paso, aplanados desde `MAPA_PASOS` (mismo orden visual). */
  readonly STEP_KEYS: readonly string[][] =
    this.MAPA_PASOS.map(p => p.secciones.flatMap(s => [...s.controles]));

  readonly STEP1_KEYS: readonly string[] = this.STEP_KEYS[0];

  /*
   * Returns the step index (0-based) where the control resides.
   * Based on structure in HTML.
   * Step 0: Pre-registro (STEP1_KEYS)
   * Step 1: Detalles (rh, lateralidad, tallas, educación, contacto emergencia, etc.)
   * Step 2: Familia (conyuge, padres, referencias)
   * Step 3: Experiencia (experiencia, hijos, vivienda)
   * Step 4: Final (docs)
   */
  private getStepIndex(ctrl: string): number {
    const enMapa = this.STEP_KEYS.findIndex(keys => keys.includes(ctrl));
    if (enMapa >= 0) return enMapa;

    // Step 2: Familia & Referencias
    if (ctrl.includes('Conyuge') || ctrl.includes('Padre') || ctrl.includes('Madre') || ctrl.includes('Referencia')) return 2;

    // Step 3: Experiencia, Hijos, Vivienda
    if (ctrl.includes('Empresa') || ctrl.includes('Jefe') || ctrl.includes('Retiro') ||
      ctrl.includes('experiencia') || ctrl.includes('Hijos') || ctrl.includes('hijos') ||
      ctrl.includes('Vivienda') || ctrl.includes('Habitaciones') || ctrl.includes('Personas') ||
      ctrl.includes('comodidades') || ctrl.includes('expectativas') || ctrl.includes('fuente') ||
      ctrl.includes('cuidador') || ctrl.includes('laborado')) return 3;

    // Step 4: Final
    if (ctrl.includes('Vehiculo') || ctrl.includes('Licencia') ||
      ctrl.includes('estaTrabajando') || ctrl.includes('Actual') || ctrl.includes('Trabajo') ||
      ctrl.includes('Contrato') || ctrl.includes('Antes') || ctrl.includes('Hermanos') || ctrl.includes('hermanos') ||
      ctrl.includes('hojaDeVida')) return 4;

    // Default to Step 1 (Detalles) for everything else (rh, lateralidad, tallas, educacion, etc.)
    return 1;
  }

  /** Título de la sección (`<h4>`) donde vive el control; '' si no está mapeado. */
  private seccionDelControl(ctrl: string): string {
    for (const paso of this.MAPA_PASOS) {
      for (const sec of paso.secciones) {
        if (sec.controles.includes(ctrl)) return sec.titulo;
      }
    }
    return '';
  }

  // ----------------------------------------------------
  // Candado por paso: no se avanza con obligatorios pendientes
  // ----------------------------------------------------

  /**
   * Primer control del paso que no cumple; '' si el paso está completo.
   *
   * Tiene que ser puro (sin marcar tocados, sin avisos, sin cdr): alimenta el
   * binding `[completed]` de cada `mat-step` y se evalúa en cada ciclo de
   * detección de cambios.
   */
  private primerInvalidoDelPaso(step: number): string {
    for (const k of this.STEP_KEYS[step] ?? []) {
      const c = this.formHojaDeVida2.get(k);
      // `invalid` ya es false para los deshabilitados y para los que no tienen
      // validadores activos, así que los opcionales nunca bloquean.
      if (c?.invalid) return k;
    }
    return '';
  }

  /**
   * ¿El paso tiene resuelto todo lo obligatorio? Alimenta `[completed]` de cada
   * `mat-step`: con el stepper en modo lineal, esto es lo que impide saltar de
   * paso desde el encabezado.
   */
  esPasoCompleto(step: number): boolean {
    // Errores de grupo de las fechas del documento: se corrigen en el paso 1.
    if (step === 0 && (
      this.formHojaDeVida2.errors?.['expeditionBeforeBirth'] ||
      this.formHojaDeVida2.errors?.['expedicionAntesDeEdadMinima']
    )) return false;
    return !this.primerInvalidoDelPaso(step);
  }

  /**
   * "Siguiente" del paso `step` (0-based). No avanza si queda algo obligatorio
   * pendiente: marca los campos en rojo, avisa cuál falta y se queda ahí.
   *
   * Revisa desde el paso 1 y no solo el actual porque un paso ya superado puede
   * quedar incompleto después (p. ej. "¿Con quién vive?" también se edita en el
   * paso 4). En modo lineal `next()` no haría nada en ese caso y el botón
   * parecería roto; así se salta al paso que falta y se explica por qué.
   */
  siguientePaso(step: number): void {
    if (this.guardandoPaso) return;              // RF-024: evita doble solicitud
    if (!this.revisarPasosHasta(step)) return;   // RF-016/027: valida el paso actual
    // RF-025/023: persistir el paso en BD y avanzar SOLO si el guardado fue exitoso.
    this.guardandoPaso = true;
    const payload: any = this.buildPayload(this.formHojaDeVida2.getRawValue());
    payload.formulario_paso = step + 1;          // último paso alcanzado (0-based → siguiente)
    this.registroProcesoContratacion.crearActualizarCandidato2(payload).subscribe({
      next: (resp: any) => {
        this.guardandoPaso = false;
        this.mostrarGuardadoOk(resp?.offline === true);
        this.stepper.next();
      },
      error: (err: any) => {
        this.guardandoPaso = false;
        this.handleBackendError(err);            // RF-023/025: permanece en el paso, no avanza
      },
    });
  }

  /** RF-033: feedback discreto de guardado (toast, no interrumpe el flujo). */
  private mostrarGuardadoOk(offline: boolean): void {
    if (!this.isBrowser) return;
    Swal.fire({
      toast: true, position: 'top-end', icon: offline ? 'info' : 'success',
      title: offline ? 'Guardado sin conexión (se sincronizará)' : 'Información guardada',
      showConfirmButton: false, timer: 1600, timerProgressBar: true,
    });
  }

  /** "Anterior": volver nunca se bloquea, aunque un paso previo quedara incompleto. */
  pasoAnterior(): void {
    const s = this.stepper;
    if (!s || s.selectedIndex <= 0) return;
    // El modo lineal también frena hacia atrás cuando un paso anterior está
    // incompleto; se libera solo para este salto para no dejar al usuario preso.
    const linear = s.linear;
    s.linear = false;
    s.selectedIndex = s.selectedIndex - 1;
    s.linear = linear;
  }

  /**
   * Revisa los pasos 0..`hasta`. En el primero incompleto: salta a él, marca sus
   * campos y avisa qué falta. Devuelve true solo si todos están completos.
   */
  /**
   * Resumen TOTAL para el envío final: junta los pendientes de TODOS los pasos
   * en un solo aviso (el flujo de "Siguiente" usa `revisarPasosHasta`, que va
   * paso a paso). Marca todo como tocado, lleva al primer paso con faltantes y
   * devuelve true si bloqueó el envío.
   */
  private avisarPendientesTotales(): boolean {
    const bloques: string[] = [];
    let total = 0;
    let primerPaso = -1;

    for (let i = 0; i < this.STEP_KEYS.length; i++) {
      this.marcarPasoComoTocado(i);
      const pendientes = this.pendientesDelPaso(i);
      if (!pendientes.length) continue;
      if (primerPaso < 0) primerPaso = i;
      total += pendientes.reduce((n, s) => n + s.campos.length, 0);
      const secciones = pendientes.map(s =>
        `<div style="margin:4px 0 6px;"><b>${this.esc(s.seccion)}</b>` +
        `<ul style="margin:2px 0 0 18px;padding:0;">` +
        s.campos.map(c => `<li>${this.esc(c.campo)}: ${this.esc(c.motivo.toLowerCase())}</li>`).join('') +
        `</ul></div>`
      ).join('');
      bloques.push(`<div style="margin-bottom:10px;"><div style="font-weight:700;">Paso ${i + 1}</div>${secciones}</div>`);
    }

    if (primerPaso < 0) return false;

    Swal.fire({
      icon: 'warning',
      title: `Falta${total === 1 ? '' : 'n'} ${total} campo${total === 1 ? '' : 's'} por completar`,
      html: `<div style="text-align:left;max-height:300px;overflow:auto;">${bloques.join('')}</div>
             <p style="text-align:left;font-size:12px;color:#6b7280;margin:10px 0 0;">
               Lo llevamos al primer paso con pendientes; los campos quedaron marcados en rojo.</p>`,
      confirmButtonText: 'Completar ahora',
      confirmButtonColor: '#111827',
      width: 560,
    }).then(() => this.enfocarPrimerCampoConError());

    if (this.stepper && this.stepper.selectedIndex !== primerPaso) this.stepper.selectedIndex = primerPaso;
    return true;
  }

  private revisarPasosHasta(hasta: number): boolean {
    // Candado duro de las fechas del documento (edad mínima y coherencia
    // nacimiento/expedición). Va antes del recorrido por pasos para que el
    // motivo sea explícito y no quede escondido entre la lista de pendientes.
    if (this.bloqueadoPorFechasIdentidad()) return false;

    for (let i = 0; i <= hasta; i++) {
      this.marcarPasoComoTocado(i);
      if (this.esPasoCompleto(i)) continue;
      if (this.stepper && this.stepper.selectedIndex !== i) this.stepper.selectedIndex = i;
      this.avisarPasoIncompleto(i);
      return false;
    }
    return true;
  }

  /**
   * ¿Hay que frenar por las fechas del documento? Si sí, lleva al paso 1, pinta
   * los campos y explica el motivo. Es el candado de "Siguiente" y de "Enviar
   * formulario": un menor de `EDAD_MINIMA` no puede terminar el registro.
   */
  private bloqueadoPorFechasIdentidad(): boolean {
    const problema = this.problemaDeFechasIdentidad();
    if (!problema) return false;

    this.marcarPasoComoTocado(0);
    if (this.stepper && this.stepper.selectedIndex !== 0) this.stepper.selectedIndex = 0;
    this.ultimoAvisoFechas = problema.clave; // el aviso se está dando acá

    Swal.fire({
      icon: 'error',
      title: problema.titulo,
      html: problema.html,
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#111827',
      width: 520,
    }).then(() => this.enfocarPrimerCampoConError());
    return true;
  }

  /** Marca los campos del paso como tocados para que se pinte lo que falta. */
  private marcarPasoComoTocado(step: number): void {
    for (const k of this.STEP_KEYS[step] ?? []) {
      this.formHojaDeVida2.get(k)?.markAllAsTouched();
    }
    this.espejarErroresAutocompletado();
    this.cdr.markForCheck();
  }

  /**
   * Pendientes del paso agrupados por la sección (el `<h4>`) donde están, en el
   * mismo orden en que se ven. Cada entrada trae el motivo concreto del error.
   */
  private pendientesDelPaso(step: number): Array<{ seccion: string; campos: Array<{ campo: string; motivo: string }> }> {
    const out: Array<{ seccion: string; campos: Array<{ campo: string; motivo: string }> }> = [];

    for (const sec of this.MAPA_PASOS[step]?.secciones ?? []) {
      const campos: Array<{ campo: string; motivo: string }> = [];

      for (const k of sec.controles) {
        const c = this.formHojaDeVida2.get(k);
        if (!c?.invalid) continue;

        // El FormArray de hijos no tiene un campo propio al que apuntar: se
        // desglosa por hijo para no decir solo "Datos de los Hijos".
        if (k === 'hijos') {
          campos.push(...this.pendientesDeHijos());
          continue;
        }
        campos.push({
          campo: this.fieldHumanName(k),
          motivo: this.getErrorMessage(k) || 'Está vacío o tiene un formato incorrecto',
        });
      }

      if (campos.length) out.push({ seccion: sec.titulo, campos });
    }
    return out;
  }

  /** Pendientes dentro del FormArray de hijos, uno por hijo y subcampo. */
  private pendientesDeHijos(): Array<{ campo: string; motivo: string }> {
    const etiquetas: { [k: string]: string } = {
      nombreHijo: 'Nombre', sexoHijo: 'Sexo', fechaNacimientoHijo: 'Fecha de nacimiento',
      docIdentidadHijo: 'Documento', ocupacionHijo: 'Ocupación', cursoHijo: 'Curso',
    };
    const out: Array<{ campo: string; motivo: string }> = [];
    this.hijosFormArray?.controls.forEach((grupo, i) => {
      const g = grupo as FormGroup;
      for (const k of Object.keys(g.controls)) {
        if (!g.get(k)?.invalid) continue;
        out.push({
          campo: `Hijo ${i + 1} — ${etiquetas[k] || k}`,
          motivo: this.getErrorMessage(k, g) || 'Está vacío o tiene un formato incorrecto',
        });
      }
    });
    return out;
  }

  /** Aviso concreto: qué falta en el paso, agrupado por sección. */
  private avisarPasoIncompleto(step: number): void {
    const pendientes = this.pendientesDelPaso(step);

    // El cruce expedición/nacimiento se espeja en `fechaExpedicionCC`, así que
    // normalmente ya viene en la lista. Este es el respaldo por si solo quedó
    // marcado a nivel de grupo.
    if (!pendientes.length && this.formHojaDeVida2.errors?.['expeditionBeforeBirth']) {
      Swal.fire({
        icon: 'error',
        title: 'Fecha inválida',
        text: 'La fecha de expedición no puede ser anterior a la fecha de nacimiento.',
        confirmButtonColor: '#111827',
      }).then(() => this.enfocarPrimerCampoConError());
      return;
    }

    if (!pendientes.length) { this.showInvalidFormAlert(); return; }

    const total = pendientes.reduce((n, s) => n + s.campos.length, 0);
    const secciones = pendientes.map(s =>
      `<div style="margin-bottom:10px;">` +
      `<div style="font-weight:700;color:#2563eb;font-size:13px;text-transform:uppercase;">${s.seccion}</div>` +
      `<ul style="margin:4px 0 0 18px;padding:0;">` +
      s.campos.map(c => `<li><b>${this.esc(c.campo)}</b>: ${this.esc(c.motivo.toLowerCase())}</li>`).join('') +
      `</ul></div>`
    ).join('');

    Swal.fire({
      icon: 'warning',
      title: `Faltan ${total} ${total === 1 ? 'dato' : 'datos'} en el paso ${step + 1}`,
      html:
        `<p style="text-align:left;margin:0 0 12px;">Complete lo siguiente en ` +
        `<b>${this.MAPA_PASOS[step]?.titulo ?? `paso ${step + 1}`}</b>:</p>` +
        `<div style="text-align:left;font-size:14px;max-height:320px;overflow:auto;">${secciones}</div>`,
      confirmButtonColor: '#111827',
      width: 560,
    }).then(() => this.enfocarPrimerCampoConError());
  }

  /**
   * Lleva la vista al primer campo marcado en rojo del paso visible. Se acota al
   * contenido del paso actual porque los pasos ya visitados siguen en el DOM
   * (ocultos) y arrastrarían el scroll a un campo que no se ve.
   */
  private enfocarPrimerCampoConError(): void {
    if (!this.isBrowser) return;
    setTimeout(() => {
      const paso = document.querySelector('.mat-horizontal-stepper-content-current');
      const el = (paso ?? document).querySelector('.field-bad') as HTMLElement | null;
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 120);
  }

  /**
   * Los campos con autocompletado pintan su `mat-error` a través del control de
   * búsqueda (es el que está atado al input), no del control real. Sin esto, un
   * departamento/ciudad/dominio vacío se quedaba sin marcar al intentar avanzar
   * si el usuario nunca lo tocó.
   */
  private espejarErroresAutocompletado(): void {
    for (const { control, search } of this.paresAutocompletado()) {
      const malo = this.shouldShowError(control);
      if (malo) search.markAsTouched();
      search.setErrors(malo ? { mirror: true } : null);
    }
  }

  /** Pares control real ↔ control visible de los campos con autocompletado. */
  private paresAutocompletado(): Array<{ control: string; search: FormControl }> {
    return [
      { control: 'departamento', search: this.searchDeptoRes },
      { control: 'ciudad', search: this.searchMunRes },
      { control: 'departamentoExpedicionCC', search: this.searchDeptoExp },
      { control: 'municipioExpedicionCC', search: this.searchMunExp },
      { control: 'departamentoNacimiento', search: this.searchDeptoNac },
      { control: 'municipioNacimiento', search: this.searchMunNac },
      // RF-032/035: cascadas nuevas (para espejar el error rojo al validar el paso).
      { control: 'departamentoResidenciaAnterior', search: this.searchDeptoResAnt },
      { control: 'municipioResidenciaAnterior', search: this.searchMunResAnt },
      { control: 'departamentoEmergencia', search: this.searchDeptoEmer },
      { control: 'municipioEmergencia', search: this.searchMunEmer },
      { control: 'correoDominio', search: this.searchDominio },
    ];
  }

  // ----------------------------------------------------
  // 5. Actions (Submit & Upload)
  // ----------------------------------------------------
  async imprimirInformacion2(): Promise<void> {
    // Un envío a la vez: sin esto, un doble clic (o un clic impaciente mientras
    // se ve "Guardando...") dispara dos veces todo el flujo de registro.
    if (this.enviando) return;

    // Primero el candado de edad/fechas: aunque el resto del formulario esté
    // completo, un menor de EDAD_MINIMA no puede enviarlo.
    if (this.bloqueadoPorFechasIdentidad()) return;

    if (this.formHojaDeVida2.invalid) {
      this.formHojaDeVida2.markAllAsTouched();
      this.espejarErroresAutocompletado();

      // Candado duro de fechas primero (mensaje específico) y después el
      // RESUMEN COMPLETO: al finalizar se listan los pendientes de TODOS los
      // pasos en un solo aviso (no solo el primer paso incompleto) y se
      // bloquea el envío hasta que todo esté correcto.
      if (this.bloqueadoPorFechasIdentidad()) return;
      if (this.avisarPendientesTotales()) return;

      // Quedó inválido por algo que no está en el mapa de pasos.
      let firstInvalidControl = '';
      const controls = this.formHojaDeVida2.controls;
      for (const key in controls) {
        if (controls[key].invalid) {
          firstInvalidControl = key;
          break;
        }
      }

      if (firstInvalidControl) {
        const stepIdx = this.getStepIndex(firstInvalidControl);
        this.stepper.selectedIndex = stepIdx;
        const humanName = this.fieldHumanName(firstInvalidControl);
        const seccion = this.seccionDelControl(firstInvalidControl);
        const motivo = this.getErrorMessage(firstInvalidControl) || 'Está vacío o tiene un formato incorrecto';
        Swal.fire({
          icon: 'warning',
          title: 'Formulario Incompleto',
          html: `Revise <b>"${humanName}"</b> en el <b>paso ${stepIdx + 1}</b>` +
            (seccion ? `, sección <b>${seccion}</b>` : '') +
            `: ${motivo.toLowerCase()}.`,
          confirmButtonColor: '#111827'
        });
      } else {
        // Fallback
        this.showInvalidFormAlert();
      }
      return;
    }

    const raw = this.formHojaDeVida2.getRawValue();
    const cedula = String(raw.numeroCedula || '').trim();

    // Del correo duplicado se encarga el UPSERT del backend: rechaza el correo
    // ajeno con EMAIL_BELONGS_TO_OTHER_CEDULA (con el dueño incluido) y ese caso
    // lo pinta `handleBackendError`. El "aviso temprano" que había acá consultaba
    // /validar-correo-cedula esperando el contrato Django (`correo_repetido`),
    // pero el endpoint Java devuelve `correoExiste` SIEMPRE en false (stub):
    // era una llamada bloqueante que no podía detectar nada.

    // Build Payload
    this.numeroCedula = cedula;
    const payload: any = this.buildPayload(raw);
    // RF-034/032: al finalizar se marca el preregistro como COMPLETO (último paso incluido).
    payload.formulario_paso = 5;
    payload.formulario_completo = 1;

    // Send
    this.enviando = true;
    Swal.fire({ title: 'Guardando...', didOpen: () => Swal.showLoading() });

    this.registroProcesoContratacion.crearActualizarCandidato2(payload).subscribe({
      next: async (upsertResp: any) => {
        try {
          // Detectar respuesta falsa del offline interceptor
          if (upsertResp?.offline === true) {
            Swal.fire({
              icon: 'info',
              title: 'Guardado localmente',
              html: 'No hay conexión a internet. Sus datos se guardaron en su dispositivo y se enviarán automáticamente cuando vuelva la conexión.',
              confirmButtonColor: '#111827'
            });
            return;
          }

          if (!upsertResp?.ok && !upsertResp?.numero_documento) {
            return this.handleBackendError(upsertResp, 'No se pudo guardar la información personal.');
          }
          this.numeroCedula = upsertResp.numero_documento ?? this.numeroCedula;

          // NOTA: ya no se llama a subirParte2 aquí. La entrevista (oficina,
          // cómo se enteró, expectativas) viaja dentro del upsert anterior; el
          // subirParte2 del backend Java CREA una entrevista nueva en cada
          // llamada y duplicaba el registro del candidato en cada envío.

          // Upload Files
          let filesOk = true;
          try {
            filesOk = await this.subirTodosLosArchivos();
          } catch(e) {
            filesOk = false;
          }

          // La foto del paso 1 se sube AQUÍ (y no al capturarla) porque el
          // endpoint de biometría necesita que el candidato ya exista. No es
          // bloqueante: si falla, el registro queda completo igual.
          await this.subirFotoCapturada();

          // Registro completo: se borran los datos personales que quedaron en
          // este equipo (suele ser un computador de oficina compartido) y se
          // corta el autoguardado para que no vuelvan a escribirse.
          this.borradorDeshabilitado = true;
          this.limpiarBorrador();

          if (filesOk) {
            // El formulario se llena en computadores de oficina compartidos: al
            // cerrar el aviso se recarga la página para que los datos personales
            // no queden en pantalla para la siguiente persona (el borrador ya se
            // borró y la URL conserva ?empresa= y ?oficina=).
            await Swal.fire({
              icon: 'success',
              title: '¡Éxito!',
              text: 'Tu información fue guardada exitosamente. Al cerrar este aviso el formulario quedará listo para un nuevo registro.',
              confirmButtonText: 'Terminar',
              confirmButtonColor: '#111827',
            });
            if (this.isBrowser) window.location.reload();
          } else {
            // No se recarga: la persona puede volver a pulsar "Enviar" para
            // reintentar la subida de la hoja de vida (el upsert es idempotente).
            Swal.fire('Proceso Incompleto', 'La información guardó, pero hubo un problema subiendo tu Hoja de Vida. Pulsa "Enviar formulario" otra vez para reintentar.', 'warning');
          }
        } catch (error) {
           this.handleBackendError(error, 'Fallo procesando la carga (Parte 2)');
        } finally {
          this.enviando = false;
          this.cdr.markForCheck();
        }
      },
      error: (err: any) => {
        this.enviando = false;
        this.cdr.markForCheck();
        this.handleBackendError(err);
      }
    });
  }

  // Traductor Maestro de Errores Django -> Humano
  private handleBackendError(err: any, fallbackMessage: string = 'Revisa los datos del formulario e intenta de nuevo.') {
    Swal.close(); // Cerramos el "Guardando..."
    console.error('Error de Backend Interceptado:', err);

    // Caso especial: el backend rechazo el guardado porque el correo ya
    // pertenece a otra cedula (validacion temprana en CandidatoViewSet/upsert).
    // Mostramos el mismo modal "Ese correo pertenece a otra cedula" sin
    // pasar por el flujo generico — asi el usuario sabe exactamente que
    // arreglar y no se crea Candidato huerfano en BD.
    const rb = err?.error ?? err;
    if (rb && typeof rb === 'object' && rb.error_code === 'EMAIL_BELONGS_TO_OTHER_CEDULA') {
      const owner = rb.owner || {};
      const fullName = String(owner.nombre_completo || '').trim();
      const [primerNombre, ...resto] = fullName.split(/\s+/);
      const apellidos = resto.length >= 2 ? resto.slice(-2).join(' ') : (resto.join(' ') || '');
      const nombres = resto.length >= 2 ? [primerNombre, ...resto.slice(0, -2)].join(' ') : (primerNombre || '');
      const info = {
        nombres: nombres || fullName,
        apellidos,
        documento: owner.numero_de_documento || '',
      };
      const correo = String(rb.correo_electronico || '').trim();
      this.showEmailOwnerWithInfo(correo, this.numeroCedula, info);
      return;
    }

    // Nombres humanos de los campos (de técnico a lo que ve el usuario)
    const campos: Record<string, string> = {
      'numero_documento': 'el número de cédula',
      'tipo_documento': 'el tipo de documento',
      'tipo_doc': 'el tipo de documento',
      'correo_electronico': 'el correo electrónico',
      'correo': 'el correo electrónico',
      'email': 'el correo electrónico',
      'password': 'la contraseña',
      'fecha_nacimiento': 'la fecha de nacimiento',
      'fecha_expedicion': 'la fecha de expedición del documento',
      'primer_nombre': 'el primer nombre',
      'segundo_nombre': 'el segundo nombre',
      'primer_apellido': 'el primer apellido',
      'segundo_apellido': 'el segundo apellido',
      'celular': 'el número de celular',
      'whatsapp': 'el número de WhatsApp',
      'telefono': 'el número de teléfono',
      'sexo': 'el género',
      'estado_civil': 'el estado civil',
      'oficina': 'la oficina',
      'contacto': 'los datos de contacto',
      'residencia': 'los datos de residencia',
      'experiencia': 'la experiencia laboral',
      'hermanos': 'los hermanos',
      'hijos': 'los hijos',
      'familiares': 'los familiares',
      'referencias': 'las referencias',
      'estudios': 'los estudios',
      'nombre': 'el nombre',
      'apellido': 'el apellido',
      'edad': 'la edad',
      'direccion': 'la dirección',
      'ciudad': 'la ciudad',
      'departamento': 'el departamento',
      'pais': 'el país',
      'barrio': 'el barrio',
      'parentesco': 'el parentesco',
      'empresa': 'la empresa',
      'cargo': 'el cargo',
      'non_field_errors': 'los datos del formulario'
    };

    // Mensajes del backend traducidos a frases humanas
    const traducciones: Array<{ re: RegExp; msg: string }> = [
      { re: /this field must be unique/i, msg: 'ya está registrado en el sistema. Revise si usted (o alguien) ya se inscribió antes.' },
      { re: /user with this .* already exists/i, msg: 'ya existe una persona registrada con este dato. Use otro.' },
      { re: /this field must be unique for the given/i, msg: 'ya existe un registro con este tipo y número de documento.' },
      { re: /this field may not be blank/i, msg: 'no puede quedar vacío. Por favor llénelo.' },
      { re: /this field may not be null/i, msg: 'es obligatorio. Por favor llénelo.' },
      { re: /this field is required/i, msg: 'es obligatorio. Falta llenarlo.' },
      { re: /ensure this field has at least (\d+) characters/i, msg: 'es demasiado corto.' },
      { re: /ensure this field has no more than (\d+) characters/i, msg: 'es demasiado largo.' },
      { re: /enter a valid email/i, msg: 'no tiene el formato correcto. Ejemplo: nombre@gmail.com' },
      { re: /a valid integer is required/i, msg: 'debe ser un número (sin letras ni símbolos).' },
      { re: /a valid number is required/i, msg: 'debe ser un número válido.' },
      { re: /date has wrong format/i, msg: 'tiene un formato de fecha incorrecto. Use año-mes-día, ejemplo: 2025-01-15.' },
      { re: /is not a valid choice/i, msg: 'tiene un valor no permitido. Seleccione una opción de la lista.' },
      { re: /invalid password/i, msg: 'no es válida.' },
    ];

    const traducirMensaje = (msg: any): string => {
      const t = typeof msg === 'string' ? msg.trim() : String(msg ?? '').trim();
      if (!t) return 'tiene un error.';
      for (const { re, msg: human } of traducciones) {
        if (re.test(t)) return human;
      }
      return t;
    };

    // Convierte una "ruta" de campo en frase: ['hermanos','1','nombre'] -> 'en el hermano 2, el nombre'
    const rutaAFrase = (path: string[]): string => {
      if (path.length === 0) return '';
      const partes: string[] = [];
      for (let i = 0; i < path.length; i++) {
        const seg = path[i];
        if (/^\d+$/.test(seg)) {
          const anterior = path[i - 1];
          const nombreItem = anterior && campos[anterior]
            ? campos[anterior].replace(/^(los |las |el |la )/, '').replace(/s$/, '')
            : 'elemento';
          partes.push(`en el ${nombreItem} ${Number(seg) + 1}`);
        } else {
          partes.push(campos[seg] || seg.replace(/_/g, ' '));
        }
      }
      return partes.join(', ');
    };

    // Aplana recursivamente la estructura de errores DRF
    const aplanar = (node: any, path: string[] = [], acc: Array<{ campo: string; mensaje: string }> = []) => {
      if (node == null) return acc;

      if (Array.isArray(node)) {
        node.forEach((child, idx) => {
          if (typeof child === 'string') {
            acc.push({ campo: rutaAFrase(path), mensaje: traducirMensaje(child) });
          } else {
            aplanar(child, [...path, String(idx)], acc);
          }
        });
        return acc;
      }

      if (typeof node === 'object') {
        for (const [key, value] of Object.entries(node)) {
          // Ignorar metadatos al nivel raíz
          if (path.length === 0 && (key === 'detail' || key === 'ok' || key === 'success' || key === 'status_code' || key === 'message')) {
            continue;
          }
          aplanar(value, [...path, key], acc);
        }
        return acc;
      }

      if (typeof node === 'string') {
        acc.push({ campo: rutaAFrase(path), mensaje: traducirMensaje(node) });
      }
      return acc;
    };

    const rawBody = err?.error ?? err;
    const errorsNode = (rawBody && typeof rawBody === 'object' && rawBody.errors !== undefined)
      ? rawBody.errors
      : rawBody;

    const problemas = aplanar(errorsNode);

    // Capitaliza la primera letra de una frase
    const cap = (s: string) => s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s;

    let htmlMensaje = '';

    if (problemas.length > 0) {
      htmlMensaje += `<p style="text-align:left;font-size:15px;margin:0 0 10px 0;">Por favor revisa lo siguiente y vuelve a intentar:</p>`;
      htmlMensaje += `<ul style="text-align:left;font-size:14px;color:#b71c1c;padding-left:22px;margin:0;line-height:1.5;">`;
      // `mensaje` puede venir tal cual del backend: se escapa antes de inyectarlo.
      for (const { campo, mensaje } of problemas) {
        const frase = campo
          ? `${cap(campo)} ${mensaje}`
          : cap(mensaje);
        htmlMensaje += `<li style="margin-bottom:6px;">${this.esc(frase)}</li>`;
      }
      htmlMensaje += `</ul>`;
    } else {
      // Sin detalles por campo → mensaje simple
      let simpleMsg: string;
      if (err?.status === 0) {
        simpleMsg = 'No se pudo conectar con el servidor. Revisa tu conexión a internet y vuelve a intentar.';
      } else if (err?.status === 401) {
        simpleMsg = 'Tu sesión expiró. Cierra y vuelve a iniciar sesión.';
      } else if (err?.status === 403) {
        simpleMsg = 'No tienes permisos para realizar esta acción.';
      } else if (err?.status === 404) {
        simpleMsg = 'No se encontró la información solicitada.';
      } else if (err?.status >= 500) {
        simpleMsg = 'El servidor está teniendo problemas. Espera un momento y vuelve a intentar.';
      } else {
        const msgCrudo = (rawBody && typeof rawBody === 'object' ? (rawBody.detail || rawBody.message) : null)
          || err?.message
          || fallbackMessage;
        simpleMsg = traducirMensaje(msgCrudo);
      }
      htmlMensaje = `<p style="text-align:left;font-size:15px;margin:0;">${this.esc(simpleMsg)}</p>`;
    }

    htmlMensaje += `<p style="font-size:12px;color:#888;margin-top:14px;text-align:left;">Si el problema continúa, comuníquese con soporte${this.numeroCedula ? ` con su cédula: <b>${this.esc(this.numeroCedula)}</b>` : ''}.</p>`;

    Swal.fire({
      icon: 'error',
      title: 'No se pudo guardar',
      html: htmlMensaje,
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#111827',
      width: 520
    });
  }

  // Updated Background Save (Step 1)
  saveStep1InBackgroundAndNext() {
    const f = this.formHojaDeVida2;

    // Candado del paso 1: ni se guarda ni se avanza con obligatorios pendientes.
    if (!this.revisarPasosHasta(0)) return;

    // Prepare Payload (Subset)
    const raw = f.getRawValue();
    const g = (k: string) => (raw[k] || ''); // Safe accessor
    const upper = (v: string) => String(v || '').toUpperCase().trim();

    // Construct Dynamic Payload
    const formValue = {
      "formulario_paso": 1,   // RF-025: el paso 0 (Pre-registro) queda guardado en BD
      "oficina": upper(g('oficina')),
      "tipo_doc": g('tipoDoc'),
      // String() explícito: si el control trae la cédula como número (borrador
      // viejo restaurado, autocompletado), el JSON viaja con un int y el
      // backend revienta al hashear la clave ("Password must be a string").
      "numero_documento": String(g('numeroCedula')).trim(),
      "primer_apellido": upper(g('pApellido')),
      "segundo_apellido": upper(g('sApellido')),
      "primer_nombre": upper(g('pNombre')),
      "segundo_nombre": upper(g('sNombre')),
      "fecha_nacimiento": this.toYmd(g('fechaNacimiento')),
      "sexo": g('genero'),
      "estado_civil": g('estadoCivil'),

      "contacto": {
        "email": (g('correo') || '').toUpperCase(),
        "celular": g('numCelular'),
        "whatsapp": g('numWha')
      },

      // Departamento/municipio de residencia van también en el candidato:
      // el paso 1 se guarda solo y, si la persona abandona ahí, esto es todo
      // lo que queda registrado.
      "departamento": upper(g('departamento')),
      "municipio": upper(g('ciudad')),

      "residencia": {
        "barrio": upper(g('zonaResidencia')),
        "direccion": upper(g('direccionResidencia')),
        "hace_cuanto_vive": upper(g('tiempoResidenciaZona'))
      },

      // Los departamentos faltaban acá: se enviaban solo los municipios, así
      // que un abandono tras el paso 1 dejaba el depto de expedición y el de
      // nacimiento vacíos.
      "info_cc": {
        "fecha_expedicion": this.toYmd(g('fechaExpedicionCC')),
        "depto_expedicion": upper(g('departamentoExpedicionCC')),
        "mpio_expedicion": upper(g('municipioExpedicionCC')),
        "depto_nacimiento": upper(g('departamentoNacimiento')),
        "mpio_nacimiento": upper(g('municipioNacimiento'))
      },

      "vivienda": {
        "personas_con_quien_convive": (g('conQuienViveChecks') || []).join(', ')
      },

      "formaciones": [
        { "nivel": g('escolaridad') }
      ],

      "entrevistas": [
        {
          "oficina": upper(g('oficina')),
          "como_se_proyecta": (g('expectativasVidaChecks') || []).join(', '),
          // Se pregunta al inicio del paso 1 y es obligatoria, pero no viajaba
          // en este guardado: quien abandonaba tras el paso 1 dejaba vacío el
          // "¿cómo se enteró de la vacante?" (Entrevista.como_se_entero).
          "como_se_entero": upper(g('fuenteVacante'))
        }
      ],

      // Password = número de cédula (automático, no lo ingresa el usuario)
      "password": String(g('numeroCedula')).trim()
    };

    // Guardar paso 1 con feedback al usuario
    Swal.fire({ title: 'Guardando paso 1...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    this.registroProcesoContratacion.crearActualizarCandidato(formValue)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          console.log('Step 1 Saved', res);

          // Detectar respuesta offline falsa
          if (res?.offline === true) {
            Swal.fire({
              icon: 'info',
              title: 'Sin conexión',
              html: 'Sus datos se guardaron localmente y se enviarán cuando vuelva la conexión. Puede seguir llenando el formulario.',
              timer: 3000,
              showConfirmButton: false
            });
            this.stepper.next();
            return;
          }

          // Crear usuario en background (no bloquea al usuario). Solo una vez
          // por combinación cédula+correo: volver al paso 1 y pulsar "Siguiente"
          // otra vez repetía el registro, el 400 por documento duplicado y toda
          // la cadena de modales de credenciales.
          const claveUsuario = `${String(g('numeroCedula')).trim()}|${(g('correo') || '').toUpperCase().trim()}`;
          const esPrimeraVez = claveUsuario !== this.usuarioRegistradoPara;
          if (esPrimeraVez) {
            this.usuarioRegistradoPara = claveUsuario;
            this.createUserInBackground(raw);
            // Es el único momento en que se le puede entregar el usuario: acá se
            // crea la cuenta. Sin temporizador — tiene que poder anotarlo.
            const usuarioAcceso = this.usuarioDeAcceso(g('tipoDoc'), g('numeroCedula'));
            const cedulaLimpia = String(g('numeroCedula')).replace(/\D/g, '');
            Swal.fire({
              icon: 'success',
              title: 'Paso 1 guardado',
              html: `<p style="text-align:left;margin:0;">Sus datos básicos se guardaron y ya tiene cuenta para ingresar al portal:</p>
                     ${this.cajaCredenciales(usuarioAcceso, cedulaLimpia, (g('correo') || '').toLowerCase())}
                     <p style="text-align:left;font-size:12px;color:#6b7280;margin:0;">Anótelos: los va a necesitar para consultar sus documentos y desprendibles.</p>`,
              confirmButtonText: 'Anotado, continuar',
              confirmButtonColor: '#111827',
              width: 480,
            });
          } else {
            // Ya pasó por acá con esta misma cédula+correo: volver a mostrar el
            // modal grande de credenciales en cada "Siguiente" era ruido.
            Swal.fire({
              icon: 'success',
              title: 'Paso 1 actualizado',
              toast: true,
              position: 'bottom-end',
              timer: 2500,
              showConfirmButton: false,
            });
          }
          this.stepper.next();
        },
        error: (err) => {
          console.error('Step 1 Save Failed', err);
          this.handleBackendError(err, 'No se pudo guardar el paso 1. Revise los datos e intente de nuevo.');
        }
      });
  }

  /**
   * Nombre de usuario con el que la persona inicia sesión: una letra según el
   * tipo de documento + la cédula. Espeja `usuario_de_acceso()` de
   * `gestion_catalogos/tipos_doc.py`; si cambia allá, cambia acá.
   *
   * El prefijo NO se guarda: `numero_de_documento` viaja limpio y el backend
   * traduce la letra al iniciar sesión. Existe para separar a dos personas
   * distintas que comparten número con tipo diferente.
   */
  usuarioDeAcceso(tipoDoc: any, numero: any): string {
    const digitos = String(numero ?? '').replace(/\D/g, '');
    if (!digitos) return '';

    // Mismo saneo que `_a_letras()` en Python: quitar tildes y la eñe ANTES de
    // dejar solo A-Z. Sin el paso de tildes, "Contraseña" queda "CONTRASEA" y
    // caería en la 'P' cuando le corresponde la 'C'.
    const t = String(tipoDoc || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toUpperCase().replace(/[^A-Z]/g, '');

    // Dos letras: 'C' cédula de ciudadanía (y CTRA, que es esa misma cédula en
    // trámite, o sea la misma persona) y 'P' todo documento de extranjero.
    // Espeja `_PREFIJO_POR_TIPO` de gestion_catalogos/tipos_doc.py.
    // Un tipo irreconocible cae en 'C', que es el 97% de las cuentas.
    const ES_CEDULA = new Set([
      'CC', 'CCC', 'CDC', 'CEDULA', 'CEDULACIUDADANIA', 'CEDULADECIUDADANIA',
      'CTRA', 'CONT', 'CTR', 'CONTRASENA',
    ]);
    const ES_EXTRANJERO = new Set([
      'CE', 'CEX', 'CEDULAEXTRANJERIA', 'CEDULADEEXTRANJERIA',
      'PPT', 'PET', 'PEP', 'PTT', 'PPTT', 'PP', 'PERMISO',
      'TI',
    ]);
    return `${ES_EXTRANJERO.has(t) && !ES_CEDULA.has(t) ? 'P' : 'C'}${digitos}`;
  }

  /** Bloque HTML de credenciales, igual en todos los avisos al usuario. */
  private cajaCredenciales(usuario: string, cedula: string, correo?: string): string {
    return `
      <div style="background:#f3f4f6;border-radius:10px;padding:12px 14px;margin:10px 0;text-align:left;">
        <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.04em;">Usuario</div>
        <div style="font-size:22px;font-weight:700;color:#111827;letter-spacing:.04em;">${this.esc(usuario)}</div>
        <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.04em;margin-top:8px;">Contraseña</div>
        <div style="font-size:16px;font-weight:600;color:#111827;">${this.esc(cedula)} <span style="font-weight:400;color:#6b7280;">(su número de documento)</span></div>
        ${correo ? `<div style="font-size:12px;color:#6b7280;margin-top:8px;">También puede entrar con su correo <b>${this.esc(correo)}</b>.</div>` : ''}
      </div>`;
  }

  /**
   * Crea o actualiza un usuario en gestion_admin.
   *
   * Flujo:
   * 1. POST /auth/register/ → si funciona, listo.
   * 2. Si falla por documento duplicado → buscar ese usuario y hacerle PATCH.
   * 3. Si falla por correo duplicado (otra persona lo tiene) → mostrar quién.
   * 4. Si falla por otra razón → mostrar error traducido.
   */
  private createUserInBackground(raw: any): void {
    const apiUrl = (environment.apiUrl || '').replace(/\/$/, '');
    const g = (k: string) => (raw[k] || '');
    const upper = (v: string) => String(v || '').toUpperCase().trim();

    const numeroCedula = String(g('numeroCedula')).substring(0, 20);
    const tipoDoc = String(g('tipoDoc')).substring(0, 4);
    const correo = (g('correo') || '').toUpperCase().trim();
    const password = numeroCedula; // Password = número de cédula
    const nombres = [upper(g('pNombre')), upper(g('sNombre'))].filter(Boolean).join(' ').substring(0, 64);
    const apellidos = [upper(g('pApellido')), upper(g('sApellido'))].filter(Boolean).join(' ').substring(0, 64);
    const celular = g('numCelular') || null;

    if (!numeroCedula || !correo || !password || !tipoDoc) {
      console.warn('[createUser] Faltan datos mínimos, se omite creación.');
      return;
    }

    const registerPayload: any = {
      numero_de_documento: numeroCedula,
      tipo_documento: tipoDoc,
      correo_electronico: correo,
      password,
      nombres,
      apellidos,
      celular,
      estado_solicitudes: true,
      // El `rol` no se manda: AuthService.register lo ignora y asigna SIEMPRE
      // el rol de auto-registro (DEFAULT_SELF_REGISTER_ROLE). El UUID Django
      // que viajaba acá era payload muerto.
    };

    this.http.post<any>(`${apiUrl}/gestion_admin/auth/register/`, registerPayload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          if (res?.offline === true) {
            Swal.fire({
              icon: 'info',
              title: 'Sin conexión a internet',
              html: `Sus datos del formulario quedaron guardados en este dispositivo.<br><br>
                     <b>Su cuenta de acceso se creará automáticamente</b> cuando vuelva la conexión a internet.<br><br>
                     Puede seguir llenando el resto del formulario con tranquilidad.`,
              confirmButtonColor: '#111827'
            });
            return;
          }
          console.log('[createUser] Usuario creado OK:', res?.id || res);
        },
        error: (err: any) => {
          const status = err?.status;
          const errBody = err?.error;
          console.warn('[createUser] Registro falló (status ' + status + '):', errBody);

          // Sin conexión con el servidor
          if (status === 0) {
            Swal.fire({
              icon: 'warning',
              title: 'No hay conexión con el servidor',
              html: `<p style="text-align:left;">Sus datos del formulario <b>sí se guardaron correctamente</b>.</p>
                     <p style="text-align:left;">Pero no pudimos crear su cuenta de acceso porque no hay conexión a internet en este momento.</p>
                     <p style="text-align:left;">Continúe llenando el formulario. Si al terminar todavía tiene problemas para ingresar, comuníquese con la oficina con su cédula: <b>${numeroCedula}</b>.</p>`,
              confirmButtonText: 'Entendido',
              confirmButtonColor: '#111827',
              width: 520
            });
            return;
          }

          // El servidor respondió pero tiene problemas
          if (status >= 500) {
            Swal.fire({
              icon: 'warning',
              title: 'El servidor tiene un problema',
              html: `<p style="text-align:left;">Sus datos del formulario <b>sí se guardaron correctamente</b>.</p>
                     <p style="text-align:left;">No pudimos crear su cuenta de acceso porque el servidor no está respondiendo bien en este momento.</p>
                     <p style="text-align:left;">Espere unos minutos y, si todavía tiene problemas para ingresar, comuníquese con la oficina con su cédula: <b>${numeroCedula}</b>.</p>`,
              confirmButtonText: 'Entendido',
              confirmButtonColor: '#111827',
              width: 520
            });
            return;
          }

          // 401/403: problemas de permisos (no debería pasar con /auth/register pero por si acaso)
          if (status === 401 || status === 403) {
            Swal.fire({
              icon: 'warning',
              title: 'No tenemos permisos para crear la cuenta',
              html: `<p style="text-align:left;">Sus datos del formulario <b>sí se guardaron correctamente</b>.</p>
                     <p style="text-align:left;">Pero no pudimos crear su cuenta de acceso. Comuníquese con la oficina con su cédula: <b>${numeroCedula}</b> para que lo ayuden.</p>`,
              confirmButtonText: 'Entendido',
              confirmButtonColor: '#111827',
              width: 520
            });
            return;
          }

          // Error inesperado sin cuerpo JSON
          if (status !== 400 || !errBody || typeof errBody !== 'object') {
            Swal.fire({
              icon: 'warning',
              title: 'No se pudo crear su cuenta',
              html: `<p style="text-align:left;">Sus datos del formulario <b>sí se guardaron correctamente</b>.</p>
                     <p style="text-align:left;">Ocurrió un problema inesperado al crear su cuenta de acceso.</p>
                     <p style="text-align:left;">Comuníquese con la oficina con su cédula: <b>${numeroCedula}</b>.</p>`,
              confirmButtonText: 'Entendido',
              confirmButtonColor: '#111827',
              width: 520
            });
            return;
          }

          // Backend Java: cuando el documento O el correo ya tienen cuenta,
          // register responde un genérico anti-enumeración ("No se puede crear
          // el usuario con esos datos") sin detalle por campo. Para quien se
          // registra con SU propia cédula eso significa "usted ya tiene
          // cuenta": se anexa el correo del formulario como credencial de
          // acceso ADICIONAL (multi-correo por cédula) y se avisa según
          // el resultado, con las credenciales a la vista.
          const msgJava = String(errBody?.message ?? errBody?.reason ?? '').toLowerCase();
          if (msgJava.includes('no se puede crear el usuario')) {
            void this.manejarCuentaExistente(apiUrl, tipoDoc, numeroCedula, correo, password);
            return;
          }

          // Otro error de validación 400 (formato inválido, campo faltante…).
          // Los "duplicados" ya no llegan acá: el backend Java responde el
          // genérico anti-enumeración que trata la rama de arriba. Las ramas
          // Django que había acá (analizar `numero_de_documento`/`correo_electronico`
          // del body y saltar a actualizar el usuario o buscar al dueño del
          // correo) dependían de endpoints que no existen en Java y eran
          // inalcanzables con este backend.
          this.showUserCreationError(errBody, numeroCedula);
        }
      });
  }

  /** Muestra el modal del dueño del correo cuando YA tenemos la info del backend
   *  (llega en `owner` dentro del error EMAIL_BELONGS_TO_OTHER_CEDULA del upsert). */
  private showEmailOwnerWithInfo(correoCrudo: string, cedulaActualCruda: string, info: any): void {
    // Nombre, documento y correo llegan del backend: se escapan antes de
    // inyectarlos en el `html` del modal.
    const correo = this.esc(correoCrudo);
    const cedulaActual = this.esc(cedulaActualCruda);
    if (info) {
      const nombreCompleto = this.esc(`${info.nombres || ''} ${info.apellidos || ''}`.trim() || 'otra persona');
      Swal.fire({
        icon: 'error',
        title: 'Ese correo pertenece a otra cédula',
        html: `<p style="text-align:left;">El correo <b>${correo}</b> ya está registrado, pero <b>bajo otra cédula distinta a la suya</b>.</p>
               <p style="text-align:left;">Está registrado a nombre de:</p>
               <p style="text-align:left;background:#f5f5f5;padding:12px;border-radius:6px;margin:10px 0;">
                 <b>${nombreCompleto}</b><br>
                 Cédula: <b>${this.esc(info.documento || 'no disponible')}</b>
               </p>
               <p style="text-align:left;"><b>No podemos continuar</b> con su registro usando ese correo.</p>
               <p style="text-align:left;">Por favor, <b>vuelva al Paso 1 y escriba un correo electrónico diferente</b> (por ejemplo, el suyo personal que nadie más use).</p>
               <p style="font-size:12px;color:#888;margin-top:12px;text-align:left;">Si esa persona es usted y ya tiene cuenta, comuníquese con la oficina para recuperar su contraseña en vez de crear una nueva.</p>`,
        confirmButtonText: 'Entendido, voy a cambiarlo',
        confirmButtonColor: '#111827',
        width: 540
      });
    } else {
      // El backend dice que está duplicado pero no nos da los datos del dueño
      Swal.fire({
        icon: 'error',
        title: 'Ese correo pertenece a otra cédula',
        html: `<p style="text-align:left;">El correo <b>${correo}</b> ya está registrado <b>bajo otra cédula distinta a la suya</b>.</p>
               <p style="text-align:left;"><b>No podemos continuar</b> con su registro usando ese correo.</p>
               <p style="text-align:left;"><b>Vuelva al Paso 1 y use un correo electrónico diferente</b> (por ejemplo, el suyo personal que nadie más use).</p>
               <p style="font-size:12px;color:#888;margin-top:12px;text-align:left;">Si usted ya tiene cuenta con ese correo, comuníquese con la oficina para recuperar su contraseña${cedulaActual ? ` (su cédula: <b>${cedulaActual}</b>)` : ''}.</p>`,
        confirmButtonText: 'Entendido, voy a cambiarlo',
        confirmButtonColor: '#111827',
        width: 540
      });
    }
  }

  /**
   * Anexa UN correo como credencial de acceso ADICIONAL de la cédula
   * (multi-correo: corporativo + personal, cada uno con su propia contraseña).
   * Endpoint público /gestion_admin/auth/agregar-credenciales/ (ms-auth-admin
   * V42). El backend rechaza cuentas administrativas y correos de otra persona;
   * los textos de `motivo` son contrato: acá se buscan "principal",
   * "pertenece a otro" y "no existe una cuenta".
   */
  private async agregarCorreoComoCredencial(
    apiUrl: string,
    tipoDoc: string,
    cedula: string,
    correo: string,
    password: string,
    etiqueta: string = 'PERSONAL',
  ): Promise<{ ok: boolean; rechazo?: string }> {
    const correoNorm = String(correo || '').trim().toLowerCase();
    if (!correoNorm || !password) return { ok: false, rechazo: 'Datos incompletos.' };
    try {
      // El tipo viaja SIEMPRE: la identidad es el par (tipo, número) y el
      // backend rechaza anexar a una cuenta cuyo tipo no coincida — (CC, 1234)
      // y (PPT, 1234) son personas distintas que comparten dígitos.
      const res: any = await firstValueFrom(this.http.post(
        `${apiUrl}/gestion_admin/auth/agregar-credenciales/`,
        { numero_de_documento: cedula, tipo_documento: tipoDoc, credenciales: [{ correo: correoNorm, password, etiqueta }] }
      ));
      const agregadas = Array.isArray(res?.agregadas) ? res.agregadas : [];
      const rechazadas = Array.isArray(res?.rechazadas) ? res.rechazadas : [];
      if (agregadas.length > 0) return { ok: true };
      if (rechazadas.length > 0) return { ok: false, rechazo: String(rechazadas[0]?.motivo || '') };
      return { ok: false };
    } catch (e: any) {
      console.warn('[credencial] no se pudo anexar:', e?.status, e?.error);
      return { ok: false };
    }
  }

  /**
   * El register dijo "cuenta existente" (genérico anti-enumeración). Se intenta
   * anexar el correo del formulario como acceso adicional y se explica el
   * resultado. Si el conflicto real era el CORREO de otra persona (la cédula no
   * tiene cuenta, o el correo pertenece a otro), se pide cambiarlo.
   */
  private async manejarCuentaExistente(apiUrl: string, tipoDoc: string, cedula: string, correo: string, password: string): Promise<void> {
    const usuarioAcceso = this.usuarioDeAcceso(tipoDoc, cedula);
    const correoLower = (correo || '').toLowerCase();
    const cred = await this.agregarCorreoComoCredencial(apiUrl, tipoDoc, cedula, correoLower, password);

    if (!cred.ok && /otro tipo de documento/i.test(cred.rechazo || '')) {
      // El número existe pero con OTRO tipo de documento: es la cuenta de OTRA
      // persona que comparte dígitos (una CC y un PPT). No se muestran
      // credenciales (serían las del dueño) ni se dice "su cuenta ya existe".
      Swal.fire({
        icon: 'warning',
        title: 'Documento registrado con otro tipo',
        html: `<p style="text-align:left;">Sus datos del formulario <b>sí se guardaron correctamente</b>.</p>
               <p style="text-align:left;">Pero el número <b>${this.esc(cedula)}</b> ya está registrado en el sistema con <b>otro tipo de documento</b>, así que no pudimos crearle una cuenta de acceso automáticamente.</p>
               <p style="text-align:left;">Verifique que eligió bien su <b>tipo de documento</b> al inicio. Si el tipo es correcto, comuníquese con la oficina con su documento para que le habiliten el acceso.</p>`,
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#111827',
        width: 540
      });
      return;
    }

    if (!cred.ok && /pertenece a otro|no existe una cuenta/i.test(cred.rechazo || '')) {
      // "no existe una cuenta" = la cédula NO tiene usuario, así que lo que
      // chocó en el register fue el correo (es de otra persona).
      this.showEmailOwnerWithInfo(correo, cedula, null);
      return;
    }

    const detalleCorreo = cred.ok
      ? `<p style="text-align:left;">Además, agregamos <b>${this.esc(correoLower)}</b> como correo de acceso adicional: puede ingresar con cualquiera de sus correos, cada uno con su propia contraseña.</p>`
      : /principal/i.test(cred.rechazo || '')
        ? `<p style="text-align:left;">Ese correo ya es su acceso: ingrese con él y su número de documento.</p>`
        : '';

    Swal.fire({
      icon: 'info',
      title: 'Su cuenta ya existe',
      html: `<p style="text-align:left;">Sus datos del formulario <b>sí se guardaron correctamente</b>.</p>
             <p style="text-align:left;">Su documento (o su correo) <b>ya tiene una cuenta de acceso</b> en el portal, así que no fue necesario crear una nueva.</p>
             ${detalleCorreo}
             ${this.cajaCredenciales(usuarioAcceso, cedula, correoLower)}
             <p style="text-align:left;font-size:13px;color:#6b7280;">Si no puede ingresar con estos datos, comuníquese con la oficina con su cédula: <b>${this.esc(cedula)}</b>.</p>`,
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#111827',
      width: 520
    });
  }

  /** Muestra al usuario final los errores específicos al crear su cuenta de acceso */
  private showUserCreationError(errBody: any, cedula: string): void {
    const campos: Record<string, string> = {
      'numero_de_documento': 'el número de documento',
      'correo_electronico': 'el correo electrónico',
      'password': 'la contraseña',
      'tipo_documento': 'el tipo de documento',
      'nombres': 'los nombres',
      'apellidos': 'los apellidos',
      'celular': 'el número de celular',
      'rol': 'el rol de usuario',
      'non_field_errors': 'los datos de la cuenta',
      'detail': 'los datos'
    };

    const traducciones: Array<{ re: RegExp; msg: string }> = [
      { re: /ya registrado/i, msg: 'ya está registrado en el sistema.' },
      { re: /this field must be unique/i, msg: 'ya está registrado en el sistema.' },
      { re: /already exists/i, msg: 'ya está registrado en el sistema.' },
      { re: /ensure this field has at least (\d+) characters/i, msg: 'es demasiado corto. Debe tener al menos $1 caracteres.' },
      { re: /ensure this field has no more than (\d+) characters/i, msg: 'es demasiado largo.' },
      { re: /this field may not be blank/i, msg: 'no puede estar vacío. Por favor llénelo.' },
      { re: /this field may not be null/i, msg: 'es obligatorio. Por favor llénelo.' },
      { re: /this field is required/i, msg: 'es obligatorio. Falta llenarlo.' },
      { re: /enter a valid email/i, msg: 'no tiene el formato correcto. Debe ser algo como nombre@gmail.com' },
      { re: /is not a valid choice/i, msg: 'tiene un valor no permitido.' },
      { re: /a valid integer is required/i, msg: 'debe ser solo números.' },
    ];

    const traducir = (msg: any, cedulaContext: string): string => {
      const t = String(msg ?? '').trim();
      if (!t) return 'tiene un error.';
      for (const { re, msg: human } of traducciones) {
        if (re.test(t)) return t.replace(re, human);
      }
      return t;
    };

    const cap = (s: string) => s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s;

    let items = '';
    for (const [key, msgs] of Object.entries(errBody)) {
      if (key === 'detail' && typeof msgs === 'string' && !Object.keys(errBody).some(k => k !== 'detail')) {
        // si el único campo es 'detail', lo tratamos como mensaje simple
        items += `<li style="margin-bottom:6px;">${this.esc(cap(traducir(msgs, cedula)))}</li>`;
        continue;
      }
      if (key === 'detail') continue;

      const label = campos[key] || key.replace(/_/g, ' ');
      const arr = Array.isArray(msgs) ? msgs : [msgs];
      const traducciones_campo = arr.map(m => traducir(m, cedula)).join(' ');
      items += `<li style="margin-bottom:6px;">${this.esc(cap(label))} ${this.esc(traducciones_campo)}</li>`;
    }

    if (!items) {
      items = `<li>No pudimos identificar exactamente qué falló. Comuníquese con la oficina para ayuda.</li>`;
    }

    Swal.fire({
      icon: 'warning',
      title: 'No se pudo crear su cuenta de acceso',
      html: `<p style="text-align:left;font-size:14px;margin:0 0 6px 0;">
               Sus datos del formulario <b>sí se guardaron correctamente</b>.
             </p>
             <p style="text-align:left;font-size:14px;margin:0 0 10px 0;">
               Pero al crear su cuenta de acceso encontramos estos problemas:
             </p>
             <ul style="text-align:left;font-size:14px;color:#b71c1c;padding-left:22px;margin:0;line-height:1.5;">${items}</ul>
             <p style="font-size:12px;color:#888;margin-top:14px;text-align:left;">
               Si el problema continúa, comuníquese con la oficina con su cédula: <b>${cedula}</b>.
             </p>`,
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#111827',
      width: 520
    });
  }


  private startForm(tipo: string, num: string) {
    this.showForm = true;
    this.formHojaDeVida2.patchValue({
      tipoDoc: tipo,
      numeroCedula: num
    });
    this.formHojaDeVida2.get('tipoDoc')?.disable();
    this.formHojaDeVida2.get('numeroCedula')?.disable();
  }

  /**
   * Restaura el borrador guardado en localStorage por el autosave, solo cuando la
   * cédula guardada coincide con la que se está buscando. Evita filtrar el borrador
   * de otra persona en un dispositivo compartido (form público).
   *
   * Devuelve `true` si restauró algo: quien llama lo usa para saltarse la
   * precarga del servidor y no pisar lo que la persona ya había escrito.
   */
  private restoreDraft(cedula: string): boolean {
    if (!this.isBrowser || !cedula) return false;

    // Claves nuevas y, si no hay nada, las anteriores (borradores en curso al
    // momento del cambio de nombre de clave).
    let savedCedula = localStorage.getItem(CEDULA_KEY);
    let raw = localStorage.getItem(STORAGE_KEY);
    let paso = localStorage.getItem(STEP_KEY);
    if (!raw) {
      savedCedula = localStorage.getItem(CEDULA_KEY_LEGACY);
      raw = localStorage.getItem(STORAGE_KEY_LEGACY);
      paso = null;
    }

    if (!raw || String(savedCedula) !== String(cedula)) return false;

    // Borrador viejo: se descarta y se borra del equipo en vez de resucitar
    // datos personales de hace semanas.
    const sello = Number(localStorage.getItem(STAMP_KEY));
    if (Number.isFinite(sello) && sello > 0 &&
      Date.now() - sello > FormsTestContratation.BORRADOR_TTL_MS) {
      this.limpiarBorrador();
      return false;
    }

    try {
      const data = this.revivirFechas(JSON.parse(raw));
      // Reconstruye los FormArray antes del patch para que existan los hijos.
      if (Array.isArray(data.hijos)) this.actualizarHijos(data.hijos.length);
      // patchValue con emitEvent por defecto re-dispara los toggles condicionales.
      this.formHojaDeVida2.patchValue(data);

      // Devolver a la persona al paso donde iba, no al primero.
      const idx = Number(paso);
      if (Number.isFinite(idx) && idx > 0) {
        setTimeout(() => {
          try {
            if (this.stepper) this.stepper.selectedIndex = idx;
          } catch { /* el paso puede no existir todavia */ }
        }, 0);
      }

      Swal.fire({
        icon: 'info',
        title: 'Recuperamos tus datos',
        text: 'Encontramos un formulario a medias con tu documento y lo restauramos. Revisa que todo esté bien antes de continuar.',
        timer: 4000,
        showConfirmButton: false,
      });
      return true;
    } catch (e) {
      console.error('Error loading draft', e);
      return false;
    }
  }
  groupCrossValidator(): ValidatorFn {
    return (g: AbstractControl) => {
      const v = g.value;

      // Expedición vs nacimiento. Antes esto devolvía de una y se saltaba los
      // controles de duplicados de abajo; ahora solo se anota y se sigue.
      const nacD = this.aFecha(v.fechaNacimiento);
      const expD = this.aFecha(v.fechaExpedicionCC);
      const expedicionInvalida = !!(nacD && expD && expD < nacD);

      // La CC se expide a los 18: si la expedición cae antes, la fecha de
      // nacimiento está mal (año tecleado de más es lo habitual). `tipoDoc` se
      // lee del control y no de `g.value` porque el pre-registro lo deshabilita
      // y los deshabilitados no salen ahí.
      const esCedula = String(g.get('tipoDoc')?.value ?? '').trim().toUpperCase() === 'CC';
      const expedicionPrematura = !!(
        esCedula && nacD && expD && !expedicionInvalida &&
        expD < this.sumarAnios(nacD, FormsTestContratation.EDAD_EXPEDICION_CC)
      );

      // Se espeja en el control para que el campo se pinte en rojo y tenga su
      // propio mensaje; el error de grupo por sí solo no marca ningún campo.
      const ctrlExp = g.get('fechaExpedicionCC');
      if (ctrlExp) {
        const errs = { ...(ctrlExp.errors || {}) };
        const cambia =
          !!errs['expedicionAntesDeNacer'] !== expedicionInvalida ||
          !!errs['expedicionAntesDeEdadMinima'] !== expedicionPrematura;
        if (cambia) {
          if (expedicionInvalida) errs['expedicionAntesDeNacer'] = true;
          else delete errs['expedicionAntesDeNacer'];
          if (expedicionPrematura) errs['expedicionAntesDeEdadMinima'] = true;
          else delete errs['expedicionAntesDeEdadMinima'];
          ctrlExp.setErrors(Object.keys(errs).length ? errs : null, { emitEvent: false });
        }
      }

      // Marca/desmarca un error de duplicado en un control sin pisar los demás.
      const marcar = (c: AbstractControl | null, errKey: string, hayError: boolean) => {
        if (!c) return;
        const tiene = !!c.errors?.[errKey];
        if (tiene === hayError) return;
        const errs: any = { ...(c.errors || {}) };
        if (hayError) errs[errKey] = true; else delete errs[errKey];
        c.setErrors(Object.keys(errs).length ? errs : null);
      };
      const clave = (s: any, esTelefono = false) => {
        const t = String(s ?? '').trim().toUpperCase().replace(/\s+/g, '');
        return esTelefono ? t.replace(/\D/g, '') : t;
      };

      // Las CUATRO referencias tienen que ser cuatro personas distintas. Antes
      // solo se comparaba personal 1 vs 2 y familiar 1 vs 2, así que repetir la
      // misma persona como referencia personal Y familiar pasaba sin más.
      // RF-040: el nombre de la referencia ahora vive en componentes; la clave del
      // duplicado se arma con primer nombre + primer apellido y se marca en el primer nombre.
      const refs = [
        { pn: 'refPersonal1PrimerNombre', pa: 'refPersonal1PrimerApellido', telefono: 'telefonoReferencia1' },
        { pn: 'refPersonal2PrimerNombre', pa: 'refPersonal2PrimerApellido', telefono: 'telefonoReferencia2' },
        { pn: 'refFamiliar1PrimerNombre', pa: 'refFamiliar1PrimerApellido', telefono: 'telefonoReferenciaFamiliar1' },
        { pn: 'refFamiliar2PrimerNombre', pa: 'refFamiliar2PrimerApellido', telefono: 'telefonoReferenciaFamiliar2' },
      ];
      const claveRef = (r: any) => clave(`${v[r.pn] ?? ''} ${v[r.pa] ?? ''}`);

      // Un teléfono de referencia tampoco puede ser el del propio candidato.
      const propios = new Set([clave(v.numCelular, true), clave(v.numWha, true)].filter(Boolean));

      for (let i = 0; i < refs.length; i++) {
        const nom = claveRef(refs[i]);
        const tel = clave(v[refs[i].telefono], true);

        // Se compara solo contra las anteriores: el error se marca en la
        // segunda aparición, que es la que el usuario debe corregir.
        const nomRepetido = !!nom && refs.slice(0, i).some(r => claveRef(r) === nom);
        const telRepetido = !!tel && (
          propios.has(tel) || refs.slice(0, i).some(r => clave(v[r.telefono], true) === tel)
        );

        marcar(g.get(refs[i].pn), 'duplicateReferenceName', nomRepetido);
        marcar(g.get(refs[i].telefono), 'duplicateReferencePhone', telRepetido);
      }

      if (expedicionInvalida) return { expeditionBeforeBirth: true };
      if (expedicionPrematura) return { expedicionAntesDeEdadMinima: true };
      return null;
    };
  }

  /** Traduce nombres internos de campos a etiquetas legibles para el usuario */
  private fieldHumanName(key: string): string {
    const map: { [k: string]: string } = {
      oficina: 'Oficina',
      tipoDoc: 'Tipo de Documento',
      numeroCedula: 'Número de Documento',
      fechaExpedicionCC: 'Fecha de Expedición',
      departamentoExpedicionCC: 'Departamento de Expedición',
      municipioExpedicionCC: 'Ciudad de Expedición',
      pNombre: 'Primer Nombre',
      sNombre: 'Segundo Nombre',
      pApellido: 'Primer Apellido',
      sApellido: 'Segundo Apellido',
      genero: 'Sexo', // etiqueta visible; la clave del control sigue siendo `genero` (contrato con backend)
      fechaNacimiento: 'Fecha de Nacimiento',
      departamentoNacimiento: 'Departamento de Nacimiento',
      municipioNacimiento: 'Ciudad de Nacimiento',
      estadoCivil: 'Estado Civil',
      correoUsuario: 'Usuario del Correo',
      correoDominio: 'Dominio del Correo',
      correo: 'Correo Electrónico',
      numCelular: 'Número de Celular',
      numWha: 'Número de WhatsApp',
      direccionResidencia: 'Dirección de Residencia',
      zonaResidencia: 'Barrio',
      departamento: 'Departamento de Residencia',
      ciudad: 'Ciudad de Residencia',
      tiempoResidenciaZona: 'Cuanto tiempo lleva viviendo en la zona',
      conQuienViveChecks: '¿Con quién vive?',
      escolaridad: 'Grado(s) de escolaridad',
      expectativasVidaChecks: '¿Cómo se proyecta?',
      rh: 'Tipo de Sangre (RH)',
      lateralidad: 'Mano Dominante',
      tallaChaqueta: 'Talla de Chaqueta',
      tallaPantalon: 'Talla de Pantalón',
      tallaCamisa: 'Talla de Camisa',
      tallaCalzado: 'Talla de Calzado',
      lugarAnteriorResidencia: 'Lugar Anterior de Residencia',
      razonCambioResidencia: 'Razón de Cambio de Residencia',
      familiarEmergencia: 'Contacto de Emergencia (Nombre)',
      emergenciaPrimerNombre: 'Primer nombre del Contacto',
      emergenciaSegundoNombre: 'Segundo nombre del Contacto',
      emergenciaPrimerApellido: 'Primer apellido del Contacto',
      emergenciaSegundoApellido: 'Segundo apellido del Contacto',
      departamentoEmergencia: 'Departamento del Contacto',
      municipioEmergencia: 'Municipio del Contacto',
      departamentoResidenciaAnterior: 'Departamento anterior',
      municipioResidenciaAnterior: 'Municipio anterior',
      barrioResidenciaAnterior: 'Barrio anterior',
      direccionResidenciaAnterior: 'Dirección de residencia anterior',
      parentescoFamiliarEmergencia: 'Parentesco del Contacto',
      telefonoFamiliarEmergencia: 'Teléfono del Contacto',
      direccionFamiliarEmergencia: 'Dirección de residencia del Contacto',
      estudiaActualmente: '¿Estudia Actualmente?',
      nombresConyuge: 'Nombres del Cónyuge',
      apellidosConyuge: 'Apellidos del Cónyuge',
      viveConyuge: '¿Vive con el Cónyuge?',
      documentoIdentidadConyuge: 'Documento del Cónyuge',
      direccionConyuge: 'Dirección del Cónyuge',
      barrioMunicipioConyugue: 'Barrio / Municipio del Cónyuge',
      telefonoConyuge: 'Teléfono del Cónyuge',
      nombrePadre: 'Nombre del Padre',
      elPadreVive: '¿El Padre Vive?',
      direccionPadre: 'Dirección del Padre',
      barrioPadre: 'Barrio del Padre',
      telefonoPadre: 'Teléfono del Padre',
      nombreMadre: 'Nombre de la Madre',
      madreVive: '¿La Madre Vive?',
      direccionMadre: 'Dirección de la Madre',
      barrioMadre: 'Barrio de la Madre',
      telefonoMadre: 'Teléfono de la Madre',
      nombreReferenciaPersonal1: 'Referencia Personal 1 (Nombre)',
      telefonoReferencia1: 'Referencia Personal 1 (Teléfono)',
      parentescoReferenciaPersonal1: 'Referencia Personal 1 (Parentesco)',
      nombreReferenciaPersonal2: 'Referencia Personal 2 (Nombre)',
      telefonoReferencia2: 'Referencia Personal 2 (Teléfono)',
      parentescoReferenciaPersonal2: 'Referencia Personal 2 (Parentesco)',
      nombreReferenciaFamiliar1: 'Referencia Familiar 1 (Nombre)',
      telefonoReferenciaFamiliar1: 'Referencia Familiar 1 (Teléfono)',
      parentescoReferenciaFamiliar1: 'Referencia Familiar 1 (Parentesco)',
      nombreReferenciaFamiliar2: 'Referencia Familiar 2 (Nombre)',
      telefonoReferenciaFamiliar2: 'Referencia Familiar 2 (Teléfono)',
      parentescoReferenciaFamiliar2: 'Referencia Familiar 2 (Parentesco)',
      experienciaLaboral: '¿Tiene Experiencia Laboral?',
      familiaSolo: '¿Familia con un solo ingreso?',
      personas_a_cargo: 'Personas a Cargo',
      tiposViviendaChecks: 'Tipo de Vivienda',
      numeroHabitaciones: 'Número de Habitaciones',
      personasPorHabitacion: 'Personas por Habitación',
      caracteristicasVivienda: 'Características de la Vivienda',
      comodidadesChecks: 'Servicios / Comodidades',
      fuenteVacante: '¿Cómo se enteró de la vacante?',
      numHijosDependientes: 'Número de Hijos',
      zonasConocidas: 'Zonas que Conoce',
      ocupacionFamiliarEmergencia: 'Ocupación del Contacto de Emergencia',
      barrioFamiliarEmergencia: 'Barrio del Contacto de Emergencia',
      nombreInstitucion: 'Institución Educativa',
      anoFinalizacion: 'Fecha de Finalización de Estudios',
      tituloObtenido: 'Título Obtenido',
      estudiosExtrasSelect: 'Otros Estudios',
      nivelEducacionSuperior: 'Nivel de educación superior',
      carreraEstudio: 'Carrera / estudio',
      ocupacionConyuge: 'Ocupación del Cónyuge',
      ocupacionPadre: 'Ocupación del Padre',
      ocupacionMadre: 'Ocupación de la Madre',
      ocupacionReferencia1: 'Referencia Personal 1 (Ocupación)',
      ocupacionReferencia2: 'Referencia Personal 2 (Ocupación)',
      direccionReferenciaPersonal1: 'Referencia Personal 1 (Dirección)',
      direccionReferenciaPersonal2: 'Referencia Personal 2 (Dirección)',
      tiempoConoceReferenciaPersonal1: 'Referencia Personal 1 (Tiempo de conocerlo)',
      tiempoConoceReferenciaPersonal2: 'Referencia Personal 2 (Tiempo de conocerlo)',
      ocupacionReferenciaFamiliar1: 'Referencia Familiar 1 (Ocupación)',
      ocupacionReferenciaFamiliar2: 'Referencia Familiar 2 (Ocupación)',
      direccionReferenciaFamiliar1: 'Referencia Familiar 1 (Dirección)',
      direccionReferenciaFamiliar2: 'Referencia Familiar 2 (Dirección)',
      nombreEmpresa1: 'Nombre de la Empresa',
      departamentoEmpresa1: 'Departamento de la Empresa',
      municipioEmpresa1: 'Municipio de la Empresa',
      barrioEmpresa1: 'Barrio de la Empresa',
      telefonosEmpresa1: 'Teléfono de la Empresa',
      direccionEmpresa1: 'Dirección de la Empresa',
      nombreJefe1: 'Jefe Inmediato',
      jefePrimerNombre1: 'Primer nombre del Jefe Inmediato',
      jefePrimerApellido1: 'Primer apellido del Jefe Inmediato',
      cargoJefe1: 'Cargo del Jefe Inmediato',
      telefonoJefe1: 'Teléfono del Jefe / Referencia',
      cargoEmpresa1: 'Cargo Desempeñado por el Candidato',
      areaExperiencia: 'Áreas de Experiencia',
      fechaRetiro1: 'Fecha de Retiro',
      tiempoExperiencia: 'Tiempo de Experiencia',
      motivoRetiro1: 'Motivo de Retiro',
      empresas_laborado: 'Otras Empresas',
      cuidadorHijos: '¿Quién cuida a los hijos?',
      hijos: 'Datos de los Hijos',
      hojaDeVida: 'Hoja de Vida (PDF)',
      // RF-040: nombres estructurados de padre/madre/referencias.
      padrePrimerNombre: 'Primer nombre del Padre',
      padreSegundoNombre: 'Segundo nombre del Padre',
      padrePrimerApellido: 'Primer apellido del Padre',
      padreSegundoApellido: 'Segundo apellido del Padre',
      madrePrimerNombre: 'Primer nombre de la Madre',
      madreSegundoNombre: 'Segundo nombre de la Madre',
      madrePrimerApellido: 'Primer apellido de la Madre',
      madreSegundoApellido: 'Segundo apellido de la Madre',
      refPersonal1PrimerNombre: 'Referencia Personal 1 (Primer nombre)',
      refPersonal1PrimerApellido: 'Referencia Personal 1 (Primer apellido)',
      refPersonal2PrimerNombre: 'Referencia Personal 2 (Primer nombre)',
      refPersonal2PrimerApellido: 'Referencia Personal 2 (Primer apellido)',
      refFamiliar1PrimerNombre: 'Referencia Familiar 1 (Primer nombre)',
      refFamiliar1PrimerApellido: 'Referencia Familiar 1 (Primer apellido)',
      refFamiliar2PrimerNombre: 'Referencia Familiar 2 (Primer nombre)',
      refFamiliar2PrimerApellido: 'Referencia Familiar 2 (Primer apellido)',
      // RF-036 (familia): territorio de las direcciones del paso Familia.
      departamentoConyuge: 'Departamento del Cónyuge',
      municipioConyuge: 'Municipio del Cónyuge',
      departamentoPadre: 'Departamento del Padre',
      municipioPadre: 'Municipio del Padre',
      departamentoMadre: 'Departamento de la Madre',
      municipioMadre: 'Municipio de la Madre',
      departamentoRefPersonal1: 'Referencia Personal 1 (Departamento)',
      municipioRefPersonal1: 'Referencia Personal 1 (Municipio)',
      departamentoRefPersonal2: 'Referencia Personal 2 (Departamento)',
      municipioRefPersonal2: 'Referencia Personal 2 (Municipio)',
      departamentoRefFamiliar1: 'Referencia Familiar 1 (Departamento)',
      municipioRefFamiliar1: 'Referencia Familiar 1 (Municipio)',
      departamentoRefFamiliar2: 'Referencia Familiar 2 (Departamento)',
      municipioRefFamiliar2: 'Referencia Familiar 2 (Municipio)',
    };
    return map[key] || key;
  }

  // Public accessor for Hijos FormArray
  get hijosFormArray(): FormArray {
    return this.formHojaDeVida2.get('hijos') as FormArray;
  }

  /**
   * RF-037: etiqueta legible del grado de escolaridad ya elegido en el pre-registro.
   * Se muestra readonly en el detalle académico para no volver a pedir el mismo nivel;
   * si el usuario vuelve atrás y cambia el grado, esta etiqueta se recalcula sola.
   */
  get escolaridadSeleccionadaLabel(): string {
    const code = String(this.formHojaDeVida2?.get('escolaridad')?.value || '').trim();
    if (!code) return '';
    const opt = this.listaEscolaridadOpts.find(o => o.codigo === code);
    const sup = String(this.formHojaDeVida2?.get('nivelEducacionSuperior')?.value || '').trim();
    const base = opt?.label || code;
    return code === 'OTROS' && sup ? `${base} — ${sup}` : base;
  }




}
