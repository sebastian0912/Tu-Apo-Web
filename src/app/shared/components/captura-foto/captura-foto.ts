import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
  ElementRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import Swal from 'sweetalert2';

/** Proporción tipo documento (3:4 vertical) y resolución de salida. */
const RATIO_FOTO = 3 / 4;
const ALTO_SALIDA = 1200;

/**
 * Captura de la foto del candidato (tipo carné): cámara frontal con guía oval
 * o archivo del dispositivo, recorte centrado 3:4 y ejemplo gráfico de cómo
 * debe verse. NO sube nada: emite el `File` al padre, que decide cuándo
 * enviarlo (la foto de biometría exige que el candidato ya exista en el
 * sistema, así que el formulario la sube al finalizar el registro).
 */
@Component({
  selector: 'app-captura-foto',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './captura-foto.html',
  styleUrl: './captura-foto.css',
})
export class CapturaFoto implements OnDestroy {
  @ViewChild('video') videoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('archivo') archivoRef?: ElementRef<HTMLInputElement>;

  /** Solo para nombrar el archivo emitido (foto_<cedula>.jpg). */
  @Input() cedula = '';

  /** Habilita los botones; el padre decide cuándo se puede capturar. */
  @Input() habilitado = true;

  /** File listo (o null si se repite/limpia). El padre lo sube cuando toque. */
  @Output() archivoListo = new EventEmitter<File | null>();

  readonly ratioFoto = RATIO_FOTO;

  private readonly isBrowser: boolean;

  /** Vista previa de la foto ya recortada. */
  preview: string | null = null;

  visorAbierto = false;
  camaraLista = false;
  videoRatio = 3 / 4;
  procesando = false;

  /** La cámara frontal se ve en espejo (como un espejo real) pero la foto se
   *  guarda SIN espejo, que es como quedan las fotos de documento. */
  espejo = true;

  private stream: MediaStream | null = null;

  constructor(
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: Object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnDestroy(): void {
    this.apagarCamara();
  }

  get tieneFoto(): boolean {
    return !!this.preview;
  }

  // ───────────────────────── Cámara ─────────────────────────

  async abrirCamara(): Promise<void> {
    if (!this.isBrowser || !this.habilitado) return;

    this.visorAbierto = true;
    this.camaraLista = false;
    this.cdr.markForCheck();

    try {
      this.apagarCamara();
      // `user` = cámara frontal: la persona se toma la foto a sí misma viéndose
      // en pantalla, como en cualquier registro con selfie.
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'user' },
          width: { ideal: 1920 },
          height: { ideal: 1920 },
        },
        audio: false,
      });

      this.espejo = true;
      this.cdr.detectChanges();
      const video = this.videoRef?.nativeElement;
      if (!video) throw new Error('No se pudo iniciar la vista de la cámara.');

      video.srcObject = this.stream;
      await video.play();
    } catch (e: any) {
      console.error('[captura-foto] cámara:', e);
      this.apagarCamara();
      this.visorAbierto = false;
      Swal.fire({
        icon: 'error',
        title: 'No se pudo abrir la cámara',
        html: `<p style="text-align:left">Revise que el navegador tenga permiso para usar la cámara.</p>
               <p style="text-align:left;font-size:13px;color:#6b7280;margin-top:10px;">
                 También puede subir una foto desde el dispositivo con el botón <b>Subir foto</b>.</p>`,
        confirmButtonColor: '#111827',
      });
    } finally {
      this.cdr.markForCheck();
    }
  }

  onVideoListo(): void {
    const v = this.videoRef?.nativeElement;
    if (v?.videoWidth && v.videoHeight) {
      this.videoRatio = v.videoWidth / v.videoHeight;
      this.camaraLista = true;
      this.cdr.markForCheck();
    }
  }

  cancelarCaptura(): void {
    this.apagarCamara();
    this.visorAbierto = false;
    this.cdr.markForCheck();
  }

  private apagarCamara(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.camaraLista = false;
  }

  /** Recorta el centro del fotograma a 3:4 (lo que enmarca la guía). */
  async tomarFoto(): Promise<void> {
    const video = this.videoRef?.nativeElement;
    if (!video || !video.videoWidth) return;

    this.procesando = true;
    this.cdr.markForCheck();

    try {
      const vw = video.videoWidth;
      const vh = video.videoHeight;

      let rh = vh;
      let rw = rh * RATIO_FOTO;
      if (rw > vw) {
        rw = vw;
        rh = rw / RATIO_FOTO;
      }
      const rx = (vw - rw) / 2;
      const ry = (vh - rh) / 2;

      const salidaH = Math.min(ALTO_SALIDA, Math.round(rh));
      const salidaW = Math.round(salidaH * RATIO_FOTO);

      const canvas = document.createElement('canvas');
      canvas.width = salidaW;
      canvas.height = salidaH;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas no disponible');
      ctx.imageSmoothingQuality = 'high';
      // Sin espejo: la vista previa en vivo se espeja solo con CSS.
      ctx.drawImage(video, rx, ry, rw, rh, 0, 0, salidaW, salidaH);

      await this.emitirDesdeCanvas(canvas);

      this.apagarCamara();
      this.visorAbierto = false;
    } catch (e) {
      console.error('[captura-foto] captura:', e);
      Swal.fire('Error', 'No se pudo tomar la foto. Intente de nuevo.', 'error');
    } finally {
      this.procesando = false;
      this.cdr.markForCheck();
    }
  }

  // ───────────────────── Subir desde archivo ─────────────────────

  pedirArchivo(): void {
    if (!this.habilitado) return;
    this.archivoRef?.nativeElement.click();
  }

  async onArchivo(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (!/^image\//.test(file.type)) {
      Swal.fire('Archivo inválido', 'Seleccione una imagen (su foto).', 'warning');
      return;
    }

    this.procesando = true;
    this.cdr.markForCheck();

    try {
      const img = await this.cargarImagen(file);
      // Recorte centrado a 3:4, igual que la cámara.
      let rh = img.height;
      let rw = rh * RATIO_FOTO;
      if (rw > img.width) {
        rw = img.width;
        rh = rw / RATIO_FOTO;
      }
      const rx = (img.width - rw) / 2;
      const ry = (img.height - rh) / 2;

      const salidaH = Math.min(ALTO_SALIDA, Math.round(rh));
      const salidaW = Math.round(salidaH * RATIO_FOTO);

      const canvas = document.createElement('canvas');
      canvas.width = salidaW;
      canvas.height = salidaH;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas no disponible');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, rx, ry, rw, rh, 0, 0, salidaW, salidaH);

      await this.emitirDesdeCanvas(canvas);
    } catch (e) {
      console.error('[captura-foto] archivo:', e);
      Swal.fire('Error', 'No se pudo leer la imagen.', 'error');
    } finally {
      this.procesando = false;
      this.cdr.markForCheck();
    }
  }

  private cargarImagen(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('imagen ilegible')); };
      img.src = url;
    });
  }

  private emitirDesdeCanvas(canvas: HTMLCanvasElement): Promise<void> {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error('sin blob')); return; }
        this.preview = canvas.toDataURL('image/jpeg', 0.9);
        const nombre = `foto_${String(this.cedula || '').trim() || 'candidato'}.jpg`;
        this.archivoListo.emit(new File([blob], nombre, { type: 'image/jpeg' }));
        resolve();
      }, 'image/jpeg', 0.9);
    });
  }

  repetir(): void {
    this.preview = null;
    this.archivoListo.emit(null);
    this.cdr.markForCheck();
  }
}
