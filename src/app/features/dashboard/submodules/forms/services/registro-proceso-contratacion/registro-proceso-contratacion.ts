import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../../../../environments/environment';
import { isPlatformBrowser } from '@angular/common';

// =====================
// Tipos Upsert
// =====================
export interface CandidatoUpsertPayload {
  tipoDoc: string;
  tipo_doc?: string;
  numeroCedula: string;
  numero_documento?: string;

  pApellido?: string;
  sApellido?: string;
  pNombre?: string;
  sNombre?: string;
  genero?: string;

  correo?: string;
  numCelular?: string;
  numWha?: string;

  departamento?: string;
  ciudad?: string;
  estadoCivil?: string;

  direccionResidencia?: string;
  barrio?: string;

  fechaExpedicionCc?: string;
  departamentoExpedicionCc?: string;
  municipioExpedicionCc?: string;
  lugarNacimientoDepartamento?: string;
  lugarNacimientoMunicipio?: string;

  rh?: string;
  zurdoDiestro?: string;

  tiempoResidenciaZona?: string;
  lugarAnteriorResidencia?: string;
  razonCambioResidencia?: string;
  zonasConocidas?: string;
  preferenciaResidencia?: string;

  fechaNacimiento?: string;
  estudiaActualmente?: string | boolean;

  familiarEmergencia?: string;
  parentescoFamiliarEmergencia?: string;
  direccionFamiliarEmergencia?: string;
  barrioFamiliarEmergencia?: string;
  telefonoFamiliarEmergencia?: string;
  ocupacionFamiliarEmergencia?: string;

  oficina?: string;

  escolaridad?: string;
  estudiosExtra?: string;
  nombreInstitucion?: string;
  anoFinalizacion?: string; // ISO
  tituloObtenido?: string;

  chaqueta?: string | number;
  pantalon?: string | number;
  camisa?: string | number;
  calzado?: string | number;

  nombreConyugue?: string;
  apellidoConyugue?: string;
  numDocIdentidadConyugue?: string;
  viveConElConyugue?: string;
  direccionConyugue?: string;
  telefonoConyugue?: string;
  barrioMunicipioConyugue?: string;
  ocupacionConyugue?: string;

  nombrePadre?: string;
  vivePadre?: boolean;
  ocupacionPadre?: string;
  direccionPadre?: string;
  telefonoPadre?: string;
  barrioPadre?: string;

  nombreMadre?: string;
  viveMadre?: boolean;
  ocupacionMadre?: string;
  direccionMadre?: string;
  telefonoMadre?: string;
  barrioMadre?: string;

  nombreReferenciaPersonal1?: string;
  telefonoReferenciaPersonal1?: string;
  ocupacionReferenciaPersonal1?: string;
  tiempoConoceReferenciaPersonal1?: string;
  direccionReferenciaPersonal1?: string;

  nombreReferenciaPersonal2?: string;
  telefonoReferenciaPersonal2?: string;
  ocupacionReferenciaPersonal2?: string;
  tiempoConoceReferenciaPersonal2?: string;
  direccionReferenciaPersonal2?: string;

  nombreReferenciaFamiliar1?: string;
  telefonoReferenciaFamiliar1?: string;
  ocupacionReferenciaFamiliar1?: string;
  parentescoReferenciaFamiliar1?: string;
  tiempoConoceReferenciaFamiliar1?: string;
  direccionReferenciaFamiliar1?: string;

  nombreReferenciaFamiliar2?: string;
  telefonoReferenciaFamiliar2?: string;
  ocupacionReferenciaFamiliar2?: string;
  parentescoReferenciaFamiliar2?: string;
  tiempoConoceReferenciaFamiliar2?: string;
  direccionReferenciaFamiliar2?: string;

  nombreExpeLaboral1Empresa?: string;
  direccionEmpresa1?: string;
  telefonosEmpresa1?: string;
  nombreJefeEmpresa1?: string;
  fechaRetiroEmpresa1?: string;
  motivoRetiroEmpresa1?: string;
  cargoEmpresa1?: string;

  empresas_laborado?: string;

  familiaConUnSoloIngreso?: boolean;
  numHabitaciones?: string | number;
  numPersonasPorHabitacion?: string | number;
  tipoVivienda2p?: string;
  caracteristicasVivienda?: string;

  experienciaLaboral?: boolean;

