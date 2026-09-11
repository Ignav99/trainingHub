import type { CodeButton, CodeButtonSize, CodeEvent } from './types'
import type { RevisionFolder } from '@/lib/api/revision'

export const DEFAULT_DESK_BUTTONS: CodeButton[] = [
  {
    id: 'fase-ataque-org',
    label: 'Ataque organizado',
    color: '#C45C4A',
    shortcut: '1',
    preRoll: 5,
    postRoll: 8,
    size: 'l',
    fase: 'ataque_organizado',
  },
  {
    id: 'fase-defensa-org',
    label: 'Defensa organizada',
    color: '#4A7A9B',
    shortcut: '2',
    preRoll: 5,
    postRoll: 8,
    size: 'l',
    fase: 'defensa_organizada',
  },
  {
    id: 'fase-trans-of',
    label: 'Transición ofensiva',
    color: '#6B8F4E',
    shortcut: '3',
    preRoll: 3,
    postRoll: 6,
    size: 'm',
    fase: 'transicion_ofensiva',
  },
  {
    id: 'fase-trans-def',
    label: 'Transición defensiva',
    color: '#8A6B4E',
    shortcut: '4',
    preRoll: 3,
    postRoll: 6,
    size: 'm',
    fase: 'transicion_defensiva',
  },
  {
    id: 'fase-abp-of',
    label: 'ABP ofensiva',
    color: '#C8A24A',
    shortcut: '5',
    preRoll: 8,
    postRoll: 12,
    size: 'l',
    fase: 'abp_ofensiva',
  },
  {
    id: 'fase-abp-def',
    label: 'ABP defensiva',
    color: '#7A6A9B',
    shortcut: '6',
    preRoll: 8,
    postRoll: 12,
    size: 'l',
    fase: 'abp_defensiva',
  },
]

export const BUTTON_SIZE_ORDER: CodeButtonSize[] = ['s', 'm', 'l']

export const BUTTON_SIZE_LABELS: Record<CodeButtonSize, string> = {
  s: 'Pequeño',
  m: 'Mediano',
  l: 'Grande',
}

export const DESK_FASE_OPTIONS: { fase: string; nombre: string }[] = [
  { fase: '', nombre: 'Momento propio' },
  { fase: 'ataque_organizado', nombre: 'Ataque organizado' },
  { fase: 'defensa_organizada', nombre: 'Defensa organizada' },
  { fase: 'transicion_ofensiva', nombre: 'Transición ofensiva' },
  { fase: 'transicion_defensiva', nombre: 'Transición defensiva' },
  { fase: 'abp_ofensiva', nombre: 'ABP ofensiva' },
  { fase: 'abp_defensiva', nombre: 'ABP defensiva' },
]

export const DESK_PRESET_COLORS = [
  '#C45C4A',
  '#4A7A9B',
  '#6B8F4E',
  '#8A6B4E',
  '#C8A24A',
  '#7A6A9B',
  '#D46A7A',
  '#3D8A7A',
  '#EDE8D8',
  '#94A3B8',
]

/** Same tactical moment, different ids in informe vs plan / rival. */
const FASE_EQUIV: Record<string, string[]> = {
  ataque_organizado: ['ataque_organizado'],
  defensa_organizada: ['defensa_organizada'],
  transicion_ofensiva: ['transicion_ofensiva', 'transicion_defensa_ataque'],
  transicion_defensiva: ['transicion_defensiva', 'transicion_ataque_defensa'],
  transicion_defensa_ataque: ['transicion_ofensiva', 'transicion_defensa_ataque'],
  transicion_ataque_defensa: ['transicion_defensiva', 'transicion_ataque_defensa'],
  abp_ofensiva: ['abp_ofensiva', 'balon_parado_ofensivo'],
  abp_defensiva: ['abp_defensiva', 'balon_parado_defensivo'],
  balon_parado_ofensivo: ['abp_ofensiva', 'balon_parado_ofensivo'],
  balon_parado_defensivo: ['abp_defensiva', 'balon_parado_defensivo'],
}

