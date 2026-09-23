import type { ButtonLayout, CodeButton, CodeButtonSize, CodeEvent } from './types'
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
    captureMode: 'window',
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
    captureMode: 'window',
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
    captureMode: 'window',
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
    captureMode: 'window',
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
    captureMode: 'window',
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
    captureMode: 'window',
    fase: 'abp_defensiva',
  },
]

export const RESERVED_SHORTCUTS = new Set([
  ' ',
  'escape',
  'h',
  'arrowleft',
  'arrowright',
  'arrowup',
  'arrowdown',
  'delete',
  'backspace',
])

export function normalizeShortcut(raw: string | undefined | null): string | undefined {
  const value = (raw || '').trim().toLowerCase()
  if (!value) return undefined
  const key = value.length === 1 ? value : value
  if (RESERVED_SHORTCUTS.has(key)) return undefined
  return key.slice(0, 1)
}

export function shortcutTaken(
  buttons: Pick<CodeButton, 'id' | 'shortcut'>[],
  shortcut: string | undefined,
  exceptId?: string
): boolean {
  if (!shortcut) return false
  return buttons.some((b) => b.shortcut === shortcut && b.id !== exceptId)
}

export function timingsLabel(btn: CodeButton): string {
  if (btn.captureMode === 'range') return 'inicio → fin'
  return `−${btn.preRoll}s / +${btn.postRoll}s`
}

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

const LAYOUT_GAP = 1.8

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function clampNum(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

export function clampLayout(layout: ButtonLayout, minW = 4, minH = 4): ButtonLayout {
  const w = clampNum(round1(layout.w), Math.min(minW, 80), 100)
  const h = clampNum(round1(layout.h), Math.min(minH, 80), 100)
  let x = clampNum(round1(layout.x), 0, 100 - w)
  let y = clampNum(round1(layout.y), 0, 100 - h)
  if (x + w > 100) x = round1(100 - w)
  if (y + h > 100) y = round1(100 - h)
  const next: ButtonLayout = { x, y, w, h }
  if (typeof layout.z === 'number' && Number.isFinite(layout.z)) next.z = Math.round(layout.z)
  return next
}

export function sanitizeLayout(raw: unknown): ButtonLayout | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const layout = raw as Partial<ButtonLayout>
  const values = [layout.x, layout.y, layout.w, layout.h]
  if (!values.every((n) => typeof n === 'number' && Number.isFinite(n))) return undefined
  return clampLayout({ x: layout.x as number, y: layout.y as number, w: layout.w as number, h: layout.h as number })
}

/** Pixel floor so a button stays grabbable, expressed as a percent of the canvas. */
export function layoutMins(canvasW: number, canvasH: number): { minW: number; minH: number } {
  const minW = canvasW > 0 ? Math.min(48, (64 / canvasW) * 100) : 18
  const minH = canvasH > 0 ? Math.min(48, (40 / canvasH) * 100) : 12
  return { minW, minH }
}

export function shiftLayout(
  origin: ButtonLayout,
  dx: number,
  dy: number,
  dw = 0,
  dh = 0,
  minW = 4,
  minH = 4,
): ButtonLayout {
  return clampLayout({
    x: origin.x + dx,
    y: origin.y + dy,
    w: origin.w + dw,
    h: origin.h + dh,
  }, minW, minH)
}

export function layoutsEqual(a?: ButtonLayout | null, b?: ButtonLayout | null): boolean {
  if (!a || !b) return false
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h && (a.z ?? 0) === (b.z ?? 0)
}

export function layoutsOverlap(a: ButtonLayout, b: ButtonLayout, gap = 0): boolean {
  return a.x < b.x + b.w + gap
    && a.x + a.w + gap > b.x
    && a.y < b.y + b.h + gap
    && a.y + a.h + gap > b.y
}

function rowWeight(row: CodeButton[]): number {
  if (row.length === 1 && (row[0].size || 'm') === 'l') return 1.2
  if (row.some((b) => b.size === 's')) return 0.78
  return 1
}

