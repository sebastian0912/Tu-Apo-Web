import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Swal from 'sweetalert2';

import { SharedModule } from '../../../../../../shared/shared-module';
import { CandidatoNewS } from '../../../../../../shared/services/candidato-new/candidato-new-s';
import { DocumentManagementS } from '../../../../../../shared/services/document-management-s/document-management-s';

/** Un dibujo del punto 1 con su palabra y las letras que ya vienen impresas. */
interface PalabraDibujo {
  clave: string;
  imagen: string;
  etiqueta: string;
  /** Máscara tal cual el papel: letra = pista impresa, '_' = espacio a llenar. */
  mascara: string;
}

/** Una fila del punto 4: dos números a comparar. */
interface ParNumeros {
  izquierda: string;
  derecha: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-form-reading-and-writing-test',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SharedModule],
  templateUrl: './form-reading-and-writing-test.html',
  styleUrl: './form-reading-and-writing-test.css',
})
export class FormReadingAndWritingTest implements OnInit {
  /** 20 = PRUEBA_LECTRO_ESCRITURA en table_document_type. */
  private static readonly TIPO_DOCUMENTO = 20;

  /**
   * Logo y prefijo de código por temporal, igual que `getEmpresaInfo()` de
   * TesoroApp (generate-contracting-documents): AL → Logo_AL, TA → Logo_TA.
   */
  private static readonly EMPRESAS: Record<string, { nombre: string; logo: string; prefijo: string }> = {
    'apoyo-laboral': { nombre: 'APOYO LABORAL T.S. S.A.S.', logo: 'logos/Logo_AL.png', prefijo: 'AL' },
    'tu-alianza': { nombre: 'TU ALIANZA S.A.S.', logo: 'logos/Logo_TA.png', prefijo: 'TA' },
  };
  private static readonly EMPRESA_DEFECTO = 'apoyo-laboral';

  empresaSlug = FormReadingAndWritingTest.EMPRESA_DEFECTO;

  get empresa() {
    return FormReadingAndWritingTest.EMPRESAS[this.empresaSlug]
      ?? FormReadingAndWritingTest.EMPRESAS[FormReadingAndWritingTest.EMPRESA_DEFECTO];
  }

  /** Ruta del logo de la temporal activa (la usa la plantilla y el PDF). */
  get logoEmpresa(): string { return this.empresa.logo; }

  /** Datos de la plantilla impresa (encabezado del formato). */
  get FORMATO() {
    return {
      proceso: 'PROCESO DE GESTIÓN HUMANA',
      titulo: 'PRUEBA DE LECTO-ESCRITURA',
      // El número del formato es el mismo; solo cambia el prefijo de la temporal.
      codigo: `Código: ${this.empresa.prefijo} SE-RE-6`,
      version: 'Versión: 04',
      emision: 'Fecha Emisión: Julio 01-22',
      pagina: 'Página 2 de 2',
    };
  }

  /**
   * Punto 1. La máscara respeta el papel: mayúscula/minúscula de las pistas y
   * cantidad exacta de espacios. La prueba no se califica acá, solo se registra
   * lo que la persona escribió.
   */
  readonly PALABRAS: readonly PalabraDibujo[] = [
    { clave: 'gallina', imagen: 'imagenes/gallina.png', etiqueta: 'Gallina', mascara: 'G___i_a' },
    { clave: 'murcielago', imagen: 'imagenes/murcielago.png', etiqueta: 'Murciélago', mascara: '__r_i___g_' },
    { clave: 'chimpance', imagen: 'imagenes/chimpance.png', etiqueta: 'Chimpancé', mascara: '___mp__c_' },
    { clave: 'mesa', imagen: 'imagenes/mesa.png', etiqueta: 'Mesa', mascara: '___a' },
    { clave: 'camisa', imagen: 'imagenes/camisa.png', etiqueta: 'Camisa', mascara: '__m__a' },
    { clave: 'lampara', imagen: 'imagenes/lampara.png', etiqueta: 'Lámpara', mascara: 'L_m____' },
  ];

