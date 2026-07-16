import { jsPDF } from 'jspdf'
import type { Sesion, Partido, Microciclo } from '@/types'
import type { CalendarViewMode } from '@/lib/calendar/types'
import {
  MONTH_NAMES_ES,
  MONTH_NAMES_SHORT,
  DAY_NAMES_FULL,
  DAY_NAMES_SHORT,
  dateToStr,
  getDaysInMonth,
  getFirstDayOfWeek,
  startOfWeekMonday,
  addDays,
} from '@/lib/calendar/types'
import { formatSeasonLabel, getSeasonMonths } from '@/lib/calendar/season'
import { buildDayIndex, getBucket } from '@/lib/calendar/dayIndex'

export interface CalendarExportInput {
  viewMode: CalendarViewMode
  year: number
  month: number // 0-11
  focusDate: string
  seasonStartYear?: number
  seasonStartMonth?: number
  clubName?: string
  equipoName?: string
  sesiones: Sesion[]
  partidos: Partido[]
  microciclos: Microciclo[]
  descansos: Set<string>
}

function filename(
  view: CalendarViewMode,
  year: number,
  month: number,
  focusDate: string,
  seasonStartYear?: number,
  seasonStartMonth?: number
) {
  if (view === 'ano') {
    const sy = seasonStartYear ?? year
    const sm = seasonStartMonth ?? 7
    if (sm === 0) return `calendario_${sy}.pdf`
    return `calendario_temp_${sy}-${String(sy + 1).slice(-2)}.pdf`
  }
  if (view === 'mes') return `calendario_${year}-${String(month + 1).padStart(2, '0')}.pdf`
  return `calendario_semana_${startOfWeekMonday(focusDate)}.pdf`
}

export function exportCalendarPDF(input: CalendarExportInput) {
  const index = buildDayIndex({
    sesiones: input.sesiones,
    partidos: input.partidos,
    microciclos: input.microciclos,
    descansos: input.descansos,
  })

  if (input.viewMode === 'ano') {
    exportYear(input, index)
  } else if (input.viewMode === 'semana') {
    exportWeek(input, index)
  } else {
    exportMonth(input, index)
  }
}

function header(doc: jsPDF, title: string, subtitle: string, club?: string, equipo?: string) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(20, 20, 20)
  doc.text(title, 14, 16)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.text(subtitle, 14, 22)
  const right = [club, equipo].filter(Boolean).join(' · ')
  if (right) {
    doc.text(right, doc.internal.pageSize.getWidth() - 14, 16, { align: 'right' })
  }
}

function exportYear(input: CalendarExportInput, index: ReturnType<typeof buildDayIndex>) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const seasonStartYear = input.seasonStartYear ?? input.year
  const seasonStartMonth = input.seasonStartMonth ?? 7
  const months = getSeasonMonths(seasonStartYear, seasonStartMonth)
  header(
    doc,
    `Temporada ${formatSeasonLabel(seasonStartYear, seasonStartMonth)}`,
    'Vista resumen — partidos, sesiones y microciclos',
    input.clubName,
    input.equipoName
  )

  const left = 14
  const top = 28
  const labelW = 14
  const usableW = pageW - left - 14 - labelW
  const usableH = pageH - top - 16
  const rowH = usableH / 12
  const cellW = usableW / 31

  months.forEach((sm, monthIdx) => {
    const y = top + monthIdx * rowH
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(80, 80, 80)
    doc.text(`${MONTH_NAMES_SHORT[sm.month]} '${String(sm.year).slice(-2)}`, left, y + rowH * 0.55)

    const daysInMonth = getDaysInMonth(sm.year, sm.month)
    for (let day = 1; day <= 31; day++) {
      const x = left + labelW + (day - 1) * cellW
      if (day > daysInMonth) {
        doc.setFillColor(245, 245, 245)
        doc.rect(x, y + 1, cellW - 0.3, rowH - 2, 'F')
        continue
      }
      const date = dateToStr(sm.year, sm.month, day)
      const b = getBucket(index, date)
      const isLocalMatch = b.partidos[0]?.localia === 'local'
      if (b.partidos.length) {
        // Casa = ámbar, fuera = violeta
        if (isLocalMatch) doc.setFillColor(253, 230, 138)
        else doc.setFillColor(221, 214, 254)
      } else if (b.sesiones.length) {
        doc.setFillColor(209, 250, 229) // emerald — sesión
      } else if (b.descanso) {
        doc.setFillColor(203, 213, 225) // slate — descanso
      } else if (b.microciclos.length) {
        doc.setFillColor(240, 253, 250) // teal wash — solo contorno micro
      } else {
        doc.setFillColor(250, 250, 250)
      }
      doc.rect(x, y + 1, cellW - 0.3, rowH - 2, 'F')
      if (b.microciclos.length) {
        doc.setDrawColor(20, 184, 166)
        doc.setLineWidth(0.35)
        doc.rect(x, y + 1, cellW - 0.3, rowH - 2, 'S')
      }
      doc.setFontSize(4.5)
      doc.setTextColor(90, 90, 90)
      doc.text(String(day), x + 0.4, y + 3)
      if (b.partidos.length) {
        doc.setFontSize(5)
        doc.setTextColor(isLocalMatch ? 120 : 76, isLocalMatch ? 80 : 29, isLocalMatch ? 20 : 149)
        doc.text(isLocalMatch ? 'C' : 'F', x + cellW / 2, y + rowH - 2.2, { align: 'center' })
      } else if (b.sesiones.length) {
        doc.setFontSize(5)
        doc.setTextColor(6, 95, 70)
        doc.text('S', x + cellW / 2, y + rowH - 2.2, { align: 'center' })
      } else if (b.descanso) {
        doc.setFontSize(5)
        doc.setTextColor(71, 85, 105)
        doc.text('D', x + cellW / 2, y + rowH - 2.2, { align: 'center' })
      }
    }
  })

  doc.setFontSize(7)
  doc.setTextColor(120, 120, 120)
  doc.text('Contorno = microciclo   C = casa   F = fuera   S = sesión   D = descanso', left, pageH - 6)
  doc.save(filename('ano', input.year, input.month, input.focusDate, seasonStartYear, seasonStartMonth))
}

