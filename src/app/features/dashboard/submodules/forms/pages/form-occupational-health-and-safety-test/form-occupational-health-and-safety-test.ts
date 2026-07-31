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

/** Opción con dibujo de las preguntas 1 y 2. */
interface OpcionImagen {
  letra: string;
  imagen: string;
  texto: string;
}

/** Enunciado de la pregunta 3 (verdadero / falso). */
interface EnunciadoVF {
  clave: string;
  texto: string;
  imagen: string;
}

/**
 * Evaluación de inducción/reinducción en SST — formato AL SG-RE-6 v02.
 * El PDF que se guarda es calcado del impreso (2 páginas carta), sin importar
 * si la persona lo llenó desde el celular.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-form-occupational-health-and-safety-test',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SharedModule],
  templateUrl: './form-occupational-health-and-safety-test.html',
  styleUrl: './form-occupational-health-and-safety-test.css',
})
export class FormOccupationalHealthAndSafetyTest implements OnInit {
  /** 24 = PRUEBA_SST en table_document_type. */
  private static readonly TIPO_DOCUMENTO = 24;

  /** Pie del formato: quien evalúa y la nota, fijos para este flujo. */
  private static readonly EVALUADOR_POR_DEFECTO = 'NORA CASTRO';
  private static readonly CALIFICACION_POR_DEFECTO = '10';

  /** Logo por temporal, igual que `getEmpresaInfo()` de TesoroApp. */
  private static readonly EMPRESAS: Record<string, { nombre: string; logo: string; prefijo: string }> = {
    'apoyo-laboral': { nombre: 'APOYO LABORAL T.S. S.A.S.', logo: 'logos/Logo_AL.png', prefijo: 'AL' },
    'tu-alianza': { nombre: 'TU ALIANZA S.A.S.', logo: 'logos/Logo_TA.png', prefijo: 'TA' },
  };
  private static readonly EMPRESA_DEFECTO = 'apoyo-laboral';

  empresaSlug = FormOccupationalHealthAndSafetyTest.EMPRESA_DEFECTO;

  get empresa() {
    const E = FormOccupationalHealthAndSafetyTest.EMPRESAS;
    return E[this.empresaSlug] ?? E[FormOccupationalHealthAndSafetyTest.EMPRESA_DEFECTO];
  }

  get logoEmpresa(): string { return this.empresa.logo; }

  /** Encabezado del formato impreso. */
  get FORMATO() {
    return {
      sistema: 'SISTEMA DE GESTIÓN DE SEGURIDAD Y SALUD EN EL TRABAJO',
      formato: 'FORMATO EVALUACION DE INDUCCION-REINDUCCION EN SEGURIDAD Y SALUD EN EL TRABAJO',
      codigo: `Código: ${this.empresa.prefijo} SG-RE-6`,
      version: 'Versión: 02',
      emision: 'Fecha de Emisión: febrero 2-26',
      // El impreso trae "1 de 2" en las dos hojas; se conserva tal cual.
      pagina: 'Página: 1 de 2',
    };
  }

  readonly TITULO = 'EVALUACION DE INDUCCION Y REINDUCCION EN SEGURIDAD Y SALUD EN EL TRABAJO';

  // ── Pregunta 1 ──
  readonly P1_ENUNCIADO = 'Marque con una "X" sobre la imagen la respuesta correcta.';
  readonly P1_PREGUNTA =
    'Una de mis responsabilidades como trabajador frente al Sistema de Gestión de Seguridad y Salud en el trabajo es:';
  readonly P1_OPCIONES: readonly OpcionImagen[] = [
    { letra: 'a', imagen: 'imagenes/1.png', texto: 'No reportar los accidentes de trabajo.' },
    { letra: 'b', imagen: 'imagenes/2.png', texto: 'Suministrar información clara, completa y veraz de mi estado de salud.' },
    { letra: 'c', imagen: 'imagenes/3.png', texto: 'No respetar las señales de peligro' },
  ];

  // ── Pregunta 2 ──
  readonly P2_ENUNCIADO = 'Marque con una "X" sobre la imagen la respuesta correcta.';
  readonly P2_PREGUNTA = 'Tan pronto ocurre un accidente de Trabajo, yo debo:';
  readonly P2_OPCIONES: readonly OpcionImagen[] = [
    { letra: 'a', imagen: 'imagenes/4.png', texto: 'Asustarme, dando alaridos' },
    { letra: 'b', imagen: 'imagenes/5.png', texto: 'Sentarme a esperar a ver qué pasa' },
    { letra: 'c', imagen: 'imagenes/6.png', texto: 'Informar al jefe inmediato y a la empresa temporal lo sucedido' },
  ];

  // ── Pregunta 3 ──
  readonly P3_ENUNCIADO =
    'Lea cuidadosamente los siguientes enunciados y coloque sobre la línea una "V" si considera que es Verdadero y una "F" si considera que es Falso.';
  readonly P3_ENUNCIADOS: readonly EnunciadoVF[] = [
    {
      clave: 'convivencia',
      texto: 'El comité de Convivencia Laboral vela por el bienestar de los trabajadores',
      imagen: 'imagenes/7.png',
    },
    {
      clave: 'copasst',
      texto: 'El Comité de Seguridad y Salud en el Trabajo (COPASST) vigila, controla, previene e implementa medidas de seguridad y salud laboral',
      imagen: 'imagenes/8.png',
    },
  ];

  // ── Pregunta 4 ──
  readonly P4_ENUNCIADO = 'Debajo de cada imagen, escriba los peligros o consecuencias a los que está se expuesto:';
  readonly P4_IMAGENES: readonly string[] = [
    'imagenes/9.png', 'imagenes/10.png', 'imagenes/11.png', 'imagenes/12.png',
  ];

  // ── Pregunta 5 ──
  readonly P5_ENUNCIADO = 'Marque con una "X" la respuesta correcta.';
  readonly P5_DIVULGACION = 'Recibió la divulgación de la política de seguridad y salud en el Trabajo';
  readonly P5_PREGUNTA = 'La Política de Seguridad y Salud en el trabajo hace referencia a:';
  readonly P5_OPCIONES = [
    {
      letra: 'a',
      texto: 'Tiene como razón fundamental promover la protección y el cuidado de la salud física y mental de sus colaboradores directos, misionales, contratistas y visitantes, garantizando la identificación, evaluación y valoración de los riesgos laborales.',
    },
    {
      letra: 'b',
      texto: 'APOYO LABORAL TS., desarrollará actividades y estrategias que promuevan el bienestar, la prevención de incidentes, accidentes de trabajo y enfermedades laborales, el control del ausentismo, la preparación y atención de emergencias.',
    },
    {
      letra: 'c',
      texto: 'La empresa no tiene el compromiso de dar cumplimiento a los requisitos legales aplicables, destinar los recursos humanos, físicos y financieros para el desarrollo del sistema, promover un ambiente de trabajo sano y seguro incluyendo todas las partes interesadas.',
    },
    { letra: 'd', texto: 'A y b son ciertas' },
  ];

  readonly CRITERIO = [
    'Cada pregunta tiene un valor de 2.0 puntos, para un total de 10 puntos. Donde:',
    '10 = muy alto     8.00 = alto     6.00 = medio     4.00 = bajo    2.00 y 00 muy bajo.',
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
    const hoy = new Date();
    this.form = this.fb.group({
      numeroCedula: ['', [Validators.required, Validators.pattern(/^\d{5,15}$/)]],
      nombre: ['', Validators.required],
      fechaDia: [String(hoy.getDate()).padStart(2, '0')],
      fechaMes: [String(hoy.getMonth() + 1).padStart(2, '0')],
      fechaAnio: [String(hoy.getFullYear())],

      p1: [''],
      p2: [''],
      // 'V' | 'F' por enunciado, en el orden de P3_ENUNCIADOS.
      p3: this.fb.array(this.P3_ENUNCIADOS.map(() => this.fb.control(''))),
      // Texto libre por imagen, en el orden de P4_IMAGENES.
      p4: this.fb.array(this.P4_IMAGENES.map(() => this.fb.control(''))),
      divulgacion: [''],
      p5: [''],

      // El evaluador siempre es el mismo y la evaluación se da por aprobada:
      // la persona llena la prueba desde el celular y estos dos campos no los
      // diligencia ella. Quedan editables por si hay que corregirlos.
      nombreEvaluador: [FormOccupationalHealthAndSafetyTest.EVALUADOR_POR_DEFECTO],
      calificacion: [FormOccupationalHealthAndSafetyTest.CALIFICACION_POR_DEFECTO],
    });
  }

  ngOnInit(): void {
    this.title.setTitle('Evaluación de inducción en SST');

    const slug = (
      this.route.snapshot.paramMap.get('empresa') ||
      this.route.snapshot.queryParamMap.get('empresa') ||
      ''
    ).toLowerCase().trim();
    if (slug && FormOccupationalHealthAndSafetyTest.EMPRESAS[slug]) this.empresaSlug = slug;

    const cedula = (this.route.snapshot.queryParamMap.get('cedula') || '').trim();
    if (cedula) {
      this.form.get('numeroCedula')?.setValue(cedula);
      this.buscarCandidato();
    }
  }

  get p3Array(): FormArray { return this.form.get('p3') as FormArray; }
  get p4Array(): FormArray { return this.form.get('p4') as FormArray; }

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
        this.cdr.markForCheck();
      },
      error: () => {
        this.cargandoCandidato = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ── Guardado ──
  async guardar(): Promise<void> {
    if (this.form.get('numeroCedula')?.invalid) {
      Swal.fire('Falta el documento', 'Escriba el número de documento del trabajador.', 'warning');
      return;
    }
    if (!String(this.form.get('nombre')?.value || '').trim()) {
      Swal.fire('Falta el nombre', 'Escriba el nombre completo del trabajador.', 'warning');
      return;
    }

    const faltantes: string[] = [];
    if (!this.form.get('p1')?.value) faltantes.push('<li><b>Pregunta 1:</b> sin respuesta</li>');
    if (!this.form.get('p2')?.value) faltantes.push('<li><b>Pregunta 2:</b> sin respuesta</li>');
    const vfVacios = this.P3_ENUNCIADOS
      .filter((_, i) => !this.p3Array.at(i).value)
      .length;
    if (vfVacios) faltantes.push(`<li><b>Pregunta 3:</b> ${vfVacios} enunciado(s) sin V/F</li>`);
    const p4Vacios = this.P4_IMAGENES
      .filter((_, i) => !String(this.p4Array.at(i).value || '').trim())
      .length;
    if (p4Vacios) faltantes.push(`<li><b>Pregunta 4:</b> ${p4Vacios} imagen(es) sin describir</li>`);
    if (!this.form.get('divulgacion')?.value) faltantes.push('<li><b>Pregunta 5:</b> falta indicar si recibió la divulgación</li>');
    if (!this.form.get('p5')?.value) faltantes.push('<li><b>Pregunta 5:</b> sin respuesta sobre la política</li>');

    if (faltantes.length) {
      const seguir = await Swal.fire({
        icon: 'warning',
        title: 'La evaluación está incompleta',
        html: `<div style="text-align:left"><p>Falta responder:</p><ul>${faltantes.join('')}</ul>
               <p>Puede guardarla así, pero quedará incompleta en el expediente.</p></div>`,
        showCancelButton: true,
        confirmButtonText: 'Guardar de todas formas',
        cancelButtonText: 'Volver a la evaluación',
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
      text: 'Generando el PDF de la evaluación.',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const blob = await this.generarPdf(cedula);
      const nombreArchivo = `PRUEBA_SST_${cedula}.pdf`;
      const archivo = new File([blob], nombreArchivo, { type: 'application/pdf' });

      await new Promise<void>((resolve, reject) => {
        this.documentS
          .guardarDocumento(nombreArchivo, cedula, FormOccupationalHealthAndSafetyTest.TIPO_DOCUMENTO, archivo)
          .subscribe({ next: () => resolve(), error: (e) => reject(e) });
      });

      Swal.close();
      this.guardando = false;
      this.guardado = true;
      this.cdr.markForCheck();

      await Swal.fire({
        icon: 'success',
        title: '¡Listo!',
        text: 'La evaluación de SST se guardó correctamente.',
        confirmButtonColor: '#111827',
      });
    } catch (err: any) {
      Swal.close();
      this.guardando = false;
      this.cdr.markForCheck();
      const msg = err?.error?.detail || err?.error?.message || err?.message ||
        'No se pudo guardar la evaluación. Intente de nuevo.';
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
    a.download = `PRUEBA_SST_${cedula}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ══════════════════════════════════════════════════════════
  //  PDF — 2 páginas carta, calcadas del formato AL SG-RE-6 v02
  // ══════════════════════════════════════════════════════════
  private async generarPdf(cedula: string): Promise<Blob> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    doc.setProperties({ title: `PRUEBA_SST_${cedula}` });

    const margen = 14;
    const ancho = doc.internal.pageSize.getWidth() - margen * 2;
    const v = this.form.getRawValue();

    // Las imágenes se cargan una sola vez: se usan en pantalla y en el PDF.
    const cache = new Map<string, string | null>();
    const img = async (url: string): Promise<string | null> => {
      if (!cache.has(url)) cache.set(url, await this.aDataUrl(url));
      return cache.get(url) ?? null;
    };

    const logo = await img(this.logoEmpresa);
    const f = this.FORMATO;

    /** Encabezado del formato; se repite igual en las dos hojas. */
    const encabezado = (): number => {
      autoTable(doc, {
        startY: 10,
        margin: { left: margen, right: margen },
        theme: 'grid',
        styles: { textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.2, cellPadding: 1 },
        body: [
          [
            { content: '', rowSpan: 3, styles: { cellWidth: 46, minCellHeight: 19 } },
            { content: f.sistema, colSpan: 4, styles: { halign: 'center', fontStyle: 'bold', fontSize: 8 } },
          ],
          [{ content: f.formato, colSpan: 4, styles: { halign: 'center', fontStyle: 'bold', fontSize: 7.5 } }],
          [
            { content: f.codigo, styles: { halign: 'center', fontStyle: 'bold', fontSize: 7 } },
            { content: f.version, styles: { halign: 'center', fontStyle: 'bold', fontSize: 7 } },
            { content: f.emision, styles: { halign: 'center', fontStyle: 'bold', fontSize: 7 } },
            { content: f.pagina, styles: { halign: 'center', fontStyle: 'bold', fontSize: 7 } },
          ],
        ],
        didDrawCell: (data) => {
          if (data.row.index === 0 && data.column.index === 0 && logo) {
            try {
              doc.addImage(logo, 'PNG', data.cell.x + 3, data.cell.y + 3, data.cell.width - 6, data.cell.height - 6);
            } catch { /* el logo es decorativo */ }
          }
        },
      });
      return (doc as any).lastAutoTable.finalY;
    };

    /** Dibuja la imagen centrada en la parte superior de una celda. */
    const imagenEnCelda = (celda: any, dataUrl: string | null, alto: number, margenSup = 2) => {
      if (!dataUrl) return;
      try {
        const props = doc.getImageProperties(dataUrl);
        const escala = Math.min((celda.width - 6) / props.width, alto / props.height);
        const w = props.width * escala;
        const h = props.height * escala;
        doc.addImage(dataUrl, 'PNG', celda.x + (celda.width - w) / 2, celda.y + margenSup, w, h);
      } catch { /* si una imagen falla, la celda queda con su texto */ }
    };

    /** X grande sobre la imagen, como se marca en el papel. */
    const equisSobre = (celda: any, alto: number) => {
      doc.setDrawColor(200, 0, 0);
      doc.setLineWidth(1.1);
      const cx = celda.x + celda.width / 2;
      const cy = celda.y + 2 + alto / 2;
      const r = Math.min(celda.width, alto) / 2.6;
      doc.line(cx - r, cy - r, cx + r, cy + r);
      doc.line(cx + r, cy - r, cx - r, cy + r);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);
    };

    // ═══════════════ PÁGINA 1 ═══════════════
    let y = encabezado() + 6;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(this.TITULO, margen + ancho / 2, y, { align: 'center', maxWidth: ancho });
    y += 9;

    // Datos del trabajador
    doc.setFontSize(9);
    doc.text('Nombre Completo del Trabajador:', margen, y);
    let x = margen + doc.getTextWidth('Nombre Completo del Trabajador:') + 2;
    doc.line(x, y + 1, margen + ancho, y + 1);
    doc.setFont('helvetica', 'normal');
    doc.text(String(v.nombre || '').toUpperCase(), x + 1, y, { maxWidth: margen + ancho - x - 2 });
    y += 8;

    doc.setFont('helvetica', 'bold');
    doc.text('N° de Cédula:', margen, y);
    x = margen + doc.getTextWidth('N° de Cédula:') + 2;
    doc.line(x, y + 1, x + 52, y + 1);
    doc.setFont('helvetica', 'normal');
    doc.text(String(cedula), x + 2, y);

    doc.setFont('helvetica', 'bold');
    const etiquetaFecha = 'Fecha Diligenciamiento:';
    const xFecha = x + 58;
    doc.text(etiquetaFecha, xFecha, y);
    let xCaja = xFecha + doc.getTextWidth(etiquetaFecha) + 2;
    doc.setFont('helvetica', 'normal');
    [v.fechaDia, v.fechaMes, v.fechaAnio].forEach((parte, i) => {
      const w = i === 2 ? 14 : 10;
      doc.line(xCaja, y + 1, xCaja + w, y + 1);
      doc.text(String(parte || ''), xCaja + w / 2, y, { align: 'center' });
      xCaja += w;
      if (i < 2) { doc.text('/', xCaja + 1, y); xCaja += 4; }
    });
    y += 9;

    // ── Pregunta 1 ──
    const enunciado = (numero: string, negrita: string, resto?: string) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(numero, margen, y);
      doc.setFont('helvetica', 'normal');
      doc.text(negrita, margen + 6, y, { maxWidth: ancho - 6 });
      y += 5;
      if (resto) {
        const lineas = doc.splitTextToSize(resto, ancho) as string[];
        doc.text(lineas, margen, y);
        y += lineas.length * 4.4;
      }
      y += 2;
    };

    enunciado('1.', this.P1_ENUNCIADO, this.P1_PREGUNTA);

    const ALTO_IMG = 24;
    const dibujarOpciones = async (opciones: readonly OpcionImagen[], elegida: string) => {
      const datos = await Promise.all(opciones.map(o => img(o.imagen)));
      autoTable(doc, {
        startY: y,
        margin: { left: margen, right: margen },
        theme: 'grid',
        styles: {
          textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.6,
          fontSize: 8, fontStyle: 'bold', valign: 'bottom', cellPadding: { top: ALTO_IMG + 4, bottom: 2, left: 2, right: 2 },
        },
        columnStyles: { 0: { cellWidth: ancho / 3 }, 1: { cellWidth: ancho / 3 }, 2: { cellWidth: ancho / 3 } },
        body: [opciones.map(o => `${o.letra}. ${o.texto}`)],
        didDrawCell: (data) => {
          if (data.section !== 'body') return;
          const i = data.column.index;
          imagenEnCelda(data.cell, datos[i], ALTO_IMG);
          if (opciones[i].letra === elegida) equisSobre(data.cell, ALTO_IMG);
        },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    };

    await dibujarOpciones(this.P1_OPCIONES, String(v.p1 || ''));

    // ── Pregunta 2 ──
    enunciado('2.', this.P2_ENUNCIADO, this.P2_PREGUNTA);
    await dibujarOpciones(this.P2_OPCIONES, String(v.p2 || ''));

    // ── Pregunta 3 ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('3.', margen, y);
    doc.setFont('helvetica', 'normal');
    const l3 = doc.splitTextToSize(this.P3_ENUNCIADO, ancho - 6) as string[];
    doc.text(l3, margen + 6, y);
    y += l3.length * 4.4 + 3;

    const datosVF = await Promise.all(this.P3_ENUNCIADOS.map(e => img(e.imagen)));
    const respuestasVF = this.P3_ENUNCIADOS.map((_, i) => String(this.p3Array.at(i).value || ''));
    const ANCHO_IMG_VF = 26;   // reservado a la derecha para que el texto no se monte
    autoTable(doc, {
      startY: y,
      margin: { left: margen, right: margen },
      theme: 'grid',
      styles: {
        textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.6,
        fontSize: 8.5, fontStyle: 'bold', valign: 'top', minCellHeight: 36,
        // El padding derecho es el hueco de la imagen: sin él, el enunciado se
        // dibujaba por debajo del dibujo y quedaba cortado.
        cellPadding: { top: 3, bottom: 10, left: 3, right: ANCHO_IMG_VF + 5 },
      },
      columnStyles: { 0: { cellWidth: ancho / 2 }, 1: { cellWidth: ancho / 2 } },
      body: [this.P3_ENUNCIADOS.map(e => e.texto)],
      didDrawCell: (data) => {
        if (data.section !== 'body') return;
        const i = data.column.index;

        // La imagen va arriba a la derecha, como en el impreso.
        const d = datosVF[i];
        if (d) {
          try {
            const props = doc.getImageProperties(d);
            const h = (ANCHO_IMG_VF / props.width) * props.height;
            doc.addImage(
              d, 'PNG',
              data.cell.x + data.cell.width - ANCHO_IMG_VF - 3, data.cell.y + 3,
              ANCHO_IMG_VF, Math.min(h, data.cell.height - 6),
            );
          } catch { /* decorativa */ }
        }

        // Línea de respuesta al pie del enunciado, con la V o la F encima.
        const xLinea = data.cell.x + 4;
        const yLinea = data.cell.y + data.cell.height - 5;
        doc.setLineWidth(0.3);
        doc.line(xLinea, yLinea, xLinea + 28, yLinea);
        const letra = respuestasVF[i];
        if (letra) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(180, 0, 0);
          doc.text(letra, xLinea + 14, yLinea - 1.5, { align: 'center' });
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(8.5);
        }
        doc.setLineWidth(0.6);
      },
    });

    // ═══════════════ PÁGINA 2 ═══════════════
    doc.addPage();
    y = encabezado() + 7;

    // ── Pregunta 4 ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('4.', margen, y);
    doc.setFont('helvetica', 'normal');
    doc.text(this.P4_ENUNCIADO, margen + 6, y, { maxWidth: ancho - 6 });
    y += 6;

    const datosP4 = await Promise.all(this.P4_IMAGENES.map(u => img(u)));
    const ALTO_P4 = 30;
    autoTable(doc, {
      startY: y,
      margin: { left: margen, right: margen },
      theme: 'grid',
      styles: {
        textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.6,
        fontSize: 8, valign: 'top', cellPadding: 2,
      },
      columnStyles: Object.fromEntries(
        [0, 1, 2, 3].map(i => [i, { cellWidth: ancho / 4 }]),
      ) as any,
      body: [
        // Fila de imágenes: sin texto, la altura la fija el padding superior.
        [
          { content: '', styles: { cellPadding: { top: ALTO_P4 + 2, bottom: 1, left: 1, right: 1 } } },
          { content: '', styles: { cellPadding: { top: ALTO_P4 + 2, bottom: 1, left: 1, right: 1 } } },
          { content: '', styles: { cellPadding: { top: ALTO_P4 + 2, bottom: 1, left: 1, right: 1 } } },
          { content: '', styles: { cellPadding: { top: ALTO_P4 + 2, bottom: 1, left: 1, right: 1 } } },
        ],
        // Fila de respuestas escritas por la persona.
        this.P4_IMAGENES.map((_, i) => ({
          content: String(this.p4Array.at(i).value || ''),
          styles: { minCellHeight: 22, fontSize: 7.5 },
        })),
      ] as any,
      didDrawCell: (data) => {
        if (data.section === 'body' && data.row.index === 0) {
          imagenEnCelda(data.cell, datosP4[data.column.index], ALTO_P4);
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    // ── Pregunta 5 ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('5.', margen, y);
    doc.setFont('helvetica', 'normal');
    doc.text(this.P5_ENUNCIADO, margen + 6, y);
    y += 7;

    doc.text(this.P5_DIVULGACION, margen, y + 3, { maxWidth: ancho - 60 });

    // Casillas SI / NO, como los recuadros del impreso.
    const divulgacion = String(v.divulgacion || '');
    const casilla = (etiqueta: string, marcada: boolean, xCaja0: number) => {
      doc.setFont('helvetica', 'normal');
      doc.text(etiqueta, xCaja0, y + 3);
      const xr = xCaja0 + doc.getTextWidth(etiqueta) + 2;
      doc.setLineWidth(0.5);
      doc.rect(xr, y - 2, 9, 9);
      if (marcada) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('X', xr + 4.5, y + 4.5, { align: 'center' });
        doc.setFontSize(9);
      }
      doc.setLineWidth(0.2);
    };
    casilla('SI', divulgacion === 'SI', margen + ancho - 56);
    casilla('NO', divulgacion === 'NO', margen + ancho - 26);
    y += 15;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(this.P5_PREGUNTA, margen, y);
    y += 6;

    const elegidaP5 = String(v.p5 || '');
    doc.setFontSize(8.5);
    for (const op of this.P5_OPCIONES) {
      const marcada = op.letra === elegidaP5;
      doc.setFont('helvetica', 'bold');
      doc.text(`${op.letra}.`, margen + 4, y);
      doc.setFont('helvetica', 'normal');
      const lineas = doc.splitTextToSize(op.texto, ancho - 16) as string[];
      doc.text(lineas, margen + 12, y, { align: 'justify', maxWidth: ancho - 16 });

      if (marcada) {
        // La X va al margen, junto a la letra de la opción.
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(180, 0, 0);
        doc.text('X', margen - 1, y);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(8.5);
      }
      y += lineas.length * 4.2 + 4;
    }

    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Criterio de evaluación:', margen, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    this.CRITERIO.forEach(linea => {
      doc.text(linea, margen, y, { maxWidth: ancho });
      y += 4.6;
    });

    // ── Pie: evaluador y calificación ──
    const yPie = Math.max(y + 16, doc.internal.pageSize.getHeight() - 26);
    doc.setFont('helvetica', 'bold');
    doc.text('Nombre del Evaluador:', margen, yPie);
    let xPie = margen + doc.getTextWidth('Nombre del Evaluador:') + 2;
    doc.line(xPie, yPie + 1, xPie + 78, yPie + 1);
    doc.setFont('helvetica', 'normal');
    doc.text(String(v.nombreEvaluador || '').toUpperCase(), xPie + 2, yPie, { maxWidth: 76 });

    doc.setFont('helvetica', 'bold');
    xPie = xPie + 84;
    doc.text('Calificación:', xPie, yPie);
    const xCalif = xPie + doc.getTextWidth('Calificación:') + 2;
    doc.line(xCalif, yPie + 1, margen + ancho, yPie + 1);
    doc.setFont('helvetica', 'normal');
    doc.text(String(v.calificacion || ''), xCalif + 2, yPie);

    return doc.output('blob');
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
