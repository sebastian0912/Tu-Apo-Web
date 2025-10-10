import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { environment } from '../../../../environments/environment.development';
import { Observable } from 'rxjs/internal/Observable';
import { HttpClient } from '@angular/common/http';
import { map, catchError } from 'rxjs';

export interface UploadFotoResponse {
  ok: boolean;
  id: number;
}

@Injectable({
  providedIn: 'root'
})
export class CandidateS {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) private platformId: Object) { }

  private handleError(error: any): Observable<never> {
    throw error;
  }

  // Buscar en contratacion por cedula para sacar los numeros
  public buscarEncontratacion(cedula: any): Observable<any> {
    return this.http.get(`${this.apiUrl}/contratacion/traerNombreCompletoCandidatoSin/${cedula}`, {}).pipe(
      map((response: any) => response),
      catchError(this.handleError)
    );
  }

  buscarCandidatoPorCedula(cedula: string): Observable<any> {
    const url = `${this.apiUrl}/contratacion/buscarCandidato/${cedula}`;
    return this.http.get(url);
  }

  // validar-correo-cedula/
  public validarCorreoCedula(correo: string, cedula: string): Observable<any> {
    const params = { cedula, correo };  // Asegurarse de que están en el orden correcto

    return this.http.get(`${this.apiUrl}/contratacion/validar-correo-cedula/`, { params }).pipe(
      map((response: any) => response),
      catchError(this.handleError)
    );
  }

  // --- Guardar Información Personal ---
  public guardarInfoPersonal(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/entrevista/info-personal/`, data, {}).pipe(
      map((response: any) => response),
      catchError(this.handleError)
    );
  }

  formulario_vacantes(datos: any): Observable<any> {
    const url = `${this.apiUrl}/contratacion/subirParte2`;
    return this.http.post(url, datos);
  }

  // Crear o actualizar candidato
  crearActualizarCandidato(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/contratacion/candidato/`, data);
  }

  subirFirmaBase64(pk: number | string, firmaBase64: string): Observable<UploadFotoResponse> {
    const url = `${this.apiUrl}/contratacion/candidatos/${pk}/firma-solicitante/`;
    const body = { firma_base64: firmaBase64 };
    // Sin headers explícitos: HttpClient envía JSON por defecto
    return this.http.post<UploadFotoResponse>(url, body);
  }
}