  areaExperiencia?: string;
  areaCultivoPoscosecha?: string;

  laboresRealizadas?: string;
  tiempoExperiencia?: string;

  numHijosDependientes?: number;
  cuidadorHijos?: string;


  fuenteVacante?: string;
  expectativasDeVida?: string;
  servicios?: string;
  tipoVivienda?: string;
  personasConQuienConvive?: string;
  personas_a_cargo?: string;

  hijos?: any[];
}

export interface CandidatoUpsertResponse {
  ok: boolean;
  created: boolean;
  candidato_id: number;
  tipo_doc: string;
  numero_documento: string;
}

@Injectable({ providedIn: 'root' })
export class RegistroProcesoContratacion {
  private apiUrl = environment.apiUrl?.replace(/\/$/, '');

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  /**
   * GET /gestion_contratacion/candidatos/exists/?tipo_doc=CC&numero_documento=123&oficina=SUBA
   * Retorna:
   *  - { exists: false }
   *  - { exists: true, turnos: { oficina, fecha, turno, pendientes_hoy, pendientes_delante, mi_posicion } }
   */
  existsCandidato(tipoDoc: string, numeroDocumento: string, oficina?: string): Observable<any> {
    const tipo = String(tipoDoc ?? '').trim().toUpperCase();
    const numero = String(numeroDocumento ?? '').trim();
    const ofi = String(oficina ?? '').trim();

    if (!tipo || !numero) return of({ exists: false });

    const url = `${this.apiUrl}/gestion_contratacion/candidatos/exists/`;

    const params: any = { tipo_doc: tipo, numero_documento: numero };
    if (ofi) params.oficina = ofi;

    return this.http.get<any>(url, { params }).pipe(
      map((resp: any) => {
        if (typeof resp === 'boolean') return { exists: resp };
        if (resp && typeof resp === 'object') return { exists: !!resp.exists, turnos: resp.turnos ?? null };
        return { exists: false };
      }),
      catchError(() => of({ exists: false })),
    );
  }

  /**
   * ✅ NUEVO: usa el endpoint idempotente del backend
   * POST /gestion_contratacion/candidatos/upsert/
   * - Crea o actualiza sin duplicar.
   */
  crearActualizarCandidato(form: any): Observable<CandidatoUpsertResponse> {
    // Si ya viene con tipoDoc/numeroCedula lo tratamos como payload directo.
    const isPayload = form && typeof form === 'object' &&
      (('tipoDoc' in form && 'numeroCedula' in form) ||
        ('tipo_doc' in form && 'numero_documento' in form));

    const payload = isPayload ? form : this.buildUpsertPayload(form);

    // ⬇️ MAYÚSCULAS excepto correo/email
    const upperPayload = this.uppercaseDeepExcept(payload, new Set(['correo', 'email']));

    // by-document-upsert: es el endpoint de PARIDAD Django en ms-hr (upsert
    // idempotente de candidato + contacto + info_cc + entrevistas + …, lee
    // este mismo payload snake_case). El POST /candidatos/ "pelado" del backend
    // Java es un CRUD JPA genérico en camelCase que NO entiende este payload
    // (y su path exacto sirve el listado con PII, así que además no puede ser
    // público en el gateway).
    const url = `${this.apiUrl}/gestion_contratacion/candidatos/by-document-upsert/`;

    if (!isPlatformBrowser(this.platformId)) {
      return of({
        ok: false,
        created: false,
        candidato_id: 0,
        tipo_doc: String(payload.tipoDoc ?? ''),
        numero_documento: String(payload.numeroCedula ?? ''),
      });
    }

    return this.http.post<CandidatoUpsertResponse>(url, upperPayload).pipe(
      map((resp) => resp),
      catchError((err) => throwError(() => err))
    );
  }


  formulario_vacantes(datos: any): Observable<any> {
    // En el backend Java vive bajo /gestion_contratacion (el prefijo
    // /contratacion solo conserva 8 GETs de lectura del contrato viejo).
    const url = `${this.apiUrl}/gestion_contratacion/subirParte2`;
    // El endpoint Java lee `cedula`; varios llamadores mandan numeroCedula.
    const body: any = { ...datos };
    if (body.cedula == null) body.cedula = body.numeroCedula ?? body.numero_documento ?? null;
    return this.http.post(url, body);
  }