export function clipRangeFromPress(
  timestamp: number,
  duration: number,
  preRoll: number,
  postRoll: number
): { startTime: number; endTime: number } {
  const pre = Math.max(0, preRoll)
  const post = Math.max(0, postRoll)
  const maxT = Number.isFinite(duration) ? Math.max(0, duration) : 0
  const startTime = Math.max(0, timestamp - pre)
  let endTime = Math.min(maxT, timestamp + post)
  if (endTime - startTime < 0.5) {
    endTime = Math.min(Math.max(maxT, startTime + 0.5), startTime + 0.5)
  }
  return { startTime, endTime }
}

export function looksLikeLegacyDefaultButtons(buttons: CodeButton[]): boolean {
  if (buttons.length !== 4) return false
  const labels = buttons.map((b) => b.label).join('|')
  return labels === 'Ataque|Defensa|Transición|Córner'
}

export function migrateDeskButtons(buttons: CodeButton[] | undefined): CodeButton[] {
  if (!buttons?.length || looksLikeLegacyDefaultButtons(buttons)) {
    return DEFAULT_DESK_BUTTONS.map((b) => ({ ...b }))
  }
  return buttons.map((b) => ({
    ...b,
    size: b.size || 'm',
    preRoll: Number.isFinite(b.preRoll) ? b.preRoll : 5,
    postRoll: Number.isFinite(b.postRoll) ? b.postRoll : 5,
  }))
}

export function clipDisplayTitle(event: CodeEvent, button?: CodeButton | null): string {
  const title = event.title?.trim()
  if (title) return title
  return button?.label || 'Recorte'
}

export function sanitizeFilename(name: string): string {
  const cleaned = name
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned || 'clip'
}

export function formatTimecodeFile(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const m = Math.floor(s / 60)
  const sec = s % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(m)}.${pad(sec)}`
}

export function clipFileName(label: string, start: number, end: number): string {
  return `${sanitizeFilename(label)} — ${formatTimecodeFile(start)}-${formatTimecodeFile(end)}.webm`
}

export function zipFolderName(label: string): string {
  return sanitizeFilename(label)
}

export function acceptedFasesFor(fase?: string | null): Set<string> {
  const set = new Set<string>()
  if (!fase) return set
  set.add(fase)
  const aliases = FASE_EQUIV[fase]
  if (aliases) aliases.forEach((a) => set.add(a))
  return set
}

export function matchRevisionFolderId(
  folders: Pick<RevisionFolder, 'id' | 'fase' | 'parent_id'>[],
  preferredFase?: string | null
): string {
  const roots = folders.filter((f) => !f.parent_id)
  if (!preferredFase) return roots[0]?.id || folders[0]?.id || ''
  const accepted = acceptedFasesFor(preferredFase)
  const hit = roots.find((f) => f.fase && accepted.has(f.fase))
  return hit?.id || roots[0]?.id || folders[0]?.id || ''
}

export interface DeskFolderGroup {
  button: CodeButton | null
  label: string
  color: string
  clips: CodeEvent[]
}

export function groupClipsByButton(
  buttons: CodeButton[],
  events: CodeEvent[]
): DeskFolderGroup[] {
  const known = new Set(buttons.map((b) => b.id))
  const groups: DeskFolderGroup[] = buttons.map((button) => ({
    button,
    label: button.label,
    color: button.color,
    clips: events
      .filter((e) => e.buttonId === button.id)
      .slice()
      .sort((a, b) => a.startTime - b.startTime),
  }))
  const orphans = events.filter((e) => !known.has(e.buttonId))
  if (orphans.length) {
    groups.push({
      button: null,
      label: 'Otros momentos',
      color: '#94A3B8',
      clips: orphans.slice().sort((a, b) => a.startTime - b.startTime),
    })
  }
  return groups
}

export function clampClipTimes(
  startTime: number,
  endTime: number,
  duration: number
): { startTime: number; endTime: number } {
  const max = Math.max(0, duration)
  let start = Math.max(0, Math.min(startTime, max))
  let end = Math.max(0, Math.min(endTime, max))
  if (end - start < 0.5) {
    end = Math.min(max, start + 0.5)
    if (end - start < 0.5) start = Math.max(0, end - 0.5)
  }
  return { startTime: start, endTime: end }
}
