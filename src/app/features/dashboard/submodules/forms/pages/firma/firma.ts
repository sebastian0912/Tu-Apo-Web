import { Component, ViewChild, ElementRef, AfterViewInit, OnDestroy, HostListener } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { SharedModule } from '../../../../../../shared/shared-module';
import Swal from 'sweetalert2';
import SignaturePad from 'signature_pad';
import { CandidateS } from '../../../../../../shared/services/candidate-s/candidate-s';

interface BuscarCedulaResponse {
  message: string;
  data?: CandidateData[];
}
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
  styleUrl: './firma.css',
})
export class Firma implements AfterViewInit, OnDestroy {
  @ViewChild('sigCanvas', { static: true }) sigCanvas!: ElementRef<HTMLCanvasElement>;

  form: FormGroup;
  searching = false;
  saving = false;

  private pad!: SignaturePad;
  private handlePadEnd = () => this.updateState(); // handler para (des)suscribirse

  isEmpty = true;
  canUndo = false;
  showRotateHint = false;

  // Mostrar nombre completo cuando exista el registro
  nombreCompleto: string | null = null;

  constructor(private fb: FormBuilder, private candidateS: CandidateS) {
    // Construimos el form en el constructor
    this.form = this.fb.group({
      numeroCedula: ['', [Validators.required, Validators.pattern(/^\d{5,15}$/)]],
      firmaBase64: [''],
    });
  }

  get f() { return this.form.controls as any; }

  ngAfterViewInit(): void {
    // Inicializa SignaturePad
    this.pad = new SignaturePad(this.sigCanvas.nativeElement, {
      minWidth: 0.8,
      maxWidth: 2.2,
      throttle: 16,
    });

    // Estado inicial
    this.updateState();

    // Rescalar en arranque y en cambios de tamaño/orientación
    this.resizeCanvas();
    this.checkOrientation();
    window.setTimeout(() => this.resizeCanvas(), 0);

    // Compatibilidad con versiones:
    //  - v4+: addEventListener('endStroke', ...)
    //  - v1.x: propiedad onEnd
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
    ].map(x => (x ?? '').trim()).filter(Boolean);
    const full = parts.join(' ').replace(/\s+/g, ' ').trim();
    return full || null;
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
    this.nombreCompleto = null; // limpiar UI previa
    Swal.fire({
      icon: 'info',
      title: 'Buscando…',
      text: 'Consultando información del candidato.',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    this.candidateS.buscarCandidatoPorCedula(numeroCedula).subscribe({
      next: (res: BuscarCedulaResponse) => {
        Swal.close();
        this.searching = false;

        const first = Array.isArray(res?.data) && res.data.length ? res.data[0] : null;
        this.nombreCompleto = this.buildNombreCompleto(first);

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

        if (err?.error?.message?.startsWith('No se encontraron datos')) {
          Swal.fire('Cédula no encontrada', 'Procede a llenar el formulario con los datos por favor.', 'success');
        } else {
          Swal.fire('Error', 'No fue posible realizar la búsqueda. Intenta de nuevo.', 'error');
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

    const dataUrl = this.pad.toDataURL('image/png'); // base64
    this.form.patchValue({ firmaBase64: dataUrl });

    this.saving = true;
    Swal.fire({
      icon: 'info',
      title: 'Guardando…',
      text: 'Subiendo tu firma.',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    // Llama a tu servicio (ajusta el endpoint si tienes uno específico para firma solicitante)
    this.candidateS.subirFirmaBase64(numeroCedula, dataUrl).subscribe({
      next: () => {
        Swal.close();
        this.saving = false;
        Swal.fire('¡Listo!', 'La firma se guardó correctamente.', 'success');
      },
      error: () => {
        Swal.close();
        this.saving = false;
        Swal.fire('Error', 'No se pudo guardar la firma. Intenta de nuevo.', 'error');
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

    // ancho al 100% del contenedor; alto dependiendo del modo
    const isPortrait = window.matchMedia('(orientation: portrait)').matches;
    const isSmall = window.matchMedia('(max-width: 768px)').matches;

    const cssWidth = wrapper.clientWidth || 320;
    const cssHeight = isSmall ? (isPortrait ? 220 : 280) : 320;

    // Setear tamaño interno (HiDPI) y escalar
    canvas.width = Math.floor(cssWidth * ratio);
    canvas.height = Math.floor(cssHeight * ratio);
    canvas.style.width = cssWidth + 'px';
    canvas.style.height = cssHeight + 'px';

    const ctx = canvas.getContext('2d')!;
    ctx.scale(ratio, ratio);

    // Al cambiar width/height el canvas se limpia → limpiamos y refrescamos estado
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
