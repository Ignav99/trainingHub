'use client'

import { useMemo } from 'react'
import Image from 'next/image'
import {
  Plus,
  Bot,
  Swords,
  Moon,
  ClipboardList,
  Clock,
  ExternalLink,
  Target,
  Zap,
  Home,
  Plane,
  FileText,
  Eye,
  ListChecks,
  Activity,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Sesion, Partido, Microciclo } from '@/types'
import { buildDayIndex, getBucket } from '@/lib/calendar/dayIndex'
import {
  DAY_NAMES_FULL,
  addDays,
  startOfWeekMonday,
  toLocalDateStr,
} from '@/lib/calendar/types'

const MATCH_DAY_COLORS: Record<string, string> = {
  'MD+1': 'bg-green-100 text-green-800 border-green-200',
  'MD+2': 'bg-lime-100 text-lime-800 border-lime-200',
  'MD-4': 'bg-red-100 text-red-800 border-red-200',
  'MD-3': 'bg-orange-100 text-orange-800 border-orange-200',
  'MD-2': 'bg-blue-100 text-blue-800 border-blue-200',
  'MD-1': 'bg-purple-100 text-purple-800 border-purple-200',
  'MD': 'bg-amber-100 text-amber-800 border-amber-200',
}

const INTENSIDAD_LABEL: Record<string, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  maxima: 'Máxima',
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

