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
  startOfWeekMonday,
  addDays,
  buildMonthWeeks,
} from '@/lib/calendar/types'
import { formatSeasonLabel, getSeasonMonths } from '@/lib/calendar/season'
import { buildDayIndex, getBucket } from '@/lib/calendar/dayIndex'
import {
  cabeceraPdf,
  cerrarPdf,
  fuente,
  LINEA,
  prepararPdf,
  relleno,
  temaDelClub,
  tinta,
  TINTA,
  TINTA_SUAVE,
  trazo,
  type TemaPdf,
} from './marca'

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

/** Margen lateral y reserva inferior para el pie normalizado (cerrarPdf). */
const MARGEN = 14
const RESERVA_PIE = 13

// Colores semánticos del calendario (casa / fuera / descanso / microciclo).
const CASA_FONDO = '#FDE68A'
const CASA_TEXTO = '#92400E'
const FUERA_FONDO = '#DDD6FE'
const FUERA_TEXTO = '#5B21B6'
const DESCANSO_FONDO = '#CBD5E1'
const DESCANSO_TEXTO = '#475569'
const MICRO_FONDO = '#FFF7ED'
const MICRO_BORDE = '#EA580C'
const VACIO = '#F7F8FB'

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

export async function exportCalendarPDF(input: CalendarExportInput) {
  const index = buildDayIndex({
    sesiones: input.sesiones,
    partidos: input.partidos,
    microciclos: input.microciclos,
    descansos: input.descansos,
  })

  if (input.viewMode === 'ano') {
    await exportYear(input, index)
  } else if (input.viewMode === 'semana') {
    await exportWeek(input, index)
  } else {
    await exportMonth(input, index)
  }
}

async function nuevoDoc(input: CalendarExportInput) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const tema = await prepararPdf(doc, temaDelClub(input.clubName ? { club: input.clubName } : undefined))
  return { doc, tema }
}

function header(doc: jsPDF, tema: TemaPdf, title: string, subtitle: string, input: CalendarExportInput) {
  const meta = [input.equipoName, input.clubName && input.clubName !== tema.club ? input.clubName : '']
    .filter(Boolean)
    .join('\n')
  return cabeceraPdf(doc, tema, { titulo: title, subtitulo: subtitle, meta, margen: MARGEN })
}

function leyenda(doc: jsPDF, x: number, y: number, items: Array<[string, string, string?]>) {
  fuente(doc)
  doc.setFontSize(7)
  for (const [fondo, label, borde] of items) {
    relleno(doc, fondo)
    if (borde) {
      trazo(doc, borde)
      doc.setLineWidth(0.35)
      doc.rect(x, y - 2.4, 3, 3, 'FD')
    } else {
      doc.rect(x, y - 2.4, 3, 3, 'F')
    }
    tinta(doc, TINTA_SUAVE)
    doc.text(label, x + 4.2, y)
    x += 4.2 + doc.getTextWidth(label) + 5
  }
  tinta(doc, TINTA)
}

