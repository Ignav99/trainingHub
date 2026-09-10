import type { TareaPizarraData } from '../components/tactical-board/types'
import { diagramHasContent } from './planPartidoDiagramRoles'
import type {
  ClipRival,
  FasePlanPartido,
  PlanPartidoData,
  PlanPartidoPhase,
  RivalJugadorEvaluacion,
  RivalPhaseAnalysis,
  RivalScoutData,
  RivalScoutStrategy,
} from '../types'

export const SHOW_FASE_ORDER: FasePlanPartido[] = [
  'ataque_organizado',
  'defensa_organizada',
  'transicion_ofensiva',
  'transicion_defensiva',
  'abp_ofensiva',
  'abp_defensiva',
]

export const SHOW_FASE_LABELS: Record<FasePlanPartido, string> = {
  ataque_organizado: 'Ataque organizado',
  defensa_organizada: 'Defensa organizada',
  transicion_ofensiva: 'Transición ofensiva',
  transicion_defensiva: 'Transición defensiva',
  abp_ofensiva: 'ABP ofensiva',
  abp_defensiva: 'ABP defensiva',
}

const SUBFASE_LABELS: Record<string, string> = {
  creacion: 'Creación',
  progresion: 'Progresión',
  finalizacion: 'Finalización',
  bloque_alto: 'Bloque alto',
  bloque_medio: 'Bloque medio',
  bloque_bajo: 'Bloque bajo',
}

const SUBFASE_ORDER = [
  'creacion',
  'progresion',
  'finalizacion',
  'bloque_alto',
  'bloque_medio',
  'bloque_bajo',
] as const

const MAX_BULLETS = 6
const MAX_BULLET_CHARS = 140

export type ShowKind = 'informe' | 'plan'

export interface ShowMeta {
  rivalNombre?: string
  clubNombre?: string
  fecha?: string
  hora?: string
  campo?: string
  localia?: string
  tramo?: string
}

export type ShowSlide =
  | {
      id: string
      kind: 'portada'
      kicker: string
      title: string
      subtitle?: string
      meta: string[]
    }
  | {
      id: string
      kind: 'contexto'
      kicker: string
      title: string
      bullets: string[]
    }
  | {
      id: string
      kind: 'once'
      kicker: string
      title: string
      bullets: string[]
    }
  | {
      id: string
      kind: 'fase'
      fase: FasePlanPartido
      kicker: string
      title: string
      bullets: string[]
      board?: TareaPizarraData
      boardSrc?: string
    }
  | {
      id: string
      kind: 'video'
      fase: FasePlanPartido
      kicker: string
      title: string
      src: string
      clipId: string
    }

export interface DossierShow {
  kind: ShowKind
  rivalNombre?: string
  slides: ShowSlide[]
}

export interface ShowChapter {
  id: string
  label: string
  startIndex: number
  slideCount: number
  videoCount: number
}

