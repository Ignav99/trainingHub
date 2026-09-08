'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, X, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type {
  RivalScoutStrategy,
  RivalJugadorEvaluacion,
  RivalAtributoEmoji,
  RivalJugadorAtributos,
} from '@/types'
import { rivalesApi } from '@/lib/api/partidos'
import {
  mergeOnceProbableAnnotations,
  ensureOnceProbable,
  upsertRivalJugador,
  renameRivalJugador,
  removeRivalJugador,
  assignRivalSlot,
} from '@/lib/rivalScoutSync'
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

function parseDorsal(raw: string): number | null {
  const n = parseInt(raw.replace(/\D/g, ''), 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function RivalStrategy({ data, rivalId, competicionId, onChange }: RivalStrategyProps) {
  const strategy = data ?? {}
  const onceProbable = strategy.once_probable
  const colocacion = onceProbable?.colocacion ?? {}
  const sistema = strategy.sistema || '4-4-2'
  const activeFormation = FORMATIONS.find((f) => f.name === sistema) ?? FORMATIONS[1]

  const [loadingOnce, setLoadingOnce] = useState(false)
  const [pickingSlot, setPickingSlot] = useState<string | null>(null)
  const [typedName, setTypedName] = useState('')
  const [typedDorsal, setTypedDorsal] = useState('')
  const typedNameRef = useRef<HTMLInputElement>(null)
  const skipAutoApplyRef = useRef(false)

  const jugadores = onceProbable?.jugadores ?? []
  const placedNames = new Set(Object.values(colocacion).filter(Boolean))

  const updateStrategy = (patch: Partial<RivalScoutStrategy>) => {
    onChange({ ...strategy, ...patch })
  }

  const writeOnce = (next: ReturnType<typeof ensureOnceProbable>) => {
    skipAutoApplyRef.current = true
    updateStrategy({ once_probable: next, sistema })
  }

  const handleLoadOnceProbable = async (opts?: { silent?: boolean }) => {
    const silent = !!opts?.silent
    if (!rivalId) {
      if (!silent) toast.error('Necesitas un rival para cargar el 11 desde actas')
      return
    }
    if (!competicionId) {
      if (!silent) {
        toast.error('No hay competición RFEF vinculada. Puedes escribir el 11 a mano.')
      }
      return
    }

    setLoadingOnce(true)
    try {
      const res = await rivalesApi.getOnceProbable(rivalId, competicionId)
      if (silent && skipAutoApplyRef.current) return

      const fresh = res.once_probable ?? []
      if (!fresh.length) {
        if (!silent) toast.warning('No hay actas con titulares. Escribe el 11 a mano.')
        return
      }

      if (silent && (onceProbable?.jugadores?.length ?? 0) > 0) return

      const merged = mergeOnceProbableAnnotations(
        fresh.map((j) => ({
          ...j,
          posicion: '',
          rol: '',
          comentario: '',
          puntuacion: undefined,
        })),
        jugadores,
        onceProbable?.colocacion,
        res.actas_analizadas
      )

      if (!silent) {
        toast.success(`${merged.jugadores.length} jugadores (${res.actas_analizadas} actas). Puedes editar nombres y puestos.`)
      }
      updateStrategy({ once_probable: merged })
    } catch (err: unknown) {
      if (!silent) {
        const message = err instanceof Error ? err.message : 'Error cargando once probable'
        toast.error(message)
      }
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
    void handleLoadOnceProbable({ silent: true })
  }, [rivalId, competicionId, onceProbable?.jugadores?.length]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (pickingSlot) {
      typedNameRef.current?.focus()
    } else {
      setTypedName('')
      setTypedDorsal('')
    }
  }, [pickingSlot])

  const addOrPlace = (nombre: string, dorsal: number | null, slotId?: string | null) => {
    const trimmed = nombre.trim()
    if (!trimmed) return
    const slot = slotId ?? pickingSlot
    const slotMeta = slot ? activeFormation.slots.find((s) => s.id === slot) : undefined
    let next = upsertRivalJugador(onceProbable, trimmed, {
      dorsal: dorsal ?? undefined,
      posicion: slotMeta?.position,
    })
    if (slot) {
      next = assignRivalSlot(next, slot, trimmed)
    }
    writeOnce(next)
    setPickingSlot(null)
    setTypedName('')
    setTypedDorsal('')
  }

  const assignSlot = (slotId: string, playerName: string) => {
    writeOnce(assignRivalSlot(onceProbable, slotId, playerName))
    setPickingSlot(null)
  }

  const clearSlot = (slotId: string) => {
    const next = ensureOnceProbable(onceProbable)
    const updated = { ...next.colocacion }
    delete updated[slotId]
    next.colocacion = updated
    writeOnce(next)
  }

  const handleSlotClick = (slotId: string) => {
    if (pickingSlot === slotId) {
      setPickingSlot(null)
      return
    }
    const currentName = colocacion[slotId]
    const current = currentName ? jugadores.find((j) => j.nombre === currentName) : null
    setTypedName(current?.nombre ?? '')
    setTypedDorsal(current?.dorsal != null ? String(current.dorsal) : '')
    setPickingSlot(slotId)
  }

  const updateJugador = (nombre: string, patch: Partial<RivalJugadorEvaluacion>) => {
    const next = ensureOnceProbable(onceProbable)
    next.jugadores = next.jugadores.map((j) => (j.nombre === nombre ? { ...j, ...patch } : j))
    writeOnce(next)
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
    totalActas > 0 ? `${apariciones ?? 0}/${totalActas}` : apariciones != null && apariciones > 0 ? String(apariciones) : '—'

  const tablaFilas: (RivalJugadorEvaluacion | null)[] = Array.from({ length: TABLA_FILAS }, (_, i) =>
    jugadores[i] ?? null
  )

  const pickingSlotLabel = pickingSlot
    ? activeFormation.slots.find((s) => s.id === pickingSlot)?.label
    : null

  const placedCount = Object.values(colocacion).filter(Boolean).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <Label className="text-sm font-medium">Sistema y once probable</Label>
          <p className="text-xs text-muted-foreground">
            Elige el sistema, escribe los nombres o carga el 11 desde las actas RFEF
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs shrink-0"
          onClick={() => {
            skipAutoApplyRef.current = false
            void handleLoadOnceProbable({ silent: false })
          }}
          disabled={loadingOnce || !rivalId}
        >
          {loadingOnce ? 'Cargando...' : 'Cargar desde actas'}
        </Button>
      </div>

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

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">
              Colocación · {sistema} · {placedCount}/11
            </Label>
            <Badge variant="secondary" className="text-[10px]">
              {totalActas > 0
                ? `${totalActas} actas · 🧱 muro · 🏃 velocidad · 💡 creatividad`
                : 'Once manual · 🧱 muro · 🏃 velocidad · 💡 creatividad'}
            </Badge>
          </div>
          {pickingSlot && (
            <div className="flex flex-wrap items-end gap-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-2">
              <p className="text-xs text-amber-800 w-full">
                Posición <strong>{pickingSlotLabel}</strong>: escribe un nombre o elige uno de la tabla
              </p>
              <Input
                ref={typedNameRef}
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addOrPlace(typedName, parseDorsal(typedDorsal), pickingSlot)
                  }
                  if (e.key === 'Escape') setPickingSlot(null)
                }}
                placeholder="Nombre del jugador"
                className="h-8 text-xs w-44"
                aria-label="Nombre para el puesto"
              />
              <Input
                value={typedDorsal}
                onChange={(e) => setTypedDorsal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addOrPlace(typedName, parseDorsal(typedDorsal), pickingSlot)
                  }
                }}
                placeholder="#"
                className="h-8 text-xs w-14"
                inputMode="numeric"
                aria-label="Dorsal"
              />
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs"
                onClick={() => addOrPlace(typedName, parseDorsal(typedDorsal), pickingSlot)}
                disabled={!typedName.trim()}
              >
                Poner en el 11
              </Button>
              {colocacion[pickingSlot] ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    writeOnce(assignRivalSlot(onceProbable, pickingSlot, null))
                    setPickingSlot(null)
                  }}
                >
                  Quitar del 11
                </Button>
              ) : null}
              <button type="button" className="text-xs underline text-amber-800" onClick={() => setPickingSlot(null)}>
                Cancelar
              </button>
            </div>
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

        <div className="space-y-2">
          <Label className="text-xs font-medium">Plantilla rival ({jugadores.length} jugadores)</Label>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="text-left px-2 py-1.5 font-semibold w-8">#</th>
                  <th className="text-left px-2 py-1.5 font-semibold w-14">Dors.</th>
                  <th className="text-left px-2 py-1.5 font-semibold min-w-[120px]">Jugador</th>
                  <th className="text-center px-2 py-1.5 font-semibold w-12">Freq.</th>
                  <th className="text-center px-2 py-1.5 font-semibold w-20">Atributos</th>
                  <th className="text-left px-2 py-1.5 font-semibold min-w-[180px]">Comentario / estilo</th>
                  <th className="text-center px-2 py-1.5 font-semibold w-14">11</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {tablaFilas.map((j, i) => {
                  if (!j) {
                    return (
                      <EmptyPlayerRow
                        key={`empty-${i}`}
                        index={i}
                        pickingSlot={pickingSlot}
                        onAdd={(nombre, dorsal) => addOrPlace(nombre, dorsal, pickingSlot)}
                      />
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
                      <td className="px-1 py-1" onClick={(e) => e.stopPropagation()}>
                        <Input
                          value={j.dorsal ?? ''}
                          onChange={(e) => updateJugador(j.nombre, { dorsal: parseDorsal(e.target.value) })}
                          placeholder="#"
                          className="h-7 w-12 text-[11px] px-1"
                          inputMode="numeric"
                        />
                      </td>
                      <td className="px-1 py-1" onClick={(e) => e.stopPropagation()}>
                        <Input
                          defaultValue={j.nombre}
                          onBlur={(e) => {
                            const nextName = e.target.value.trim()
                            if (!nextName || nextName === j.nombre) return
                            writeOnce(renameRivalJugador(onceProbable, j.nombre, nextName))
                          }}
                          className="h-7 text-[11px] font-medium"
                        />
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
                      <td className="px-1 py-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="p-1 text-muted-foreground hover:text-red-600"
                          title="Quitar jugador"
                          onClick={() => writeOnce(removeRivalJugador(onceProbable, j.nombre))}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Pincha un puesto en el campo y escribe el nombre, o rellena la tabla. Cargar desde actas no borra los que hayas puesto a mano.
          </p>
        </div>
      </div>
    </div>
  )
}

function EmptyPlayerRow({
  index,
  pickingSlot,
  onAdd,
}: {
  index: number
  pickingSlot: string | null
  onAdd: (nombre: string, dorsal: number | null) => void
}) {
  const [nombre, setNombre] = useState('')
  const [dorsal, setDorsal] = useState('')

  const commit = () => {
    const n = nombre.trim()
    if (!n) return
    onAdd(n, parseDorsal(dorsal))
    setNombre('')
    setDorsal('')
  }

  return (
    <tr className="border-b last:border-0">
      <td className="px-2 py-1.5 text-muted-foreground/50">{index + 1}</td>
      <td className="px-1 py-1">
        <Input
          value={dorsal}
          onChange={(e) => setDorsal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
            }
          }}
          placeholder="#"
          className="h-7 w-12 text-[11px] px-1"
          inputMode="numeric"
        />
      </td>
      <td className="px-1 py-1" colSpan={5}>
        <Input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onBlur={() => {
            if (nombre.trim()) commit()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
            }
          }}
          placeholder={pickingSlot ? 'Nombre para este puesto…' : 'Añadir jugador a mano'}
          className="h-7 text-[11px]"
        />
      </td>
      <td />
    </tr>
  )
}
