import type { TareaPizarraData } from '../components/tactical-board/types'
import { diagramHasContent } from './planPartidoDiagramRoles'
import type {
  ClipRival,
  FasePlanPartido,
  PlanPartidoData,
  PlanPartidoPhase,
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

export type ShowKind = 'informe' | 'plan' | 'charla'
export type ShowSection = 'informe' | 'plan'

export type ShowVideoSlot = FasePlanPartido | 'once_probable'

export interface ShowMeta {
  rivalNombre?: string
  clubNombre?: string
  clubEscudoUrl?: string
  rivalEscudoUrl?: string
  fecha?: string
  hora?: string
  campo?: string
  localia?: string
  tramo?: string
}

export type ShowSlide =
  | {
      id: string
      section?: ShowSection
      kind: 'portada'
      kicker: string
      title: string
      subtitle?: string
      meta: string[]
      rivalEscudoUrl?: string
    }
  | {
      id: string
      section?: ShowSection
      kind: 'contexto'
      kicker: string
      title: string
      bullets: string[]
    }
  | {
      id: string
      section?: ShowSection
      kind: 'once'
      kicker: string
      title: string
      bullets: string[]
      sistema?: string
      colocacion?: Record<string, string>
      jugadores?: Array<{ nombre: string; dorsal?: number | null; comentario?: string }>
    }
  | {
      id: string
      section?: ShowSection
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
      section?: ShowSection
      kind: 'video'
      fase: ShowVideoSlot
      kicker: string
      title: string
      src: string
      clipId: string
    }

export interface DossierShow {
  kind: ShowKind
  rivalNombre?: string
  clubEscudoUrl?: string
  rivalEscudoUrl?: string
  slides: ShowSlide[]
}

export interface RevisionPackLike {
  clips?: Array<{
    id: string
    titulo?: string | null
    url?: string | null
    url_play?: string | null
    status?: string
    fase?: string | null
  }>
  folders?: Array<{ id: string; fase?: string | null }>
  links?: Array<{
    clip_id: string
    folder_id?: string | null
    slot_tipo?: string
  }>
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
  return {
    kind: 'informe',
    rivalNombre: meta.rivalNombre,
    clubEscudoUrl: meta.clubEscudoUrl,
    rivalEscudoUrl: meta.rivalEscudoUrl,
    slides,
  }
}

export function buildPlanShow(data: Partial<PlanPartidoData> | undefined, meta: ShowMeta = {}): DossierShow {
  const slides: ShowSlide[] = [portadaSlide('plan', meta)]
  const fases = data?.fases ?? []
  for (const fase of SHOW_FASE_ORDER) {
    const phase = fases.find((item) => item.fase === fase)
    slides.push(...phaseBlock(fase, phase, bulletsFromPlan(phase)))
  }
  return {
    kind: 'plan',
    rivalNombre: meta.rivalNombre,
    clubEscudoUrl: meta.clubEscudoUrl,
    rivalEscudoUrl: meta.rivalEscudoUrl,
    slides,
  }
}

export function stampShowSection(show: DossierShow, section: ShowSection): ShowSlide[] {
  return show.slides.map((slide) => ({
    ...slide,
    id: `${section}:${slide.id}`,
    section,
  }))
}

/** Informe Rival first, then Plan de Partido — same slides, unique ids. */
export function concatCharlaShow(informe: DossierShow, plan: DossierShow): DossierShow {
  return {
    kind: 'charla',
    rivalNombre: informe.rivalNombre || plan.rivalNombre,
    clubEscudoUrl: informe.clubEscudoUrl || plan.clubEscudoUrl,
    rivalEscudoUrl: informe.rivalEscudoUrl || plan.rivalEscudoUrl,
    slides: [...stampShowSection(informe, 'informe'), ...stampShowSection(plan, 'plan')],
  }
}

export function showPresenterLabel(kind: ShowKind): string {
  if (kind === 'plan') return 'Presentar Plan de Partido'
  if (kind === 'charla') return 'Presentar Informe Rival y Plan de Partido'
  return 'Presentar Informe Rival'
}

const FASE_ALIASES: Record<string, ShowVideoSlot> = {
  ataque_organizado: 'ataque_organizado',
  defensa_organizada: 'defensa_organizada',
  transicion_ofensiva: 'transicion_ofensiva',
  transicion_defensiva: 'transicion_defensiva',
  transicion_defensa_ataque: 'transicion_ofensiva',
  transicion_ataque_defensa: 'transicion_defensiva',
  balon_parado_ofensivo: 'abp_ofensiva',
  balon_parado_defensivo: 'abp_defensiva',
  abp_ofensiva: 'abp_ofensiva',
  abp_defensiva: 'abp_defensiva',
  once_probable: 'once_probable',
}

export function attachRevisionPack(show: DossierShow, pack?: RevisionPackLike | null): DossierShow {
  if (!pack) return show
  const folderById = new Map((pack.folders ?? []).map((folder) => [folder.id, folder]))
  const linksByClip = new Map<string, NonNullable<RevisionPackLike['links']>>()
  for (const link of pack.links ?? []) {
    const list = linksByClip.get(link.clip_id) ?? []
    list.push(link)
    linksByClip.set(link.clip_id, list)
  }

  const used = new Set<string>()
  for (const slide of show.slides) {
    if (slide.kind !== 'video') continue
    used.add(slide.clipId)
    used.add(slide.src)
  }

  const bySlot = new Map<ShowVideoSlot, Extract<ShowSlide, { kind: 'video' }>[]>()
  for (const clip of pack.clips ?? []) {
    if (clip.status && clip.status !== 'hot') continue
    const src = playableClipUrl(clip.url_play ?? undefined) ?? playableClipUrl(clip.url ?? undefined)
    if (!src) continue
    if (used.has(clip.id) || used.has(src)) continue
    const slot = slotForRevisionClip(clip, linksByClip.get(clip.id) ?? [], folderById)
    if (!slot) continue
    const video: Extract<ShowSlide, { kind: 'video' }> = {
      id: `video:rev:${clip.id}`,
      kind: 'video',
      fase: slot,
      kicker: slot === 'once_probable' ? 'Once probable' : SHOW_FASE_LABELS[slot],
      title: (clip.titulo || '').trim() || 'Clip',
      src,
      clipId: clip.id,
    }
    const list = bySlot.get(slot) ?? []
    list.push(video)
    bySlot.set(slot, list)
    used.add(clip.id)
    used.add(src)
  }

  if (bySlot.size === 0) return show

  const slides = [...show.slides]
  for (const [slot, videos] of Array.from(bySlot.entries())) {
    if (slot === 'once_probable') insertOnceVideos(slides, videos)
    else insertPhaseVideos(slides, slot, videos)
  }
  return { ...show, slides }
}

export function slimShowForSync(show: DossierShow): DossierShow {
  return {
    ...show,
    slides: show.slides.map((slide) => {
      if (slide.kind !== 'fase' || !slide.board) {
        return slide.kind === 'fase' ? { ...slide, boardSrc: undefined } : slide
      }
      const { preview: _preview, ...board } = slide.board
      return { ...slide, board, boardSrc: undefined }
    }),
  }
}

export function showChapters(slides: ShowSlide[]): ShowChapter[] {
  const chapters: ShowChapter[] = []
  let i = 0
  while (i < slides.length) {
    const slide = slides[i]
    if (slide.kind === 'portada') {
      chapters.push({
        id: slide.id,
        label: chapterLabel(slide),
        startIndex: i,
        slideCount: 1,
        videoCount: 0,
      })
      i += 1
      continue
    }
    if (slide.kind === 'contexto' || slide.kind === 'once') {
      let j = i + 1
      let videoCount = 0
      while (j < slides.length) {
        const next = slides[j]
        if (next.kind !== 'video' || next.fase !== 'once_probable') break
        if (next.section && slide.section && next.section !== slide.section) break
        videoCount += 1
        j += 1
      }
      chapters.push({
        id: slide.id,
        label: chapterLabel(slide),
        startIndex: i,
        slideCount: j - i,
        videoCount,
      })
      i = j
      continue
    }
    if (slide.kind === 'fase') {
      let j = i + 1
      let videoCount = 0
      while (j < slides.length) {
        const next = slides[j]
        if (next.kind !== 'video' || next.fase !== slide.fase) break
        if (next.section && slide.section && next.section !== slide.section) break
        videoCount += 1
        j += 1
      }
      chapters.push({
        id: slide.id,
        label: chapterLabel(slide),
        startIndex: i,
        slideCount: j - i,
        videoCount,
      })
      i = j
      continue
    }
    if (slide.kind === 'video') {
      let j = i + 1
      while (j < slides.length) {
        const next = slides[j]
        if (next.kind !== 'video' || next.fase !== slide.fase) break
        if (next.section && slide.section && next.section !== slide.section) break
        j += 1
      }
      chapters.push({
        id: slide.id,
        label: chapterLabel(slide),
        startIndex: i,
        slideCount: j - i,
        videoCount: j - i,
      })
      i = j
      continue
    }
    i += 1
  }
  return chapters
}

function chapterLabel(slide: ShowSlide): string {
  if (slide.kind === 'portada') {
    if (slide.section === 'informe') return 'Informe Rival'
    if (slide.section === 'plan') return 'Plan de Partido'
    return 'Inicio'
  }
  if (slide.kind === 'fase') {
    if (slide.section === 'informe') return `Rival · ${slide.title}`
    if (slide.section === 'plan') return `Plan · ${slide.title}`
    return slide.title
  }
  if (slide.kind === 'contexto' || slide.kind === 'once') return slide.title
  if (slide.section === 'informe') return `Rival · ${slide.kicker || 'Vídeo'}`
  if (slide.section === 'plan') return `Plan · ${slide.kicker || 'Vídeo'}`
  return slide.kicker || 'Vídeo'
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
  const kicker = kind === 'plan' ? 'Plan de Partido' : 'Informe Rival'
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
    rivalEscudoUrl: meta.rivalEscudoUrl,
  }
}

