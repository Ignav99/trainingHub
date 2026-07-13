'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Star, Plus, X } from 'lucide-react'
import type { RivalScoutStrategy, RivalJugadorEvaluacion } from '@/types'
import { rivalesApi } from '@/lib/api/partidos'
import { FORMATIONS } from '@/lib/formations'
import { POSICIONES } from '@/lib/api/jugadores'

interface RivalStrategyProps {
  data: RivalScoutStrategy | undefined
  rivalId?: string
  onChange: (data: RivalScoutStrategy) => void
}

export function RivalStrategy({ data, rivalId, onChange }: RivalStrategyProps) {
  const strategy = data ?? {}
  const onceProbable = strategy.once_probable
  const colocacion = onceProbable?.colocacion ?? {}
  const sistema = strategy.sistema || '4-4-2'
  const activeFormation = FORMATIONS.find((f) => f.name === sistema) ?? FORMATIONS[1]

  const [loadingOnce, setLoadingOnce] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)
  const [pickingSlot, setPickingSlot] = useState<string | null>(null)

  const jugadores = onceProbable?.jugadores ?? []
  const placedNames = new Set(Object.values(colocacion).filter(Boolean))
  const availablePlayers = jugadores.filter((j) => !placedNames.has(j.nombre))
  const selectedJugador = jugadores.find((j) => j.nombre === selectedPlayer) ?? null

  const updateStrategy = (patch: Partial<RivalScoutStrategy>) => {
    onChange({ ...strategy, ...patch })
  }

  const handleLoadOnceProbable = async () => {
    if (!rivalId) return
    setLoadingOnce(true)
    try {
      const res = await rivalesApi.getOnceProbable(rivalId)
      const nuevosJugadores = (res.once_probable ?? []).map((j) => ({
        ...j,
        posicion: '',
        rol: '',
        comentario: '',
        puntuacion: undefined,
      }))
      updateStrategy({
        once_probable: {
          actas_analizadas: res.actas_analizadas,
          jugadores: nuevosJugadores,
          colocacion: {},
        },
      })
    } catch (err) {
      console.error('Error cargando once probable:', err)
    } finally {
      setLoadingOnce(false)
    }
  }

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
      setSelectedPlayer(current)
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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <Label className="text-sm font-medium">Sistema y once probable</Label>
          <p className="text-xs text-muted-foreground">
            Coloca a los jugadores según los partidos jugados y el conocimiento del rival
          </p>
        </div>
        {rivalId && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs shrink-0"
            onClick={handleLoadOnceProbable}
            disabled={loadingOnce}
          >
            {loadingOnce ? 'Cargando...' : 'Cargar 11 probable'}
          </Button>
        )}
      </div>

      {/* Formation pills — same formations used in Convocatoria / Alineación */}
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

      {onceProbable ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pitch */}
          <div className="md:col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Colocación en el campo</Label>
              <Badge variant="secondary" className="text-[10px]">
                {onceProbable.actas_analizadas} actas analizadas
              </Badge>
            </div>
            <div
              className="relative bg-emerald-700/90 rounded-xl overflow-hidden mx-auto max-w-sm"
              style={{ aspectRatio: '3/4' }}
            >
              <div className="absolute inset-3">
                <div className="absolute inset-0 border-2 border-white/25 rounded" />
                <div className="absolute top-1/2 left-0 right-0 border-t-2 border-white/25" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 border-2 border-white/25 rounded-full" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-[16%] border-2 border-t-0 border-white/25" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-[16%] border-2 border-b-0 border-white/25" />
              </div>
              {activeFormation.slots.map((slot) => {
                const playerName = colocacion[slot.id]
                const jugador = playerName ? jugadores.find((j) => j.nombre === playerName) : null
                const posInfo = POSICIONES[slot.position as keyof typeof POSICIONES]
                const bgColor = posInfo?.color || '#9CA3AF'
                const isPicking = pickingSlot === slot.id

                if (jugador) {
                  const isSelected = selectedPlayer === jugador.nombre
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      className="absolute -translate-x-1/2 -translate-y-1/2 text-center group cursor-pointer"
                      style={{ top: slot.top, left: slot.left }}
                      onClick={() => handleSlotClick(slot.id)}
                      title="Click para ver/editar rol"
                    >
                      <div
                        className={`w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center shadow-md text-white transition-all ${
                          isSelected ? 'ring-2 ring-yellow-400 ring-offset-1 scale-110' : ''
                        }`}
                        style={{ backgroundColor: bgColor }}
                      >
                        {jugador.dorsal ?? '?'}
                      </div>
                      <span className="block text-[9px] text-white font-medium mt-0.5 max-w-[64px] truncate drop-shadow mx-auto">
                        {jugador.nombre}
                      </span>
                      {!!jugador.puntuacion && (
                        <span className="block text-[8px] text-amber-300 leading-none">
                          {'★'.repeat(jugador.puntuacion)}
                        </span>
                      )}
                      <button
                        type="button"
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation()
                          clearSlot(slot.id)
                        }}
                        title="Quitar del puesto"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </button>
                  )
                }

                return (
                  <button
                    key={slot.id}
                    type="button"
                    className="absolute -translate-x-1/2 -translate-y-1/2 text-center cursor-pointer"
                    style={{ top: slot.top, left: slot.left }}
                    onClick={() => handleSlotClick(slot.id)}
                    title={`Añadir jugador: ${slot.label}`}
                  >
                    <div
                      className={`w-9 h-9 rounded-full border-2 border-dashed flex items-center justify-center transition-colors ${
                        isPicking ? 'border-yellow-300 bg-yellow-300/20' : 'border-white/50 hover:border-white hover:bg-white/10'
                      }`}
                    >
                      <Plus className="h-3.5 w-3.5 text-white/70" />
                    </div>
                    <span className="block text-[9px] text-white/60 font-medium mt-0.5">{slot.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Sidebar: player list / picker */}
          <div className="md:col-span-1 space-y-2">
            <Label className="text-xs font-medium">
              {pickingSlot ? 'Elige jugador para esa posición' : `Jugadores (${jugadores.length})`}
            </Label>
            <div className="space-y-1 max-h-[340px] overflow-y-auto rounded-md border p-1.5">
              {(pickingSlot ? availablePlayers : jugadores).map((j) => (
                <button
                  key={j.nombre}
                  type="button"
                  onClick={() => (pickingSlot ? assignSlot(pickingSlot, j.nombre) : setSelectedPlayer(j.nombre))}
                  className={`w-full flex items-center gap-2 text-left px-2 py-1.5 rounded text-xs transition-colors ${
                    selectedPlayer === j.nombre ? 'bg-blue-50 text-blue-800' : 'hover:bg-muted'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-[10px] font-bold flex items-center justify-center shrink-0">
                    {j.dorsal ?? '?'}
                  </span>
                  <span className="truncate flex-1">{j.nombre}</span>
                  {placedNames.has(j.nombre) && (
                    <Badge variant="secondary" className="text-[8px] px-1 shrink-0">en 11</Badge>
                  )}
                </button>
              ))}
              {pickingSlot && availablePlayers.length === 0 && (
                <p className="text-[10px] text-muted-foreground text-center py-2">No hay más jugadores disponibles</p>
              )}
            </div>
            {pickingSlot && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] w-full"
                onClick={() => setPickingSlot(null)}
              >
                Cancelar
              </Button>
            )}
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">
          Carga el once probable para empezar a colocar jugadores.
        </p>
      )}

      {/* Role / behaviour editor for the selected player — click any player
          on the pitch or in the list to open this. */}
      {selectedJugador && (
        <div className="rounded-md border p-3 space-y-2 bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-200 text-[10px] font-bold flex items-center justify-center">
                {selectedJugador.dorsal ?? '?'}
              </span>
              <span className="text-sm font-semibold">{selectedJugador.nombre}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() =>
                      updateJugador(selectedJugador.nombre, {
                        puntuacion: selectedJugador.puntuacion === star ? undefined : star,
                      })
                    }
                  >
                    <Star
                      className={`h-4 w-4 ${
                        (selectedJugador.puntuacion ?? 0) >= star ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setSelectedPlayer(null)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <Input
            value={selectedJugador.rol ?? ''}
            onChange={(e) => updateJugador(selectedJugador.nombre, { rol: e.target.value })}
            placeholder="Rol / tendencia (ej. pivote defensivo, extremo desequilibrante...)"
            className="h-8 text-xs"
          />
          <Textarea
            value={selectedJugador.comentario ?? ''}
            onChange={(e) => updateJugador(selectedJugador.nombre, { comentario: e.target.value })}
            placeholder="Comportamiento, actitud, qué suele hacer en el campo..."
            rows={2}
            className="text-xs resize-none"
          />
        </div>
      )}
    </div>
  )
}
