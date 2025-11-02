import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../../../../environments/environment.development';

@Injectable({ providedIn: 'root' })
export class RegistroProcesoContratacion {
  private apiUrl = environment.apiUrl?.replace(/\/$/, '');

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) private platformId: Object) {}

  guardarInfoPersonal(form: any): Observable<any> {
    const payload = this.buildCandidatoPayload(form);
    // ⬇️ MAYÚSCULAS excepto email/correo_electronico y password
    const upperPayload = this.uppercaseDeepExcept(payload, new Set(['email', 'correo_electronico', 'password']));
    const url = `${this.apiUrl}/gestion_contratacion/candidatos/`;

    return this.http.post(url, upperPayload).pipe(
      map((resp) => resp),
      catchError((err) => throwError(() => err))
    );
  }

  crearActualizarCandidato(_form: any): Observable<any> {
    return of({ ok: true });
  }

  // ================== MAPEOS ==================
  private buildCandidatoPayload(f: any) {
    const get = (a: string, b?: string) => (f?.[a] ?? (b ? f?.[b] : undefined));

    const candidatoBase = this.clean({
      tipo_doc:         get('tipo_doc', 'tipoDoc'),
      numero_documento: get('numero_documento', 'numero_de_documento'),
      primer_nombre:    get('primer_nombre', 'primerNombre'),
      segundo_nombre:   get('segundo_nombre', 'segundoNombre'),
      primer_apellido:  get('primer_apellido', 'primerApellido'),
      segundo_apellido: get('segundo_apellido', 'segundoApellido'),
      sexo:             get('sexo', 'genero'),
      fecha_nacimiento: this.toYYYYMMDD(get('fecha_nacimiento', 'fechaNacimiento')),
      estado_civil:     get('estado_civil', 'estadoCivil'),
    });

    const contacto = this.nonEmpty({
      email:    get('correo_electronico'),
      celular:  get('celular', 'numeroCelular'),
      whatsapp: get('whatsapp', 'numeroWhatsapp'),
    });

    const residencia = this.nonEmpty({
      barrio:           get('barrio'),
      hace_cuanto_vive: get('hace_cuanto_vive', 'tiempoResidencia'),
    });

    const personasVive = get('personas_con_quien_convive', 'conQuienViveChecks');
    const vivienda = this.nonEmpty({
      personas_con_quien_convive: Array.isArray(personasVive) ? personasVive.join(', ') : personasVive,
      responsable_hijos: get('cuidadorHijos') ? String(get('cuidadorHijos')) : undefined,
    });

    const info_cc = this.nonEmpty({
      fecha_expedicion: this.toYYYYMMDD(get('fecha_expedicion', 'fechaExpedicion')),
      mpio_expedicion:  get('mpio_expedicion', 'municipioExpedicion'),
      mpio_nacimiento:  get('mpio_nacimiento', 'lugarNacimiento'),
    });

    const experienciaFlores = get('experienciaFlores');
    const tiene_experiencia = typeof experienciaFlores === 'string'
      ? experienciaFlores === 'Sí'
      : !!get('tiene_experiencia');

    let area: string | null =
      get('area_cultivo_poscosecha') ??
      get('area_experiencia') ??
      get('tipoExperienciaFlores') ?? null;

    if (get('tipoExperienciaFlores') === 'OTROS' && get('otroExperiencia')) {
      area = String(get('otroExperiencia'));
    }

    const experiencia_resumen = this.nonEmpty({
      tiene_experiencia,
      area_experiencia:        area,
      area_cultivo_poscosecha: area,
    });

    const formaciones = get('nivel')
      ? [{ nivel: get('nivel'), institucion: null, titulo_obtenido: null, anio_finalizacion: null }]
      : undefined;

    const experienciasSrc = Array.isArray(get('experiencias')) ? get('experiencias') : [];
    const experiencias = experienciasSrc
      .map((e: any) => this.clean({
        empresa:             e?.empresa,
        tiempo_trabajado:    e?.tiempo_trabajado ?? e?.tiempo,
        labores_realizadas:  e?.labores_realizadas ?? e?.labores,
        labores_principales: e?.labores_principales,
      }))
      .filter((e: any) => !!e.empresa);

    const hijosSrc = Array.isArray(get('hijos')) ? get('hijos') : [];
    const hijos = hijosSrc
      .map((h: any) =>
        this.clean({
          numero_de_documento: h?.numero_de_documento ?? h?.numeroDocumento ?? h?.doc,
          fecha_nac: this.toYYYYMMDD(h?.fecha_nac ?? h?.fechaNacimiento),
        })
      )
      .filter((h: any) => !!h.numero_de_documento && !!h.fecha_nac);

    const entrevistas = this.compact([
      this.nonEmpty({
        oficina:                   get('oficina'),
        como_se_proyecta:          get('como_se_proyecta', 'proyeccion1Ano'),
        cuenta_experiencia_flores: tiene_experiencia ? 'SI' : 'NO',
        tipo_experiencia_flores:   area,
      }),
    ]);

    const payload: any = this.clean({
      ...candidatoBase,
      contacto,
      residencia,
      vivienda,
      info_cc,
      experiencia_resumen,
      formaciones,
      experiencias: experiencias.length ? experiencias : undefined,
      hijos: hijos.length ? hijos : undefined,
      entrevistas,
    });

    return payload;
  }

  // ================== HELPERS ==================
  /** Uppercase profundo excepto para claves en skipKeys (case-insensitive). */
  private uppercaseDeepExcept<T>(data: T, skipKeys: Set<string>): T {
    const skip = new Set(Array.from(skipKeys).map(k => k.toLowerCase()));

    const walk = (val: any, keyHint?: string): any => {
      if (val == null) return val;

      // si esta clave debe respetarse, devuelve tal cual el string
      if (typeof val === 'string') {
        if (keyHint && skip.has(keyHint.toLowerCase())) return val;
        return val.toLocaleUpperCase('es-CO');
      }

      if (Array.isArray(val)) {
        return val.map((v) => walk(v));
      }

      if (typeof val === 'object') {
        const out: any = {};
        for (const [k, v] of Object.entries(val)) {
          // pasa el nombre de la clave como pista para decidir si se omite upper
          out[k] = walk(v, k);
        }
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

  /** Devuelve `undefined` si el objeto no tiene claves con valor definido */
  private nonEmpty<T extends object | null | undefined>(obj: T): T | undefined {
    if (!obj || typeof obj !== 'object') return undefined;
    const entries = Object.entries(obj as any).filter(([, v]) => v !== undefined);
    return entries.length ? Object.fromEntries(entries) as any : undefined;
  }

  /** Filtra nulos/undefined del array */
  private compact<T>(arr: (T | null | undefined)[]): T[] {
    return (arr || []).filter(Boolean) as T[];
  }

  /** Asegura formato YYYY-MM-DD para Date|string */
  private toYYYYMMDD(v: any): string | undefined {
    if (!v) return undefined;
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    const s = String(v);
    return s.length > 10 ? s.slice(0, 10) : s;
  }
}
