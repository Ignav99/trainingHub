import { jsPDF } from 'jspdf'
import {
  ABP_TIPOS,
  type FasePlanPartido,
  type PlanPartidoData,
  type PlanPartidoPhase,
  type PlanPartidoSubfaseData,
  type RivalSubfaseAtaque,
  type RivalSubfaseDefensa,
} from '@/types'
import { jugadaToBoardData } from '@/lib/abpDiagramAdapter'
import { abpApi } from '@/lib/api/abp'
import {
  getContextForSubfase,
  getRolesForContext,
  rolLabel,
  type ContextoRoles,
} from '@/lib/tacticalRoles'
import type { AsignacionRolTactico } from '@/types'
import { deriveAsignacionesFromDiagram, diagramHasContent } from '@/lib/planPartidoDiagramRoles'
import { abpDefensivaEnInforme, estructuraTieneContenido, nutricionEnInforme, nutricionLineas } from '@/lib/planPartidoOpcional'
import { useClubStore } from '@/stores/clubStore'
import {
  formatLocalia,
  formatPlanFecha,
  formatPlanHora,
  formatPlanTramo,
  PITCH_PDF_MAX_MM,
  pitchDisplaySize,
  planPdfFilename,
} from './planPartidoPdfLayout'
import { resolvePizarraPng } from './capturePizarraForPdf'
import {
  bandaPdf,
  cabeceraPdf,
  cerrarPdf,
  colorTexto,
  etiquetaPdf,
  fuente,
  LINEA,
  prepararPdf,
  rgbHex,
  temaDelClub,
  tinta,
  TINTA,
  TINTA_SUAVE,
  trazo,
  type TemaPdf,
} from './marca'

const FASE_LABELS: Record<FasePlanPartido, string> = {
  ataque_organizado: 'Ataque organizado',
  defensa_organizada: 'Defensa organizada',
  transicion_ofensiva: 'Transición ofensiva',
  transicion_defensiva: 'Transición defensiva',
  abp_ofensiva: 'ABP ofensiva',
  abp_defensiva: 'ABP defensiva',
}

const FASE_COLORS: Record<FasePlanPartido, [number, number, number]> = {
  ataque_organizado: [37, 99, 235],
  defensa_organizada: [220, 38, 38],
  transicion_ofensiva: [5, 150, 105],
  transicion_defensiva: [217, 119, 6],
  abp_ofensiva: [124, 58, 237],
  abp_defensiva: [217, 119, 6],
}

const SUBFASE_LABELS: Record<string, string> = {
  creacion: 'Creación',
  progresion: 'Progresión',
  finalizacion: 'Finalización',
  bloque_alto: 'Bloque alto',
  bloque_medio: 'Bloque Mixto',
  bloque_bajo: 'Bloque bajo',
}

const FASE_ORDER: FasePlanPartido[] = [
  'ataque_organizado',
  'defensa_organizada',
  'transicion_ofensiva',
  'transicion_defensiva',
  'abp_ofensiva',
  'abp_defensiva',
]

export interface PlanPartidoPdfMeta {
  rivalNombre?: string
  rivalEscudoUrl?: string
  fecha?: string
  hora?: string
  campo?: string
  localia?: string
  clubNombre?: string
  clubLogoUrl?: string
  colorPrimario?: string
  tramo?: 'ida' | 'vuelta' | string
}

type JugadaInfo = {
  nombre: string
  tipo?: string
  preview?: string
  diagrama?: import('@/components/tactical-board/types').TareaPizarraData
}

function jugadaTipoLabel(tipo?: string): string {
  return ABP_TIPOS.find((item) => item.value === tipo)?.label ?? ''
}

function jugadaDisplayName(info: JugadaInfo | undefined): string {
  const nombre = info?.nombre?.trim()
  if (nombre) return nombre
  return jugadaTipoLabel(info?.tipo) || 'Jugada'
}

let lockPage = false

