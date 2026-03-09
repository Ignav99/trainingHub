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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Sesion, Partido } from '@/types'

function isSameDay(d1: string, d2: string) {
  return d1.slice(0, 10) === d2.slice(0, 10)
}

interface DayDetailPanelProps {
  selectedDay: string | null
  onClose: () => void
  sesionesMes: Sesion[]
  partidosMes: Partido[]
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
  descansos,
  equipoId,
  onToggleDescanso,
  onNavigate,
}: DayDetailPanelProps) {
  return (
    <Dialog open={!!selectedDay} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {selectedDay && new Date(selectedDay + 'T12:00:00').toLocaleDateString('es-ES', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </DialogTitle>
        </DialogHeader>

        {selectedDay && (() => {
          const daySesiones = sesionesMes.filter((s) => isSameDay(s.fecha, selectedDay))
          const dayPartidos = partidosMes.filter((p) => isSameDay(p.fecha, selectedDay))

          return (
            <div className="space-y-4">
              {/* Partidos del dia */}
              {dayPartidos.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Swords className="h-4 w-4 text-amber-600" />
                    Partidos
                  </h4>
                  <div className="space-y-2">
                    {dayPartidos.map((p) => (
                      <div key={p.id} className="card-interactive border-amber-200 bg-amber-50/50 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {p.rival?.escudo_url && (
                              <Image src={p.rival.escudo_url} alt="" width={20} height={20} className="object-contain shrink-0" unoptimized />
                            )}
                            <span className="text-sm font-bold">
                              {p.localia === 'local' ? 'vs' : '@'}{' '}
                              {p.rival?.nombre || 'Rival'}
                            </span>
                            {p.rival?.nombre_corto && (
                              <Badge variant="outline" className="text-[10px]">{p.rival.nombre_corto}</Badge>
                            )}
                          </div>
                          {p.hora && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {p.hora}
                            </span>
                          )}
                        </div>

                        {/* Resultado si existe */}
                        {p.goles_favor !== undefined && p.goles_favor !== null && (
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-lg font-bold ${
                              p.goles_favor > (p.goles_contra || 0)
                                ? 'text-green-700'
                                : p.goles_favor < (p.goles_contra || 0)
                                  ? 'text-red-700'
                                  : 'text-amber-700'
                            }`}>
                              {p.goles_favor} - {p.goles_contra}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {p.resultado || (p.goles_favor > (p.goles_contra || 0) ? 'Victoria' : p.goles_favor < (p.goles_contra || 0) ? 'Derrota' : 'Empate')}
                            </Badge>
                          </div>
                        )}

                        {/* Competicion y jornada */}
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          {p.competicion && (
                            <Badge variant="secondary" className="text-[10px]">{p.competicion}</Badge>
                          )}
                          {p.jornada && (
                            <span className="text-xs text-muted-foreground">Jornada {p.jornada}</span>
                          )}
                          <Badge variant="outline" className="text-[10px]">
                            {p.localia === 'local' ? 'Local' : 'Visitante'}
                          </Badge>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-amber-200">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7"
                            onClick={() => { onClose(); onNavigate(`/partidos?match=${p.id}&tab=post-partido`) }}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Ver partido
                          </Button>
                          {p.informe_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 border-blue-200 text-blue-700 hover:bg-blue-50"
                              onClick={() => { onClose(); onNavigate(`/partidos?match=${p.id}&tab=post-partido`) }}
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              Informe rival
                            </Button>
                          )}
                          {p.notas_pre && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                              onClick={() => { onClose(); onNavigate(`/partidos?match=${p.id}&tab=pre-partido`) }}
                            >
                              <Target className="h-3 w-3 mr-1" />
                              Plan de partido
                            </Button>
                          )}
                          {p.video_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              asChild
                            >
                              <a href={p.video_url} target="_blank" rel="noopener noreferrer">
                                <Eye className="h-3 w-3 mr-1" />
                                Video
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sesiones del dia */}
              {daySesiones.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-blue-600" />
                    Sesiones de entrenamiento
                  </h4>
                  <div className="space-y-2">
                    {daySesiones.map((s) => {
                      const estadoBadge: Record<string, { color: string; label: string }> = {
                        completada: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Completada' },
                        planificada: { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Planificada' },
                        borrador: { color: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Borrador' },
                        en_curso: { color: 'bg-purple-100 text-purple-800 border-purple-200', label: 'En curso' },
                      }
                      const badge = estadoBadge[s.estado] || estadoBadge.borrador

                      return (
                        <div key={s.id} className="card-interactive p-3 row-hover">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                {s.match_day && (
                                  <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded">
                                    {s.match_day}
                                  </span>
                                )}
                                <span className="text-sm font-semibold">{s.titulo}</span>
                              </div>
                              {s.objetivo_principal && (
                                <p className="text-xs text-muted-foreground mt-0.5">{s.objetivo_principal}</p>
                              )}
                            </div>
                            <Badge variant="outline" className={`text-[10px] ${badge.color}`}>
                              {badge.label}
                            </Badge>
                          </div>

                          {/* Session details */}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-2">
                            {s.duracion_total && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {s.duracion_total} min
                              </span>
                            )}
                            {s.intensidad_objetivo && (
                              <span className="flex items-center gap-1">
                                <Zap className="h-3 w-3" /> {s.intensidad_objetivo}
                              </span>
                            )}
                            {s.fase_juego_principal && (
                              <span className="flex items-center gap-1">
                                <Dumbbell className="h-3 w-3" /> {s.fase_juego_principal}
                              </span>
                            )}
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7"
                            onClick={() => { onClose(); onNavigate(`/sesiones/${s.id}`) }}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Ver sesion
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Quick actions for this day */}
              <div className="pt-3 border-t">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Anadir a este dia</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    className="text-xs h-9"
                    onClick={() => { onClose(); onNavigate('/sesiones/nueva') }}
                  >
                    <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
                    Entreno manual
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="text-xs h-9"
                    onClick={() => { onClose(); onNavigate('/sesiones/nueva-ai') }}
                  >
                    <Bot className="h-3.5 w-3.5 mr-1.5" />
                    Entreno con IA
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-9"
                    onClick={() => { onClose(); onNavigate('/partidos/nuevo') }}
                  >
                    <Swords className="h-3.5 w-3.5 mr-1.5" />
                    Partido
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-9"
                    onClick={() => {
                      if (selectedDay && equipoId) {
                        onToggleDescanso(selectedDay)
                      }
                      onClose()
                    }}
                  >
                    <Moon className="h-3.5 w-3.5 mr-1.5" />
                    {selectedDay && descansos.has(selectedDay) ? 'Quitar descanso' : 'Descanso'}
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
