import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { urlBack } from '../model/Usuario';
import html2canvas from 'html2canvas';

import {
  FormsModule,
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
  FormArray,
  FormBuilder,
} from '@angular/forms';
import { CommonModule } from '@angular/common'; // Importa CommonModule
import {
  HttpClient,
  HttpClientModule,
  HttpHeaders,
} from '@angular/common/http';
import Swal from 'sweetalert2';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { CandidatoService } from '../shared/service/candidato/candidato.service';

type RespuestaClave = 'a' | 'b' | 'c' | 'd' | 'e';

@Component({
  selector: 'app-prueba-lecto-escri',
  standalone: true,
  imports: [
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './prueba-lecto-escri.component.html',
  styleUrl: './prueba-lecto-escri.component.css',
})
export class PruebaLectoEscriComponent {
  pruebaLectoEscritura: FormGroup;
  mostrarFormulario: boolean = false;
  numeroCedula!: number;

  nombre: string = '';
  CodigoContrato: string = '';
  palabrasConEstados: any[] = [];
  puntaje = 100;

  respuestas: Record<RespuestaClave, number | null> = {
    a: null,
    b: null,
    c: null,
    d: null,
    e: null,
  };

  respuestasCorrectas: Record<RespuestaClave, number> = {
    a: 52,
    b: 43,
    c: 128,
    d: 100,
    e: 300,
  };

  comparaciones = [
    { num1: 123, num2: 321, marcado: false },
    { num1: 456, num2: 654, marcado: false },
    { num1: 789, num2: 987, marcado: false },
    { num1: 101, num2: 101, marcado: false },
    { num1: 202, num2: 220, marcado: false },
    { num1: 303, num2: 330, marcado: false },
    { num1: 404, num2: 404, marcado: false },
    { num1: 505, num2: 550, marcado: false },
    { num1: 606, num2: 660, marcado: false },
    { num1: 707, num2: 707, marcado: false },
  ];

  preguntaRamos = {
    pregunta:
      'Si en una hora de trabajo realizo 20 Ramos, en 4 horas de trabajo, ¿Cuántos ramos he realizado?',
    opciones: [
      { opcion: 'a', valor: 100 },
      { opcion: 'b', valor: 60 },
      { opcion: 'c', valor: 40 },
      { opcion: 'd', valor: 80 },
    ],
    respuestaCorrecta: 80, // La respuesta correcta es 80 ramos
    respuestaSeleccionada: null,
  };

  constructor(
    private fb: FormBuilder, 
    private http: HttpClient,
    private candidatoService: CandidatoService
  ) {
    const palabras = [
      'gallina',
      'murcielago',
      'mono',
      'mesa',
      'camisa',
      'lampara',
      'portatil',
      'ballena',
      'maleta',
      'zorro',
    ];

    this.pruebaLectoEscritura = this.fb.group({});

    // Selecciona 6 palabras aleatorias de la lista
    const palabrasAleatorias = this.seleccionarPalabrasAleatorias(palabras, 6);

    this.palabrasConEstados = palabrasAleatorias.map((palabra) => {
      const letras = palabra.split('');
      const maxBloqueadas = Math.floor(letras.length / 2); // Máximo de letras bloqueadas
      const minBloqueadas = Math.ceil(letras.length / 4); // Mínimo de letras bloqueadas, redondeo hacia arriba
      let bloqueadasAsignadas = 0; // Contador de letras bloqueadas asignadas

      // Inicializa todos los estados como habilitados
      const estadosIniciales = letras.map((letra) => ({
        habilitado: true,
        letra: '',
      }));

      // Mezcla aleatoriamente los índices para decidir qué letras bloquear
      const indicesAleatorios = [...estadosIniciales.keys()].sort(
        () => Math.random() - 0.5
      );

      // Primero asegura el mínimo de bloqueadas
      indicesAleatorios.slice(0, minBloqueadas).forEach((indice) => {
        estadosIniciales[indice] = {
          habilitado: false,
          letra: letras[indice],
        };
        bloqueadasAsignadas++;
      });

      // Luego intenta bloquear hasta alcanzar el máximo, sin sobrepasar el minimo ya asignado
      indicesAleatorios.slice(minBloqueadas).forEach((indice) => {
        if (bloqueadasAsignadas < maxBloqueadas && Math.random() < 0.5) {
          estadosIniciales[indice] = {
            habilitado: false,
            letra: letras[indice],
          };
          bloqueadasAsignadas++;
        }
      });

      return { palabra, letras, estados: estadosIniciales };
    });
  }

  verificarLetra(event: any, letraIndex: any, palabraIndex: any) {
    const estado = this.palabrasConEstados[palabraIndex].estados[letraIndex];
    if (!estado.habilitado) {
      // Si la letra ya está deshabilitada (y mostrada), no hacer nada
      return;
    }
    if (
      event.target.value.toUpperCase() ===
      this.palabrasConEstados[palabraIndex].letras[letraIndex].toUpperCase()
    ) {
      estado.habilitado = false; // Correcto: Marca la letra como deshabilitada pero ya está visible
      event.target.value =
        this.palabrasConEstados[palabraIndex].letras[letraIndex]; // Muestra la letra
    } else {
      this.puntaje -= 0.5; // Incorrecto: Resta puntos
    }
    event.target.disabled = true; // Deshabilita el input
  }

  seleccionarPalabrasAleatorias(
    palabras: string[],
    cantidad: number
  ): string[] {
    // Mezcla el arreglo de palabras
    const mezcladas = palabras.sort(() => 0.5 - Math.random());
    // Selecciona las primeras 'cantidad' palabras
    return mezcladas.slice(0, cantidad);
  }

  async buscarCedula(): Promise<void> {
    if (!this.numeroCedula) {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Por favor ingrese un número de cédula.',
      });
      return;
    }
    console.log('Buscando cédula:', this.numeroCedula);
    this.candidatoService.buscarEncontratacion(this.numeroCedula).subscribe(
      (response: any) => {
        console.log('Respuesta de la búsqueda:', response);
        if (response) {          
          this.mostrarFormulario = true; // Mostrar el formulario
          this.nombre = response.nombre_completo;
          this.CodigoContrato = response.codigo_contrato;
        } else {
          Swal.fire({
            title: 'Cédula no encontrada',
            text: 'No se encontraron datos para la cédula ingresada.',
            icon: 'error',
            confirmButtonText: 'Aceptar',
          });
          this.mostrarFormulario = true; // También mostrar el formulario en caso de error
        }
      },
      (error) => {
        console.error('Error al realizar la petición HTTP GET');
        console.error(error);
        Swal.fire({
          title: 'Error en la búsqueda',
          text: 'Se produjo un error al buscar la cédula, por favor intenta nuevamente.',
          icon: 'error',
          confirmButtonText: 'Aceptar',
        });
      }
    ); 
  }
  

  // Método para calcular la edad
  calcularEdad(fechaNacimiento: string): number {
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();

    // Si el mes actual es menor que el mes de nacimiento,
    // o es el mismo mes pero el día actual es menor que el día de nacimiento,
    // entonces aún no ha cumplido años este año.
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }

    return edad;
  }

  verificarRespuesta(clave: RespuestaClave, valor: number | null) {
    if (valor !== null && this.respuestasCorrectas[clave] === valor) {
      // Lógica cuando la respuesta es correcta. Puedes elegir no hacer nada o incrementar el puntaje.
    } else {
      // Si la respuesta es incorrecta y no es la primera vez que se introduce una respuesta, ajusta el puntaje.
      // Nota: Necesitas lógica adicional si quieres penalizar solo una vez por error.
      this.puntaje -= 0.5;
    }
  }

  verificarRespuestaRamos() {
    if (
      this.preguntaRamos.respuestaSeleccionada !==
      this.preguntaRamos.respuestaCorrecta
    ) {
      this.puntaje -= 0.5; // Resta puntos si la respuesta es incorrecta
    }
    // Aquí podrías también manejar qué hacer si la respuesta es correcta
  }

  verificarComparaciones() {
    this.comparaciones.forEach(comparacion => {
      if ((comparacion.num1 !== comparacion.num2 && !comparacion.marcado) ||
          (comparacion.num1 === comparacion.num2 && comparacion.marcado)) {
        this.puntaje -= 0.5; // Resta puntos si la marca es incorrecta
      }
    });
    // Aquí podrías manejar la lógica para cuando las respuestas son verificadas
  }

  enviarRespuestas() {

    if(this.numeroCedula === undefined) {
      Swal.fire({
        title: 'Error al enviar la prueba',
        text: 'Por favor, ingresa tu número de cédula.',
        icon: 'error',
        confirmButtonText: 'Aceptar',
      });
      return;
    }

    const contenedor = document.querySelector('.contenedor') as HTMLElement;

    if (contenedor) {
      html2canvas(contenedor).then((canvas) => {
        // Here you have the canvas. You can convert it to an image, display it, or do whatever you need with it.
        // For example, to display it in the document:
        document.body.appendChild(canvas);

        // Or to get the image as a data URL
        const dataURL = canvas.toDataURL();
        console.log(dataURL);
        // You can send this URL to a server or save it directly in the browser.

        // Now, let's send the score and dataURL to the database
        const url = `${urlBack.url}/contratacion/pruebaLectoEscritura`;
        const data = {
          numerodeceduladepersona: this.numeroCedula,
          porcentajelectoescritura: this.puntaje,
          evidencia_lectoescritura: dataURL, // Use the actual dataURL here
        };

        this.http.post(url, data).subscribe(
          (response: any) => {
            console.log(response);
            Swal.fire({
              title: 'Prueba enviada',
              text: 'Gracias por terminar el test. Tu resultado ha sido enviado.',
              icon: 'success',
              confirmButtonText: 'Aceptar',
            }).then((result) => {
              if (result.isConfirmed) {
                window.location.reload(); // Recarga la página
              }
            });
          },
          (error) => {
            console.error(error);
            Swal.fire({
              title: 'Error al enviar la prueba',
              text: 'Ocurrió un error al enviar la prueba. Por favor, inténtalo de nuevo.',
              icon: 'error',
              confirmButtonText: 'Aceptar',
            }).then((result) => {
              if (result.isConfirmed) {
                window.location.reload(); // Recarga la página
              }
            });
          }
        );
        
      });
    } else {
      console.log('The container element was not found.');
    }
  }


}
