/** Datos de la ficha «Crea tu ejercicio» — misma forma al crear, ver y editar. */

import type { Tarea } from '@/types'
import type { TareaPizarraData } from '@/components/tactical-board/types'
import { emptyTareaPizarra } from '@/components/tactical-board/types'
import { applyAutoLoadToTarea } from '@/lib/tacticalMetrics'
import { desarrolloFromTarea, reglasFromTarea, variantesFromReglas } from '@/lib/tareaNarrative'

export type TareaFichaVariant = 'campo' | 'margen' | 'portero' | 'all'

export interface TareaCreatorData {
  titulo: string
  categoria_id?: string
  modalidad?: string
  num_jugadores_min: number
  num_porteros: number
  descripcion?: string
  desarrollo?: string
  reglas?: string
  variantes?: string[]
  anotaciones?: string
  complejidad?: string
  fase_juego?: string
  principio_tactico?: string
  subprincipio_tactico?: string
  objetivos_tacticos: string[]
  objetivos_tecnicos: string[]
  orientaciones_fisicas: string[]
  etiquetas_fisicas: string[]
  tags?: string[]
  consignas_ofensivas?: string[]
  consignas_defensivas?: string[]
  num_series: number
  duracion_serie: number
  duracion_total: number
  tiempo_descanso: number
  espacio_largo?: number
  espacio_ancho?: number
  espacio_forma?: string
  dificultad?: number
  complejidad_go?: number
  complejidad_pes?: number
  densidad?: string
  tipo_esfuerzo?: string
  m2_por_jugador?: number
  fc_esperada_min?: number
  fc_esperada_max?: number
  nivel_cognitivo?: number
  es_complementaria?: boolean
  tarea_origen_id?: string
  tipo_variante?: string
  grafico_data?: TareaPizarraData
}

const asList = (val: unknown): string[] => {
  if (Array.isArray(val)) return val.filter((x): x is string => typeof x === 'string' && !!x)
  if (typeof val === 'string' && val.trim()) {
    return val.split('\n').map((s) => s.trim()).filter(Boolean)
  }
  return []
}

function categoriaCodigo(tarea: Partial<Tarea> | null | undefined): string | undefined {
  const codigo = tarea?.categoria?.codigo
  if (codigo) return codigo
  const id = tarea?.categoria_id
  if (!id) return undefined
  // El creador usa códigos (RND); la BD guarda UUID
  if (/^[0-9a-f-]{36}$/i.test(id)) return undefined
  return id
}

export function isTareaMadre(tarea?: { tarea_origen_id?: string | null } | null): boolean {
  return !tarea?.tarea_origen_id
}

export function emptyTareaForm(
  jugadores: number,
  defaultCategoria?: string,
  variant?: TareaFichaVariant
): TareaCreatorData {
  return {
    titulo: '',
    categoria_id: defaultCategoria,
    modalidad: variant === 'margen' ? 'general' : undefined,
    num_jugadores_min: jugadores,
    num_porteros: variant === 'portero' ? 1 : 0,
    descripcion: '',
    desarrollo: '',
    reglas: '',
    anotaciones: '',
    complejidad: '',
    fase_juego: undefined,
    principio_tactico: undefined,
    subprincipio_tactico: undefined,
    objetivos_tacticos: [],
    objetivos_tecnicos: [],
    orientaciones_fisicas: [],
    etiquetas_fisicas: [],
    num_series: 2,
    duracion_serie: 8,
    duracion_total: 16,
    tiempo_descanso: 1,
    espacio_largo: undefined,
    espacio_ancho: undefined,
    dificultad: 3,
    complejidad_go: undefined,
    complejidad_pes: undefined,
    es_complementaria: variant === 'margen',
    tipo_variante: 'original',
    grafico_data: emptyTareaPizarra,
  }
}

