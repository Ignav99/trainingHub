import { jsPDF } from 'jspdf'
import type {
  AsignacionRolTactico,
  FaseRival,
  PreMatchIntel,
  RivalPhaseAnalysis,
  RivalScoutData,
  RivalSubfaseAtaque,
  RivalSubfaseDefensa,
} from '@/types'
import { deriveAsignacionesFromDiagram, diagramHasContent } from '@/lib/planPartidoDiagramRoles'
import {
  getContextForSubfase,
  getRolesForContext,
  rolLabel,
  type ContextoRoles,
} from '@/lib/tacticalRoles'
import { useClubStore } from '@/stores/clubStore'
import {
  formatLocalia,
  formatPlanFecha,
  formatPlanTramo,
  hexToRgb,
  informeRivalPdfFilename,
  PITCH_PDF_MAX_MM,
  pitchDisplaySize,
} from './planPartidoPdfLayout'
import { resolvePizarraPng } from './capturePizarraForPdf'
import { collectContextoPdfBlocks, collectOncePdfBlock } from './informeRivalPdfBlocks'
import { buildOncePitchTokens } from '@/lib/oncePitch'
import { rivalesApi } from '@/lib/api/partidos'

const FASE_LABELS: Record<FaseRival, string> = {
  ataque_organizado: 'Ataque organizado',
  defensa_organizada: 'Defensa organizada',
  transicion_ofensiva: 'Transición ofensiva',
  transicion_defensiva: 'Transición defensiva',
  abp_ofensiva: 'ABP ofensiva',
  abp_defensiva: 'ABP defensiva',
  general: 'General',
}

const SUBFASE_LABELS: Record<string, string> = {
  creacion: 'Creación',
  progresion: 'Progresión',
  finalizacion: 'Finalización',
  bloque_alto: 'Bloque alto',
  bloque_medio: 'Bloque medio',
  bloque_bajo: 'Bloque bajo',
}

const FASE_ORDER: FaseRival[] = [
  'ataque_organizado',
  'defensa_organizada',
  'transicion_ofensiva',
  'transicion_defensiva',
  'abp_ofensiva',
  'abp_defensiva',
]

export interface InformeRivalPdfMeta {
  rivalNombre?: string
  rivalEscudoUrl?: string
  localia?: string
  fecha?: string
  jornada?: number | null
  tramo?: string
  clubNombre?: string
  clubLogoUrl?: string
  colorPrimario?: string
  rivalId?: string
  competicionId?: string
}

let lockPage = false

