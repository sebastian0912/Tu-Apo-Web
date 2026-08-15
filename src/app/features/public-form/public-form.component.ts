import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';

/**
 * Página pública de un formulario (sin login). Se sirve en tuapo.co/f/:token y
 * consume el endpoint público del gateway (api.tuapo.co/api/forms/public/*),
 * que ms-forms deja pasar de forma anónima. Componente self-contained (sin Material).
 */

// El endpoint público vive en el gateway, NO en el backend legacy (environment.apiUrl).
const GATEWAY = 'https://api.tuapo.co';

interface PublicField {
  id: number;
  field_type: string;
  label: string;
  help_text?: string | null;
  placeholder?: string | null;
  required: boolean;
  config_json?: { options?: { value: string; label: string }[] } | null;
}
interface PublicForm {
  token: string;
  title: string;
  description?: string | null;
  fields: PublicField[];
}

@Component({
  selector: 'app-public-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
  <div class="pf">
    <div class="pf__card">
      @if (loading()) {
        <div class="pf__state">Cargando formulario…</div>
      } @else if (error()) {
        <div class="pf__state pf__state--err">
          <div class="pf__icon">⚠️</div>
          Este formulario no está disponible.
        </div>
      } @else if (done()) {
        <div class="pf__state pf__state--ok">
          <div class="pf__icon">✅</div>
          <h2>¡Gracias!</h2>
          <p>Tu respuesta fue registrada correctamente.</p>
        </div>
      } @else if (form(); as f) {
        <header class="pf__head">
          <h1>{{ f.title }}</h1>
          @if (f.description) { <p>{{ f.description }}</p> }
        </header>

        <form class="pf__form" (ngSubmit)="submit()">
          @for (fld of f.fields; track fld.id) {
            <div class="pf__field">
              <label class="pf__label">{{ fld.label }} @if (fld.required) { <span class="req">*</span> }</label>
              @if (fld.help_text) { <div class="pf__help">{{ fld.help_text }}</div> }

              @switch (fld.field_type) {
                @case ('texto_largo') {
                  <textarea class="pf__input" rows="3" [placeholder]="fld.placeholder || ''"
                            [value]="text(fld.id)" (input)="setText(fld.id, $any($event.target).value)"></textarea>
                }
                @case ('numero') {
                  <input class="pf__input" type="number" [placeholder]="fld.placeholder || ''"
                         [value]="text(fld.id)" (input)="setText(fld.id, $any($event.target).value)">
                }
                @case ('seleccion_unica') {
                  <div class="pf__radios">
                    @for (op of fld.config_json?.options || []; track op.value) {
                      <label class="pf__radio">
                        <input type="radio" [name]="'f'+fld.id" [value]="op.value"
                               [checked]="text(fld.id)===op.value" (change)="setText(fld.id, op.value)">
                        {{ op.label }}
                      </label>
                    }
                  </div>
                }
                @case ('foto') {
                  <div class="pf__file">
                    <input #ph type="file" accept="image/*" capture="environment" hidden (change)="setFile(fld.id, ph.files)">
                    <button type="button" class="pf__btn pf__btn--ghost" (click)="ph.click()">📷 Tomar / elegir foto</button>
                    @if (fileName(fld.id)) { <span class="pf__fname">{{ fileName(fld.id) }}</span> }
                  </div>
                }
                @case ('archivo') {
                  <div class="pf__file">
                    <input #fl type="file" hidden (change)="setFile(fld.id, fl.files)">
                    <button type="button" class="pf__btn pf__btn--ghost" (click)="fl.click()">📎 Subir archivo</button>
                    @if (fileName(fld.id)) { <span class="pf__fname">{{ fileName(fld.id) }}</span> }
                  </div>
                }
                @default {
                  <input class="pf__input" type="text" [placeholder]="fld.placeholder || ''"
                         [value]="text(fld.id)" (input)="setText(fld.id, $any($event.target).value)">
                }
              }
            </div>
          }

          @if (formError()) { <div class="pf__formerr">{{ formError() }}</div> }
          <button type="submit" class="pf__btn pf__btn--primary" [disabled]="sending()">
            {{ sending() ? 'Enviando…' : 'Enviar' }}
          </button>
        </form>
        <div class="pf__brand">Formulario seguro · TuApo</div>
      }
    </div>
  </div>
  `,
  styles: [`
    .pf { min-height: 100vh; background: #f1f5f9; display: flex; justify-content: center; padding: 24px 14px; }
    .pf__card { width: 100%; max-width: 560px; background: #fff; border-radius: 18px; box-shadow: 0 12px 40px rgba(15,23,42,.10); padding: 26px 22px 20px; }
    .pf__state { text-align: center; padding: 50px 10px; color: #475569; }
    .pf__state--err { color: #b91c1c; }
    .pf__state--ok h2 { margin: 8px 0 4px; color: #16a34a; }
    .pf__icon { font-size: 40px; }
    .pf__head h1 { font-size: 22px; font-weight: 800; margin: 0 0 4px; color: #0f172a; }
    .pf__head p { color: #64748b; margin: 0 0 12px; }
    .pf__form { display: flex; flex-direction: column; gap: 16px; margin-top: 10px; }
    .pf__field { display: flex; flex-direction: column; gap: 5px; }
    .pf__label { font-weight: 600; font-size: 14px; color: #1e293b; }
    .req { color: #dc2626; }
    .pf__help { font-size: 12px; color: #64748b; }
    .pf__input { border: 1px solid #cbd5e1; border-radius: 10px; padding: 11px 12px; font: inherit; width: 100%; box-sizing: border-box; }
    .pf__input:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,.12); }
    .pf__radios { display: flex; flex-direction: column; gap: 6px; }
    .pf__radio { display: flex; align-items: center; gap: 8px; color: #334155; }
    .pf__file { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .pf__fname { font-size: 12px; color: #334155; }
    .pf__btn { border: none; border-radius: 10px; padding: 12px 16px; font: inherit; font-weight: 600; cursor: pointer; }
    .pf__btn--primary { background: #2563eb; color: #fff; margin-top: 4px; }
    .pf__btn--primary:disabled { opacity: .6; cursor: default; }
    .pf__btn--ghost { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; }
    .pf__formerr { color: #b91c1c; font-size: 13px; }
    .pf__brand { text-align: center; color: #94a3b8; font-size: 11px; margin-top: 16px; }
  `],
})
export class PublicFormComponent implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);

  token = '';
  form = signal<PublicForm | null>(null);
  loading = signal(true);
  error = signal(false);
  sending = signal(false);
  done = signal(false);
  formError = signal('');

  private texts = new Map<number, string>();
  private files = new Map<number, File>();
  private fileNames = signal<Record<number, string>>({});

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    if (!this.token) { this.error.set(true); this.loading.set(false); return; }
    this.http.get<PublicForm>(`${GATEWAY}/api/forms/public/${encodeURIComponent(this.token)}`).subscribe({
      next: (f) => { this.form.set(f); this.loading.set(false); },
      error: () => { this.error.set(true); this.loading.set(false); },
    });
  }

  text(id: number): string { return this.texts.get(id) ?? ''; }
  setText(id: number, v: string): void { this.texts.set(id, v); }
  fileName(id: number): string | undefined { return this.fileNames()[id]; }

  setFile(id: number, list: FileList | null): void {
    const file = list && list.length ? list[0] : null;
    if (file) {
      this.files.set(id, file);
      this.fileNames.update(m => ({ ...m, [id]: file.name }));
    } else {
      this.files.delete(id);
      this.fileNames.update(m => { const c = { ...m }; delete c[id]; return c; });
    }
  }

  submit(): void {
    const f = this.form();
    if (!f) return;
    // Validación de obligatorios.
    for (const fld of f.fields) {
      if (!fld.required) continue;
      const hasFile = this.files.has(fld.id);
      const hasText = (this.texts.get(fld.id) ?? '').trim().length > 0;
      if (!hasFile && !hasText) {
        this.formError.set(`El campo "${fld.label}" es obligatorio.`);
        return;
      }
    }
    this.formError.set('');
    this.sending.set(true);

    const fd = new FormData();
    const values: any[] = [];
    for (const fld of f.fields) {
      if (this.files.has(fld.id)) {
        const part = `file_${fld.id}`;
        fd.append(part, this.files.get(fld.id)!, this.files.get(fld.id)!.name);
        values.push({ field_id: fld.id, file_part: part });
      } else {
        values.push({ field_id: fld.id, value: this.texts.get(fld.id) ?? null });
      }
    }
    fd.append('payload', JSON.stringify({ values }));

    this.http.post(`${GATEWAY}/api/forms/public/${encodeURIComponent(this.token)}/responses`, fd).subscribe({
      next: () => { this.sending.set(false); this.done.set(true); },
      error: () => { this.sending.set(false); this.formError.set('No se pudo enviar. Intenta de nuevo.'); },
    });
  }
}
