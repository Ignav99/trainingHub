'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Star } from 'lucide-react'
import type { RivalScoutStrategy, RivalJugadorEvaluacion } from '@/types'
import { rivalesApi } from '@/lib/api/partidos'

interface RivalStrategyProps {
  data: RivalScoutStrategy | undefined
  rivalId?: string
  onChange: (data: RivalScoutStrategy) => void
}

interface FormationSlot {
  slotKey: string
  label: string
}

interface FormationLayout {
  rows: FormationSlot[][]
}

const FORMATION_LAYOUTS: Record<string, FormationLayout> = {
  '4-3-3': {
    rows: [
      [{ slotKey: 'pos_0', label: 'DC' }, { slotKey: 'pos_1', label: 'EXD' }, { slotKey: 'pos_2', label: 'EXI' }],
      [{ slotKey: 'pos_3', label: 'MC' }, { slotKey: 'pos_4', label: 'MC' }, { slotKey: 'pos_5', label: 'MC' }],
      [{ slotKey: 'pos_6', label: 'LTD' }, { slotKey: 'pos_7', label: 'DFC' }, { slotKey: 'pos_8', label: 'DFC' }, { slotKey: 'pos_9', label: 'LTI' }],
      [{ slotKey: 'pos_10', label: 'POR' }],
    ],
  },
  '4-4-2': {
    rows: [
      [{ slotKey: 'pos_0', label: 'DC' }, { slotKey: 'pos_1', label: 'DC' }],
      [{ slotKey: 'pos_2', label: 'MID' }, { slotKey: 'pos_3', label: 'MC' }, { slotKey: 'pos_4', label: 'MC' }, { slotKey: 'pos_5', label: 'MII' }],
      [{ slotKey: 'pos_6', label: 'LTD' }, { slotKey: 'pos_7', label: 'DFC' }, { slotKey: 'pos_8', label: 'DFC' }, { slotKey: 'pos_9', label: 'LTI' }],
      [{ slotKey: 'pos_10', label: 'POR' }],
    ],
  },
  '4-2-3-1': {
    rows: [
      [{ slotKey: 'pos_0', label: 'DC' }],
      [{ slotKey: 'pos_1', label: 'EXD' }, { slotKey: 'pos_2', label: 'MCO' }, { slotKey: 'pos_3', label: 'EXI' }],
      [{ slotKey: 'pos_4', label: 'MCD' }, { slotKey: 'pos_5', label: 'MCD' }],
      [{ slotKey: 'pos_6', label: 'LTD' }, { slotKey: 'pos_7', label: 'DFC' }, { slotKey: 'pos_8', label: 'DFC' }, { slotKey: 'pos_9', label: 'LTI' }],
      [{ slotKey: 'pos_10', label: 'POR' }],
    ],
  },
  '3-4-3': {
    rows: [
      [{ slotKey: 'pos_0', label: 'EXD' }, { slotKey: 'pos_1', label: 'DC' }, { slotKey: 'pos_2', label: 'EXI' }],
      [{ slotKey: 'pos_3', label: 'MID' }, { slotKey: 'pos_4', label: 'MC' }, { slotKey: 'pos_5', label: 'MC' }, { slotKey: 'pos_6', label: 'MII' }],
      [{ slotKey: 'pos_7', label: 'DFC' }, { slotKey: 'pos_8', label: 'DFC' }, { slotKey: 'pos_9', label: 'DFC' }],
      [{ slotKey: 'pos_10', label: 'POR' }],
    ],
  },
  '3-5-2': {
    rows: [
      [{ slotKey: 'pos_0', label: 'DC' }, { slotKey: 'pos_1', label: 'DC' }],
      [{ slotKey: 'pos_2', label: 'MID' }, { slotKey: 'pos_3', label: 'MC' }, { slotKey: 'pos_4', label: 'MC' }, { slotKey: 'pos_5', label: 'MC' }, { slotKey: 'pos_6', label: 'MII' }],
      [{ slotKey: 'pos_7', label: 'DFC' }, { slotKey: 'pos_8', label: 'DFC' }, { slotKey: 'pos_9', label: 'DFC' }],
      [{ slotKey: 'pos_10', label: 'POR' }],
    ],
  },
  '4-1-4-1': {
    rows: [
      [{ slotKey: 'pos_0', label: 'DC' }],
      [{ slotKey: 'pos_1', label: 'EXD' }, { slotKey: 'pos_2', label: 'MC' }, { slotKey: 'pos_3', label: 'MC' }, { slotKey: 'pos_4', label: 'EXI' }],
      [{ slotKey: 'pos_5', label: 'MCD' }],
      [{ slotKey: 'pos_6', label: 'LTD' }, { slotKey: 'pos_7', label: 'DFC' }, { slotKey: 'pos_8', label: 'DFC' }, { slotKey: 'pos_9', label: 'LTI' }],
      [{ slotKey: 'pos_10', label: 'POR' }],
    ],
  },
  '4-3-2-1': {
    rows: [
      [{ slotKey: 'pos_0', label: 'DC' }],
      [{ slotKey: 'pos_1', label: 'MCO' }, { slotKey: 'pos_2', label: 'MCO' }],
      [{ slotKey: 'pos_3', label: 'MC' }, { slotKey: 'pos_4', label: 'MCD' }, { slotKey: 'pos_5', label: 'MC' }],
      [{ slotKey: 'pos_6', label: 'LTD' }, { slotKey: 'pos_7', label: 'DFC' }, { slotKey: 'pos_8', label: 'DFC' }, { slotKey: 'pos_9', label: 'LTI' }],
      [{ slotKey: 'pos_10', label: 'POR' }],
    ],
  },
  '5-3-2': {
    rows: [
      [{ slotKey: 'pos_0', label: 'DC' }, { slotKey: 'pos_1', label: 'DC' }],
      [{ slotKey: 'pos_2', label: 'MC' }, { slotKey: 'pos_3', label: 'MC' }, { slotKey: 'pos_4', label: 'MC' }],
      [{ slotKey: 'pos_5', label: 'CAD' }, { slotKey: 'pos_6', label: 'DFC' }, { slotKey: 'pos_7', label: 'DFC' }, { slotKey: 'pos_8', label: 'DFC' }, { slotKey: 'pos_9', label: 'CAI' }],
      [{ slotKey: 'pos_10', label: 'POR' }],
    ],
  },
  '5-4-1': {
    rows: [
      [{ slotKey: 'pos_0', label: 'DC' }],
      [{ slotKey: 'pos_1', label: 'MID' }, { slotKey: 'pos_2', label: 'MC' }, { slotKey: 'pos_3', label: 'MC' }, { slotKey: 'pos_4', label: 'MII' }],
      [{ slotKey: 'pos_5', label: 'CAD' }, { slotKey: 'pos_6', label: 'DFC' }, { slotKey: 'pos_7', label: 'DFC' }, { slotKey: 'pos_8', label: 'DFC' }, { slotKey: 'pos_9', label: 'CAI' }],
      [{ slotKey: 'pos_10', label: 'POR' }],
    ],
  },
}