async function exportYear(input: CalendarExportInput, index: ReturnType<typeof buildDayIndex>) {
  const { doc, tema } = await nuevoDoc(input)
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const seasonStartYear = input.seasonStartYear ?? input.year
  const seasonStartMonth = input.seasonStartMonth ?? 7
  const months = getSeasonMonths(seasonStartYear, seasonStartMonth)
  const start = await header(
    doc,
    tema,
    `Temporada ${formatSeasonLabel(seasonStartYear, seasonStartMonth)}`,
    'Vista resumen — partidos, sesiones y microciclos',
    input
  )

  const left = MARGEN
  const top = start + 1
  const labelW = 14
  const usableW = pageW - left - MARGEN - labelW
  const usableH = pageH - top - RESERVA_PIE - 8
  const rowH = usableH / 12
  const cellW = usableW / 31

  months.forEach((sm, monthIdx) => {
    const y = top + monthIdx * rowH
    fuente(doc, 'media')
    doc.setFontSize(7)
    tinta(doc, TINTA)
    doc.text(`${MONTH_NAMES_SHORT[sm.month]} '${String(sm.year).slice(-2)}`, left, y + rowH * 0.55)

    const daysInMonth = getDaysInMonth(sm.year, sm.month)
    for (let day = 1; day <= 31; day++) {
      const x = left + labelW + (day - 1) * cellW
      if (day > daysInMonth) continue
      const date = dateToStr(sm.year, sm.month, day)
      const b = getBucket(index, date)
      const isLocalMatch = b.partidos[0]?.localia === 'local'
      if (b.partidos.length) relleno(doc, isLocalMatch ? CASA_FONDO : FUERA_FONDO)
      else if (b.sesiones.length) relleno(doc, tema.primarioMedio)
      else if (b.descanso) relleno(doc, DESCANSO_FONDO)
      else if (b.microciclos.length) relleno(doc, MICRO_FONDO)
      else relleno(doc, VACIO)
      doc.rect(x, y + 1, cellW - 0.3, rowH - 2, 'F')
      if (b.microciclos.length) {
        trazo(doc, MICRO_BORDE)
        doc.setLineWidth(0.35)
        doc.rect(x, y + 1, cellW - 0.3, rowH - 2, 'S')
      }
      fuente(doc, 'mono')
      doc.setFontSize(4.5)
      tinta(doc, TINTA_SUAVE)
      doc.text(String(day), x + 0.4, y + 3)
      fuente(doc, 'bold')
      doc.setFontSize(5.5)
      if (b.partidos.length) {
        tinta(doc, isLocalMatch ? CASA_TEXTO : FUERA_TEXTO)
        doc.text(isLocalMatch ? 'C' : 'F', x + cellW / 2, y + rowH - 2.2, { align: 'center' })
      } else if (b.sesiones.length) {
        tinta(doc, tema.primarioTexto)
        doc.text('S', x + cellW / 2, y + rowH - 2.2, { align: 'center' })
      } else if (b.descanso) {
        tinta(doc, DESCANSO_TEXTO)
        doc.text('D', x + cellW / 2, y + rowH - 2.2, { align: 'center' })
      }
    }
  })

  leyenda(doc, left, top + usableH + 5, [
    [CASA_FONDO, 'C · partido en casa'],
    [FUERA_FONDO, 'F · partido fuera'],
    [tema.primarioMedio, 'S · sesión'],
    [DESCANSO_FONDO, 'D · descanso'],
    [MICRO_FONDO, 'Contorno · microciclo', MICRO_BORDE],
  ])
  await cerrarPdf(doc, tema, 'Calendario')
  doc.save(filename('ano', input.year, input.month, input.focusDate, seasonStartYear, seasonStartMonth))
}

async function exportMonth(input: CalendarExportInput, index: ReturnType<typeof buildDayIndex>) {
  const { doc, tema } = await nuevoDoc(input)
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const start = await header(
    doc,
    tema,
    `Calendario — ${MONTH_NAMES_ES[input.month]} ${input.year}`,
    'Vista mensual',
    input
  )

  const left = MARGEN
  const usableW = pageW - MARGEN * 2
  const cellW = usableW / 7
  const headH = 6
  const top = start + headH
  const weeks = buildMonthWeeks(input.year, input.month)
  const rows = weeks.length
  const cellH = Math.min(28, (pageH - top - RESERVA_PIE) / rows)

  // Fila de cabecera de la tabla: primario del club.
  relleno(doc, tema.primario)
  doc.rect(left, start, cellW * 7 - 0.5, headH - 0.8, 'F')
  fuente(doc, 'mono')
  doc.setFontSize(7)
  tinta(doc, tema.sobrePrimario)
  DAY_NAMES_SHORT.forEach((n, i) => {
    doc.text(n.toUpperCase(), left + i * cellW + cellW / 2, start + 3.6, { align: 'center' })
  })

  weeks.forEach((week, row) => {
    week.forEach((cell, col) => {
      const x = left + col * cellW
      const y = top + row * cellH
      trazo(doc, LINEA)
      doc.setLineWidth(0.25)
      if (!cell.inMonth) {
        relleno(doc, VACIO)
        doc.rect(x, y, cellW - 0.5, cellH - 0.5, 'FD')
      } else if (row % 2 === 1) {
        relleno(doc, tema.primarioSuave)
        doc.rect(x, y, cellW - 0.5, cellH - 0.5, 'FD')
      } else {
        doc.rect(x, y, cellW - 0.5, cellH - 0.5)
      }

      const b = getBucket(index, cell.date)
      fuente(doc, 'bold')
      doc.setFontSize(8)
      tinta(doc, cell.inMonth ? TINTA : '#A3A8C3')
      const dayLabel = cell.inMonth
        ? String(cell.day)
        : `${cell.day} ${MONTH_NAMES_SHORT[Number(cell.date.slice(5, 7)) - 1]}`
      doc.text(dayLabel, x + 1.5, y + 4)

      fuente(doc)
      doc.setFontSize(6)
      let ty = y + 7
      for (const p of b.partidos.slice(0, 2)) {
        // Casa = ámbar, fuera = violeta
        tinta(doc, p.localia === 'local' ? CASA_TEXTO : FUERA_TEXTO)
        const rival = p.rival?.nombre_corto || p.rival?.nombre || 'Rival'
        doc.text(`P ${(p.localia === 'local' ? 'vs' : '@')} ${rival}`.slice(0, 22), x + 1.2, ty)
        ty += 3
      }
      for (const s of b.sesiones.slice(0, 3)) {
        tinta(doc, tema.primarioTexto)
        const label = `${s.match_day ? s.match_day + ' ' : ''}${s.titulo}`.slice(0, 22)
        doc.text(label, x + 1.2, ty)
        ty += 3
      }
      if (b.descanso) {
        tinta(doc, DESCANSO_TEXTO)
        doc.text('Descanso', x + 1.2, ty)
      }
    })
  })

  await cerrarPdf(doc, tema, 'Calendario')
  doc.save(filename('mes', input.year, input.month, input.focusDate))
}

