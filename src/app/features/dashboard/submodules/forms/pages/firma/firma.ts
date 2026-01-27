import {
  Component, OnInit
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
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

  constructor(
    private fb: FormBuilder,
    private candidateS: CandidatoNewS,
    private titleService: Title,
    private metaService: Meta
  ) {
    this.form = this.fb.group({
      numeroCedula: ['', [Validators.required, Validators.pattern(/^\d{5,15}$/)]],
      firmaBase64: [''],
    });
  }

  get f() { return this.form.controls as any; }

  // ───────── Ciclo de vida ─────────
  ngOnInit(): void {
    this.titleService.setTitle('Firma de Candidato | Gestión Gerencial');
    this.metaService.updateTag({ name: 'description', content: 'Página oficial para la firma digital de candidatos. Proceso seguro y eficiente.' });
    this.metaService.updateTag({ name: 'robots', content: 'noindex, nofollow' }); // Generalmente páginas internas de gestión no se indexan, pero si el user pidió SEO...
    // Si el usuario pidió SEO explícitamente para gerencia, quizás quiera indexarlo, pero por seguridad pondré index si es pública, o noindex si es dashboard.
    // Asumiendo que "dejar nivel seo" implica buenas prácticas.
    this.metaService.updateTag({ name: 'keywords', content: 'firma, candidato, gestión, digital' });
    this.metaService.updateTag({ name: 'author', content: 'Tu Apo Web - Gestión Gerencial' });
    this.metaService.updateTag({ property: 'og:title', content: 'Firma Digital de Candidato' });
    this.metaService.updateTag({ name: 'revised', content: new Date().toISOString() });
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

  // ---------- Búsqueda ----------
  async buscarCedula(): Promise<void> {
    const numeroCedula = (this.form.value.numeroCedula || '').toString().trim();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
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

  async guardarFirma(): Promise<void> {
    if (!this.form.value.firmaBase64) {
      Swal.fire('Atención', 'Primero debes firmar.', 'info');
      return;
    }

    const numeroCedula = (this.form.value.numeroCedula || '').toString().trim();
    const dataUrl = this.form.value.firmaBase64;

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

    this.candidateS.uploadFirma(numeroCedula, file).subscribe({
      next: () => {
        Swal.close();
        this.saving = false;
        Swal.fire('¡Listo!', 'La firma se guardó correctamente.', 'success');
        // Opcional: limpiar firma tras guardar
        // this.signaturePreview = null;
        // this.form.patchValue({ firmaBase64: '' });
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
