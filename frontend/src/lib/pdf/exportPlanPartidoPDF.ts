import { jsPDF } from 'jspdf'
import type {
  FasePlanPartido,
  PlanPartidoData,
  PlanPartidoPhase,
  RivalSubfaseAtaque,
  RivalSubfaseDefensa,
} from '@/types'
import { abpApi } from '@/lib/api/abp'
import {
  getContextForSubfase,
  getRolesForContext,
  rolLabel,
  type ContextoRoles,
} from '@/lib/tacticalRoles'
import type { AsignacionRolTactico } from '@/types'
import { deriveAsignacionesFromDiagram, diagramHasContent } from '@/lib/planPartidoDiagramRoles'
import { useClubStore } from '@/stores/clubStore'
import {
  formatLocalia,
  formatPlanFecha,
  formatPlanHora,
  formatPlanTramo,
  hexToRgb,
  pitchDisplaySize,
  planPdfFilename,
} from './planPartidoPdfLayout'

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
  bloque_medio: 'Bloque medio',
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
  codigo?: string
  preview?: string
}

function ensureSpace(doc: jsPDF, y: number, needed: number, margin: number): number {
  const pageHeight = doc.internal.pageSize.getHeight()
  if (y + needed > pageHeight - margin - 8) {
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
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.text('ROLES', margin, y)
  y += 4.5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const colW = (contentWidth - 4) / 2
  let col = 0
  let rowY = y
  let maxY = y
  for (const r of roles) {
    const label = `${rolLabel(r.rol, options)}  ·  ${r.jugador}`
    const x = margin + col * (colW + 4)
    doc.setTextColor(30, 41, 59)
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
  contentWidth: number
): number {
  if (!png?.startsWith('data:image')) return y
  try {
    const props = doc.getImageProperties(png)
    const { w, h } = pitchDisplaySize(contentWidth, props.width, props.height, 92)
    y = ensureSpace(doc, y, h + 8, margin)
    const x = margin + (contentWidth - w) / 2
    doc.setDrawColor(226, 232, 240)
    doc.setFillColor(15, 40, 12)
    doc.roundedRect(x - 1, y - 1, w + 2, h + 2, 1.5, 1.5, 'FD')
    const format = png.includes('image/jpeg') ? 'JPEG' : 'PNG'
    doc.addImage(png, format, x, y, w, h)
    return y + h + 5
  } catch {
    return y
  }
}

function phaseHasContent(phase: PlanPartidoPhase | undefined): boolean {
  if (!phase) return false
  if (phase.texto?.trim()) return true
  if (phase.sistema?.trim()) return true
  if (phase.roles?.length) return true
  if (phase.pizarra_tactica || diagramHasContent(phase.pizarra_diagrama)) return true
  if (
    phase.subfases &&
    Object.values(phase.subfases).some(
      (s) =>
        s?.notas?.trim() ||
        s?.sistema?.trim() ||
        s?.roles?.length ||
        s?.pizarra_tactica ||
        diagramHasContent(s?.pizarra_diagrama)
    )
  )
    return true
  if (phase.jugadas_abp?.length) return true
  if (phase.clips?.length) return true
  return false
}

function drawHeader(
  doc: jsPDF,
  meta: PlanPartidoPdfMeta,
  logos: { club?: string | null; rival?: string | null }
) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const [pr, pg, pb] = hexToRgb(meta.colorPrimario || '#0d1117')
  doc.setFillColor(pr, pg, pb)
  doc.rect(0, 0, pageWidth, 36, 'F')
  doc.setFillColor(16, 185, 129)
  doc.rect(0, 36, pageWidth, 2.2, 'F')

  let x = 12
  if (logos.club?.startsWith('data:image')) {
    try {
      doc.addImage(logos.club, logos.club.includes('jpeg') ? 'JPEG' : 'PNG', x, 8, 18, 18)
      x += 22
    } catch {
      /* skip broken crest */
    }
  }

  doc.setTextColor(226, 232, 240)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  const club = (meta.clubNombre || '').toUpperCase()
  if (club) doc.text(club, x, 10)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(255, 255, 255)
  doc.text('PLAN DE PARTIDO', x, 20)

  const rival = (meta.rivalNombre || '').trim()
  if (rival) {
    doc.setFontSize(11)
    doc.setTextColor(252, 165, 165)
    const vs = `vs  ${rival.toUpperCase()}`
    const vsW = doc.getTextWidth(vs)
    const rivalX = pageWidth - 12 - vsW - (logos.rival ? 16 : 0)
    doc.text(vs, rivalX, 16, { align: 'left' })
    if (logos.rival?.startsWith('data:image')) {
      try {
        doc.addImage(logos.rival, logos.rival.includes('jpeg') ? 'JPEG' : 'PNG', pageWidth - 28, 8, 16, 18)
      } catch {
        /* skip */
      }
    }
  }

  const chips: string[] = []
  const fecha = formatPlanFecha(meta.fecha)
  const hora = formatPlanHora(meta.hora)
  const localia = formatLocalia(meta.localia)
  const tramo = formatPlanTramo(meta.tramo)
  if (tramo) chips.push(tramo)
  if (fecha) chips.push(fecha)
  if (hora) chips.push(hora)
  if (meta.campo?.trim()) chips.push(meta.campo.trim())
  if (localia) chips.push(localia)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(203, 213, 225)
  if (chips.length) doc.text(chips.join('   ·  '), x, 28)
}

function drawFooters(doc: jsPDF, clubNombre?: string) {
  const total = doc.getNumberOfPages()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setDrawColor(226, 232, 240)
    doc.line(12, pageHeight - 10, pageWidth - 12, pageHeight - 10)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(148, 163, 184)
    const left = clubNombre || 'Plan de partido'
    doc.text(left, 12, pageHeight - 6)
    doc.text(`${i} / ${total}`, pageWidth - 12, pageHeight - 6, { align: 'right' })
  }
}

