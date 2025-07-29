import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { HttpClient } from '@angular/common/http';
import { map, catchError } from 'rxjs';
import { environment } from '../../../../../../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class FormDataS {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) private platformId: Object) { }

  private handleError(error: any): Observable<never> {
    throw error;
  }

  // Traer sucursales
  async traerSucursales(): Promise<Observable<any>> {
    return this.http.get(`${this.apiUrl}/Sucursal/sucursal`)
      .pipe(catchError(this.handleError));
  }

  // searchOptionForms
  public searchOptionForms(): Observable<any> {
    return this.http.get(`${this.apiUrl}/opciones_formulario/categorias`).pipe(
      map((response: any) => response),
      catchError(this.handleError)
    );
  }

}
