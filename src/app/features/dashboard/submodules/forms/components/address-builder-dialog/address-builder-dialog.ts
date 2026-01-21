import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Inject, inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { merge, Observable, startWith, map as rxMap } from 'rxjs';

export type AddressBuilderMode = 'guided' | 'paste' | 'other';

export interface AddressBuilderResult {
  mode: AddressBuilderMode;
  dian: string;
  raw: {
    guided: {
      viaType: string;
      viaNum: string;
      viaLetter: string;
      viaBis: boolean;
      viaQuad: string;
      secNum: string;
      secLetter: string;
      secQuad: string;
      placaNum: string;
    };
    pasted: string;
    other: string;
  };
}

export interface AddressBuilderDialogData {
  initialMode?: AddressBuilderMode;
  initialValue?: string;
}

@Component({
  selector: 'app-address-builder-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatDividerModule,
  ],
  templateUrl: './address-builder-dialog.html',
  styleUrl: './address-builder-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddressBuilderDialog {
  private readonly snack = inject(MatSnackBar);

  readonly viaTypes = ['CL', 'CR', 'DG', 'TV', 'AV', 'AK'] as const;

  // cuadrantes opcionales
  readonly quads = ['NORTE', 'SUR', 'ESTE', 'O', 'OCC'] as const;

  readonly modeCtrl = new FormControl<AddressBuilderMode>('guided', { nonNullable: true });

  readonly guidedDefaults = {
    viaType: 'CL',
    viaNum: '',
    viaLetter: '',
    viaBis: false,
    viaQuad: '',
    secNum: '',
    secLetter: '',
    secQuad: '',
    placaNum: '',
  };

  readonly guided = new FormGroup({
    viaType: new FormControl<string>(this.guidedDefaults.viaType, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    viaNum: new FormControl<string>(this.guidedDefaults.viaNum, {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d+$/)],
    }),
    viaLetter: new FormControl<string>(this.guidedDefaults.viaLetter, { nonNullable: true }),
    viaBis: new FormControl<boolean>(this.guidedDefaults.viaBis, { nonNullable: true }),
    viaQuad: new FormControl<string>(this.guidedDefaults.viaQuad, { nonNullable: true }),

    secNum: new FormControl<string>(this.guidedDefaults.secNum, {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d+$/)],
    }),
    secLetter: new FormControl<string>(this.guidedDefaults.secLetter, { nonNullable: true }),
    secQuad: new FormControl<string>(this.guidedDefaults.secQuad, { nonNullable: true }),

    placaNum: new FormControl<string>(this.guidedDefaults.placaNum, {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d+$/)],
    }),
  });

  readonly pastedCtrl = new FormControl<string>('', { nonNullable: true });
  readonly otherCtrl = new FormControl<string>('', { nonNullable: true });

  readonly preview$: Observable<string> = merge(
    this.modeCtrl.valueChanges,
    this.guided.valueChanges,
    this.pastedCtrl.valueChanges,
    this.otherCtrl.valueChanges
  ).pipe(
    startWith(0),
    rxMap(() => this.computePreview())
  );

  constructor(
    private readonly dialogRef: MatDialogRef<AddressBuilderDialog, AddressBuilderResult>,
    @Inject(MAT_DIALOG_DATA) public readonly data: AddressBuilderDialogData
  ) {
    if (data?.initialMode) this.modeCtrl.setValue(data.initialMode);

    if (data?.initialValue) {
      this.pastedCtrl.setValue((data.initialValue ?? '').toString());
      if (!data?.initialMode) this.modeCtrl.setValue('paste');
    }
  }

  setMode(m: AddressBuilderMode): void {
    this.modeCtrl.setValue(m);
  }

  // ========= LIMPIAR / QUITAR =========
  clearAll(): void {
    this.guided.reset(this.guidedDefaults);
    this.pastedCtrl.setValue('');
    this.otherCtrl.setValue('');
    this.modeCtrl.setValue('guided');
    this.snack.open('Listo. Se limpió todo.', 'OK', { duration: 2000 });
  }

  clearGuided(): void {
    this.guided.reset(this.guidedDefaults);
    this.snack.open('Se limpió el asistente.', 'OK', { duration: 2000 });
  }

  clearPasted(): void {
    this.pastedCtrl.setValue('');
  }

  clearOther(): void {
    this.otherCtrl.setValue('');
  }

  clearControl(ctrl: keyof AddressBuilderResult['raw']['guided']): void {
    const c = this.guided.get(ctrl as string);
    if (!c) return;

    if (ctrl === 'viaType') c.setValue(this.guidedDefaults.viaType);
    else if (ctrl === 'viaBis') c.setValue(false);
    else c.setValue('');
  }

  // ========= INPUTS TOLERANTES =========
  onNumInput(controlName: 'viaNum' | 'secNum' | 'placaNum', ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const cleaned = (input.value ?? '').replace(/[^\d]/g, '');
    if (input.value !== cleaned) input.value = cleaned;
    this.guided.get(controlName)?.setValue(cleaned);
  }

  onLetterInput(controlName: 'viaLetter' | 'secLetter', ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const cleaned = (input.value ?? '')
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z]/g, '')
      .slice(0, 1);

    if (input.value !== cleaned) input.value = cleaned;
    this.guided.get(controlName)?.setValue(cleaned);
  }

  // ========= PILLS =========
  toggleBis(): void {
    this.guided.controls.viaBis.setValue(!this.guided.controls.viaBis.value);
  }

  pickViaType(v: string): void {
    this.guided.controls.viaType.setValue(v);
  }

  // (cuadrante opcional) si tocas el mismo -> se quita
  toggleQuad(ctrl: 'viaQuad' | 'secQuad', q: string): void {
    const current = this.guided.get(ctrl)?.value ?? '';
    this.guided.get(ctrl)?.setValue(current === q ? '' : q);
  }

  // botón SIN (quita cuadrante)
  clearQuad(ctrl: 'viaQuad' | 'secQuad'): void {
    this.guided.get(ctrl)?.setValue('');
  }

  // ========= PREVIEW / NORMALIZACIÓN =========
  private computePreview(): string {
    const mode = this.modeCtrl.value;

    if (mode === 'guided') {
      const v = this.guided.getRawValue();
      const parts: string[] = [
        v.viaType,
        v.viaNum,
        v.viaLetter,
        v.viaBis ? 'BIS' : '',
        v.viaQuad,
        v.secNum,
        v.secLetter,
        v.secQuad,
        v.placaNum,
      ];
      return this.normalizeStrict(parts.filter(Boolean).join(' '));
    }

    if (mode === 'other') return this.normalizeStrict(this.otherCtrl.value ?? '');

    return this.parseAndNormalizeFromFreeText(this.pastedCtrl.value ?? '');
  }

  private normalizeStrict(input: string): string {
    let s = (input ?? '').toString();

    s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    s = s.toUpperCase();

    // 71C -> 71 C
    s = s.replace(/(\d)([A-Z])/g, '$1 $2');
    s = s.replace(/([A-Z])(\d)/g, '$1 $2');

    // todo símbolo -> espacio
    s = s.replace(/[^A-Z0-9 ]+/g, ' ');

    // unifica espacios
    s = s.replace(/\s+/g, ' ').trim();

    return s;
  }

  private parseAndNormalizeFromFreeText(input: string): string {
    const raw = this.normalizeStrict(input);
    if (!raw) return '';

    const typeMap: Record<string, string> = {
      CALLE: 'CL',
      CARRERA: 'CR',
      DIAGONAL: 'DG',
      TRANSVERSAL: 'TV',
      AVENIDA: 'AV',
      AUTOPISTA: 'AK',
      CRA: 'CR',
      CL: 'CL',
      CR: 'CR',
      DG: 'DG',
      TV: 'TV',
      AV: 'AV',
      AK: 'AK',
    };

    const quadMap: Record<string, string> = {
      NORTE: 'NORTE',
      SUR: 'SUR',
      ESTE: 'ESTE',
      ORIENTE: 'O',
      O: 'O',
      OCCIDENTE: 'OCC',
      OCC: 'OCC',
      OESTE: 'OCC',
    };

    const allowedTypes = new Set(this.viaTypes as unknown as string[]);
    const allowedQuads = new Set([...this.quads, ''] as unknown as string[]);

    const tokens = raw.split(' ').filter(Boolean);

    const mapType = (x: string) => typeMap[x] ?? x;
    const mapQuad = (x: string) => quadMap[x] ?? x;

    // tipo de vía
    let i = 0;
    let type = mapType(tokens[i] ?? '');
    if (!allowedTypes.has(type)) {
      const idx = tokens.findIndex((x) => allowedTypes.has(mapType(x)));
      if (idx >= 0) {
        i = idx;
        type = mapType(tokens[i]);
      } else return raw;
    }

    const parts: string[] = [type];
    i++;

    const takeNum = () => {
      while (i < tokens.length && !/^\d+$/.test(tokens[i])) i++;
      if (i < tokens.length) {
        parts.push(tokens[i]);
        i++;
        return true;
      }
      return false;
    };

    const takeLetter = () => {
      if (i < tokens.length && /^[A-Z]$/.test(tokens[i])) {
        parts.push(tokens[i]);
        i++;
        return true;
      }
      return false;
    };

    const takeBis = () => {
      if (i < tokens.length && tokens[i] === 'BIS') {
        parts.push('BIS');
        i++;
        return true;
      }
      return false;
    };

    const takeQuad = () => {
      const q = mapQuad(tokens[i] ?? '');
      if (allowedQuads.has(q) && q !== '') {
        parts.push(q);
        i++;
        return true;
      }
      return false;
    };

    // TYPE NUM [LETTER] [BIS] [QUAD] NUM [LETTER] [QUAD] NUM
    takeNum();
    takeLetter();
    takeBis();
    takeQuad();

    takeNum();
    takeLetter();
    takeQuad();

    takeNum();

    const out = this.normalizeStrict(parts.join(' '));
    return out.split(' ').length < 4 ? raw : out;
  }

  // ========= ACCIONES =========
  copiar(valor: string): void {
    const v = (valor ?? '').trim();
    if (!v) {
      this.snack.open('No hay dirección para copiar.', 'OK', { duration: 2200 });
      return;
    }

    try {
      navigator.clipboard
        .writeText(v)
        .then(() => this.snack.open('Dirección copiada.', 'OK', { duration: 1800 }))
        .catch(() => this.snack.open('No se pudo copiar. Cópiala manualmente.', 'OK', { duration: 2800 }));
    } catch {
      this.snack.open('No se pudo copiar. Cópiala manualmente.', 'OK', { duration: 2800 });
    }
  }

  cancelar(): void {
    this.dialogRef.close();
  }

  aceptar(preview: string | null): void {
    const dian = (preview ?? '').trim();
    const mode = this.modeCtrl.value;

    if (!dian) {
      this.snack.open('Completa la dirección primero.', 'OK', { duration: 2400 });
      return;
    }

    if (mode === 'guided') {
      this.guided.markAllAsTouched();
      this.guided.updateValueAndValidity({ emitEvent: false });

      if (this.guided.invalid) {
        this.snack.open('Faltan campos obligatorios (urbana).', 'OK', { duration: 2600 });
        return;
      }
    }

    const result: AddressBuilderResult = {
      mode,
      dian,
      raw: {
        guided: this.guided.getRawValue(),
        pasted: this.pastedCtrl.value ?? '',
        other: this.otherCtrl.value ?? '',
      },
    };

    this.dialogRef.close(result);
  }
}
