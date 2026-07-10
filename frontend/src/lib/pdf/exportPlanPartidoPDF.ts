import { jsPDF } from 'jspdf'
import type { PlanPartidoData } from '@/types'

const FASE_LABELS: Record<string, string> = {
  ataque_organizado: 'Ataque Organizado',
  defensa_organizada: 'Defensa Organizada',
  transicion_ofensiva: 'Transición Ofensiva',
  transicion_defensiva: 'Transición Defensiva',
  abp_ofensiva: 'ABP Ofensiva',
  abp_defensiva: 'ABP Defensiva',
}

export function exportPlanPartidoPDF(data: Partial<PlanPartidoData>) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 16
  let y = 20

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
  const orden = Object.keys(FASE_LABELS)

  for (const fase of orden) {
    const phase = fases.find((f) => f.fase === fase)
    if (!phase && fase !== 'ataque_organizado') continue

    if (y > 250) {
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

    const texto = phase?.texto || 'Sin contenido'
    const split = doc.splitTextToSize(texto, pageWidth - margin * 2)
    doc.text(split, margin, y)
    y += split.length * 5 + 6

    if (phase?.principios_modelo && phase.principios_modelo.length > 0) {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(16, 185, 129)
      doc.text('Principios del modelo:', margin, y)
      y += 6
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(60, 60, 60)
      const principios = doc.splitTextToSize(phase.principios_modelo.join(' • '), pageWidth - margin * 2)
      doc.text(principios, margin, y)
      y += principios.length * 5 + 4
    }

    if (phase?.consignas && phase.consignas.length > 0) {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(245, 158, 11)
      doc.text('Consignas:', margin, y)
      y += 6
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(60, 60, 60)
      const consignas = doc.splitTextToSize(phase.consignas.join(' • '), pageWidth - margin * 2)
      doc.text(consignas, margin, y)
      y += consignas.length * 5 + 4
    }

    if (phase?.clips && phase.clips.length > 0) {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(100, 100, 100)
      doc.text('Clips:', margin, y)
      y += 6
      doc.setFont('helvetica', 'normal')
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

  if (data.consignas_clave && data.consignas_clave.length > 0) {
    if (y > 250) {
      doc.addPage()
      y = 20
    }
    doc.setFillColor(255, 251, 235)
    doc.rect(margin, y, pageWidth - margin * 2, 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(180, 83, 9)
    doc.setFontSize(12)
    doc.text('Consignas clave globales', margin + 2, y + 6)
    y += 14
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    doc.setFontSize(10)
    const consignas = doc.splitTextToSize(data.consignas_clave.join(' • '), pageWidth - margin * 2)
    doc.text(consignas, margin, y)
  }

  doc.save('plan-de-partido.pdf')
}