function ensureSpace(doc: jsPDF, y: number, needed: number, margin: number): number {
  const pageHeight = doc.internal.pageSize.getHeight()
  if (y + needed > pageHeight - margin - 8) {
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
  if (y > pageFloor(doc)) return y
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

function pageFloor(doc: jsPDF): number {
  return doc.internal.pageSize.getHeight() - 16
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
    doc.setDrawColor(226, 232, 240)
    doc.setFillColor(15, 40, 12)
    doc.roundedRect(x - 1, y - 1, w + 2, h + 2, 1.5, 1.5, 'FD')
    const format = png.includes('image/jpeg') ? 'JPEG' : 'PNG'
    const alias = `pz-${doc.getNumberOfPages()}-${Math.round(y)}-${png.length}`
    doc.addImage(png, format, x, y, w, h, alias, 'FAST')
    return y + h + 4
  } catch {
    return y
  }
}

function phaseHasContent(phase: RivalPhaseAnalysis | undefined): boolean {
  if (!phase) return false
  if (phase.formacion?.trim()) return true
  if (phase.espacios?.trim()) return true
  if (phase.vigilancias?.trim()) return true
  if (phase.repliegue?.trim()) return true
  if (phase.abp_comentarios?.trim()) return true
  if (phase.abp_defensa?.trim()) return true
  if (phase.roles?.length) return true
  if (phase.pizarra_tactica || diagramHasContent(phase.pizarra_diagrama)) return true
  if (phase.fortalezas?.length || phase.debilidades?.length) return true
  if (phase.clips?.length) return true
  if (
    phase.subfases &&
    Object.values(phase.subfases).some(
      (s) =>
        s?.notas?.trim() ||
        s?.roles?.length ||
        s?.pizarra_tactica ||
        diagramHasContent(s?.pizarra_diagrama)
    )
  )
    return true
  return false
}

function writePdfBlock(
  doc: jsPDF,
  title: string,
  lines: string[],
  margin: number,
  y: number,
  contentWidth: number
): number {
  y = ensureSpace(doc, y, 10, margin)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.text(title, margin, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(51, 65, 85)
  for (const line of lines) {
    if (!line.trim()) continue
    y = ensureSpace(doc, y, 8, margin)
    y = writeWrapped(doc, line, margin, y, contentWidth)
    y += 1.5
  }
  return y + 4
}

async function loadIntelForPdf(meta: InformeRivalPdfMeta): Promise<PreMatchIntel | null> {
  if (!meta.rivalId || !meta.competicionId) return null
  try {
    return await rivalesApi.getIntel(meta.rivalId, meta.competicionId)
  } catch {
    return null
  }
}

function drawHeader(
  doc: jsPDF,
  meta: InformeRivalPdfMeta,
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
      /* skip */
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
  doc.text('INFORME RIVAL', x, 20)

  const rival = (meta.rivalNombre || '').trim()
  if (rival) {
    doc.setFontSize(11)
    doc.setTextColor(252, 165, 165)
    const vs = rival.toUpperCase()
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

  const matchLine = [
    formatPlanFecha(meta.fecha),
    meta.jornada != null && Number.isFinite(meta.jornada) ? `Jornada ${meta.jornada}` : '',
    formatPlanTramo(meta.tramo),
    formatLocalia(meta.localia),
  ].filter(Boolean).join('  ·  ')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(203, 213, 225)
  if (matchLine) doc.text(matchLine, x, 28)
}

function fillHex(doc: jsPDF, hex: string) {
  const raw = hex.replace('#', '')
  const n = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw
  doc.setFillColor(
    parseInt(n.slice(0, 2), 16) || 100,
    parseInt(n.slice(2, 4), 16) || 116,
    parseInt(n.slice(4, 6), 16) || 139,
  )
}

function drawMatchPitch(
  doc: jsPDF,
  estrategia: RivalScoutData['estrategia'],
  x: number,
  y: number,
  w: number,
  h: number,
) {
  doc.setFillColor(21, 128, 61)
  doc.roundedRect(x, y, w, h, 2, 2, 'F')
  const ix = x + 5
  const iy = y + 5
  const iw = w - 10
  const ih = h - 10
  doc.setDrawColor(255, 255, 255)
  doc.setLineWidth(0.45)
  doc.rect(ix, iy, iw, ih)
  doc.line(ix + iw / 2, iy, ix + iw / 2, iy + ih)
  doc.circle(ix + iw / 2, iy + ih / 2, Math.min(iw, ih) * 0.11)
  const boxW = iw * 0.16
  const boxH = ih * 0.62
  const boxY = iy + (ih - boxH) / 2
  doc.rect(ix, boxY, boxW, boxH)
  doc.rect(ix + iw - boxW, boxY, boxW, boxH)
  const goalW = iw * 0.07
  const goalH = ih * 0.32
  const goalY = iy + (ih - goalH) / 2
  doc.rect(ix, goalY, goalW, goalH)
  doc.rect(ix + iw - goalW, goalY, goalW, goalH)

  const tokens = buildOncePitchTokens(
    estrategia?.sistema,
    estrategia?.once_probable?.colocacion,
    estrategia?.once_probable?.jugadores,
  )
  for (const token of tokens) {
    if (!token.nombre && !token.dorsal) continue
    const cx = ix + (token.leftPct / 100) * iw
    const cy = iy + (token.topPct / 100) * ih
    fillHex(doc, token.color)
    doc.circle(cx, cy, 3.4, 'F')
    doc.setDrawColor(255, 255, 255)
    doc.setLineWidth(0.3)
    doc.circle(cx, cy, 3.4, 'S')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(255, 255, 255)
    doc.text(token.dorsal || token.label.slice(0, 3), cx, cy + 1.1, { align: 'center' })
    if (token.nombre) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.5)
      doc.text(token.nombre, cx, cy + 6.2, { align: 'center' })
    }
  }
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
    doc.text(clubNombre || 'Informe Rival', 12, pageHeight - 6)
    doc.text(`${i} / ${total}`, pageWidth - 12, pageHeight - 6, { align: 'right' })
  }
}

