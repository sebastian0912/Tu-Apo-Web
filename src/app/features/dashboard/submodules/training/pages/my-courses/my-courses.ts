import { Component, ChangeDetectionStrategy, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { TrainingS, ResumenCurso } from '../../service/training-s';
import { TrainingOffline } from '../../service/training-offline';

/**
 * "Mis cursos": la pantalla de entrada del colaborador.
 *
 * Diseñada para un operario en campo con un celular de gama baja y sol de frente: tarjetas
 * grandes, un solo botón por curso, y el estado dicho en palabras además de en color — quien
 * mira esto a mediodía en un invernadero no distingue un chip verde de uno amarillo.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-my-courses',
  imports: [CommonModule, MatIconModule, MatProgressBarModule],
  templateUrl: './my-courses.html',
  styleUrl: './my-courses.css'
})
export class MyCourses implements OnInit {
  private api = inject(TrainingS);
  private router = inject(Router);
  readonly offline = inject(TrainingOffline);

  readonly cursos = signal<ResumenCurso[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  /** Lo pendiente primero: es lo que la persona vino a hacer. */
  readonly ordenados = computed(() =>
    [...this.cursos()].sort((a, b) => {
      const pesoA = a.estado_matricula === 'APROBADO' ? 1 : 0;
      const pesoB = b.estado_matricula === 'APROBADO' ? 1 : 0;
      if (pesoA !== pesoB) return pesoA - pesoB;
      return b.porcentaje_curso - a.porcentaje_curso;
    })
  );

  async ngOnInit(): Promise<void> {
    await this.cargar();
    await this.offline.refrescarPendientes();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.cursos.set(await this.api.misCursos());
    } catch (err) {
      // El interceptor ya sirve la última versión cacheada si la hay; si llegamos aquí es que
      // no hay ni caché. Decir SIEMPRE "conéctate a internet" era desorientar a quien tiene
      // internet perfectamente y está viendo otra cosa — un fallo del servidor, por ejemplo.
      this.error.set(MyCourses.explicar(err));
    } finally {
      this.cargando.set(false);
    }
  }

  /** Qué decirle a la persona según lo que falló de verdad. */
  static explicar(err: unknown): string {
    const status = err instanceof HttpErrorResponse ? err.status : -1;
    if (status === 0) {
      return 'Parece que no hay conexión. Cuando vuelvas a tener internet, inténtalo de nuevo.';
    }
    if (status === 401 || status === 403) {
      return 'Tu sesión expiró. Vuelve a iniciar sesión y entra otra vez.';
    }
    if (status === 404) {
      return 'Todavía no apareces registrado en capacitaciones. Avisa a tu coordinador para '
           + 'que te asignen tus cursos.';
    }
    if (status === 429) {
      return 'Hay demasiadas solicitudes en este momento. Espera unos segundos y reintenta.';
    }
    if (status >= 500) {
      return 'El servidor tuvo un problema al traer tus cursos. Vuelve a intentar en un momento; '
           + 'si sigue igual, avisa a soporte.';
    }
    return 'No pudimos cargar tus cursos. Vuelve a intentar en un momento.';
  }

  abrir(curso: ResumenCurso): void {
    this.router.navigate(['/dashboard/capacitaciones', curso.enrollment_id]);
  }

  verCertificados(): void {
    this.router.navigate(['/dashboard/capacitaciones/certificados']);
  }

  /** Etiqueta en palabras. El color acompaña, no informa por sí solo. */
  etiqueta(curso: ResumenCurso): string {
    if (curso.estado_matricula === 'APROBADO') return 'Aprobado';
    if (curso.estado_matricula === 'REPROBADO') return 'No aprobado';
    if (curso.contenido_completo && curso.requiere_evaluacion) return 'Falta la evaluación';
    if (curso.porcentaje_curso > 0) return 'En curso';
    return 'Sin empezar';
  }

  clase(curso: ResumenCurso): string {
    if (curso.estado_matricula === 'APROBADO') return 'estado-ok';
    if (curso.estado_matricula === 'REPROBADO') return 'estado-mal';
    if (curso.contenido_completo && curso.requiere_evaluacion) return 'estado-atencion';
    return 'estado-curso';
  }

  textoBoton(curso: ResumenCurso): string {
    if (curso.estado_matricula === 'APROBADO') return 'Ver curso';
    if (curso.porcentaje_curso > 0) return 'Continuar';
    return 'Empezar';
  }
}
