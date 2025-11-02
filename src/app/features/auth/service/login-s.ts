import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment.development';
import { isPlatformBrowser } from '@angular/common';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoginS {
  // ===== Fijos que nos diste =====
  private readonly EMPRESA_ID = '30872fdf-898c-11f0-b457-7c10c942c0e6';
  private readonly ROL_ID = '308700ad898c11f0b4577c10c942c0e6';
  private readonly SEDES_URL = `${environment.apiUrl}/gestion_admin/sedes/public/`;

  private apiUrl = `${environment.apiUrl}/gestion_admin/auth`;

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) private platformId: Object) { }

  // Login
  async login(login: string, password: string): Promise<{ token: string; user: any }> {
    return firstValueFrom(
      this.http.post<{ token: string; user: any }>(`${this.apiUrl}/login/`, { login, password })
    );
  }



  logout(): void {
    localStorage.clear();
    window.location.href = '';
  }

  // Register
  async register(user: any): Promise<any> {
    return firstValueFrom(this.http.post(`${this.apiUrl}/register/`, user));
  }

  // Utils
  private isUUIDLoose(v: any): v is string {
    return typeof v === 'string'
      && (/^[0-9a-f]{32}$/i.test(v) ||
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v));
  }
  private norm(s: string): string {
    return String(s || '')
      .normalize('NFD').replace(/\p{Diacritic}/gu, '')
      .trim().toUpperCase();
  }
  private async fetchList(url: string): Promise<any[]> {
    const res: any = await firstValueFrom(this.http.get(url));
    return Array.isArray(res) ? res : (res?.results ?? res?.data ?? []);
  }

  /** Si viene nombre de sede, busca su ID; si ya viene ID lo retorna. */
  private async ensureSedeId(sedeValue: any): Promise<string | null> {
    if (!sedeValue) return null;
    if (this.isUUIDLoose(sedeValue)) return String(sedeValue);

    const q = encodeURIComponent(String(sedeValue));
    // si tu API usa otro param (p.ej. ?q=), cámbialo aquí:
    const items = await this.fetchList(`${this.SEDES_URL}?search=${q}`);
    if (!items?.length) throw new Error(`No se encontró la sede "${sedeValue}"`);

    const keys = ['nombre', 'name', 'descripcion', 'titulo'];
    const target = this.norm(String(sedeValue));
    let hit = items.find((it: any) => keys.some(k => this.norm(it?.[k]) === target))
      || items.find((it: any) => keys.some(k => this.norm(it?.[k]).startsWith(target)))
      || items.find((it: any) => keys.some(k => this.norm(it?.[k]).includes(target)));
    const id = hit?.id || hit?.uuid || hit?.pk;
    if (!id) throw new Error(`No se pudo obtener ID para la sede "${sedeValue}"`);
    return id;
  }


  /** Arma el DTO EXACTO que espera RegisterView */
  async buildRegisterDto(raw: any) {
    const sedeSource = raw.sede ?? raw.oficina;         // sede puede venir como nombre u oficina
    const sedeId = await this.ensureSedeId(sedeSource); // resuelve ID

    const nombres = [raw.primer_nombre, raw.segundo_nombre].filter(Boolean).join(' ').trim();
    const apellidos = [raw.primer_apellido, raw.segundo_apellido].filter(Boolean).join(' ').trim();

    // password: usa la del form si existe (>=8) o fallback al documento
    const password = raw.password && String(raw.password).length >= 8
      ? String(raw.password)
      : String(raw.numero_de_documento).trim();

    return {
      numero_de_documento: String(raw.numero_documento).trim(),
      tipo_documento: raw.tipo_doc, // mapea tu control
      correo_electronico: raw.correo_electronico,            // ya armado antes
      password,                                                // NO convertir a mayúsculas
      estado_solicitudes: true,
      empresa: this.EMPRESA_ID,                   // fijo
      sede: sedeId,                            // resuelto
      rol: this.ROL_ID,                       // fijo
      nombres: this.norm(nombres),                // a MAYÚSCULAS
      apellidos: this.norm(apellidos),
      celular: raw.celular || null,
    };
  }

}
