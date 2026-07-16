'use client'

import Image from 'next/image'
import {
  Plus,
  Bot,
  Swords,
  Moon,
  ClipboardList,
  Clock,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Sesion, Partido, Microciclo } from '@/types'
import { buildDayIndex, getBucket } from '@/lib/calendar/dayIndex'
import {
  DAY_NAMES_FULL,
  addDays,
  startOfWeekMonday,
  toLocalDateStr,
} from '@/lib/calendar/types'
import { useMemo } from 'react'

const MATCH_DAY_COLORS: Record<string, string> = {
  'MD+1': 'bg-green-100 text-green-800 border-green-200',
  'MD+2': 'bg-lime-100 text-lime-800 border-lime-200',
  'MD-4': 'bg-red-100 text-red-800 border-red-200',
  'MD-3': 'bg-orange-100 text-orange-800 border-orange-200',
  'MD-2': 'bg-blue-100 text-blue-800 border-blue-200',
  'MD-1': 'bg-purple-100 text-purple-800 border-purple-200',
  'MD': 'bg-amber-100 text-amber-800 border-amber-200',
}

interface CalendarWeekViewProps {
  focusDate: string
  sesiones: Sesion[]
  partidos: Partido[]
  microciclos: Microciclo[]
  descansos: Set<string>
  equipoId?: string
  addMenuDay: string | null
  setAddMenuDay: (day: string | null) => void
  onSelectDay: (day: string) => void
  onToggleDescanso: (date: string) => void
  onNavigate: (path: string) => void
}

