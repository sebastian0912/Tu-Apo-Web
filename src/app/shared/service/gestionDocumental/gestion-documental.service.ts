import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment.development';
import { isPlatformBrowser } from '@angular/common';
import { firstValueFrom, Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class GestionDocumentalService {
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

  // Método para subir un documento
  guardarDocumento(
    title: any,
    owner_id: string,
    type: number,
    file: File,
    contract_number?: string  // Hacer que el número de contrato sea opcional
  ): Observable<any> {
    const formData = new FormData();
    formData.append('title', title); // Nombre del archivo
    formData.append('owner_id', owner_id); // Cédula
    formData.append('type', type.toString()); // Tipo de documento (entero)
    formData.append('file', file); // Archivo PDF
    // Solo agregar el número de contrato si está presente
    if (contract_number) {
      formData.append('contract_number', contract_number);
    }

    const headers = this.createAuthorizationHeader();

    return this.http.post(`${this.apiUrl}/gestion_documental/documentosPruebas/`, formData, {
      headers,
    });
  }

}
