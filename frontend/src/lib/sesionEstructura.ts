import type { FaseSesion, PartidoCondicionadoData, SesionBloque, SesionTarea, TipoBloqueSesion } from '@/types'

export type { TipoBloqueSesion }

export type AddBloqueKind =
  | 'activacion'
  | 'desarrollo'
  | 'vuelta_calma'
  | 'videoanalisis'
  | 'partido_condicionado'

export const FASE_LABELS: Record<FaseSesion, string> = {
  activacion: 'Activación',
  desarrollo_1: 'Desarrollo 1',
  desarrollo_2: 'Desarrollo 2',
  desarrollo_3: 'Desarrollo 3',
  desarrollo_4: 'Desarrollo 4',
  desarrollo_5: 'Desarrollo 5',
  desarrollo_6: 'Desarrollo 6',
  vuelta_calma: 'Vuelta a la calma',
}

export const ALL_DESARROLLO_FASES: FaseSesion[] = [
  'desarrollo_1',
  'desarrollo_2',
  'desarrollo_3',
  'desarrollo_4',
  'desarrollo_5',
  'desarrollo_6',
]

export const ADD_BLOQUE_OPTIONS: { kind: AddBloqueKind; label: string; description: string }[] = [
  { kind: 'activacion', label: 'Activación', description: 'Calentamiento y preparación' },
  { kind: 'desarrollo', label: 'Desarrollo', description: 'Bloque de tareas (juegos reducidos, posesiones…)' },
  {
    kind: 'partido_condicionado',
    label: 'Partido condicionado',
    description: '11 vs 11 a campo normal: alineaciones, normas y carga PCO',
  },
  { kind: 'vuelta_calma', label: 'Vuelta a la calma', description: 'Estiramientos y cierre físico' },
  { kind: 'videoanalisis', label: 'Videoanálisis', description: 'Revisión en sala o campo' },
]

export function emptyPartido(duracionMin = 20): PartidoCondicionadoData {
  return {
    duracion_min: duracionMin,
    sistema_peto: '4-3-3',
    sistema_sin_peto: '4-3-3',
    equipo_peto: {},
    equipo_sin_peto: {},
    fuera: [],
    objetivo: '',
    normas: '',
    pizarra: null,
    abp_ids: [],
  }
}

export function isPartidoCondicionado(bloque: Pick<SesionBloque, 'tipo'>): boolean {
  return bloque.tipo === 'partido_condicionado'
}

export function bloqueSupportsTareas(tipo: TipoBloqueSesion): boolean {
  return tipo !== 'videoanalisis' && tipo !== 'partido_condicionado'
}

export function faseSesionFromBloque(bloque: SesionBloque): FaseSesion | null {
  if (bloque.tipo === 'videoanalisis' || bloque.tipo === 'partido_condicionado') return null
  return bloque.tipo as FaseSesion
}

export function nextDesarrolloTipo(bloques: SesionBloque[]): FaseSesion | null {
  for (const d of ALL_DESARROLLO_FASES) {
    if (!bloques.some((b) => b.tipo === d)) return d
  }
  return null
}

function newBloqueId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `bloque-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function createBloque(kind: AddBloqueKind, bloques: SesionBloque[]): SesionBloque | null {
  const orden = bloques.length
  const id = newBloqueId()

  switch (kind) {
    case 'activacion':
      if (bloques.some((b) => b.tipo === 'activacion')) return null
      return { id, tipo: 'activacion', label: 'Activación', orden }
    case 'desarrollo': {
      const tipo = nextDesarrolloTipo(bloques)
      if (!tipo) return null
      return { id, tipo, label: FASE_LABELS[tipo], orden }
    }
    case 'vuelta_calma':
      if (bloques.some((b) => b.tipo === 'vuelta_calma')) return null
      return { id, tipo: 'vuelta_calma', label: 'Vuelta a la calma', orden }
    case 'videoanalisis':
      return { id, tipo: 'videoanalisis', label: 'Videoanálisis', orden }
    case 'partido_condicionado':
      return {
        id,
        tipo: 'partido_condicionado',
        label: 'Partido condicionado',
        orden,
        duracion_objetivo: 20,
        partido: emptyPartido(20),
      }
    default:
      return null
  }
}

export function canRemoveBloque(bloque: SesionBloque, tareas: SesionTarea[]): boolean {
  if (bloque.tipo === 'videoanalisis' || bloque.tipo === 'partido_condicionado') return true
  return !tareas.some((t) => t.fase_sesion === bloque.tipo)
}

/** Resuelve bloques guardados o los infiere solo desde tareas existentes (sin defaults vacíos). */
export function resolveEstructura(
  estructura: SesionBloque[] | undefined | null,
  tareas: SesionTarea[] | undefined
): SesionBloque[] {
  if (estructura && estructura.length > 0) {
    return [...estructura]
      .map((b) =>
        b.tipo === 'partido_condicionado' && !b.partido
          ? { ...b, partido: emptyPartido(b.duracion_objetivo || 20) }
          : b
      )
      .sort((a, b) => a.orden - b.orden)
  }
  if (!tareas?.length) return []

  const order: FaseSesion[] = [
    'activacion',
    ...ALL_DESARROLLO_FASES,
    'vuelta_calma',
  ]
  const blocks: SesionBloque[] = []
  let orden = 0
  for (const fase of order) {
    if (tareas.some((t) => t.fase_sesion === fase)) {
      blocks.push({
        id: `legacy-${fase}`,
        tipo: fase,
        label: FASE_LABELS[fase],
        orden: orden++,
      })
    }
  }
  return blocks
}

export function normalizeOrden(bloques: SesionBloque[]): SesionBloque[] {
  return bloques.map((b, i) => ({ ...b, orden: i }))
}

/** Crea un bloque concreto si aún no existe (p. ej. al añadir tarea desde IA o biblioteca). */
export function createBloqueForFase(fase: FaseSesion, bloques: SesionBloque[]): SesionBloque | null {
  if (bloques.some((b) => b.tipo === fase)) return null
  if (fase === 'activacion' && bloques.some((b) => b.tipo === 'activacion')) return null
  if (fase === 'vuelta_calma' && bloques.some((b) => b.tipo === 'vuelta_calma')) return null

  return { id: newBloqueId(), tipo: fase, label: FASE_LABELS[fase], orden: bloques.length }
}

export function ensureBloqueForFase(bloques: SesionBloque[], fase: FaseSesion): SesionBloque[] {
  const created = createBloqueForFase(fase, bloques)
  return created ? normalizeOrden([...bloques, created]) : bloques
}

export function duracionBloquePartido(bloque: SesionBloque): number {
  if (bloque.tipo !== 'partido_condicionado') return 0
  return bloque.partido?.duracion_min || bloque.duracion_objetivo || 0
}
