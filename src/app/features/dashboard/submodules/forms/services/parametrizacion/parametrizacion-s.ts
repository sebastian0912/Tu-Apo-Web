import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../../../../../environments/environment.development';

export type BoolLike = boolean | 'true' | 'false' | '1' | '0' | undefined | null;

// --------------------
// Tipos de respuesta
// --------------------
export interface MetaTabla {
  id: string;
  codigo: string;
  descripcion?: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
  // si tu serializer incluye campos, los verás acá
  campos?: MetaCampo[];
}

export interface MetaCampo {
  id: string;
  tabla: string; // UUID o ref según serializer
  campo: string;
  tipo: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'JSON' | 'ENUM';
  obligatorio: boolean;
  visible: boolean;
  orden: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface MetaValor {
  id: string;
  tabla: string; // UUID o ref según serializer
  datos: Record<string, any>;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface BulkValoresResponse {
  results: Record<string, MetaValor[]>;
  counts: Record<string, number>;
  missing: string[];
}

// Respuesta del endpoint /meta/tablas/masivas/
export interface MasivasResponse {
  codes: string[];
  results: Record<string, MetaValor[]>;
  counts: Record<string, number>;
  missing: string[];
}

@Injectable({ providedIn: 'root' })
export class ParametrizacionS {
  private apiUrl = (environment.apiUrl || '').replace(/\/$/, '');
  private base = `${this.apiUrl}/gestion_catalogos`;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  // --------------------
  // Utils (inline)
  // --------------------
  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private toBoolParam(v: BoolLike): string | undefined {
    if (v === undefined || v === null) return undefined;
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    const s = String(v).trim().toLowerCase();
    if (s === 'true' || s === 'false' || s === '1' || s === '0') return s;
    return undefined;
  }

  private safe<T>(fallback: T) {
    return (err: any) => of(fallback);
  }

  // --------------------
  // META TABLAS
  // --------------------

  /** GET /gestion_catalogos/meta/tablas/?ordering=codigo */
  listarTablas(ordering: 'codigo' | '-codigo' | 'created_at' | '-created_at' | 'updated_at' | '-updated_at' = 'codigo'): Observable<MetaTabla[]> {
    const url = `${this.base}/meta/tablas/`;

    if (!this.isBrowser()) return of([]);

    const params = new HttpParams().set('ordering', ordering);
    return this.http.get<any>(url, { params }).pipe(
      map((resp) => {
        // DRF puede devolver paginado o lista
        if (Array.isArray(resp)) return resp as MetaTabla[];
        if (resp && Array.isArray(resp.results)) return resp.results as MetaTabla[];
        return [];
      }),
      catchError(this.safe<MetaTabla[]>([]))
    );
  }

  /** GET /gestion_catalogos/meta/tablas/{codigo}/ */
  obtenerTabla(codigo: string): Observable<MetaTabla | null> {
    const code = String(codigo || '').trim();
    const url = `${this.base}/meta/tablas/${encodeURIComponent(code)}/`;

    if (!this.isBrowser() || !code) return of(null);

    return this.http.get<MetaTabla>(url).pipe(
      catchError(this.safe<MetaTabla | null>(null))
    );
  }

  /** GET /gestion_catalogos/meta/tablas/{codigo}/valores/?activo=true|false */
  valoresPorTabla(codigo: string, activo?: BoolLike): Observable<MetaValor[]> {
    const code = String(codigo || '').trim();
    const url = `${this.base}/meta/tablas/${encodeURIComponent(code)}/valores/`;

    if (!this.isBrowser() || !code) return of([]);

    let params = new HttpParams();
    const a = this.toBoolParam(activo);
    if (a !== undefined) params = params.set('activo', a);

    return this.http.get<any>(url, { params }).pipe(
      map((resp) => {
        if (Array.isArray(resp)) return resp as MetaValor[];
        if (resp && Array.isArray(resp.results)) return resp.results as MetaValor[];
        return [];
      }),
      catchError(this.safe<MetaValor[]>([]))
    );
  }

  /**
   * ✅ GET /gestion_catalogos/meta/tablas/masivas/?activo_tabla=true&activo_valor=true
   * (devuelve codes + results agrupado)
   */
  obtenerMasivas(activoTabla: BoolLike = true, activoValor?: BoolLike): Observable<MasivasResponse> {
    const url = `${this.base}/meta/tablas/masivas/`;

    if (!this.isBrowser()) {
      return of({ codes: [], results: {}, counts: {}, missing: [] });
    }

    let params = new HttpParams();
    const at = this.toBoolParam(activoTabla);
    const av = this.toBoolParam(activoValor);

    if (at !== undefined) params = params.set('activo_tabla', at);
    if (av !== undefined) params = params.set('activo_valor', av);

    return this.http.get<MasivasResponse>(url, { params }).pipe(
      map((resp: any) => ({
        codes: Array.isArray(resp?.codes) ? resp.codes : [],
        results: resp?.results ?? {},
        counts: resp?.counts ?? {},
        missing: Array.isArray(resp?.missing) ? resp.missing : [],
      })),
      catchError(this.safe<MasivasResponse>({ codes: [], results: {}, counts: {}, missing: [] }))
    );
  }

  // --------------------
  // META CAMPOS
  // --------------------

  /** GET /gestion_catalogos/meta/campos/?tabla=AFILIADO&activo=true */
  listarCampos(tabla?: string, activo?: BoolLike): Observable<MetaCampo[]> {
    const url = `${this.base}/meta/campos/`;

    if (!this.isBrowser()) return of([]);

    let params = new HttpParams();
    const t = String(tabla || '').trim();
    if (t) params = params.set('tabla', t);

    const a = this.toBoolParam(activo);
    if (a !== undefined) params = params.set('activo', a);

    return this.http.get<any>(url, { params }).pipe(
      map((resp) => {
        if (Array.isArray(resp)) return resp as MetaCampo[];
        if (resp && Array.isArray(resp.results)) return resp.results as MetaCampo[];
        return [];
      }),
      catchError(this.safe<MetaCampo[]>([]))
    );
  }

  // --------------------
  // META VALORES
  // --------------------

  /** GET /gestion_catalogos/meta/valores/?tabla=AFILIADO&activo=true */
  listarValores(tabla?: string, activo?: BoolLike): Observable<MetaValor[]> {
    const url = `${this.base}/meta/valores/`;

    if (!this.isBrowser()) return of([]);

    let params = new HttpParams();
    const t = String(tabla || '').trim();
    if (t) params = params.set('tabla', t);

    const a = this.toBoolParam(activo);
    if (a !== undefined) params = params.set('activo', a);

    return this.http.get<any>(url, { params }).pipe(
      map((resp) => {
        if (Array.isArray(resp)) return resp as MetaValor[];
        if (resp && Array.isArray(resp.results)) return resp.results as MetaValor[];
        return [];
      }),
      catchError(this.safe<MetaValor[]>([]))
    );
  }

  /**
   * ✅ BULK (GET o POST)
   * GET  /gestion_catalogos/meta/valores/bulk/?tablas=A,B,C&activo=true
   * POST /gestion_catalogos/meta/valores/bulk/ body: { tablas: ["A","B"], activo: true }
   */
  bulkValores(tablas: string[], activo?: BoolLike): Observable<BulkValoresResponse> {
    const url = `${this.base}/meta/valores/bulk/`;

    const codes = (tablas || []).map(t => String(t || '').trim()).filter(Boolean);

    if (!this.isBrowser() || !codes.length) {
      return of({ results: {}, counts: {}, missing: codes });
    }

    const a = this.toBoolParam(activo);

    // POST recomendado (no te limita por tamaño de URL)
    const body: any = { tablas: codes };
    if (a !== undefined) body.activo = (a === 'true' || a === '1');

    return this.http.post<BulkValoresResponse>(url, body).pipe(
      map((resp: any) => ({
        results: resp?.results ?? {},
        counts: resp?.counts ?? {},
        missing: Array.isArray(resp?.missing) ? resp.missing : [],
      })),
      catchError(this.safe<BulkValoresResponse>({ results: {}, counts: {}, missing: codes }))
    );
  }

  // --------------------
  // CRUD básico (opcional)
  // --------------------

  /** POST /meta/valores/ */
  crearValor(tablaCodigo: string, datos: Record<string, any>, activo: boolean = true): Observable<MetaValor> {
    const url = `${this.base}/meta/valores/`;
    if (!this.isBrowser()) return throwError(() => new Error('SSR: no permitido'));

    const payload = { tabla: tablaCodigo, datos, activo };
    return this.http.post<MetaValor>(url, payload).pipe(
      catchError((err) => throwError(() => err))
    );
  }

  /** PATCH /meta/valores/{id}/ */
  actualizarValor(id: string, patch: Partial<Pick<MetaValor, 'datos' | 'activo'>>): Observable<MetaValor> {
    const url = `${this.base}/meta/valores/${encodeURIComponent(id)}/`;
    if (!this.isBrowser()) return throwError(() => new Error('SSR: no permitido'));

    return this.http.patch<MetaValor>(url, patch).pipe(
      catchError((err) => throwError(() => err))
    );
  }

  /** DELETE /meta/valores/{id}/ */
  eliminarValor(id: string): Observable<void> {
    const url = `${this.base}/meta/valores/${encodeURIComponent(id)}/`;
    if (!this.isBrowser()) return throwError(() => new Error('SSR: no permitido'));

    return this.http.delete<void>(url).pipe(
      catchError((err) => throwError(() => err))
    );
  }
}