/** First-open arrangement: wide buttons on their own row, the rest in pairs. */
export function packDefaultLayouts(buttons: CodeButton[]): Record<string, ButtonLayout> {
  const rows: CodeButton[][] = []
  let pending: CodeButton[] = []
  const flush = () => {
    if (!pending.length) return
    rows.push(pending)
    pending = []
  }
  for (const button of buttons) {
    if ((button.size || 'm') === 'l') {
      flush()
      rows.push([button])
    } else {
      pending.push(button)
      if (pending.length === 2) flush()
    }
  }
  flush()
  if (!rows.length) return {}

  const weights = rows.map(rowWeight)
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  const usable = 100 - LAYOUT_GAP * (rows.length + 1)
  let y = LAYOUT_GAP
  const out: Record<string, ButtonLayout> = {}
  rows.forEach((row, index) => {
    const h = (usable * weights[index]) / total
    const count = row.length
    const inner = count > 1 ? LAYOUT_GAP : 0
    const w = (100 - LAYOUT_GAP * 2 - inner * (count - 1)) / count
    row.forEach((button, col) => {
      out[button.id] = clampLayout({
        x: LAYOUT_GAP + col * (w + inner),
        y,
        w,
        h,
      })
    })
    y += h + LAYOUT_GAP
  })
  return out
}

export function placeButtonLayout(existing: ButtonLayout[]): ButtonLayout {
  const w = 42
  const h = 16
  for (let y = LAYOUT_GAP; y <= 100 - h + 0.01; y += 2) {
    for (let x = LAYOUT_GAP; x <= 100 - w + 0.01; x += 2) {
      const candidate = { x, y, w, h }
      if (!existing.some((other) => layoutsOverlap(candidate, other, 0.6))) {
        return clampLayout(candidate)
      }
    }
  }
  return clampLayout({ x: LAYOUT_GAP, y: LAYOUT_GAP, w: 36, h: 14 })
}

function intersectionArea(a: ButtonLayout, b: ButtonLayout): number {
  const width = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x))
  const height = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))
  return width * height
}

function coverageOf(inner: ButtonLayout, outer: ButtonLayout): number {
  const area = inner.w * inner.h
  if (area <= 0) return 0
  return intersectionArea(inner, outer) / area
}

function nudgeOut(box: ButtonLayout, cover: ButtonLayout): ButtonLayout {
  const stickW = box.w * 0.34
  const stickH = box.h * 0.34
  const distLeft = box.x + box.w - cover.x
  const distRight = cover.x + cover.w - box.x
  const distTop = box.y + box.h - cover.y
  const distBottom = cover.y + cover.h - box.y
  const min = Math.min(distLeft, distRight, distTop, distBottom)
  if (min === distLeft) return { ...box, x: cover.x - box.w + stickW }
  if (min === distRight) return { ...box, x: cover.x + cover.w - stickW }
  if (min === distTop) return { ...box, y: cover.y - box.h + stickH }
  return { ...box, y: cover.y + cover.h - stickH }
}

/** Keep every button reachable: a smaller one pops above a cover, equals slide out a strip. */
export function exposeLayouts(layouts: Record<string, ButtonLayout>): Record<string, ButtonLayout> {
  const ids = Object.keys(layouts)
  const next: Record<string, ButtonLayout> = { ...layouts }
  for (const id of ids) {
    let box = next[id]
    for (const otherId of ids) {
      if (otherId === id) continue
      const other = next[otherId]
      if ((other.z ?? 0) < (box.z ?? 0)) continue
      if (coverageOf(box, other) < 0.88) continue
      if (other.w * other.h > box.w * box.h * 1.2) {
        box = { ...box, z: Math.round(other.z ?? 0) + 1 }
      } else {
        box = nudgeOut(box, other)
      }
    }
    next[id] = clampLayout(box, 4, 4)
  }
  return next
}

