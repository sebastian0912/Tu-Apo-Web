import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../../../../environments/environment.development';
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

    const url = `${this.apiUrl}/gestion_contratacion/candidatos/`;

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
    const url = `${this.apiUrl}/contratacion/subirParte2`;
    return this.http.post(url, datos);
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

    const urlUpsert = `${this.apiUrl}/gestion_contratacion/upsert_forms/`;

    if (!isPlatformBrowser(this.platformId)) {
      return of({
        ok: false,
        created: false,
        candidato_id: 0,
        tipo_doc: String(payload.tipoDoc ?? ''),
        numero_documento: String(payload.numeroCedula ?? ''),
      });
    }

    return this.http.post<CandidatoUpsertResponse>(urlUpsert, upperPayload).pipe(
      map((resp) => resp),
      catchError((err) => {
        const st = err?.status;

        // ✅ fallback automático al endpoint viejo (si upsert aún no está disponible)
        if (st === 404 || st === 405) {
          return this.formulario_vacantes(upperPayload).pipe(
            map((respOld: any) => {
              // Detecta éxito real según tu endpoint viejo (ajusta si tu backend retorna diferente)
              const ok =
                respOld?.ok === true ||
                !!respOld?.message ||
                respOld?.success === true;

              return {
                ok,
                created: !!respOld?.created, // si no existe, queda false
                candidato_id: respOld?.candidato_id ?? respOld?.id ?? 0,
                tipo_doc: String(payload.tipoDoc ?? ''),
                numero_documento: String(payload.numeroCedula ?? ''),
              } as CandidatoUpsertResponse;
            }),
            catchError((err2) => throwError(() => err2))
          );
        }

        return throwError(() => err);
      })
    );
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