  /**
   * ✅ NUEVO: crear o actualizar (idempotente)
   * - Intenta primero: /gestion_contratacion/upsert_forms/
   * - Si el backend responde 404/405, hace fallback a: /contratacion/subirParte2
   *
   * IMPORTANTE:
   * - Uppercase profundo EXCEPTO correo.
   * - En fallback, normaliza ok según la respuesta real.
   */
  crearActualizarCandidato2(formOrPayload: any): Observable<CandidatoUpsertResponse> {
    // Si ya viene con tipoDoc/numeroCedula lo tratamos como payload directo.
    const isPayload =
      formOrPayload &&
      typeof formOrPayload === 'object' &&
      ('tipoDoc' in formOrPayload) &&
      ('numeroCedula' in formOrPayload);

    const payload = isPayload ? (formOrPayload as CandidatoUpsertPayload) : this.buildUpsertPayload(formOrPayload);

    // Normaliza correo siempre a minúscula
    if (payload?.correo != null) {
      payload.correo = String(payload.correo).trim().toLowerCase();
    }

    // ⬇️ MAYÚSCULAS excepto correo
    const upperPayload = this.uppercaseDeepExcept(payload, new Set(['correo']));

    // El guardado FINAL viaja al mismo endpoint de paridad del paso 1
    // (by-document-upsert): es el único del backend Java que persiste el
    // grueso del formulario (contacto, residencia, info_cc, vivienda,
    // evaluación, entrevista, formaciones, referencias familiares).
    // /upsert_forms/ solo guardaba nombres y NO entiende `numeroCedula`
    // — de ahí el "tipo_doc y numero_documento requeridos" al finalizar.
    const body = this.aCuerpoByDocumentUpsert(upperPayload);
    // RF-025/032: propaga el estado del preregistro (último paso guardado / finalizado).
    if ((payload as any).formulario_paso != null) body.formulario_paso = (payload as any).formulario_paso;
    if ((payload as any).formulario_completo != null) body.formulario_completo = (payload as any).formulario_completo;
    const urlUpsert = `${this.apiUrl}/gestion_contratacion/candidatos/by-document-upsert/`;

    if (!isPlatformBrowser(this.platformId)) {
      return of({
        ok: false,
        created: false,
        candidato_id: 0,
        tipo_doc: String(payload.tipoDoc ?? ''),
        numero_documento: String(payload.numeroCedula ?? ''),
      });
    }

    return this.http.post<any>(urlUpsert, body).pipe(
      map((resp: any) => ({
        ok: resp?.ok === true,
        created: !!resp?.created,
        candidato_id: resp?.id ?? resp?.candidato_id ?? 0,
        tipo_doc: String(payload.tipoDoc ?? ''),
        numero_documento: String(resp?.numero_documento ?? payload.numeroCedula ?? ''),
      }) as CandidatoUpsertResponse),
      catchError((err) => throwError(() => err))
    );
  }