export function CalendarWeekView({
  focusDate,
  sesiones,
  partidos,
  microciclos,
  descansos,
  equipoId,
  addMenuDay,
  setAddMenuDay,
  onSelectDay,
  onToggleDescanso,
  onNavigate,
}: CalendarWeekViewProps) {
  const monday = startOfWeekMonday(focusDate)
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(monday, i)),
    [monday]
  )

  const index = useMemo(
    () => buildDayIndex({ sesiones, partidos, microciclos, descansos }),
    [sesiones, partidos, microciclos, descansos]
  )

  const weekMicro = useMemo(() => {
    const sunday = addDays(monday, 6)
    return microciclos.find(
      (m) => m.fecha_inicio.slice(0, 10) <= sunday && m.fecha_fin.slice(0, 10) >= monday
    ) || null
  }, [microciclos, monday])

  const todayStr = toLocalDateStr(new Date())

  return (
    <div className="space-y-3">
      {weekMicro && (
        <button
          type="button"
          onClick={() => onNavigate(`/microciclos/${weekMicro.id}`)}
          className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50 text-left"
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">Microciclo de la semana</p>
            <p className="text-sm font-medium truncate">
              {weekMicro.objetivo_principal || 'Sin objetivo principal'}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {weekMicro.fecha_inicio.slice(0, 10)} → {weekMicro.fecha_fin.slice(0, 10)} · {weekMicro.estado.replace('_', ' ')}
            </p>
          </div>
          <ExternalLink className="h-4 w-4 text-emerald-700 shrink-0" />
        </button>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-7 gap-2 min-h-[420px]">
        {days.map((date, i) => {
          const bucket = getBucket(index, date)
          const isToday = date === todayStr
          const isPast = date < todayStr
          const d = new Date(date + 'T12:00:00')
          const dayNum = d.getDate()
          const md =
            bucket.partidos.length > 0
              ? 'MD'
              : bucket.sesiones[0]?.match_day || null

          return (
            <div
              key={date}
              className={`
                relative rounded-xl border flex flex-col min-h-[280px] sm:min-h-0
                ${isToday ? 'border-primary ring-1 ring-primary/30' : 'border-border'}
                ${bucket.microciclos.length ? 'bg-blue-50/40' : 'bg-card'}
                ${isPast ? 'opacity-90' : ''}
              `}
            >
              <div className="flex items-center justify-between px-2.5 py-2 border-b">
                <button type="button" onClick={() => onSelectDay(date)} className="text-left">
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wide">
                    {DAY_NAMES_FULL[i]}
                  </p>
                  <p className={`text-lg font-bold leading-none ${isToday ? 'text-primary' : ''}`}>{dayNum}</p>
                </button>
                <div className="flex items-center gap-1">
                  {md && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${MATCH_DAY_COLORS[md] || 'bg-muted'}`}>
                      {md}
                    </span>
                  )}
                  {!isPast && (
                    <button
                      type="button"
                      className="p-1 rounded hover:bg-muted"
                      onClick={() => setAddMenuDay(addMenuDay === date ? null : date)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 p-2 space-y-1.5 overflow-y-auto">
                {bucket.descanso && (
                  <div className="text-[11px] px-2 py-1.5 rounded-md bg-slate-100 text-slate-700 flex items-center gap-1.5">
                    <Moon className="h-3 w-3" /> Descanso
                  </div>
                )}

                {bucket.partidos.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onNavigate(`/partidos?match=${p.id}`)}
                    className="w-full text-left px-2 py-1.5 rounded-md border border-amber-200 bg-amber-50 hover:bg-amber-100/80"
                  >
                    <div className="flex items-center gap-1.5">
                      {p.rival?.escudo_url ? (
                        <Image src={p.rival.escudo_url} alt="" width={14} height={14} className="object-contain" unoptimized />
                      ) : (
                        <Swords className="h-3 w-3 text-amber-700" />
                      )}
                      <span className="text-[11px] font-semibold truncate">
                        {p.localia === 'local' ? 'vs' : '@'} {p.rival?.nombre_corto || p.rival?.nombre || 'Rival'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                      {p.hora && <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{p.hora}</span>}
                      {p.jornada && <span>J{p.jornada}</span>}
                      {p.goles_favor != null && (
                        <Badge variant="outline" className="text-[9px] h-4 px-1">
                          {p.goles_favor}-{p.goles_contra}
                        </Badge>
                      )}
                    </div>
                  </button>
                ))}

                {bucket.sesiones.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onNavigate(`/sesiones/${s.id}`)}
                    className="w-full text-left px-2 py-1.5 rounded-md border bg-background hover:bg-muted/60"
                  >
                    <div className="flex items-center gap-1">
                      {s.match_day && (
                        <span className={`text-[9px] px-1 py-0.5 rounded font-bold ${MATCH_DAY_COLORS[s.match_day] || 'bg-muted'}`}>
                          {s.match_day}
                        </span>
                      )}
                      <span className="text-[11px] font-medium truncate">{s.titulo}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                      <span className="capitalize">{s.estado.replace('_', ' ')}</span>
                      {s.duracion_total && <span>{s.duracion_total} min</span>}
                    </div>
                  </button>
                ))}

                {!bucket.descanso && bucket.partidos.length === 0 && bucket.sesiones.length === 0 && (
                  <p className="text-[11px] text-muted-foreground text-center py-6">Sin actividad</p>
                )}
              </div>

              {addMenuDay === date && (
                <div className="absolute z-20 top-12 right-2 w-44 bg-popover border rounded-lg shadow-lg py-1 animate-in fade-in">
                  <button
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-muted text-left"
                    onClick={() => { setAddMenuDay(null); onNavigate(`/sesiones/nueva?fecha=${date}`) }}
                  >
                    <ClipboardList className="h-3.5 w-3.5 text-blue-600" /> Entreno manual
                  </button>
                  <button
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-muted text-left"
                    onClick={() => { setAddMenuDay(null); onNavigate(`/sesiones/nueva-ai?fecha=${date}`) }}
                  >
                    <Bot className="h-3.5 w-3.5 text-purple-600" /> Entreno IA
                  </button>
                  <button
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-muted text-left"
                    onClick={() => { setAddMenuDay(null); onNavigate(`/partidos/nuevo?fecha=${date}`) }}
                  >
                    <Swords className="h-3.5 w-3.5 text-amber-600" /> Partido
                  </button>
                  <button
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-muted text-left"
                    onClick={() => { setAddMenuDay(null); if (equipoId) onToggleDescanso(date) }}
                  >
                    <Moon className="h-3.5 w-3.5 text-slate-500" />
                    {bucket.descanso ? 'Quitar descanso' : 'Descanso'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
