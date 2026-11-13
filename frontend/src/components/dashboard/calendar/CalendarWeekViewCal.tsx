'use client'

/** Vista semana en aspecto Cal: mismo lenguaje que el día de la vista mes. */

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowRight, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buildDayIndex, getBucket } from '@/lib/calendar/dayIndex'
import { DAY_NAMES_FULL, addDays, startOfWeekMonday, toLocalDateStr } from '@/lib/calendar/types'
import { etiquetaMicrociclo } from '@/lib/calendarioColores'
import { estadoDeMicrociclo } from '@/lib/microcicloEstado'
import type { Sesion } from '@/types'
import type { CalendarWeekViewProps } from './CalendarWeekView'
import {
  DescansoCal,
  EditorDiaPersonal,
  FOCO,
  FondoDia,
  MarcaEscudo,
  MarcoHoy,
  NotaDiaCal,
  LineaPartidoCal,
  LineaSesionCal,
  MenuAnadirDia,
  aspectoDia,
  nombreAccesibleDia,
  semanaDeHoy,
} from './DiaCal'

const INTENSIDAD: Record<string, string> = { baja: 'Baja', media: 'Media', alta: 'Alta', maxima: 'Máxima' }

function cargaUA(s: Sesion): number | null {
  if (!s.duracion_total) return null
  const rpe: Record<string, number> = { baja: 3, media: 5, alta: 7, maxima: 9 }
  return Math.round(s.duracion_total * (s.intensidad_objetivo ? rpe[s.intensidad_objetivo] : 5))
}