  /**
   * Traduce el payload plano estilo Django (tipoDoc, numCelular, …) al cuerpo
   * anidado snake_case que persiste `by-document-upsert` en ms-hr
   * (CandidatoFormUpsertService). PARIDAD COMPLETA: todo dato de negocio que
   * el formulario pide tiene su clave aquí; si agregas un campo al formulario,
   * agrégalo también a este cuerpo o no se guardará.
   */
  private aCuerpoByDocumentUpsert(p: any): any {
    const si = (v: any) => v === true || v === 'SI';
    const anio = (ymd: any) => {
      const m = /^(\d{4})/.exec(String(ymd ?? ''));
      return m ? Number(m[1]) : undefined;
    };
    const ref = (nombre: any, telefono: any, ocupacion: any, direccion: any, extra: any) =>
      nombre ? this.clean({ nombre, telefono, ocupacion, direccion, ...extra }) : null;

    return this.clean({
      tipo_doc: p.tipoDoc ?? p.tipo_doc,
      numero_documento: p.numeroCedula ?? p.numero_documento,
      primer_nombre: p.pNombre,
      segundo_nombre: p.sNombre,
      primer_apellido: p.pApellido,
      segundo_apellido: p.sApellido,
      sexo: p.genero,
      estado_civil: p.estadoCivil,
      fecha_nacimiento: p.fechaNacimiento,
      // Atributos personales que viven en el propio Candidato (modelo Django):
      rh: p.rh,
      zurdo_diestro: p.zurdoDiestro,
      departamento: p.departamento,
      municipio: p.ciudad,
      contacto: { email: p.correo, celular: p.numCelular, whatsapp: p.numWha },
      residencia: {
        direccion: p.direccionResidencia,
        barrio: p.barrio,
        hace_cuanto_vive: p.tiempoResidenciaZona,
        lugar_anterior: p.lugarAnteriorResidencia,
        razon_mudanza: p.razonCambioResidencia,
        zonas_del_pais: p.zonasConocidas,
        // RF-032: residencia anterior estructurada. Siempre viaja (?? '') para que el backend la
        // LIMPIE con "" cuando el tiempo es "TODO LA VIDA" (containsKey en el servicio Java).
        residencia_anterior_departamento: p.departamentoResidenciaAnterior ?? '',
        residencia_anterior_municipio: p.municipioResidenciaAnterior ?? '',
        residencia_anterior_direccion: p.direccionResidenciaAnterior ?? '',
        residencia_anterior_barrio: p.barrioResidenciaAnterior ?? '',
      },
      vivienda: {
        personas_con_quien_convive: p.personasConQuienConvive,
        responsable_hijos: p.cuidadorHijos,
        estudia_actualmente: si(p.estudiaActualmente),
        familia_un_solo_ingreso: si(p.familiaConUnSoloIngreso),
        tipo_vivienda: p.tipoVivienda,
        num_habitaciones: p.numHabitaciones,
        personas_por_habitacion: p.numPersonasPorHabitacion,
        caracteristicas_vivienda: p.caracteristicasVivienda,
        servicios: p.servicios,
        num_hijos_dependen_economicamente: p.numHijosDependientes,
        expectativas_de_vida: p.expectativasDeVida,
      },
      info_cc: {
        fecha_expedicion: p.fechaExpedicionCc,
        depto_expedicion: p.departamentoExpedicionCc,
        mpio_expedicion: p.municipioExpedicionCc,
        depto_nacimiento: p.lugarNacimientoDepartamento,
        mpio_nacimiento: p.lugarNacimientoMunicipio,
      },
      // Tallas de dotación (el catálogo es numérico: "4".."44").
      dotacion: {
        chaqueta: p.chaqueta, pantalon: p.pantalon, camisa: p.camisa, calzado: p.calzado,
      },
      experiencia_resumen: {
        tiene_experiencia: si(p.experienciaLaboral),
        area_experiencia: p.areaExperiencia,
        tiempo_experiencia_texto: p.tiempoExperiencia,
        empresas_laborado: p.empresas_laborado,
      },
      evaluacion: {
        relacion_familiar: p.relacion_familiar,
        rendimiento_laboral: p.rendimiento_laboral,
        porque_lo_felicitarian: p.porque_lo_felicitarian,
        malentendido: p.malentendido,
        actividades_diarias: p.actividades_diarias,
        personas_a_cargo: p.personas_a_cargo,
      },
      entrevistas: [{
        oficina: p.oficina,
        como_se_entero: p.fuenteVacante,
        como_se_proyecta: p.expectativasDeVida,
      }],
      formaciones: p.escolaridad ? [this.clean({
        nivel: p.escolaridad,
        institucion: p.nombreInstitucion,
        titulo_obtenido: p.tituloObtenido,
        anio_finalizacion: anio(p.anoFinalizacion),
        estudios_extra: p.estudiosExtra,
      })] : undefined,
      // Empresa anterior (una sola en el formulario; el backend la modela 1:N).
      experiencias: p.nombreExpeLaboral1Empresa ? [this.clean({
        empresa: p.nombreExpeLaboral1Empresa,
        tiempo_trabajado: p.tiempoExperiencia,
        telefonos: p.telefonosEmpresa1,           // teléfono de la EMPRESA
        direccion: p.direccionEmpresa1,
        // RF-036/044: territorio estructurado de la empresa.
        departamento: p.departamentoEmpresa1,
        municipio: p.municipioEmpresa1,
        barrio: p.barrioEmpresa1,
        // RF-043: datos del jefe/referencia, separados de la empresa.
        nombre_jefe: p.nombreJefeEmpresa1,        // legacy derivado
        jefe_primer_nombre: p.jefePrimerNombre1,
        jefe_primer_apellido: p.jefePrimerApellido1,
        cargo_jefe: p.cargoJefe1,                 // cargo del JEFE
        telefono_jefe: p.telefonoJefe1,           // teléfono del JEFE/referencia
        cargo: p.cargoEmpresa1,                   // cargo del CANDIDATO
        fecha_retiro: p.fechaRetiroEmpresa1,
        motivo_retiro: p.motivoRetiroEmpresa1,
      })] : undefined,
      // Hijos: claves canónicas del backend (clave_front → clave DTO).
      hijos: (p.hijos || []).map((h: any) => this.clean({
        nombre: h.nombreHijo,
        // RF-045: nombres estructurados del dependiente.
        primer_nombre: h.hijoPrimerNombre,
        segundo_nombre: h.hijoSegundoNombre,
        primer_apellido: h.hijoPrimerApellido,
        segundo_apellido: h.hijoSegundoApellido,
        sexo: h.sexoHijo,
        fecha_nac: h.fechaNacimientoHijo,
        // RF-046: tipo de documento del dependiente.
        tipo_documento: h.tipoDocHijo,
        numero_de_documento: h.docIdentidadHijo,
        ocupacion: h.ocupacionHijo,
        curso: h.cursoHijo,
      })),
      // Familiares: una fila por tipo en el backend (FamiliarContacto).
      conyuge: (p.nombreConyugue || p.numDocIdentidadConyugue) ? this.clean({
        nombre: p.nombreConyugue,
        apellido: p.apellidoConyugue,
        numero_de_documento: p.numDocIdentidadConyugue,
        vive_con: p.viveConElConyugue,
        direccion: p.direccionConyugue,
        barrio: p.barrioMunicipioConyugue,
        telefono: p.telefonoConyugue,
        ocupacion: p.ocupacion_conyugue,
      }) : undefined,
      padre: p.vivePadre ? this.clean({
        nombre: p.nombrePadre,
        // RF-040: nombre del padre en componentes.
        primer_nombre: p.padrePrimerNombre,
        segundo_nombre: p.padreSegundoNombre,
        primer_apellido: p.padrePrimerApellido,
        segundo_apellido: p.padreSegundoApellido,
        vive_con: p.vivePadre, // VIVE | NO VIVE | NO LO CONOCE (semántica del legacy)
        ocupacion: p.ocupacionPadre,
        direccion: p.direccionPadre,
        telefono: p.telefonoPadre,
        barrio: p.barrioPadre,
      }) : undefined,
      madre: p.viveMadre ? this.clean({
        nombre: p.nombreMadre,
        // RF-040: nombre de la madre en componentes.
        primer_nombre: p.madrePrimerNombre,
        segundo_nombre: p.madreSegundoNombre,
        primer_apellido: p.madrePrimerApellido,
        segundo_apellido: p.madreSegundoApellido,
        vive_con: p.viveMadre,
        ocupacion: p.ocupacionMadre,
        direccion: p.direccionMadre,
        telefono: p.telefonoMadre,
        barrio: p.barrioMadre,
      }) : undefined,
      emergencia: (p.emergenciaPrimerNombre || p.familiarEmergencia) ? this.clean({
        // RF-033: componentes separados + derivados nombre/apellido (compat legacy).
        primer_nombre: p.emergenciaPrimerNombre,
        segundo_nombre: p.emergenciaSegundoNombre,
        primer_apellido: p.emergenciaPrimerApellido,
        segundo_apellido: p.emergenciaSegundoApellido,
        nombre: p.familiarEmergencia,
        apellido: [p.emergenciaPrimerApellido, p.emergenciaSegundoApellido].filter((x: any) => x).join(' ').trim() || undefined,
        parentesco: p.parentescoFamiliarEmergencia,
        telefono: p.telefonoFamiliarEmergencia,
        ocupacion: p.ocupacionFamiliarEmergencia,
        // RF-035: ubicación territorial del contacto.
        departamento: p.departamentoEmergencia,
        municipio: p.municipioEmergencia,
        barrio: p.barrioFamiliarEmergencia,
        direccion: p.direccionFamiliarEmergencia,
      }) : undefined,
      referencias_personales: [
        // El parentesco también viaja en las PERSONALES (p. ej. AMIGO(A)): la
        // entrevista de Selección en TesoroApp (form-entrevista) lo precarga
        // desde acá y quedaba siempre vacío.
        // RF-040: nombre de la referencia en componentes (primer/segundo nombre y apellido).
        ref(p.nombreReferenciaPersonal1, p.telefonoReferenciaPersonal1, p.ocupacionReferenciaPersonal1,
            p.direccionReferenciaPersonal1, { tiempo_conoce: p.tiempoConoceReferenciaPersonal1, parentesco: p.parentescoReferenciaPersonal1,
              primer_nombre: p.refPersonal1PrimerNombre, segundo_nombre: p.refPersonal1SegundoNombre, primer_apellido: p.refPersonal1PrimerApellido, segundo_apellido: p.refPersonal1SegundoApellido }),
        ref(p.nombreReferenciaPersonal2, p.telefonoReferenciaPersonal2, p.ocupacionReferenciaPersonal2,
            p.direccionReferenciaPersonal2, { tiempo_conoce: p.tiempoConoceReferenciaPersonal2, parentesco: p.parentescoReferenciaPersonal2,
              primer_nombre: p.refPersonal2PrimerNombre, segundo_nombre: p.refPersonal2SegundoNombre, primer_apellido: p.refPersonal2PrimerApellido, segundo_apellido: p.refPersonal2SegundoApellido }),
      ].filter(Boolean),
      referencias_familiares: [
        ref(p.nombreReferenciaFamiliar1, p.telefonoReferenciaFamiliar1, p.ocupacionReferenciaFamiliar1,
            p.direccionReferenciaFamiliar1, { parentesco: p.parentescoReferenciaFamiliar1,
              primer_nombre: p.refFamiliar1PrimerNombre, segundo_nombre: p.refFamiliar1SegundoNombre, primer_apellido: p.refFamiliar1PrimerApellido, segundo_apellido: p.refFamiliar1SegundoApellido }),
        ref(p.nombreReferenciaFamiliar2, p.telefonoReferenciaFamiliar2, p.ocupacionReferenciaFamiliar2,
            p.direccionReferenciaFamiliar2, { parentesco: p.parentescoReferenciaFamiliar2,
              primer_nombre: p.refFamiliar2PrimerNombre, segundo_nombre: p.refFamiliar2SegundoNombre, primer_apellido: p.refFamiliar2PrimerApellido, segundo_apellido: p.refFamiliar2SegundoApellido }),
      ].filter(Boolean),
    });
  }

