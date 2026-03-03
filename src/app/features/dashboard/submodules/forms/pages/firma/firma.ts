import {
  Component, OnInit
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Title, Meta } from '@angular/platform-browser';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../../../../../shared/shared-module';
import { CandidatoNewS } from '../../../../../../shared/services/candidato-new/candidato-new-s';
import { DocumentManagementS } from '../../../../../../shared/services/document-management-s/document-management-s';
import { FullScreenSignatureComponent } from '../../components/full-screen-signature/full-screen-signature.component';
import jsPDF from 'jspdf';

interface CandidateData {
  primer_nombre?: string;
  segundo_nombre?: string;
  primer_apellido?: string;
  segundo_apellido?: string;
  info_cc?: {
    numero_documento?: string;
  };
  [k: string]: any;
}

@Component({
  selector: 'app-firma',
  standalone: true,
  imports: [SharedModule, ReactiveFormsModule, CommonModule, FullScreenSignatureComponent],
  templateUrl: './firma.html',
  styleUrls: ['./firma.css'],
})
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

  constructor(
    private fb: FormBuilder,
    private candidateS: CandidatoNewS,
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

  // ---------- Helpers ----------
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

  // ---------- Carga de Documentos (Carrusel) ----------
  async generarPreviews(cedula: string): Promise<void> {
    this.loadingDocs = true;
    this.documentosList = [];

    try {
      // Usaremos la firma del preview si existe, o dejaremos un espacio en blanco
      const firmaUrl = this.signaturePreview || '';

      // 1. Autorización de Datos (Apoyo Laboral)
      const bufferAutorizacion = await this.generarAutorizacionDatosPreview(cedula, 'APOYO LABORAL TS S.A.S', firmaUrl);
      const blobAutorizacion = new Blob([bufferAutorizacion], { type: 'application/pdf' });
      this.documentosList.push({
        title: 'Autorización de datos',
        safeUrl: this.sanitizer.bypassSecurityTrustResourceUrl(URL.createObjectURL(blobAutorizacion))
      });

      // [Aquí se pueden agregar más documentos on-the-fly según se requiera]

      this.currentDocIndex = 0;
    } catch (error) {
      console.error('Error generando previews:', error);
      Swal.fire('Error', 'No se pudieron generar los documentos de vista previa.', 'error');
    } finally {
      this.loadingDocs = false;
    }
  }

  // Generador On-The-Fly: Autorización de Datos
  async generarAutorizacionDatosPreview(cedula: string, empresaSeleccionada: string, firmaBase64: string): Promise<ArrayBuffer> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    doc.setProperties({
      title: `${empresaSeleccionada}_Autorizacion_Datos.pdf`,
      author: empresaSeleccionada,
      creator: empresaSeleccionada,
    });

    const imgWidth = 27, imgHeight = 10, marginTop = 15, marginLeft = 10;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    // Título
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.text(
      'AUTORIZACIÓN PARA EL TRATAMIENTO DE DATOS PERSONALES DE CANDIDATOS',
      pageWidth / 2,
      30,
      { align: 'center' }
    );

    const margenIzquierdo = 10;
    const margenDerecho = 10;
    const anchoTexto = pageWidth - margenIzquierdo - margenDerecho;

    let parrafos = [
      `${empresaSeleccionada}, tratará sus datos personales, consistentes en, pero sin limitarse a, su nombre, información de contacto, fecha y lugar de nacimiento, número de identificación, estado civil, dependientes, fotografía, antecedentes de educación y empleo, referencias personales y laborales, información sobre visas y antecedentes judiciales ("Información Personal") con el fin de (1) evaluarlo como potencial empleado de ${empresaSeleccionada}; (2) evaluar y corroborar la información contenida en su hoja de vida e información sobre la experiencia profesional y trayectoria académica (3) almacenar y clasificar su Información Personal para facilitar su acceso;`,
      `(4) proporcionar información a las autoridades competentes cuando medie requerimiento de dichas autoridades en ejercicio de sus funciones y facultades legales, en cumplimiento de un deber legal o para proteger los derechos de ${empresaSeleccionada}; (5) proporcionar información a auditores internos o externos en el marco de las finalidades aquí descritas; (6) dar a conocer la realización de eventos de interés o de nuevas convocatorias para otros puestos de trabajo; (7) verificar la información aportada y adelantar todas las actuaciones necesarias, incluida la revisión de la información aportada por usted en las distintas listas de riesgos para prevenir los riesgos para ${empresaSeleccionada} a lavado de activos, financiación del terrorismo y asuntos afines, dentro del marco de implementación de su SAGRILAFT; y todas las demás actividades que sean compatibles con estas finalidades.`,
      `Para poder cumplir con las finalidades anteriormente expuestas, ${empresaSeleccionada} requiere tratar los siguientes datos personales suyos que son considerados como sensibles: género, datos biométricos y datos relacionados con su salud (“Información Personal Sensible”). Usted tiene derecho a autorizar o no la recolección y tratamiento de su Información Personal Sensible por parte de ${empresaSeleccionada} y sus encargados. No obstante, si usted no autoriza a ${empresaSeleccionada} a recolectar y hacer el tratamiento de esta Información Personal Sensible, ${empresaSeleccionada} no podrá cumplir con las finalidades del tratamiento descritas anteriormente.`,
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

  // ---------- Firma Logic (Modal) ----------

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
      next: () => {
        Swal.close();
        this.saving = false;
        Swal.fire('¡Listo!', 'La firma se guardó correctamente.', 'success');
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

  // Opción para descargar si se requiere
  descargarPNG(): void {
    if (!this.signaturePreview) return;
    const a = document.createElement('a');
    a.href = this.signaturePreview;
    a.download = `firma_${this.form.value.numeroCedula || 'solicitante'}.png`;
    a.click();
  }
}
