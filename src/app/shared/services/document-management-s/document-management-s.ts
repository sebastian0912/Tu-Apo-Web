import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DocumentManagementS {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) private platformId: Object) { }

  private handleError(error: any): Observable<never> {
    throw error;
  }

  // Método para subida
  guardarDocumento(
    title: any,
    owner_id: string,
    type: number,
    file: File,
    contract_number?: string
  ): Observable<any> {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('owner_id', owner_id);
    formData.append('type', type.toString());
    formData.append('file', file);
    if (contract_number) {
      formData.append('contract_number', contract_number);
    }
    return this.http.post(`${this.apiUrl}/gestion_documental/documentosPruebas/`, formData);
  }

  // Método para obtener documentos de un usuario
  getDocuments(cedula: string, type?: number, contract_number?: string): Observable<any> {
    let params = new URLSearchParams();
    params.set('cedula', cedula);
    if (type !== undefined && type !== null) {
      params.set('type', type.toString());
    }
    if (contract_number) {
      params.set('contract_number', contract_number);
    }
    const query = params.toString();
    return this.http.get(`${this.apiUrl}/gestion_documental/documentos/?${query}`);
  }
}