  /**
   * ✅ Mantengo tu método (por si todavía lo llamas desde algún lado),
   * pero ahora delega al upsert para no duplicar.
   */
  guardarInfoPersonal(form: any): Observable<CandidatoUpsertResponse> {
    return this.crearActualizarCandidato(form);
  }

  // ================== MAPEOS (FORM -> UpsertPayload) ==================
  private buildUpsertPayload(f: any): CandidatoUpsertPayload {
    const get = (a: string, b?: string) => (f?.[a] ?? (b ? f?.[b] : undefined));

    const payload: CandidatoUpsertPayload = this.clean({
      // identidad
      tipoDoc: String(get('tipoDoc', 'tipo_doc') ?? '').trim().toUpperCase(),
      tipo_doc: String(get('tipoDoc', 'tipo_doc') ?? '').trim().toUpperCase(),
      numeroCedula: String(get('numeroCedula', 'numero_documento') ?? '').trim(),
      numero_documento: String(get('numeroCedula', 'numero_documento') ?? '').trim(),

      // nombres
      pApellido: get('pApellido', 'primer_apellido'),
      sApellido: get('sApellido', 'segundo_apellido'),
      pNombre: get('pNombre', 'primer_nombre'),
      sNombre: get('sNombre', 'segundo_nombre'),
      genero: get('genero', 'sexo'),

      // contacto
      correo: get('correo', 'correo_electronico'),
      numCelular: get('numCelular', 'celular'),
      numWha: get('numWha', 'whatsapp'),

      // ubicación
      departamento: get('departamento'),
      ciudad: get('ciudad', 'municipio'),
      estadoCivil: get('estadoCivil', 'estado_civil'),

      // residencia
      direccionResidencia: get('direccionResidencia', 'direccion'),
      barrio: get('barrio'),
      tiempoResidenciaZona: get('tiempoResidenciaZona', 'hace_cuanto_vive'),
      lugarAnteriorResidencia: get('lugarAnteriorResidencia', 'lugar_anterior'),
      razonCambioResidencia: get('razonCambioResidencia', 'razon_mudanza'),
      zonasConocidas: get('zonasConocidas', 'zonas_del_pais'),
      preferenciaResidencia: get('preferenciaResidencia', 'donde_le_gustaria_vivir'),

      // cc
      fechaExpedicionCc: this.toYYYYMMDD(get('fechaExpedicionCc', 'fecha_expedicion')),
      departamentoExpedicionCc: get('departamentoExpedicionCc', 'depto_expedicion'),
      municipioExpedicionCc: get('municipioExpedicionCc', 'mpio_expedicion'),
      lugarNacimientoDepartamento: get('lugarNacimientoDepartamento', 'depto_nacimiento'),
      lugarNacimientoMunicipio: get('lugarNacimientoMunicipio', 'mpio_nacimiento'),

      rh: get('rh'),
      zurdoDiestro: get('zurdoDiestro', 'zurdo_diestro'),

      // fecha nacimiento
      fechaNacimiento: this.toYYYYMMDD(get('fechaNacimiento', 'fecha_nacimiento')),

      // vivienda
      familiaConUnSoloIngreso: get('familiaConUnSoloIngreso', 'familia_un_solo_ingreso'),
      numHabitaciones: get('numHabitaciones', 'num_habitaciones'),
      numPersonasPorHabitacion: get('numPersonasPorHabitacion', 'personas_por_habitacion'),
      tipoVivienda: get('tipoVivienda', 'tipo_vivienda'),
      caracteristicasVivienda: get('caracteristicasVivienda', 'caracteristicas_vivienda'),
      servicios: get('servicios'),
      estudiaActualmente: get('estudiaActualmente', 'estudia_actualmente'),
      cuidadorHijos: get('cuidadorHijos', 'responsable_hijos'),
      personasConQuienConvive: get('personasConQuienConvive', 'personas_con_quien_convive'),
      expectativasDeVida: get('expectativasDeVida', 'expectativas_de_vida'),
      numHijosDependientes: get('numHijosDependientes', 'num_hijos_dependen_economicamente'),

      // oficina / vacante
      oficina: get('oficina'),
      fuenteVacante: get('fuenteVacante', 'como_se_entero'),

      // formación
      escolaridad: get('escolaridad', 'nivel'),
      nombreInstitucion: get('nombreInstitucion', 'institucion'),
      tituloObtenido: get('tituloObtenido', 'titulo_obtenido'),
      anoFinalizacion: get('anoFinalizacion', 'anio_finalizacion'),
      estudiosExtra: get('estudiosExtra'),

      // dotación
      chaqueta: get('chaqueta'),
      pantalon: get('pantalon'),
      camisa: get('camisa'),
      calzado: get('calzado'),

      // experiencia
      experienciaLaboral: get('experienciaLaboral', 'tiene_experiencia'),
      areaExperiencia: get('areaExperiencia', 'area_experiencia'),
      tiempoExperiencia: get('tiempoExperiencia'),

      // evaluación
      personas_a_cargo: get('personas_a_cargo'),

      // familiar emergencia
      familiarEmergencia: get('familiarEmergencia'),
      parentescoFamiliarEmergencia: get('parentescoFamiliarEmergencia'),
      direccionFamiliarEmergencia: get('direccionFamiliarEmergencia'),
      barrioFamiliarEmergencia: get('barrioFamiliarEmergencia'),
      telefonoFamiliarEmergencia: get('telefonoFamiliarEmergencia'),
      ocupacionFamiliarEmergencia: get('ocupacionFamiliarEmergencia'),

      // conyugue
      nombreConyugue: get('nombreConyugue'),
      apellidoConyugue: get('apellidoConyugue'),
      numDocIdentidadConyugue: get('numDocIdentidadConyugue'),
      viveConElConyugue: get('viveConElConyugue'),
      direccionConyugue: get('direccionConyugue'),
      telefonoConyugue: get('telefonoConyugue'),
      barrioMunicipioConyugue: get('barrioMunicipioConyugue'),
      ocupacionConyugue: get('ocupacionConyugue'),

      // padre
      nombrePadre: get('nombrePadre'),
      vivePadre: get('vivePadre'),
      ocupacionPadre: get('ocupacionPadre'),
      direccionPadre: get('direccionPadre'),
      telefonoPadre: get('telefonoPadre'),
      barrioPadre: get('barrioPadre'),

      // madre
      nombreMadre: get('nombreMadre'),
      viveMadre: get('viveMadre'),
      ocupacionMadre: get('ocupacionMadre'),
      direccionMadre: get('direccionMadre'),
      telefonoMadre: get('telefonoMadre'),
      barrioMadre: get('barrioMadre'),

      // referencias
      nombreReferenciaPersonal1: get('nombreReferenciaPersonal1'),
      telefonoReferenciaPersonal1: get('telefonoReferenciaPersonal1'),
      ocupacionReferenciaPersonal1: get('ocupacionReferenciaPersonal1'),
      tiempoConoceReferenciaPersonal1: get('tiempoConoceReferenciaPersonal1'),
      direccionReferenciaPersonal1: get('direccionReferenciaPersonal1'),

      nombreReferenciaPersonal2: get('nombreReferenciaPersonal2'),
      telefonoReferenciaPersonal2: get('telefonoReferenciaPersonal2'),
      ocupacionReferenciaPersonal2: get('ocupacionReferenciaPersonal2'),
      tiempoConoceReferenciaPersonal2: get('tiempoConoceReferenciaPersonal2'),
      direccionReferenciaPersonal2: get('direccionReferenciaPersonal2'),

      nombreReferenciaFamiliar1: get('nombreReferenciaFamiliar1'),
      telefonoReferenciaFamiliar1: get('telefonoReferenciaFamiliar1'),
      ocupacionReferenciaFamiliar1: get('ocupacionReferenciaFamiliar1'),
      parentescoReferenciaFamiliar1: get('parentescoReferenciaFamiliar1'),
      tiempoConoceReferenciaFamiliar1: get('tiempoConoceReferenciaFamiliar1'),
      direccionReferenciaFamiliar1: get('direccionReferenciaFamiliar1'),

      nombreReferenciaFamiliar2: get('nombreReferenciaFamiliar2'),
      telefonoReferenciaFamiliar2: get('telefonoReferenciaFamiliar2'),
      ocupacionReferenciaFamiliar2: get('ocupacionReferenciaFamiliar2'),
      parentescoReferenciaFamiliar2: get('parentescoReferenciaFamiliar2'),
      tiempoConoceReferenciaFamiliar2: get('tiempoConoceReferenciaFamiliar2'),
      direccionReferenciaFamiliar2: get('direccionReferenciaFamiliar2'),

      // experiencia laboral 1
      nombreExpeLaboral1Empresa: get('nombreExpeLaboral1Empresa'),
      direccionEmpresa1: get('direccionEmpresa1'),
      telefonosEmpresa1: get('telefonosEmpresa1'),
      nombreJefeEmpresa1: get('nombreJefeEmpresa1'),
      fechaRetiroEmpresa1: this.toYYYYMMDD(get('fechaRetiroEmpresa1')),
      motivoRetiroEmpresa1: get('motivoRetiroEmpresa1'),
      cargoEmpresa1: get('cargoEmpresa1'),

      // legacy extra
      empresas_laborado: get('empresas_laborado'),
    });

    return payload;
  }