function exportMonth(input: CalendarExportInput, index: ReturnType<typeof buildDayIndex>) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  header(
    doc,
    `Calendario — ${MONTH_NAMES_ES[input.month]} ${input.year}`,
    'Vista mensual',
    input.clubName,
    input.equipoName
  )

  const left = 14
  const top = 28
  const usableW = pageW - 28
  const cellW = usableW / 7
  const firstDow = getFirstDayOfWeek(input.year, input.month)
  const daysInMonth = getDaysInMonth(input.year, input.month)
  const rows = Math.ceil((firstDow + daysInMonth) / 7)
  const cellH = Math.min(28, (doc.internal.pageSize.getHeight() - top - 14) / rows)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  DAY_NAMES_SHORT.forEach((n, i) => {
    doc.text(n, left + i * cellW + cellW / 2, top - 2, { align: 'center' })
  })

  for (let slot = 0; slot < rows * 7; slot++) {
    const dayNum = slot - firstDow + 1
    const col = slot % 7
    const row = Math.floor(slot / 7)
    const x = left + col * cellW
    const y = top + row * cellH
    doc.setDrawColor(220, 220, 220)
    doc.rect(x, y, cellW - 0.5, cellH - 0.5)

    if (dayNum < 1 || dayNum > daysInMonth) continue
    const date = dateToStr(input.year, input.month, dayNum)
    const b = getBucket(index, date)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(40, 40, 40)
    doc.text(String(dayNum), x + 1.5, y + 4)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6)
    let ty = y + 7
    for (const p of b.partidos.slice(0, 2)) {
      // Casa = ámbar, fuera = violeta
      if (p.localia === 'local') doc.setTextColor(180, 83, 9)
      else doc.setTextColor(109, 40, 217)
      const rival = p.rival?.nombre_corto || p.rival?.nombre || 'Rival'
      doc.text(`P ${(p.localia === 'local' ? 'vs' : '@')} ${rival}`.slice(0, 22), x + 1.2, ty)
      ty += 3
    }
    for (const s of b.sesiones.slice(0, 3)) {
      doc.setTextColor(37, 99, 235)
      const label = `${s.match_day ? s.match_day + ' ' : ''}${s.titulo}`.slice(0, 22)
      doc.text(label, x + 1.2, ty)
      ty += 3
    }
    if (b.descanso) {
      doc.setTextColor(100, 116, 139)
      doc.text('Descanso', x + 1.2, ty)
    }
  }

  doc.save(filename('mes', input.year, input.month, input.focusDate))
}

function exportWeek(input: CalendarExportInput, index: ReturnType<typeof buildDayIndex>) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const monday = startOfWeekMonday(input.focusDate)
  const sunday = addDays(monday, 6)
  header(
    doc,
    `Semana ${monday} → ${sunday}`,
    'Vista detalle (microciclo)',
    input.clubName,
    input.equipoName
  )

  const left = 14
  const top = 28
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const cellW = (pageW - 28) / 7
  const cellH = pageH - top - 12

  for (let i = 0; i < 7; i++) {
    const date = addDays(monday, i)
    const x = left + i * cellW
    const b = getBucket(index, date)
    doc.setDrawColor(210, 210, 210)
    doc.rect(x, top, cellW - 1, cellH)

    const d = new Date(date + 'T12:00:00')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(30, 30, 30)
    doc.text(DAY_NAMES_FULL[i], x + 2, top + 5)
    doc.setFontSize(11)
    doc.text(String(d.getDate()), x + 2, top + 11)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    let ty = top + 16
    if (b.descanso) {
      doc.setTextColor(100, 116, 139)
      doc.text('Descanso', x + 2, ty)
      ty += 4
    }
    for (const p of b.partidos) {
      if (p.localia === 'local') doc.setTextColor(180, 83, 9)
      else doc.setTextColor(109, 40, 217)
      const rival = p.rival?.nombre || 'Rival'
      const lines = doc.splitTextToSize(
        `PARTIDO ${(p.localia === 'local' ? 'vs' : '@')} ${rival}${p.hora ? ' · ' + p.hora : ''}`,
        cellW - 4
      )
      doc.text(lines, x + 2, ty)
      ty += lines.length * 3.2 + 1
    }
    for (const s of b.sesiones) {
      doc.setTextColor(30, 64, 175)
      const lines = doc.splitTextToSize(
        `${s.match_day ? '[' + s.match_day + '] ' : ''}${s.titulo}${s.duracion_total ? ` (${s.duracion_total}')` : ''}`,
        cellW - 4
      )
      doc.text(lines, x + 2, ty)
      ty += lines.length * 3.2 + 1
      doc.setTextColor(120, 120, 120)
      doc.text(s.estado.replace('_', ' '), x + 2, ty)
      ty += 4
    }
  }

  doc.save(filename('semana', input.year, input.month, input.focusDate))
}
