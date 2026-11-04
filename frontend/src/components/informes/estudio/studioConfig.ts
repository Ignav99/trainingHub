import type { InformeKind } from '@/lib/api/informesEstudio'
import { AMBITO_COMPETICION, type PartidoAmbito } from '@/lib/partidoAmbito'
import { ENTRENAMIENTO } from './reports/entrenamiento'
import { JUGADORES } from './reports/jugadores'
import { PARTIDO } from './reports/partido'
import { TEMPORADA } from './reports/temporada'
import { bloquesDe } from './reports/assemble'
import type { ReportDef } from './reports/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const REPORTS: Record<InformeKind, ReportDef<any>> = {
  partido: PARTIDO,
  entrenamiento: ENTRENAMIENTO,
  jugadores: JUGADORES,
  temporada: TEMPORADA,
}

export const KINDS: { id: InformeKind; label: string; hint: string }[] = [
  { id: 'partido', label: 'Partido', hint: 'Un partido: once, cifras, goles y faltas' },
  { id: 'entrenamiento', label: 'Entrenamientos', hint: 'Un microciclo o un periodo de sesiones' },
  { id: 'jugadores', label: 'Jugadores', hint: 'Ficha por jugador y vista de plantilla' },
  { id: 'temporada', label: 'Temporada', hint: 'Resultados, goles, faltas y minutos' },
]

export interface BloqueState {
  id: string
  on: boolean
}

export interface KindConfig {
  bloques: BloqueState[]
  titulo: string
}

export interface StudioConfig {
  kind: InformeKind
  porKind: Record<InformeKind, KindConfig>
  paleta: string
  accent: string
  highlight: string
  comentarios: boolean
  ambito: PartidoAmbito
  desde: string
  hasta: string
  entrenoModo: 'periodo' | 'microciclo'
}

export interface Preset {
  id: string
  nombre: string
  kind: InformeKind
  bloques: BloqueState[]
  titulo: string
  paleta: string
  accent: string
  highlight: string
  comentarios: boolean
}

export const PALETAS: { id: string; label: string; accent: string; highlight: string }[] = [
  { id: 'rosa', label: 'Rosa y lima', accent: '#e8157d', highlight: '#c8ff4a' },
  { id: 'rojo', label: 'Rojo y amarillo', accent: '#d7191f', highlight: '#ffd60a' },
  { id: 'azul', label: 'Azul y cielo', accent: '#1d4ed8', highlight: '#8fd3ff' },
  { id: 'verde', label: 'Verde y lima', accent: '#0f8a4b', highlight: '#d4f878' },
  { id: 'naranja', label: 'Naranja y arena', accent: '#ef6a1a', highlight: '#ffe08a' },
  { id: 'morado', label: 'Morado y lima', accent: '#6d28d9', highlight: '#c8ff4a' },
]

export function defaultBloques(kind: InformeKind): BloqueState[] {
  return bloquesDe(REPORTS[kind]).map((b) => ({ id: b.id, on: true }))
}

/** Keeps the user's order and switches, adding blocks introduced later and dropping removed ones. */
export function normalizarBloques(kind: InformeKind, saved: BloqueState[] | undefined): BloqueState[] {
  const ids = bloquesDe(REPORTS[kind]).map((b) => b.id)
  const known = (saved ?? []).filter((b) => ids.includes(b.id))
  const missing = ids.filter((id) => !known.some((b) => b.id === id)).map((id) => ({ id, on: true }))
  return [...known, ...missing]
}

export function defaultConfig(): StudioConfig {
  const porKind = Object.fromEntries(
    KINDS.map((k) => [k.id, { bloques: defaultBloques(k.id), titulo: '' }])
  ) as Record<InformeKind, KindConfig>
  return {
    kind: 'partido',
    porKind,
    paleta: 'rosa',
    accent: PALETAS[0].accent,
    highlight: PALETAS[0].highlight,
    comentarios: false,
    ambito: AMBITO_COMPETICION,
    desde: '',
    hasta: '',
    entrenoModo: 'periodo',
  }
}

const CONFIG_KEY = 'informes-estudio:v1'
const PRESETS_KEY = 'informes-estudio:presets:v1'

export function loadConfig(): StudioConfig {
  const base = defaultConfig()
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (!raw) return base
    const saved = JSON.parse(raw) as Partial<StudioConfig>
    const porKind = { ...base.porKind }
    for (const k of KINDS) {
      const s = saved.porKind?.[k.id]
      porKind[k.id] = {
        titulo: typeof s?.titulo === 'string' ? s.titulo : '',
        bloques: normalizarBloques(k.id, s?.bloques),
      }
    }
    return {
      ...base,
      ...saved,
      kind: KINDS.some((k) => k.id === saved.kind) ? (saved.kind as InformeKind) : base.kind,
      porKind,
    }
  } catch {
    return base
  }
}

export function saveConfig(cfg: StudioConfig) {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg))
  } catch {
    // storage full or disabled: the studio keeps working without memory
  }
}

export function loadPresets(): Preset[] {
  try {
    const raw = localStorage.getItem(PRESETS_KEY)
    const list = raw ? (JSON.parse(raw) as Preset[]) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function savePresets(list: Preset[]) {
  try {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(list))
  } catch {
    // ignore
  }
}
