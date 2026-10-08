/**
 * Pizarra completa copiada para pegarla en otra.
 * Vive fuera del store del editor: al cerrar una pizarra el store se reinicia
 * y, si el portapapeles estuviera ahí, la copia se perdería al abrir la siguiente.
 */

import type { ABPRolCampo } from './abpCampoRoles'
import type { Keyframe } from '../components/tactical-board/types'

/** Misma limpieza que los roles de ABP: sin dorsales ni texto, el rol no viaja. */
function normalizeCampoRoles(raw: unknown): ABPRolCampo[] {
  if (!Array.isArray(raw)) return []
  const roles: ABPRolCampo[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as { id?: unknown; dorsales?: unknown; texto?: unknown }
    const dorsales: string[] = []
    const source = Array.isArray(row.dorsales) ? row.dorsales : []
    for (const dorsal of source) {
      const text = String(dorsal ?? '').trim()
      if (text && !dorsales.includes(text)) dorsales.push(text)
    }
    const texto = String(row.texto ?? '').trim()
    if (!dorsales.length && !texto) continue
    roles.push({
      id: String(row.id || '').trim() || `rol-${roles.length + 1}`,
      dorsales,
      texto,
    })
  }
  return roles
}

function frameHasContent(frame: { elements?: unknown[]; arrows?: unknown[]; zones?: unknown[] } | null | undefined): boolean {
  if (!frame) return false
  return (frame.elements?.length || 0) + (frame.arrows?.length || 0) + (frame.zones?.length || 0) > 0
}

export interface CopiedPizarra {
  elements: any[]
  arrows: any[]
  zones: any[]
  pitchType: 'full' | 'half'
  tipo: 'static' | 'animated'
  frames: Keyframe[]
  campoRoles: ABPRolCampo[]
}

const STORAGE_KEY = 'traininghub:pizarra-clipboard:v1'

let memory: CopiedPizarra | null = null
let hydrated = false
const listeners = new Set<() => void>()

function storage(): Storage | null {
  try {
    if (typeof sessionStorage === 'undefined') return null
    return sessionStorage
  } catch {
    return null
  }
}

function asList(value: unknown): any[] {
  return Array.isArray(value) ? value : []
}

export function diagramHasPieces(diagram: {
  elements?: unknown[]
  arrows?: unknown[]
  zones?: unknown[]
} | null | undefined): boolean {
  if (!diagram) return false
  return (diagram.elements?.length || 0) + (diagram.arrows?.length || 0) + (diagram.zones?.length || 0) > 0
}

export function pizarraHasContent(board: {
  elements?: unknown[]
  arrows?: unknown[]
  zones?: unknown[]
  tipo?: string
  frames?: { elements?: unknown[]; arrows?: unknown[]; zones?: unknown[] }[]
} | null | undefined): boolean {
  if (!board) return false
  if (diagramHasPieces(board)) return true
  if (board.tipo !== 'animated') return false
  return (board.frames || []).some((frame) => frameHasContent(frame))
}

function parseStored(raw: string): CopiedPizarra | null {
  const data = JSON.parse(raw) as Partial<CopiedPizarra>
  const board: CopiedPizarra = {
    elements: asList(data.elements),
    arrows: asList(data.arrows),
    zones: asList(data.zones),
    pitchType: data.pitchType === 'half' ? 'half' : 'full',
    tipo: data.tipo === 'animated' ? 'animated' : 'static',
    frames: asList(data.frames) as Keyframe[],
    campoRoles: normalizeCampoRoles(data.campoRoles),
  }
  return pizarraHasContent(board) ? board : null
}

export function readPizarraClipboard(): CopiedPizarra | null {
  if (hydrated) return memory
  hydrated = true
  const store = storage()
  if (!store) return memory
  try {
    const raw = store.getItem(STORAGE_KEY)
    memory = raw ? parseStored(raw) : null
  } catch {
    memory = null
  }
  return memory
}

export function writePizarraClipboard(board: CopiedPizarra | null): void {
  memory = board && pizarraHasContent(board) ? board : null
  hydrated = true
  const store = storage()
  if (store) {
    try {
      if (!memory) store.removeItem(STORAGE_KEY)
      else store.setItem(STORAGE_KEY, JSON.stringify(memory))
    } catch {
      // Incógnito o cuota: la copia sigue viva en esta pestaña.
    }
  }
  listeners.forEach((listener) => listener())
}

export function subscribePizarraClipboard(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Mismo id nuevo en todas las fases: la animación empareja fichas por id. */
export function clonePizarra(
  source: CopiedPizarra,
  nextId: () => string,
): CopiedPizarra {
  const ids = new Map<string, string>()
  const mapId = (id: unknown): string => {
    const key = String(id || '')
    if (!key) return nextId()
    let mapped = ids.get(key)
    if (!mapped) {
      mapped = nextId()
      ids.set(key, mapped)
    }
    return mapped
  }
  const mapOptional = (id: unknown): string | undefined => (id ? mapId(id) : undefined)

  const mapDiagram = (diagram: { elements?: any[]; arrows?: any[]; zones?: any[] }) => ({
    elements: asList(diagram.elements).map((el) => ({
      ...el,
      id: mapId(el?.id),
      groupId: mapOptional(el?.groupId),
    })),
    arrows: asList(diagram.arrows).map((arrow) => ({
      ...arrow,
      id: mapId(arrow?.id),
      groupId: mapOptional(arrow?.groupId),
    })),
    zones: asList(diagram.zones).map((zone) => ({
      ...zone,
      id: mapId(zone?.id),
      groupId: mapOptional(zone?.groupId),
    })),
  })

  const frames = asList(source.frames).map((frame, index) => ({
    ...frame,
    id: mapId(frame?.id),
    orden: index,
    ...mapDiagram(frame || {}),
  }))
  const canvas = source.tipo === 'animated' && frames[0] ? frames[0] : mapDiagram(source)

  return {
    elements: canvas.elements,
    arrows: canvas.arrows,
    zones: canvas.zones,
    pitchType: source.pitchType === 'half' ? 'half' : 'full',
    tipo: source.tipo === 'animated' ? 'animated' : 'static',
    frames: source.tipo === 'animated' ? frames : [],
    campoRoles: normalizeCampoRoles(source.campoRoles).map((role) => ({
      ...role,
      id: nextId(),
    })),
  }
}