  /** Punto 2. */
  readonly OPERACIONES = [
    { letra: 'a', texto: '35+17=' },
    { letra: 'b', texto: '53-10=' },
    { letra: 'c', texto: '16x8=' },
    { letra: 'd', texto: '200 / 2=' },
    { letra: 'e', texto: '350-50=' },
  ];

  /** Punto 3. */
  readonly PREGUNTA_RAMOS =
    'Si en una hora de trabajo realizo 20 Ramos, en 4 horas de trabajo, ¿Cuántos ramos he realizado?';
  readonly OPCIONES_RAMOS = [
    { letra: 'a', valor: '100' },
    { letra: 'b', valor: '60' },
    { letra: 'c', valor: '40' },
    { letra: 'd', valor: '80' },
  ];

  /** Punto 4: columna izquierda y columna derecha, en el orden del papel. */
  readonly PARES_IZQUIERDA: readonly ParNumeros[] = [
    { izquierda: '15', derecha: '10' },
    { izquierda: '2026', derecha: '2026' },
    { izquierda: '98', derecha: '61' },
    { izquierda: '98621', derecha: '98921' },
    { izquierda: '1536', derecha: '1536' },
  ];
  readonly PARES_DERECHA: readonly ParNumeros[] = [
    { izquierda: '250', derecha: '450' },
    { izquierda: '253', derecha: '254' },
    { izquierda: '65', derecha: '65' },
    { izquierda: '14', derecha: '17' },
    { izquierda: '23', derecha: '32' },
  ];

