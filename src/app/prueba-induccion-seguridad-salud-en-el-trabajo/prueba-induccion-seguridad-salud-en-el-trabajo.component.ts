import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { urlBack } from '../model/Usuario';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
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
import { PruebasService } from '../shared/service/pruebas/pruebas.service';
import { CandidatoService } from '../shared/service/candidato/candidato.service';

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
  numeroCedula!: any;
  CodigoContrato: string = '';

  nombre: string = '';
  edad: string = '';
  grado: string = '';
  typeMap: { [key: string]: number } = {
    pruebaLecto: 20,
    pruebaSst: 24,
  };
  uploadedFiles: { [key: string]: { file: File, fileName: string } } = {}; // Almacenar tanto el archivo como el nombre

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

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private pruebasService: PruebasService,
    private candidatoService: CandidatoService
  ) {
    this.pruebaLectoEscritura = this.fb.group({});
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

    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  }

  enviarRespuestas() {
    // Verificación de cédula
    if (this.numeroCedula === undefined) {
      Swal.fire({
        title: 'Error al enviar la prueba',
        text: 'Por favor, ingresa tu número de cédula.',
        icon: 'error',
        confirmButtonText: 'Aceptar',
      });
      return;
    }

    // Mostrar SweetAlert de "cargando"
    Swal.fire({
      title: 'Enviando...',
      text: 'Por favor, espere mientras procesamos tu prueba.',
      icon: 'info',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading(); // Mostrar el "cargando" animado
      }
    });

    // Selección del contenedor
    const contenedor = document.querySelector('.contenedor') as HTMLElement;
    if (contenedor) {
      html2canvas(contenedor).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const doc = new jsPDF();
        const pdfWidth = 180;
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        let trozosImagen = Math.ceil(pdfHeight / 297);
  
        for (let i = 0; i < trozosImagen; i++) {
          doc.addImage(imgData, 'PNG', 15, 15 + (i * -297), pdfWidth, pdfHeight);
          if (i < trozosImagen - 1) {
            doc.addPage();
          }
        }

        // Crear un archivo PDF y almacenarlo en una propiedad del componente
        this.uploadedFiles['pruebaSst'] = {
          file: new File([doc.output('blob')], 'pruebaSst.pdf', { type: 'application/pdf' }),
          fileName: 'pruebaSst.pdf'
        };

        // Llamada a la función para subir la prueba
        this.subirSST().then(() => {
          Swal.close(); // Cerrar el Swal de "cargando"
          Swal.fire({
            title: 'Prueba enviada',
            text: 'Tu prueba ha sido enviada exitosamente.',
            icon: 'success',
            confirmButtonText: 'Aceptar',
          });
        }).catch(() => {
          Swal.close(); // Cerrar el Swal de "cargando"
          Swal.fire({
            title: 'Error al enviar la prueba',
            text: 'Se produjo un error al enviar la prueba, por favor intenta nuevamente.',
            icon: 'error',
            confirmButtonText: 'Aceptar',
          });
        });
      }).catch((error) => {
        Swal.close(); // Cerrar el Swal de "cargando"
        Swal.fire({
          title: 'Error al procesar la prueba',
          text: 'Se produjo un error al generar la evidencia de tu prueba.',
          icon: 'error',
          confirmButtonText: 'Aceptar',
        });
        console.error('Error al generar la evidencia:', error);
      });
    } else {
      Swal.fire({
        title: 'Error',
        text: 'No se encontró el contenedor para generar la evidencia.',
        icon: 'error',
        confirmButtonText: 'Aceptar',
      });
    }
  }

  subirSST(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      console.log('Subiendo archivo de pruebaSst...', this.uploadedFiles);

      // Verificar si existe el archivo de pruebaSst
      const pruebaSst = this.uploadedFiles['pruebaSst'];
      if (!pruebaSst) {
        reject('No se ha encontrado el archivo de pruebaSst');
        return;
      }

      const { file, fileName } = pruebaSst; // Obtén el archivo y su nombre
      const title = fileName; // Título del archivo (nombre del archivo PDF)
      const type = this.typeMap['pruebaSst'] || 20; // Tipo definido en el mapa para pruebaSst (en este caso, 20)

      // Llamar al servicio para guardar el archivo
      this.pruebasService.guardarPrueba(title, this.numeroCedula, type, file, this.CodigoContrato)
        .subscribe(
          (response) => {
            console.log('Archivo de pruebaSst subido exitosamente:', response);
            resolve(true);
          },
          (error) => {
            console.error('Error al subir el archivo de pruebaSst:', error);
            reject('Error al subir el archivo de pruebaSst');
          }
        );
    });
  }


}
