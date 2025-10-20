import {
  Component, ViewChild, ElementRef, AfterViewInit, OnDestroy, HostListener
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import Swal from 'sweetalert2';
import SignaturePad from 'signature_pad';

// Ajusta esta ruta a tu estructura real si difiere
import { SharedModule } from '../../../../../../shared/shared-module';
import { CandidatoNewS } from '../../../../../../shared/services/candidato-new/candidato-new-s';

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
  imports: [SharedModule, ReactiveFormsModule],
  templateUrl: './firma.html',
  styleUrls: ['./firma.css'],
})
export class Firma implements AfterViewInit, OnDestroy {
  @ViewChild('sigCanvas', { static: true }) sigCanvas!: ElementRef<HTMLCanvasElement>;

  form: FormGroup;
  searching = false;
  saving = false;

  private pad!: SignaturePad;
  private handlePadEnd = () => this.updateState();

  isEmpty = true;
  canUndo = false;
  showRotateHint = false;

  // Mostrar nombre completo cuando exista el registro
  nombreCompleto: string | null = null;

  constructor(
    private fb: FormBuilder,
    private candidateS: CandidatoNewS
  ) {
    this.form = this.fb.group({
      numeroCedula: ['', [Validators.required, Validators.pattern(/^\d{5,15}$/)]],
      firmaBase64: [''],
    });
  }

  get f() { return this.form.controls as any; }

  // ───────── Ciclo de vida ─────────
  ngAfterViewInit(): void {
    this.pad = new SignaturePad(this.sigCanvas.nativeElement, {
      minWidth: 0.8,
      maxWidth: 2.2,
      throttle: 16,
    });

    this.updateState();

    this.resizeCanvas();
    this.checkOrientation();
    setTimeout(() => this.resizeCanvas(), 0);

    const anyPad = this.pad as any;
    if (typeof anyPad.addEventListener === 'function') {
      anyPad.addEventListener('endStroke', this.handlePadEnd as EventListener);
    } else if ('onEnd' in anyPad) {
      anyPad.onEnd = this.handlePadEnd;
    }
  }

  ngOnDestroy(): void {
    if (!this.pad) return;
    const anyPad = this.pad as any;
    if (typeof anyPad.removeEventListener === 'function') {
      anyPad.removeEventListener('endStroke', this.handlePadEnd as EventListener);
    }
    if ('onEnd' in anyPad) {
      anyPad.onEnd = null;
    }
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

  // ---------- Firma ----------
  clear(): void {
    this.pad.clear();
    this.updateState();
  }

  undo(): void {
    const data = this.pad.toData();
    if (data.length > 0) {
      data.pop();
      this.pad.fromData(data);
      this.updateState();
    }
  }

  async guardarFirma(): Promise<void> {
    if (this.pad.isEmpty()) {
      Swal.fire('Atención', 'Dibuja tu firma antes de guardar.', 'info');
      return;
    }
    const numeroCedula = (this.form.value.numeroCedula || '').toString().trim();
    if (!numeroCedula) {
      Swal.fire('Atención', 'Primero busca o escribe la cédula.', 'info');
      return;
    }

    const dataUrl = this.pad.toDataURL('image/png'); // base64 DataURL
    this.form.patchValue({ firmaBase64: dataUrl });

    // Convertimos DataURL → File para usar tu servicio (multipart/form-data)
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

  descargarPNG(): void {
    if (this.pad.isEmpty()) return;
    const url = this.pad.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `firma_${this.form.value.numeroCedula || 'solicitante'}.png`;
    a.click();
  }

  // ---------- Responsive / Orientación ----------
  @HostListener('window:resize')
  onResize() {
    this.resizeCanvas();
    this.checkOrientation();
  }

  private resizeCanvas(): void {
    const canvas = this.sigCanvas.nativeElement;
    const wrapper = canvas.parentElement as HTMLElement;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);

    const isPortrait = window.matchMedia('(orientation: portrait)').matches;
    const isSmall = window.matchMedia('(max-width: 768px)').matches;

    const cssWidth = wrapper.clientWidth || 320;
    const cssHeight = isSmall ? (isPortrait ? 220 : 280) : 320;

    canvas.width = Math.floor(cssWidth * ratio);
    canvas.height = Math.floor(cssHeight * ratio);
    canvas.style.width = cssWidth + 'px';
    canvas.style.height = cssHeight + 'px';

    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(ratio, ratio);

    this.pad.clear();
    this.updateState();
  }

  private checkOrientation(): void {
    const isSmall = window.matchMedia('(max-width: 768px)').matches;
    const isPortrait = window.matchMedia('(orientation: portrait)').matches;
    this.showRotateHint = isSmall && isPortrait;
  }

  private updateState(): void {
    this.isEmpty = this.pad.isEmpty();
    this.canUndo = this.pad.toData().length > 0;
  }
}
