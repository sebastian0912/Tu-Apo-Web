import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { urlBack, Usuario } from '../model/Usuario';
import { AuthService } from '../Servicios/auth.service';
import { RouterOutlet } from '@angular/router';

import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators, FormArray, FormBuilder } from '@angular/forms';
import { CommonModule } from '@angular/common'; // Importa CommonModule
import { HttpClientModule } from '@angular/common/http'; // Importa HttpClientModule


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterOutlet,
    RouterOutlet,
    FormsModule,
    ReactiveFormsModule,
    CommonModule, HttpClientModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  providers: [AuthService] // Proveer AuthService aquí

})

export class LoginComponent {
  loginForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: '',
      password: ''
    });
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.valid) {
      const values = await this.authService.login(this.loginForm.value.email, this.loginForm.value.password);

      if (values) {
        localStorage.setItem('idUsuario', values.numero_de_documento);
        localStorage.setItem('perfil', values.rol);
        localStorage.setItem('username', values.primer_nombre + ' ' + values.primer_apellido);
        localStorage.setItem('sede', values.sucursalde);
        localStorage.setItem('correo_electronico', values.correo_electronico);

        console.log('Usuario logueado', values);
      } else {
        // Manejo de error de login
      }
    }
  }

}
