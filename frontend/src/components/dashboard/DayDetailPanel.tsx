'use client'

import Image from 'next/image'
import {
  Bot,
  Calendar,
  Swords,
  Clock,
  Dumbbell,
  Moon,
  Zap,
  Eye,
  ClipboardList,
  FileText,
  Target,
  Home,
  Plane,
  Activity,
  ListChecks,
  MapPin,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import type { Sesion, Partido, Microciclo } from '@/types'
import { isSameDay } from '@/lib/calendar/types'

const INTENSIDAD_LABEL: Record<string, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  maxima: 'Máxima',
}

const INTENSIDAD_COLOR: Record<string, string> = {
  baja: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  media: 'bg-sky-100 text-sky-800 border-sky-200',
  alta: 'bg-orange-100 text-orange-800 border-orange-200',
  maxima: 'bg-red-100 text-red-800 border-red-200',
}

function estimateLoadUA(s: Sesion): number | null {
  if (!s.duracion_total) return null
  const map: Record<string, number> = { baja: 3, media: 5, alta: 7, maxima: 9 }
  const rpe = s.intensidad_objetivo ? map[s.intensidad_objetivo] : 5
  return Math.round(s.duracion_total * rpe)
}

function tareaLabel(t: NonNullable<Sesion['tareas']>[number], idx: number): string {
  return t.tarea?.titulo || `Tarea ${idx + 1}`
}

interface DayDetailPanelProps {
  selectedDay: string | null
  onClose: () => void
  sesionesMes: Sesion[]
  partidosMes: Partido[]
  microciclosMes?: Microciclo[]
  descansos: Set<string>
  equipoId: string | undefined
  onToggleDescanso: (date: string) => void
  onNavigate: (path: string) => void
}

