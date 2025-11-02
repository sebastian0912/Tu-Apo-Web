import { Component, OnInit } from '@angular/core';
import { SharedModule } from '../../../shared/shared-module';
import {
  FormGroup,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
  ReactiveFormsModule
} from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { LoginS } from '../service/login-s';

function emailOrDocValidator(control: AbstractControl): ValidationErrors | null {
  const v: string = (control.value ?? '').toString().trim();
  if (!v) return { required: true };
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const isDoc = /^\d{4,30}$/.test(v); // ajusta rango si lo necesitas
  return isEmail || isDoc ? null : { emailOrDoc: true };
}

@Component({
  selector: 'app-login',
  // Si tu SharedModule ya exporta ReactiveFormsModule, no necesitas importarlo aquí.
  // Lo incluyo por claridad.
  imports: [SharedModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
  standalone: true
})
export class Login implements OnInit {
  loginForm!: FormGroup;
  hide = true;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private loginS: LoginS,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      login: ['', [Validators.required, emailOrDocValidator]],
      password: ['', [Validators.required]],
    });
  }

  // Normaliza texto (trim)
  private norm(v: any): string {
    return (v ?? '').toString().trim();
  }

  // Obtiene el nombre de rol en mayúsculas desde varios formatos posibles
  private getRolNombre(user: any): string {
    const r = user?.rol ?? user?.role ?? user?.roles ?? null;

    if (!r) return '';
    if (typeof r === 'string') return r.toUpperCase();

    if (Array.isArray(r)) {
      // toma el primero no-vacío
      const first = r.find((x: any) => !!x);
      if (!first) return '';
      if (typeof first === 'string') return first.toUpperCase();
      return String(first?.nombre ?? '').toUpperCase();
    }

    // objeto { id, nombre }
    return String(r?.nombre ?? '').toUpperCase();
  }

  async onSubmit(): Promise<void> {
    if (this.loading) return;

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    // Quitar espacios antes de enviar
    const login = this.norm(this.loginForm.get('login')?.value);
    const password = this.norm(this.loginForm.get('password')?.value);

    if (!login || !password) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;

    try {
      // 1) Login en backend (un solo llamado)
      const resp = await this.loginS.login(login, password); // esperado: { token, user }
      if (!resp?.token) {
        throw { message: 'Respuesta inválida del servidor', code: 'INVALID_RESPONSE' };
      }

      // 2) Guardar token
      localStorage.setItem('key', resp.token);

      // 3) Obtener datos extendidos del usuario (si falla, uso el del login)
      let user = resp?.user ?? null;
    

      if (!user) {
        throw { message: 'No se pudo obtener el usuario', code: 'NO_USER' };
      }

      // 4) Guardar usuario
      localStorage.setItem('user', JSON.stringify(user));

      // 5) Redirección por rol
      const rolNombre = this.getRolNombre(user); // e.g. 'ADMIN', 'SIN-ASIGNAR', etc.

      if (rolNombre === 'SIN-ASIGNAR') {
        await this.router.navigate(['/formulario/formulario-vacantes-prueba']);
      } else {
        await this.router.navigate(['/dashboard/desprendibles-de-pago']);
      }

    } catch (err: any) {
      // Manejo de errores más claro
      let text = 'Ocurrió un error inesperado. Inténtalo de nuevo.';
      if (err?.status === 0) {
        text = 'No hay conexión con el servidor. Verifica tu internet o VPN.';
      } else if (err?.status === 401) {
        text = 'Usuario o contraseña incorrectos.';
      } else if (err?.message) {
        text = err.message;
      }

      await Swal.fire({
        icon: 'error',
        title: 'No pudimos iniciar sesión',
        text,
      });
    } finally {
      this.loading = false;
    }
  }
}
