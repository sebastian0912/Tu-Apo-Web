import { Component } from '@angular/core';
import { LoginS } from '../../../../../auth/service/login-s';
import Swal from 'sweetalert2';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-payments-payment-slips',
  imports: [
    FormsModule
  ],
  templateUrl: './payments-payment-slips.html',
  styleUrl: './payments-payment-slips.css'
})
export class PaymentsPaymentSlips {
  cedula: string = '';

  constructor(private loginS: LoginS,
  ) { }

  cerrarSesion() {
    this.loginS.logout()
  }

  async sendCedula(): Promise<void> {

    if (this.cedula === '') {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Por favor ingrese un número de cédula.',
      });
      return;
    }

    try {
      const body = localStorage.getItem('key'); // Asegúrate de que 'key' sea la clave correcta
      const obj = JSON.parse(body || '{}');
      const jwtKey = obj.jwt;

      const headers = {
        Authorization: jwtKey,
      };

      const urlcompleta = `${urlBack.url}/Desprendibles/traerDesprendibles/${this.cedula}`;

      const response = await fetch(urlcompleta, {
        method: 'GET',
        headers: headers,
      });

      if (response.ok) {
        const responseData = await response.json();

        if (responseData.message === "No se encontró el número de cédula") {
          Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'No se encontraron desprendibles para la cédula ingresada.',
          });
          return;
        }

        this.mostrarDatosEnTabla(responseData);
      } else if (response.status === 401) { // Verificar si el problema es un token expirado o inválido
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

  // Función para mostrar los datos en la tabla
  mostrarDatosEnTabla(responseData: any): void {
    // Obtener el elemento tbody de la tabla
    const tbody = document.getElementById('tabla');

    if (tbody) {
      // Limpiar el contenido existente en el tbody
      tbody.innerHTML = '';

      // Iterar sobre los datos y agregar filas a la tabla
      responseData.desprendibles.forEach((dato: any, index: number) => {
        const fila = document.createElement('tr');

        // Crear celdas y agregar los datos
        const numeroCelda = document.createElement('td');
        numeroCelda.textContent = dato.no;
        fila.appendChild(numeroCelda);

        // Agregar más celdas según la estructura de tu objeto
        // Ejemplo: cédula
        const cedulaCelda = document.createElement('td');
        cedulaCelda.textContent = dato.cedula;
        fila.appendChild(cedulaCelda);

        // Ejemplo: nombre
        const nombreCelda = document.createElement('td');
        nombreCelda.textContent = dato.nombre;
        fila.appendChild(nombreCelda);

        // Ejemplo ingreso
        const ingresoCelda = document.createElement('td');
        ingresoCelda.textContent = dato.ingreso;
        fila.appendChild(ingresoCelda);

        // Ejemplo retiro
        const retiroCelda = document.createElement('td');
        retiroCelda.textContent = dato.retiro;
        fila.appendChild(retiroCelda);

        // Ejemplo finca
        const fincaCelda = document.createElement('td');
        fincaCelda.textContent = dato.finca;
        fila.appendChild(fincaCelda);

        // Ejemplo: telefono
        const telefonoCelda = document.createElement('td');
        telefonoCelda.textContent = dato.telefono;
        fila.appendChild(telefonoCelda);

        // Ejemplo: concepto
        const conceptoCelda = document.createElement('td');
        conceptoCelda.textContent = dato.concepto;
        fila.appendChild(conceptoCelda);

        // Ejemplo: desprendibles
        const desprendiblesCelda = document.createElement('td');
        const desprendiblesLink = document.createElement('a'); // Crear un elemento <a> para el enlace
        desprendiblesLink.href = dato.desprendibles; // Establecer la URL del enlace
        desprendiblesLink.textContent = 'Ver Desprendible'; // Establecer el texto del enlace. Puedes cambiarlo por lo que prefieras
        desprendiblesLink.target = '_blank'; // Opcional: Abre el enlace en una nueva pestaña
        // Agregar el enlace a la celda de la tabla
        desprendiblesCelda.appendChild(desprendiblesLink);
        fila.appendChild(desprendiblesCelda);

        // Ejemplo: certificaciones
        const certificacionesCelda = document.createElement('td');
        const certificacionesLink = document.createElement('a');
        certificacionesLink.href = dato.certificaciones;
        certificacionesLink.textContent = "Ver Certificación";
        certificacionesLink.target = "_blank";
        certificacionesCelda.appendChild(certificacionesLink);
        fila.appendChild(certificacionesCelda);

        // Ejemplo: cartas_retiro
        const cartas_retiroCelda = document.createElement('td');
        const cartas_retiroLink = document.createElement('a');
        cartas_retiroLink.href = dato.cartas_retiro;
        cartas_retiroLink.textContent = "Ver Carta";
        cartas_retiroLink.target = "_blank";
        cartas_retiroCelda.appendChild(cartas_retiroLink);
        fila.appendChild(cartas_retiroCelda);


        // Ejemplo: carta_cesantias
        const carta_cesantiasCelda = document.createElement('td');
        carta_cesantiasCelda.textContent = dato.carta_cesantias;
        fila.appendChild(carta_cesantiasCelda);

        // Ejemplo: entrevista_retiro
        const entrevista_retiroCelda = document.createElement('td');
        const entrevista_retiroLink = document.createElement('a');
        entrevista_retiroLink.href = dato.entrevista_retiro;
        entrevista_retiroLink.textContent = "Ver Entrevista";
        entrevista_retiroLink.target = "_blank";
        entrevista_retiroCelda.appendChild(entrevista_retiroLink);
        fila.appendChild(entrevista_retiroCelda);


        // Ejemplo: correo
        const correoCelda = document.createElement('td');
        correoCelda.textContent = dato.correo;
        fila.appendChild(correoCelda);

        // Ejemplo: confirmacion_envio
        const confirmacion_envioCelda = document.createElement('td');
        confirmacion_envioCelda.textContent = dato.confirmacion_envio;
        fila.appendChild(confirmacion_envioCelda);

        // Agregar la fila al tbody
        tbody.appendChild(fila);
      });
    }
  }
}