  form: FormGroup;
  guardando = false;
  guardado = false;
  cargandoCandidato = false;
  nombreCompleto: string | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private candidatoS: CandidatoNewS,
    private documentS: DocumentManagementS,
    private cdr: ChangeDetectorRef,
    private title: Title,
  ) {
    this.form = this.fb.group({
      numeroCedula: ['', [Validators.required, Validators.pattern(/^\d{5,15}$/)]],
      nombre: ['', Validators.required],
      edad: ['', Validators.required],
      escolaridad: ['', Validators.required],
      // Un control por cada casilla de cada dibujo (pistas incluidas).
      palabras: this.fb.array(
        this.PALABRAS.map(p =>
          this.fb.array(
            [...p.mascara].map(ch => this.fb.control(ch === '_' ? '' : ch.toUpperCase())),
          ),
        ),
      ),
      operaciones: this.fb.array(this.OPERACIONES.map(() => this.fb.control(''))),
      ramos: [''],
      // true = la persona marcó X porque los números NO son iguales.
      paresIzquierda: this.fb.array(this.PARES_IZQUIERDA.map(() => this.fb.control(false))),
      paresDerecha: this.fb.array(this.PARES_DERECHA.map(() => this.fb.control(false))),
    });
  }

  ngOnInit(): void {
    this.title.setTitle('Prueba de lecto-escritura');

    // La temporal llega como parámetro de ruta (/:empresa) o en la query, igual
    // que en firma; define el logo y el prefijo del código del formato.
    const slug = (
      this.route.snapshot.paramMap.get('empresa') ||
      this.route.snapshot.queryParamMap.get('empresa') ||
      ''
    ).toLowerCase().trim();
    if (slug && FormReadingAndWritingTest.EMPRESAS[slug]) this.empresaSlug = slug;

    // La cédula llega desde el paso de la firma; si no viene, la persona la digita.
    const cedula = (this.route.snapshot.queryParamMap.get('cedula') || '').trim();
    if (cedula) {
      this.form.get('numeroCedula')?.setValue(cedula);
      this.buscarCandidato();
    }
  }

  // ── Accesores para la plantilla ──
  get palabrasArray(): FormArray { return this.form.get('palabras') as FormArray; }
  get operacionesArray(): FormArray { return this.form.get('operaciones') as FormArray; }
  get paresIzquierdaArray(): FormArray { return this.form.get('paresIzquierda') as FormArray; }
  get paresDerechaArray(): FormArray { return this.form.get('paresDerecha') as FormArray; }

  letrasDe(indice: number): FormArray {
    return this.palabrasArray.at(indice) as FormArray;
  }

  /** Las pistas impresas no se editan; solo los espacios en blanco. */
  esEspacioEnBlanco(indicePalabra: number, indiceLetra: number): boolean {
    return this.PALABRAS[indicePalabra].mascara[indiceLetra] === '_';
  }

  /**
   * Al escribir una letra salta al siguiente espacio en blanco; con Backspace
   * en una casilla vacía retrocede. Sin esto hay que tocar casilla por casilla,
   * que en móvil es insufrible.
   */
  alEscribirLetra(evento: Event, indicePalabra: number, indiceLetra: number): void {
    const input = evento.target as HTMLInputElement;
    const valor = (input.value || '').replace(/[^a-zA-ZñÑáéíóúÁÉÍÓÚ]/g, '').slice(-1).toUpperCase();
    this.letrasDe(indicePalabra).at(indiceLetra).setValue(valor);
    input.value = valor;
    if (valor) this.moverFoco(indicePalabra, indiceLetra, 1);
  }

  alBorrarLetra(evento: KeyboardEvent, indicePalabra: number, indiceLetra: number): void {
    if (evento.key !== 'Backspace') return;
    const actual = this.letrasDe(indicePalabra).at(indiceLetra).value;
    if (!actual) this.moverFoco(indicePalabra, indiceLetra, -1);
  }

  private moverFoco(indicePalabra: number, desde: number, paso: number): void {
    const mascara = this.PALABRAS[indicePalabra].mascara;
    for (let i = desde + paso; i >= 0 && i < mascara.length; i += paso) {
      if (mascara[i] !== '_') continue;
      const el = document.getElementById(`letra-${indicePalabra}-${i}`) as HTMLInputElement | null;
      el?.focus();
      el?.select();
      return;
    }
  }

  /** Palabra armada con pistas + lo escrito (para el PDF y para mostrarla). */
  palabraArmada(indice: number): string {
    return (this.letrasDe(indice).value as string[])
      .map(l => String(l || '').trim())
      .join('')
      .toUpperCase();
  }

  /** ¿Ya llenó todos los espacios de este dibujo? */
  palabraCompleta(indice: number): boolean {
    return (this.letrasDe(indice).value as string[]).every(l => String(l || '').trim() !== '');
  }

  // ── Candidato ──
  buscarCandidato(): void {
    const cedula = String(this.form.get('numeroCedula')?.value || '').trim();
    if (!/^\d{5,15}$/.test(cedula)) {
      Swal.fire('Documento inválido', 'Escriba el número de documento, solo dígitos.', 'warning');
      return;
    }

    this.cargandoCandidato = true;
    this.cdr.markForCheck();

    this.candidatoS.getCandidatoPorDocumento(cedula, true).subscribe({
      next: (res: any) => {
        const cand = Array.isArray(res) ? (res[0] ?? null) : res;
        this.cargandoCandidato = false;

        if (!cand) { this.cdr.markForCheck(); return; }

        const nombre = [
          cand.primer_nombre, cand.segundo_nombre, cand.primer_apellido, cand.segundo_apellido,
        ].map((x: any) => String(x || '').trim()).filter(Boolean).join(' ');

        this.nombreCompleto = nombre || null;
        if (nombre) this.form.get('nombre')?.setValue(nombre);

        const edad = this.calcularEdad(cand.fecha_nacimiento);
        if (edad !== null) this.form.get('edad')?.setValue(String(edad));

        const nivel = cand?.formaciones?.[0]?.nivel;
        if (nivel) this.form.get('escolaridad')?.setValue(String(nivel));

        this.cdr.markForCheck();
      },
      error: () => {
        // Sin datos previos no pasa nada: la persona llena el encabezado a mano.
        this.cargandoCandidato = false;
        this.cdr.markForCheck();
      },
    });
  }

  /** Edad en años cumplidos (mes y día incluidos). */
  private calcularEdad(fechaNacimiento: any): number | null {
    if (!fechaNacimiento) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(fechaNacimiento).trim());
    if (!m) return null;
    const nac = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const hoy = new Date();
    let edad = hoy.getFullYear() - nac.getFullYear();
    const yaCumplio =
      hoy.getMonth() > nac.getMonth() ||
      (hoy.getMonth() === nac.getMonth() && hoy.getDate() >= nac.getDate());
    if (!yaCumplio) edad -= 1;
    return edad >= 0 && edad < 120 ? edad : null;
  }

  // ── Guardado ──
  async guardar(): Promise<void> {
    if (this.form.get('numeroCedula')?.invalid) {
      Swal.fire('Falta el documento', 'Escriba el número de documento del candidato.', 'warning');
      return;
    }
    if (!String(this.form.get('nombre')?.value || '').trim()) {
      Swal.fire('Falta el nombre', 'Escriba el nombre del candidato.', 'warning');
      return;
    }

    const sinLlenar = this.PALABRAS
      .map((p, i) => (this.palabraCompleta(i) ? null : p.etiqueta))
      .filter(Boolean) as string[];
    const opsVacias = this.OPERACIONES
      .filter((_, i) => !String(this.operacionesArray.at(i).value || '').trim())
      .map(o => o.texto.replace('=', ''));
    const sinRamos = !this.form.get('ramos')?.value;

    if (sinLlenar.length || opsVacias.length || sinRamos) {
      const detalle = [
        sinLlenar.length ? `<li><b>Punto 1:</b> ${sinLlenar.join(', ')}</li>` : '',
        opsVacias.length ? `<li><b>Punto 2:</b> ${opsVacias.join(', ')}</li>` : '',
        sinRamos ? '<li><b>Punto 3:</b> sin respuesta</li>' : '',
      ].join('');
      const seguir = await Swal.fire({
        icon: 'warning',
        title: 'La prueba está incompleta',
        html: `<div style="text-align:left"><p>Falta responder:</p><ul>${detalle}</ul>
               <p>Puede guardarla así, pero quedará incompleta en el expediente.</p></div>`,
        showCancelButton: true,
        confirmButtonText: 'Guardar de todas formas',
        cancelButtonText: 'Volver a la prueba',
        confirmButtonColor: '#111827',
      }).then(r => r.isConfirmed);
      if (!seguir) return;
    }

    const cedula = String(this.form.get('numeroCedula')?.value || '').trim();
    this.guardando = true;
    this.cdr.markForCheck();

    Swal.fire({
      icon: 'info',
      title: 'Guardando…',
      text: 'Generando el PDF de la prueba.',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const blob = await this.generarPdf(cedula);
      const nombreArchivo = `PRUEBA_LECTO_ESCRITURA_${cedula}.pdf`;
      const archivo = new File([blob], nombreArchivo, { type: 'application/pdf' });

      await new Promise<void>((resolve, reject) => {
        this.documentS
          .guardarDocumento(nombreArchivo, cedula, FormReadingAndWritingTest.TIPO_DOCUMENTO, archivo)
          .subscribe({ next: () => resolve(), error: (e) => reject(e) });
      });

      Swal.close();
      this.guardando = false;
      this.guardado = true;
      this.cdr.markForCheck();

      await Swal.fire({
        icon: 'success',
        title: '¡Listo!',
        text: 'La prueba de lecto-escritura se guardó correctamente.',
        confirmButtonColor: '#111827',
      });
    } catch (err: any) {
      Swal.close();
      this.guardando = false;
      this.cdr.markForCheck();
      const msg = err?.error?.detail || err?.error?.message || err?.message ||
        'No se pudo guardar la prueba. Intente de nuevo.';
      Swal.fire('No se pudo guardar', String(msg), 'error');
    }
  }

  /** Descarga local sin subir nada (para revisar antes de guardar). */
  async descargarPdf(): Promise<void> {
    const cedula = String(this.form.get('numeroCedula')?.value || 'prueba').trim();
    const blob = await this.generarPdf(cedula);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PRUEBA_LECTO_ESCRITURA_${cedula}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ══════════════════════════════════════════════════════════
  //  PDF — carta, calcado del formato impreso AL SE-RE-6 v04
  // ══════════════════════════════════════════════════════════
  private async generarPdf(cedula: string): Promise<Blob> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    doc.setProperties({ title: `PRUEBA_LECTO_ESCRITURA_${cedula}` });

    const anchoPagina = doc.internal.pageSize.getWidth();   // 215.9 mm (carta)
    const margen = 14;
    const ancho = anchoPagina - margen * 2;
    const v = this.form.getRawValue();
    const formato = this.FORMATO;

    // ── Encabezado: celda del logo + 3 filas del formato ──
    const logo = await this.aDataUrl(this.logoEmpresa);
    autoTable(doc, {
      startY: 10,
      margin: { left: margen, right: margen },
      theme: 'grid',
      styles: { textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.2 },
      body: [
        [
          { content: '', rowSpan: 3, styles: { cellWidth: 45, minCellHeight: 18 } },
          { content: formato.proceso, colSpan: 4, styles: { halign: 'center', fontStyle: 'bold', fontSize: 9 } },
        ],
        [{ content: formato.titulo, colSpan: 4, styles: { halign: 'center', fontStyle: 'bold', fontSize: 9 } }],
        [
          { content: formato.codigo, styles: { halign: 'center', fontSize: 7.5 } },
          { content: formato.version, styles: { halign: 'center', fontSize: 7.5 } },
          { content: formato.emision, styles: { halign: 'center', fontSize: 7.5 } },
          { content: formato.pagina, styles: { halign: 'center', fontSize: 7.5 } },
        ],
      ],
      didDrawCell: (data) => {
        if (data.row.index === 0 && data.column.index === 0 && logo) {
          try {
            doc.addImage(logo, 'PNG', data.cell.x + 3, data.cell.y + 3, data.cell.width - 6, data.cell.height - 6);
          } catch { /* el logo es decorativo, no aborta el PDF */ }
        }
      },
    });

    let y = (doc as any).lastAutoTable.finalY + 8;

    // ── Datos del candidato ──
    const campoConLinea = (etiqueta: string, valor: string, x: number, anchoTotal: number) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(etiqueta, x, y);
      const xValor = x + doc.getTextWidth(etiqueta) + 2;
      const finLinea = x + anchoTotal;
      doc.setLineWidth(0.2);
      doc.line(xValor, y + 1, finLinea, y + 1);
      doc.setFont('helvetica', 'normal');
      doc.text(String(valor || '').toUpperCase(), xValor + 1, y, { maxWidth: finLinea - xValor - 2 });
    };

    campoConLinea('NOMBRE:', v.nombre, margen, ancho);
    y += 9;
    campoConLinea('EDAD:', v.edad, margen, 60);
    campoConLinea('GRADO DE ESCOLARIDAD:', v.escolaridad, margen + 70, ancho - 70);
    y += 11;

    // ── Punto 1: dibujos ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('1.  Complete la palabra según el dibujo', margen, y);
    y += 4;

    const columnas = 3;
    const anchoCelda = ancho / columnas;
    const altoImagen = 26;

    for (let fila = 0; fila < 2; fila++) {
      const yFila = y + fila * (altoImagen + 12);
      for (let col = 0; col < columnas; col++) {
        const indice = fila * columnas + col;
        const palabra = this.PALABRAS[indice];
        if (!palabra) continue;

        const xCentro = margen + anchoCelda * col + anchoCelda / 2;
        const img = await this.aDataUrl(palabra.imagen);
        if (img) {
          const anchoImg = Math.min(anchoCelda - 10, 34);
          try {
            doc.addImage(img, 'PNG', xCentro - anchoImg / 2, yFila, anchoImg, altoImagen);
          } catch { /* si falla la imagen igual va la palabra */ }
        }
        this.dibujarPalabra(doc, this.palabraArmada(indice), palabra.mascara, xCentro, yFila + altoImagen + 6);
      }
    }
    y += 2 * (altoImagen + 12) + 2;

    // ── Punto 2: operaciones ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('2.  Realice las siguientes operaciones matemáticas.', margen, y);
    y += 6;

    doc.setFontSize(9);
    this.OPERACIONES.forEach((op, i) => {
      const x = margen + 8;
      doc.setFont('helvetica', 'normal');
      doc.text(`${op.letra}.   ${op.texto}`, x, y);
      const xLinea = x + 32;
      doc.line(xLinea, y + 1, xLinea + 45, y + 1);
      doc.setFont('helvetica', 'bold');
      doc.text(String(this.operacionesArray.at(i).value ?? ''), xLinea + 3, y);
      y += 6.5;
    });

    y += 3;

    // ── Punto 3: opción múltiple ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(`3.  ${this.PREGUNTA_RAMOS}`, margen, y, { maxWidth: ancho });
    y += 7;

    const elegida = String(v.ramos || '');
    this.OPCIONES_RAMOS.forEach((op, i) => {
      const x = margen + 8 + i * ((ancho - 16) / 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`${op.letra}. ${op.valor}`, x, y);
      const xLinea = x + 14;
      doc.line(xLinea, y + 1, xLinea + 12, y + 1);
      if (elegida === op.valor) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('X', xLinea + 6, y, { align: 'center' });
      }
    });
    y += 10;

    // ── Punto 4: comparación de números ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(
      '4.  Observe cada uno de los números y coloque una X sobre la línea, si estos NO SON IGUALES',
      margen, y, { maxWidth: ancho },
    );
    y += 6;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.text('Ejemplo:   345___X___348,', margen + 30, y);
    doc.setFont('helvetica', 'normal');
    doc.text('210_______210', margen + 118, y);
    y += 8;

    const dibujarPar = (par: ParNumeros, marcada: boolean, xBase: number, yFila: number) => {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.text(par.izquierda, xBase + 22, yFila, { align: 'right' });
      const xLinea = xBase + 25;
      const anchoLinea = 26;
      doc.setLineWidth(0.2);
      doc.line(xLinea, yFila + 1, xLinea + anchoLinea, yFila + 1);
      if (marcada) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('X', xLinea + anchoLinea / 2, yFila, { align: 'center' });
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(10);
      }
      doc.text(par.derecha, xLinea + anchoLinea + 4, yFila);
    };

    const xColIzq = margen + 4;
    const xColDer = margen + ancho / 2 + 10;
    for (let i = 0; i < 5; i++) {
      const yFila = y + i * 8;
      dibujarPar(this.PARES_IZQUIERDA[i], !!this.paresIzquierdaArray.at(i).value, xColIzq, yFila);
      dibujarPar(this.PARES_DERECHA[i], !!this.paresDerechaArray.at(i).value, xColDer, yFila);
    }

    // ── Pie: trazabilidad de quién y cuándo la diligenció ──
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(90, 90, 90);
    doc.text(
      `Documento: ${cedula}   ·   Diligenciada en línea el ${new Date().toLocaleString('es-CO')}`,
      margen, doc.internal.pageSize.getHeight() - 10,
    );
    doc.setTextColor(0, 0, 0);

    return doc.output('blob');
  }

  /**
   * Escribe la palabra como en el papel: una letra sobre cada raya. Las pistas
   * impresas van en su sitio aunque la persona no haya llenado nada.
   */
  private dibujarPalabra(doc: jsPDF, palabra: string, mascara: string, xCentro: number, y: number): void {
    const paso = 4.6;
    const total = mascara.length;
    const xInicio = xCentro - (total * paso) / 2;

    for (let i = 0; i < total; i++) {
      const x = xInicio + i * paso;
      const esPista = mascara[i] !== '_';
      const letra = (palabra[i] || (esPista ? mascara[i] : '')).toUpperCase();

      doc.setLineWidth(0.25);
      doc.line(x, y + 1, x + paso - 1, y + 1);

      if (letra) {
        doc.setFont('helvetica', esPista ? 'normal' : 'bold');
        doc.setFontSize(10);
        doc.text(letra, x + (paso - 1) / 2, y, { align: 'center' });
      }
    }
    doc.setFont('helvetica', 'normal');
  }

  /** Descarga una imagen del sitio y la vuelve DataURL para `doc.addImage`. */
  private async aDataUrl(url: string): Promise<string | null> {
    try {
      const r = await fetch(url, { cache: 'force-cache' });
      if (!r.ok) return null;
      const blob = await r.blob();
      return await new Promise<string>((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => res(String(fr.result));
        fr.onerror = () => rej(new Error('reader fail'));
        fr.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }
}