export async function exportRivalScoutPDF(
  data: Partial<RivalScoutData>,
  meta: InformeRivalPdfMeta = {}
) {
  const club = useClubStore.getState()
  const resolved: InformeRivalPdfMeta = {
    clubNombre: club.organizacion?.nombre || meta.clubNombre,
    clubLogoUrl: club.theme.logoUrl || meta.clubLogoUrl,
    colorPrimario: club.theme.colorPrimario || meta.colorPrimario,
    rivalNombre: meta.rivalNombre,
    rivalEscudoUrl: meta.rivalEscudoUrl,
    localia: meta.localia,
    fecha: meta.fecha,
    jornada: meta.jornada,
    tramo: meta.tramo,
    rivalId: meta.rivalId,
    competicionId: meta.competicionId,
  }

  const [clubLogo, rivalCrest, intel] = await Promise.all([
    loadImageDataUrl(resolved.clubLogoUrl),
    loadImageDataUrl(resolved.rivalEscudoUrl),
    loadIntelForPdf(resolved),
  ])

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 14
  const contentWidth = pageWidth - margin * 2
  drawHeader(doc, resolved, { club: clubLogo, rival: rivalCrest })

  lockPage = true
  let y = 46
  const contextoBlocks = collectContextoPdfBlocks(data.estrategia, intel)
  for (const block of contextoBlocks) {
    y = writePdfBlock(doc, block.title, block.lines, margin, y, contentWidth)
  }
  const pitchH = 108
  if (y + pitchH < pageFloor(doc)) {
    if (data.estrategia?.sistema) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(15, 23, 42)
      doc.text(data.estrategia.sistema, margin, y)
      y += 4
    }
    drawMatchPitch(doc, data.estrategia, margin, y, contentWidth, pitchH)
    y += pitchH + 4
  }
  const onceBlock = collectOncePdfBlock(data.estrategia)
  if (onceBlock && y < pageFloor(doc) - 12) {
    y = writePdfBlock(doc, 'COMENTARIOS', onceBlock.lines, margin, y, contentWidth)
  }
  lockPage = false

  for (const faseKey of FASE_ORDER) {
    const phase = (data.fases ?? []).find((f) => f.fase === faseKey)
    if (!phaseHasContent(phase)) continue

    doc.addPage()
    lockPage = true
    let y = margin + 2
    doc.setFillColor(241, 245, 249)
    doc.roundedRect(margin, y, contentWidth, 8, 1, 1, 'F')
    doc.setTextColor(15, 23, 42)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(FASE_LABELS[faseKey], margin + 2, y + 5.5)
    y += 13

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(51, 65, 85)

    if (phase?.formacion?.trim()) {
      doc.text(`Sistema: ${phase.formacion}`, margin, y)
      y += 5
    }
    if (phase?.espacios?.trim()) {
      y = writeWrapped(doc, phase.espacios, margin, y, contentWidth)
      y += 3
    }

    if (phase?.subfases) {
      for (const [key, sub] of Object.entries(phase.subfases)) {
        if (
          !sub?.notas?.trim() &&
          !sub?.roles?.length &&
          !sub?.pizarra_tactica &&
          !diagramHasContent(sub?.pizarra_diagrama)
        )
          continue
        y = ensureSpace(doc, y, 14, margin)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(37, 99, 235)
        doc.text(SUBFASE_LABELS[key] ?? key, margin, y)
        y += 5
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(51, 65, 85)
        if (sub.notas?.trim()) {
          y = writeWrapped(doc, sub.notas, margin, y, contentWidth)
          y += 3
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
          72,
        )
      }
    }

    if (phase?.vigilancias?.trim()) {
      doc.setFont('helvetica', 'bold')
      doc.text('Vigilancias', margin, y)
      y += 4.5
      doc.setFont('helvetica', 'normal')
      y = writeWrapped(doc, phase.vigilancias, margin, y, contentWidth)
      y += 3
    }
    if (phase?.repliegue?.trim()) {
      doc.setFont('helvetica', 'bold')
      doc.text('Repliegue', margin, y)
      y += 4.5
      doc.setFont('helvetica', 'normal')
      y = writeWrapped(doc, phase.repliegue, margin, y, contentWidth)
      y += 3
    }
    if (phase?.abp_comentarios?.trim()) {
      y = writeWrapped(doc, phase.abp_comentarios, margin, y, contentWidth)
      y += 3
    }
    if (phase?.abp_defensa?.trim()) {
      y = writeWrapped(doc, phase.abp_defensa, margin, y, contentWidth)
      y += 3
    }

    if (phase?.roles?.length && phase.fase === 'transicion_ofensiva') {
      y = writeRoles(doc, resolveRoles(phase.roles, phase.pizarra_diagrama), 'transicion_ofensiva', margin, y, contentWidth)
    }

    if (phase && !phase.subfases && (phase.pizarra_tactica || diagramHasContent(phase.pizarra_diagrama))) {
      y = addPizarraImage(
        doc,
        await resolvePizarraPng(phase.pizarra_tactica, phase.pizarra_diagrama),
        margin,
        y,
        contentWidth,
        90,
      )
    }

    if (phase?.fortalezas?.length) {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(5, 150, 105)
      doc.text('Fortalezas', margin, y)
      y += 4.5
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(51, 65, 85)
      y = writeWrapped(doc, phase.fortalezas.join(' · '), margin, y, contentWidth)
      y += 3
    }
    if (phase?.debilidades?.length) {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(220, 38, 38)
      doc.text('Debilidades', margin, y)
      y += 4.5
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(51, 65, 85)
      y = writeWrapped(doc, phase.debilidades.join(' · '), margin, y, contentWidth)
      y += 3
    }

    if (phase?.clips?.length) {
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

    lockPage = false
  }

  drawFooters(doc, resolved.clubNombre)
  doc.save(informeRivalPdfFilename(resolved.rivalNombre))
}
