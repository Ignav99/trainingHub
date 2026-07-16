'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { Settings2 } from 'lucide-react'
import type { Sesion, Partido, Microciclo } from '@/types'
import { buildDayIndex, getBucket } from '@/lib/calendar/dayIndex'
import {
  MONTH_NAMES_SHORT,
  MONTH_NAMES_ES,
  dateToStr,
  getDaysInMonth,
} from '@/lib/calendar/types'
import {
  formatSeasonLabel,
  formatSeasonLongLabel,
  getSeasonMonths,
  type SeasonMonth,
} from '@/lib/calendar/season'
import { Button } from '@/components/ui/button'

interface CalendarYearViewProps {
  seasonStartYear: number
  seasonStartMonth: number
  onSeasonStartMonthChange: (month: number) => void
  sesiones: Sesion[]
  partidos: Partido[]
  microciclos: Microciclo[]
  descansos: Set<string>
  onSelectDay: (day: string) => void
  onSelectMonth: (year: number, month: number) => void
  loading?: boolean
}

/** Contiguous day ranges of the same microciclo within one month (1–31). */
function microSegmentsForMonth(
  year: number,
  month: number,
  daysInMonth: number,
  index: ReturnType<typeof buildDayIndex>
): { startDay: number; endDay: number; microId: string }[] {
  const segments: { startDay: number; endDay: number; microId: string }[] = []
  let i = 1
  while (i <= daysInMonth) {
    const date = dateToStr(year, month, i)
    const microId = getBucket(index, date).microciclos[0]?.id
    if (!microId) {
      i += 1
      continue
    }
    let j = i
    while (j + 1 <= daysInMonth) {
      const nextId = getBucket(index, dateToStr(year, month, j + 1)).microciclos[0]?.id
      if (nextId !== microId) break
      j += 1
    }
    segments.push({ startDay: i, endDay: j, microId })
    i = j + 1
  }
  return segments
}

function activityFill(opts: {
  hasMatch: boolean
  isLocal: boolean
  hasSesion: boolean
  hasDescanso: boolean
  inMicro: boolean
}) {
  if (opts.hasMatch) {
    return opts.isLocal
      ? 'bg-amber-300/95 border-amber-500 text-amber-950'
      : 'bg-violet-300/95 border-violet-500 text-violet-950'
  }
  if (opts.hasSesion) return 'bg-emerald-100 border-emerald-500 text-emerald-950'
  if (opts.hasDescanso) return 'bg-slate-300 border-slate-500 text-slate-800'
  if (opts.inMicro) return 'bg-white border-transparent text-muted-foreground'
  return 'bg-white border-border/40 text-muted-foreground'
}

