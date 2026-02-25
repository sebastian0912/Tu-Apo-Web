import {
  Component, OnInit
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common'; // Importante para *ngIf

// Ajusta esta ruta a tu estructura real si difiere
import { SharedModule } from '../../../../../../shared/shared-module';
import { CandidatoNewS } from '../../../../../../shared/services/candidato-new/candidato-new-s';
import { FullScreenSignatureComponent } from '../../components/full-screen-signature/full-screen-signature.component';

interface CandidateData {
  primer_nombre?: string;
  segundo_nombre?: string;
  primer_apellido?: string;
  segundo_apellido?: string;
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

  constructor(
    private fb: FormBuilder,
    private candidateS: CandidatoNewS,
    private route: ActivatedRoute,
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

        // El endpoint devuelve 1 candidato (objeto). Si algún día devuelve array, tomamos el primero.
        const cand: CandidateData | null =
          Array.isArray(res) ? (res[0] ?? null) : (res ?? null);

        this.nombreCompleto = this.buildNombreCompleto(cand);

        if (this.nombreCompleto) {
          Swal.fire('Cédula encontrada', this.nombreCompleto, 'success');
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
    this.showSignatureModal = false;
    this.signaturePreview = base64;
    this.form.patchValue({ firmaBase64: base64 });
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
