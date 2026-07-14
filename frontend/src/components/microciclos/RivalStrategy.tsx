'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import type {
  RivalScoutStrategy,
  RivalJugadorEvaluacion,
  RivalAtributoEmoji,
  RivalJugadorAtributos,
} from '@/types'
import { rivalesApi } from '@/lib/api/partidos'
import { FORMATIONS } from '@/lib/formations'
import { POSICIONES } from '@/lib/api/jugadores'

const TABLA_FILAS = 18

const ATRIBUTO_OPTIONS: { key: RivalAtributoEmoji; emoji: string; title: string }[] = [
  { key: 'muro', emoji: '🧱', title: 'Muro' },
  { key: 'correcaminos', emoji: '🏃', title: 'Correcaminos' },
  { key: 'bombilla', emoji: '💡', title: 'Bombilla' },
]

interface RivalStrategyProps {
  data: RivalScoutStrategy | undefined
  rivalId?: string
  competicionId?: string
  onChange: (data: RivalScoutStrategy) => void
}

function toHorizontalPos(top: string, left: string) {
  const t = parseFloat(top)
  const l = parseFloat(left)
  return { top: `${l}%`, left: `${100 - t}%` }
}

function AtributoEmojis({
  atributos,
  size = 'sm',
  onToggle,
}: {
  atributos?: RivalJugadorAtributos
  size?: 'sm' | 'md'
  onToggle?: (key: RivalAtributoEmoji) => void
}) {
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-sm'
  return (
    <div className="flex items-center gap-0.5">
      {ATRIBUTO_OPTIONS.map(({ key, emoji, title }) => {
        const active = !!atributos?.[key]
        if (onToggle) {
          return (
            <button
              key={key}
              type="button"
              title={title}
              onClick={() => onToggle(key)}
              className={`${textSize} leading-none rounded p-0.5 transition-opacity ${
                active ? 'opacity-100 ring-1 ring-primary/40 bg-primary/10' : 'opacity-30 hover:opacity-70'
              }`}
            >
              {emoji}
            </button>
          )
        }
        if (!active) return null
        return (
          <span key={key} className={textSize} title={title}>
            {emoji}
          </span>
        )
      })}
    </div>
  )
}