function writeAbpItems(
  doc: jsPDF,
  items: NonNullable<PlanPartidoPhase['jugadas_abp']>,
  jugadas: Map<string, JugadaInfo>,
  title: string,
  accent: [number, number, number],
  margin: number,
  y: number,
  contentWidth: number
): number {
  y = ensureSpace(doc, y, 12, margin)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...accent)
  doc.text(title.toUpperCase(), margin, y)
  y += 5
  for (const item of items) {
    const info = jugadas.get(item.jugada_id)
    const nombre = info?.nombre ?? item.jugada_id.slice(0, 8)
    const preview = info?.preview
    const previewH = preview?.startsWith('data:image') ? 38 : 0
    y = ensureSpace(doc, y, 12 + previewH, margin)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(15, 23, 42)
    const bits = [nombre]
    if (info?.codigo) bits.push(info.codigo)
    doc.text(bits.join('  ·  '), margin, y)
    y += 4.5
    if (info?.tipo) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)
      doc.text(info.tipo.replace(/_/g, ' '), margin, y)
      y += 4
    }
    if (item.comentario?.trim()) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(9)
      doc.setTextColor(51, 65, 85)
      y = writeWrapped(doc, item.comentario.trim(), margin, y, contentWidth)
      y += 2
    }
    if (preview?.startsWith('data:image')) {
      y = addPizarraImage(doc, preview, margin, y, contentWidth)
    }
    y += 2
  }
  return y
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
  }

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 12
  const contentWidth = pageWidth - margin * 2
  let y = 42

  const jugadas = new Map<string, JugadaInfo>()
  if (equipoId) {
    try {
      const res = await abpApi.list(equipoId)
      for (const j of res.data) {
        jugadas.set(j.id, {
          nombre: j.nombre,
          tipo: j.tipo,
          codigo: j.codigo,
          preview: j.fases?.[0]?.diagram?.preview,
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

  drawHeader(doc, meta, { club: clubLogo, rival: rivalLogo })

  const fases = data.fases ?? []

  for (const faseKey of FASE_ORDER) {
    const phase = fases.find((f) => f.fase === faseKey)
    if (!phaseHasContent(phase)) continue

    y = ensureSpace(doc, y, 16, margin)
    const accent = FASE_COLORS[faseKey]
    doc.setFillColor(accent[0], accent[1], accent[2])
    doc.roundedRect(margin, y, contentWidth, 8, 1.2, 1.2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(FASE_LABELS[faseKey], margin + 3, y + 5.6)
    y += 12

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(51, 65, 85)

    if (phase?.subfases) {
      for (const [key, sub] of Object.entries(phase.subfases)) {
        if (
          !sub?.notas?.trim() &&
          !sub?.sistema?.trim() &&
          !sub?.roles?.length &&
          !sub?.pizarra_tactica &&
          !diagramHasContent(sub?.pizarra_diagrama)
        )
          continue
        y = ensureSpace(doc, y, 16, margin)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.setTextColor(accent[0], accent[1], accent[2])
        doc.text(SUBFASE_LABELS[key] ?? key, margin, y)
        y += 5.5
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9.5)
        doc.setTextColor(51, 65, 85)
        if (sub.sistema?.trim()) {
          doc.setFont('helvetica', 'bold')
          doc.text(`Sistema  ${sub.sistema}`, margin, y)
          y += 5
          doc.setFont('helvetica', 'normal')
        }
        if (sub.notas?.trim()) {
          y = writeWrapped(doc, sub.notas.trim(), margin, y, contentWidth)
          y += 3
        }
        const ctx =
          phase.fase === 'ataque_organizado' || phase.fase === 'defensa_organizada'
            ? getContextForSubfase(phase.fase, key as RivalSubfaseAtaque | RivalSubfaseDefensa)
            : 'creacion_progresion'
        const roles = resolveRoles(sub.roles, sub.pizarra_diagrama)
        y = writeRoles(doc, roles, ctx, margin, y, contentWidth)
        y = addPizarraImage(doc, sub.pizarra_tactica, margin, y, contentWidth)
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
      y = addPizarraImage(doc, phase.pizarra_tactica, margin, y, contentWidth)
    }

    if (phase?.jugadas_abp?.length) {
      const title = faseKey === 'ataque_organizado' ? 'Saques de puerta (balón parado)' : 'Jugadas ABP'
      y = writeAbpItems(doc, phase.jugadas_abp, jugadas, title, accent, margin, y, contentWidth)
    }

    if (phase?.clips?.length) {
      y = ensureSpace(doc, y, 10, margin)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)
      doc.text('CLIPS', margin, y)
      y += 5
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(51, 65, 85)
      for (const clip of phase.clips) {
        y = writeWrapped(doc, `•  ${clip.titulo}`, margin, y, contentWidth)
      }
      y += 3
    }

    y += 4
  }

  drawFooters(doc, meta.clubNombre)
  doc.save(planPdfFilename(meta.rivalNombre, meta.fecha, meta.tramo))
}

/** @deprecated sync wrapper — use exportPlanPartidoPDF async */
export function exportPlanPartidoPDFSync(data: Partial<PlanPartidoData>, meta?: PlanPartidoPdfMeta) {
  void exportPlanPartidoPDF(data, undefined, meta)
}
