'use client'

import { useState, useEffect } from 'react'
import { Users, ChevronRight, SkipForward, Check, X, UserPlus, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { jugadoresApi, Jugador } from '@/lib/api/jugadores'
import {
  isPlantilla,
  isFilial,
  resolveTipoJugador,
  TIPO_JUGADOR_LABELS,
  suggestAttendanceFromDisponibilidad,
  resolveDisponibilidad,
  DISPONIBILIDAD_LABELS,
  splitSesionAsistenciaRoster,
} from '@/lib/jugadorTipo'
import { useFilialVisibilityStore } from '@/stores/filialVisibilityStore'
import { MostrarFilialToggle } from '@/components/jugadores/MostrarFilialToggle'
import { useAppearance } from '@/lib/useAppearance'
import { Ficha } from '@/components/ui/ficha'
import { EstadoMarca, estadoDe } from '@/components/plantilla/PlantillaTablaCal'
import { cn } from '@/lib/utils'

export type MotivoAusencia = 'lesion' | 'enfermedad' | 'sancion' | 'permiso' | 'seleccion' | 'viaje' | 'otro'

export interface PlayerAttendance {
  jugador_id: string
  jugador: Jugador
  presente: boolean
  motivo_ausencia?: MotivoAusencia
  tipo_participacion?: Array<'sesion' | 'fisio' | 'margen' | 'presente'>
}

interface AttendanceStepProps {
  equipoId: string
  onConfirm: (attendance: PlayerAttendance[]) => void
  onSkip: () => void
  submitting?: boolean
}

const MOTIVOS: { value: MotivoAusencia; label: string }[] = [
  { value: 'lesion', label: 'Lesión' },
  { value: 'enfermedad', label: 'Enfermedad' },
  { value: 'sancion', label: 'Sanción' },
  { value: 'permiso', label: 'Permiso' },
  { value: 'seleccion', label: '1er equipo' },
  { value: 'viaje', label: 'Viaje' },
  { value: 'otro', label: 'Otro' },
]

const ZONE_ORDER = ['porteria', 'defensa', 'medio', 'ataque']
const ZONE_LABELS: Record<string, string> = {
  porteria: 'Porteros',
  defensa: 'Defensas',
  medio: 'Centrocampistas',
  ataque: 'Delanteros',
}

function getZone(jugador: Jugador): string {
  if (jugador.es_portero || jugador.posicion_principal === 'POR') return 'porteria'
  const pos = jugador.posicion_principal
  if (['DFC', 'LTD', 'LTI', 'CAD', 'CAI'].includes(pos)) return 'defensa'
  if (['MCD', 'MCO', 'MC', 'MPE', 'MGI', 'MDE', 'MOI', 'MOD'].includes(pos)) return 'medio'
  return 'ataque'
}

export function AttendanceStep({ equipoId, onConfirm, onSkip, submitting = false }: AttendanceStepProps) {
  const mostrarFilial = useFilialVisibilityStore((s) => s.mostrarFilial)
  const setMostrarFilial = useFilialVisibilityStore((s) => s.setMostrarFilial)
  const [allJugadores, setAllJugadores] = useState<Jugador[]>([])
  const [extraIds, setExtraIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [attendance, setAttendance] = useState<Record<string, PlayerAttendance>>({})
  const [showInvitados, setShowInvitados] = useState(false)
  const appearance = useAppearance()

  useEffect(() => {
    jugadoresApi
      .list({ equipo_id: equipoId, limit: 100 } as Parameters<typeof jugadoresApi.list>[0])
      .then(({ data }) => {
        setAllJugadores(data)
        const initial: Record<string, PlayerAttendance> = {}
        data.filter((j) => isPlantilla(j)).forEach((j) => {
          const suggestion = suggestAttendanceFromDisponibilidad(j)
          initial[j.id] = {
            jugador_id: j.id,
            jugador: j,
            presente: suggestion.presente,
            motivo_ausencia: suggestion.motivo_ausencia,
            tipo_participacion: suggestion.tipo_participacion,
          }
        })
        setAttendance(initial)
      })
      .finally(() => setLoading(false))
  }, [equipoId])

  const { inSession, filialDisponibles } = splitSesionAsistenciaRoster(allJugadores, extraIds)
  const invitadosDisponibles = allJugadores.filter(
    (j) => !isPlantilla(j) && !isFilial(j) && !extraIds.has(j.id)
  )

  function addOptIn(j: Jugador) {
    setExtraIds((prev) => new Set(prev).add(j.id))
    setAttendance((prev) => ({
      ...prev,
      [j.id]: { jugador_id: j.id, jugador: j, presente: true, tipo_participacion: ['sesion'] },
    }))
    if (isFilial(j) && !mostrarFilial) setMostrarFilial(true)
  }

  function removeOptIn(j: Jugador) {
    setExtraIds((prev) => {
      const next = new Set(prev)
      next.delete(j.id)
      return next
    })
    setAttendance((prev) => {
      const next = { ...prev }
      delete next[j.id]
      return next
    })
  }

  function removeAllFilial() {
    const filialIds = new Set(allJugadores.filter((j) => isFilial(j)).map((j) => j.id))
    setExtraIds((prev) => {
      const next = new Set(prev)
      filialIds.forEach((id) => next.delete(id))
      return next
    })
    setAttendance((prev) => {
      const next = { ...prev }
      filialIds.forEach((id) => {
        delete next[id]
      })
      return next
    })
  }

  function togglePlayer(id: string) {
    setAttendance((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        presente: !prev[id].presente,
        motivo_ausencia: prev[id].presente ? 'otro' : undefined,
        tipo_participacion: prev[id].presente ? [] : ['sesion'],
      },
    }))
  }

  function setMotivo(id: string, motivo: MotivoAusencia) {
    setAttendance((prev) => ({
      ...prev,
      [id]: { ...prev[id], motivo_ausencia: motivo },
    }))
  }

  const byZone = inSession.reduce<Record<string, Jugador[]>>((acc, j) => {
    const z = getZone(j)
    ;(acc[z] = acc[z] || []).push(j)
    return acc
  }, {})

  const visibleIds = new Set(inSession.map((j) => j.id))
  const list = Object.values(attendance).filter((a) => visibleIds.has(a.jugador_id))
  const presentCount = list.filter((a) => a.presente).length
  const porteros = list.filter((a) => a.jugador.es_portero && a.presente).length

  function handleConfirm() {
    if (submitting) return
    onConfirm(list)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <span className="animate-pulse">Cargando plantilla...</span>
      </div>
    )
  }

  if (appearance === 'cal') {
    const nombreDe = (j: Jugador) => j.apodo || `${j.nombre} ${j.apellidos}`
    const filaAnadir = (j: Jugador) => (
      <li key={j.id}>
        <button
          type="button"
          onClick={() => addOptIn(j)}
          className="flex min-h-[44px] w-full items-center gap-3 py-1.5 text-left transition-colors duration-rapido hover:bg-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring active:scale-[.995]"
        >
          <Ficha size="sm" dorsal={j.dorsal} fotoUrl={j.foto_url} label={nombreDe(j)} className="ml-1" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{nombreDe(j)}</span>
            <span className="block text-xs text-muted-foreground">
              {j.posicion_principal} · {TIPO_JUGADOR_LABELS[resolveTipoJugador(j)]}
            </span>
          </span>
          <UserPlus className="mr-2 h-4 w-4 flex-none text-muted-foreground" aria-hidden="true" />
        </button>
      </li>
    )
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="space-y-1">
          <h2 className="[font-stretch:112%] text-xl font-bold">¿Quién está disponible hoy?</h2>
          <p className="text-sm text-muted-foreground">
            La plantilla entra sola. El filial aparece abajo para añadirlo a mano, nunca automático.
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <p className="text-sm tabular-nums text-muted-foreground">
              <span className="font-bold text-foreground">{presentCount}</span> presentes ·{' '}
              <span className="font-bold text-foreground">{porteros}</span> {porteros === 1 ? 'portero' : 'porteros'} ·{' '}
              <span className="font-bold text-foreground">{list.length - presentCount}</span> ausentes
            </p>
            <MostrarFilialToggle onHide={removeAllFilial} />
          </div>
        </div>

        {ZONE_ORDER.filter((z) => byZone[z]?.length).map((zone) => (
          <section key={zone} aria-label={ZONE_LABELS[zone]}>
            <h3 className="cal-rotulo mb-1 border-b-[1.5px] border-line pb-1 text-muted-foreground">{ZONE_LABELS[zone]}</h3>
            <ul className="divide-y divide-border">
              {byZone[zone].map((j) => {
                const a = attendance[j.id]
                if (!a) return null
                const optIn = extraIds.has(j.id)
                const est = estadoDe(j as never)
                return (
                  <li key={j.id} className={cn('flex min-h-[44px] items-center gap-3 py-1.5', !a.presente && 'opacity-60')}>
                    <button
                      type="button"
                      onClick={() => togglePlayer(j.id)}
                      aria-pressed={a.presente}
                      title={a.presente ? 'Marcar ausente' : 'Marcar presente'}
                      className={cn(
                        'inline-flex h-8 w-8 flex-none items-center justify-center rounded-[var(--radius)] border-[1.5px] transition-colors duration-rapido active:scale-[.97]',
                        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                        a.presente
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-line bg-card text-transparent hover:border-foreground'
                      )}
                    >
                      <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                      <span className="sr-only">{a.presente ? 'Presente' : 'Ausente'}</span>
                    </button>
                    <Ficha size="sm" dorsal={j.dorsal} estado={est.ficha} fotoUrl={j.foto_url} label={nombreDe(j)} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold leading-tight">{nombreDe(j)}</p>
                      <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        <span className="cal-rotulo">{j.posicion_principal}</span>
                        {isFilial(j) && <span>filial</span>}
                        {est.tipo !== 'disponible' && <EstadoMarca est={est} className="text-xs" />}
                      </p>
                    </div>
                    {!a.presente && (
                      <select
                        className="h-8 flex-none rounded-[var(--radius)] border-[1.5px] border-line bg-card px-2 text-xs hover:border-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                        value={a.motivo_ausencia || 'otro'}
                        aria-label="Motivo de la ausencia"
                        onChange={(e) => setMotivo(j.id, e.target.value as MotivoAusencia)}
                      >
                        {MOTIVOS.map((m) => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    )}
                    {optIn && (
                      <button
                        type="button"
                        title="Quitar de la convocatoria"
                        onClick={() => removeOptIn(j)}
                        className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-[var(--radius)] text-muted-foreground transition-colors duration-rapido hover:bg-sunken hover:text-destructive focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">Quitar de la convocatoria</span>
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
            <h3 className="cal-rotulo mb-1 border-b-[1.5px] border-line pb-1 text-muted-foreground">
              Añadir del filial ({filialDisponibles.length})
            </h3>
            <ul className="divide-y divide-border">{filialDisponibles.map(filaAnadir)}</ul>
          </section>
        )}

        {invitadosDisponibles.length > 0 && (
          <section aria-label="Añadir invitados">
            <button
              type="button"
              aria-expanded={showInvitados}
              onClick={() => setShowInvitados((v) => !v)}
              className="cal-rotulo flex w-full items-center justify-between border-b-[1.5px] border-line pb-1 text-muted-foreground transition-colors duration-rapido hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
            >
              <span>Añadir invitados ({invitadosDisponibles.length} disponibles)</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showInvitados ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {showInvitados && <ul className="divide-y divide-border">{invitadosDisponibles.map(filaAnadir)}</ul>}
          </section>
        )}

        <div className="flex gap-3 border-t-[1.5px] border-line pt-3">
          <Button variant="outline" className="flex-1" onClick={onSkip} disabled={submitting}>
            <SkipForward className="mr-2 h-4 w-4" />
            Saltar
          </Button>
          <Button className="flex-1" onClick={handleConfirm} disabled={submitting}>
            Continuar con {presentCount} jugadores
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-2">
          <Users className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">¿Quién está disponible hoy?</h2>
        <p className="text-sm text-muted-foreground">
          La plantilla entra sola. El filial aparece abajo para añadirlo a mano, nunca automático.
        </p>
        <div className="flex justify-center pt-1">
          <MostrarFilialToggle onHide={removeAllFilial} />
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 flex-wrap">
        <Badge variant="secondary" className="px-4 py-1.5 text-sm">
          <Check className="w-3.5 h-3.5 mr-1.5 text-green-500" />
          {presentCount} presentes
        </Badge>
        <Badge variant="secondary" className="px-4 py-1.5 text-sm">
          {porteros} portero{porteros !== 1 ? 's' : ''}
        </Badge>
        <Badge variant="outline" className="px-4 py-1.5 text-sm text-muted-foreground">
          <X className="w-3.5 h-3.5 mr-1.5" />
          {list.length - presentCount} ausentes
        </Badge>
      </div>

      <div className="space-y-4">
        {ZONE_ORDER.filter((z) => byZone[z]?.length).map((zone) => (
          <div key={zone}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              {ZONE_LABELS[zone]}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {byZone[zone].map((j) => {
                const a = attendance[j.id]
                if (!a) return null
                const optIn = extraIds.has(j.id)
                return (
                  <div
                    key={j.id}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                      ${a.presente
                        ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30'
                        : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30 opacity-60'
                      }
                    `}
                    onClick={() => togglePlayer(j.id)}
                  >
                    <div
                      className={`
                        flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center
                        ${a.presente ? 'bg-green-500' : 'bg-red-400'}
                      `}
                    >
                      {a.presente
                        ? <Check className="w-3.5 h-3.5 text-white" />
                        : <X className="w-3.5 h-3.5 text-white" />
                      }
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {j.dorsal ? `${j.dorsal}. ` : ''}{j.apodo || `${j.nombre} ${j.apellidos}`}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <span>{j.posicion_principal}</span>
                        {isFilial(j) && (
                          <span className="text-[10px] font-medium text-blue-700">· Filial</span>
                        )}
                        {resolveDisponibilidad(j) !== 'pleno' && (
                          <span className="text-[10px] font-medium text-amber-700">
                            · {DISPONIBILIDAD_LABELS[resolveDisponibilidad(j)]}
                          </span>
                        )}
                      </p>
                    </div>

                    {!a.presente && (
                      <select
                        className="text-xs border rounded px-1 py-0.5 bg-background"
                        value={a.motivo_ausencia || 'otro'}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setMotivo(j.id, e.target.value as MotivoAusencia)}
                      >
                        {MOTIVOS.map((m) => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    )}
                    {optIn && (
                      <button
                        type="button"
                        className="p-1 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600"
                        title="Quitar de la convocatoria"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeOptIn(j)
                        }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {filialDisponibles.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="px-4 py-3 text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <UserPlus className="w-4 h-4" />
            Añadir del filial ({filialDisponibles.length})
          </div>
          <div className="px-4 pb-4 pt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filialDisponibles.map((j) => (
              <button
                key={j.id}
                type="button"
                className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-blue-300/60 hover:border-blue-500 hover:bg-blue-50/60 transition-colors text-left"
                onClick={() => addOptIn(j)}
              >
                <UserPlus className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{j.apodo || `${j.nombre} ${j.apellidos}`}</p>
                  <p className="text-xs text-muted-foreground">
                    {j.posicion_principal} · {TIPO_JUGADOR_LABELS[resolveTipoJugador(j)]}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {invitadosDisponibles.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
            onClick={() => setShowInvitados((v) => !v)}
          >
            <span className="flex items-center gap-2 text-muted-foreground">
              <UserPlus className="w-4 h-4" />
              Añadir invitados ({invitadosDisponibles.length} disponibles)
            </span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showInvitados ? 'rotate-180' : ''}`} />
          </button>
          {showInvitados && (
            <div className="px-4 pb-4 pt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {invitadosDisponibles.map((j) => (
                <button
                  key={j.id}
                  type="button"
                  className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/5 transition-colors text-left"
                  onClick={() => addOptIn(j)}
                >
                  <UserPlus className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{j.apodo || `${j.nombre} ${j.apellidos}`}</p>
                    <p className="text-xs text-muted-foreground">
                      {j.posicion_principal} · {TIPO_JUGADOR_LABELS[resolveTipoJugador(j)]}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button variant="outline" className="flex-1" onClick={onSkip} disabled={submitting}>
          <SkipForward className="w-4 h-4 mr-2" />
          Saltar
        </Button>
        <Button className="flex-1" onClick={handleConfirm} disabled={submitting}>
          Continuar con {presentCount} jugadores
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