function phaseBlock(
  fase: FasePlanPartido,
  phase: RivalPhaseAnalysis | PlanPartidoPhase | undefined,
  bullets: string[]
): ShowSlide[] {
  const clips = playableClips(phase && 'clips' in phase ? phase.clips : undefined)
  const board = pickBoard(phase)
  if (bullets.length === 0 && !board && clips.length === 0) return []

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

function slotForRevisionClip(
  clip: { fase?: string | null },
  links: Array<{ folder_id?: string | null; slot_tipo?: string }>,
  folderById: Map<string, { fase?: string | null }>,
): ShowVideoSlot | null {
  const fromClip = normalizeShowSlot(clip.fase)
  if (fromClip) return fromClip
  for (const link of links) {
    if (link.slot_tipo === 'once_jugador') return 'once_probable'
    if (link.folder_id) {
      const fromFolder = normalizeShowSlot(folderById.get(link.folder_id)?.fase)
      if (fromFolder) return fromFolder
    }
  }
  return null
}

function normalizeShowSlot(value?: string | null): ShowVideoSlot | null {
  if (!value) return null
  return FASE_ALIASES[value] ?? null
}

function insertPhaseVideos(
  slides: ShowSlide[],
  fase: FasePlanPartido,
  videos: Extract<ShowSlide, { kind: 'video' }>[],
) {
  let last = -1
  for (let i = 0; i < slides.length; i += 1) {
    const slide = slides[i]
    if (slide.kind === 'fase' && slide.fase === fase) last = i
    if (slide.kind === 'video' && slide.fase === fase) last = i
  }
  if (last < 0) {
    slides.push(
      {
        id: `fase:${fase}`,
        kind: 'fase',
        fase,
        kicker: 'Fase',
        title: SHOW_FASE_LABELS[fase],
        bullets: [],
      },
      ...videos,
    )
    return
  }
  slides.splice(last + 1, 0, ...videos)
}

function insertOnceVideos(slides: ShowSlide[], videos: Extract<ShowSlide, { kind: 'video' }>[]) {
  let last = -1
  for (let i = 0; i < slides.length; i += 1) {
    const slide = slides[i]
    if (slide.kind === 'once') last = i
    if (slide.kind === 'video' && slide.fase === 'once_probable') last = i
  }
  if (last < 0) {
    const contextoIdx = slides.findIndex((slide) => slide.kind === 'contexto')
    const portadaIdx = slides.findIndex((slide) => slide.kind === 'portada')
    last = contextoIdx >= 0 ? contextoIdx : Math.max(portadaIdx, 0)
  }
  slides.splice(last + 1, 0, ...videos)
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
  const sistema = (estrategia.sistema || '').trim()
  const colocacion = estrategia.once_probable?.colocacion ?? {}
  const jugadores = (estrategia.once_probable?.jugadores ?? [])
    .filter((j) => (j.nombre || '').trim())
    .map((j) => ({
      nombre: j.nombre.trim(),
      dorsal: j.dorsal,
      comentario: j.comentario,
    }))
  const placed = Object.values(colocacion).some((name) => (name || '').trim())
  const bullets: string[] = []
  const commented = jugadores.filter((j) => (j.comentario || '').trim())
  for (const jugador of commented) {
    pushLine(bullets, oncePlayerLine(jugador))
  }
  const clipped = finalizeBullets(bullets)
  if (!sistema && !placed && clipped.length === 0) return null
  return {
    id: 'once',
    kind: 'once',
    kicker: 'Once probable',
    title: 'Once probable',
    bullets: clipped,
    sistema: sistema || undefined,
    colocacion: placed ? colocacion : undefined,
    jugadores: jugadores.length > 0 ? jugadores : undefined,
  }
}

function oncePlayerLine(jugador: {
  nombre?: string
  dorsal?: number | null
  rol?: string
  posicion?: string
  comentario?: string
}): string {
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
