import { Injectable } from '@angular/core';
import { environment } from '../../../../../../../environments/environment.development';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PaymentsS {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  async getPayslipsByCedula(cedula: string): Promise<any> {
    const raw = localStorage.getItem('key');
    const obj = JSON.parse(raw || '{}');
    const jwtKey = obj.jwt;

    if (!jwtKey) throw new Error('No se encontró JWT');

    const headers = new HttpHeaders().set('Authorization', jwtKey);
    const url = `${this.apiUrl}/Desprendibles/traerDesprendibles/${cedula}`;

    return await firstValueFrom(this.http.get(url, { headers }));
  }
}
