import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment.development';
import { isPlatformBrowser } from '@angular/common';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoginS {

  private apiUrl = `${environment.apiUrl}/gestion_admin/auth`;

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) private platformId: Object) { }

  // Login
  async login(login: string, password: string): Promise<{ token: string; user: any }> {
    return firstValueFrom(
      this.http.post<{ token: string; user: any }>(`${this.apiUrl}/login/`, { login, password })
    );
  }

  async getUserData(): Promise<any> {
    const raw = localStorage.getItem('key');
    const obj = JSON.parse(raw || '{}');
    const jwtKey = obj.jwt;

    if (!jwtKey) throw new Error('No se encontró JWT');

    const headers = new HttpHeaders().set('Authorization', jwtKey);
    const url = `${this.apiUrl}/usuarios/usuario`;

    // Retorna la respuesta al componente
    return await firstValueFrom(this.http.get(url, { headers }));
  }

  logout(): void {
    localStorage.clear();
    window.location.href = '';
  }

  // Register
  async register(user: any): Promise<any> {
    return await firstValueFrom(
      this.http.post(`${this.apiUrl}/usuarios/registro`, user)
    );
  }

}
