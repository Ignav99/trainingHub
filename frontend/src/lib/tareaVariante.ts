/** Helpers para mapear una tarea madre → prefill del creador de variantes. */

import type { Tarea } from '@/types'
import type { TareaCreatorData } from '@/components/tareas/TareaCreatorFullscreen'
import type { TareaPizarraData } from '@/components/tactical-board/types'

export function madreToCreatorPrefill(
  madre: Tarea,
  opts?: { tipo_variante?: string; titulo?: string }
): Partial<TareaCreatorData> & { madre_titulo?: string } {
  const origenId = madre.tarea_origen_id || madre.id
  const tipo = opts?.tipo_variante || 'adaptacion'
  return {
    madre_titulo: madre.titulo,
    tarea_origen_id: origenId,
    tipo_variante: tipo,
    titulo:
      opts?.titulo ||
      `${madre.titulo} · ${
        tipo === 'progresion'
          ? 'Progresión'
          : tipo === 'regresion'
            ? 'Regresión'
            : tipo === 'reglas'
              ? 'Reglas'
              : tipo === 'contexto'
                ? 'Contexto'
                : 'Variante'
      }`,
    categoria_id: madre.categoria_id || madre.categoria?.id || madre.categoria?.codigo,
    modalidad: madre.modalidad,
    num_jugadores_min: madre.num_jugadores_min,
    num_porteros: madre.num_porteros ?? 0,
    desarrollo: madre.desarrollo || madre.descripcion || '',
    descripcion: madre.desarrollo || madre.descripcion || '',
    reglas: madre.reglas || '',
    anotaciones: madre.anotaciones || '',
    fase_juego: madre.fase_juego,
    principio_tactico: madre.principio_tactico,
    subprincipio_tactico: madre.subprincipio_tactico,
    objetivos_tacticos: madre.objetivos_tacticos || [],
    objetivos_tecnicos: madre.objetivos_tecnicos || [],
    orientaciones_fisicas: madre.orientaciones_fisicas || [],
    etiquetas_fisicas: madre.etiquetas_fisicas || [],
    num_series: madre.num_series ?? 2,
    duracion_serie: madre.duracion_serie ?? 8,
    duracion_total: madre.duracion_total,
    tiempo_descanso: madre.tiempo_descanso ?? 60,
    espacio_largo: madre.espacio_largo,
    espacio_ancho: madre.espacio_ancho,
    espacio_forma: madre.espacio_forma,
    grafico_data: (madre.grafico_data as TareaPizarraData) || undefined,
    complejidad: madre.complejidad,
    densidad: madre.densidad,
    nivel_cognitivo: madre.nivel_cognitivo,
    tipo_esfuerzo: madre.tipo_esfuerzo,
  }
}
