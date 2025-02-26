import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment.development';
import { isPlatformBrowser } from '@angular/common';
import { firstValueFrom, Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class CandidatoService {

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) private platformId: Object) { }

  private getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('token');
    }
    return null;
  }

  private createAuthorizationHeader(): HttpHeaders {
    const token = this.getToken();
    return token ? new HttpHeaders().set('Authorization', token) : new HttpHeaders();
  }

  private handleError(error: any): Observable<never> {
    throw error;
  }

  // Buscar en contratacion por cedula para sacar los numeros
  public buscarEncontratacion(cedula: any): Observable<any> {
    const headers = this.createAuthorizationHeader();
    return this.http.get(`${this.apiUrl}/contratacion/traerNombreCompletoCandidatoSin/${cedula}`, { headers }).pipe(
      map((response: any) => response),
      catchError(this.handleError)
    );
  }

  // validar-correo-cedula/
  public validarCorreoCedula(correo: string, cedula: string): Observable<any> {
    const headers = this.createAuthorizationHeader();
    const params = { cedula, correo };  // Asegurarse de que están en el orden correcto

    return this.http.get(`${this.apiUrl}/contratacion/validar-correo-cedula/`, { headers, params }).pipe(
        map((response: any) => response),
        catchError(this.handleError)
    );
}



}
