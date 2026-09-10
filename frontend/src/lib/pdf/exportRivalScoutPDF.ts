import { jsPDF } from 'jspdf'
import type {
  FaseRival,
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
import type { AsignacionRolTactico } from '@/types'
import { useClubStore } from '@/stores/clubStore'
import {
  formatLocalia,
  hexToRgb,
  informeRivalPdfFilename,
  pitchDisplaySize,
} from './planPartidoPdfLayout'

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
  clubNombre?: string
  clubLogoUrl?: string
  colorPrimario?: string
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

  const localia = formatLocalia(meta.localia)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(203, 213, 225)
  if (localia) doc.text(localia, x, 28)
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
  }

  const [clubLogo, rivalCrest] = await Promise.all([
    loadImageDataUrl(resolved.clubLogoUrl),
    loadImageDataUrl(resolved.rivalEscudoUrl),
  ])

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 14
  const contentWidth = pageWidth - margin * 2
  drawHeader(doc, resolved, { club: clubLogo, rival: rivalCrest })
  let y = 44

  if (data.estrategia?.notas?.trim()) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    doc.text('CONTEXTO', margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(51, 65, 85)
    y = writeWrapped(doc, data.estrategia.notas, margin, y, contentWidth)
    y += 5
  }

  for (const faseKey of FASE_ORDER) {
    const phase = (data.fases ?? []).find((f) => f.fase === faseKey)
    if (!phaseHasContent(phase)) continue

    y = ensureSpace(doc, y, 16, margin)
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
        y = addPizarraImage(doc, sub.pizarra_tactica, margin, y, contentWidth)
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
      y = addPizarraImage(doc, phase.pizarra_tactica, margin, y, contentWidth)
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

    y += 4
  }

  drawFooters(doc, resolved.clubNombre)
  doc.save(informeRivalPdfFilename(resolved.rivalNombre))
}