function estimateLoadUA(s: Sesion): number | null {
  if (!s.duracion_total) return null
  const map: Record<string, number> = { baja: 3, media: 5, alta: 7, maxima: 9 }
  const rpe = s.intensidad_objetivo ? map[s.intensidad_objetivo] : 5
  return Math.round(s.duracion_total * rpe)
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
            {(weekMicro.objetivo_tactico || weekMicro.objetivo_fisico) && (
              <p className="text-[11px] text-emerald-800/80 truncate mt-0.5">
                {[weekMicro.objetivo_tactico, weekMicro.objetivo_fisico].filter(Boolean).join(' · ')}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">
              {weekMicro.fecha_inicio.slice(0, 10)} → {weekMicro.fecha_fin.slice(0, 10)} · {weekMicro.estado.replace('_', ' ')}
            </p>
          </div>
          <ExternalLink className="h-4 w-4 text-emerald-700 shrink-0" />
        </button>
      )}

      <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
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
          const hasContent = bucket.partidos.length > 0 || bucket.sesiones.length > 0 || bucket.descanso
          const hasMatch = bucket.partidos.length > 0
          const hasSesion = bucket.sesiones.length > 0
          const firstMatchLocal = bucket.partidos[0]?.localia === 'local'

          return (
            <div
              key={date}
              className={`
                relative rounded-xl border flex flex-col min-h-[340px]
                ${isToday ? 'border-primary ring-1 ring-primary/30' : 'border-border'}
                ${
                  bucket.descanso
                    ? 'bg-slate-100'
                    : hasMatch
                      ? firstMatchLocal
                        ? 'bg-amber-50/50'
                        : 'bg-violet-50/50'
                      : hasSesion
                        ? 'bg-emerald-50/40'
                        : 'bg-card'
                }
              `}
            >
              {/* Header — opens day popup */}
              <button
                type="button"
                onClick={() => onSelectDay(date)}
                className="flex items-center justify-between px-2.5 py-2 border-b text-left hover:bg-muted/40 rounded-t-xl"
              >
                <div>
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wide">
                    {DAY_NAMES_FULL[i]}
                  </p>
                  <p className={`text-xl font-bold leading-none ${isToday ? 'text-primary' : ''}`}>{dayNum}</p>
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
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
              </button>

              <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                {bucket.descanso && (
                  <button
                    type="button"
                    onClick={() => onSelectDay(date)}
                    className="w-full text-[11px] px-2 py-1.5 rounded-md bg-slate-100 text-slate-700 flex items-center gap-1.5"
                  >
                    <Moon className="h-3 w-3" /> Descanso
                  </button>
                )}

                {bucket.partidos.map((p) => {
                  const isLocal = p.localia === 'local'
                  return (
                    <div
                      key={p.id}
                      className={`rounded-lg border p-2 space-y-1.5 ${
                        isLocal
                          ? 'border-amber-300 bg-amber-50'
                          : 'border-violet-300 bg-violet-50'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onSelectDay(date)}
                        className="w-full text-left"
                      >
                        <div className="flex items-center gap-1.5">
                          {p.rival?.escudo_url ? (
                            <Image src={p.rival.escudo_url} alt="" width={20} height={20} className="object-contain shrink-0" unoptimized />
                          ) : (
                            <Swords className="h-4 w-4 text-amber-700 shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-bold truncate">
                              {isLocal ? 'vs' : '@'} {p.rival?.nombre_corto || p.rival?.nombre || 'Rival'}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                              {isLocal ? (
                                <span className="inline-flex items-center gap-0.5 text-emerald-700 font-medium"><Home className="h-2.5 w-2.5" />Casa</span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 text-violet-700 font-medium"><Plane className="h-2.5 w-2.5" />Fuera</span>
                              )}
                              {p.hora && <span className="inline-flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{p.hora}</span>}
                              {p.jornada && <span>J{p.jornada}</span>}
                            </div>
                          </div>
                        </div>
                        {(p.competicion || p.goles_favor != null) && (
                          <div className="flex items-center gap-1.5 mt-1">
                            {p.competicion && <Badge variant="secondary" className="text-[9px] h-4 px-1 capitalize">{p.competicion}</Badge>}
                            {p.goles_favor != null && (
                              <Badge variant="outline" className="text-[9px] h-4 px-1 font-bold">
                                {p.goles_favor}-{p.goles_contra}
                              </Badge>
                            )}
                          </div>
                        )}
                      </button>
                      <div className="flex flex-wrap gap-1 pt-1 border-t border-black/5">
                        <button
                          type="button"
                          className="text-[9px] px-1.5 py-0.5 rounded border bg-white/80 hover:bg-white inline-flex items-center gap-0.5"
                          onClick={() => onNavigate(`/partidos?match=${p.id}&tab=informe-partido`)}
                        >
                          <Eye className="h-2.5 w-2.5" /> Partido
                        </button>
                        <button
                          type="button"
                          className="text-[9px] px-1.5 py-0.5 rounded border bg-white/80 hover:bg-white inline-flex items-center gap-0.5"
                          onClick={() => onNavigate(`/partidos?match=${p.id}&tab=informe-partido`)}
                        >
                          <FileText className="h-2.5 w-2.5" /> Informe
                        </button>
                        <button
                          type="button"
                          className="text-[9px] px-1.5 py-0.5 rounded border bg-white/80 hover:bg-white inline-flex items-center gap-0.5"
                          onClick={() => onNavigate(`/partidos?match=${p.id}&tab=plan-partido`)}
                        >
                          <Target className="h-2.5 w-2.5" /> Plan
                        </button>
                      </div>
                    </div>
                  )
                })}

                {bucket.sesiones.map((s) => {
                  const loadUA = estimateLoadUA(s)
                  const nTareas = s.tareas?.length
                  return (
                    <div key={s.id} className="rounded-lg border bg-background p-2 space-y-1.5 hover:border-sky-300 transition-colors">
                      <button type="button" onClick={() => onSelectDay(date)} className="w-full text-left space-y-1">
                        <div className="flex items-start gap-1">
                          {s.match_day && (
                            <span className={`text-[9px] px-1 py-0.5 rounded font-bold shrink-0 border ${MATCH_DAY_COLORS[s.match_day] || 'bg-muted'}`}>
                              {s.match_day}
                            </span>
                          )}
                          <span className="text-[11px] font-semibold leading-tight">{s.titulo}</span>
                        </div>

                        {s.objetivo_principal && (
                          <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2">
                            <Target className="h-2.5 w-2.5 inline mr-0.5 text-sky-600" />
                            {s.objetivo_principal}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                          {s.hora && (
                            <span className="inline-flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{s.hora}</span>
                          )}
                          {s.duracion_total && (
                            <span>{s.duracion_total} min</span>
                          )}
                          {s.intensidad_objetivo && (
                            <span className="inline-flex items-center gap-0.5">
                              <Zap className="h-2.5 w-2.5 text-orange-500" />
                              {INTENSIDAD_LABEL[s.intensidad_objetivo] || s.intensidad_objetivo}
                            </span>
                          )}
                          {loadUA != null && (
                            <span className="inline-flex items-center gap-0.5 font-medium text-sky-700">
                              <Activity className="h-2.5 w-2.5" />~{loadUA} UA
                            </span>
                          )}
                          {nTareas != null && nTareas > 0 && (
                            <span className="inline-flex items-center gap-0.5">
                              <ListChecks className="h-2.5 w-2.5" />{nTareas} tareas
                            </span>
                          )}
                        </div>

                        {(s.fase_juego_principal || s.carga_fisica_objetivo) && (
                          <div className="flex flex-wrap gap-1">
                            {s.fase_juego_principal && (
                              <Badge variant="outline" className="text-[9px] h-4 px-1 capitalize">{s.fase_juego_principal.replace('_', ' ')}</Badge>
                            )}
                            {s.carga_fisica_objetivo && (
                              <Badge variant="secondary" className="text-[9px] h-4 px-1">{s.carga_fisica_objetivo}</Badge>
                            )}
                          </div>
                        )}

                        {s.tareas && s.tareas.length > 0 && (
                          <ul className="text-[9px] text-muted-foreground space-y-0.5 border-t pt-1 mt-0.5">
                            {s.tareas.slice(0, 3).map((t, idx) => (
                              <li key={t.id || idx} className="truncate">
                                · {(t as any).tarea?.titulo || (t as any).titulo || `Tarea ${idx + 1}`}
                                {(t as any).duracion_override || (t as any).tarea?.duracion_total
                                  ? ` (${(t as any).duracion_override || (t as any).tarea?.duracion_total}')`
                                  : ''}
                              </li>
                            ))}
                            {s.tareas.length > 3 && (
                              <li className="text-muted-foreground/70">+{s.tareas.length - 3} más</li>
                            )}
                          </ul>
                        )}

                        <p className="text-[9px] capitalize text-muted-foreground/80">{s.estado.replace('_', ' ')}</p>
                      </button>
                      <button
                        type="button"
                        className="text-[9px] px-1.5 py-0.5 rounded border hover:bg-muted inline-flex items-center gap-0.5"
                        onClick={() => onNavigate(`/sesiones/${s.id}`)}
                      >
                        <Eye className="h-2.5 w-2.5" /> Abrir sesión
                      </button>
                    </div>
                  )
                })}

                {!hasContent && (
                  <button
                    type="button"
                    onClick={() => onSelectDay(date)}
                    className="w-full text-[11px] text-muted-foreground text-center py-8 hover:bg-muted/30 rounded-md"
                  >
                    Sin actividad · clic para añadir
                  </button>
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