  // ================== HELPERS ==================
  /** Uppercase profundo excepto para claves en skipKeys (case-insensitive). */
  private uppercaseDeepExcept<T>(data: T, skipKeys: Set<string>): T {
    const skip = new Set(Array.from(skipKeys).map(k => k.toLowerCase()));

    const walk = (val: any, keyHint?: string): any => {
      if (val == null) return val;

      if (typeof val === 'string') {
        if (keyHint && skip.has(keyHint.toLowerCase())) return val;
        return val.toLocaleUpperCase('es-CO');
      }

      if (Array.isArray(val)) return val.map((v) => walk(v));

      if (typeof val === 'object') {
        const out: any = {};
        for (const [k, v] of Object.entries(val)) out[k] = walk(v, k);
        return out;
      }

      return val;
    };

    return walk(data) as T;
  }

  /** Devuelve una copia sin claves con `undefined` */
  private clean<T extends object>(obj: T): T {
    const out: any = Array.isArray(obj) ? [] : {};
    Object.entries(obj as any).forEach(([k, v]) => {
      if (v === undefined) return;
      out[k] = v;
    });
    return out as T;
  }

  /** Asegura formato YYYY-MM-DD para Date|string */
  private toYYYYMMDD(v: any): string | undefined {
    if (!v) return undefined;
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    const s = String(v);
    return s.length > 10 ? s.slice(0, 10) : s;
  }
}