/** Deja ~16 mm libres abajo para el pie normalizado de cerrarPdf. */
function pageFloor(doc: jsPDF): number {
  return doc.internal.pageSize.getHeight() - 16
}

function ensureSpace(doc: jsPDF, y: number, needed: number, margin: number): number {
  if (y + needed > pageFloor(doc)) {
    if (lockPage) return y
    doc.addPage()
    return margin + 6
  }
  return y
}

function writeWrapped(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight = 4.4
): number {
  if (lockPage && y > pageFloor(doc)) return y
  const lines = doc.splitTextToSize(text, maxWidth) as string[]
  doc.text(lines, x, y)
  return y + lines.length * lineHeight
}

async function loadImageDataUrl(url?: string | null): Promise<string | null> {
  if (!url) return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function resolveRoles(
  stored: AsignacionRolTactico[] | undefined,
  diagram: Parameters<typeof deriveAsignacionesFromDiagram>[0]
): AsignacionRolTactico[] {
  if (stored?.length) return stored
  return deriveAsignacionesFromDiagram(diagram)
}

function writeRoles(
  doc: jsPDF,
  roles: AsignacionRolTactico[],
  context: ContextoRoles,
  margin: number,
  y: number,
  contentWidth: number
): number {
  if (!roles.length) return y
  const options = getRolesForContext(context)
  y = ensureSpace(doc, y, 10 + roles.length * 5, margin)
  etiquetaPdf(doc, 'ROLES', margin, y)
  y += 4.5
  fuente(doc)
  doc.setFontSize(9)
  const colW = (contentWidth - 4) / 2
  let col = 0
  let rowY = y
  let maxY = y
  for (const r of roles) {
    const label = `${rolLabel(r.rol, options)}  ·  ${r.jugador}`
    const x = margin + col * (colW + 4)
    tinta(doc, TINTA)
    const next = writeWrapped(doc, label, x, rowY, colW, 4)
    maxY = Math.max(maxY, next)
    col += 1
    if (col === 2) {
      col = 0
      rowY = maxY + 1.5
    }
  }
  return (col === 0 ? rowY : maxY) + 3
}

function addPizarraImage(
  doc: jsPDF,
  png: string | undefined,
  margin: number,
  y: number,
  contentWidth: number,
  maxHeight?: number,
): number {
  if (!png?.startsWith('data:image')) return y
  const room = Math.min(maxHeight ?? PITCH_PDF_MAX_MM, pageFloor(doc) - y - 2)
  if (room < 28) return y
  try {
    const props = doc.getImageProperties(png)
    const { w, h } = pitchDisplaySize(contentWidth, props.width, props.height, room)
    const x = margin + (contentWidth - w) / 2
    trazo(doc, LINEA)
    doc.setFillColor(15, 40, 12) // fondo de césped tras la pizarra
    doc.roundedRect(x - 1, y - 1, w + 2, h + 2, 1.5, 1.5, 'FD')
    const format = png.includes('image/jpeg') ? 'JPEG' : 'PNG'
    const alias = `pz-${doc.getNumberOfPages()}-${Math.round(y)}-${png.length}`
    doc.addImage(png, format, x, y, w, h, alias, 'FAST')
    return y + h + 5
  } catch {
    return y
  }
}

function isOrganizedPlan(fase: string | undefined): boolean {
  return fase === 'ataque_organizado' || fase === 'defensa_organizada'
}

function eachPlanSubfase(phase: PlanPartidoPhase): Array<[string, PlanPartidoSubfaseData]> {
  const subfases = phase.subfases
  if (!subfases) return []
  const preferred = isOrganizedPlan(phase.fase)
    ? phase.fase === 'ataque_organizado'
      ? ['creacion', 'progresion', 'finalizacion']
      : ['bloque_alto', 'bloque_medio', 'bloque_bajo']
    : Object.keys(subfases)
  const seen = new Set<string>()
  const out: Array<[string, PlanPartidoSubfaseData]> = []
  for (const key of preferred) {
    const sub = subfases[key as keyof typeof subfases]
    if (!sub) continue
    seen.add(key)
    out.push([key, sub])
  }
  for (const key of Object.keys(subfases)) {
    if (seen.has(key)) continue
    const sub = subfases[key as keyof typeof subfases]
    if (sub) out.push([key, sub])
  }
  return out
}

function planSubHasContent(sub: {
  notas?: string
  sistema?: string
  roles?: unknown[]
  pizarra_tactica?: string
  pizarra_diagrama?: PlanPartidoPhase['pizarra_diagrama']
  fortalezas?: string[]
  debilidades?: string[]
} | undefined): boolean {
  return Boolean(
    sub?.notas?.trim() ||
      sub?.sistema?.trim() ||
      sub?.roles?.length ||
      sub?.pizarra_tactica ||
      diagramHasContent(sub?.pizarra_diagrama)
  )
}

function phaseHasContent(phase: PlanPartidoPhase | undefined): boolean {
  if (!phase) return false
  if (phase.comentario_general?.trim()) return true
  if (phase.texto?.trim()) return true
  if (phase.sistema?.trim()) return true
  if (phase.roles?.length) return true
  if (phase.pizarra_tactica || diagramHasContent(phase.pizarra_diagrama)) return true
  if (
    phase.subfases && Object.values(phase.subfases).some((s) => planSubHasContent(s))
  )
    return true
  if (phase.jugadas_abp?.length) return true
  if (phase.clips?.length) return true
  if ((phase.estructuras_rival ?? []).some((item) => estructuraTieneContenido(item))) return true
  return false
}

/** Cabecera normalizada: escudo propio · "Plan de partido" · vs rival · meta del partido · escudo rival. */
function drawHeader(
  doc: jsPDF,
  tema: TemaPdf,
  meta: PlanPartidoPdfMeta,
  logos: { club?: string | null; rival?: string | null }
): Promise<number> {
  const fecha = formatPlanFecha(meta.fecha)
  const hora = formatPlanHora(meta.hora)
  const localia = formatLocalia(meta.localia)
  const tramo = formatPlanTramo(meta.tramo)
  const linea1 = [fecha, hora].filter(Boolean).join(' · ')
  const linea2 = [meta.campo?.trim(), localia, tramo].filter(Boolean).join(' · ')
  const rival = (meta.rivalNombre || '').trim()
  return cabeceraPdf(doc, tema, {
    titulo: 'Plan de partido',
    subtitulo: rival ? `vs ${rival}` : undefined,
    meta: [linea1, linea2].filter(Boolean).join('\n') || undefined,
    escudo: logos.club?.startsWith('data:image') ? logos.club : null,
    escudoDerecha: logos.rival?.startsWith('data:image') ? logos.rival : null,
  })
}

async function writeAbpItems(
  doc: jsPDF,
  items: NonNullable<PlanPartidoPhase['jugadas_abp']>,
  jugadas: Map<string, JugadaInfo>,
  title: string,
  accent: string,
  margin: number,
  y: number,
  contentWidth: number,
  imageMax?: number,
): Promise<number> {
  y = ensureSpace(doc, y, 12, margin)
  etiquetaPdf(doc, title, margin, y, accent)
  y += 5
  for (const item of items) {
    const info = jugadas.get(item.jugada_id)
    const nombre = jugadaDisplayName(info)
    const tipoLabel = jugadaTipoLabel(info?.tipo)
    const preview = await resolvePizarraPng(info?.preview, info?.diagrama)
    y = ensureSpace(doc, y, 12, margin)
    fuente(doc, 'bold')
    doc.setFontSize(10)
    tinta(doc, TINTA)
    doc.text(nombre, margin, y)
    y += 4.5
    if (tipoLabel && tipoLabel !== nombre) {
      fuente(doc)
      doc.setFontSize(8)
      tinta(doc, TINTA_SUAVE)
      doc.text(tipoLabel, margin, y)
      y += 4
    }
    if (item.comentario?.trim()) {
      fuente(doc)
      doc.setFontSize(9)
      tinta(doc, TINTA_SUAVE)
      y = writeWrapped(doc, item.comentario.trim(), margin, y, contentWidth)
      y += 2
    }
    if (preview?.startsWith('data:image')) {
      y = addPizarraImage(doc, preview, margin, y, contentWidth, imageMax)
    }
    y += 2
  }
  return y
}

function wrappedMm(doc: jsPDF, text: string | undefined, width: number): number {
  const value = (text || '').trim()
  if (!value) return 0
  return (doc.splitTextToSize(value, width) as string[]).length * 4.4 + 3
}

function planPhaseHeight(
  doc: jsPDF,
  phase: PlanPartidoPhase,
  contentWidth: number,
  imageMax: number,
  jugadas: Map<string, JugadaInfo>,
): number {
  let h = 16
  if (phase.comentario_general?.trim()) h += 6 + wrappedMm(doc, phase.comentario_general, contentWidth)
  for (const [, sub] of eachPlanSubfase(phase)) {
    if (!planSubHasContent(sub)) continue
    h += 10
    if (sub?.sistema?.trim()) h += 5
    h += wrappedMm(doc, sub?.notas, contentWidth)
    h += (sub?.roles?.length ?? 0) * 5
    if (sub?.pizarra_tactica || diagramHasContent(sub?.pizarra_diagrama)) h += imageMax + 6
  }
  if (phase.texto?.trim() && !phase.subfases) h += wrappedMm(doc, phase.texto, contentWidth)
  if (!phase.subfases) {
    h += (phase.roles?.length ?? 0) * 5
    if (phase.pizarra_tactica || diagramHasContent(phase.pizarra_diagrama)) h += imageMax + 6
  }
  if (phase.jugadas_abp?.length) {
    h += 8
    for (const item of phase.jugadas_abp) {
      h += 14
      h += wrappedMm(doc, item.comentario, contentWidth)
      const info = jugadas.get(item.jugada_id)
      if (info?.preview || info?.diagrama) h += imageMax + 6
    }
  }
  for (const item of phase.estructuras_rival ?? []) {
    if (!estructuraTieneContenido(item)) continue
    h += 12
    h += wrappedMm(doc, item.notas, contentWidth)
    if (item.pizarra_tactica || diagramHasContent(item.pizarra_diagrama)) h += imageMax + 6
  }
  if (phase.clips?.length) {
    h += 8
    for (const clip of phase.clips) h += wrappedMm(doc, clip.titulo, contentWidth)
  }
  return h + 4
}

export async function exportPlanPartidoPDF(
  data: Partial<PlanPartidoData>,
  equipoId?: string,
  metaInput?: PlanPartidoPdfMeta
) {
  const club = useClubStore.getState()
  const meta: PlanPartidoPdfMeta = {
    clubNombre: metaInput?.clubNombre || club.organizacion?.nombre || undefined,
    clubLogoUrl: metaInput?.clubLogoUrl || club.theme.logoUrl || club.organizacion?.logo_url,
    colorPrimario: metaInput?.colorPrimario || club.theme.colorPrimario || club.organizacion?.color_primario,
    rivalNombre: metaInput?.rivalNombre,
    rivalEscudoUrl: metaInput?.rivalEscudoUrl,
    fecha: metaInput?.fecha,
    hora: metaInput?.hora,
    campo: metaInput?.campo,
    localia: metaInput?.localia,
    tramo: metaInput?.tramo,
  }

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const tema = await prepararPdf(
    doc,
    temaDelClub({
      colorPrimario: meta.colorPrimario ?? null,
      club: meta.clubNombre ?? null,
      logoUrl: meta.clubLogoUrl ?? null,
    }),
  )
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 12
  const contentWidth = pageWidth - margin * 2

  const jugadas = new Map<string, JugadaInfo>()
  if (equipoId) {
    try {
      const res = await abpApi.list(equipoId)
      for (const j of res.data) {
        const board = jugadaToBoardData(j)
        jugadas.set(j.id, {
          nombre: j.nombre,
          tipo: j.tipo,
          preview: j.fases?.[0]?.diagram?.preview,
          diagrama: diagramHasContent(board) ? board : undefined,
        })
      }
    } catch {
      /* export without names */
    }
  }

  const [clubLogo, rivalLogo] = await Promise.all([
    loadImageDataUrl(meta.clubLogoUrl),
    loadImageDataUrl(meta.rivalEscudoUrl),
  ])

  let y = await drawHeader(doc, tema, meta, { club: clubLogo, rival: rivalLogo })

  const fases = data.fases ?? []

  for (const faseKey of FASE_ORDER) {
    if (faseKey === 'abp_defensiva' && !abpDefensivaEnInforme(data)) continue
    const phase = fases.find((f) => f.fase === faseKey)
    if (!phase || !phaseHasContent(phase)) continue

    const pageCap = pageFloor(doc) - (margin + 2)
    let imageMax = 72
    let need = planPhaseHeight(doc, phase, contentWidth, imageMax, jugadas)
    while (need > pageCap && imageMax > 40) {
      imageMax -= 8
      need = planPhaseHeight(doc, phase, contentWidth, imageMax, jugadas)
    }
    if (y + need > pageFloor(doc)) {
      doc.addPage()
      y = margin + 6
    }
    lockPage = true
    // Color de fase = código semántico (se mantiene); el texto elige contraste.
    const faseHex = rgbHex(FASE_COLORS[faseKey])
    const accent = colorTexto(faseHex)
    bandaPdf(doc, faseHex, FASE_LABELS[faseKey], margin, y, contentWidth, 10)
    y += 14

    fuente(doc)
    doc.setFontSize(9.5)
    tinta(doc, TINTA)

    if (isOrganizedPlan(phase?.fase) && phase?.comentario_general?.trim()) {
      fuente(doc, 'media')
      doc.setFontSize(9.5)
      tinta(doc, TINTA)
      doc.text('Objetivo', margin, y)
      y += 4.5
      fuente(doc)
      tinta(doc, TINTA)
      y = writeWrapped(doc, phase.comentario_general.trim(), margin, y, contentWidth)
      y += 3
    }

    if (phase) {
      for (const [key, sub] of eachPlanSubfase(phase)) {
        if (!planSubHasContent(sub)) continue
        y = ensureSpace(doc, y, 16, margin)
        fuente(doc, 'bold')
        doc.setFontSize(11.5)
        tinta(doc, tema.primarioTexto)
        doc.text(SUBFASE_LABELS[key] ?? key, margin, y)
        y += 6.2
        fuente(doc)
        doc.setFontSize(9.5)
        tinta(doc, TINTA)
        if (sub.notas?.trim()) {
          y = writeWrapped(doc, sub.notas.trim(), margin, y, contentWidth)
          y += 3
        }
        if (sub.sistema?.trim()) {
          fuente(doc, 'media')
          doc.text(`Sistema  ${sub.sistema}`, margin, y)
          y += 5
          fuente(doc)
        }
        const ctx =
          phase.fase === 'ataque_organizado' || phase.fase === 'defensa_organizada'
            ? getContextForSubfase(phase.fase, key as RivalSubfaseAtaque | RivalSubfaseDefensa)
            : 'creacion_progresion'
        const roles = resolveRoles(sub.roles, sub.pizarra_diagrama)
        y = writeRoles(doc, roles, ctx, margin, y, contentWidth)
        y = addPizarraImage(
          doc,
          await resolvePizarraPng(sub.pizarra_tactica, sub.pizarra_diagrama),
          margin,
          y,
          contentWidth,
          imageMax,
        )
      }
    }

    if (phase?.texto?.trim() && !phase.subfases) {
      y = writeWrapped(doc, phase.texto.trim(), margin, y, contentWidth)
      y += 3
    }

    if (phase && !phase.subfases) {
      const ctx: ContextoRoles =
        phase.fase === 'transicion_ofensiva' ? 'transicion_ofensiva' : 'creacion_progresion'
      const roles = resolveRoles(phase.roles, phase.pizarra_diagrama)
      if (roles.length) y = writeRoles(doc, roles, ctx, margin, y, contentWidth)
      y = addPizarraImage(
        doc,
        await resolvePizarraPng(phase.pizarra_tactica, phase.pizarra_diagrama),
        margin,
        y,
        contentWidth,
        imageMax,
      )
    }

    if (phase?.jugadas_abp?.length) {
      const title = faseKey === 'ataque_organizado' ? 'Saques de puerta (balón parado)' : 'Jugadas ABP'
      y = await writeAbpItems(doc, phase.jugadas_abp, jugadas, title, accent, margin, y, contentWidth, imageMax)
    }

    if (faseKey === 'abp_ofensiva' && phase?.estructuras_rival?.length) {
      const visibles = phase.estructuras_rival.filter((item) => estructuraTieneContenido(item))
      if (visibles.length > 0) {
        y = ensureSpace(doc, y, 12, margin)
        etiquetaPdf(doc, 'ESTRUCTURA DEFENSIVA DEL RIVAL', margin, y, accent)
        y += 5
        for (const item of visibles) {
          y = ensureSpace(doc, y, 12, margin)
          fuente(doc, 'bold')
          doc.setFontSize(10)
          tinta(doc, TINTA)
          doc.text(item.titulo.trim() || 'Estructura defensiva', margin, y)
          y += 4.5
          if (item.notas?.trim()) {
            fuente(doc)
            doc.setFontSize(9)
            tinta(doc, TINTA)
            y = writeWrapped(doc, item.notas.trim(), margin, y, contentWidth)
            y += 2
          }
          y = addPizarraImage(
            doc,
            await resolvePizarraPng(item.pizarra_tactica, item.pizarra_diagrama),
            margin,
            y,
            contentWidth,
            imageMax,
          )
          y += 2
        }
      }
    }

    if (phase?.clips?.length) {
      y = ensureSpace(doc, y, 10, margin)
      etiquetaPdf(doc, 'CLIPS', margin, y)
      y += 5
      fuente(doc)
      doc.setFontSize(9)
      tinta(doc, TINTA)
      for (const clip of phase.clips) {
        y = writeWrapped(doc, `•  ${clip.titulo}`, margin, y, contentWidth)
      }
      y += 3
    }

    y += 4
    lockPage = false
  }

  if (nutricionEnInforme(data)) {
    const lineas = nutricionLineas(data.nutricion_partido)
    if (lineas.length > 0) {
      const need = 16 + lineas.reduce((sum, line) => sum + wrappedMm(doc, line, contentWidth), 0)
      if (y + need > pageFloor(doc)) {
        doc.addPage()
        y = margin + 6
      }
      bandaPdf(doc, tema.primario, 'Nutrición', margin, y, contentWidth, 10)
      y += 14
      fuente(doc)
      doc.setFontSize(9.5)
      tinta(doc, TINTA)
      for (const line of lineas) {
        y = writeWrapped(doc, line, margin, y, contentWidth)
        y += 2
      }
    }
  }

  await cerrarPdf(doc, tema, 'Plan de partido')
  doc.save(planPdfFilename(meta.rivalNombre, meta.fecha, meta.tramo))
}

/** @deprecated sync wrapper — use exportPlanPartidoPDF async */
export function exportPlanPartidoPDFSync(data: Partial<PlanPartidoData>, meta?: PlanPartidoPdfMeta) {
  void exportPlanPartidoPDF(data, undefined, meta)
}
