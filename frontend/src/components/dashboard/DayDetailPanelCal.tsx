'use client'

/**
 * Detalle del día en aspecto Cal. Mismo sistema que la celda del calendario:
 * riel de color a la izquierda de cada bloque (MD o localía), relleno si está
 * hecho, trama para el descanso, muestra de color para la nota del día. Sin
 * pastillas: los estados se escriben.
 */

import { useState } from 'react'
import {
  ArrowRight,
  Check,
  ChevronRight,
  ClipboardList,
  Clock,
  Eye,
  FileText,
  MapPin,
  Moon,
  PenLine,
  Swords,
  Tag,
  Target,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Localia } from '@/components/ui/localia'
import { cn } from '@/lib/utils'
import { isSameDay, toLocalDateStr } from '@/lib/calendar/types'
import { partidoLugarArbitro } from '@/lib/convocatoriaCartel'
import {
  colorLocalia,
  colorMD,
  esClaveMD,
  MD_NOMBRE,
  numeroSesion,
  partidoJugado,
  resultadoPartido,
  semanaDelAno,
  solido,
  textoEstadoSesion,
  tinte,
} from '@/lib/calendarioColores'
import { hslColorDia, type DiaPersonal } from '@/lib/diaPersonal'
import { estadoDeMicrociclo } from '@/lib/microcicloEstado'
import type { Microciclo, Partido, Sesion } from '@/types'
import { EditorDiaPersonal, MarcaEscudo, Muestra, TRAMA_DESCANSO } from './calendar/DiaCal'
import { useEstiloCasa } from './calendar/useEstiloCasa'

const INTENSIDAD: Record<string, string> = { baja: 'baja', media: 'media', alta: 'alta', maxima: 'máxima' }
const RPE: Record<string, number> = { baja: 3, media: 5, alta: 7, maxima: 9 }

function cargaUA(s: Sesion): number | null {
  if (!s.duracion_total) return null
  return Math.round(s.duracion_total * (s.intensidad_objetivo ? RPE[s.intensidad_objetivo] : 5))
}

function hora(h?: string | null) {
  return h ? h.slice(0, 5) : ''
}

/** Bloque con riel izquierdo de color y relleno si está hecho. */
function Bloque({
  canales,
  hecho,
  children,
  className,
}: {
  canales: string | null
  hecho?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('relative overflow-hidden border border-border bg-card py-2.5 pl-4 pr-3', className)}>
      {canales && hecho && <span aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundColor: tinte(canales) }} />}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-[3px]"
        style={{ backgroundColor: canales ? solido(canales) : 'hsl(var(--border))' }}
      />
      <div className="relative">{children}</div>
    </div>
  )
}

function Rotulo({ children }: { children: React.ReactNode }) {
  return <h4 className="cal-rotulo mb-1.5 text-[11px] text-muted-foreground">{children}</h4>
}

export interface DayDetailPanelCalProps {
  selectedDay: string | null
  onClose: () => void
  sesionesMes: Sesion[]
  partidosMes: Partido[]
  microciclosMes?: Microciclo[]
  descansos: Set<string>
  equipoId: string | undefined
  onToggleDescanso: (date: string) => void
  onNavigate: (path: string) => void
  diasPersonales?: Record<string, DiaPersonal>
  onGuardarDiaPersonal?: (date: string, dia: DiaPersonal) => void
  onQuitarDiaPersonal?: (date: string) => void
}

