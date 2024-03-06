import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { urlBack } from '../model/Usuario'; 

@Injectable({
  providedIn: 'root'
})

export class AuthService {
  constructor(private http: HttpClient) {}

  async login (email: string, password: string): Promise<any> {
    // Implementa la lógica de fetchData aquí, y retorna los datos del usuario o null si falla
    const url = `${urlBack.url}/usuarios/ingresar`;
    try {
      const response = await this.http.post(url, { email, password }, { withCredentials: true }).toPromise();

      // Continúa la implementación basada en tu lógica de negocio
      return response;
    } catch (error) {
      console.error('Error al iniciar sesión', error);
      return null;
    }
  }

  // Implementa el método logout solo para limpiar todo el localStorage
  logout(): void {
    localStorage.clear();
    window.location.href = '';
  }
  
}
