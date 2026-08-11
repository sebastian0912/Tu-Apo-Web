import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { CommonModule } from '@angular/common';

import { CapturaCedula } from '../../../../../../shared/components/captura-cedula/captura-cedula';

/**
 * Página /formulario/escaner-cedula: pide el número y delega TODO el proceso
 * (ejemplos, cámara, recorte, realce, PDF al 150% y guardado) al componente
 * compartido `app-captura-cedula`, el mismo que usa el paso 1 del formulario
 * de contratación.
 */
@Component({
  selector: 'app-escaner-cedula',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatIconModule, MatInputModule, MatFormFieldModule,
    CapturaCedula,
  ],
  templateUrl: './escaner-cedula.html',
  styleUrl: './escaner-cedula.css',
})
export class EscanerCedula {
  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      numeroCedula: ['', [Validators.required, this.cedulaValidator()]],
    });
  }

  get cedula(): string {
    // Solo se entrega al componente cuando es válida: un PDF archivado bajo una
    // cédula equivocada es un PDF perdido.
    return this.form.valid ? String(this.form.get('numeroCedula')?.value || '').trim() : '';
  }

  /**
   * Mismo criterio que el formulario de contratación: solo dígitos, sin ceros a
   * la izquierda y con un largo posible para un documento colombiano.
   */
  private cedulaValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
      const v = String(control.value ?? '').trim();
      if (!v) return null;
      if (!/^\d+$/.test(v)) return { soloNumeros: true };
      if (/^0/.test(v)) return { ceroInicial: true };
      if (/^(\d)\1+$/.test(v)) return { noPlausible: true };
      if (/^3\d{9}$/.test(v)) return { pareceCelular: true };
      if (v.length < 5 || v.length > 11) return { largo: true };
      return null;
    };
  }

  get errorCedula(): string {
    const c = this.form.get('numeroCedula');
    if (!c || !c.errors || !c.touched) return '';
    const e = c.errors;
    if (e['required']) return 'Escriba el número de cédula';
    if (e['soloNumeros']) return 'Solo números: sin puntos, espacios ni letras';
    if (e['ceroInicial']) return 'No empiece por cero';
    if (e['noPlausible']) return 'Ese número no es válido';
    if (e['pareceCelular']) return 'Parece un número de celular';
    if (e['largo']) return 'Debe tener entre 5 y 11 dígitos';
    return 'Número inválido';
  }

  /** Tras guardar, se limpia el número para arrancar con la siguiente persona. */
  alGuardar(): void {
    this.form.reset();
  }
}
