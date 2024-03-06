import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../Servicios/auth.service';
import { RouterOutlet } from '@angular/router';
import Swal from 'sweetalert2';
import { urlBack, Usuario } from '../model/Usuario';
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
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });

  }

  async onSubmit(): Promise<void> {
    // si los campos estan vacios
    if (this.loginForm.value.email === '' || this.loginForm.value.password === '') {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Por favor llene todos los campos',
      });
      return;
    }

    // si el formulario es válido
    if (this.loginForm.valid) {
      const values = await this.authService.login(this.loginForm.value.email, this.loginForm.value.password);
      console.log(values);
      if (values.jwt === "Contraseña incorrecta") {
        Swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: 'Contraseña incorrecta',
        });
      }

      else if (values.jwt === "Usuario no encontrado") {
        Swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: 'Correo no encontrado',
        });
      }

      else if (values.message === 'success') {        
        // guardar token en localstorage
        localStorage.setItem('key', JSON.stringify(values));

        // conseguir datos de usuario con el token
        await this.getUserData();        

        // limpiar console
        //console.clear();
        this.router.navigate(['/desprendibles']);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: 'Verifique la vpn o la conexión a internet',
        });
      }
    }
  }

  // conseguir datos de usuario con el token endpoint /usuario/usuario
  async getUserData(): Promise<void> {
    try {
      const body = localStorage.getItem('key'); // A
      const obj = JSON.parse(body || '{}');
      const jwtKey = obj.jwt;

      const headers = {
        Authorization: jwtKey,
      };

      const urlcompleta = `${urlBack.url}/usuarios/usuario`;

      const response = await fetch(urlcompleta, {
        headers: headers,
      });

      if (response.ok) {
        const responseData = await response.json();
        localStorage.setItem('user', JSON.stringify(responseData));
       
      } else if (response.status === 401) {
        Swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: 'La sesión ha expirado, por favor inicie sesión nuevamente.',
        }).then(() => {
          window.location.href = '';
        });
      } else {
        throw new Error('Error en la petición GET');
      }
    } catch (error) {
      console.error('Error al realizar la petición HTTP GET o al manejar el JWT');
      console.error(error);
      throw error;
    }

  }

}
