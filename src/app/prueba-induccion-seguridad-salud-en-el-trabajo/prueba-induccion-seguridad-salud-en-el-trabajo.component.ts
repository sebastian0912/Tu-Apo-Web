import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { urlBack } from '../model/Usuario';

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
}

interface TrueFalseQuestion {
  id: number; // Un identificador único por si acaso
  text: string;
  image: string;
  selectedAnswer: boolean | null; // null significa que el usuario aún no ha seleccionado una respuesta
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
  imports: [RouterOutlet,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    MatInputModule,
    MatButtonModule,],
  templateUrl: './prueba-induccion-seguridad-salud-en-el-trabajo.component.html',
  styleUrl: './prueba-induccion-seguridad-salud-en-el-trabajo.component.css'
})
export class PruebaInduccionSeguridadSaludEnElTrabajoComponent {
  pruebaLectoEscritura: FormGroup;
  mostrarFormulario: boolean = false;
  numeroCedula!: number;

  nombre: string = '';
  edad: string = '';
  grado: string = '';

  puntaje = 100;


  questions: Question[] = [
    {
      text: 'Una de mis responsabilidades como trabajador frente al Sistema de Gestión de Seguridad y Salud en el trabajo es:',
      options: [
        { text: 'No reportar los accidentes de trabajo.', isCorrect: false, image: '../../assets/Img/SaludYTrabajo/accidente.png' },
        { text: 'Suministrar información clara, completa y veraz de mi estado de salud.', isCorrect: true, image: '../../assets/Img/SaludYTrabajo/salud-mental.png' },
        { text: 'No respetar las señales de peligro.', isCorrect: false, image: '../../assets/Img/SaludYTrabajo/no-entrar.png' }
      ]
    },
    // Más preguntas pueden ir aquí
  ];

  questions2: Question[] = [
    {
      text: '"Tan pronto ocurre un accidente de Trabajo, yo debo":',
      options: [
        { text: 'Asustarme, dando alaridos', isCorrect: false, image: '../../assets/Img/SaludYTrabajo/chico.png' },
        { text: 'Sentarme a esperar a ver qué pasa', isCorrect: false, image: '../../assets/Img/SaludYTrabajo/sala-de-espera.png' },
        { text: 'Informar al jefe inmediato y a la empresa temporal 10 sucedido', isCorrect: true, image: '../../assets/Img/SaludYTrabajo/doctor.png' }
      ]
    },
    // Más preguntas pueden ir aquí
  ];

  trueFalseQuestions: TrueFalseQuestion[] = [
    {
      id: 1,
      text: 'El comité de Convivencia Laboral vela por el bienestar de los trabajadores',
      image: '../../assets/Img/SaludYTrabajo/director-de-la-silla.png',
      selectedAnswer: null,
    },
    // Agrega más preguntas aquí
    {
      id: 2,
      text: 'El comité de Convivencia Laboral vela por el bienestar de los trabajadores',
      image: '../../assets/Img/SaludYTrabajo/contratista.png',
      selectedAnswer: null,
    },
  ];

  imageQuestions: ImageQuestion[] = [
    {
      id: 1,
      image: '../../assets/Img/SaludYTrabajo/accidenteAlmacen.png',
      statement: 'Selecciona la afirmación verdadera sobre la imagen.',
      options: ['Afirmación A', 'Afirmación B', 'Afirmación C'],
      correctAnswer: 'Afirmación B'
    },
    {
      id: 2,
      image: '../../assets/Img/SaludYTrabajo/resbaladizo.png',
      statement: 'Selecciona la afirmación verdadera sobre la imagen.',
      options: ['Afirmación A', 'Afirmación B', 'Afirmación C'],
      correctAnswer: 'Afirmación B'
    },
    {
      id: 3,
      image: '../../assets/Img/SaludYTrabajo/dolorEspalda.png',
      statement: 'Selecciona la afirmación verdadera sobre la imagen.',
      options: ['Afirmación A', 'Afirmación B', 'Afirmación C'],
      correctAnswer: 'Afirmación B'
    },
    {
      id: 4,
      image: '../../assets/Img/SaludYTrabajo/firmar.png',
      statement: 'Selecciona la afirmación verdadera sobre la imagen.',
      options: ['Afirmación A', 'Afirmación B', 'Afirmación C'],
      correctAnswer: 'Afirmación B'
    },

    // Más preguntas pueden ir aquí
  ];


  imageQuestions2: ImageQuestion[] = [
    {
      id: 1,
      image: '../../assets/Img/SaludYTrabajo/elementosTrabajo.png',
      statement: 'Usar siempre los Elementos de Protección Personal',
      options: ['Si', 'No'],
      correctAnswer: 'Si'
    },
    {
      id: 2,
      image: '../../assets/Img/SaludYTrabajo/estirado.png',
      statement: 'Realizar las pausas activas para disminuir la tensión muscular y el estrés',
      options: ['Si', 'No'],
      correctAnswer: 'Si'
    },
    {
      id: 3,
      image: '../../assets/Img/SaludYTrabajo/lugar-de-trabajo.png',
      statement: 'Mantener siempre mi puesto en Orden y Aseo, pues soy un trabajador ejemplar.',
      options: ['Si', 'No'],
      correctAnswer: 'Si'
    },
    // Más preguntas pueden ir aquí
  ];
  
  
  

  score: number = 10;

  selectOption(questionIndex: number, optionIndex: number, isCorrect: boolean): void {
    // Primero deseleccionar cualquier respuesta previamente seleccionada
    this.questions[questionIndex].options.forEach((option, index) => {
      if (index !== optionIndex && option.isCorrect === false) {
        this.score = Math.min(this.score + 1, 10); // Añadir un punto si previamente había seleccionado una opción incorrecta
      }
    });

    // Luego procesar la selección actual
    if (!isCorrect && this.score > 0) {
      this.score--; // Restar un punto si la opción seleccionada es incorrecta
    }
  }

  selectTrueFalseAnswer(questionId: number, answer: string) {
    const question = this.trueFalseQuestions.find(q => q.id === questionId);
    if (question && answer != null) {
      question.selectedAnswer = answer === 'true';
    }
  }

  selectImageQuestionAnswer(questionId: number, event: Event): void {
    const target = event.target as HTMLSelectElement; // Aquí haces una aserción de tipo
    const selectedOptionValue = target.value;
    
    if (!selectedOptionValue) {
      console.log('No se seleccionó ninguna opción válida.');
      return;
    }
    
    const question = this.imageQuestions.find(q => q.id === questionId);
    if (question) {
      const isCorrect = question.correctAnswer === selectedOptionValue;
      if (!isCorrect) {
        this.score = Math.max(0, this.score - 1); // Evita puntajes negativos
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
    console.log(this.puntaje);
  }
}