export function playableClipUrl(url?: string): string | null {
  if (typeof url !== 'string') return null
  const trimmed = url.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function playableClips(clips?: ClipRival[]): ClipRival[] {
  return (clips ?? []).filter((clip) => playableClipUrl(clip.url))
}

export function buildInformeShow(data: Partial<RivalScoutData> | undefined, meta: ShowMeta = {}): DossierShow {
  const slides: ShowSlide[] = [portadaSlide('informe', meta)]
  const contexto = contextoSlide(data?.estrategia)
  const once = onceSlide(data?.estrategia)
  if (contexto) slides.push(contexto)
  if (once) slides.push(once)
  const fases = data?.fases ?? []
  for (const fase of SHOW_FASE_ORDER) {
    const phase = fases.find((item) => item.fase === fase)
    slides.push(...phaseBlock(fase, phase, bulletsFromInforme(phase)))
  }
  return { kind: 'informe', rivalNombre: meta.rivalNombre, slides }
}

export function buildPlanShow(data: Partial<PlanPartidoData> | undefined, meta: ShowMeta = {}): DossierShow {
  const slides: ShowSlide[] = [portadaSlide('plan', meta)]
  const fases = data?.fases ?? []
  for (const fase of SHOW_FASE_ORDER) {
    const phase = fases.find((item) => item.fase === fase)
    slides.push(...phaseBlock(fase, phase, bulletsFromPlan(phase)))
  }
  return { kind: 'plan', rivalNombre: meta.rivalNombre, slides }
}

export function showChapters(slides: ShowSlide[]): ShowChapter[] {
  const chapters: ShowChapter[] = []
  let i = 0
  while (i < slides.length) {
    const slide = slides[i]
    if (slide.kind === 'portada') {
      chapters.push({
        id: 'portada',
        label: 'Inicio',
        startIndex: i,
        slideCount: 1,
        videoCount: 0,
      })
      i += 1
      continue
    }
    if (slide.kind === 'contexto' || slide.kind === 'once') {
      chapters.push({
        id: slide.id,
        label: slide.title,
        startIndex: i,
        slideCount: 1,
        videoCount: 0,
      })
      i += 1
      continue
    }
    if (slide.kind === 'fase') {
      let j = i + 1
      let videoCount = 0
      while (j < slides.length) {
        const next = slides[j]
        if (next.kind !== 'video' || next.fase !== slide.fase) break
        videoCount += 1
        j += 1
      }
      chapters.push({
        id: slide.fase,
        label: slide.title,
        startIndex: i,
        slideCount: j - i,
        videoCount,
      })
      i = j
      continue
    }
    i += 1
  }
  return chapters
}

export function chapterIndexForSlide(chapters: ShowChapter[], slideIndex: number): number {
  let current = 0
  for (let i = 0; i < chapters.length; i += 1) {
    const chapter = chapters[i]
    if (slideIndex >= chapter.startIndex && slideIndex < chapter.startIndex + chapter.slideCount) {
      return i
    }
    if (slideIndex >= chapter.startIndex) current = i
  }
  return current
}

function portadaSlide(kind: ShowKind, meta: ShowMeta): ShowSlide {
  const rival = (meta.rivalNombre || '').trim()
  const club = (meta.clubNombre || '').trim()
  const kicker = kind === 'plan' ? 'Plan de partido' : 'Informe rival'
  const title = rival || kicker
  const subtitle = rival && club ? club : club || undefined
  const metaLines = [
    formatLocalia(meta.localia),
    formatFechaHora(meta.fecha, meta.hora),
    meta.campo?.trim(),
    formatTramo(meta.tramo),
  ].filter((line): line is string => Boolean(line))
  return {
    id: 'portada',
    kind: 'portada',
    kicker,
    title,
    subtitle,
    meta: metaLines,
  }
}

function phaseBlock(
  fase: FasePlanPartido,
  phase: RivalPhaseAnalysis | PlanPartidoPhase | undefined,
  bullets: string[]
): ShowSlide[] {
  const clips = playableClips(phase && 'clips' in phase ? phase.clips : undefined)
  const board = pickBoard(phase)
  const boardSrc = boardPreviewSrc(board) ?? firstBoardSrc(phase)
  if (bullets.length === 0 && !board && !boardSrc && clips.length === 0) return []

  const title = SHOW_FASE_LABELS[fase]
  const slides: ShowSlide[] = [
    {
      id: `fase:${fase}`,
      kind: 'fase',
      fase,
      kicker: 'Fase',
      title,
      bullets,
      board,
      boardSrc,
    },
  ]
  clips.forEach((clip, index) => {
    const src = playableClipUrl(clip.url)
    if (!src) return
    slides.push({
      id: `video:${clip.id || `${fase}-${index}`}`,
      kind: 'video',
      fase,
      kicker: title,
      title: (clip.titulo || '').trim() || 'Clip',
      src,
      clipId: clip.id || `${fase}-${index}`,
    })
  })
  return slides
}

function bulletsFromInforme(phase: RivalPhaseAnalysis | undefined): string[] {
  if (!phase) return []
  const out: string[] = []
  pushAll(out, phase.fortalezas)
  pushAll(out, phase.debilidades)
  pushLine(out, phase.formacion)
  pushLine(out, phase.espacios)
  pushLine(out, phase.vigilancias)
  pushLine(out, phase.repliegue)
  pushLine(out, phase.abp_comentarios)
  pushLine(out, phase.abp_defensa)
  pushSubfaseNotes(out, phase.subfases)
  return finalizeBullets(out)
}

function bulletsFromPlan(phase: PlanPartidoPhase | undefined): string[] {
  if (!phase) return []
  const out: string[] = []
  pushLine(out, phase.texto)
  pushLine(out, phase.sistema)
  pushSubfaseNotes(out, phase.subfases, true)
  for (const item of phase.jugadas_abp ?? []) {
    pushLine(out, item.comentario || item.jugada_id)
  }
  return finalizeBullets(out)
}

function pushSubfaseNotes(
  out: string[],
  subfases: RivalPhaseAnalysis['subfases'] | PlanPartidoPhase['subfases'],
  includeSistema = false
) {
  if (!subfases) return
  for (const key of SUBFASE_ORDER) {
    const sub = subfases[key]
    if (!sub) continue
    const bits = [includeSistema ? (sub as { sistema?: string }).sistema : undefined, sub.notas]
      .map((bit) => (typeof bit === 'string' ? bit.trim() : ''))
      .filter(Boolean)
    if (bits.length === 0) continue
    pushLine(out, `${SUBFASE_LABELS[key] ?? key}: ${bits.join(' · ')}`)
  }
}

function pickBoard(
  phase: RivalPhaseAnalysis | PlanPartidoPhase | undefined
): TareaPizarraData | undefined {
  if (!phase) return undefined
  const candidates: Array<TareaPizarraData | undefined> = [phase.pizarra_diagrama]
  const subfases = phase.subfases
  if (subfases) {
    for (const key of SUBFASE_ORDER) {
      candidates.push(subfases[key]?.pizarra_diagrama)
    }
  }
  let firstContent: TareaPizarraData | undefined
  for (const candidate of candidates) {
    if (!candidate) continue
    if (boardLoops(candidate)) return candidate
    if (!firstContent && diagramHasContent(candidate)) firstContent = candidate
  }
  return firstContent
}

function boardLoops(data?: TareaPizarraData | null): boolean {
  const frames = data?.frames
  if (!Array.isArray(frames) || frames.length < 2) return false
  const kept = frames.filter(
    (frame) =>
      (frame.elements?.length ?? 0) > 0 ||
      (frame.arrows?.length ?? 0) > 0 ||
      (frame.zones?.length ?? 0) > 0
  )
  return (kept.length > 0 ? kept : frames).length >= 2
}

function boardPreviewSrc(board?: TareaPizarraData): string | undefined {
  return isDataImage(board?.preview) ? board.preview : undefined
}

function contextoSlide(estrategia?: RivalScoutStrategy): ShowSlide | null {
  if (!estrategia) return null
  const bullets: string[] = []
  pushLine(bullets, estrategia.notas)
  pushLine(bullets, formatCampo(estrategia.dimensiones_campo))
  pushLine(bullets, estrategia.actitud_estilo)
  const clipped = finalizeBullets(bullets)
  if (clipped.length === 0) return null
  return {
    id: 'contexto',
    kind: 'contexto',
    kicker: 'Contexto',
    title: 'Contexto',
    bullets: clipped,
  }
}

function onceSlide(estrategia?: RivalScoutStrategy): ShowSlide | null {
  if (!estrategia) return null
  const bullets: string[] = []
  pushLine(bullets, estrategia.sistema)
  const jugadores = estrategia.once_probable?.jugadores ?? []
  const commented = jugadores.filter((j) => (j.comentario || '').trim())
  if (commented.length > 0) {
    for (const jugador of commented) {
      pushLine(bullets, oncePlayerLine(jugador))
    }
  } else {
    const colocacion = estrategia.once_probable?.colocacion ?? {}
    for (const name of Object.values(colocacion)) {
      pushLine(bullets, name)
    }
  }
  const clipped = finalizeBullets(bullets)
  if (clipped.length === 0) return null
  return {
    id: 'once',
    kind: 'once',
    kicker: 'Once probable',
    title: 'Once probable',
    bullets: clipped,
  }
}

function oncePlayerLine(jugador: RivalJugadorEvaluacion): string {
  const dorsal = jugador.dorsal != null && Number.isFinite(jugador.dorsal) ? String(jugador.dorsal) : ''
  const name = [dorsal, (jugador.nombre || '').trim()].filter(Boolean).join(' ')
  const role = (jugador.rol || jugador.posicion || '').trim()
  const comment = clipText(jugador.comentario, 80)
  const head = [name, role].filter(Boolean).join(' · ')
  if (head && comment) return `${head} — ${comment}`
  return comment || head
}

function formatCampo(value?: string): string | undefined {
  const text = (value || '').replace(/\s+/g, ' ').trim()
  if (!text) return undefined
  return `Campo ${text}`
}

function firstBoardSrc(phase: RivalPhaseAnalysis | PlanPartidoPhase | undefined): string | undefined {
  if (!phase) return undefined
  if (isDataImage(phase.pizarra_tactica)) return phase.pizarra_tactica
  const subfases = phase.subfases
  if (!subfases) return undefined
  for (const key of SUBFASE_ORDER) {
    const src = subfases[key]?.pizarra_tactica
    if (isDataImage(src)) return src
  }
  return undefined
}

function isDataImage(value?: string): value is string {
  return typeof value === 'string' && value.startsWith('data:image')
}

function pushAll(out: string[], values?: string[]) {
  for (const value of values ?? []) pushLine(out, value)
}

function pushLine(out: string[], value?: string) {
  const clipped = clipText(value)
  if (clipped && !out.includes(clipped)) out.push(clipped)
}

function finalizeBullets(values: string[]): string[] {
  return values.slice(0, MAX_BULLETS)
}

function clipText(value?: string, max = MAX_BULLET_CHARS): string {
  const text = (value || '').replace(/\s+/g, ' ').trim()
  if (!text) return ''
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).replace(/\s+\S*$/, '').trimEnd()}…`
}

function formatLocalia(value?: string): string | undefined {
  const key = (value || '').trim().toLowerCase()
  if (key === 'local') return 'Local'
  if (key === 'visitante') return 'Visitante'
  if (key === 'neutral') return 'Neutral'
  return value?.trim() || undefined
}

function formatTramo(value?: string): string | undefined {
  if (value === 'ida') return 'Ida'
  if (value === 'vuelta') return 'Vuelta'
  return undefined
}

function formatFechaHora(fecha?: string, hora?: string): string | undefined {
  const date = (fecha || '').trim()
  const time = (hora || '').trim()
  if (!date && !time) return undefined
  if (date && time) return `${date} · ${time}`
  return date || time
}