export function CalendarWeekViewCal({
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
  diasPersonales,
  onGuardarDiaPersonal,
  onQuitarDiaPersonal,
}: CalendarWeekViewProps) {
  const [editor, setEditor] = useState<string | null>(null)
  const lunes = startOfWeekMonday(focusDate)
  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(lunes, i)), [lunes])
  const index = useMemo(
    () => buildDayIndex({ sesiones, partidos, microciclos, descansos }),
    [sesiones, partidos, microciclos, descansos]
  )
  const micro = useMemo(() => {
    const domingo = addDays(lunes, 6)
    return microciclos.find((m) => m.fecha_inicio.slice(0, 10) <= domingo && m.fecha_fin.slice(0, 10) >= lunes) || null
  }, [microciclos, lunes])
  const hoy = toLocalDateStr(new Date())
  const semana = semanaDeHoy()

  return (
    <div className="space-y-3">
      {micro && (
        <button
          type="button"
          onClick={() => onNavigate(`/microciclos/${micro.id}`)}
          className={cn(
            'flex w-full items-center justify-between gap-3 bg-card px-3 py-2 text-left cal-linea hover:bg-sunken',
            FOCO
          )}
        >
          <div className="min-w-0">
            <p className="cal-rotulo text-muted-foreground">
              Microciclo <span className="font-mono tabular-nums text-foreground">{etiquetaMicrociclo(micro)}</span> ·{' '}
              {estadoDeMicrociclo(micro).replace('_', ' ')}
            </p>
            <p className="truncate text-sm font-medium">{micro.objetivo_principal || 'Sin objetivo principal'}</p>
            {(micro.objetivo_tactico || micro.objetivo_fisico) && (
              <p className="truncate text-[11px] text-muted-foreground">
                {[micro.objetivo_tactico, micro.objetivo_fisico].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
          <ArrowRight aria-hidden className="h-4 w-4 flex-none text-muted-foreground" />
        </button>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-7">
        {dias.map((fecha, i) => {
          const b = getBucket(index, fecha)
          const esHoy = fecha === hoy
          const esPasado = fecha < hoy
          const personal = diasPersonales?.[fecha] ?? null
          const descanso = b.descanso && !personal
          const aspecto = aspectoDia({ sesiones: b.sesiones, partidos: b.partidos, fecha, semana, personal })
          const etiqueta = nombreAccesibleDia({
            fecha,
            sesiones: b.sesiones,
            partidos: b.partidos,
            descanso,
            md: aspecto.md,
            personal,
            esHoy,
          })
          const hayContenido = b.partidos.length > 0 || b.sesiones.length > 0 || descanso || !!personal
          const menu = addMenuDay === fecha
          return (
            <div
              key={fecha}
              role="group"
              aria-label={etiqueta}
              className="group relative flex min-h-[200px] flex-col overflow-visible bg-card cal-linea md:min-h-[340px]"
            >
              <FondoDia aspecto={aspecto} descanso={descanso} />
              {b.partidos[0] && <MarcaEscudo partido={b.partidos[0]} tam={110} />}
              {esHoy && <MarcoHoy />}
              <div className="relative z-[2] flex items-center justify-between border-b border-border px-2.5 py-2">
                <button
                  type="button"
                  onClick={() => onSelectDay(fecha)}
                  aria-current={esHoy ? 'date' : undefined}
                  aria-label={`Abrir ${etiqueta.split('.')[0]}`}
                  className={cn('rounded-[var(--radius)] text-left hover:underline', FOCO)}
                >
                  <span className="cal-rotulo block text-muted-foreground">
                    {DAY_NAMES_FULL[i]}
                    {esHoy && <span className="text-foreground"> · Hoy</span>}
                  </span>
                  <span
                    className={cn(
                      'mt-0.5 inline-flex min-w-7 items-center justify-center rounded-[var(--radius)] px-1 text-xl font-bold leading-tight tabular-nums',
                      esHoy && 'border-[1.5px] border-line'
                    )}
                  >
                    {new Date(fecha + 'T12:00:00').getDate()}
                  </span>
                </button>
                {!esPasado && (
                  <button
                    type="button"
                    className={cn('rounded-[var(--radius)] p-1 hover:bg-sunken', FOCO)}
                    onClick={() => setAddMenuDay(menu ? null : fecha)}
                    aria-label="Añadir al día"
                    aria-expanded={menu}
                    title="Añadir al día"
                  >
                    <Plus aria-hidden className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="relative z-[2] flex-1 space-y-3 overflow-y-auto p-2">
                {personal && <NotaDiaCal dia={personal} discreto={b.partidos.length > 0 || b.sesiones.length > 0} />}
                {b.partidos.map((p) => (
                  <div key={p.id} className="space-y-1">
                    <LineaPartidoCal partido={p} />
                    <div className="flex flex-wrap gap-x-2 text-[10px]">
                      <Link className={cn('text-muted-foreground underline-offset-2 hover:text-foreground hover:underline', FOCO)} href={`/partidos?match=${p.id}&tab=informe-partido`}>
                        Informe
                      </Link>
                      <Link className={cn('text-muted-foreground underline-offset-2 hover:text-foreground hover:underline', FOCO)} href={`/partidos?match=${p.id}&tab=plan-partido`}>
                        Plan
                      </Link>
                    </div>
                  </div>
                ))}

                {b.sesiones.map((s) => {
                  const ua = cargaUA(s)
                  const nTareas = s.tareas?.length
                  const meta = [
                    s.hora ? s.hora.slice(0, 5) : '',
                    s.intensidad_objetivo ? INTENSIDAD[s.intensidad_objetivo] || s.intensidad_objetivo : '',
                    ua != null ? `~${ua} UA` : '',
                    nTareas ? `${nTareas} tareas` : '',
                  ].filter(Boolean)
                  return (
                    <div key={s.id} className="space-y-0.5">
                      <LineaSesionCal sesion={s} />
                      {meta.length > 0 && (
                        <p className="text-[10px] text-muted-foreground tabular-nums">{meta.join(' · ')}</p>
                      )}
                      {s.objetivo_principal && (
                        <p className="line-clamp-2 text-[10px] leading-snug text-muted-foreground">{s.objetivo_principal}</p>
                      )}
                      {s.tareas && s.tareas.length > 0 && (
                        <ul className="space-y-0.5 pt-0.5 text-[10px] text-muted-foreground">
                          {s.tareas.slice(0, 3).map((t, idx) => {
                            const x = t as unknown as { id?: string; titulo?: string; tarea?: { titulo?: string } }
                            return (
                              <li key={x.id || idx} className="truncate">
                                · {x.tarea?.titulo || x.titulo || `Tarea ${idx + 1}`}
                              </li>
                            )
                          })}
                          {s.tareas.length > 3 && <li>+{s.tareas.length - 3} más</li>}
                        </ul>
                      )}
                    </div>
                  )
                })}

                {descanso && <DescansoCal />}

                {!hayContenido && (
                  <button
                    type="button"
                    onClick={() => onSelectDay(fecha)}
                    className={cn('w-full rounded-[var(--radius)] py-8 text-center text-[11px] text-muted-foreground hover:bg-sunken', FOCO)}
                  >
                    Sin actividad · clic para añadir
                  </button>
                )}
              </div>

              {menu && (
                <MenuAnadirDia
                  fecha={fecha}
                  esDescanso={descanso}
                  personal={personal}
                  onClose={() => setAddMenuDay(null)}
                  onNavigate={onNavigate}
                  onToggleDescanso={() => {
                    if (equipoId) onToggleDescanso(fecha)
                  }}
                  onOtro={onGuardarDiaPersonal ? () => setEditor(fecha) : undefined}
                />
              )}
              {editor === fecha && onGuardarDiaPersonal && (
                <EditorDiaPersonal
                  inicial={personal}
                  alinear={i < 3 ? 'izquierda' : 'derecha'}
                  onGuardar={(d) => {
                    setEditor(null)
                    onGuardarDiaPersonal(fecha, d)
                  }}
                  onQuitar={
                    personal && onQuitarDiaPersonal
                      ? () => {
                          setEditor(null)
                          onQuitarDiaPersonal(fecha)
                        }
                      : undefined
                  }
                  onClose={() => setEditor(null)}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
