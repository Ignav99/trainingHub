'use client'

import { useState, useEffect } from 'react'
import { Users, ChevronRight, SkipForward, Check, X, UserPlus, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { jugadoresApi, Jugador } from '@/lib/api/jugadores'

export type MotivoAusencia = 'lesion' | 'enfermedad' | 'sancion' | 'permiso' | 'seleccion' | 'viaje' | 'otro'

export interface PlayerAttendance {
  jugador_id: string
  jugador: Jugador
  presente: boolean
  motivo_ausencia?: MotivoAusencia
}

interface AttendanceStepProps {
  equipoId: string
  onConfirm: (attendance: PlayerAttendance[]) => void
  onSkip: () => void
}

const MOTIVOS: { value: MotivoAusencia; label: string }[] = [
  { value: 'lesion', label: 'Lesión' },
  { value: 'enfermedad', label: 'Enfermedad' },
  { value: 'sancion', label: 'Sanción' },
  { value: 'permiso', label: 'Permiso' },
  { value: 'seleccion', label: 'Selección' },
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

function mapEstadoToMotivo(estado: string): MotivoAusencia {
  const map: Record<string, MotivoAusencia> = {
    lesionado: 'lesion',
    en_recuperacion: 'lesion',
    enfermedad: 'enfermedad',
    sancionado: 'sancion',
    permiso: 'permiso',
    seleccion: 'seleccion',
    viaje: 'viaje',
  }
  return map[estado] || 'otro'
}

export function AttendanceStep({ equipoId, onConfirm, onSkip }: AttendanceStepProps) {
  const [jugadores, setJugadores] = useState<Jugador[]>([])
  const [invitadosDisponibles, setInvitadosDisponibles] = useState<Jugador[]>([])
  const [loading, setLoading] = useState(true)
  const [attendance, setAttendance] = useState<Record<string, PlayerAttendance>>({})
  const [showInvitados, setShowInvitados] = useState(false)

  useEffect(() => {
    jugadoresApi
      .list({ equipo_id: equipoId, limit: 100 } as Parameters<typeof jugadoresApi.list>[0])
      .then(({ data }) => {
        const plantilla = data.filter((j) => !j.es_invitado)
        const invitados = data.filter((j) => j.es_invitado)
        setJugadores(plantilla)
        setInvitadosDisponibles(invitados)
        const initial: Record<string, PlayerAttendance> = {}
        plantilla.forEach((j) => {
          const isInactive = ['lesionado', 'en_recuperacion', 'enfermedad', 'sancionado', 'viaje', 'permiso', 'seleccion', 'baja'].includes(j.estado)
          initial[j.id] = {
            jugador_id: j.id,
            jugador: j,
            presente: !isInactive,
            motivo_ausencia: isInactive ? mapEstadoToMotivo(j.estado) : undefined,
          }
        })
        setAttendance(initial)
      })
      .finally(() => setLoading(false))
  }, [equipoId])

  function addInvitado(j: Jugador) {
    setJugadores((prev) => [...prev, j])
    setInvitadosDisponibles((prev) => prev.filter((i) => i.id !== j.id))
    setAttendance((prev) => ({
      ...prev,
      [j.id]: { jugador_id: j.id, jugador: j, presente: true },
    }))
  }

  function removeInvitado(j: Jugador) {
    setJugadores((prev) => prev.filter((p) => p.id !== j.id))
    setInvitadosDisponibles((prev) => [...prev, j])
    setAttendance((prev) => {
      const next = { ...prev }
      delete next[j.id]
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
      },
    }))
  }

  function setMotivo(id: string, motivo: MotivoAusencia) {
    setAttendance((prev) => ({
      ...prev,
      [id]: { ...prev[id], motivo_ausencia: motivo },
    }))
  }

  const byZone = jugadores.reduce<Record<string, Jugador[]>>((acc, j) => {
    const z = getZone(j)
    ;(acc[z] = acc[z] || []).push(j)
    return acc
  }, {})

  const list = Object.values(attendance)
  const presentCount = list.filter((a) => a.presente).length
  const porteros = list.filter((a) => a.jugador.es_portero && a.presente).length

  function handleConfirm() {
    onConfirm(list)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <span className="animate-pulse">Cargando plantilla...</span>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-2">
          <Users className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">¿Quién está disponible hoy?</h2>
        <p className="text-sm text-muted-foreground">
          Marcá los jugadores presentes para que la IA diseñe la sesión con el número exacto de jugadores.
        </p>
      </div>

      {/* Summary pill */}
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

      {/* Players by zone */}
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
                    {/* Toggle indicator */}
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

                    {/* Player info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {j.dorsal ? `${j.dorsal}. ` : ''}{j.apodo || `${j.nombre} ${j.apellidos}`}
                      </p>
                      <p className="text-xs text-muted-foreground">{j.posicion_principal}</p>
                    </div>

                    {/* Motivo selector (only when absent) */}
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
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Invitados section */}
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
                  onClick={() => addInvitado(j)}
                >
                  <UserPlus className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{j.apodo || `${j.nombre} ${j.apellidos}`}</p>
                    <p className="text-xs text-muted-foreground">{j.posicion_principal} · Invitado</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Invitados added (chips to remove) */}
      {jugadores.filter((j) => j.estado === 'invitado').length > 0 && (
        <div className="flex flex-wrap gap-2">
          {jugadores.filter((j) => j.estado === 'invitado').map((j) => (
            <span
              key={j.id}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-sm"
            >
              {j.apodo || `${j.nombre} ${j.apellidos}`}
              <button type="button" onClick={() => removeInvitado(j)} className="hover:text-red-500 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" className="flex-1" onClick={onSkip}>
          <SkipForward className="w-4 h-4 mr-2" />
          Saltar
        </Button>
        <Button className="flex-1" onClick={handleConfirm}>
          Continuar con {presentCount} jugadores
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