const FALLBACK_LAYOUT = FORMATION_LAYOUTS['4-4-2']

function getLayout(sistema: string | undefined): FormationLayout {
  return sistema ? (FORMATION_LAYOUTS[sistema] ?? FALLBACK_LAYOUT) : FALLBACK_LAYOUT
}

function getPlayerLabel(j: RivalJugadorEvaluacion): string {
  return j.dorsal ? `${j.dorsal}. ${j.nombre}` : j.nombre
}

export function RivalStrategy({ data, rivalId, onChange }: RivalStrategyProps) {
  const strategy = data ?? {}
  const onceProbable = strategy.once_probable
  const colocacion = onceProbable?.colocacion ?? {}
  const sistema = strategy.sistema ?? ''
  const layout = getLayout(sistema)
  const [loadingOnce, setLoadingOnce] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<RivalJugadorEvaluacion | null>(null)

  const jugadores = onceProbable?.jugadores ?? []
  const allSlotKeys = layout.rows.flatMap((row) => row.map((s) => s.slotKey))
  const placedNames = new Set(allSlotKeys.map((k) => colocacion[k]).filter(Boolean))

  const updateStrategy = (patch: Partial<RivalScoutStrategy>) => {
    onChange({ ...strategy, ...patch })
  }

  const handleLoadOnceProbable = async () => {
    if (!rivalId) return
    setLoadingOnce(true)
    try {
      const res = await rivalesApi.getOnceProbable(rivalId)
      const jugadores = (res.once_probable ?? []).map((j) => ({
        ...j,
        posicion: '',
        comentario: '',
        puntuacion: undefined,
      }))
      updateStrategy({
        once_probable: {
          actas_analizadas: res.actas_analizadas,
          jugadores,
          colocacion: {},
        },
      })
    } catch (err) {
      console.error('Error cargando once probable:', err)
    } finally {
      setLoadingOnce(false)
    }
  }

  const handleSlotSelect = (slotKey: string, playerName: string) => {
    const updated = { ...colocacion }
    if (playerName === '') {
      delete updated[slotKey]
    } else {
      for (const k of Object.keys(updated)) {
        if (updated[k] === playerName && k !== slotKey) delete updated[k]
      }
      updated[slotKey] = playerName
    }
    updateStrategy({
      once_probable: {
        ...onceProbable!,
        colocacion: updated,
      },
    })
  }

  const updateJugador = (nombre: string, patch: Partial<RivalJugadorEvaluacion>) => {
    const updated = jugadores.map((j) => (j.nombre === nombre ? { ...j, ...patch } : j))
    updateStrategy({
      once_probable: {
        ...onceProbable!,
        jugadores: updated,
      },
    })
  }

  const availablePlayers = jugadores.filter((j) => !placedNames.has(j.nombre))

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Estrategia</CardTitle>
            <p className="text-sm text-muted-foreground">Once probable y evaluación del rival</p>
          </div>
          {rivalId && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={handleLoadOnceProbable}
              disabled={loadingOnce}
            >
              {loadingOnce ? 'Cargando...' : 'Cargar 11 probable'}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Sistema del rival</Label>
          <Input
            value={sistema}
            onChange={(e) => updateStrategy({ sistema: e.target.value })}
            placeholder="4-4-2"
            className="h-8 text-sm w-32"
          />
        </div>

        {onceProbable && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Colocación en campo</Label>
              <Badge variant="secondary" className="text-[10px]">
                {onceProbable.actas_analizadas} actas analizadas
              </Badge>
            </div>
            <div
              className="rounded-lg overflow-hidden min-h-[360px] flex flex-col"
              style={{ background: 'linear-gradient(180deg, #1a6b2e 0%, #155a26 50%, #1a6b2e 100%)' }}
            >
              <div className="relative flex-1 px-6 py-8 flex flex-col justify-between">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-24 h-24 rounded-full border border-white/10" />
                </div>
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/10 -translate-x-px pointer-events-none" />
                {layout.rows.map((row, rowIndex) => (
                  <div key={rowIndex} className="flex justify-center gap-4 flex-wrap relative z-10">
                    {row.map((slot) => {
                      const selectedName = colocacion[slot.slotKey] ?? ''
                      return (
                        <div key={slot.slotKey} className="flex flex-col items-center gap-1 min-w-[72px]">
                          <span className="text-[10px] font-bold text-white/70 tracking-widest uppercase">{slot.label}</span>
                          <select
                            value={selectedName}
                            onChange={(e) => handleSlotSelect(slot.slotKey, e.target.value)}
                            className="w-full text-[11px] rounded bg-white/10 border border-white/20 text-white placeholder-white/50 px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-white/40 max-w-[110px]"
                          >
                            <option value="">-- elige --</option>
                            {jugadores.map((j) => (
                              <option key={j.nombre} value={j.nombre} className="text-black">
                                {getPlayerLabel(j)}
                              </option>
                            ))}
                          </select>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {jugadores.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Evaluación por jugador</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto rounded-md border p-2">
              {jugadores.map((j) => {
                const isSelected = selectedPlayer?.nombre === j.nombre
                return (
                  <div
                    key={j.nombre}
                    className={`rounded-md border p-2 cursor-pointer transition-colors ${
                      isSelected ? 'border-blue-500 bg-blue-50' : 'hover:bg-muted'
                    }`}
                    onClick={() => setSelectedPlayer(isSelected ? null : j)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center">
                          {j.dorsal ?? '?'}
                        </span>
                        <span className="text-xs font-medium">{j.nombre}</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              updateJugador(j.nombre, { puntuacion: j.puntuacion === star ? undefined : star })
                            }}
                            className="focus:outline-none"
                          >
                            <Star
                              className={`h-3.5 w-3.5 ${
                                (j.puntuacion ?? 0) >= star ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="mt-2 space-y-2">
                        <Input
                          value={j.posicion ?? ''}
                          onChange={(e) => updateJugador(j.nombre, { posicion: e.target.value })}
                          placeholder="Posición"
                          className="h-7 text-xs"
                        />
                        <Textarea
                          value={j.comentario ?? ''}
                          onChange={(e) => updateJugador(j.nombre, { comentario: e.target.value })}
                          placeholder="Comentario individual..."
                          rows={2}
                          className="text-xs resize-none"
                        />
                      </div>
                    )}
                    {!isSelected && j.comentario && (
                      <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{j.comentario}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Notas de estrategia</Label>
          <Textarea
            rows={2}
            className="resize-none text-sm"
            placeholder="Notas generales sobre la estrategia del rival..."
            value={strategy.notas ?? ''}
            onChange={(e) => updateStrategy({ notas: e.target.value })}
          />
        </div>
      </CardContent>
    </Card>
  )
}
