import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = 'gestion-empresa-web';
  cedula: string = '';

  async sendCedula(): Promise<void> {

    try {
      // Construir la URL completa
      const urlcompleta = `${'http://127.0.0.1:8000'}/Desprendibles/traerDesprendibles/${
        this.cedula
      }`;

      try {
        // Realizar la solicitud HTTP utilizando async/await
        const response = await fetch(urlcompleta, {
          method: 'GET',
          // headers: headers,
        });

        if (response.ok) {
          // Procesar la respuesta si la solicitud fue exitosa
          const responseData = await response.json();
          console.log(responseData);
          // Mostrar los datos en la tabla
          this.mostrarDatosEnTabla(responseData);

        } else {
          // Lanzar un error si la respuesta no fue exitosa
          throw new Error('Error en la petición GET');
        }
      } catch (error) {
        // Manejar errores en la petición HTTP
        console.error('Error en la petición HTTP GET');
        console.error(error);
        throw error; // Propagar el error para que se pueda manejar fuera de la función
      }
    } catch (error) {
      // Manejar errores al intentar parsear el objeto JSON
      console.error(
        'Error al parsear el objeto JSON almacenado en localStorage'
      );
      console.error(error);
      throw error; // Propagar el error para que se pueda manejar fuera de la función
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
        desprendiblesCelda.textContent = dato.desprendibles;
        fila.appendChild(desprendiblesCelda);

        // Ejemplo: certificaciones
        const certificacionesCelda = document.createElement('td');
        certificacionesCelda.textContent = dato.certificaciones;
        fila.appendChild(certificacionesCelda);

        // Ejemplo: cartas_retiro
        const cartas_retiroCelda = document.createElement('td');
        cartas_retiroCelda.textContent = dato.cartas_retiro;
        fila.appendChild(cartas_retiroCelda);

        // Ejemplo: carta_cesantias
        const carta_cesantiasCelda = document.createElement('td');
        carta_cesantiasCelda.textContent = dato.carta_cesantias;
        fila.appendChild(carta_cesantiasCelda);

        // Ejemplo: entrevista_retiro
        const entrevista_retiroCelda = document.createElement('td');
        entrevista_retiroCelda.textContent = dato.entrevista_retiro;
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
