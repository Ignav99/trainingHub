'use client'

import { useMemo } from 'react'
import Image from 'next/image'
import type { Sesion, Partido, Microciclo } from '@/types'
import { buildDayIndex, getBucket } from '@/lib/calendar/dayIndex'
import {
  MONTH_NAMES_SHORT,
  dateToStr,
  getDaysInMonth,
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

function dayTone(opts: {
  hasMatch: boolean
  isLocal?: boolean
  hasSesion: boolean
  hasDescanso: boolean
  inMicro: boolean
  isToday: boolean
}) {
  if (opts.hasMatch && opts.hasSesion) {
    return opts.isLocal
      ? 'bg-amber-100 border-amber-400 text-amber-950'
      : 'bg-violet-100 border-violet-400 text-violet-950'
  }
  if (opts.hasMatch) {
    return opts.isLocal
      ? 'bg-amber-200/90 border-amber-500 text-amber-950'
      : 'bg-violet-200/90 border-violet-500 text-violet-950'
  }
  if (opts.hasSesion) {
    return 'bg-sky-100 border-sky-400 text-sky-950'
  }
  if (opts.hasDescanso) {
    return 'bg-slate-200 border-slate-400 text-slate-800'
  }
  if (opts.inMicro) {
    return 'bg-blue-50 border-blue-200 text-blue-900'
  }
  return 'bg-white border-border/60 text-muted-foreground'
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
    <div className="flex flex-col h-[calc(100vh-240px)] min-h-[580px] max-h-[920px]">
      {/* Day number header 1–31 — same for every month */}
      <div className="grid grid-cols-[48px_1fr] gap-1 mb-1 shrink-0">
        <div />
        <div className="grid gap-px" style={{ gridTemplateColumns: 'repeat(31, minmax(0, 1fr))' }}>
          {Array.from({ length: 31 }, (_, i) => (
            <div key={i} className="text-center text-[8px] font-semibold text-muted-foreground/70">
              {i + 1}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 grid grid-rows-12 gap-1 min-h-0">
        {Array.from({ length: 12 }, (_, month) => {
          const daysInMonth = getDaysInMonth(year, month)

          return (
            <div key={month} className="grid grid-cols-[48px_1fr] gap-1 min-h-0">
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
                style={{ gridTemplateColumns: 'repeat(31, minmax(0, 1fr))' }}
              >
                {Array.from({ length: 31 }, (_, i) => {
                  const day = i + 1
                  if (day > daysInMonth) {
                    return <div key={`e-${month}-${day}`} className="rounded-[3px] bg-muted/15" />
                  }

                  const date = dateToStr(year, month, day)
                  const bucket = getBucket(index, date)
                  const partido = bucket.partidos[0]
                  const hasMatch = bucket.partidos.length > 0
                  const hasSesion = bucket.sesiones.length > 0
                  const hasDescanso = bucket.descanso
                  const inMicro = bucket.microciclos.length > 0
                  const isToday = date === todayStr
                  const isLocal = partido?.localia === 'local'
                  const tone = dayTone({
                    hasMatch,
                    isLocal,
                    hasSesion,
                    hasDescanso,
                    inMicro,
                    isToday,
                  })

                  const tipParts = [
                    `${day}/${month + 1}`,
                    hasMatch
                      ? `Partido ${isLocal ? 'casa' : 'fuera'}: ${partido?.rival?.nombre_corto || partido?.rival?.nombre || 'Rival'}`
                      : null,
                    hasSesion ? `${bucket.sesiones.length} sesión(es)` : null,
                    hasDescanso ? 'Descanso' : null,
                    inMicro ? 'Microciclo' : null,
                  ].filter(Boolean)

                  return (
                    <button
                      key={date}
                      type="button"
                      onClick={() => onSelectDay(date)}
                      title={tipParts.join(' · ')}
                      className={`
                        relative rounded-[3px] border flex flex-col items-center justify-center gap-px
                        hover:brightness-95 hover:scale-[1.03] transition-all min-h-0
                        ${tone}
                        ${isToday ? 'ring-2 ring-primary ring-offset-1' : ''}
                      `}
                    >
                      <span className="text-[7px] leading-none font-bold opacity-70 absolute top-0.5 left-0.5">
                        {day}
                      </span>
                      {hasMatch && partido?.rival?.escudo_url ? (
                        <Image
                          src={partido.rival.escudo_url}
                          alt=""
                          width={16}
                          height={16}
                          className="object-contain max-h-[50%] w-auto mt-1"
                          unoptimized
                        />
                      ) : hasMatch ? (
                        <span
                          className={`text-[9px] leading-none font-black mt-1 ${
                            isLocal ? 'text-amber-800' : 'text-violet-800'
                          }`}
                        >
                          {isLocal ? 'C' : 'F'}
                        </span>
                      ) : hasSesion ? (
                        <span className="text-[9px] leading-none font-bold text-sky-800 mt-1">S</span>
                      ) : hasDescanso ? (
                        <span className="text-[8px] leading-none font-bold text-slate-700 mt-1">D</span>
                      ) : null}
                      {hasMatch && (
                        <span
                          className={`absolute top-0.5 right-0.5 text-[6px] font-black leading-none ${
                            isLocal ? 'text-emerald-700' : 'text-violet-700'
                          }`}
                        >
                          {isLocal ? 'L' : 'V'}
                        </span>
                      )}
                      {hasMatch && hasSesion && (
                        <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-sky-600 ring-1 ring-white" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 pt-2 border-t text-[10px] text-muted-foreground shrink-0">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-200 border border-amber-500" /> Partido casa</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-violet-200 border border-violet-500" /> Partido fuera</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-sky-100 border border-sky-400" /> Sesión</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-200 border border-slate-400" /> Descanso</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-50 border border-blue-200" /> Microciclo</span>
        <span className="ml-auto">Día 1 alineado en todas las filas · clic abre detalle</span>
      </div>
    </div>
  )
}
