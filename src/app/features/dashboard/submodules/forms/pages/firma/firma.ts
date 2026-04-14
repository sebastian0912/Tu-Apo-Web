import { 
  Component, OnInit
, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Title, Meta, DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../../../../../shared/shared-module';
import { CandidatoNewS } from '../../../../../../shared/services/candidato-new/candidato-new-s';
import { DocumentManagementS } from '../../../../../../shared/services/document-management-s/document-management-s';
import { FullScreenSignatureComponent } from '../../components/full-screen-signature/full-screen-signature.component';
import jsPDF from 'jspdf';
import autoTable, { RowInput } from 'jspdf-autotable';
import { PDFDocument } from 'pdf-lib';
import { firstValueFrom, of } from 'rxjs';
import { take, catchError } from 'rxjs/operators';
import { CandidateS } from '../../../../../../shared/services/candidate-s/candidate-s';

interface CandidateData {
  primer_nombre?: string;
  segundo_nombre?: string;
  primer_apellido?: string;
  segundo_apellido?: string;
  numero_documento?: string;
  fecha_nacimiento?: string;
  sexo?: string;
  genero?: string;
  estado_civil?: string;
  info_cc?: {
    numero_documento?: string;
    mpio_expedicion?: string;
    mpio_nacimiento?: string;
  };
  contacto?: {
    celular?: string;
    telefono?: string;
  };
  residencia?: {
    direccion?: string;
    barrio?: string;
    municipio?: string;
  };
  vivienda?: {
    tipo_vivienda_alt?: string;
    tipo_vivienda?: string;
    responsable_hijos?: string;
  };
  biometria?: {
    firma?: { file_url?: string; file?: string };
    huella?: { file_url?: string; file?: string };
    foto?: { file_url?: string; file?: string };
  };
  entrevistas?: any[];
  experiencias?: any[];
  [k: string]: any;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-firma',
  standalone: true,
  imports: [SharedModule, ReactiveFormsModule, CommonModule, FullScreenSignatureComponent],
  templateUrl: './firma.html',
  styleUrls: ['./firma.css'],
} )
export class Firma implements OnInit {
  form: FormGroup;
  searching = false;
  saving = false;

  // Estado del modal full screen
  showSignatureModal = false;

  // Preview de la firma capturada
  signaturePreview: string | null = null;

  // Mostrar nombre completo cuando exista el registro
  nombreCompleto: string | null = null;

  // Estado: firma guardada exitosamente
  firmaSaved = false;

  // Dialog de documentos
  showDocumentsDialog = false;

  // ── Consentimiento Biométrico (Ley 1581 de 2012) ──
  private static readonly EMPRESAS: Record<string, { nombre: string; nit?: string }> = {
    'apoyo-laboral': { nombre: 'APOYO LABORAL T.S. S.A.S.', nit: '900.318.240-1' },
    'tu-alianza': { nombre: 'TU ALIANZA SAS', nit: '901.054.654-7' },
  };

  empresaSlug = 'apoyo-laboral';
  empresaNombre = Firma.EMPRESAS['apoyo-laboral'].nombre;
  TEXTO_CONSENTIMIENTO = '';

  private buildTextoConsentimiento(empresa: string): string {
    return (
      'En cumplimiento de la Ley Estatutaria 1581 de 2012 "Por la cual se dictan disposiciones generales ' +
      'para la protección de datos personales" y su Decreto Reglamentario 1377 de 2013, autorizo de manera ' +
      `libre, expresa, previa e informada a ${empresa} para que realice la recolección, ` +
      'almacenamiento, uso, circulación, supresión y en general, el tratamiento de mis datos biométricos ' +
      '(firma digital) que voluntariamente suministro en este formulario, con la finalidad de formalizar ' +
      'mi vinculación laboral, verificar mi identidad, y cumplir obligaciones legales y contractuales. ' +
      'Declaro que he sido informado(a) de mis derechos como titular de datos personales, incluyendo el ' +
      'derecho a conocer, actualizar, rectificar y solicitar la supresión de mis datos, así como a revocar ' +
      'la autorización otorgada, mediante comunicación dirigida al responsable del tratamiento.'
    );
  }

  // Documentos pre-contratación (carrusel)
  documentosList: { title: string, safeUrl: SafeResourceUrl }[] = [];
  currentDocIndex: number = 0;
  loadingDocs: boolean = false;

  // Guardamos el objeto candidato para poder usar sus datos al generar PDFs
  candidatoData: any = null;

  constructor(
    private fb: FormBuilder,
    private candidateS: CandidatoNewS,
    private legacyCandidateS: CandidateS,
    private route: ActivatedRoute,
    private documentS: DocumentManagementS,
    private sanitizer: DomSanitizer,
    private titleService: Title,
    private metaService: Meta
  ) {
    this.form = this.fb.group({
      numeroCedula: ['', [Validators.required, Validators.pattern(/^\d{5,15}$/)]],
      firmaBase64: [''],
      consentimientoBiometrico: [false, Validators.requiredTrue],
      versionConsentimiento: ['v1.0-2026'],
      timestampConsentimiento: [''],
      userAgent: [''],
      consentimientoHash: [''],
    });
  }

  get f() { return this.form.controls as any; }

  // ───────── Ciclo de vida ─────────
  ngOnInit(): void {
    // ── Detectar empresa desde el parámetro de ruta ──
    const slug = (this.route.snapshot.paramMap.get('empresa') || 'apoyo-laboral').toLowerCase();
    const cfg = Firma.EMPRESAS[slug] ?? Firma.EMPRESAS['apoyo-laboral'];
    this.empresaSlug = slug;
    this.empresaNombre = cfg.nombre;
    this.TEXTO_CONSENTIMIENTO = this.buildTextoConsentimiento(cfg.nombre);

    this.titleService.setTitle(`Firma de Candidato — ${cfg.nombre} | Gestión Gerencial`);
    this.metaService.updateTag({ name: 'description', content: `Página oficial para la firma digital de candidatos — ${cfg.nombre}.` });
    this.metaService.updateTag({ name: 'robots', content: 'noindex, nofollow' });
    this.metaService.updateTag({ name: 'keywords', content: 'firma, candidato, gestión, digital' });
    this.metaService.updateTag({ name: 'author', content: cfg.nombre });
    this.metaService.updateTag({ property: 'og:title', content: `Firma Digital — ${cfg.nombre}` });
    this.metaService.updateTag({ name: 'revised', content: new Date().toISOString() });

    // Consentimiento: autocompletar UserAgent
    this.form.patchValue({ userAgent: navigator.userAgent });
  }

  // ────────────────── HELPERS COMUNES ──────────────────

  private buildNombreCompleto(d?: CandidateData | null): string | null {
    if (!d) return null;
    const parts = [
      d.primer_nombre,
      d.segundo_nombre,
      d.primer_apellido,
      d.segundo_apellido,
    ].map(x => (x ?? '').toString().trim()).filter(Boolean);
    const full = parts.join(' ').replace(/\s+/g, ' ').trim();
    return full || null;
  }

  private dataUrlToFile(dataUrl: string, filename: string): File {
    const m = /^data:([^;]+);base64,(.*)$/.exec(String(dataUrl));
    if (!m) throw new Error('DataURL inválido');
    const mime = m[1] || 'application/octet-stream';
    const bin = atob(m[2]);
    const len = bin.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
    return new File([bytes], filename, { type: mime });
  }

  // ── Hash SHA-256 para consentimiento ──
  private async generateHash(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /** Fetch URL → DataURL (necesario para doc.addImage en jsPDF) */
  private async toDataURL(url?: string): Promise<string | null> {
    if (!url) return null;
    try {
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) throw new Error('fetch fail');
      const b = await r.blob();
      return await new Promise<string>((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => res(String(fr.result));
        fr.onerror = () => rej(new Error('reader fail'));
        fr.readAsDataURL(b);
      });
    } catch {
      return null;
    }
  }

  /** Fetch URL → ArrayBuffer */
  private async fetchAsArrayBufferOrNull(url?: string): Promise<ArrayBuffer | null> {
    if (!url) return null;
    try {
      const r = await fetch(url);
      if (!r.ok) return null;
      return await r.arrayBuffer();
    } catch { return null; }
  }

