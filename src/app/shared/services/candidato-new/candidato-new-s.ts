import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment.development';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

/** Tipos de carga biométrica soportados por el backend */
type TipoBio = 'firma' | 'huella' | 'foto';

/** Estructura de un documento devuelto por gestión documental */
export interface DocumentInfo {
  id: number;
  title: string;
  owner_id: string;
  contract_number: string | null;
  type: number;
  type_name?: string;
  tags?: number[] | string[];
  file?: string;      // URL interna
  file_url?: string;  // URL pública
  content?: string;
  uploaded_at?: string;
}

/** Respuesta típica de biometría (puede venir objeto o array) */
export interface BiometriaResponse {
  firma?: DocumentInfo | DocumentInfo[] | null;
  huella?: DocumentInfo | DocumentInfo[] | null;
  foto?: DocumentInfo | DocumentInfo[] | null;
  created_at?: string;
  updated_at?: string;
}

/** Filtros para listar biometría */
export interface ListOptions {
  page?: number;
  page_size?: number;
  ordering?: string;     // ej: "-uploaded_at"
  search?: string;       // ej: cédula
}

/** Servicio de candidato/biometría */
@Injectable({ providedIn: 'root' })
export class CandidatoNewS {
  private apiUrl = environment.apiUrl + '/gestion_contratacion';
  private readonly isBrowser: boolean;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  // =========================================================
  // Helpers
  // =========================================================
  /** compone la URL base + path sin dobles barras */
  private url(path: string): string {
    const base = String(this.apiUrl || '').replace(/\/+$/, '');
    const p = String(path || '').replace(/^\/+/, '');
    return `${base}/${p}`;
  }

  /** operador de manejo de errores para usar en .pipe(this.handle$()) */
  private handle$<T>() {
    return (source: Observable<T>) =>
      source.pipe(
        catchError((err: any) => {
          // Centraliza logging/transformación de errores
          console.error('[CandidatoNewS] HTTP error:', err);
          return throwError(() => err);
        })
      );
  }

  // =========================================================
  // BIOMETRÍA (multipart)
  // =========================================================
  /** Upload genérico por tipo (FIRMA | HUELLA | FOTO) */
  uploadBiometria(
    tipo: TipoBio,
    numero_documento: string | number,
    file: File
  ): Observable<DocumentInfo> {
    const fd = new FormData();
    fd.append('numero_documento', String(numero_documento));
    fd.append('file', file);

    // POST /biometria/upload/{tipo}
    return this.http
      .post<DocumentInfo>(this.url(`biometria/upload/${tipo}/`), fd)
      .pipe(this.handle$());
  }

  /** Azúcar sintáctico */
  uploadFirma(numero_documento: string | number, file: File) {
    return this.uploadBiometria('firma', numero_documento, file);
  }
  uploadHuella(numero_documento: string | number, file: File) {
    return this.uploadBiometria('huella', numero_documento, file);
  }
  uploadFoto(numero_documento: string | number, file: File) {
    return this.uploadBiometria('foto', numero_documento, file);
  }

  /** Obtiene la biometría de un candidato por cédula */
  getBiometriaPorCedula(numero_documento: string | number) {
    const safe = encodeURIComponent(String(numero_documento));
    // GET /biometria/<cedula>/
    return this.http
      .get<BiometriaResponse>(this.url(`biometria/${safe}/`))
      .pipe(this.handle$());
  }

  /** Lista biometría (opcionalmente con search=cedula, paginación, etc.) */
  listBiometria(opts?: ListOptions) {
    let params = new HttpParams();
    if (opts?.search) params = params.set('search', String(opts.search));
    if (opts?.page) params = params.set('page', String(opts.page));
    if (opts?.page_size) params = params.set('page_size', String(opts.page_size));
    if (opts?.ordering) params = params.set('ordering', String(opts.ordering));

    // Dependiendo de tu API, puede devolver array o paginado {results, count,...}
    return this.http
      .get<DocumentInfo[] | { results: DocumentInfo[]; count: number }>(
        this.url('biometria'),
        { params }
      )
      .pipe(this.handle$());
  }

  // =========================================================
  // CANDIDATO
  // =========================================================
  /**
   * Versión PATH:
   * GET /candidatos/by-document/<numero_documento>?full=1
   */
  getCandidatoPorDocumento(numeroDocumento: string, full = false) {
    const safe = encodeURIComponent((numeroDocumento ?? '').trim());
    let params = new HttpParams();
    if (full) params = params.set('full', '1');

    return this.http
      .get<any>(this.url(`candidatos/by-document/${safe}`), { params })
      .pipe(this.handle$());
  }
}
