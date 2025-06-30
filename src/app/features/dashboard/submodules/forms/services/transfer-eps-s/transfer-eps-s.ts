import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { HttpClient } from '@angular/common/http';
import { map, catchError } from 'rxjs';
import { environment } from '../../../../../../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class TransferEpsS {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) private platformId: Object) { }

  private handleError(error: any): Observable<never> {
    throw error;
  }

  enviarSolicitudTraslado(formData: FormData): Observable<any> {
    const url = `${this.apiUrl}/traslados/formulario-solicitud`;
    return this.http.post(url, formData);
  }
}
