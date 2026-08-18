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
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';
import { jsPDF } from 'jspdf';

import { DocumentManagementS } from '../../services/document-management-s/document-management-s';

/** id=29 (CEDULA) en `table_document_type` de prod. */
const TIPO_DOCUMENTAL_CEDULA = 29;

/** Las dos caras que se capturan, en el orden en que salen en el PDF. */
export type Cara = 'frente' | 'respaldo';
const CARAS: { id: Cara; titulo: string; ayuda: string }[] = [
  { id: 'frente', titulo: 'Cara frontal', ayuda: 'La cara con la foto y el número' },
  { id: 'respaldo', titulo: 'Cara posterior', ayuda: 'La cara con la huella y la firma' },
];

/**
 * Proporción de una cédula (formato ID-1: 85,6 × 54 mm). La guía en pantalla y
 * el recorte usan exactamente esta relación, así que lo que la persona encuadra
 * es lo que queda en el PDF.
 */
const RATIO_CEDULA = 85.6 / 54;

/**
 * Resolución objetivo del lado largo del recorte. 2000 px sobre 85,6 mm da
 * ~590 ppp: más que suficiente para leer el documento y para que un OCR o un
 * revisor humano no tenga que adivinar. Subirlo solo engorda el PDF.
 */
const ANCHO_SALIDA = 2000;

/** Tope del PDF final. El backend acepta más, pero un adjunto gigante en una
 *  oficina con internet lento es un envío que falla a la mitad. */
const MAX_PDF_MB = 15;

/**
 * Captura de cédula reutilizable: toma (o recibe) las dos caras, las recorta a
 * proporción de cédula con realce tipo escáner, arma el PDF de UNA hoja carta
 * con ambas caras al 150% del tamaño real (la "fotocopia ampliada al 150%" que
 * se entrega en papelería) y lo guarda en el expediente bajo la cédula dada.
 *
 * La usan la página /formulario/escaner-cedula y el paso 1 del formulario de
 * contratación. Cada tarjeta vacía muestra un EJEMPLO gráfico de cómo debe
 * verse esa cara, para que la persona sepa qué lado va en cada foto.
 */
@Component({
  selector: 'app-captura-cedula',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './captura-cedula.html',
  styleUrl: './captura-cedula.css',
})
export class CapturaCedula implements OnDestroy {
  @ViewChild('video') videoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('archivo') archivoRef?: ElementRef<HTMLInputElement>;

  /** Cédula bajo la que se archiva el PDF. Sin ella la captura queda bloqueada. */
  @Input() cedula = '';

  /** Se emite cuando el PDF quedó guardado en el expediente. */
  @Output() guardado = new EventEmitter<void>();

  readonly caras = CARAS;
  readonly ratioCedula = RATIO_CEDULA;

  private readonly isBrowser: boolean;

  /** Capturas ya procesadas, listas para el PDF. */
  capturas: Partial<Record<Cara, string>> = {};

  /** Cara sobre la que se está trabajando (cámara o selección de archivo). */
  caraActiva: Cara | null = null;

  /** Visor de cámara a pantalla completa abierto. Es distinto de `caraActiva`:
   *  subir una foto desde archivo también fija la cara pero no abre el visor. */
  visorAbierto = false;

  camaraLista = false;

  /** Proporción real del fotograma. El marco del visor la adopta para que la
   *  guía de encuadre coincida exactamente con el recorte de `tomarFoto()`. */
  videoRatio = 16 / 9;

  procesando = false;
  generando = false;
  guardadoOk = false;
  errorCamara: string | null = null;

  /** Realce tipo escáner. Se puede apagar si la cámara ya da buena imagen. */
  mejorar = true;

  private stream: MediaStream | null = null;

