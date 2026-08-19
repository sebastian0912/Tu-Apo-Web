import { ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';

/**
 * Página pública de un FORMULARIO DINÁMICO (sin login). Se sirve en tuapo.co/fd/:token
 * y consume api.tuapo.co/api/dynamic-forms/public/* (anónimo, rate-limit por IP).
 * El token es de un LINK compartible (expirable/revocable/con cupo), no del formulario.
 * Self-contained (sin Material), mismo criterio que public-form (f/:token legacy).
 *
 * Media: se sube PRIMERO a /public/:token/upload (fail-closed en el backend hacia
 * ms-documents) y al payload solo viaja la referencia {source, document_id, ...}.
 */

// El endpoint público vive en el gateway, NO en el backend legacy (environment.apiUrl).
const GATEWAY = 'https://api.tuapo.co';

interface FieldOption { value: string; label: string; }
interface FieldSchema {
  placeholder?: string;
  description?: string;
  text?: string;
  options?: FieldOption[];
  rating_config?: { scale_max?: number; show_labels?: boolean; labels?: Record<string, string> };
  ui?: { variant?: string; full_width?: boolean };
  validation?: {
    required?: boolean;
    min_length?: number | null; max_length?: number | null;
    min_value?: number | null; max_value?: number | null;
    min_date?: string | null; max_date?: string | null;
    min_time?: string | null; max_time?: string | null;
    min_selected?: number | null; max_selected?: number | null;
    max_files?: number | null; max_size_mb?: number | null;
    allowed_extensions?: string[];
  };
}
interface PublicField {
  name: string;
  label: string;
  type: string;
  order_no: number;
  required: boolean;
  schema: FieldSchema;
  children?: PublicField[];
}
interface PublicSection { code: string; title?: string | null; order_no: number; fields: PublicField[]; }
/**
 * Tema de diseño del formulario (ms-forms, df_form.ui_json). Todos los campos son
 * opcionales: lo que falte se queda con el look por defecto de esta página.
 */
interface PublicTheme {
  primary?: string; on_primary?: string; accent?: string;
  surface?: string; bg?: string; text?: string;
  header_from?: string; header_to?: string;
  radius?: number;
  cover_url?: string; cover_document_id?: number; cover_alt?: string;
}
interface PublicUi { theme?: PublicTheme; }
interface PublicStructure {
  form_name: string; form_description?: string | null;
  ui?: PublicUi | null;
  version: number; sections: PublicSection[];
}
interface DocumentRef { source: 'ms-documents'; document_id: number; filename: string; mime_type: string; size: number; }
interface Problem { detail?: string; code?: string; errors?: { section: string; field: string; message: string }[]; }

type Value = string | number | string[] | DocumentRef | DocumentRef[] | { lat: number; lng: number; timestamp: string } | null;

@Component({
  selector: 'app-public-dynamic-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="pdf">
    <div class="pdf__card">
      @if (loading()) {
        <div class="pdf__state">Cargando formulario…</div>
      } @else if (fatal()) {
        <div class="pdf__state pdf__state--err">
          <div class="pdf__icon">⚠️</div>
          <p>{{ fatal() }}</p>
        </div>
      } @else if (done()) {
        <div class="pdf__state pdf__state--ok">
          <div class="pdf__icon">✅</div>
          <h2>¡Gracias!</h2>
          <p>Tu respuesta fue registrada correctamente.</p>
        </div>
      } @else if (structure(); as st) {
        <header class="pdf__head" [class.pdf__head--cover]="coverUrl()">
          @if (coverUrl(); as url) {
            <div class="pdf__cover">
              <img [src]="url" [alt]="st.ui?.theme?.cover_alt || ''" (error)="coverUrl.set(null)" />
              <span class="pdf__cover-veil"></span>
              <div class="pdf__cover-text">
                <h1>{{ st.form_name }}</h1>
                @if (st.form_description) { <p>{{ st.form_description }}</p> }
              </div>
            </div>
          } @else {
            <h1>{{ st.form_name }}</h1>
            @if (st.form_description) { <p>{{ st.form_description }}</p> }
          }
        </header>

        <form (submit)="$event.preventDefault(); submit()">
          @for (sec of st.sections; track sec.code) {
            <section class="pdf__section">
              @if (sec.title) { <h2 class="pdf__section-title">{{ sec.title }}</h2> }
              @for (fld of sec.fields; track fld.name) {
                <ng-container *ngTemplateOutlet="fieldTpl; context: { $implicit: fld, sec: sec.code }" />
              }
            </section>
          }

          @if (submitError()) {
            <div class="pdf__error-box" role="alert">{{ submitError() }}</div>
          }

          <button class="pdf__submit" type="submit" [disabled]="sending() || uploadsInFlight() > 0">
            @if (sending()) { Enviando… } @else if (uploadsInFlight() > 0) { Subiendo archivos… } @else { Enviar respuesta }
          </button>
        </form>
      }
    </div>
  </div>

  <!-- Un campo (recursivo para SECTION, un nivel). -->
  <ng-template #fieldTpl let-fld let-sec="sec">
    @if (fld.type === 'SECTION') {
      <fieldset class="pdf__group" [id]="anchor(sec, fld.name)">
        @if (fld.label) { <legend>{{ fld.label }}</legend> }
        @for (child of fld.children ?? []; track child.name) {
          <ng-container *ngTemplateOutlet="fieldTpl; context: { $implicit: child, sec: sec }" />
        }
      </fieldset>
    } @else if (fld.type === 'COMMENT') {
      <div class="pdf__info">{{ fld.schema.text || fld.label }}</div>
    } @else {
      <div class="pdf__field" [id]="anchor(sec, fld.name)" [class.pdf__field--error]="errorOf(sec, fld.name)">
        <label>
          {{ fld.label }} @if (fld.required) { <span class="pdf__req">*</span> }
        </label>
        @if (fld.schema.description) { <small class="pdf__desc">{{ fld.schema.description }}</small> }

        @switch (fld.type) {
          @case ('TEXT_SHORT') {
            <input type="text" [placeholder]="fld.schema.placeholder || ''"
                   [maxlength]="fld.schema.validation?.max_length ?? 255"
                   [ngModel]="asText(sec, fld.name)" (ngModelChange)="set(sec, fld.name, $event || null)"
                   [name]="anchor(sec, fld.name)" />
          }
          @case ('TEXT_LONG') {
            <textarea rows="4" [placeholder]="fld.schema.placeholder || ''"
                      [maxlength]="fld.schema.validation?.max_length ?? 4000"
                      [ngModel]="asText(sec, fld.name)" (ngModelChange)="set(sec, fld.name, $event || null)"
                      [name]="anchor(sec, fld.name)"></textarea>
          }
          @case ('DATE') {
            <input type="date" [min]="fld.schema.validation?.min_date || null" [max]="fld.schema.validation?.max_date || null"
                   [ngModel]="asText(sec, fld.name)" (ngModelChange)="set(sec, fld.name, $event || null)"
                   [name]="anchor(sec, fld.name)" />
          }
          @case ('TIME') {
            <input type="time" [min]="fld.schema.validation?.min_time || null" [max]="fld.schema.validation?.max_time || null"
                   [ngModel]="asText(sec, fld.name)" (ngModelChange)="set(sec, fld.name, $event || null)"
                   [name]="anchor(sec, fld.name)" />
          }
          @case ('NUMBER') {
            <input type="number" [ngModel]="asNumber(sec, fld.name)"
                   (ngModelChange)="set(sec, fld.name, toNumber($event))" [name]="anchor(sec, fld.name)" />
          }
          @case ('CURRENCY') {
            <input type="number" inputmode="numeric" placeholder="$"
                   [ngModel]="asNumber(sec, fld.name)"
                   (ngModelChange)="set(sec, fld.name, toNumber($event))" [name]="anchor(sec, fld.name)" />
            @if (asNumber(sec, fld.name) !== null) {
              <small class="pdf__desc">{{ formatCop(asNumber(sec, fld.name)!) }}</small>
            }
          }
          @case ('RATING') {
            <div class="pdf__rating" role="radiogroup" [attr.aria-label]="fld.label">
              @for (n of ratingScale(fld); track n) {
                <button type="button" class="pdf__rating-btn"
                        [class.pdf__rating-btn--on]="asNumber(sec, fld.name) === n"
                        (click)="set(sec, fld.name, n)">{{ n }}</button>
              }
            </div>
            @if (ratingLabel(fld, asNumber(sec, fld.name)); as rl) { <small class="pdf__desc">{{ rl }}</small> }
          }
          @case ('SINGLE_CHOICE') {
            <div class="pdf__options">
              @for (o of fld.schema.options ?? []; track o.value) {
                <label class="pdf__option">
                  <input type="radio" [name]="anchor(sec, fld.name)" [value]="o.label"
                         [checked]="asText(sec, fld.name) === o.label"
                         (change)="set(sec, fld.name, o.label)" />
                  {{ o.label }}
                </label>
              }
            </div>
          }
          @case ('DROPDOWN') {
            <select [ngModel]="asText(sec, fld.name)" (ngModelChange)="set(sec, fld.name, $event || null)"
                    [name]="anchor(sec, fld.name)">
              <option value="">Selecciona…</option>
              @for (o of fld.schema.options ?? []; track o.value) {
                <option [value]="o.label">{{ o.label }}</option>
              }
            </select>
          }
          @case ('MULTIPLE_CHOICE') {
            <div class="pdf__options">
              @for (o of fld.schema.options ?? []; track o.value) {
                <label class="pdf__option">
                  <input type="checkbox" [checked]="isChecked(sec, fld.name, o.label)"
                         (change)="toggle(sec, fld.name, o.label)" />
                  {{ o.label }}
                </label>
              }
            </div>
          }
          @case ('PHOTO') {
            <ng-container *ngTemplateOutlet="filesTpl; context: { $implicit: fld, sec: sec, accept: acceptOf(fld, 'image/*'), capture: 'environment' }" />
          }
          @case ('VIDEO') {
            <ng-container *ngTemplateOutlet="filesTpl; context: { $implicit: fld, sec: sec, accept: acceptOf(fld, 'video/*'), capture: null }" />
          }
          @case ('FILE') {
            <ng-container *ngTemplateOutlet="filesTpl; context: { $implicit: fld, sec: sec, accept: acceptOf(fld, ''), capture: null }" />
          }
          @case ('SIGNATURE') {
            @if (refsOf(sec, fld.name).length > 0) {
              <div class="pdf__chip">✍️ Firma registrada
                <button type="button" class="pdf__chip-x" (click)="set(sec, fld.name, null)">✕</button>
              </div>
            } @else if (signatureFor() === anchor(sec, fld.name)) {
              <canvas #sigCanvas class="pdf__canvas" width="600" height="180"
                      (pointerdown)="sigDown($event)" (pointermove)="sigMove($event)" (pointerup)="sigUp($event)"></canvas>
              <div class="pdf__row">
                <button type="button" class="pdf__btn" (click)="sigClear()">Limpiar</button>
                <button type="button" class="pdf__btn pdf__btn--main" [disabled]="!sigDirty"
                        (click)="sigConfirm(sec, fld)">Confirmar firma</button>
                <button type="button" class="pdf__btn" (click)="signatureFor.set(null)">Cancelar</button>
              </div>
            } @else {
              <button type="button" class="pdf__btn" (click)="openSignature(sec, fld)">✍️ Firmar</button>
            }
          }
          @case ('LOCATION') {
            @if (locOf(sec, fld.name); as loc) {
              <div class="pdf__chip">📍 {{ loc.lat }}, {{ loc.lng }}
                <button type="button" class="pdf__chip-x" (click)="set(sec, fld.name, null)">✕</button>
              </div>
            } @else {
              <button type="button" class="pdf__btn" [disabled]="locBusy()"
                      (click)="captureLocation(sec, fld)">
                {{ locBusy() ? 'Obteniendo ubicación…' : '📍 Capturar ubicación' }}
              </button>
            }
          }
          @default {
            <small class="pdf__desc">Tipo no soportado: {{ fld.type }}</small>
          }
        }

        @if (errorOf(sec, fld.name); as err) { <small class="pdf__err" role="alert">{{ err }}</small> }
      </div>
    }
  </ng-template>

  <!-- Adjuntos (PHOTO/VIDEO/FILE): subir primero, referencia después. -->
  <ng-template #filesTpl let-fld let-sec="sec" let-accept="accept" let-capture="capture">
    <div class="pdf__files">
      @for (ref of refsOf(sec, fld.name); track ref.document_id) {
        <span class="pdf__chip">📎 {{ ref.filename }}
          <button type="button" class="pdf__chip-x" (click)="removeRef(sec, fld, ref)">✕</button>
        </span>
      }
      @if (uploadingOf(sec, fld.name)) { <span class="pdf__chip">⏳ Subiendo…</span> }
      @if (refsOf(sec, fld.name).length < maxFiles(fld)) {
        <label class="pdf__btn">
          {{ fld.type === 'PHOTO' ? '📷 Foto' : '📎 Adjuntar' }}
          <input type="file" hidden [accept]="accept" [attr.capture]="capture"
                 (change)="onFile($event, sec, fld)" />
        </label>
      }
    </div>
  </ng-template>
  `,
  styles: [`
    :host { display: block; }
    .pdf { min-height: 100dvh; background: var(--df-bg, #f2f4f8); padding: 24px 12px; font-family: system-ui, Roboto, sans-serif; }
    .pdf__card { max-width: 680px; margin: 0 auto; background: var(--df-surface, #fff);
                 border-radius: var(--df-radius, 16px);
                 box-shadow: 0 4px 24px rgba(15, 23, 42, .08); padding: 28px 24px; }
    .pdf__head h1 { margin: 0 0 6px; font-size: 1.35rem; color: var(--df-accent, #21263c); }
    .pdf__head p { margin: 0 0 18px; color: #64748b; font-size: .95rem; }

    /* Portada del tema: ocupa el ancho de la tarjeta con el título encima. El velo
       garantiza que el texto blanco se lea sea cual sea la imagen generada. */
    .pdf__head--cover { margin: -28px -24px 18px; }
    .pdf__cover { position: relative; min-height: 150px; display: flex; align-items: flex-end;
                  overflow: hidden; border-radius: var(--df-radius, 16px) var(--df-radius, 16px) 0 0;
                  background: var(--df-header-bg, linear-gradient(135deg, #0f172a, #334155)); }
    .pdf__cover img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
    .pdf__cover-veil { position: absolute; inset: 0;
                       background: linear-gradient(180deg, rgba(2,6,23,.25) 0%, rgba(2,6,23,.82) 100%); }
    .pdf__cover-text { position: relative; padding: 18px 24px; }
    .pdf__cover-text h1 { margin: 0 0 4px; font-size: 1.35rem; color: #fff; }
    .pdf__cover-text p { margin: 0; color: rgba(255,255,255,.85); font-size: .92rem; }
    .pdf__state { text-align: center; padding: 48px 8px; color: #334155; }
    .pdf__state--err p { color: #b3261e; }
    .pdf__icon { font-size: 2rem; margin-bottom: 8px; }
    .pdf__section { margin-bottom: 8px; }
    .pdf__section-title { font-size: 1.05rem; color: var(--df-accent, #21263c);
                          border-bottom: 2px solid var(--df-primary, #8cd50a);
                          display: inline-block; padding-bottom: 2px; margin: 18px 0 10px; }
    .pdf__group { border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; margin: 0 0 14px; }
    .pdf__group legend { font-weight: 700; color: #21263c; padding: 0 6px; font-size: .95rem; }
    .pdf__info { padding: 10px 12px; border-left: 3px solid #21263c; background: #f8fafc;
                 border-radius: 0 10px 10px 0; color: #334155; font-size: .9rem; margin: 0 0 14px; white-space: pre-wrap; }
    .pdf__field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 14px; }
    .pdf__field label { font-weight: 600; font-size: .9rem; color: #21263c; }
    .pdf__req { color: #c0392b; }
    .pdf__desc { color: #64748b; }
    .pdf__field input[type=text], .pdf__field input[type=date], .pdf__field input[type=time],
    .pdf__field input[type=number], .pdf__field textarea, .pdf__field select {
      width: 100%; box-sizing: border-box; padding: 9px 12px; border: 1px solid #cbd5e1;
      border-radius: 10px; font: inherit; }
    .pdf__field--error input, .pdf__field--error textarea, .pdf__field--error select { border-color: #c0392b; }
    .pdf__err { color: #c0392b; }
    .pdf__options { display: flex; flex-direction: column; gap: 6px; }
    .pdf__option { display: flex; align-items: center; gap: 8px; font-weight: 400 !important; cursor: pointer; }
    .pdf__rating { display: flex; gap: 6px; flex-wrap: wrap; }
    .pdf__rating-btn { width: 40px; height: 40px; border-radius: 10px; border: 1px solid #cbd5e1;
                       background: #fff; font: inherit; cursor: pointer; }
    .pdf__rating-btn--on { background: var(--df-accent, #21263c); color: #fff;
                           border-color: var(--df-accent, #21263c); }
    .pdf__files { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .pdf__chip { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px;
                 border: 1px solid #cbd5e1; border-radius: 10px; background: #f8fafc; font-size: .85rem; }
    .pdf__chip-x { border: none; background: none; cursor: pointer; color: #64748b; font-size: .8rem; }
    .pdf__btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; cursor: pointer;
                border: 1px solid #cbd5e1; border-radius: 10px; background: #fff; font: inherit; font-size: .88rem; }
    .pdf__btn--main { background: var(--df-accent, #21263c); color: #fff;
                      border-color: var(--df-accent, #21263c); }
    .pdf__btn:disabled { opacity: .55; cursor: not-allowed; }
    .pdf__row { display: flex; gap: 8px; flex-wrap: wrap; }
    .pdf__canvas { width: 100%; height: 180px; border: 1px dashed #94a3b8; border-radius: 10px;
                   touch-action: none; background: #fff; }
    .pdf__error-box { margin: 12px 0; padding: 10px 12px; border-radius: 10px; background: #fdecea;
                      color: #b3261e; font-size: .9rem; }
    .pdf__submit { width: 100%; margin-top: 10px; padding: 13px; border: none;
                   border-radius: var(--df-radius, 12px);
                   background: var(--df-primary, #21263c); color: var(--df-on-primary, #fff);
                   font: inherit; font-weight: 700; cursor: pointer; }
    .pdf__submit:disabled { opacity: .6; cursor: not-allowed; }
  `],
})
export class PublicDynamicFormComponent implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  @ViewChild('sigCanvas') sigCanvas?: ElementRef<HTMLCanvasElement>;

  /** URL de la portada; null = sin portada (o falló la carga y se cae al degradado). */
  coverUrl = signal<string | null>(null);

  loading = signal(true);
  fatal = signal<string | null>(null);
  done = signal(false);
  sending = signal(false);
  submitError = signal<string | null>(null);
  structure = signal<PublicStructure | null>(null);
  uploadsInFlight = signal(0);
  locBusy = signal(false);
  /** anchor del campo SIGNATURE con el canvas abierto. */
  signatureFor = signal<string | null>(null);

  private token = '';
  /** valores por 'sec::name' */
  private values = signal<Record<string, Value>>({});
  private uploading = signal<Record<string, boolean>>({});
  private errors = signal<Record<string, string>>({});

  sigDirty = false;
  private sigDrawing = false;

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    this.http.get<PublicStructure>(`${GATEWAY}/api/dynamic-forms/public/${this.token}/structure`).subscribe({
      next: st => { this.structure.set(st); this.aplicarTema(st.ui?.theme); this.loading.set(false); },
      error: (e: HttpErrorResponse) => {
        this.fatal.set(this.friendly(e, 'Este formulario no está disponible.'));
        this.loading.set(false);
      },
    });
  }

  // ---------- Tema de diseño ----------

  /**
   * Vuelca el tema del formulario en custom properties del host; el CSS de esta página
   * las lee con fallback, así un formulario sin tema se ve exactamente como antes.
   * Se hace por API del DOM porque el binding [style] de Angular no fija propiedades
   * personalizadas.
   */
  private aplicarTema(theme?: PublicTheme | null): void {
    if (theme) {
      const el = this.host.nativeElement;
      const set = (nombre: string, valor?: string | number) => {
        if (valor !== undefined && valor !== null && valor !== '') el.style.setProperty(nombre, String(valor));
      };
      set('--df-primary', theme.primary);
      set('--df-on-primary', theme.on_primary);
      set('--df-accent', theme.accent);
      set('--df-surface', theme.surface);
      set('--df-bg', theme.bg);
      if (theme.radius != null) set('--df-radius', `${theme.radius}px`);
      if (theme.header_from) {
        set('--df-header-bg', `linear-gradient(135deg, ${theme.header_from} 0%, ${theme.header_to ?? theme.header_from} 100%)`);
      }
    }
    // La portada vive en ms-documents, que exige JWT: la sirve ms-forms detrás del
    // MISMO token del link (endpoint público /cover). Una URL absoluta en el tema
    // se usa tal cual.
    if (theme?.cover_url) this.coverUrl.set(theme.cover_url);
    else if (theme?.cover_document_id) this.coverUrl.set(`${GATEWAY}/api/dynamic-forms/public/${this.token}/cover`);
    else this.coverUrl.set(null);
  }

  // ---------- Estado ----------

  anchor(sec: string, name: string): string { return `${sec}::${name}`; }

  set(sec: string, name: string, v: Value): void {
    this.values.update(m => ({ ...m, [this.anchor(sec, name)]: v }));
    if (this.errors()[this.anchor(sec, name)]) {
      this.errors.update(m => { const c = { ...m }; delete c[this.anchor(sec, name)]; return c; });
    }
  }

  private val(sec: string, name: string): Value { return this.values()[this.anchor(sec, name)] ?? null; }
  asText(sec: string, name: string): string { const v = this.val(sec, name); return typeof v === 'string' ? v : ''; }
  asNumber(sec: string, name: string): number | null { const v = this.val(sec, name); return typeof v === 'number' ? v : null; }
  toNumber(v: unknown): number | null { const n = typeof v === 'number' ? v : parseFloat(String(v)); return Number.isFinite(n) ? n : null; }
  isChecked(sec: string, name: string, label: string): boolean {
    const v = this.val(sec, name); return Array.isArray(v) && (v as string[]).includes(label);
  }
  toggle(sec: string, name: string, label: string): void {
    const v = this.val(sec, name);
    const arr = Array.isArray(v) ? [...(v as string[])] : [];
    const i = arr.indexOf(label);
    if (i >= 0) arr.splice(i, 1); else arr.push(label);
    this.set(sec, name, arr.length ? arr : null);
  }
  refsOf(sec: string, name: string): DocumentRef[] {
    const v = this.val(sec, name);
    if (Array.isArray(v)) return (v as DocumentRef[]).filter(r => r && (r as DocumentRef).source === 'ms-documents');
    return v && (v as DocumentRef).source === 'ms-documents' ? [v as DocumentRef] : [];
  }
  locOf(sec: string, name: string): { lat: number; lng: number } | null {
    const v = this.val(sec, name) as { lat?: number; lng?: number } | null;
    return v && typeof v.lat === 'number' && typeof v.lng === 'number' ? (v as { lat: number; lng: number }) : null;
  }
  uploadingOf(sec: string, name: string): boolean { return !!this.uploading()[this.anchor(sec, name)]; }
  errorOf(sec: string, name: string): string | null { return this.errors()[this.anchor(sec, name)] ?? null; }

  maxFiles(fld: PublicField): number {
    return fld.type === 'SIGNATURE' ? 1 : (fld.schema.validation?.max_files ?? 1);
  }
  acceptOf(fld: PublicField, fallback: string): string {
    const exts = fld.schema.validation?.allowed_extensions ?? [];
    return exts.length ? exts.map(e => '.' + e.replace('.', '')).join(',') : fallback;
  }
  ratingScale(fld: PublicField): number[] {
    const max = fld.schema.rating_config?.scale_max ?? 5;
    return Array.from({ length: max + 1 }, (_, i) => i);
  }
  ratingLabel(fld: PublicField, n: number | null): string | null {
    if (n === null || !fld.schema.rating_config?.show_labels) return null;
    return fld.schema.rating_config?.labels?.[String(n)] ?? null;
  }
  formatCop(n: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
  }

  // ---------- Media (subir primero, fail-closed) ----------

  onFile(ev: Event, sec: string, fld: PublicField): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const maxMb = fld.schema.validation?.max_size_mb ?? (fld.type === 'VIDEO' ? 100 : fld.type === 'FILE' ? 20 : 10);
    if (file.size > maxMb * 1024 * 1024) {
      this.errors.update(m => ({ ...m, [this.anchor(sec, fld.name)]: `El archivo supera ${maxMb} MB` }));
      return;
    }
    this.uploadFile(file, sec, fld);
  }

  private uploadFile(file: File, sec: string, fld: PublicField): void {
    const key = this.anchor(sec, fld.name);
    this.uploading.update(m => ({ ...m, [key]: true }));
    this.uploadsInFlight.update(n => n + 1);
    const fd = new FormData();
    fd.append('field', fld.name);
    fd.append('section', sec);   // desambigua campos homónimos entre secciones
    fd.append('file', file, file.name);
    this.http.post<DocumentRef>(`${GATEWAY}/api/dynamic-forms/public/${this.token}/upload`, fd).subscribe({
      next: ref => {
        const refs = [...this.refsOf(sec, fld.name), ref];
        this.set(sec, fld.name, this.maxFiles(fld) === 1 ? refs[refs.length - 1] : refs);
        this.endUpload(key);
      },
      error: (e: HttpErrorResponse) => {
        this.errors.update(m => ({ ...m, [key]: this.friendly(e, 'No se pudo subir el archivo; intenta de nuevo.') }));
        this.endUpload(key);
      },
    });
  }

  private endUpload(key: string): void {
    this.uploading.update(m => { const c = { ...m }; delete c[key]; return c; });
    this.uploadsInFlight.update(n => Math.max(0, n - 1));
  }

  removeRef(sec: string, fld: PublicField, ref: DocumentRef): void {
    const rest = this.refsOf(sec, fld.name).filter(r => r.document_id !== ref.document_id);
    this.set(sec, fld.name, rest.length === 0 ? null : (this.maxFiles(fld) === 1 ? rest[0] : rest));
  }

  // ---------- Firma ----------

  openSignature(sec: string, fld: PublicField): void {
    this.signatureFor.set(this.anchor(sec, fld.name));
    this.sigDirty = false;
    setTimeout(() => this.sigClear());
  }

  private sigCtx(): CanvasRenderingContext2D | null {
    const c = this.sigCanvas?.nativeElement;
    return c ? c.getContext('2d') : null;
  }

  sigClear(): void {
    const c = this.sigCanvas?.nativeElement;
    const ctx = this.sigCtx();
    if (!c || !ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = '#21263c';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    this.sigDirty = false;
  }

  private sigPoint(ev: PointerEvent): { x: number; y: number } {
    const c = this.sigCanvas!.nativeElement;
    const r = c.getBoundingClientRect();
    return { x: (ev.clientX - r.left) * (c.width / r.width), y: (ev.clientY - r.top) * (c.height / r.height) };
  }

  sigDown(ev: PointerEvent): void {
    ev.preventDefault();
    const ctx = this.sigCtx();
    if (!ctx) return;
    (ev.target as HTMLCanvasElement).setPointerCapture(ev.pointerId);
    const p = this.sigPoint(ev);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    this.sigDrawing = true;
  }

  sigMove(ev: PointerEvent): void {
    if (!this.sigDrawing) return;
    const ctx = this.sigCtx();
    if (!ctx) return;
    const p = this.sigPoint(ev);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    this.sigDirty = true;
  }

  sigUp(ev: PointerEvent): void {
    this.sigDrawing = false;
  }

  sigConfirm(sec: string, fld: PublicField): void {
    const c = this.sigCanvas?.nativeElement;
    if (!c) return;
    c.toBlob(blob => {
      if (!blob) return;
      this.signatureFor.set(null);
      this.uploadFile(new File([blob], 'firma.png', { type: 'image/png' }), sec, fld);
    }, 'image/png');
  }

  // ---------- Ubicación ----------

  captureLocation(sec: string, fld: PublicField): void {
    if (!navigator.geolocation) {
      this.errors.update(m => ({ ...m, [this.anchor(sec, fld.name)]: 'Este dispositivo no soporta geolocalización' }));
      return;
    }
    this.locBusy.set(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        this.set(sec, fld.name, {
          lat: Math.round(pos.coords.latitude * 1e6) / 1e6,
          lng: Math.round(pos.coords.longitude * 1e6) / 1e6,
          timestamp: new Date().toISOString(),
        });
        this.locBusy.set(false);
      },
      err => {
        const msg = err.code === err.PERMISSION_DENIED
          ? 'Permiso de ubicación denegado' : 'No se pudo obtener la ubicación';
        this.errors.update(m => ({ ...m, [this.anchor(sec, fld.name)]: msg }));
        this.locBusy.set(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  // ---------- Envío ----------

  submit(): void {
    const st = this.structure();
    if (!st || this.sending()) return;

    // Validación mínima en cliente (el backend es quien manda).
    const errs: Record<string, string> = {};
    let firstInvalid: string | null = null;
    for (const sec of st.sections) {
      for (const fld of this.flat(sec.fields)) {
        if (fld.type === 'COMMENT' || fld.type === 'SECTION') continue;
        const v = this.val(sec.code, fld.name);
        const empty = v == null || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && v.length === 0);
        if (fld.required && empty) {
          errs[this.anchor(sec.code, fld.name)] = 'Este campo es obligatorio';
          firstInvalid ??= this.anchor(sec.code, fld.name);
        }
      }
    }
    if (Object.keys(errs).length) {
      this.errors.set(errs);
      this.submitError.set('Revisa los campos marcados.');
      document.getElementById(firstInvalid!)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const payload: Record<string, Record<string, Value>> = {};
    for (const sec of st.sections) {
      for (const fld of this.flat(sec.fields)) {
        if (fld.type === 'COMMENT' || fld.type === 'SECTION') continue;
        const v = this.val(sec.code, fld.name);
        if (v == null) continue;
        (payload[sec.code] ??= {})[fld.name] = v;
      }
    }

    this.sending.set(true);
    this.submitError.set(null);
    this.http.post(`${GATEWAY}/api/dynamic-forms/public/${this.token}/submit`, { payload }).subscribe({
      next: () => { this.sending.set(false); this.done.set(true); },
      error: (e: HttpErrorResponse) => {
        this.sending.set(false);
        const problem = (e.error ?? {}) as Problem;
        if (problem.errors?.length) {
          const map: Record<string, string> = {};
          for (const fe of problem.errors) map[this.anchor(fe.section, fe.field)] = fe.message;
          this.errors.set(map);
        }
        this.submitError.set(this.friendly(e, 'No se pudo enviar la respuesta. Intenta de nuevo.'));
      },
    });
  }

  private flat(fields: PublicField[]): PublicField[] {
    const out: PublicField[] = [];
    for (const f of fields) {
      out.push(f);
      if (f.children?.length) out.push(...f.children);
    }
    return out;
  }

  private friendly(e: HttpErrorResponse, fallback: string): string {
    const p = (e.error ?? {}) as Problem;
    switch (p.code) {
      case 'df_link_expired': return 'Este enlace ya expiró.';
      case 'df_link_revoked': return 'Este enlace fue desactivado.';
      case 'df_link_exhausted': return 'Este enlace alcanzó el máximo de respuestas.';
      case 'df_form_unavailable': return 'El formulario ya no está disponible.';
      case 'df_validation_failed': return 'Hay campos con errores; revísalos.';
      default: return p.detail || fallback;
    }
  }
}
