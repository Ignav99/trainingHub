import { jsPDF } from 'jspdf'
import type {
  FasePlanPartido,
  PlanPartidoData,
  PlanPartidoPhase,
  RivalSubfaseAtaque,
  RivalSubfaseDefensa,
} from '@/types'
import { abpApi } from '@/lib/api/abp'

const FASE_LABELS: Record<FasePlanPartido, string> = {
  ataque_organizado: 'Ataque Organizado',
  defensa_organizada: 'Defensa Organizada',
  transicion_ofensiva: 'Transición Ofensiva',
  transicion_defensiva: 'Transición Defensiva',
  abp_ofensiva: 'ABP Ofensiva',
  abp_defensiva: 'ABP Defensiva',
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

function phaseHasContent(phase: PlanPartidoPhase | undefined): boolean {
  if (!phase) return false
  if (phase.texto?.trim()) return true
  if (phase.sistema?.trim()) return true
  if (phase.subfases && Object.values(phase.subfases).some((s) => s?.notas?.trim() || s?.sistema?.trim()))
    return true
  if (phase.jugadas_abp?.length) return true
  if (phase.clips?.length) return true
  if (phase.pizarra_tactica) return true
  return false
}

export async function exportPlanPartidoPDF(data: Partial<PlanPartidoData>, equipoId?: string) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 16
  const contentWidth = pageWidth - margin * 2
  let y = 20

  const jugadaNames = new Map<string, string>()
  if (equipoId) {
    try {
      const res = await abpApi.list(equipoId)
      for (const j of res.data) jugadaNames.set(j.id, j.nombre)
    } catch {
      /* export without names */
    }
  }

  doc.setFillColor(16, 185, 129)
  doc.rect(0, 0, pageWidth, 14, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.text('TrainingHub Pro', margin, 10)

  doc.setTextColor(31, 41, 55)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Plan de Partido', margin, y)
  y += 12

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, margin, y)
  y += 14

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

    // Subfases ataque/defensa
    if (phase?.subfases) {
      for (const [key, sub] of Object.entries(phase.subfases)) {
        if (!sub?.notas?.trim() && !sub?.sistema?.trim()) continue
        y = ensureSpace(doc, y, 16, margin)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(37, 99, 235)
        doc.text(SUBFASE_LABELS[key] ?? key, margin, y)
        y += 6
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(60, 60, 60)
        if (sub.sistema) {
          doc.text(`Sistema: ${sub.sistema}`, margin, y)
          y += 6
        }
        if (sub.notas?.trim()) {
          y = writeWrapped(doc, sub.notas, margin, y, contentWidth)
          y += 4
        }
      }
    }

    // Transiciones y fases sin subfases: solo texto
    if (phase?.texto?.trim() && !phase.subfases) {
      y = writeWrapped(doc, phase.texto, margin, y, contentWidth)
      y += 4
    }

    // ABP jugadas
    if (phase?.jugadas_abp?.length) {
      y = ensureSpace(doc, y, 12, margin)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(124, 58, 237)
      doc.text('Jugadas ABP seleccionadas:', margin, y)
      y += 7
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(60, 60, 60)
      for (const item of phase.jugadas_abp) {
        y = ensureSpace(doc, y, 14, margin)
        const nombre = jugadaNames.get(item.jugada_id) ?? item.jugada_id.slice(0, 8)
        doc.setFont('helvetica', 'bold')
        doc.text(`• ${nombre}`, margin, y)
        y += 5
        doc.setFont('helvetica', 'normal')
        if (item.comentario?.trim()) {
          y = writeWrapped(doc, item.comentario, margin + 4, y, contentWidth - 4)
          y += 3
        }
      }
    }

    if (phase?.clips?.length) {
      y = ensureSpace(doc, y, 10, margin)
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

  if (data.consignas_clave?.length) {
    y = ensureSpace(doc, y, 20, margin)
    doc.setFillColor(255, 251, 235)
    doc.rect(margin, y, contentWidth, 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(180, 83, 9)
    doc.setFontSize(12)
    doc.text('Consignas clave globales', margin + 2, y + 6)
    y += 14
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    doc.setFontSize(10)
    y = writeWrapped(doc, data.consignas_clave.join(' • '), margin, y, contentWidth)
  }

  doc.save('plan-de-partido.pdf')
}

/** @deprecated sync wrapper — use exportPlanPartidoPDF async */
export function exportPlanPartidoPDFSync(data: Partial<PlanPartidoData>) {
  void exportPlanPartidoPDF(data)
}
