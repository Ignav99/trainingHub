import type { FaseSesion, SesionBloque, SesionTarea } from '@/types'

export type TipoBloqueSesion = FaseSesion | 'videoanalisis'

export type AddBloqueKind = 'activacion' | 'desarrollo' | 'vuelta_calma' | 'videoanalisis'

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
  { kind: 'desarrollo', label: 'Desarrollo', description: 'Bloque principal de contenido' },
  { kind: 'vuelta_calma', label: 'Vuelta a la calma', description: 'Estiramientos y cierre físico' },
  { kind: 'videoanalisis', label: 'Videoanálisis', description: 'Revisión en sala o campo' },
]

export function bloqueSupportsTareas(tipo: TipoBloqueSesion): boolean {
  return tipo !== 'videoanalisis'
}

export function faseSesionFromBloque(bloque: SesionBloque): FaseSesion | null {
  if (bloque.tipo === 'videoanalisis') return null
  return bloque.tipo as FaseSesion
}

export function nextDesarrolloTipo(bloques: SesionBloque[]): FaseSesion | null {
  for (const d of ALL_DESARROLLO_FASES) {
    if (!bloques.some((b) => b.tipo === d)) return d
  }
  return null
}

export function createBloque(kind: AddBloqueKind, bloques: SesionBloque[]): SesionBloque | null {
  const orden = bloques.length
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `bloque-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

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
    default:
      return null
  }
}

export function canRemoveBloque(bloque: SesionBloque, tareas: SesionTarea[]): boolean {
  if (bloque.tipo === 'videoanalisis') return true
  return !tareas.some((t) => t.fase_sesion === bloque.tipo)
}

/** Resuelve bloques guardados o los infiere solo desde tareas existentes (sin defaults vacíos). */
export function resolveEstructura(
  estructura: SesionBloque[] | undefined | null,
  tareas: SesionTarea[] | undefined
): SesionBloque[] {
  if (estructura && estructura.length > 0) {
    return [...estructura].sort((a, b) => a.orden - b.orden)
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

  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `bloque-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  return { id, tipo: fase, label: FASE_LABELS[fase], orden: bloques.length }
}

export function ensureBloqueForFase(bloques: SesionBloque[], fase: FaseSesion): SesionBloque[] {
  const created = createBloqueForFase(fase, bloques)
  return created ? normalizeOrden([...bloques, created]) : bloques
}