/** Hidrata la ficha del creador desde una tarea persistida. */
export function tareaToCreatorData(
  tarea: Partial<Tarea> | null | undefined,
  variant: TareaFichaVariant = 'campo'
): TareaCreatorData {
  const base = emptyTareaForm(tarea?.num_jugadores_min || 16, undefined, variant)
  if (!tarea) return base
  const desarrollo = desarrolloFromTarea(tarea)
  return {
    ...base,
    titulo: tarea.titulo || '',
    categoria_id: categoriaCodigo(tarea) || base.categoria_id,
    modalidad: tarea.modalidad || base.modalidad,
    num_jugadores_min: tarea.num_jugadores_min || base.num_jugadores_min,
    num_porteros: tarea.num_porteros ?? base.num_porteros,
    descripcion: desarrollo,
    desarrollo,
    reglas: reglasFromTarea(tarea),
    anotaciones: tarea.anotaciones || '',
    complejidad: tarea.complejidad || '',
    fase_juego: tarea.fase_juego,
    principio_tactico: tarea.principio_tactico,
    subprincipio_tactico: tarea.subprincipio_tactico,
    objetivos_tacticos: asList(tarea.objetivos_tacticos),
    objetivos_tecnicos: asList(tarea.objetivos_tecnicos),
    orientaciones_fisicas: asList(tarea.orientaciones_fisicas),
    etiquetas_fisicas: asList(tarea.etiquetas_fisicas),
    num_series: tarea.num_series || 1,
    duracion_serie: tarea.duracion_serie || tarea.duracion_total || 8,
    duracion_total: tarea.duracion_total || 0,
    tiempo_descanso: tarea.tiempo_descanso ?? 1,
    espacio_largo: tarea.espacio_largo,
    espacio_ancho: tarea.espacio_ancho,
    espacio_forma: tarea.espacio_forma,
    dificultad: tarea.dificultad,
    densidad: tarea.densidad,
    tipo_esfuerzo: tarea.tipo_esfuerzo,
    m2_por_jugador: tarea.m2_por_jugador,
    fc_esperada_min: tarea.fc_esperada_min,
    fc_esperada_max: tarea.fc_esperada_max,
    nivel_cognitivo: tarea.nivel_cognitivo,
    es_complementaria: tarea.es_complementaria,
    tarea_origen_id: tarea.tarea_origen_id,
    tipo_variante: tarea.tipo_variante || (tarea.tarea_origen_id ? 'adaptacion' : 'original'),
    grafico_data: (tarea.grafico_data as TareaPizarraData) || emptyTareaPizarra,
  }
}

/** Payload de escritura: mismos campos que el creador persiste. */
export function payloadFromCreatorForm(form: TareaCreatorData): Record<string, unknown> {
  const desarrollo = (form.desarrollo || form.descripcion || '').trim()
  const reglas = (form.reglas || '').trim()
  const loaded = applyAutoLoadToTarea({
    ...form,
    espacio_forma: form.espacio_forma || 'rectangular',
  })
  return {
    titulo: loaded.titulo,
    categoria_id: loaded.categoria_id,
    modalidad: loaded.modalidad,
    desarrollo: desarrollo || undefined,
    descripcion: desarrollo || undefined,
    reglas,
    variantes: variantesFromReglas(reglas),
    anotaciones: (loaded.anotaciones || '').trim() || undefined,
    num_series: loaded.num_series,
    duracion_serie: loaded.duracion_serie,
    tiempo_descanso: loaded.tiempo_descanso,
    duracion_total: loaded.duracion_total,
    espacio_largo: loaded.espacio_largo,
    espacio_ancho: loaded.espacio_ancho,
    espacio_forma: loaded.espacio_forma,
    num_jugadores_min: loaded.num_jugadores_min,
    num_porteros: loaded.num_porteros,
    fase_juego: loaded.fase_juego || undefined,
    principio_tactico: loaded.principio_tactico || undefined,
    subprincipio_tactico: loaded.subprincipio_tactico || undefined,
    objetivos_tacticos: loaded.objetivos_tacticos,
    objetivos_tecnicos: loaded.objetivos_tecnicos,
    tags: loaded.objetivos_tacticos,
    consignas_ofensivas: loaded.objetivos_tecnicos,
    consignas_defensivas: loaded.consignas_defensivas || [],
    orientaciones_fisicas: loaded.orientaciones_fisicas,
    etiquetas_fisicas: loaded.etiquetas_fisicas,
    complejidad: loaded.complejidad || undefined,
    dificultad: loaded.dificultad,
    densidad: loaded.densidad,
    nivel_cognitivo: loaded.nivel_cognitivo,
    tipo_esfuerzo: loaded.tipo_esfuerzo,
    m2_por_jugador: loaded.m2_por_jugador,
    fc_esperada_min: loaded.fc_esperada_min,
    fc_esperada_max: loaded.fc_esperada_max,
    tipo_variante: loaded.tipo_variante || (loaded.tarea_origen_id ? 'adaptacion' : 'original'),
    grafico_data: loaded.grafico_data,
  }
}
