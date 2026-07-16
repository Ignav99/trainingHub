'use client'

import { useMemo } from 'react'
import type { Sesion, Partido, Microciclo } from '@/types'
import { buildDayIndex, getBucket } from '@/lib/calendar/dayIndex'
import {
  MONTH_NAMES_SHORT,
  dateToStr,
  getDaysInMonth,
  getFirstDayOfWeek,
} from '@/lib/calendar/types'

interface CalendarYearViewProps {
  year: number
  sesiones: Sesion[]
  partidos: Partido[]
  microciclos: Microciclo[]
  descansos: Set<string>
  onSelectDay: (day: string) => void
  onSelectMonth: (month: number) => void
}

export function CalendarYearView({
  year,
  sesiones,
  partidos,
  microciclos,
  descansos,
  onSelectDay,
  onSelectMonth,
}: CalendarYearViewProps) {
  const index = useMemo(
    () => buildDayIndex({ sesiones, partidos, microciclos, descansos }),
    [sesiones, partidos, microciclos, descansos]
  )

  const todayStr = useMemo(() => {
    const n = new Date()
    return dateToStr(n.getFullYear(), n.getMonth(), n.getDate())
  }, [])

  return (
    <div className="flex flex-col h-[calc(100vh-240px)] min-h-[560px] max-h-[900px]">
      <div className="flex-1 grid grid-rows-12 gap-0.5 min-h-0">
        {Array.from({ length: 12 }, (_, month) => {
          const daysInMonth = getDaysInMonth(year, month)
          const firstDow = getFirstDayOfWeek(year, month)
          const cells: ({ day: number; date: string } | null)[] = []
          for (let i = 0; i < firstDow; i++) cells.push(null)
          for (let d = 1; d <= daysInMonth; d++) {
            cells.push({ day: d, date: dateToStr(year, month, d) })
          }
          while (cells.length % 7 !== 0) cells.push(null)

          return (
            <div key={month} className="grid grid-cols-[44px_1fr] gap-1 min-h-0">
              <button
                type="button"
                onClick={() => onSelectMonth(month)}
                className="text-[11px] font-bold text-left text-muted-foreground hover:text-primary self-center truncate px-0.5"
                title={`Ver ${MONTH_NAMES_SHORT[month]}`}
              >
                {MONTH_NAMES_SHORT[month]}
              </button>

              <div
                className="grid gap-px min-h-0 h-full"
                style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}
              >
                {cells.map((cell, idx) => {
                  if (!cell) {
                    return <div key={`e-${month}-${idx}`} className="bg-muted/20 rounded-[2px]" />
                  }
                  const bucket = getBucket(index, cell.date)
                  const hasMatch = bucket.partidos.length > 0
                  const hasSesion = bucket.sesiones.length > 0
                  const hasDescanso = bucket.descanso
                  const inMicro = bucket.microciclos.length > 0
                  const isToday = cell.date === todayStr
                  const isPast = cell.date < todayStr

                  return (
                    <button
                      key={cell.date}
                      type="button"
                      onClick={() => onSelectDay(cell.date)}
                      title={`${cell.day}/${month + 1}: ${bucket.partidos.length}P ${bucket.sesiones.length}S`}
                      className={`
                        relative rounded-[2px] flex flex-col items-center justify-start pt-0.5
                        border border-transparent hover:border-primary/40 transition-colors
                        ${inMicro ? 'bg-blue-100/70' : 'bg-muted/30'}
                        ${isToday ? 'ring-1 ring-primary' : ''}
                        ${isPast ? 'opacity-70' : ''}
                      `}
                    >
                      <span className={`text-[8px] leading-none font-medium ${isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                        {cell.day}
                      </span>
                      <div className="flex gap-px mt-0.5">
                        {hasMatch && <span className="w-1 h-1 rounded-full bg-amber-500" />}
                        {hasSesion && <span className="w-1 h-1 rounded-full bg-blue-500" />}
                        {hasDescanso && <span className="w-1 h-1 rounded-full bg-slate-400" />}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-2 pt-2 border-t text-[10px] text-muted-foreground shrink-0">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-200" /> Microciclo</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Partido</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Sesión</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Descanso</span>
        <span className="ml-auto text-muted-foreground/70">Clic en mes → vista mes · clic en día → detalle</span>
      </div>
    </div>
  )
}
