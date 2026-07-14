import { jsPDF } from 'jspdf'
import type { RivalScoutData } from '@/types'

const FASE_LABELS: Record<string, string> = {
  ataque_organizado: 'Ataque Organizado',
  defensa_organizada: 'Defensa Organizada',
  transicion_ofensiva: 'Transición Ofensiva',
  transicion_defensiva: 'Transición Defensiva',
  abp_ofensiva: 'ABP Ofensiva',
  abp_defensiva: 'ABP Defensiva',
  general: 'General',
}

export function exportRivalScoutPDF(data: Partial<RivalScoutData>, rivalNombre?: string) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 16
  let y = 20

  doc.setFillColor(245, 158, 11)
  doc.rect(0, 0, pageWidth, 14, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.text('TrainingHub Pro', margin, 10)

  doc.setTextColor(31, 41, 55)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(`Análisis del Rival${rivalNombre ? `: ${rivalNombre}` : ''}`, margin, y)
  y += 12

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, margin, y)
  y += 14

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(31, 41, 55)
  doc.setFontSize(11)
  doc.text(`Sistema: ${data.sistema || 'No definido'}`, margin, y)
  y += 10

  const renderSection = (title: string, items: string[] | undefined, color: [number, number, number]) => {
    if (!items || items.length === 0) return
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...color)
    doc.setFontSize(11)
    doc.text(title, margin, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    doc.setFontSize(10)
    const text = items.join(' • ')
    const split = doc.splitTextToSize(text, pageWidth - margin * 2)
    doc.text(split, margin, y)
    y += split.length * 5 + 6
  }

  renderSection('Fortalezas generales', data.fortalezas, [16, 185, 129])
  renderSection('Debilidades generales', data.debilidades, [239, 68, 68])

  const fases = data.fases ?? []
  const orden = Object.keys(FASE_LABELS)

  for (const fase of orden) {
    const phase = fases.find((f) => f.fase === fase)
    if (!phase) continue

    if (y > 240) {
      doc.addPage()
      y = 20
    }

    doc.setFillColor(243, 244, 246)
    doc.rect(margin, y, pageWidth - margin * 2, 8, 'F')
    doc.setTextColor(31, 41, 55)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(FASE_LABELS[fase], margin + 2, y + 6)
    y += 14

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(60, 60, 60)

    renderSection('Fortalezas', phase.fortalezas, [16, 185, 129])
    renderSection('Debilidades', phase.debilidades, [239, 68, 68])

    if (phase.clips && phase.clips.length > 0) {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(100, 100, 100)
      doc.setFontSize(11)
      doc.text('Clips:', margin, y)
      y += 6
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      for (const clip of phase.clips) {
        const line = `• ${clip.titulo}${clip.url ? ` - ${clip.url}` : ''}`
        const splitClip = doc.splitTextToSize(line, pageWidth - margin * 2)
        doc.text(splitClip, margin, y)
        y += splitClip.length * 5
      }
      y += 4
    }

    y += 6
  }

  doc.save('analisis-rival.pdf')
}