export function resolveButtonLayouts(buttons: CodeButton[]): Record<string, ButtonLayout> {
  const saved: Record<string, ButtonLayout> = {}
  const missing: CodeButton[] = []
  for (const button of buttons) {
    const layout = sanitizeLayout(button.layout)
    if (layout) saved[button.id] = layout
    else missing.push(button)
  }
  if (missing.length === buttons.length) return packDefaultLayouts(buttons)
  const placed = Object.values(saved)
  for (const button of missing) {
    const spot = placeButtonLayout(placed)
    saved[button.id] = spot
    placed.push(spot)
  }
  return saved
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
    captureMode: b.captureMode === 'range' ? 'range' : 'window',
    shortcut: normalizeShortcut(b.shortcut),
    preRoll: Number.isFinite(b.preRoll) ? b.preRoll : 5,
    postRoll: Number.isFinite(b.postRoll) ? b.postRoll : 5,
    layout: sanitizeLayout(b.layout),
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

export function clipFileName(label: string, start: number, end: number, ext = 'mp4'): string {
  const safeExt = (ext || 'mp4').replace(/^\./, '')
  return `${sanitizeFilename(label)} — ${formatTimecodeFile(start)}-${formatTimecodeFile(end)}.${safeExt}`
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

export const CINTA_ZOOM_MIN = 1
export const CINTA_ZOOM_MAX = 400

export function cintaWindow(
  duration: number,
  zoom: number,
  viewStart: number
): { zoom: number; viewStart: number; viewEnd: number; visible: number } {
  const dur = Math.max(0, duration)
  const z = Math.min(CINTA_ZOOM_MAX, Math.max(CINTA_ZOOM_MIN, zoom))
  if (dur <= 0) {
    return { zoom: z, viewStart: 0, viewEnd: 0, visible: 0 }
  }
  const minVisible = Math.min(dur, 3)
  const visible = Math.min(dur, Math.max(dur / z, minVisible))
  const maxStart = Math.max(0, dur - visible)
  const start = Math.min(Math.max(0, viewStart), maxStart)
  return { zoom: z, viewStart: start, viewEnd: start + visible, visible }
}

export function zoomCinta(
  duration: number,
  zoom: number,
  viewStart: number,
  anchorTime: number,
  factor: number
) {
  const current = cintaWindow(duration, zoom, viewStart)
  const nextZoom = current.zoom * factor
  const rel = current.visible > 0
    ? (anchorTime - current.viewStart) / current.visible
    : 0.5
  const preview = cintaWindow(duration, nextZoom, 0)
  return cintaWindow(duration, preview.zoom, anchorTime - rel * preview.visible)
}

export function panCinta(
  duration: number,
  zoom: number,
  viewStart: number,
  deltaSeconds: number
) {
  return cintaWindow(duration, zoom, viewStart + deltaSeconds)
}

export function cintaTickStep(visible: number): number {
  if (visible <= 8) return 1
  if (visible <= 20) return 2
  if (visible <= 45) return 5
  if (visible <= 90) return 10
  if (visible <= 240) return 15
  if (visible <= 600) return 30
  if (visible <= 1800) return 60
  return 300
}

export function timeToViewPct(time: number, viewStart: number, visible: number): number {
  if (visible <= 0) return 0
  return ((time - viewStart) / visible) * 100
}

export function viewPctToTime(pct: number, viewStart: number, visible: number): number {
  return viewStart + (pct / 100) * visible
}

/**
 * Timeline rows exist only after the first event of that button.
 * Order is first-seen (creation) order, and a row disappears when its last event does.
 */
export function lanesWithEvents(buttons: CodeButton[], events: CodeEvent[]): CodeButton[] {
  const byId = new Map(buttons.map((button) => [button.id, button]))
  const lanes: CodeButton[] = []
  const seen = new Set<string>()
  for (const event of events) {
    if (seen.has(event.buttonId)) continue
    const button = byId.get(event.buttonId)
    if (!button) continue
    seen.add(event.buttonId)
    lanes.push(button)
  }
  return lanes
}

export function clipsOnLane(events: CodeEvent[], buttonId: string): CodeEvent[] {
  return events
    .filter((e) => e.buttonId === buttonId)
    .slice()
    .sort((a, b) => a.startTime - b.startTime)
}

export type DeskPlaylist = {
  title: string
  clips: CodeEvent[]
  startId?: string
}

/** Focused clip first so Delete never wipes a whole lane playlist. */
export function idsForKeyboardClipDelete(
  selectedClipId: string | null,
  selectedClipIds: string[] = []
): string[] {
  if (selectedClipId) return [selectedClipId]
  return selectedClipIds.filter(Boolean)
}

export function removeClipFromPlaylist(
  playlist: DeskPlaylist,
  clipId: string
): DeskPlaylist | null {
  const clips = playlist.clips.filter((c) => c.id !== clipId)
  if (!clips.length) return null
  if (playlist.startId && playlist.startId !== clipId && clips.some((c) => c.id === playlist.startId)) {
    return { ...playlist, clips }
  }
  const oldIndex = playlist.clips.findIndex((c) => c.id === clipId)
  const next = clips[Math.min(Math.max(oldIndex, 0), clips.length - 1)]
  return { ...playlist, clips, startId: next.id }
}

export function removeClipsFromPlaylist(
  playlist: DeskPlaylist,
  clipIds: string[]
): DeskPlaylist | null {
  let next: DeskPlaylist | null = playlist
  for (const id of clipIds) {
    next = removeClipFromPlaylist({ ...next, startId: id }, id)
    if (!next) return null
  }
  return next
}
