import { Component } from '@angular/core';
import { SharedModule } from '../../../shared/shared-module';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { LoginS } from '../service/login-s';

@Component({
  selector: 'app-login',
  imports: [
    SharedModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  loginForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private loginS: LoginS,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  async onSubmit(): Promise<void> {
    if (!this.loginForm.valid) {
      return;
    }

    try {
      const { email, password } = this.loginForm.value;
      const values = await this.loginS.login(email, password);

      if (values?.jwt === "Contraseña incorrecta") {
        await Swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: 'Contraseña incorrecta',
        });
        return;
      }

      if (values?.jwt === "Usuario no encontrado") {
        await Swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: 'Correo no encontrado',
        });
        return;
      }

      if (values?.message === 'success' && values.jwt) {
        // Guardar token en localStorage
        localStorage.setItem('key', JSON.stringify(values));

        // CONSEGUIR DATOS DE USUARIO usando el servicio
        const user = await this.loginS.getUserData();
        // Guardar en localStorage
        localStorage.setItem('user', JSON.stringify(user));

        // Redirigir
        this.router.navigate(['/desprendibles']);
        return;
      }

      // Caso por defecto (error inesperado)
      await Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Verifique la VPN o la conexión a internet',
      });
    } catch (error) {
      console.error(error);
      await Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Ocurrió un error inesperado. Intente de nuevo.',
      });
    }
  }

}
