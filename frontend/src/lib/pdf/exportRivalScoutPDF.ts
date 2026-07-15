import { jsPDF } from 'jspdf'
import type {
  FaseRival,
  RivalPhaseAnalysis,
  RivalScoutData,
  RivalSubfaseAtaque,
  RivalSubfaseDefensa,
} from '@/types'
import { diagramHasContent } from '@/lib/planPartidoDiagramRoles'
import {
  getContextForSubfase,
  getRolesForContext,
  rolLabel,
  type ContextoRoles,
} from '@/lib/tacticalRoles'
import type { AsignacionRolTactico } from '@/types'

const FASE_LABELS: Record<FaseRival, string> = {
  ataque_organizado: 'Ataque Organizado',
  defensa_organizada: 'Defensa Organizada',
  transicion_ofensiva: 'Transición Ofensiva',
  transicion_defensiva: 'Transición Defensiva',
  abp_ofensiva: 'ABP Ofensiva',
  abp_defensiva: 'ABP Defensiva',
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

function ensureSpace(doc: jsPDF, y: number, needed: number, margin: number): number {
  const pageHeight = doc.internal.pageSize.getHeight()
  if (y + needed > pageHeight - margin) {
    doc.addPage()
    return margin + 10
  }
  return y
}

function writeWrapped(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight = 5
): number {
  const lines = doc.splitTextToSize(text, maxWidth)
  doc.text(lines, x, y)
  return y + lines.length * lineHeight
}

function writeRoles(
  doc: jsPDF,
  roles: AsignacionRolTactico[] | undefined,
  context: ContextoRoles,
  margin: number,
  y: number,
  contentWidth: number
): number {
  if (!roles?.length) return y
  const options = getRolesForContext(context)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 100, 100)
  doc.text('Roles:', margin, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)
  for (const r of roles) {
    y = ensureSpace(doc, y, 8, margin)
    y = writeWrapped(doc, `• ${rolLabel(r.rol, options)} — ${r.jugador}`, margin + 2, y, contentWidth - 2)
    y += 2
  }
  return y + 2
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
    y = ensureSpace(doc, y, 60, margin)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 100, 100)
    doc.text('Pizarra:', margin, y)
    y += 4
    doc.addImage(png, 'PNG', margin, y, contentWidth, 45)
    return y + 51
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

export function exportRivalScoutPDF(data: Partial<RivalScoutData>, rivalNombre?: string) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 16
  const contentWidth = pageWidth - margin * 2
  let y = 20

  doc.setFillColor(245, 158, 11)
  doc.rect(0, 0, pageWidth, 14, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.text('TrainingHub Pro', margin, 10)

  doc.setTextColor(31, 41, 55)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(`Informe Rival${rivalNombre ? `: ${rivalNombre}` : ''}`, margin, y)
  y += 12

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, margin, y)
  y += 14

  if (data.estrategia?.notas?.trim()) {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(31, 41, 55)
    doc.text('Contexto rival', margin, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    y = writeWrapped(doc, data.estrategia.notas, margin, y, contentWidth)
    y += 6
  }

  const fases = data.fases ?? []

  for (const faseKey of FASE_ORDER) {
    const phase = fases.find((f) => f.fase === faseKey)
    if (!phaseHasContent(phase)) continue

    y = ensureSpace(doc, y, 20, margin)
    doc.setFillColor(243, 244, 246)
    doc.rect(margin, y, contentWidth, 8, 'F')
    doc.setTextColor(31, 41, 55)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(FASE_LABELS[faseKey], margin + 2, y + 6)
    y += 14

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(60, 60, 60)

    if (phase?.formacion?.trim()) {
      doc.text(`Sistema: ${phase.formacion}`, margin, y)
      y += 6
    }
    if (phase?.espacios?.trim()) {
      y = writeWrapped(doc, phase.espacios, margin, y, contentWidth)
      y += 4
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
        y = ensureSpace(doc, y, 16, margin)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(37, 99, 235)
        doc.text(SUBFASE_LABELS[key] ?? key, margin, y)
        y += 6
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(60, 60, 60)
        if (sub.notas?.trim()) {
          y = writeWrapped(doc, sub.notas, margin, y, contentWidth)
          y += 4
        }
        const ctx =
          phase.fase === 'ataque_organizado' || phase.fase === 'defensa_organizada'
            ? getContextForSubfase(phase.fase, key as RivalSubfaseAtaque | RivalSubfaseDefensa)
            : 'creacion_progresion'
        y = writeRoles(doc, sub.roles, ctx, margin, y, contentWidth)
        y = addPizarraImage(doc, sub.pizarra_tactica, margin, y, contentWidth)
      }
    }

    if (phase?.vigilancias?.trim()) {
      doc.setFont('helvetica', 'bold')
      doc.text('Vigilancias:', margin, y)
      y += 5
      doc.setFont('helvetica', 'normal')
      y = writeWrapped(doc, phase.vigilancias, margin, y, contentWidth)
      y += 4
    }
    if (phase?.repliegue?.trim()) {
      doc.setFont('helvetica', 'bold')
      doc.text('Repliegue:', margin, y)
      y += 5
      doc.setFont('helvetica', 'normal')
      y = writeWrapped(doc, phase.repliegue, margin, y, contentWidth)
      y += 4
    }
    if (phase?.abp_comentarios?.trim()) {
      y = writeWrapped(doc, phase.abp_comentarios, margin, y, contentWidth)
      y += 4
    }
    if (phase?.abp_defensa?.trim()) {
      y = writeWrapped(doc, phase.abp_defensa, margin, y, contentWidth)
      y += 4
    }

    if (phase?.roles?.length && phase.fase === 'transicion_ofensiva') {
      y = writeRoles(doc, phase.roles, 'transicion_ofensiva', margin, y, contentWidth)
    }

    if (
      phase &&
      !phase.subfases &&
      (phase.pizarra_tactica || diagramHasContent(phase.pizarra_diagrama))
    ) {
      y = addPizarraImage(doc, phase.pizarra_tactica, margin, y, contentWidth)
    }

    if (phase?.fortalezas?.length) {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(16, 185, 129)
      doc.text('Fortalezas:', margin, y)
      y += 5
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(60, 60, 60)
      y = writeWrapped(doc, phase.fortalezas.join(' • '), margin, y, contentWidth)
      y += 4
    }
    if (phase?.debilidades?.length) {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(239, 68, 68)
      doc.text('Debilidades:', margin, y)
      y += 5
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(60, 60, 60)
      y = writeWrapped(doc, phase.debilidades.join(' • '), margin, y, contentWidth)
      y += 4
    }

    if (phase?.clips?.length) {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(100, 100, 100)
      doc.text('Clips:', margin, y)
      y += 6
      doc.setFont('helvetica', 'normal')
      for (const clip of phase.clips) {
        y = writeWrapped(doc, `• ${clip.titulo}`, margin, y, contentWidth)
      }
      y += 4
    }

    y += 6
  }

  doc.save('informe-rival.pdf')
}