async function exportWeek(input: CalendarExportInput, index: ReturnType<typeof buildDayIndex>) {
  const { doc, tema } = await nuevoDoc(input)
  const monday = startOfWeekMonday(input.focusDate)
  const sunday = addDays(monday, 6)
  const start = await header(doc, tema, `Semana ${monday} → ${sunday}`, 'Vista detalle (microciclo)', input)

  const left = MARGEN
  const top = start
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const cellW = (pageW - MARGEN * 2) / 7
  const cellH = pageH - top - RESERVA_PIE
  const headH = 13

  for (let i = 0; i < 7; i++) {
    const date = addDays(monday, i)
    const x = left + i * cellW
    const b = getBucket(index, date)
    trazo(doc, LINEA)
    doc.setLineWidth(0.25)
    doc.rect(x, top, cellW - 1, cellH)
    relleno(doc, tema.primario)
    doc.rect(x, top, cellW - 1, headH, 'F')

    const d = new Date(date + 'T12:00:00')
    fuente(doc, 'mono')
    doc.setFontSize(7)
    tinta(doc, tema.sobrePrimario)
    doc.text(DAY_NAMES_FULL[i].toUpperCase(), x + 2, top + 4.6)
    fuente(doc, 'bold')
    doc.setFontSize(12)
    doc.text(String(d.getDate()), x + 2, top + 10.6)

    fuente(doc)
    doc.setFontSize(7)
    let ty = top + headH + 5
    if (b.descanso) {
      tinta(doc, DESCANSO_TEXTO)
      doc.text('Descanso', x + 2, ty)
      ty += 4
    }
    for (const p of b.partidos) {
      tinta(doc, p.localia === 'local' ? CASA_TEXTO : FUERA_TEXTO)
      const rival = p.rival?.nombre || 'Rival'
      fuente(doc, 'media')
      const lines = doc.splitTextToSize(
        `PARTIDO ${(p.localia === 'local' ? 'vs' : '@')} ${rival}${p.hora ? ' · ' + p.hora : ''}`,
        cellW - 4
      )
      doc.text(lines, x + 2, ty)
      ty += lines.length * 3.2 + 1
      fuente(doc)
    }
    for (const s of b.sesiones) {
      tinta(doc, tema.primarioTexto)
      fuente(doc, 'media')
      const lines = doc.splitTextToSize(
        `${s.match_day ? '[' + s.match_day + '] ' : ''}${s.titulo}${s.duracion_total ? ` (${s.duracion_total}')` : ''}`,
        cellW - 4
      )
      doc.text(lines, x + 2, ty)
      ty += lines.length * 3.2 + 1
      fuente(doc)
      tinta(doc, TINTA_SUAVE)
      doc.text(s.estado.replace('_', ' '), x + 2, ty)
      ty += 4
    }
  }

  await cerrarPdf(doc, tema, 'Calendario')
  doc.save(filename('semana', input.year, input.month, input.focusDate))
}