export function RivalStrategy({ data, rivalId, competicionId, onChange }: RivalStrategyProps) {
  const strategy = data ?? {}
  const onceProbable = strategy.once_probable
  const colocacion = onceProbable?.colocacion ?? {}
  const sistema = strategy.sistema || '4-4-2'
  const activeFormation = FORMATIONS.find((f) => f.name === sistema) ?? FORMATIONS[1]

  const [loadingOnce, setLoadingOnce] = useState(false)
  const [pickingSlot, setPickingSlot] = useState<string | null>(null)

  const jugadores = onceProbable?.jugadores ?? []
  const placedNames = new Set(Object.values(colocacion).filter(Boolean))

  const updateStrategy = (patch: Partial<RivalScoutStrategy>) => {
    onChange({ ...strategy, ...patch })
  }

  const handleLoadOnceProbable = async () => {
    if (!rivalId) {
      toast.error('Vincula un rival al microciclo para cargar el 11 probable')
      return
    }
    if (!competicionId) {
      toast.error('No se encontró la competición RFEF del equipo. Comprueba que el equipo tiene liga vinculada.')
      return
    }

    setLoadingOnce(true)
    try {
      const res = await rivalesApi.getOnceProbable(rivalId, competicionId)
      const nuevosJugadores = (res.once_probable ?? []).map((j) => {
        const existing = jugadores.find((e) => e.nombre === j.nombre)
        return {
          ...j,
          posicion: existing?.posicion ?? '',
          rol: existing?.rol ?? '',
          comentario: existing?.comentario ?? '',
          atributos: existing?.atributos,
        }
      })

      if (nuevosJugadores.length === 0) {
        toast.warning('No hay actas con titulares para este rival en la competición')
      } else {
        toast.success(`${nuevosJugadores.length} jugadores cargados (${res.actas_analizadas} actas analizadas)`)
      }

      updateStrategy({
        once_probable: {
          actas_analizadas: res.actas_analizadas,
          jugadores: nuevosJugadores,
          colocacion: onceProbable?.colocacion ?? {},
        },
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error cargando once probable'
      console.error('Error cargando once probable:', err)
      toast.error(message)
    } finally {
      setLoadingOnce(false)
    }
  }

  const autoLoadedRef = useRef<string | null>(null)
  useEffect(() => {
    if (!rivalId || !competicionId || onceProbable?.jugadores?.length) return
    const key = `${rivalId}:${competicionId}`
    if (autoLoadedRef.current === key) return
    autoLoadedRef.current = key
    handleLoadOnceProbable()
  }, [rivalId, competicionId, onceProbable?.jugadores?.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const assignSlot = (slotId: string, playerName: string) => {
    if (!onceProbable) return
    const updated = { ...colocacion }
    for (const k of Object.keys(updated)) {
      if (updated[k] === playerName) delete updated[k]
    }
    updated[slotId] = playerName
    updateStrategy({ once_probable: { ...onceProbable, colocacion: updated } })
    setPickingSlot(null)
  }

  const clearSlot = (slotId: string) => {
    if (!onceProbable) return
    const updated = { ...colocacion }
    delete updated[slotId]
    updateStrategy({ once_probable: { ...onceProbable, colocacion: updated } })
  }

  const handleSlotClick = (slotId: string) => {
    if (pickingSlot === slotId) {
      setPickingSlot(null)
      return
    }
    const current = colocacion[slotId]
    if (current) {
      setPickingSlot(null)
    } else {
      setPickingSlot(slotId)
    }
  }

  const updateJugador = (nombre: string, patch: Partial<RivalJugadorEvaluacion>) => {
    if (!onceProbable) return
    const updated = jugadores.map((j) => (j.nombre === nombre ? { ...j, ...patch } : j))
    updateStrategy({ once_probable: { ...onceProbable, jugadores: updated } })
  }

  const toggleAtributo = (nombre: string, key: RivalAtributoEmoji) => {
    const j = jugadores.find((p) => p.nombre === nombre)
    if (!j) return
    const current = j.atributos ?? {}
    updateJugador(nombre, {
      atributos: { ...current, [key]: !current[key] },
    })
  }

  const totalActas = onceProbable?.actas_analizadas ?? 0
  const frecuenciaLabel = (apariciones?: number) =>
    totalActas > 0 ? `${apariciones ?? 0}/${totalActas}` : apariciones != null ? String(apariciones) : '—'

  const tablaFilas: (RivalJugadorEvaluacion | null)[] = Array.from({ length: TABLA_FILAS }, (_, i) =>
    jugadores[i] ?? null
  )

  const pickingSlotLabel = pickingSlot
    ? activeFormation.slots.find((s) => s.id === pickingSlot)?.label
    : null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <Label className="text-sm font-medium">Sistema y once probable</Label>
          <p className="text-xs text-muted-foreground">
            Coloca jugadores en el campo y anota estilo/atributos en la tabla
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs shrink-0"
          onClick={handleLoadOnceProbable}
          disabled={loadingOnce || !rivalId}
        >
          {loadingOnce ? 'Cargando...' : 'Cargar 11 probable'}
        </Button>
      </div>

      {!rivalId && (
        <p className="text-xs text-amber-600">
          Vincula un rival al microciclo para cargar el 11 probable desde las actas RFEF.
        </p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {FORMATIONS.map((f) => (
          <button
            key={f.name}
            type="button"
            onClick={() => updateStrategy({ sistema: f.name })}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              sistema === f.name
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
            }`}
          >
            {f.name}
          </button>
        ))}
      </div>

      {onceProbable && jugadores.length > 0 ? (
        <div className="space-y-4">
          {/* Campograma horizontal */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Colocación en el campo</Label>
              <Badge variant="secondary" className="text-[10px]">
                {onceProbable.actas_analizadas} actas · 🧱 muro · 🏃 velocidad · 💡 creatividad
              </Badge>
            </div>
            {pickingSlot && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                Elige un jugador de la tabla para la posición <strong>{pickingSlotLabel}</strong>
                <button type="button" className="ml-2 underline" onClick={() => setPickingSlot(null)}>
                  Cancelar
                </button>
              </p>
            )}
            <div
              className="relative bg-emerald-700/90 rounded-xl overflow-hidden w-full max-w-3xl mx-auto"
              style={{ aspectRatio: '4/3' }}
            >
              <div className="absolute inset-3">
                <div className="absolute inset-0 border-2 border-white/25 rounded" />
                <div className="absolute top-0 bottom-0 left-1/2 border-l-2 border-white/25" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 border-2 border-white/25 rounded-full" />
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-2/3 w-[16%] border-2 border-l-0 border-white/25" />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 h-2/3 w-[16%] border-2 border-r-0 border-white/25" />
              </div>
              {activeFormation.slots.map((slot) => {
                const pos = toHorizontalPos(slot.top, slot.left)
                const playerName = colocacion[slot.id]
                const jugador = playerName ? jugadores.find((j) => j.nombre === playerName) : null
                const posInfo = POSICIONES[slot.position as keyof typeof POSICIONES]
                const bgColor = posInfo?.color || '#9CA3AF'
                const isPicking = pickingSlot === slot.id

                if (jugador) {
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      className="absolute -translate-x-1/2 -translate-y-1/2 text-center group cursor-pointer"
                      style={{ top: pos.top, left: pos.left }}
                      onClick={() => handleSlotClick(slot.id)}
                      title={`${jugador.nombre} — click para cambiar`}
                    >
                      <div
                        className="w-8 h-8 rounded-full font-bold text-[10px] flex items-center justify-center shadow-md text-white"
                        style={{ backgroundColor: bgColor }}
                      >
                        {jugador.dorsal ?? '?'}
                      </div>
                      <span className="block text-[8px] text-white font-medium mt-0.5 max-w-[56px] truncate drop-shadow mx-auto">
                        {jugador.nombre.split(',')[0]}
                      </span>
                      {totalActas > 0 && (
                        <span className="block text-[7px] text-blue-200 font-semibold tabular-nums leading-none">
                          {frecuenciaLabel(jugador.apariciones)}
                        </span>
                      )}
                      <div className="flex justify-center mt-0.5">
                        <AtributoEmojis atributos={jugador.atributos} size="sm" />
                      </div>
                      <button
                        type="button"
                        className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation()
                          clearSlot(slot.id)
                        }}
                        title="Quitar del puesto"
                      >
                        <X className="h-2 w-2" />
                      </button>
                    </button>
                  )
                }

                return (
                  <button
                    key={slot.id}
                    type="button"
                    className="absolute -translate-x-1/2 -translate-y-1/2 text-center cursor-pointer"
                    style={{ top: pos.top, left: pos.left }}
                    onClick={() => handleSlotClick(slot.id)}
                    title={`Añadir jugador: ${slot.label}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full border-2 border-dashed flex items-center justify-center transition-colors ${
                        isPicking ? 'border-yellow-300 bg-yellow-300/20' : 'border-white/50 hover:border-white hover:bg-white/10'
                      }`}
                    >
                      <Plus className="h-3 w-3 text-white/70" />
                    </div>
                    <span className="block text-[8px] text-white/60 font-medium mt-0.5">{slot.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tabla de 18 jugadores */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Plantilla rival ({jugadores.length} jugadores)</Label>
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="text-left px-2 py-1.5 font-semibold w-8">#</th>
                    <th className="text-left px-2 py-1.5 font-semibold w-10">Dors.</th>
                    <th className="text-left px-2 py-1.5 font-semibold min-w-[120px]">Jugador</th>
                    <th className="text-center px-2 py-1.5 font-semibold w-12">Freq.</th>
                    <th className="text-center px-2 py-1.5 font-semibold w-20">Atributos</th>
                    <th className="text-left px-2 py-1.5 font-semibold min-w-[200px]">Comentario / estilo</th>
                    <th className="text-center px-2 py-1.5 font-semibold w-14">11</th>
                  </tr>
                </thead>
                <tbody>
                  {tablaFilas.map((j, i) => {
                    if (!j) {
                      return (
                        <tr key={`empty-${i}`} className="border-b last:border-0 text-muted-foreground/40">
                          <td className="px-2 py-1.5">{i + 1}</td>
                          <td colSpan={6} className="px-2 py-1.5 italic">
                            —
                          </td>
                        </tr>
                      )
                    }

                    const enOnce = placedNames.has(j.nombre)
                    const puedeAsignar = pickingSlot && !enOnce

                    return (
                      <tr
                        key={j.nombre}
                        className={`border-b last:border-0 transition-colors ${
                          puedeAsignar
                            ? 'cursor-pointer hover:bg-amber-50'
                            : enOnce
                              ? 'bg-blue-50/50'
                              : 'hover:bg-muted/30'
                        }`}
                        onClick={() => {
                          if (pickingSlot && !enOnce) assignSlot(pickingSlot, j.nombre)
                        }}
                      >
                        <td className="px-2 py-1.5 text-muted-foreground">{i + 1}</td>
                        <td className="px-2 py-1.5 font-bold">{j.dorsal ?? '?'}</td>
                        <td className="px-2 py-1.5 font-medium truncate max-w-[160px]" title={j.nombre}>
                          {j.nombre}
                        </td>
                        <td className="px-2 py-1.5 text-center tabular-nums text-blue-600 font-semibold">
                          {frecuenciaLabel(j.apariciones)}
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                            <AtributoEmojis
                              atributos={j.atributos}
                              size="md"
                              onToggle={(key) => toggleAtributo(j.nombre, key)}
                            />
                          </div>
                        </td>
                        <td className="px-2 py-1" onClick={(e) => e.stopPropagation()}>
                          <Input
                            value={j.comentario ?? ''}
                            onChange={(e) => updateJugador(j.nombre, { comentario: e.target.value })}
                            placeholder="Líder, regateador, agresivo..."
                            className="h-7 text-[11px] border-0 bg-transparent focus-visible:ring-1"
                          />
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          {enOnce ? (
                            <Badge variant="secondary" className="text-[9px] px-1">✓</Badge>
                          ) : pickingSlot ? (
                            <span className="text-[9px] text-amber-600">+</span>
                          ) : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Pincha una posición vacía en el campo y luego un jugador de la tabla. Atributos: 🧱 muro · 🏃 correcaminos · 💡 bombilla
            </p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">
          Pulsa &quot;Cargar 11 probable&quot; para traer los jugadores desde las actas RFEF del rival.
        </p>
      )}
    </div>
  )
}