  constructor(
    private documentos: DocumentManagementS,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: Object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnDestroy(): void {
    this.apagarCamara();
  }

  // ───────────────────────── Estado derivado ─────────────────────────

  get cedulaLimpia(): string {
    return String(this.cedula || '').trim();
  }

  get completo(): boolean {
    return !!this.capturas.frente && !!this.capturas.respaldo;
  }

  get puedeCapturar(): boolean {
    return !!this.cedulaLimpia;
  }

  tieneCaptura(cara: Cara): boolean {
    return !!this.capturas[cara];
  }

  // ───────────────────────── Cámara ─────────────────────────

  async capturarCara(cara: Cara): Promise<void> {
    if (!this.isBrowser || !this.puedeCapturar) return;

    this.caraActiva = cara;
    this.visorAbierto = true;
    this.errorCamara = null;
    this.camaraLista = false;
    this.cdr.markForCheck();

    try {
      this.apagarCamara();
      // `environment` = cámara trasera en celular, que es la que enfoca de cerca.
      // Se pide la resolución más alta disponible: el recorte descarta casi todo
      // el encuadre, así que partir de 720p deja el documento borroso.
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 3840 },
          height: { ideal: 2160 },
        },
        audio: false,
      });

      // El <video> solo existe cuando el `@if (visorAbierto)` ya se pintó. Con
      // OnPush eso no pasa solo por volver del await: hay que forzar el ciclo.
      this.cdr.detectChanges();
      const video = this.videoRef?.nativeElement;
      if (!video) throw new Error('No se pudo iniciar la vista de la cámara.');

      video.srcObject = this.stream;
      await video.play();
      // `camaraLista` lo confirma `onVideoListo()` cuando ya hay dimensiones;
      // marcarlo acá mostraría el disparador antes de que haya imagen.
    } catch (e: any) {
      console.error('[captura-cedula] cámara:', e);
      this.apagarCamara();
      this.caraActiva = null;
      this.visorAbierto = false;
      this.errorCamara = this.mensajeErrorCamara(e);
      Swal.fire({
        icon: 'error',
        title: 'No se pudo abrir la cámara',
        html: `<p style="text-align:left">${this.errorCamara}</p>
               <p style="text-align:left;font-size:13px;color:#6b7280;margin-top:10px;">
                 También puede subir una foto desde el dispositivo con el botón <b>Subir foto</b>.</p>`,
        confirmButtonColor: '#111827',
      });
    } finally {
      this.cdr.markForCheck();
    }
  }

  private mensajeErrorCamara(e: any): string {
    const n = String(e?.name || '');
    // NotAllowedError también salta cuando el permiso del sitio está concedido
    // pero algo por encima lo niega (privacidad de cámara del sistema operativo;
    // ya pasó con el Permissions-Policy del borde). No culpar solo al candado.
    if (n === 'NotAllowedError') return 'El navegador no permitió usar la cámara. Revise el candado de la barra de direcciones y, si ahí ya aparece permitida, la privacidad de cámara del sistema (en Windows: Configuración → Privacidad y seguridad → Cámara).';
    if (n === 'NotFoundError') return 'Este dispositivo no tiene una cámara disponible.';
    if (n === 'NotReadableError') return 'La cámara está siendo usada por otra aplicación. Ciérrela e intente de nuevo.';
    return 'Revise que el navegador tenga permiso para usar la cámara.';
  }

  /** El fotograma real puede no ser el pedido (la cámara negocia la resolución). */
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
    this.caraActiva = null;
    this.visorAbierto = false;
    this.cdr.markForCheck();
  }

  private apagarCamara(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.camaraLista = false;
  }

  /**
   * Toma el fotograma actual y se queda SOLO con lo que está dentro de la guía.
   * La guía en pantalla y este recorte usan la misma proporción y el mismo 82%
   * de ancho, así que lo encuadrado es exactamente lo que se guarda.
   */
  async tomarFoto(): Promise<void> {
    const video = this.videoRef?.nativeElement;
    const cara = this.caraActiva;
    if (!video || !cara || !video.videoWidth) return;

    this.procesando = true;
    this.cdr.markForCheck();

    try {
      const vw = video.videoWidth;
      const vh = video.videoHeight;

      // Rectángulo de la guía, en píxeles del fotograma.
      let rw = vw * 0.82;
      let rh = rw / RATIO_CEDULA;
      if (rh > vh * 0.82) {
        rh = vh * 0.82;
        rw = rh * RATIO_CEDULA;
      }
      const rx = (vw - rw) / 2;
      const ry = (vh - rh) / 2;

      const salidaW = Math.min(ANCHO_SALIDA, Math.round(rw));
      const salidaH = Math.round(salidaW / RATIO_CEDULA);

      const canvas = document.createElement('canvas');
      canvas.width = salidaW;
      canvas.height = salidaH;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('canvas no disponible');

      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(video, rx, ry, rw, rh, 0, 0, salidaW, salidaH);

      if (this.mejorar) this.realceEscaner(ctx, salidaW, salidaH);

      // JPEG 0.92: sobre un documento, 0.8 ya deja artefactos alrededor del texto.
      this.capturas[cara] = canvas.toDataURL('image/jpeg', 0.92);
      this.guardadoOk = false;

      this.apagarCamara();
      this.caraActiva = null;
      this.visorAbierto = false;
    } catch (e) {
      console.error('[captura-cedula] captura:', e);
      Swal.fire('Error', 'No se pudo tomar la foto. Intente de nuevo.', 'error');
    } finally {
      this.procesando = false;
      this.cdr.markForCheck();
    }
  }

  // ───────────────────── Realce tipo escáner ─────────────────────

  /**
   * Lo que separa una foto de un escaneo: fondo blanco parejo, tinta oscura y
   * bordes definidos. Se hace en dos pasos sobre el canvas ya recortado.
   *
   * 1. Balance por canal contra percentiles (2% / 98%). Estirar contra el mínimo
   *    y el máximo absolutos no sirve: basta un reflejo o una mota negra para que
   *    el rango quede igual y la imagen no cambie. Los percentiles ignoran esos
   *    extremos y de paso corrigen la dominante amarilla de la luz de oficina.
   * 2. Máscara de enfoque suave, que es lo que devuelve nitidez al texto chico
   *    después de reescalar.
   */
  private realceEscaner(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    const total = w * h;

    // ── 1. Niveles por canal ──
    for (let c = 0; c < 3; c++) {
      const hist = new Uint32Array(256);
      for (let i = 0; i < total; i++) hist[d[i * 4 + c]]++;

      const corte = Math.max(1, Math.floor(total * 0.02));
      let acc = 0, lo = 0, hi = 255;
      for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc > corte) { lo = v; break; } }
      acc = 0;
      for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc > corte) { hi = v; break; } }

      // Un rango minúsculo es una foto plana (tapada o velada): estirarla solo
      // amplifica ruido.
      if (hi - lo < 24) continue;

      const escala = 255 / (hi - lo);
      const lut = new Uint8ClampedArray(256);
      for (let v = 0; v < 256; v++) lut[v] = Math.min(255, Math.max(0, (v - lo) * escala));
      for (let i = 0; i < total; i++) d[i * 4 + c] = lut[d[i * 4 + c]];
    }

    // ── 2. Máscara de enfoque ──
    // Se trabaja sobre una copia: leer y escribir el mismo búfer haría que cada
    // píxel se enfocara contra vecinos ya modificados.
    const src = new Uint8ClampedArray(d);
    const fuerza = 0.6;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = (y * w + x) * 4;
        for (let c = 0; c < 3; c++) {
          const p = i + c;
          const vecinos =
            src[p - 4] + src[p + 4] +
            src[p - w * 4] + src[p + w * 4];
          // Laplaciano 4-vecinos: centro*(1+4k) - vecinos*k
          const val = src[p] * (1 + 4 * fuerza) - vecinos * fuerza;
          d[p] = val < 0 ? 0 : val > 255 ? 255 : val;
        }
      }
    }

    ctx.putImageData(img, 0, 0);
  }

  // ───────────────────── Subir foto desde archivo ─────────────────────

  /** Alternativa cuando no hay cámara: la foto se recorta y realza igual. */
  pedirArchivo(cara: Cara): void {
    if (!this.puedeCapturar) return;
    this.caraActiva = cara;
    this.archivoRef?.nativeElement.click();
  }

  async onArchivo(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    const cara = this.caraActiva;
    input.value = ''; // permite volver a elegir el mismo archivo
    if (!file || !cara) return;

    if (!/^image\//.test(file.type)) {
      Swal.fire('Archivo inválido', 'Seleccione una imagen (foto de la cédula).', 'warning');
      this.caraActiva = null;
      this.cdr.markForCheck();
      return;
    }

    this.procesando = true;
    this.cdr.markForCheck();

    try {
      const bitmap = await this.cargarImagen(file);
      // Recorte centrado a proporción de cédula: la foto de un celular trae
      // mesa y manos alrededor.
      let rw = bitmap.width;
      let rh = rw / RATIO_CEDULA;
      if (rh > bitmap.height) {
        rh = bitmap.height;
        rw = rh * RATIO_CEDULA;
      }
      const rx = (bitmap.width - rw) / 2;
      const ry = (bitmap.height - rh) / 2;

      const salidaW = Math.min(ANCHO_SALIDA, Math.round(rw));
      const salidaH = Math.round(salidaW / RATIO_CEDULA);

      const canvas = document.createElement('canvas');
      canvas.width = salidaW;
      canvas.height = salidaH;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('canvas no disponible');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(bitmap, rx, ry, rw, rh, 0, 0, salidaW, salidaH);

      if (this.mejorar) this.realceEscaner(ctx, salidaW, salidaH);
      this.capturas[cara] = canvas.toDataURL('image/jpeg', 0.92);
      this.guardadoOk = false;
    } catch (e) {
      console.error('[captura-cedula] archivo:', e);
      Swal.fire('Error', 'No se pudo leer la imagen.', 'error');
    } finally {
      this.caraActiva = null;
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

  repetir(cara: Cara): void {
    delete this.capturas[cara];
    this.guardadoOk = false;
    this.cdr.markForCheck();
  }

  // ───────────────────────── PDF ─────────────────────────

  /**
   * Arma el PDF: UNA página carta con las dos caras al 150% del tamaño real de
   * la cédula (85,6 × 54 mm → 128,4 × 81 mm), frontal arriba y posterior abajo.
   * Es el formato de la "fotocopia de la cédula ampliada al 150%" que se
   * entrega en papelería; por eso no se estira la imagen al ancho de la hoja:
   * la copia debe quedar del tamaño exigido, no lo más grande posible.
   */
  private construirPdf(): jsPDF {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();

    const w = 85.6 * 1.5;
    const h = 54 * 1.5;
    const gap = 14;

    const x = (pw - w) / 2;
    let y = (ph - (h * 2 + gap)) / 2;

    CARAS.forEach((cara) => {
      const data = this.capturas[cara.id];
      if (!data) return;

      // FAST comprime; el JPEG ya viene comprimido y recomprimir degrada el texto.
      doc.addImage(data, 'JPEG', x, y, w, h, undefined, 'NONE');

      doc.setDrawColor(210);
      doc.rect(x, y, w, h);

      y += h + gap;
    });

    doc.setFontSize(9);
    doc.setTextColor(140);
    doc.text(`Cédula ${this.cedulaLimpia} · copia al 150%`, pw / 2, ph - 12, { align: 'center' });

    return doc;
  }

  private nombreArchivo(): string {
    return `cedula_${this.cedulaLimpia}.pdf`;
  }

  descargarPdf(): void {
    if (!this.completo) return;
    this.construirPdf().save(this.nombreArchivo());
  }

  /** Genera el PDF y lo sube al expediente de la cédula. */
  async guardar(): Promise<void> {
    if (!this.completo || this.generando || !this.puedeCapturar) return;

    const confirm = await Swal.fire({
      icon: 'question',
      title: 'Guardar la cédula',
      html: `<p style="text-align:left;margin:0 0 10px;">Se guardará un PDF de 1 hoja con las dos caras al 150% en el expediente de:</p>
             <div style="background:#f3f4f6;border-radius:10px;padding:12px;text-align:center;">
               <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.04em;">Cédula</div>
               <div style="font-size:24px;font-weight:700;color:#111827;">${this.cedulaLimpia}</div>
             </div>`,
      showCancelButton: true,
      confirmButtonText: 'Sí, guardar',
      cancelButtonText: 'Revisar',
      reverseButtons: true,
      confirmButtonColor: '#111827',
    });
    if (!confirm.isConfirmed) return;

    this.generando = true;
    this.cdr.markForCheck();

    try {
      const blob = this.construirPdf().output('blob');
      const mb = blob.size / (1024 * 1024);
      if (mb > MAX_PDF_MB) {
        Swal.fire({
          icon: 'warning',
          title: 'El archivo quedó muy pesado',
          text: `El PDF pesa ${mb.toFixed(1)} MB. Vuelva a tomar las fotos con menos luz de fondo.`,
          confirmButtonColor: '#111827',
        });
        return;
      }

      const file = new File([blob], this.nombreArchivo(), { type: 'application/pdf' });

      Swal.fire({ title: 'Guardando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      await firstValueFrom(
        this.documentos.guardarDocumento(this.nombreArchivo(), this.cedulaLimpia, TIPO_DOCUMENTAL_CEDULA, file)
      );

      this.guardadoOk = true;
      this.guardado.emit();

      await Swal.fire({
        icon: 'success',
        title: 'Cédula guardada',
        html: `<p style="text-align:left">El documento quedó archivado bajo la cédula <b>${this.cedulaLimpia}</b>.</p>`,
        confirmButtonColor: '#111827',
      });
    } catch (e: any) {
      console.error('[captura-cedula] guardar:', e);
      const detalle = e?.error?.detail || e?.error?.file || e?.message || '';
      Swal.fire({
        icon: 'error',
        title: 'No se pudo guardar',
        html: `<p style="text-align:left">Las fotos siguen acá: puede descargar el PDF e intentar de nuevo.</p>
               ${detalle ? `<p style="text-align:left;font-size:12px;color:#b45309;">${String(detalle)}</p>` : ''}`,
        confirmButtonColor: '#111827',
      });
    } finally {
      this.generando = false;
      this.cdr.markForCheck();
    }
  }

  limpiar(): void {
    this.capturas = {};
    this.caraActiva = null;
    this.visorAbierto = false;
    this.guardadoOk = false;
    this.apagarCamara();
    this.cdr.markForCheck();
  }
}
