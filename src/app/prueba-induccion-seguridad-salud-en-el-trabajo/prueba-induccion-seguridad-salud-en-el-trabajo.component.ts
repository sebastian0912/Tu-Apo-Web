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

interface Option {
  text: string;
  isCorrect: boolean;
  image: string;
}

interface Question {
  text: string;
  options: Option[];
  selectedOptionIndex: number | null; // Nuevo campo para rastrear la opción seleccionada
}

interface TrueFalseQuestion {
  id: number;
  text: string;
  image: string;
  isCorrect: boolean; // Indica si la respuesta correcta es verdadera
  selectedAnswer: boolean | null;
}

interface ImageQuestion {
  id: number; // Un identificador único para la pregunta
  image: string; // Ruta de la imagen asociada a la pregunta
  statement: string; // El enunciado que el usuario debe evaluar
  options: string[]; // Opciones de texto para que el usuario elija
  correctAnswer: string; // La respuesta correcta
}

@Component({
  selector: 'app-prueba-induccion-seguridad-salud-en-el-trabajo',
  standalone: true,
  imports: [
    RouterOutlet,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl:
    './prueba-induccion-seguridad-salud-en-el-trabajo.component.html',
  styleUrl: './prueba-induccion-seguridad-salud-en-el-trabajo.component.css',
})
export class PruebaInduccionSeguridadSaludEnElTrabajoComponent {
  pruebaLectoEscritura: FormGroup;
  mostrarFormulario: boolean = false;
  numeroCedula!: number;

  nombre: string = '';
  edad: string = '';
  grado: string = '';

  questions: Question[] = [
    {
      text: 'Una de mis responsabilidades como trabajador frente al Sistema de Gestión de Seguridad y Salud en el trabajo es:',
      options: [
        {
          text: 'No reportar los accidentes de trabajo.',
          isCorrect: false,
          image: '../../assets/Img/SaludYTrabajo/accidente.png',
        },
        {
          text: 'Suministrar información clara, completa y veraz de mi estado de salud.',
          isCorrect: true,
          image: '../../assets/Img/SaludYTrabajo/salud-mental.png',
        },
        {
          text: 'No respetar las señales de peligro.',
          isCorrect: false,
          image: '../../assets/Img/SaludYTrabajo/no-entrar.png',
        },
      ],
      selectedOptionIndex: null, // Inicialmente, ningún usuario ha seleccionado una opción
    },
    // Más preguntas pueden ir aquí
  ];

  questions2: Question[] = [
    {
      text: '"Tan pronto ocurre un accidente de Trabajo, yo debo":',
      options: [
        {
          text: 'Asustarme, dando alaridos',
          isCorrect: false,
          image: '../../assets/Img/SaludYTrabajo/chico.png',
        },
        {
          text: 'Sentarme a esperar a ver qué pasa',
          isCorrect: false,
          image: '../../assets/Img/SaludYTrabajo/sala-de-espera.png',
        },
        {
          text: 'Informar al jefe inmediato y a la empresa temporal 10 sucedido',
          isCorrect: true,
          image: '../../assets/Img/SaludYTrabajo/doctor.png',
        },
      ],
      selectedOptionIndex: null, // Inicialmente, ningún usuario ha seleccionado una opción
    },
    // Más preguntas pueden ir aquí
  ];

  trueFalseQuestions: TrueFalseQuestion[] = [
    {
      id: 1,
      text: 'El comité de Convivencia Laboral vela por el bienestar de los trabajadores',
      image: '../../assets/Img/SaludYTrabajo/director-de-la-silla.png',
      isCorrect: true, // Suponiendo que esta afirmación es verdadera
      selectedAnswer: null,
    },
    {
      id: 2,
      text: 'La empresa no está obligada a reportar accidentes de trabajo menores',
      image: '../../assets/Img/SaludYTrabajo/contratista.png',
      isCorrect: false, // Suponiendo que esta afirmación es falsa
      selectedAnswer: null,
    },
    // Agrega más preguntas aquí
  ];

  imageQuestions: ImageQuestion[] = [
    {
      id: 1,
      image: '../../assets/Img/SaludYTrabajo/accidenteAlmacen.png',
      statement: 'Selecciona la afirmación verdadera sobre la imagen.',
      options: ['Afirmación A', 'Afirmación B', 'Afirmación C'],
      correctAnswer: 'Afirmación B',
    },
    {
      id: 2,
      image: '../../assets/Img/SaludYTrabajo/resbaladizo.png',
      statement: 'Selecciona la afirmación verdadera sobre la imagen.',
      options: ['Afirmación A', 'Afirmación B', 'Afirmación C'],
      correctAnswer: 'Afirmación B',
    },
    {
      id: 3,
      image: '../../assets/Img/SaludYTrabajo/dolorEspalda.png',
      statement: 'Selecciona la afirmación verdadera sobre la imagen.',
      options: ['Afirmación A', 'Afirmación B', 'Afirmación C'],
      correctAnswer: 'Afirmación B',
    },
    {
      id: 4,
      image: '../../assets/Img/SaludYTrabajo/firmar.png',
      statement: 'Selecciona la afirmación verdadera sobre la imagen.',
      options: ['Afirmación A', 'Afirmación B', 'Afirmación C'],
      correctAnswer: 'Afirmación B',
    },

    // Más preguntas pueden ir aquí
  ];

  imageQuestions2: ImageQuestion[] = [
    {
      id: 1,
      image: '../../assets/Img/SaludYTrabajo/elementosTrabajo.png',
      statement: 'Usar siempre los Elementos de Protección Personal',
      options: ['Si', 'No'],
      correctAnswer: 'Si',
    },
    {
      id: 2,
      image: '../../assets/Img/SaludYTrabajo/estirado.png',
      statement:
        'Realizar las pausas activas para disminuir la tensión muscular y el estrés',
      options: ['Si', 'No'],
      correctAnswer: 'Si',
    },
    {
      id: 3,
      image: '../../assets/Img/SaludYTrabajo/lugar-de-trabajo.png',
      statement:
        'Mantener siempre mi puesto en Orden y Aseo, pues soy un trabajador ejemplar.',
      options: ['Si', 'No'],
      correctAnswer: 'Si',
    },
    // Más preguntas pueden ir aquí
  ];

  score: number = 10;

  selectOption(
    questionsSet: Question[],
    questionIndex: number,
    optionIndex: number,
    isCorrect: boolean
  ): void {
    const question = questionsSet[questionIndex];

    if (question.selectedOptionIndex === optionIndex) return;

    question.selectedOptionIndex = optionIndex;

    if (!isCorrect && this.score > 0) {
      this.score--;
    }
  }

  selectTrueFalseAnswer(questionId: number, answer: string): void {
    const question = this.trueFalseQuestions.find((q) => q.id === questionId);
    if (question && (answer === 'true' || answer === 'false')) {
      const answerBool = answer === 'true';

      // Si la pregunta ya fue respondida y la respuesta cambia, o si es la primera vez que se responde
      if (question.selectedAnswer !== answerBool) {
        question.selectedAnswer = answerBool;

        // Si la respuesta es incorrecta, disminuir el puntaje
        if (question.isCorrect !== answerBool && this.score > 0) {
          this.score--;
        }
      }
    }
  }

  selectImageQuestionAnswer(questionId: number, event: Event): void {
    const target = event.target as HTMLSelectElement;
    const selectedOptionValue = target.value;

    const question = this.imageQuestions.find((q) => q.id === questionId);
    if (question) {
      const isCorrect = question.correctAnswer === selectedOptionValue;
      if (!isCorrect) {
        this.score = Math.max(0, this.score - 0.5);
        // Mostrar algún mensaje de retroalimentación al usuario
        console.log('Respuesta incorrecta. Inténtalo de nuevo.');
      } else {
        // Mensaje para respuesta correcta, opcional
        console.log('¡Correcto!');
      }
    }
  }

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.pruebaLectoEscritura = this.fb.group({});
  }

  buscarCedula() {
    localStorage.setItem('cedula', this.numeroCedula.toString() ?? '');
    const url = `${urlBack.url}/contratacion/buscarCandidato/${this.numeroCedula}`;
    this.http.get(url).subscribe(
      (response: any) => {
        this.mostrarFormulario = true; // Mostrar el formulario
        // Asume que response.data[0] contiene { nombre, edad, grado }
        const data = response.data[0];
        this.nombre =
          data.primer_nombre +
          ' ' +
          data.segundo_nombre +
          ' ' +
          data.primer_apellido +
          ' ' +
          data.segundo_apellido;
        this.edad = this.calcularEdad(data.fecha_nacimiento).toString();
        this.grado = data.estudiosExtra;
        console.log(response);
      },
      (error) => {
        if (
          error.error.message ===
          'No se encontraron datos para la cédula ingresada'
        ) {
          Swal.fire({
            title: 'Cédula no encontrada',
            text: 'Se procede a registrarte por favor.',
            icon: 'success',
            confirmButtonText: 'Aceptar',
          });
          this.mostrarFormulario = true; // También mostrar el formulario en caso de error
        }
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
        // You can send this URL to a server or save it directly in the browser.

        // Now, let's send the score and dataURL to the database
        const url = `${urlBack.url}/contratacion/pruebaSeguridadSalud`;
        const data = {
          numerodeceduladepersona: this.numeroCedula,
          porcentajeInduccionSeguridad: this.score,
          evidenciaInduccionSeguridad: dataURL, // Use the actual dataURL here
        };

        this.http.post(url, data).subscribe(
          (response: any) => {
            console.log(response);
            Swal.fire({
              title: 'Prueba enviada',
              text: 'Gracis por terminar el test. Tu resultado ha sido enviado.',
              icon: 'success',
              confirmButtonText: 'Accept',
            });
          },
          (error) => {
            console.error(error);
            Swal.fire({
              title: 'Error al enviar la prueba',
              text: 'Ocurrió un error al enviar la prueba. Por favor, inténtalo de nuevo.',
              icon: 'error',
              confirmButtonText: 'Accept',
            });
          }
        );
      });
    } else {
      console.log('The container element was not found.');
    }
  }
}
