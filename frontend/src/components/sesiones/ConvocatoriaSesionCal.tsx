'use client'

import { Check, Plus, UserPlus, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Ficha } from '@/components/ui/ficha'
import { Estado } from '@/components/ui/estado'
import { cn } from '@/lib/utils'
import { EstadoMarca, esApercibido, estadoDe } from '@/components/plantilla/PlantillaTablaCal'
import {
  TIPO_JUGADOR_LABELS,
  isFilial,
  resolveTipoJugador,
  suggestAttendanceFromDisponibilidad,
} from '@/lib/jugadorTipo'
import type {
  CargaJugador,
  EntrenamientoMargen,
  Jugador,
  MotivoAusencia,
  TipoParticipacion,
} from '@/types'

export interface AsistenciaCalItem {
  presente: boolean
  motivo?: MotivoAusencia
  notas?: string
  tipo_participacion: TipoParticipacion[]
}

interface Props {
  grupos: { pos: string; jugadores: Jugador[] }[]
  asistencias: Map<string, AsistenciaCalItem>
  cargaMap: Map<string, CargaJugador>
  margenMap: Map<string, EntrenamientoMargen>
  motivos: { value: MotivoAusencia; label: string }[]
  equipoId?: string
  filialDisponibles: Jugador[]
  onToggle: (jugadorId: string) => void
  onToggleTipo: (jugadorId: string, tipo: TipoParticipacion) => void
  onMotivo: (jugadorId: string, motivo: MotivoAusencia) => void
  onRemove: (jugadorId: string) => void
  onOpenMargen: () => void
  onAddFilial: (jugador: Jugador) => void
  onOtroEquipo: () => void
  onManual: () => void
}

const TIPOS: { key: TipoParticipacion; label: string }[] = [
  { key: 'sesion', label: 'Sesión' },
  { key: 'fisio', label: 'Fisio' },
  { key: 'margen', label: 'Margen' },
  { key: 'presente', label: 'Presente' },
]

function nombreDe(j: Jugador) {
  return j.apodo || `${j.nombre} ${j.apellidos}`
}

function Tarjeta({ clase, texto }: { clase: string; texto: string }) {
  return (
    <span className="inline-flex items-center gap-1 tabular-nums">
      <span aria-hidden="true" className={cn('inline-block h-[0.85em] w-[0.6em] flex-none rotate-[10deg] rounded-[1px]', clase)} />
      {texto}
    </span>
  )
}