export function DayDetailPanel({
  selectedDay,
  onClose,
  sesionesMes,
  partidosMes,
  microciclosMes = [],
  descansos,
  equipoId,
  onToggleDescanso,
  onNavigate,
}: DayDetailPanelProps) {
  return (
    <Dialog open={!!selectedDay} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 capitalize">
            <Calendar className="h-5 w-5 shrink-0" />
            {selectedDay &&
              new Date(selectedDay + 'T12:00:00').toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Detalle del día con partidos, sesiones y navegación
          </DialogDescription>
        </DialogHeader>

        {selectedDay && (() => {
          const daySesiones = sesionesMes.filter((s) => isSameDay(s.fecha, selectedDay))
          const dayPartidos = partidosMes.filter((p) => isSameDay(p.fecha, selectedDay))
          const isDescanso = descansos.has(selectedDay)
          const mc = microciclosMes.find(
            (m) =>
              m.fecha_inicio.slice(0, 10) <= selectedDay &&
              m.fecha_fin.slice(0, 10) >= selectedDay
          )
          const hasContent = dayPartidos.length > 0 || daySesiones.length > 0 || isDescanso

          return (
            <div className="space-y-4">
              {mc && (
                <button
                  type="button"
                  onClick={() => { onClose(); onNavigate(`/microciclos/${mc.id}`) }}
                  className="w-full text-left rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 hover:bg-emerald-50"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                    Microciclo
                  </p>
                  <p className="text-sm font-medium truncate">
                    {mc.objetivo_principal || 'Ver microciclo'}
                  </p>
                  {(mc.objetivo_tactico || mc.objetivo_fisico) && (
                    <p className="text-[11px] text-emerald-900/70 truncate mt-0.5">
                      {[mc.objetivo_tactico, mc.objetivo_fisico].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </button>
              )}

              {!hasContent && (
                <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-6 text-center">
                  <p className="text-sm text-muted-foreground">Día libre · sin sesión ni partido</p>
                  <p className="text-[11px] text-muted-foreground/80 mt-1">
                    Usa las acciones de abajo para programar
                  </p>
                </div>
              )}

              {isDescanso && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-100 border border-slate-200">
                  <Moon className="h-4 w-4 text-slate-600" />
                  <span className="text-sm font-medium text-slate-700">Día de descanso</span>
                </div>
              )}

              {dayPartidos.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Swords className="h-4 w-4 text-amber-600" />
                    Partido{dayPartidos.length > 1 ? 's' : ''}
                  </h4>
                  <div className="space-y-2">
                    {dayPartidos.map((p) => {
                      const isLocal = p.localia === 'local'
                      return (
                        <div
                          key={p.id}
                          className={`rounded-xl border p-3 space-y-3 ${
                            isLocal
                              ? 'border-amber-300 bg-amber-50/70'
                              : 'border-violet-300 bg-violet-50/70'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {p.rival?.escudo_url ? (
                              <Image
                                src={p.rival.escudo_url}
                                alt=""
                                width={44}
                                height={44}
                                className="object-contain shrink-0 rounded-full bg-white border p-0.5"
                                unoptimized
                              />
                            ) : (
                              <div className="h-11 w-11 rounded-full bg-white border flex items-center justify-center shrink-0">
                                <Swords className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] ${
                                    isLocal
                                      ? 'border-amber-400 text-amber-800'
                                      : 'border-violet-400 text-violet-800'
                                  }`}
                                >
                                  {isLocal ? (
                                    <><Home className="h-2.5 w-2.5 mr-0.5" /> Casa</>
                                  ) : (
                                    <><Plane className="h-2.5 w-2.5 mr-0.5" /> Fuera</>
                                  )}
                                </Badge>
                                {p.competicion && (
                                  <Badge variant="secondary" className="text-[10px] capitalize">
                                    {p.competicion}
                                  </Badge>
                                )}
                                {p.jornada != null && (
                                  <span className="text-[10px] text-muted-foreground">J{p.jornada}</span>
                                )}
                              </div>
                              <p className="text-sm font-bold truncate">
                                {isLocal ? 'vs' : '@'} {p.rival?.nombre || p.rival?.nombre_corto || 'Rival'}
                              </p>
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-muted-foreground">
                                {p.hora && (
                                  <span className="inline-flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> {p.hora}
                                  </span>
                                )}
                                {p.ubicacion && (
                                  <span className="inline-flex items-center gap-1 truncate">
                                    <MapPin className="h-3 w-3 shrink-0" /> {p.ubicacion}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {p.goles_favor != null && (
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-lg font-bold ${
                                  p.goles_favor > (p.goles_contra || 0)
                                    ? 'text-green-700'
                                    : p.goles_favor < (p.goles_contra || 0)
                                      ? 'text-red-700'
                                      : 'text-amber-700'
                                }`}
                              >
                                {p.goles_favor} - {p.goles_contra ?? 0}
                              </span>
                              {p.resultado && (
                                <Badge variant="outline" className="text-[10px] capitalize">
                                  {p.resultado}
                                </Badge>
                              )}
                            </div>
                          )}

                          <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-black/5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-[11px] h-8"
                              onClick={() => {
                                onClose()
                                onNavigate(`/partidos?match=${p.id}&tab=informe-partido`)
                              }}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Partido
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-[11px] h-8"
                              onClick={() => {
                                onClose()
                                onNavigate(`/partidos?match=${p.id}&tab=informe-partido`)
                              }}
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              Informe
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-[11px] h-8"
                              onClick={() => {
                                onClose()
                                onNavigate(`/partidos?match=${p.id}&tab=plan-partido`)
                              }}
                            >
                              <Target className="h-3 w-3 mr-1" />
                              Plan
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {daySesiones.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-sky-600" />
                    Sesión{daySesiones.length > 1 ? 'es' : ''}
                  </h4>
                  <div className="space-y-2">
                    {daySesiones.map((s) => {
                      const load = estimateLoadUA(s)
                      const tareas = (s.tareas || []).slice(0, 6)
                      const estadoBadge: Record<string, { color: string; label: string }> = {
                        completada: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Completada' },
                        planificada: { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Planificada' },
                        borrador: { color: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Borrador' },
                        en_curso: { color: 'bg-purple-100 text-purple-800 border-purple-200', label: 'En curso' },
                      }
                      const badge = estadoBadge[s.estado] || estadoBadge.borrador

                      return (
                        <div
                          key={s.id}
                          className="rounded-xl border border-sky-200 bg-sky-50/40 p-3 space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {s.match_day && (
                                  <span className="text-[10px] font-bold bg-white border px-1.5 py-0.5 rounded">
                                    {s.match_day}
                                  </span>
                                )}
                                <span className="text-sm font-semibold">{s.titulo}</span>
                              </div>
                              {s.objetivo_principal && (
                                <p className="text-xs text-muted-foreground mt-1 flex gap-1.5">
                                  <Target className="h-3 w-3 mt-0.5 shrink-0 text-sky-600" />
                                  <span>{s.objetivo_principal}</span>
                                </p>
                              )}
                            </div>
                            <Badge variant="outline" className={`text-[10px] shrink-0 ${badge.color}`}>
                              {badge.label}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            {s.hora && (
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {s.hora}
                              </span>
                            )}
                            {s.duracion_total != null && (
                              <span className="inline-flex items-center gap-1">
                                <Activity className="h-3 w-3" /> {s.duracion_total} min
                              </span>
                            )}
                            {s.intensidad_objetivo && (
                              <Badge
                                variant="outline"
                                className={`text-[10px] h-5 ${INTENSIDAD_COLOR[s.intensidad_objetivo] || ''}`}
                              >
                                <Zap className="h-2.5 w-2.5 mr-0.5" />
                                {INTENSIDAD_LABEL[s.intensidad_objetivo] || s.intensidad_objetivo}
                              </Badge>
                            )}
                            {load != null && (
                              <span className="inline-flex items-center gap-1 font-medium text-sky-800">
                                ~{load} UA
                              </span>
                            )}
                            {s.fase_juego_principal && (
                              <span className="inline-flex items-center gap-1 capitalize">
                                <Dumbbell className="h-3 w-3" />
                                {s.fase_juego_principal.replace(/_/g, ' ')}
                              </span>
                            )}
                            {s.carga_fisica_objetivo && (
                              <span className="text-[11px]">Carga: {s.carga_fisica_objetivo}</span>
                            )}
                          </div>

                          {tareas.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                <ListChecks className="h-3 w-3" /> Tareas
                              </p>
                              <ul className="space-y-1">
                                {tareas.map((t, i) => {
                                  const dur = t.duracion_override || t.tarea?.duracion_total
                                  return (
                                    <li
                                      key={t.id || i}
                                      className="text-[11px] flex items-start gap-2 rounded-md bg-white/80 px-2 py-1.5 border border-sky-100"
                                    >
                                      <span className="text-muted-foreground font-mono shrink-0">
                                        {t.orden ?? i + 1}.
                                      </span>
                                      <span className="min-w-0 flex-1">
                                        <span className="font-medium">{tareaLabel(t, i)}</span>
                                        {dur ? (
                                          <span className="text-muted-foreground"> · {dur}′</span>
                                        ) : null}
                                        {t.fase_sesion ? (
                                          <span className="text-muted-foreground capitalize">
                                            {' · '}
                                            {String(t.fase_sesion).replace(/_/g, ' ')}
                                          </span>
                                        ) : null}
                                      </span>
                                    </li>
                                  )
                                })}
                              </ul>
                              {(s.tareas?.length || 0) > 6 && (
                                <p className="text-[10px] text-muted-foreground">
                                  +{(s.tareas?.length || 0) - 6} más en la sesión
                                </p>
                              )}
                            </div>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-8 w-full"
                            onClick={() => {
                              onClose()
                              onNavigate(`/sesiones/${s.id}`)
                            }}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Abrir sesión completa
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Añadir a este día
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    className="text-xs h-9"
                    onClick={() => {
                      onClose()
                      onNavigate(`/sesiones/nueva?fecha=${selectedDay}`)
                    }}
                  >
                    <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
                    Entreno manual
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="text-xs h-9"
                    onClick={() => {
                      onClose()
                      onNavigate(`/sesiones/nueva-ai?fecha=${selectedDay}`)
                    }}
                  >
                    <Bot className="h-3.5 w-3.5 mr-1.5" />
                    Entreno con IA
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-9"
                    onClick={() => {
                      onClose()
                      onNavigate(`/partidos/nuevo?fecha=${selectedDay}`)
                    }}
                  >
                    <Swords className="h-3.5 w-3.5 mr-1.5" />
                    Partido
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-9"
                    onClick={() => {
                      if (selectedDay && equipoId) onToggleDescanso(selectedDay)
                      onClose()
                    }}
                  >
                    <Moon className="h-3.5 w-3.5 mr-1.5" />
                    {descansos.has(selectedDay) ? 'Quitar descanso' : 'Descanso'}
                  </Button>
                </div>
              </div>
            </div>
          )
        })()}
      </DialogContent>
    </Dialog>
  )
}
