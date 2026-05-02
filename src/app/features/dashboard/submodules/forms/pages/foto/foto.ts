import { 
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  ChangeDetectionStrategy
} from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormGroup,
} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import Swal from 'sweetalert2';

import { SharedModule } from '../../../../../../shared/shared-module';

// Use same services as firma
import { CandidatoNewS } from '../../../../../../shared/services/candidato-new/candidato-new-s';

interface CandidateData {
  primer_nombre?: string;
  segundo_nombre?: string;
  primer_apellido?: string;
  segundo_apellido?: string;
  numero_documento?: string;
  biometria?: {
    foto?: { file_url?: string; file?: string };
  };
  [k: string]: any;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-foto',
  standalone: true,
  imports: [SharedModule, ReactiveFormsModule],
  templateUrl: './foto.html',
  styleUrls: ['./foto.css'],
} )
export class Foto implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  form: FormGroup;
  searching = false;
  saving = false;

  // Camera state
  isCameraActive = false;
  mediaStream: MediaStream | null = null;
  capturedPhotoBase64: string | null = null;
  cameraError: string | null = null;

  // Candidate state
  nombreCompleto: string | null = null;
  candidatoData: any = null;
  fotoSaved = false;

  private static readonly EMPRESAS: Record<
    string,
    { nombre: string; nit?: string }
  > = {
    'apoyo-laboral': { nombre: 'APOYO LABORAL T.S. S.A.S.', nit: '900.318.240-1' },
    'tu-alianza': { nombre: 'TU ALIANZA SAS', nit: '901.054.654-7' },
  };

  empresaSlug = 'apoyo-laboral';
  empresaNombre = Foto.EMPRESAS['apoyo-laboral'].nombre;

  constructor(
    private fb: FormBuilder,
    private candidateS: CandidatoNewS,
    private route: ActivatedRoute,
    private titleService: Title,
    private metaService: Meta
  ) {
    this.form = this.fb.group({
      numeroCedula: [
        '',
        [Validators.required, Validators.pattern(/^\d{5,15}$/)],
      ],
      userAgent: [''],
    });
  }

  get f() {
    return this.form.controls as any;
  }

  ngOnInit(): void {
    const slug = (
      this.route.snapshot.paramMap.get('empresa') || 'apoyo-laboral'
    ).toLowerCase();
    const cfg = Foto.EMPRESAS[slug] ?? Foto.EMPRESAS['apoyo-laboral'];
    this.empresaSlug = slug;
    this.empresaNombre = cfg.nombre;

    this.titleService.setTitle(
      `Captura de Foto — ${cfg.nombre} | Gestión Gerencial`
    );
    this.metaService.updateTag({
      name: 'description',
      content: `Página oficial para captura de foto de candidatos — ${cfg.nombre}.`,
    });

    if (typeof navigator !== 'undefined') {
      this.form.patchValue({ userAgent: navigator.userAgent });
    }
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  // ── Helpers ──
  private buildNombreCompleto(d?: CandidateData | null): string | null {
    if (!d) return null;
    const parts = [
      d.primer_nombre,
      d.segundo_nombre,
      d.primer_apellido,
      d.segundo_apellido,
    ]
      .map((x) => (x ?? '').toString().trim())
      .filter(Boolean);
    const full = parts.join(' ').replace(/\s+/g, ' ').trim();
    return full || null;
  }

  // ── Búsqueda ──
  async buscarCedula(): Promise<void> {
    const numeroCedula = (this.form.value.numeroCedula || '').toString().trim();
    if (this.f.numeroCedula.invalid) {
      this.f.numeroCedula.markAsTouched();
      Swal.fire('Error', 'Por favor, ingresa una cédula válida.', 'error');
      return;
    }

    this.searching = true;
    this.nombreCompleto = null;
    this.candidatoData = null;
    this.capturedPhotoBase64 = null;
    this.fotoSaved = false;
    this.stopCamera(); // Stop camera if active on new search

    Swal.fire({
      icon: 'info',
      title: 'Buscando…',
      text: 'Consultando información del candidato.',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
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
          // Auto-start camera after finding candidate
          if (!cand?.biometria?.foto?.file_url) {
             this.startCamera();
          } else {
             // Already has photo, let user decide if they want to update
             this.capturedPhotoBase64 = cand.biometria.foto.file_url;
          }
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
          Swal.fire(
            'Cédula no encontrada',
            'Procede a consultar con el administrador.',
            'success'
          );
        } else {
          Swal.fire('Error', msg, 'error');
        }
      },
    });
  }

  // ── Cámara ──
  async startCamera(): Promise<void> {
    this.cameraError = null;
    this.capturedPhotoBase64 = null;
    
    try {
      if (this.mediaStream) {
        this.stopCamera();
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      this.isCameraActive = true;

      // Small delay to ensure the video element is rendered
      setTimeout(() => {
        if (this.videoElement && this.videoElement.nativeElement) {
          const video = this.videoElement.nativeElement;
          video.srcObject = this.mediaStream;
          video.play().catch(e => console.error("Error playing video:", e));
        }
      }, 100);

    } catch (err: any) {
      console.error('Error accessing camera:', err);
      this.isCameraActive = false;
      this.cameraError = 'No se pudo acceder a la cámara. Por favor, revisa los permisos.';
      Swal.fire('Error de Cámara', this.cameraError, 'error');
    }
  }

  stopCamera(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    this.isCameraActive = false;
  }

  capturePhoto(): void {
    if (!this.videoElement || !this.canvasElement) return;

    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      Swal.fire('Error', 'La cámara no está lista aún.', 'warning');
      return;
    }

    // Capture exact video dimensions to maintain aspect ratio
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Get quality jpeg
    this.capturedPhotoBase64 = canvas.toDataURL('image/jpeg', 0.9);
    
    // Stop camera to freeze on the captured image in UX mind
    this.stopCamera();
  }
  
  retakePhoto(): void {
    this.capturedPhotoBase64 = null;
    this.startCamera();
  }

  // ── Guardar ──
  dataUrlToFile(dataUrl: string, filename: string): File {
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }

  async guardarFoto(): Promise<void> {
    if (!this.capturedPhotoBase64) {
      Swal.fire('Atención', 'Primero debes capturar una foto.', 'info');
      return;
    }

    const { isConfirmed } = await Swal.fire({
      title: 'Guardar Foto',
      text: '¿Confirmas que la foto cumple con los requisitos de tipo documento?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, guardar',
      cancelButtonText: 'Cancelar',
    });

    if (!isConfirmed) return;

    const numeroCedula = (this.form.value.numeroCedula || '').toString().trim();
    
    // Check if it's an existing URL from backend (user didn't retake)
    if (this.capturedPhotoBase64.startsWith('http')) {
      Swal.fire('Información', 'Esta es la foto actual que ya está guardada.', 'info');
      return;
    }

    const fileName = `foto_${numeroCedula}_${Date.now()}.jpg`;
    const file = this.dataUrlToFile(this.capturedPhotoBase64, fileName);

    this.saving = true;
    Swal.fire({
      icon: 'info',
      title: 'Guardando…',
      text: 'Subiendo la foto tipo documento.',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    // Persistir captura para recuperación si el upload falla
    this.persistPendingFoto(numeroCedula, this.capturedPhotoBase64);

    try {
      await this.uploadWithRetry(() => this.candidateS.uploadFoto(numeroCedula, file));
      this.clearPendingFoto(numeroCedula);
      Swal.close();
      this.saving = false;
      this.fotoSaved = true;
      Swal.fire('¡Listo!', 'La foto se guardó correctamente como documento tipo 89.', 'success');
    } catch (err: any) {
      Swal.close();
      this.saving = false;
      const msg: string =
        err?.error?.detail ||
        err?.error?.message ||
        err?.message ||
        'No se pudo guardar la foto. Intenta de nuevo.';
      const status = err?.status ?? 0;
      Swal.fire(
        'No se pudo guardar (la foto quedó respaldada localmente)',
        `${msg}<br><br>Estado: ${status}. Tu foto está guardada en este dispositivo y puedes reintentar.`,
        'error'
      );
    }
  }

  // ── Robustez: retry con backoff + persistencia local ──
  private readonly UPLOAD_RETRY_STATUS = new Set<number>([0, 408, 425, 429, 500, 502, 503, 504]);

  private uploadWithRetry<T>(invoke: () => any, attempts = 3): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      let tryNumber = 0;
      const run = () => {
        tryNumber++;
        invoke().subscribe({
          next: (res: T) => resolve(res),
          error: (err: any) => {
            const code = err?.status ?? 0;
            const retryable = this.UPLOAD_RETRY_STATUS.has(code);
            if (retryable && tryNumber < attempts) {
              const delay = 800 * Math.pow(2, tryNumber - 1);
              setTimeout(run, delay);
            } else {
              reject(err);
            }
          },
        });
      };
      run();
    });
  }

  private fotoStorageKey(numeroCedula: string): string {
    return `ta_pending_foto_${numeroCedula}`;
  }

  private persistPendingFoto(numeroCedula: string, dataUrl: string): void {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(
        this.fotoStorageKey(numeroCedula),
        JSON.stringify({ dataUrl, ts: Date.now() })
      );
    } catch { /* quota o SSR */ }
  }

  private clearPendingFoto(numeroCedula: string): void {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.removeItem(this.fotoStorageKey(numeroCedula));
    } catch { /* noop */ }
  }
}