/** Convocatoria de la sesión en Cal: lista densa, fichas con foto, estado escrito con forma. */
export function ConvocatoriaSesionCal({
  grupos,
  asistencias,
  cargaMap,
  margenMap,
  motivos,
  equipoId,
  filialDisponibles,
  onToggle,
  onToggleTipo,
  onMotivo,
  onRemove,
  onOpenMargen,
  onAddFilial,
  onOtroEquipo,
  onManual,
}: Props) {
  return (
    <div className="space-y-5">
      {grupos.map(({ pos, jugadores }) => (
        <section key={pos} aria-label={pos}>
          <h4 className="cal-rotulo mb-1 border-b-[1.5px] border-line pb-1 text-muted-foreground">{pos}</h4>
          <ul className="divide-y divide-border">
            {jugadores.map((jugador) => {
              const asistencia = asistencias.get(jugador.id)
              const suggestion = !asistencia ? suggestAttendanceFromDisponibilidad(jugador) : null
              const presente = asistencia?.presente ?? suggestion?.presente ?? true
              const tipos =
                asistencia?.tipo_participacion ||
                (suggestion?.tipo_participacion as TipoParticipacion[] | undefined) ||
                (presente ? ['sesion'] : [])
              const esMargen = presente && (tipos.includes('margen') || tipos.includes('fisio'))
              const margen = margenMap.get(jugador.id)
              const est = estadoDe(jugador as never)
              const carga = cargaMap.get(jugador.id)
              const amarillas = carga?.tarjetas_amarillas ?? 0
              const rojas = carga?.tarjetas_rojas ?? 0
              const apercibido = esApercibido(amarillas)
              const quitable =
                isFilial(jugador) ||
                resolveTipoJugador(jugador) === 'invitado' ||
                (!!equipoId && !!jugador.equipo_id && jugador.equipo_id !== equipoId)
              const alertaCarga =
                carga?.nivel_carga === 'critico'
                  ? { texto: 'carga crítica', clase: 'text-destructive' }
                  : carga?.nivel_carga === 'alto'
                    ? { texto: 'carga a vigilar', clase: 'text-warning' }
                    : null
              return (
                <li key={jugador.id}>
                  <div className={cn('flex min-h-[44px] flex-wrap items-center gap-x-3 gap-y-1 py-1.5', !presente && 'opacity-60')}>
                    <button
                      type="button"
                      onClick={() => onToggle(jugador.id)}
                      aria-pressed={presente}
                      title={presente ? 'Marcar ausente' : 'Marcar presente'}
                      className={cn(
                        'inline-flex h-8 w-8 flex-none items-center justify-center rounded-[var(--radius)] border-[1.5px] transition-colors duration-rapido active:scale-[.97]',
                        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                        presente
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-line bg-card text-transparent hover:border-foreground'
                      )}
                    >
                      <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                      <span className="sr-only">{presente ? 'Presente' : 'Ausente'}</span>
                    </button>

                    <Ficha
                      size="sm"
                      dorsal={jugador.dorsal}
                      estado={est.ficha}
                      fotoUrl={jugador.foto_url}
                      label={nombreDe(jugador)}
                    />

                    <div className="min-w-0 flex-1 basis-40">
                      <p className="truncate text-sm font-semibold leading-tight">{nombreDe(jugador)}</p>
                      <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        <span className="cal-rotulo">{jugador.posicion_principal}</span>
                        {resolveTipoJugador(jugador) === 'invitado' && <span>invitado</span>}
                        {isFilial(jugador) && <span>filial</span>}
                        {est.tipo !== 'disponible' && <EstadoMarca est={est} className="text-xs" />}
                        {apercibido && (
                          <Estado tipo="apercibido" className="text-xs">
                            apercibido ({amarillas})
                          </Estado>
                        )}
                        {!apercibido && amarillas > 0 && <Tarjeta clase="bg-warning" texto={`${amarillas}`} />}
                        {rojas > 0 && <Tarjeta clase="bg-destructive" texto={`${rojas}`} />}
                        {alertaCarga && <span className={cn('font-semibold', alertaCarga.clase)}>{alertaCarga.texto}</span>}
                      </p>
                    </div>

                    {presente ? (
                      <div role="group" aria-label="Participación" className="flex flex-none items-center">
                        {TIPOS.map((t) => {
                          const activo = tipos.includes(t.key)
                          return (
                            <button
                              key={t.key}
                              type="button"
                              aria-pressed={activo}
                              onClick={() => onToggleTipo(jugador.id, t.key)}
                              className={cn(
                                '-ml-[1.5px] h-8 border-[1.5px] px-2.5 text-xs font-semibold transition-colors duration-rapido first:ml-0 active:scale-[.97]',
                                'focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring',
                                activo
                                  ? 'z-[1] border-primary bg-primary text-primary-foreground'
                                  : 'border-line bg-card text-muted-foreground hover:bg-sunken hover:text-foreground'
                              )}
                            >
                              {t.label}
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <select
                        className="h-8 flex-none rounded-[var(--radius)] border-[1.5px] border-line bg-card px-2 text-xs hover:border-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                        value={asistencia?.motivo || ''}
                        onChange={(e) => onMotivo(jugador.id, e.target.value as MotivoAusencia)}
                        aria-label="Motivo de la ausencia"
                      >
                        <option value="">Motivo...</option>
                        {motivos.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    )}

                    {quitable ? (
                      <button
                        type="button"
                        onClick={() => onRemove(jugador.id)}
                        title="Quitar de la sesión"
                        className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-[var(--radius)] text-muted-foreground transition-colors duration-rapido hover:bg-sunken hover:text-destructive focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">Quitar de la sesión</span>
                      </button>
                    ) : (
                      <span className="w-8 flex-none" aria-hidden="true" />
                    )}
                  </div>

                  {esMargen && (
                    <button
                      type="button"
                      onClick={onOpenMargen}
                      className="mb-1.5 ml-11 flex w-[calc(100%-2.75rem)] items-center justify-between gap-2 border-[1.5px] border-dashed border-line px-3 py-1.5 text-left text-xs font-semibold transition-colors duration-rapido hover:border-foreground hover:bg-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      <span className="flex items-center gap-1.5">
                        <Plus className="h-3 w-3" aria-hidden="true" />
                        {margen ? margen.objetivo || 'Trabajo al margen' : 'Asignar trabajo al margen'}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {margen ? `${margen.tareas?.length || 0} ejercicios` : 'abrir pestaña'}
                      </span>
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ))}

      {filialDisponibles.length > 0 && (
        <section aria-label="Añadir del filial">
          <h4 className="cal-rotulo mb-1 flex items-center gap-1.5 border-b-[1.5px] border-line pb-1 text-muted-foreground">
            <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
            Añadir del filial ({filialDisponibles.length})
          </h4>
          <p className="mb-1 text-xs text-muted-foreground">No entran solos. Pulsa uno para meterlo en la convocatoria.</p>
          <ul className="divide-y divide-border">
            {filialDisponibles.map((j) => (
              <li key={j.id}>
                <button
                  type="button"
                  onClick={() => onAddFilial(j)}
                  className="flex min-h-[44px] w-full items-center gap-3 py-1.5 text-left transition-colors duration-rapido hover:bg-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring active:scale-[.995]"
                >
                  <Ficha size="sm" dorsal={j.dorsal} fotoUrl={j.foto_url} label={nombreDe(j)} className="ml-1" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{nombreDe(j)}</span>
                    <span className="block text-xs text-muted-foreground">
                      {j.posicion_principal} · {TIPO_JUGADOR_LABELS[resolveTipoJugador(j)]}
                    </span>
                  </span>
                  <Plus className="mr-2 h-4 w-4 flex-none text-muted-foreground" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Añadir jugadores" className="flex flex-wrap items-center gap-2 border-t-[1.5px] border-line pt-3">
        <h4 className="cal-rotulo mr-2 text-muted-foreground">Añadir jugadores</h4>
        <Button variant="outline" size="sm" onClick={onOtroEquipo}>
          <Users className="mr-1 h-4 w-4" />
          De otro equipo
        </Button>
        <Button variant="outline" size="sm" onClick={onManual}>
          <Plus className="mr-1 h-4 w-4" />
          Jugador manual
        </Button>
      </section>
    </div>
  )
}