  /** pdf-lib: embed image from URL or dataURL */
  private async embedImageOrNull(pdfDoc: PDFDocument, urlOrData?: string) {
    if (!urlOrData) return null;
    try {
      const raw = String(urlOrData).trim();
      let ab: ArrayBuffer | null = null;

      // DataURL
      if (/^data:image\//i.test(raw)) {
        const [, b64] = raw.split(',');
        if (!b64) return null;
        const bin = atob(b64);
        const u8 = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        ab = u8.buffer;
      } else {
        ab = await this.fetchAsArrayBufferOrNull(raw);
      }

      if (!ab) return null;

      const bytes = new Uint8Array(ab);
      // Detect PNG vs JPG
      if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
        return await pdfDoc.embedPng(bytes);
      }
      if (bytes.length >= 3 && bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
        return await pdfDoc.embedJpg(bytes);
      }
      return null;
    } catch { return null; }
  }

  /** pdf-lib: set button image safely */
  private async setButtonImageSafe(
    pdfDoc: PDFDocument, form: any, buttonName: string, urlOrData?: string
  ): Promise<boolean> {
    const img = await this.embedImageOrNull(pdfDoc, urlOrData);
    if (!img) return false;
    try { form.getButton(buttonName).setImage(img); return true; }
    catch { return false; }
  }

  /** pdf-lib: set text field safely */
  private setTextSafe(form: any, fieldName: string, value: string, size?: number): void {
    try {
      const field = form.getTextField(fieldName);
      field.setText(value);
      if (size) field.setFontSize(size);
    } catch { /* campo no encontrado */ }
  }

  /** Convierte Uint8Array a ArrayBuffer de forma segura */
  private toSafeArrayBuffer(u8: Uint8Array): ArrayBuffer {
    return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
  }

  private norm(v: any): string {
    return String(v ?? '').trim().toUpperCase();
  }

  // ---------- Búsqueda ----------
  async buscarCedula(): Promise<void> {
    const numeroCedula = (this.form.value.numeroCedula || '').toString().trim();
    if (this.f.numeroCedula.invalid) {
      this.f.numeroCedula.markAsTouched();
      Swal.fire('Error', 'Por favor, ingresa una cédula válida.', 'error');
      return;
    }

    const ok = await Swal.fire({
      title: 'Confirmar búsqueda',
      text: `¿Deseas buscar la cédula ${numeroCedula}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, buscar',
      cancelButtonText: 'Cancelar',
    }).then(r => r.isConfirmed);
    if (!ok) return;

    this.searching = true;
    this.nombreCompleto = null;
    this.documentosList = [];
    this.currentDocIndex = 0;
    Swal.fire({
      icon: 'info',
      title: 'Buscando…',
      text: 'Consultando información del candidato.',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    this.candidateS.getCandidatoPorDocumento(numeroCedula, true).subscribe({
      next: (res: any) => {
        Swal.close();
        this.searching = false;

        let cand: CandidateData | null = null;
        if (Array.isArray(res)) {
          cand = res.length > 0 ? res[0] : null;
        } else if (res && typeof res === 'object') {
          cand = res;
        }

        this.candidatoData = cand;
        this.nombreCompleto = this.buildNombreCompleto(cand);

        if (this.nombreCompleto) {
          Swal.fire('Cédula encontrada', this.nombreCompleto, 'success');
          this.generarPreviews(numeroCedula);
        } else {
          Swal.fire('Cédula encontrada', 'No se pudieron leer nombres.', 'info');
        }
      },
      error: (err) => {
        Swal.close();
        this.searching = false;
        this.nombreCompleto = null;

        const msg: string =
          err?.error?.message ||
          err?.message ||
          'No fue posible realizar la búsqueda. Intenta de nuevo.';

        if (/no se encontraron datos/i.test(msg)) {
          Swal.fire('Cédula no encontrada', 'Procede a llenar el formulario con los datos por favor.', 'success');
        } else {
          Swal.fire('Error', msg, 'error');
        }
      }
    });
  }

  // ══════════════════════════════════════════════════════════
  //  GENERACIÓN DE PREVIEWS (TODOS LOS DOCUMENTOS)
  // ══════════════════════════════════════════════════════════
  async generarPreviews(cedula: string): Promise<void> {
    this.loadingDocs = true;
    this.documentosList = [];

    try {
      const firmaUrl = this.signaturePreview || '';
      const cand = this.candidatoData ?? {};

      // Fetch datos extra de contratación para Formato Solicitud
      let datoContratacion: any = {};
      try {
        const respContratacion: any = await firstValueFrom(
          this.legacyCandidateS.buscarEncontratacion(cedula).pipe(
            take(1),
            catchError((err: any) => {
              console.error('[Firma] Error buscando contratación:', err);
              return of({ data: [] });
            })
          )
        );
        datoContratacion = respContratacion?.data?.[0] ?? {};
      } catch (e) {
        console.error('[Firma] Error obteniendo contratación:', e);
      }

      // 1. Autorización de Datos
      const bufferAutorizacion = await this.generarAutorizacionDatosPreview(cedula, this.empresaNombre, firmaUrl);
      this.pushDocPreview('Autorización de datos', bufferAutorizacion);

      // 2. Entrega de Documentos (solo APOYO LABORAL)
      try {
        const bufferEntrega = await this.generarEntregaDocsPreview(cedula, cand, firmaUrl);
        if (bufferEntrega) this.pushDocPreview('Entrega de documentos', bufferEntrega);
      } catch (e) { console.warn('No se pudo generar Entrega de Documentos:', e); }

      // 3. Ficha Técnica TA Completa (template)
      try {
        const bufferFicha = await this.generarFichaTecnicaTACompleta(cand, firmaUrl);
        if (bufferFicha) this.pushDocPreview('Ficha técnica TA Completa', bufferFicha);
      } catch (e) { console.warn('No se pudo generar Ficha Técnica TA:', e); }

      // 4. Entrega Carnets (template)
      try {
        const bufferCarnets = await this.generarEntregaCarnetsPreview(cand, firmaUrl);
        if (bufferCarnets) this.pushDocPreview('Entrega carnets', bufferCarnets);
      } catch (e) { console.warn('No se pudo generar Entrega Carnets:', e); }

      // 5. Inducción y Capacitación (template)
      try {
        const bufferInduccion = await this.generarInduccionCapacitacionPreview(cand, firmaUrl);
        if (bufferInduccion) this.pushDocPreview('Inducción capacitación', bufferInduccion);
      } catch (e) { console.warn('No se pudo generar Inducción:', e); }

      // 6. Formato Solicitud (template)
      try {
        const bufferFormato = await this.generarFormatoSolicitudPreview(cand, firmaUrl, datoContratacion);
        if (bufferFormato) this.pushDocPreview('Formato solicitud', bufferFormato);
      } catch (e) { console.warn('No se pudo generar Formato Solicitud:', e); }

      this.currentDocIndex = 0;
    } catch (error) {
      console.error('Error generando previews:', error);
      Swal.fire('Error', 'No se pudieron generar los documentos de vista previa.', 'error');
    } finally {
      this.loadingDocs = false;
    }
  }

  private pushDocPreview(title: string, buffer: ArrayBuffer): void {
    const blob = new Blob([buffer], { type: 'application/pdf' });
    this.documentosList.push({
      title,
      safeUrl: this.sanitizer.bypassSecurityTrustResourceUrl(URL.createObjectURL(blob))
    });
  }

  // ══════════════════════════════════════════════════════════
  //  1. AUTORIZACIÓN DE DATOS (jsPDF)
  // ══════════════════════════════════════════════════════════
  async generarAutorizacionDatosPreview(cedula: string, empresaSeleccionada: string, firmaBase64: string): Promise<ArrayBuffer> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    doc.setProperties({
      title: `${empresaSeleccionada}_Autorizacion_Datos.pdf`,
      author: empresaSeleccionada,
      creator: empresaSeleccionada,
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Título
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(
      'AUTORIZACIÓN PARA EL TRATAMIENTO DE DATOS PERSONALES DE CANDIDATOS',
      pageWidth / 2,
      30,
      { align: 'center' }
    );

    const margenIzquierdo = 10;
    const margenDerecho = 10;
    const anchoTexto = pageWidth - margenIzquierdo - margenDerecho;

    const parrafos = [
      `${empresaSeleccionada}, tratará sus datos personales, consistentes en, pero sin limitarse a, su nombre, información de contacto, fecha y lugar de nacimiento, número de identificación, estado civil, dependientes, fotografía, antecedentes de educación y empleo, referencias personales y laborales, información sobre visas y antecedentes judiciales ("Información Personal") con el fin de (1) evaluarlo como potencial empleado de ${empresaSeleccionada}; (2) evaluar y corroborar la información contenida en su hoja de vida e información sobre la experiencia profesional y trayectoria académica (3) almacenar y clasificar su Información Personal para facilitar su acceso;`,
      `(4) proporcionar información a las autoridades competentes cuando medie requerimiento de dichas autoridades en ejercicio de sus funciones y facultades legales, en cumplimiento de un deber legal o para proteger los derechos de ${empresaSeleccionada}; (5) proporcionar información a auditores internos o externos en el marco de las finalidades aquí descritas; (6) dar a conocer la realización de eventos de interés o de nuevas convocatorias para otros puestos de trabajo; (7) verificar la información aportada y adelantar todas las actuaciones necesarias, incluida la revisión de la información aportada por usted en las distintas listas de riesgos para prevenir los riesgos para ${empresaSeleccionada} a lavado de activos, financiación del terrorismo y asuntos afines, dentro del marco de implementación de su SAGRILAFT; y todas las demás actividades que sean compatibles con estas finalidades.`,
      `Para poder cumplir con las finalidades anteriormente expuestas, ${empresaSeleccionada} requiere tratar los siguientes datos personales suyos que son considerados como sensibles: género, datos biométricos y datos relacionados con su salud ("Información Personal Sensible"). Usted tiene derecho a autorizar o no la recolección y tratamiento de su Información Personal Sensible por parte de ${empresaSeleccionada} y sus encargados. No obstante, si usted no autoriza a ${empresaSeleccionada} a recolectar y hacer el tratamiento de esta Información Personal Sensible, ${empresaSeleccionada} no podrá cumplir con las finalidades del tratamiento descritas anteriormente.`,
      `Asimismo, usted entiende y autoriza a ${empresaSeleccionada} para que verifique, solicite y/o consulte su Información Personal en listas de riesgo, incluidas restrictivas y no restrictivas, así como vinculantes y no vinculantes para Colombia, a través de cualquier motor de búsqueda tales como, pero sin limitarse a, las plataformas de los entes Administradores del Sistema de Seguridad Social Integral, las Autoridades Judiciales y de Policía Nacional, la Procuraduría General de la República, la Contraloría General de la Nación o cualquier otra fuente de información legalmente constituida y/o a través de otros motores de búsqueda diseñados con miras a verificar su situación laboral actual, sus aptitudes académicas y demás información pertinente para los fines antes señalados. ${empresaSeleccionada} realizará estas gestiones directamente, o a través de sus filiales o aliados estratégicos con quienes acuerde realizar estas actividades. ${empresaSeleccionada} podrá adelantar el proceso de consulta, a partir de su Información Personal, a través de la base de datos de la Policía Nacional, Contraloría General de la República, Contraloría General de la Nación, OFAC Sanctions List Search y otras similares.`,
      `Asimismo, usted entiende que ${empresaSeleccionada} podrá transmitir su Información Personal e Información Personal Sensible, a (i) otras oficinas del mismo grupo corporativo de ${empresaSeleccionada}, incluso radicadas en diferentes jurisdicciones que no comporten niveles de protección de datos equivalentes a los de la legislación colombiana y a (ii) terceros a los que ${empresaSeleccionada} les encargue el tratamiento de su Información Personal e Información Personal Sensible.`,
      `De igual forma, como titular de su Información Personal e Información Personal Sensible, usted tiene derecho, entre otras, a conocer, actualizar, rectificar y a solicitar la supresión de la misma, así como a solicitar prueba de esta autorización, en cualquier tiempo, y mediante comunicación escrita dirigida al correo electrónico: protecciondedatos@tsservicios.co de acuerdo al procedimiento previsto en los artículos 14 y 15 de la Ley 1581 de 2012.`,
      `En virtud de lo anterior, con su firma, ${empresaSeleccionada} podrá recolectar, almacenar, usar y en general realizar el tratamiento de su Información Personal e Información Personal Sensible, para las finalidades anteriormente expuestas, en desarrollo de la Política de Tratamiento de Datos Personales de la Firma, la cual puede ser solicitada a través de: correo electrónico protecciondedatos@tsservicios.co.`
    ];

    doc.setFontSize(8.2);
    doc.setFont('helvetica', 'normal');
    let cursorY = 40;
    const lineHeight = 1.4 * 8.2 * 0.352777;

    parrafos.forEach(texto => {
      const lines = doc.splitTextToSize(texto.trim().replace(/\s+/g, ' '), anchoTexto);
      lines.forEach((ln: string) => {
        doc.text(ln, margenIzquierdo, cursorY);
        cursorY += lineHeight;
      });
      cursorY += 1.5;
    });

    const yFirmaBase = pageHeight - 24;
    doc.line(10, yFirmaBase, 100, yFirmaBase);

    if (firmaBase64) {
      doc.addImage(firmaBase64, 'PNG', 10, yFirmaBase - 30, 80, 28);
    }

    doc.setFont('helvetica', 'bold');
    doc.text('Firma de Autorización', 10, yFirmaBase + 3);
    doc.setFont('helvetica', 'normal');

    doc.text(`Número de Identificación: ${cedula}`, 10, yFirmaBase + 7);

    const fechaFormat = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`Fecha de Autorización: ${fechaFormat}`, 10, yFirmaBase + 11);

    return doc.output('arraybuffer');
  }

  // ══════════════════════════════════════════════════════════
  //  2. ENTREGA DE DOCUMENTOS (jsPDF)
  // ══════════════════════════════════════════════════════════
  async generarEntregaDocsPreview(cedula: string, cand: any, firmaBase64: string): Promise<ArrayBuffer | null> {
    // ───────── Helpers ─────────
    const H_CENTER = 'center' as const;
    const BOLD = 'bold' as const;
    const ITALIC = 'italic' as const;

    const toDataURL = async (url?: string): Promise<string | null> => {
      if (!url) return null;
      try {
        const r = await fetch(url, { cache: 'no-store' });
        if (!r.ok) throw new Error('fetch fail');
        const b = await r.blob();
        return await new Promise<string>((res, rej) => {
          const fr = new FileReader();
          fr.onload = () => res(String(fr.result));
          fr.onerror = () => rej(new Error('reader fail'));
          fr.readAsDataURL(b);
        });
      } catch {
        return null; // si no carga, omitimos la imagen
      }
    };

    const renderJustifiedLine = (
      doc: jsPDF,
      linea: string,
      x: number,
      y: number,
      anchoDisponible: number,
      ultimaLinea: boolean
    ) => {
      const palabras = linea.split(' ').filter(Boolean);
      if (palabras.length <= 1 || ultimaLinea) { doc.text(linea, x, y); return; }
      const widths = palabras.map(p => doc.getTextWidth(p));
      const totalPalabras = widths.reduce((a, b) => a + b, 0);
      const espacios = palabras.length - 1;
      const extra = (anchoDisponible - totalPalabras) / espacios;
      let cursorX = x;
      palabras.forEach((p, i) => {
        doc.text(p, cursorX, y);
        if (i < espacios) cursorX += widths[i] + extra;
      });
    };

    // ───────── PDF base y layout ─────────
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    doc.setProperties({
      title: 'Apoyo_Laboral_Entrega_Documentos.pdf',
      author: this.empresaNombre,
      creator: this.empresaNombre,
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const leftMargin = 10;
    const rightMargin = 10;
    const contentWidth = pageWidth - leftMargin - rightMargin;

    let y = 10; // cursor vertical global
    const marginLeft = leftMargin;

    // ───────── Encabezado (logo + tabla) ─────────
    const startX = leftMargin;
    const startY = y;
    const headerHeight = 13;
    const logoBoxWidth = 50;
    const tableWidth = contentWidth;

    // Cuadro de logo/NIT
    doc.setLineWidth(0.1);
    doc.rect(startX, startY, logoBoxWidth, headerHeight);

    // Logo (si no carga, se omite)
    const logoData = await toDataURL('logos/Logo_AL.png');
    if (logoData) {
      doc.addImage(logoData, 'PNG', startX + 2, startY + 1.5, 27, 10);
    }

    // NIT
    doc.setFontSize(7);

    // Tabla derecha del encabezado
    const tableStartX = startX + logoBoxWidth;
    const rightHeaderWidth = tableWidth - logoBoxWidth;
    doc.rect(tableStartX, startY, rightHeaderWidth, headerHeight);

    doc.setFont('helvetica', 'bold');
    doc.text('PROCESO DE CONTRATACIÓN', tableStartX + 54, startY + 3);
    doc.text('ENTREGA DE DOCUMENTOS Y AUTORIZACIONES', tableStartX + 44, startY + 7);

    // Líneas y columnas
    const h1Y = startY + 4;
    const h2Y = startY + 8;
    doc.line(tableStartX, h1Y, tableStartX + rightHeaderWidth, h1Y);
    doc.line(tableStartX, h2Y, tableStartX + rightHeaderWidth, h2Y);

    const col1 = tableStartX + 30;
    const col2 = tableStartX + 50;
    const col3 = tableStartX + 110;

    doc.line(col1, h2Y, col1, startY + headerHeight);
    doc.line(col2, h2Y, col2, startY + headerHeight);
    doc.line(col3, h2Y, col3, startY + headerHeight);

    // Contenido columnas
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('Código: AL CO-RE-6', tableStartX + 2, startY + 11.5);
    doc.text('Versión: 23', col1 + 2, startY + 11.5);
    doc.text('Fecha Emisión: Julio 9-25', col2 + 5, startY + 11.5);
    doc.text('Página: 1 de 1', col3 + 6, startY + 11.5);

    y = startY + headerHeight + 7;

    // ───────── Intro ─────────
    doc.setFontSize(8).setFont('helvetica', 'normal');
    const maxWidth = contentWidth;
    const intro = 'Reciba un cordial saludo, por medio del presente documento afirmo haber recibido, leído y comprendido los documentos relacionados a continuación:';
    doc.text(intro, marginLeft, y, { maxWidth });
    doc.setFontSize(7);
    y += 4;

    // Lista 1) 2)
    const lista = [
      'Copia del Contrato individual de Trabajo',
      'Inducción General de nuestra Compañía e Información General de la Empresa Usuaria el cual incluye información sobre:'
    ];
    lista.forEach((item, index) => {
      const numero = `${index + 1}) `;
      doc.setFont('helvetica', 'bold'); doc.text(numero, marginLeft, y);
      doc.setFont('helvetica', 'normal');
      const numW = doc.getTextWidth(numero);
      doc.text(item, marginLeft + numW, y);
      y += 5;
    });

    // Subtítulo tabla
    doc.setFontSize(8).setFont('helvetica', 'bold');
    doc.text(
      'Fechas de Pago de Nómina y Valor del almuerzo que es descontado por Nómina o Liquidación final:',
      marginLeft + 20,
      y
    );
    const startYForTable = y + 3;

    // ───────── Tabla (autotable) ─────────
    const head: RowInput[] = [[
      { content: 'EMPRESA USUARIA', styles: { halign: H_CENTER, fontStyle: BOLD, fillColor: [255, 128, 0], textColor: 255 } },
      { content: 'FECHA DE PAGO', styles: { halign: H_CENTER, fontStyle: BOLD, fillColor: [255, 128, 0], textColor: 255 } },
      { content: 'SERVICIO DE CASINO', styles: { halign: H_CENTER, fontStyle: BOLD, fillColor: [255, 128, 0], textColor: 255 } }
    ]];

    const body: RowInput[] = [
      [
        { content: 'The Elite Flower S.A.S C.I *\nFundación Fernando Borrero Caicedo', styles: { fontStyle: ITALIC, fontSize: 6.5, halign: H_CENTER } },
        { content: '01 y 16 de cada mes', styles: { fontSize: 6.5, halign: H_CENTER } },
        { content: 'Valor de Almuerzo $ 1,945\nDescuento quincenal por nómina y/o Liquidación Final', styles: { fontSize: 6.5, halign: H_CENTER } }
      ],
      [
        { content: 'Luisiana Farms S.A.S.', styles: { fontStyle: ITALIC, fontSize: 6.5, halign: H_CENTER } },
        { content: '01 y 16 de cada mes', styles: { fontSize: 6.5, halign: H_CENTER } },
        { content: 'Valor de Almuerzo $ 3,700\nDescuento quincenal por nómina y/o Liquidación Final', styles: { fontSize: 6.5, halign: H_CENTER } }
      ],
      [
        { content: 'Petalia S.A.S', styles: { fontStyle: ITALIC, fontSize: 6.5, halign: H_CENTER } },
        { content: '01 y 16 de cada mes', styles: { fontSize: 6.5, halign: H_CENTER } },
        { content: 'No cuenta con servicio de casino, se debe llevar el almuerzo', styles: { fontSize: 6.5, halign: H_CENTER } }
      ],
      [
        { content: 'Fantasy Flower S.A.S. \nMercedes S.A.S. \nWayuu Flowers S.A.S', styles: { fontStyle: ITALIC, fontSize: 6.5, halign: H_CENTER } },
        { content: '06 y 21 de cada mes', styles: { fontSize: 6.5, halign: H_CENTER } },
        { content: 'Valor de Almuerzo $ 1,945 \n Descuento quincenal por nómina y/o Liquidación Final', styles: { fontSize: 6.5, halign: H_CENTER } }
      ]
    ];

    autoTable(doc, {
      head, body,
      startY: startYForTable,
      theme: 'grid',
      margin: { left: leftMargin, right: rightMargin },
      styles: { font: 'helvetica', fontSize: 6.5, cellPadding: { top: 1.2, bottom: 1.2, left: 2, right: 2 } },
      headStyles: { lineWidth: 0.2, lineColor: [120, 120, 120] },
      bodyStyles: { lineWidth: 0.2, lineColor: [180, 180, 180], valign: 'middle' },
      columnStyles: { 0: { cellWidth: 95 }, 1: { cellWidth: 45 }, 2: { cellWidth: 'auto' as const } },
    });

    const finalY = (doc as any).lastAutoTable?.finalY ?? (startYForTable + 30);
    doc.setDrawColor(0).setLineWidth(0.2);
    doc.line(leftMargin, finalY, pageWidth - rightMargin, finalY);

    y = finalY + 4;

    // Notas
    doc.setFontSize(7).setFont('helvetica', 'normal');
    const noteMaxW = contentWidth;
    const nota1 = 'Nota: * Para los centros de costo de la empresa usuaria The Elite Flower S.A.S. C.I.: Carnations, Florex, Jardines de Colombia Normandía, Tinzuque, Tikya, Chuzacá; su fecha de pago son 06 y 21 de cada mes.';
    const nota2 = '** Para los centros de costo de la empresa usuaria Wayuu Flowers S.A.S.: Pozo Azul, Postcosecha Excellence, Belchite; su fecha de pago son 01 y 16 de cada mes.';

    const l1 = doc.splitTextToSize(nota1, noteMaxW) as string[];
    doc.text(l1, marginLeft, y); y += l1.length * 4;

    const l2 = doc.splitTextToSize(nota2, noteMaxW) as string[];
    doc.text(l2, marginLeft, y); y += l2.length * 4;

    // Autorización casino
    doc.setFontSize(8).setFont('helvetica', 'bold');
    doc.text('Teniendo en cuenta la anterior información, autorizo descuento de casino:', marginLeft, y);
    doc.setFont('helvetica', 'normal');
    doc.text('SI (  X  )', 130, y);
    doc.text('NO (     )', 155, y);
    doc.text('No aplica (     )', 175, y);

    // Forma de pago
    y += 5;
    doc.setFont('helvetica', 'bold').setFontSize(7);
    doc.text('3) FORMA DE PAGO:', marginLeft, y);
    y += 5;

    const contrato = cand?.entrevistas?.[0]?.proceso?.contrato || {};
    const formaPagoSeleccionada: string = contrato?.forma_de_pago ?? '';
    const numeroPagos: string = contrato?.numero_para_pagos ?? '';

    const opciones = [
      { nombre: 'Daviplata', x: marginLeft, y: y },
      { nombre: 'Davivienda cta ahorros', x: marginLeft + 20, y: y },
      { nombre: 'Davivienda Tarjeta Master', x: marginLeft + 60, y: y },
      { nombre: 'Otra', x: marginLeft + 105, y: y },
    ];

    opciones.forEach((op) => {
      doc.rect(op.x, op.y - 3, 4, 4);
      doc.setFont('helvetica', 'normal').text(op.nombre, op.x + 6, op.y);
      if (formaPagoSeleccionada === op.nombre) {
        doc.setFont('helvetica', 'bold').text('X', op.x + 1, op.y);
      }
    });

    doc.text('¿Cuál?', 130, y);
    doc.line(140, y, 200, y);
    if (formaPagoSeleccionada === 'Otra') {
      doc.text('Especificar aquí...', 150, y + 10);
    }

    // Número TJT / Código
    y += 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold').text('Número TJT ó Celular:', marginLeft, y);
    doc.text('Código de Tarjeta:', 110, y);
    doc.setFont('helvetica', 'normal');
    if (formaPagoSeleccionada === 'Daviplata') {
      doc.text(String(numeroPagos), 60, y);
    } else {
      doc.text(String(numeroPagos), 150, y);
    }

    // IMPORTANTE (justificado)
    y += 5;
    doc.setFont('helvetica', 'bold').setFontSize(7);
    const importante =
      'IMPORTANTE: Recuerde que si usted cuenta con su forma de pago Daviplata, cualquier cambio realizado en la misma debe ser notificado a la Emp. Temporal. También tenga presente que la entrega de la tarjeta Master por parte de la Emp. Temporal es provisional, y se reemplaza por la forma de pago DAVIPLATA; tan pronto Davivienda nos informa que usted activó su DAVIPLATA, se le genera automáticamente el cambio de forma de pago. CUIDADO! El manejo de estas cuentas es responsabilidad de usted como trabajador, por eso son personales e intransferibles.';
    const anchoJust = contentWidth, margenJust = marginLeft, lineHeight = 3;
    doc.setFont('helvetica', 'normal');
    const lineas = doc.splitTextToSize(importante.trim().replace(/\s+/g, ' '), anchoJust) as string[];
    lineas.forEach((ln, i) => {
      const last = i === lineas.length - 1;
      renderJustifiedLine(doc, ln, margenJust, y, anchoJust, last);
      y += lineHeight;
    });

    // Acepto cambio
    y += 5;
    doc.setFont('helvetica', 'bold').setFontSize(8);
    doc.text('ACEPTO CAMBIO SIN PREVIO AVISO YA QUE HE SIDO INFORMADO (A):', marginLeft, y - 4);
    doc.setFont('helvetica', 'normal');
    doc.text('SI (  x  )', 170, y - 4);
    doc.text('NO (     )', 190, y - 4);
    doc.setFontSize(6.5);

    // Contenido final numerado
    const contenidoFinal = [
      { numero: '4)', texto: 'Entrega y Manejo del Carné de la Empresa de Servicios Temporales APOYO LABORAL TS S.A.S.' },
      { numero: '5)', texto: 'Capacitación de Ley 1010 DEL 2006 (Acosos laboral) y mecanismo para interponer una queja general o frente al acoso.' },
      { numero: '6)', texto: 'Socialización de las políticas vigentes y aplicables de la Empresa Temporal.' },
      { numero: '7)', texto: 'Curso de Seguridad y Salud en el Trabajo "SST" de la Empresa Temporal.' },
      {
        numero: '8)',
        texto: 'Se hace entrega de la documentación requerida para la vinculación de beneficiarios a la Caja de Compensación Familiar y se establece compromiso de 15 días para la entrega sobre la documentación para afiliación de beneficiarios a la Caja de Compensación y EPS si aplica.\nDe lo contrario se entenderá que usted no desea recibir este beneficio, recuerde que es su responsabilidad el registro de los mismos.'
      },
      {
        numero: '9)',
        texto: 'Plan funeral Coorserpark: AUTORIZO la afiliación y descuento VOLUNTARIO al plan, por un valor de $4.095 descontados quincenalmente por Nómina. La afiliación se hace efectiva a partir del primer descuento.'
      }
    ];

    const bottomSafe = 12;
    const ensureSpace = (need: number) => {
      if (y + need > pageHeight - bottomSafe) { doc.addPage(); y = 15; }
    };

    doc.setFontSize(7);
    contenidoFinal.forEach((item) => {
      ensureSpace(10);
      doc.setFont('helvetica', 'bold').text(item.numero, marginLeft, y);
      doc.setFont('helvetica', 'normal');
      const textoLineas = doc.splitTextToSize(item.texto, contentWidth) as string[];
      doc.text(textoLineas, marginLeft + 10, y);
      y += textoLineas.length * 4 + 1;
    });

    // SI / NO del seguro
    const seguro = !!contrato?.seguro_funerario;
    if (seguro) {
      doc.text('SI (  x  )', 170, y - 4);
      doc.text('NO (     )', 190, y - 4);
    } else {
      doc.text('SI (     )', 170, y - 4);
      doc.text('NO (  x  )', 190, y - 4);
    }

    // Nota
    doc.setFont('helvetica', 'bold').text('Nota:', marginLeft, y + 1);
    doc.setFont('helvetica', 'normal').setFontSize(7).text(
      'Si usted autorizó este descuento debe presentar una carta en la oficina de la Temporal solicitando el retiro, para la desafiliación de este plan.',
      marginLeft + 10,
      y + 1,
      { maxWidth: contentWidth - 10 }
    );

    // Banner "Recuerde que:"
    y += 5;
    ensureSpace(10);
    doc.setFillColor(230, 230, 230);
    doc.rect(marginLeft, y - 2, contentWidth, 5, 'F');
    doc.setFont('helvetica', 'bold').setFontSize(7.5).setTextColor(0, 0, 0);
    doc.text('Recuerde que:', marginLeft + 2, y + 1);
    doc.setFont('helvetica', 'normal').setTextColor(0, 0, 0);
    doc.text('Puede encontrar esta información disponible en:', marginLeft + 25, y + 1);
    doc.setTextColor(0, 0, 255);
    doc.textWithLink('http://www.apoyolaboralts.com/', marginLeft + 95, y + 1, { url: 'http://www.apoyolaboralts.com/' });
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('Ingresando la clave:', marginLeft + 145, y + 1);
    doc.setFont('helvetica', 'bold').setFontSize(8);
    doc.text('9876', marginLeft + 180, y + 1);

    // DEL COLABORADOR
    y += 8;
    ensureSpace(20);

    const contenidoFinalColaborador = [
      { numero: 'a)', texto: 'Por medio de la presente manifiesto que recibí lo anteriormente mencionado y que acepto el mismo.' },
      { numero: 'b)', texto: 'Leí y comprendí  el curso de inducción General y de Seguridad y Salud en el Trabajo, así como  el contrato laboral   y todas las cláusulas y condiciones establecidas.' },
      { numero: 'c)', texto: 'Información Condiciones de Salud: Manifiesto que conozco los resultados de mis exámenes médicos de ingreso y las recomendaciones dadas por el médico ocupacional.' },
    ];

    doc.setFont('helvetica', 'bold').setFontSize(8);
    doc.text('DEL COLABORADOR:', marginLeft, y);
    y += 5;

    doc.setFontSize(7.5);
    const lh = 4;
    const gapAfterItem = 1;

    doc.setFont('helvetica', 'bold');
    const bulletBoxWidth =
      Math.max(doc.getTextWidth('a) '), doc.getTextWidth('b) '), doc.getTextWidth('c) ')) + 1.5;

    const xBullet = marginLeft;
    const xText = xBullet + bulletBoxWidth;
    const availWidth = pageWidth - rightMargin - xText;

    contenidoFinalColaborador.forEach(({ numero, texto }) => {
      ensureSpace(10);
      doc.setFont('helvetica', 'bold');
      doc.text(numero, xBullet, y);

      doc.setFont('helvetica', 'normal');
      const parrafos = String(texto).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      const partes = parrafos.length ? parrafos : [''];

      partes.forEach((p, pi) => {
        const lines = doc.splitTextToSize(p, availWidth) as string[];
        lines.forEach((ln) => {
          ensureSpace(lh);
          doc.text(ln, xText, y);
          y += lh;
        });
        if (pi < partes.length - 1) y += 1.5;
      });

      y += gapAfterItem;
    });

    // Firma + datos
    y += 10;
    ensureSpace(30);
    doc.setFont('helvetica', 'bold').setFontSize(8);
    doc.line(marginLeft, y, marginLeft + 60, y);
    doc.text('Firma de Aceptación', marginLeft, y + 4);

    if (firmaBase64) {
      doc.addImage(firmaBase64, 'PNG', marginLeft, y - 18, 50, 20);
    }

    y += 8;
    doc.setFont('helvetica', 'bold').setFontSize(8);
    doc.text(`No de Identificación: ${cedula ?? ''}`, marginLeft, y);
    doc.text(`Fecha de Recibido: ${new Date().toISOString().split('T')[0]}`, marginLeft, y + 4);

    // Tabla de huella (solo Índice Derecho)
    let huellaData = '';
    const huellaUrl = cand?.biometria?.huella?.file_url;
    if (huellaUrl) {
      huellaData = await toDataURL(huellaUrl) || '';
    }

    const huellaTableWidth = 82, huellaTableHeight = 30, huellaHeaderHeight = 8;
    const huellaStartX = pageWidth - rightMargin - huellaTableWidth;
    const huellaStartY = y - 10;

    doc.setFillColor(230, 230, 230);
    doc.rect(huellaStartX, huellaStartY, huellaTableWidth / 2, huellaHeaderHeight, 'F');
    doc.setDrawColor(0);
    doc.rect(huellaStartX, huellaStartY, huellaTableWidth / 2, huellaHeaderHeight);
    doc.setFont('helvetica', 'bold').setFontSize(8);
    doc.text('Huella Indice Derecho', huellaStartX + 5, huellaStartY + 5);
    doc.rect(huellaStartX, huellaStartY + huellaHeaderHeight, huellaTableWidth / 2, huellaTableHeight);

    if (huellaData) {
      const imageWidth = huellaTableWidth / 2 - 10;
      const imageHeight = huellaTableHeight - 3;
      doc.addImage(huellaData, 'PNG', huellaStartX + 5, huellaStartY + huellaHeaderHeight + 2, imageWidth, imageHeight);
    }

    // Sello / imagen final (si existe local)
    const selloData = await toDataURL('firma/FirmaEntregaDocApoyo.png');
    if (selloData) {
      y += 5;
      doc.addImage(selloData, 'PNG', marginLeft, y, 95, 10);
    }

    return doc.output('arraybuffer');
  }

  // ══════════════════════════════════════════════════════════
  //  3. FICHA TÉCNICA TA COMPLETA (pdf-lib template)
  // ══════════════════════════════════════════════════════════
  async generarFichaTecnicaTACompleta(cand: any, firmaUrl: string): Promise<ArrayBuffer | null> {
    const pdfUrl = 'Docs/FICHA FORANEOS TU ALIANZA COMPLETA.pdf';
    const arrayBuffer = await this.fetchAsArrayBufferOrNull(pdfUrl);
    if (!arrayBuffer) return null;

    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const form = pdfDoc.getForm();

    const nombreCompleto = [
      cand?.primer_apellido, cand?.segundo_apellido,
      cand?.primer_nombre, cand?.segundo_nombre,
    ].map((x: any) => String(x ?? '').trim()).filter(Boolean).join(' ').toUpperCase();

    const numDoc = String(cand?.numero_documento ?? '').trim();

    // Llenar campos básicos
    this.setTextSafe(form, 'nombre_completo', nombreCompleto);
    this.setTextSafe(form, 'numero_documento', numDoc);
    this.setTextSafe(form, 'cedula', numDoc);

    // Firma
    if (firmaUrl) {
      await this.setButtonImageSafe(pdfDoc, form, 'firma', firmaUrl);
    }

    // Biometria
    const huellaUrl = cand?.biometria?.huella?.file_url ?? '';
    if (huellaUrl) {
      await this.setButtonImageSafe(pdfDoc, form, 'huella', huellaUrl);
    }

    // Bloquear campos
    form.getFields().forEach((f: any) => { try { f.enableReadOnly(); } catch { } });

    const pdfBytes = await pdfDoc.save();
    return this.toSafeArrayBuffer(pdfBytes);
  }

  // ══════════════════════════════════════════════════════════
  //  4. ENTREGA CARNETS (pdf-lib template)
  // ══════════════════════════════════════════════════════════
  async generarEntregaCarnetsPreview(cand: any, firmaUrl: string): Promise<ArrayBuffer | null> {
    const pdfUrl = 'Docs/entrega_carnets.pdf';
    const arrayBuffer = await this.fetchAsArrayBufferOrNull(pdfUrl);
    if (!arrayBuffer) return null;

    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const form = pdfDoc.getForm();

    const nombreTrabajador = [
      cand?.primer_apellido, cand?.segundo_apellido,
      cand?.primer_nombre, cand?.segundo_nombre,
    ].map((x: any) => String(x ?? '').trim()).filter(Boolean).join(' ').toUpperCase();

    const numIdentificacion = String(cand?.numero_documento ?? '').trim();

    // Fecha de ingreso
    const fechaRaw = String(
      cand?.entrevistas?.[0]?.proceso?.contrato?.fecha_ingreso ?? ''
    ).trim();
    let fechaIngreso = '';
    if (fechaRaw) {
      const d = new Date(fechaRaw);
      if (!isNaN(d.getTime())) {
        fechaIngreso = [
          String(d.getDate()).padStart(2, '0'),
          String(d.getMonth() + 1).padStart(2, '0'),
          d.getFullYear(),
        ].join('/');
      }
    }

    this.setTextSafe(form, 'Nombre Trabajador', nombreTrabajador);
    this.setTextSafe(form, 'numero_identificacion', numIdentificacion);
    this.setTextSafe(form, 'fecha_ingreso', fechaIngreso);

    // Firma
    if (firmaUrl) {
      await this.setButtonImageSafe(pdfDoc, form, 'firma_af_image', firmaUrl);
    }

    // Bloquear campos
    form.getFields().forEach((f: any) => { try { f.enableReadOnly(); } catch { } });

    const pdfBytes = await pdfDoc.save();
    return this.toSafeArrayBuffer(pdfBytes);
  }

  // ══════════════════════════════════════════════════════════
  //  5. INDUCCIÓN Y CAPACITACIÓN (pdf-lib template)
  // ══════════════════════════════════════════════════════════
  async generarInduccionCapacitacionPreview(cand: any, firmaUrl: string): Promise<ArrayBuffer | null> {
    const pdfUrl = 'Docs/induccion_capacitacion_andes.pdf';
    const arrayBuffer = await this.fetchAsArrayBufferOrNull(pdfUrl);
    if (!arrayBuffer) return null;

    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const form = pdfDoc.getForm();

    const numeroDocumento = String(cand?.numero_documento ?? '').trim();

    const nombreCompleto = [
      cand?.primer_apellido, cand?.segundo_apellido,
      cand?.primer_nombre, cand?.segundo_nombre,
    ].map((x: any) => String(x ?? '').trim()).filter(Boolean).join(' ').toUpperCase();

    // Fecha de ingreso
    const fechaRaw = String(
      cand?.entrevistas?.[0]?.proceso?.contrato?.fecha_ingreso ?? ''
    ).trim();
    let fechaIngreso = '';
    if (fechaRaw) {
      const d = new Date(fechaRaw);
      if (!isNaN(d.getTime())) {
        fechaIngreso = [
          String(d.getDate()).padStart(2, '0'),
          String(d.getMonth() + 1).padStart(2, '0'),
          d.getFullYear(),
        ].join('/');
      }
    }

    this.setTextSafe(form, 'numero_documento', numeroDocumento, 12);
    this.setTextSafe(form, 'nombre_completo', nombreCompleto, 12);
    this.setTextSafe(form, 'fecha_ingreso', fechaIngreso, 12);

    // Firma
    if (firmaUrl) {
      await this.setButtonImageSafe(pdfDoc, form, 'firma_af_image', firmaUrl);
    }

    // Bloquear campos
    form.getFields().forEach((f: any) => { try { f.enableReadOnly(); } catch { } });

    const pdfBytes = await pdfDoc.save();
    return this.toSafeArrayBuffer(pdfBytes);
  }

  // ══════════════════════════════════════════════════════════
  //  6. FORMATO SOLICITUD (pdf-lib template)
  // ══════════════════════════════════════════════════════════
  async generarFormatoSolicitudPreview(cand: any, firmaUrl: string, datoContratacion: any = {}): Promise<ArrayBuffer | null> {
    const pdfUrl = 'Docs/formato_empleo_andes.pdf';
    const arrayBuffer = await this.fetchAsArrayBufferOrNull(pdfUrl);
    if (!arrayBuffer) return null;

    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const form = pdfDoc.getForm();

    const contacto: any = cand?.contacto ?? {};
    const residencia: any = cand?.residencia ?? {};
    const infoCc: any = cand?.info_cc ?? {};
    const vivienda: any = cand?.vivienda ?? {};

    const entrevista: any = Array.isArray(cand?.entrevistas) ? cand.entrevistas[0] : null;
    const proceso: any = entrevista?.proceso ?? {};
    const contrato: any = proceso?.contrato ?? {};
    const antecedentes: any[] = Array.isArray(proceso?.antecedentes) ? proceso.antecedentes : [];

    const findAnte = (nombre: string) => antecedentes.find((a: any) => this.norm(a?.nombre) === this.norm(nombre));

    const apellidos = [cand?.primer_apellido, cand?.segundo_apellido]
      .map((x: any) => String(x ?? '').trim()).filter(Boolean).join(' ').toUpperCase();
    const nombres = [cand?.primer_nombre, cand?.segundo_nombre]
      .map((x: any) => String(x ?? '').trim()).filter(Boolean).join(' ').toUpperCase();
    const numeroCedula = String(cand?.numero_documento ?? '').trim();
    const lugarExpedicion = String(infoCc?.mpio_expedicion ?? '').trim().toUpperCase();

    // Fecha de nacimiento
    const fechaNacRaw = String(cand?.fecha_nacimiento ?? '').trim();
    let diaNac = '', mesNac = '', anioNac = '';
    if (fechaNacRaw) {
      const d = new Date(fechaNacRaw);
      if (!isNaN(d.getTime())) {
        diaNac = String(d.getDate()).padStart(2, '0');
        mesNac = String(d.getMonth() + 1).padStart(2, '0');
        anioNac = String(d.getFullYear());
      }
    }

    const lugarNacimiento = String(infoCc?.mpio_nacimiento ?? '').trim().toUpperCase();

    // Fecha de ingreso
    const fechaRaw = String(contrato?.fecha_ingreso ?? '').trim();
    let fechaIngreso = '';
    if (fechaRaw) {
      const d = new Date(fechaRaw);
      if (!isNaN(d.getTime())) {
        fechaIngreso = [
          String(d.getDate()).padStart(2, '0'),
          String(d.getMonth() + 1).padStart(2, '0'),
          d.getFullYear(),
        ].join('/');
      }
    }

    // Género
    const sexo = this.norm(cand?.sexo ?? cand?.genero ?? '');
    const esMasculino = sexo === 'M' || sexo === 'MASCULINO';
    const esFemenino = sexo === 'F' || sexo === 'FEMENINO';

    // Vivienda
    const tipoViviendaAlt = this.norm(vivienda?.tipo_vivienda_alt ?? '');
    const tipoVivienda = this.norm(vivienda?.tipo_vivienda ?? '');
    const estadoCivil = this.norm(cand?.estado_civil ?? '');

    const direccion = String(residencia?.direccion ?? '').trim();
    const barrio = String(residencia?.barrio ?? '').trim();
    const direccionCompleta = [direccion, barrio].filter(Boolean).join(' - ');

    const telefono = String(contacto?.celular ?? contacto?.telefono ?? datoContratacion?.celular ?? '').trim();
    const ciudad = String(residencia?.municipio ?? datoContratacion?.municipio ?? '').trim().toUpperCase();

    const cuidadorHijos = String(vivienda?.responsable_hijos ?? datoContratacion?.responsable_hijos ?? '').trim();
    const numHijos = String(cand?.num_hijos_dependen_economicamente ?? datoContratacion?.num_hijos_dependen_economicamente ?? '').trim();

    // Tallas
    const tallaCamiseta = String(datoContratacion?.camisa ?? '').trim();
    const tallaCalzado = String(datoContratacion?.calzado ?? '').trim();

    // EPS / AFP / Cesantías
    const eps = String(findAnte('EPS')?.observacion ?? '').trim();
    const afp = String(findAnte('AFP')?.observacion ?? '').trim();
    const cesantias = String(contrato?.cesantias ?? '').trim();

    // Experiencias laborales
    const experiencias: any[] = Array.isArray(cand?.experiencias) ? cand.experiencias : [];

    // Llenar campos
    this.setTextSafe(form, 'Fecha de Ingreso', fechaIngreso);
    this.setTextSafe(form, 'Apellidos', apellidos);
    this.setTextSafe(form, 'Nombres', nombres);
    this.setTextSafe(form, 'Numero Cédula', numeroCedula);
    this.setTextSafe(form, 'Lugar Expedición', lugarExpedicion);
    this.setTextSafe(form, 'Día', diaNac);
    this.setTextSafe(form, 'Mes', mesNac);
    this.setTextSafe(form, 'Año', anioNac);
    this.setTextSafe(form, 'Lugar de Nac', lugarNacimiento);
    this.setTextSafe(form, 'Talla', tallaCamiseta);
    this.setTextSafe(form, 'Calzado', tallaCalzado);
    this.setTextSafe(form, 'Numero de Hijos', numHijos);
    this.setTextSafe(form, 'Quien cuida de sus hijos', cuidadorHijos);
    this.setTextSafe(form, 'Dirección de Vivienda y Barrio', direccionCompleta);
    this.setTextSafe(form, 'Teléfono', telefono);
    this.setTextSafe(form, 'Ciudad', ciudad);

    // Género
    if (esMasculino) this.setTextSafe(form, 'masculino', 'X');
    if (esFemenino) this.setTextSafe(form, 'Femenino', 'X');

    // Estado civil
    const ecMap: { [key: string]: string } = {
      SO: 'Solteroa', SOLTERO: 'Solteroa', S: 'Solteroa',
      CA: 'Casadoa', CASADO: 'Casadoa', CASADA: 'Casadoa',
      UL: 'Unión Libre', UNION_LIBRE: 'Unión Libre', UN: 'Unión Libre',
      SE: 'Separadoa', SEPARADO: 'Separadoa', SEPARADA: 'Separadoa',
      VI: 'Viudoa', VIUDO: 'Viudoa', VIUDA: 'Viudoa',
    };
    const ecField = ecMap[estadoCivil];
    if (ecField) this.setTextSafe(form, ecField, 'X');

    // Tipo vivienda propiedad
    if (tipoViviendaAlt === 'PROPIA') this.setTextSafe(form, 'propia', 'X');
    else if (tipoViviendaAlt === 'FAMILIAR' || tipoViviendaAlt === 'AMIGOS') this.setTextSafe(form, 'Familiar', 'X');
    else if (tipoViviendaAlt === 'ARRIENDO') this.setTextSafe(form, 'Arriendo', 'X');

    // Tipo vivienda estructura
    const tvNorm = tipoVivienda.replace(/[,\s]+/g, ' ').trim();
    if (tvNorm.includes('CASA') && tvNorm.includes('LOTE')) this.setTextSafe(form, 'Casa Lote', 'X');
    else if (tvNorm.includes('APARTAMENTO')) this.setTextSafe(form, 'Apartamento', 'X');
    else if (tvNorm.includes('HABITACIÓN') || tvNorm.includes('HABITACION') || tvNorm === 'PIEZA') this.setTextSafe(form, 'Pieza', 'X');
    else if (tvNorm.includes('FINCA') || tvNorm.includes('LOTE')) this.setTextSafe(form, 'Lote con Cimientos', 'X');
    else if (tvNorm.includes('CASA')) this.setTextSafe(form, 'Casa', 'X');

    // Experiencias laborales (hasta 3)
    for (let i = 0; i < 3; i++) {
      const exp = experiencias[i] ?? {};
      const rowSuffix = `Row${i + 1}`;
      this.setTextSafe(form, `Nombre de la Empresa${rowSuffix}`, String(exp.empresa ?? '').trim());
      this.setTextSafe(form, `Tiempo Laborado${rowSuffix}`, String(exp.tiempo_trabajado ?? exp.tiempo ?? '').trim());
      this.setTextSafe(form, `Cargo${rowSuffix}`, String(exp.cargo ?? '').trim());
      this.setTextSafe(form, `Sueldo${rowSuffix}`, String(exp.sueldo ?? '').trim());
      this.setTextSafe(form, `Motivo del Retiro${rowSuffix}`, String(exp.motivo_retiro ?? '').trim());
    }

    // Cómo se enteró
    const comoSeEntero = String(entrevista?.como_se_entero ?? datoContratacion?.como_se_entero ?? '').trim();
    this.setTextSafe(form, 'Como se Enteró', comoSeEntero);

    // EPS, AFP, Cesantías
    this.setTextSafe(form, 'E P S', eps);
    this.setTextSafe(form, 'Fondo de Pensiones', afp);
    this.setTextSafe(form, 'Fondo de Cesantias', cesantias);

    // Firmas
    if (firmaUrl) {
      await this.setButtonImageSafe(pdfDoc, form, 'Firma del Trabajador_af_image', firmaUrl);
    }

    // Bloquear campos
    form.getFields().forEach((f: any) => { try { f.enableReadOnly(); } catch { } });

    const pdfBytes = await pdfDoc.save();
    return this.toSafeArrayBuffer(pdfBytes);
  }

  // ══════════════════════════════════════════════════════════
  //  NAVEGACIÓN DE CARRUSEL
  // ══════════════════════════════════════════════════════════
  nextDocument(): void {
    if (this.currentDocIndex < this.documentosList.length - 1) {
      this.currentDocIndex++;
    }
  }

  prevDocument(): void {
    if (this.currentDocIndex > 0) {
      this.currentDocIndex--;
    }
  }

  // ══════════════════════════════════════════════════════════
  //  FIRMA LOGIC (Modal)
  // ══════════════════════════════════════════════════════════
  openSignatureModal(): void {
    const numeroCedula = (this.form.value.numeroCedula || '').toString().trim();
    if (!numeroCedula) {
      Swal.fire('Atención', 'Primero busca o escribe la cédula.', 'info');
      this.form.markAllAsTouched();
      return;
    }
    this.showSignatureModal = true;
  }

  onSignatureSaved(base64: string): void {
    this.signaturePreview = base64;
    this.showSignatureModal = false;
    this.form.patchValue({ firmaBase64: base64 });
    const numeroCedula = this.form.get('numeroCedula')?.value;
    if (numeroCedula) {
      this.generarPreviews(numeroCedula);
    }
  }

  onSignatureCancelled(): void {
    this.showSignatureModal = false;
  }

  // ── Dialog de consentimiento biométrico (todo-en-uno) ──
  private async mostrarConsentimiento(): Promise<boolean> {
    const { isConfirmed } = await Swal.fire({
      title: '',
      html: `
        <div class="consent-dialog-content">
          <div class="consent-dialog-header">
            <div class="consent-dialog-icon">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#2e7d32" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <h2 class="consent-dialog-title">Autorización de Tratamiento de Datos Biométricos</h2>
            <span class="consent-dialog-badge">Ley 1581 de 2012</span>
          </div>

          <div class="consent-dialog-text">${this.TEXTO_CONSENTIMIENTO}</div>

          <label class="consent-dialog-check" id="consent-label">
            <input type="checkbox" id="swal-consent-cb" />
            <span class="consent-dialog-checkmark"></span>
            <span>He leído y <strong>autorizo</strong> el tratamiento de mis datos biométricos conforme a lo anterior.</span>
          </label>

          <p class="consent-dialog-version">Versión: ${this.form.value.versionConsentimiento}</p>
        </div>
      `,
      width: '540px',
      showCancelButton: true,
      confirmButtonText: '🔒 Autorizar y Guardar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2e7d32',
      customClass: { popup: 'consent-popup' },
      didOpen: () => {
        const btn = Swal.getConfirmButton();
        if (btn) btn.disabled = true;
        const cb = document.getElementById('swal-consent-cb') as HTMLInputElement;
        cb?.addEventListener('change', () => {
          if (btn) btn.disabled = !cb.checked;
        });
      },
      preConfirm: () => {
        const cb = document.getElementById('swal-consent-cb') as HTMLInputElement;
        if (!cb?.checked) {
          Swal.showValidationMessage('Debes marcar la casilla para continuar.');
          return false;
        }
        return true;
      },
    });
    return isConfirmed;
  }

  async guardarFirma(): Promise<void> {
    if (!this.form.value.firmaBase64) {
      Swal.fire('Atención', 'Primero debes firmar.', 'info');
      return;
    }

    // ── Mostrar dialog de consentimiento ──
    const aceptado = await this.mostrarConsentimiento();
    if (!aceptado) return;
    this.form.patchValue({ consentimientoBiometrico: true });

    const numeroCedula = (this.form.value.numeroCedula || '').toString().trim();
    const dataUrl = this.form.value.firmaBase64;

    // ── Generar evidencia de consentimiento ──
    const timestampISO = new Date().toISOString();
    const dataString = numeroCedula + this.TEXTO_CONSENTIMIENTO + timestampISO;
    const hash = await this.generateHash(dataString);

    this.form.patchValue({
      consentimientoHash: hash,
      timestampConsentimiento: timestampISO,
    });

    const fileName = `firma_${numeroCedula}_${Date.now()}.png`;
    const file = this.dataUrlToFile(dataUrl, fileName);

    this.saving = true;
    Swal.fire({
      icon: 'info',
      title: 'Guardando…',
      text: 'Subiendo tu firma.',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    this.candidateS.uploadFirma(numeroCedula, file, {
      hash,
      version: this.form.value.versionConsentimiento,
      timestamp: timestampISO,
      userAgent: this.form.value.userAgent,
    }).subscribe({
      next: async () => {
        Swal.close();
        this.saving = false;
        this.firmaSaved = true;

        // Generar documentos con la firma y abrir dialog
        await this.generarPreviews(numeroCedula);

        await Swal.fire('¡Listo!', 'La firma se guardó correctamente. Ahora puedes revisar los documentos generados.', 'success');

        // Auto-abrir dialog de documentos
        if (this.documentosList.length > 0) {
          this.openDocumentsDialog();
        }
      },
      error: (err) => {
        Swal.close();
        this.saving = false;
        const msg: string =
          err?.error?.detail ||
          err?.error?.message ||
          err?.message ||
          'No se pudo guardar la firma. Intenta de nuevo.';
        Swal.fire('Error', msg, 'error');
      }
    });
  }

  // ══════════════════════════════════════════════════════════
  //  DIALOG DE DOCUMENTOS
  // ══════════════════════════════════════════════════════════
  openDocumentsDialog(): void {
    this.currentDocIndex = 0;
    this.showDocumentsDialog = true;
  }

  closeDocumentsDialog(): void {
    this.showDocumentsDialog = false;
  }

  // Opción para descargar si se requiere
  descargarPNG(): void {
    if (!this.signaturePreview) return;
    const a = document.createElement('a');
    a.href = this.signaturePreview;
    a.download = `firma_${this.form.value.numeroCedula || 'solicitante'}.png`;
    a.click();
  }
}