export function DayDetailPanelCal({
  selectedDay,
  onClose,
  sesionesMes,
  partidosMes,
  microciclosMes = [],
  descansos,
  equipoId,
  onToggleDescanso,
  onNavigate,
  diasPersonales,
  onGuardarDiaPersonal,
  onQuitarDiaPersonal,
}: DayDetailPanelCalProps) {
  const estiloCasa = useEstiloCasa()
  const [editando, setEditando] = useState(false)
  const ir = (path: string) => {
    onClose()
    onNavigate(path)
  }

  return (
    <Dialog
      open={!!selectedDay}
      onOpenChange={(open) => {
        if (!open) {
          setEditando(false)
          onClose()
        }
      }}
    >
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg" style={estiloCasa}>
        {selectedDay &&
          (() => {
            const fecha = new Date(selectedDay + 'T12:00:00')
            const esHoy = selectedDay === toLocalDateStr(new Date())
            const sesiones = sesionesMes
              .filter((s) => isSameDay(s.fecha, selectedDay))
              .sort((a, b) => String(a.hora ?? '').localeCompare(String(b.hora ?? '')))
            const partidos = partidosMes.filter((p) => isSameDay(p.fecha, selectedDay))
            const personal = diasPersonales?.[selectedDay] ?? null
            const descanso = descansos.has(selectedDay) && !personal
            const mc = microciclosMes.find(
              (m) => m.fecha_inicio.slice(0, 10) <= selectedDay && m.fecha_fin.slice(0, 10) >= selectedDay
            )
            const md = partidos.length ? 'MD' : sesiones.find((s) => esClaveMD(s.match_day))?.match_day ?? null
            const vacio = !partidos.length && !sesiones.length && !descanso && !personal
            const diaSemana = fecha.toLocaleDateString('es-ES', { weekday: 'long' })
            const resto = fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })

            return (
              <>
                <DialogHeader className="space-y-1 text-left">
                  <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    {esHoy && <span className="cal-rotulo border-[1.5px] border-line px-1 text-[10px] leading-4 text-foreground">Hoy</span>}
                    {md && (
                      <span className="inline-flex items-center gap-1 font-mono font-semibold tabular-nums">
                        {esClaveMD(md) && <Muestra canales={colorMD(md) as string} />}
                        {md}
                        {esClaveMD(md) && <span className="font-sans font-normal">· {MD_NOMBRE[md]}</span>}
                      </span>
                    )}
                  </p>
                  <DialogTitle className="cal-titulo text-xl">
                    <span className="inline-block first-letter:uppercase">{diaSemana}</span>{' '}
                    <span className="font-semibold tabular-nums text-muted-foreground">{resto}</span>
                  </DialogTitle>
                  <DialogDescription className="sr-only">Detalle del día con partidos, sesiones y acciones</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {mc && (
                    <button
                      type="button"
                      onClick={() => ir(`/microciclos/${mc.id}`)}
                      className="group/mc flex w-full items-center gap-3 rounded-[var(--radius)] border-l-2 border-[hsl(var(--casa,var(--primary)))] bg-[hsl(var(--casa,var(--primary))/0.08)] px-3 py-2 text-left transition-colors duration-150 ease-sale hover:bg-[hsl(var(--casa,var(--primary))/0.16)] motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="cal-rotulo block text-[10.5px] text-muted-foreground">
                          Microciclo <span className="font-mono text-foreground">Sem {semanaDelAno(mc.fecha_inicio)}</span> ·{' '}
                          {estadoDeMicrociclo(mc).replace('_', ' ')}
                        </span>
                        <span className="block truncate text-sm font-medium">{mc.objetivo_principal || 'Ver microciclo'}</span>
                        {(mc.objetivo_tactico || mc.objetivo_fisico) && (
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {[mc.objetivo_tactico, mc.objetivo_fisico].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </span>
                      <ChevronRight aria-hidden className="h-4 w-4 flex-none text-muted-foreground transition-transform duration-150 ease-sale group-hover/mc:translate-x-0.5 motion-reduce:transition-none" />
                    </button>
                  )}

                  {personal && !editando && (
                    <div
                      className="relative flex items-center gap-2 border border-border px-3 py-2.5"
                      style={{ backgroundColor: tinte(hslColorDia(personal.color), 0.16) }}
                    >
                      <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: solido(hslColorDia(personal.color)) }} />
                      <Muestra canales={hslColorDia(personal.color)} className="h-3 w-3" />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{personal.texto}</span>
                      {onGuardarDiaPersonal && equipoId && (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditando(true)}>
                          <PenLine className="mr-1 h-3 w-3" /> Editar
                        </Button>
                      )}
                    </div>
                  )}

                  {editando && onGuardarDiaPersonal && (
                    <EditorDiaPersonal
                      flotante={false}
                      inicial={personal}
                      onGuardar={(d) => {
                        setEditando(false)
                        onGuardarDiaPersonal(selectedDay, d)
                      }}
                      onQuitar={
                        personal && onQuitarDiaPersonal
                          ? () => {
                              setEditando(false)
                              onQuitarDiaPersonal(selectedDay)
                            }
                          : undefined
                      }
                      onClose={() => setEditando(false)}
                    />
                  )}

                  {descanso && (
                    <div className="flex items-center gap-2 border border-border px-3 py-3 text-sm font-medium text-muted-foreground" style={TRAMA_DESCANSO}>
                      <Moon aria-hidden className="h-4 w-4" />
                      Día de descanso
                    </div>
                  )}

                  {vacio && !editando && (
                    <p className="border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground">
                      Día libre, sin sesión ni partido.
                    </p>
                  )}

                  {partidos.length > 0 && (
                    <section>
                      <Rotulo>Partido{partidos.length > 1 ? 's' : ''}</Rotulo>
                      <div className="space-y-2">
                        {partidos.map((p) => {
                          const r = resultadoPartido(p.goles_favor, p.goles_contra)
                          const venue = partidoLugarArbitro(p)
                          return (
                            <Bloque key={p.id} canales={colorLocalia(p.localia)} hecho={partidoJugado(p)} className="group">
                              <MarcaEscudo partido={p} tam={104} />
                              <div className="relative space-y-2 pr-16">
                                <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                                  <Localia valor={p.localia} conTexto className="font-semibold" />
                                  {p.competicion && <span className="inline-block first-letter:uppercase">{p.competicion}</span>}
                                  {p.jornada != null && <span className="font-mono tabular-nums">J{p.jornada}</span>}
                                </p>
                                <p className="truncate text-base font-bold leading-tight">{p.rival?.nombre || p.rival?.nombre_corto || 'Rival'}</p>
                                {r ? (
                                  <p className="flex items-baseline gap-2">
                                    <span className="font-mono text-2xl font-bold tabular-nums">{r.marcador}</span>
                                    <span
                                      className={cn(
                                        'font-mono text-sm font-bold',
                                        r.marca === 'V' ? 'text-success' : r.marca === 'D' ? 'text-destructive' : 'text-muted-foreground'
                                      )}
                                    >
                                      {r.marca}
                                    </span>
                                    <span className="text-xs text-muted-foreground">{r.texto}</span>
                                  </p>
                                ) : null}
                                <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                  {p.hora && (
                                    <span className="inline-flex items-center gap-1 tabular-nums">
                                      <Clock aria-hidden className="h-3 w-3" /> {hora(p.hora)}
                                    </span>
                                  )}
                                  {venue.lugar && (
                                    <span className="inline-flex min-w-0 items-center gap-1 truncate">
                                      <MapPin aria-hidden className="h-3 w-3 flex-none" /> {venue.lugar}
                                    </span>
                                  )}
                                  {venue.arbitro && <span className="truncate">Árbitro: {venue.arbitro}</span>}
                                </p>
                              </div>
                              <div className="relative mt-3 flex flex-wrap gap-1.5">
                                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => ir(`/partidos?match=${p.id}&tab=informe-partido`)}>
                                  <Eye className="mr-1 h-3.5 w-3.5" /> Partido
                                </Button>
                                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => ir(`/partidos?match=${p.id}&tab=informe-partido`)}>
                                  <FileText className="mr-1 h-3.5 w-3.5" /> Informe
                                </Button>
                                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => ir(`/partidos?match=${p.id}&tab=plan-partido`)}>
                                  <Target className="mr-1 h-3.5 w-3.5" /> Plan
                                </Button>
                              </div>
                            </Bloque>
                          )
                        })}
                      </div>
                    </section>
                  )}

                  {sesiones.length > 0 && (
                    <section>
                      <Rotulo>Sesi{sesiones.length > 1 ? 'ones' : 'ón'}</Rotulo>
                      <div className="space-y-2">
                        {sesiones.map((s) => {
                          const n = numeroSesion(s)
                          const ua = cargaUA(s)
                          const tareas = (s.tareas || []).slice(0, 6)
                          const canales = colorMD(s.match_day) ?? (s.estado === 'completada' ? 'var(--muted-foreground)' : null)
                          const meta = [
                            s.duracion_total != null ? `${s.duracion_total} min` : '',
                            s.intensidad_objetivo ? `intensidad ${INTENSIDAD[s.intensidad_objetivo] || s.intensidad_objetivo}` : '',
                            ua != null ? `~${ua} UA` : '',
                            s.fase_juego_principal ? s.fase_juego_principal.replace(/_/g, ' ') : '',
                            s.carga_fisica_objetivo ? `carga ${s.carga_fisica_objetivo}` : '',
                          ].filter(Boolean)
                          return (
                            <Bloque key={s.id} canales={canales} hecho={s.estado === 'completada'}>
                              <p className="flex items-baseline gap-2 text-xs">
                                {n && <span className="font-mono font-bold tabular-nums">{n}</span>}
                                {s.hora && <span className="tabular-nums text-muted-foreground">{hora(s.hora)}</span>}
                                {s.match_day && <span className="font-mono tabular-nums text-muted-foreground">{s.match_day}</span>}
                                <span className="ml-auto inline-flex items-center gap-1 text-muted-foreground">
                                  {s.estado === 'completada' && <Check aria-hidden className="h-3 w-3 text-foreground" strokeWidth={2.5} />}
                                  {textoEstadoSesion(s.estado)}
                                </span>
                              </p>
                              <p className={cn('mt-0.5 text-[15px] font-semibold leading-snug', s.estado === 'cancelada' && 'text-muted-foreground line-through')}>
                                {s.titulo}
                              </p>
                              {meta.length > 0 && <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">{meta.join(' · ')}</p>}
                              {s.objetivo_principal && (
                                <p className="mt-1.5 flex gap-1.5 text-xs text-foreground">
                                  <Target aria-hidden className="mt-0.5 h-3 w-3 flex-none text-muted-foreground" />
                                  <span>{s.objetivo_principal}</span>
                                </p>
                              )}
                              {tareas.length > 0 && (
                                <ol className="mt-2 divide-y divide-border border-y border-border text-xs">
                                  {tareas.map((t, i) => {
                                    const dur = t.duracion_override || t.tarea?.duracion_total
                                    return (
                                      <li key={t.id || i} className="grid grid-cols-[1.5rem_1fr_auto] items-baseline gap-2 py-1">
                                        <span className="font-mono tabular-nums text-muted-foreground">{t.orden ?? i + 1}</span>
                                        <span className="min-w-0 truncate">
                                          {t.tarea?.titulo || `Tarea ${i + 1}`}
                                          {t.fase_sesion ? (
                                            <span className="text-muted-foreground"> · {String(t.fase_sesion).replace(/_/g, ' ')}</span>
                                          ) : null}
                                        </span>
                                        <span className="tabular-nums text-muted-foreground">{dur ? `${dur}′` : ''}</span>
                                      </li>
                                    )
                                  })}
                                </ol>
                              )}
                              {(s.tareas?.length || 0) > 6 && (
                                <p className="mt-1 text-[11px] text-muted-foreground">+{(s.tareas?.length || 0) - 6} más en la sesión</p>
                              )}
                              <button
                                type="button"
                                onClick={() => ir(`/sesiones/${s.id}`)}
                                className="group/abrir mt-2 inline-flex items-center gap-1 rounded-[var(--radius)] text-xs font-semibold text-foreground hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
                              >
                                Abrir sesión
                                <ArrowRight aria-hidden className="h-3.5 w-3.5 transition-transform duration-150 ease-sale group-hover/abrir:translate-x-0.5 motion-reduce:transition-none" />
                              </button>
                            </Bloque>
                          )
                        })}
                      </div>
                    </section>
                  )}

                  <section className="border-t border-border pt-3">
                    <Rotulo>Añadir a este día</Rotulo>
                    <div className="grid grid-cols-2 gap-2">
                      <Button size="sm" className="h-9 text-xs" onClick={() => ir(`/sesiones/nueva?fecha=${selectedDay}`)}>
                        <ClipboardList className="mr-1.5 h-3.5 w-3.5" /> Nueva sesión
                      </Button>
                      <Button size="sm" variant="outline" className="h-9 text-xs" onClick={() => ir(`/partidos/nuevo?fecha=${selectedDay}`)}>
                        <Swords className="mr-1.5 h-3.5 w-3.5" /> Partido
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 text-xs"
                        onClick={() => {
                          if (equipoId) onToggleDescanso(selectedDay)
                          onClose()
                        }}
                      >
                        <Moon className="mr-1.5 h-3.5 w-3.5" /> {descanso ? 'Quitar descanso' : 'Descanso'}
                      </Button>
                      {onGuardarDiaPersonal && equipoId && (
                        <Button size="sm" variant="outline" className="h-9 text-xs" onClick={() => setEditando(true)} disabled={editando}>
                          {personal ? <PenLine className="mr-1.5 h-3.5 w-3.5" /> : <Tag className="mr-1.5 h-3.5 w-3.5" />}
                          {personal ? 'Editar nota' : 'Otro…'}
                        </Button>
                      )}
                    </div>
                  </section>
                </div>
              </>
            )
          })()}
      </DialogContent>
    </Dialog>
  )
}