function MonthRow({
  sm,
  index,
  todayStr,
  onSelectDay,
  onSelectMonth,
}: {
  sm: SeasonMonth
  index: ReturnType<typeof buildDayIndex>
  todayStr: string
  onSelectDay: (day: string) => void
  onSelectMonth: (year: number, month: number) => void
}) {
  const daysInMonth = getDaysInMonth(sm.year, sm.month)
  const yearShort = String(sm.year).slice(-2)
  const segments = useMemo(
    () => microSegmentsForMonth(sm.year, sm.month, daysInMonth, index),
    [sm.year, sm.month, daysInMonth, index]
  )

  return (
    <div className="grid grid-cols-[52px_1fr] gap-1 min-h-0">
      <button
        type="button"
        onClick={() => onSelectMonth(sm.year, sm.month)}
        className="text-[11px] font-bold text-left text-muted-foreground hover:text-primary self-center truncate px-0.5"
        title={`Ver ${MONTH_NAMES_ES[sm.month]} ${sm.year}`}
      >
        {MONTH_NAMES_SHORT[sm.month]}
        <span className="block text-[8px] font-medium opacity-60">'{yearShort}</span>
      </button>

      <div className="relative min-h-0 h-full">
        {/* Microciclo outlines — continuous boxes over day ranges */}
        {segments.map((seg) => {
          const leftPct = ((seg.startDay - 1) / 31) * 100
          const widthPct = ((seg.endDay - seg.startDay + 1) / 31) * 100
          return (
            <div
              key={`${seg.microId}-${seg.startDay}`}
              aria-hidden
              title="Microciclo"
              className="pointer-events-none absolute inset-y-0 z-[2] rounded-md border-2 border-teal-600 bg-teal-500/[0.07] shadow-[inset_0_0_0_1px_rgba(13,148,136,0.35)]"
              style={{
                left: `calc(${leftPct}% + 1px)`,
                width: `calc(${widthPct}% - 2px)`,
              }}
            />
          )
        })}

        <div
          className="relative z-[1] grid gap-[1px] min-h-0 h-full"
          style={{ gridTemplateColumns: 'repeat(31, minmax(0, 1fr))' }}
        >
          {Array.from({ length: 31 }, (_, i) => {
            const day = i + 1
            if (day > daysInMonth) {
              return <div key={`e-${sm.year}-${sm.month}-${day}`} className="rounded-[2px] bg-muted/15" />
            }

            const date = dateToStr(sm.year, sm.month, day)
            const bucket = getBucket(index, date)
            const partido = bucket.partidos[0]
            const hasMatch = bucket.partidos.length > 0
            const hasSesion = bucket.sesiones.length > 0
            const hasDescanso = bucket.descanso
            const inMicro = bucket.microciclos.length > 0
            const isToday = date === todayStr
            const isLocal = partido?.localia === 'local'
            const fill = activityFill({ hasMatch, isLocal, hasSesion, hasDescanso, inMicro })

            const tipParts = [
              `${day}/${sm.month + 1}/${sm.year}`,
              inMicro ? 'Microciclo' : null,
              hasMatch
                ? `Partido ${isLocal ? 'casa' : 'fuera'}: ${partido?.rival?.nombre_corto || partido?.rival?.nombre || 'Rival'}`
                : null,
              hasSesion ? `${bucket.sesiones.length} sesión(es)` : null,
              hasDescanso ? 'Descanso' : null,
            ].filter(Boolean)

            return (
              <button
                key={date}
                type="button"
                onClick={() => onSelectDay(date)}
                title={tipParts.join(' · ')}
                className={`
                  relative rounded-[2px] border flex flex-col items-center justify-center gap-px
                  hover:brightness-95 transition-all min-h-0
                  ${fill}
                  ${isToday ? 'outline outline-2 outline-offset-[-1px] outline-primary z-[3]' : ''}
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
                  <span className={`text-[9px] leading-none font-black mt-1 ${isLocal ? 'text-amber-900' : 'text-violet-900'}`}>
                    {isLocal ? 'C' : 'F'}
                  </span>
                ) : hasSesion ? (
                  <span className="text-[9px] leading-none font-bold text-emerald-800 mt-1">S</span>
                ) : hasDescanso ? (
                  <span className="text-[8px] leading-none font-bold text-slate-700 mt-1">D</span>
                ) : null}
                {hasMatch && (
                  <span className={`absolute top-0.5 right-0.5 text-[6px] font-black leading-none ${
                    isLocal ? 'text-amber-800' : 'text-violet-800'
                  }`}>
                    {isLocal ? 'L' : 'V'}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function CalendarYearView({
  seasonStartYear,
  seasonStartMonth,
  onSeasonStartMonthChange,
  sesiones,
  partidos,
  microciclos,
  descansos,
  onSelectDay,
  onSelectMonth,
  loading,
}: CalendarYearViewProps) {
  const [showStartPicker, setShowStartPicker] = useState(false)

  const months = useMemo(
    () => getSeasonMonths(seasonStartYear, seasonStartMonth),
    [seasonStartYear, seasonStartMonth]
  )

  const index = useMemo(
    () => buildDayIndex({ sesiones, partidos, microciclos, descansos }),
    [sesiones, partidos, microciclos, descansos]
  )

  const todayStr = useMemo(() => {
    const n = new Date()
    return dateToStr(n.getFullYear(), n.getMonth(), n.getDate())
  }, [])

  const microCount = microciclos.length

  return (
    <div className="flex flex-col h-[calc(100vh-240px)] min-h-[580px] max-h-[920px]">
      <div className="flex items-center justify-between gap-2 mb-1.5 shrink-0">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">
            Temporada {formatSeasonLabel(seasonStartYear, seasonStartMonth)}
          </p>
          <p className="text-[10px] text-muted-foreground truncate">
            {formatSeasonLongLabel(seasonStartYear, seasonStartMonth)}
            {microCount > 0 ? ` · ${microCount} microciclo${microCount === 1 ? '' : 's'}` : ''}
            {loading ? ' · actualizando…' : ''}
          </p>
        </div>
        <div className="relative shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-[11px] gap-1"
            onClick={() => setShowStartPicker((v) => !v)}
            title="Cambiar mes de inicio de la temporada"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Inicio: {MONTH_NAMES_ES[seasonStartMonth].slice(0, 3)}
          </Button>
          {showStartPicker && (
            <div className="absolute right-0 top-8 z-30 w-44 rounded-lg border bg-popover shadow-lg p-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-1.5">
                Primer mes
              </p>
              <div className="grid grid-cols-3 gap-1">
                {MONTH_NAMES_SHORT.map((label, m) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      onSeasonStartMonthChange(m)
                      setShowStartPicker(false)
                    }}
                    className={`text-[11px] py-1.5 rounded-md border ${
                      m === seasonStartMonth
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-muted-foreground mt-2 px-1 leading-snug">
                Por defecto Agosto → Julio. Se guarda en este dispositivo.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[52px_1fr] gap-1 mb-1 shrink-0">
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
        {months.map((sm) => (
          <MonthRow
            key={`${sm.year}-${sm.month}`}
            sm={sm}
            index={index}
            todayStr={todayStr}
            onSelectDay={onSelectDay}
            onSelectMonth={onSelectMonth}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 pt-2 border-t text-[10px] text-muted-foreground shrink-0">
        <span className="flex items-center gap-1">
          <span className="w-4 h-3 rounded border-2 border-teal-600 bg-teal-500/10" /> Contorno microciclo
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-amber-300 border border-amber-500" /> Casa
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-violet-300 border border-violet-500" /> Fuera
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-500" /> Sesión
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-slate-300 border border-slate-500" /> Descanso
        </span>
      </div>
    </div>
  )
}
