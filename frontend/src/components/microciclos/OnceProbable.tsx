'use client'

import { useState } from 'react'
import { Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { SlotPlayerSelect } from '@/components/sesion/SlotPlayerSelect'
import { formacionSlotKeys, getFormacionLayout, SISTEMAS_11 } from '@/lib/formaciones11'
import { playerLabel } from '@/lib/slotPlayerGroups'
import { isOperativamenteConvocable, visibleEnListaEquipo } from '@/lib/jugadorTipo'
import { useFilialVisibilityStore } from '@/stores/filialVisibilityStore'
import { MostrarFilialToggle } from '@/components/jugadores/MostrarFilialToggle'
import { cn } from '@/lib/utils'
import type { OnceProbableData, Jugador } from '@/types'

interface OnceProbableProps {
  data: Partial<OnceProbableData>
  jugadores: Array<Pick<Jugador, 'id' | 'nombre' | 'apellidos' | 'apodo' | 'dorsal' | 'posicion_principal' | 'posiciones_secundarias' | 'estado' | 'disponibilidad' | 'es_invitado' | 'es_portero' | 'tipo_jugador'>>
  onChange: (data: Partial<OnceProbableData>) => void
}

export function OnceProbable({ data, jugadores, onChange }: OnceProbableProps) {
  const mostrarFilial = useFilialVisibilityStore((s) => s.mostrarFilial)
  const [openSlot, setOpenSlot] = useState<string | null>(null)
  const titulares = data.titulares ?? {}
  const suplentes = data.suplentes ?? []
  const sistema = data.sistema ?? '4-3-3'
  const layout = getFormacionLayout(sistema)
  const slotKeys = formacionSlotKeys(sistema)
  const titularIds = new Set(slotKeys.map((k) => titulares[k]).filter(Boolean))
  const filled = slotKeys.filter((k) => titulares[k]).length

  const active = jugadores.filter(
    (j) => isOperativamenteConvocable(j) && visibleEnListaEquipo(j, mostrarFilial)
  )

  const handleSlotSelect = (slotKey: string, playerId: string) => {
    const updated = { ...titulares }
    if (playerId === '') {
      delete updated[slotKey]
    } else {
      for (const k of Object.keys(updated)) {
        if (updated[k] === playerId && k !== slotKey) delete updated[k]
      }
      updated[slotKey] = playerId
    }
    onChange({ ...data, titulares: updated, suplentes: suplentes.filter((id) => id !== playerId) })
  }

  const handleToggleSuplente = (playerId: string) => {
    const updatedSuplentes = suplentes.includes(playerId)
      ? suplentes.filter((id) => id !== playerId)
      : [...suplentes, playerId]
    onChange({ ...data, suplentes: updatedSuplentes })
  }

  const availableForSuplentes = active
    .filter((j) => !titularIds.has(j.id))
    .sort((a, b) => playerLabel(a).localeCompare(playerLabel(b), 'es'))

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            Once probable
            <span className="text-[11px] font-normal text-muted-foreground tabular-nums">
              {filled}/11
            </span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <select
              className="h-7 rounded-md border bg-background px-1.5 text-[11px]"
              value={sistema}
              onChange={(e) => onChange({ ...data, sistema: e.target.value })}
              aria-label="Sistema"
            >
              {SISTEMAS_11.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <MostrarFilialToggle />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_200px] gap-3 items-start">
          <div
            className="relative px-2 py-2.5 min-h-[220px] flex flex-col justify-between rounded-lg overflow-visible"
            style={{ background: 'linear-gradient(180deg, #1a6b2e 0%, #155a26 50%, #1a6b2e 100%)' }}
          >
            <div className="absolute inset-0 pointer-events-none rounded-lg overflow-hidden">
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/15 -translate-x-px" />
              <div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15" />
            </div>
            {layout.rows.map((row, i) => (
              <div
                key={i}
                className={cn(
                  'relative flex justify-center gap-1.5 flex-wrap',
                  row.some((s) => openSlot === s.slotKey) ? 'z-20' : 'z-10'
                )}
              >
                {row.map((slot) => {
                  const selected = titulares[slot.slotKey] || ''
                  const isLastRow = i === layout.rows.length - 1
                  return (
                    <div key={slot.slotKey} className="flex flex-col items-center gap-0.5 min-w-[76px] max-w-[110px]">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-white/70">
                        {slot.label}
                      </span>
                      <SlotPlayerSelect
                        slotLabel={slot.label}
                        selectedId={selected}
                        jugadores={active}
                        takenIds={titularIds}
                        dropUp={isLastRow}
                        open={openSlot === slot.slotKey}
                        onToggle={() => setOpenSlot((cur) => (cur === slot.slotKey ? null : slot.slotKey))}
                        onClose={() => setOpenSlot(null)}
                        onSelect={(id) => handleSlotSelect(slot.slotKey, id)}
                      />
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Suplentes
              {suplentes.length > 0 ? (
                <span className="ml-1 text-[10px] text-muted-foreground font-normal tabular-nums">
                  ({suplentes.length})
                </span>
              ) : null}
            </Label>
            {availableForSuplentes.length === 0 ? (
              <p className="text-[11px] text-muted-foreground italic">
                No hay jugadores disponibles
              </p>
            ) : (
              <div className="max-h-[220px] overflow-y-auto rounded-md border p-1.5 space-y-0.5">
                {availableForSuplentes.map((j) => {
                  const isSuplente = suplentes.includes(j.id)
                  return (
                    <label
                      key={j.id}
                      className={cn(
                        'flex items-center gap-1.5 text-[11px] px-1.5 py-1 rounded cursor-pointer',
                        isSuplente ? 'bg-blue-50 text-blue-800' : 'hover:bg-muted'
                      )}
                    >
                      <input
                        type="checkbox"
                        className="h-3 w-3 accent-blue-600"
                        checked={isSuplente}
                        onChange={() => handleToggleSuplente(j.id)}
                      />
                      <span className="truncate min-w-0">{playerLabel(j)}</span>
                      <span className="ml-auto text-[9px] text-muted-foreground shrink-0">
                        {j.posicion_principal}
                      </span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <Textarea
          rows={2}
          className="resize-none text-sm"
          placeholder="Notas del once, dudas, condicionantes físicos..."
          value={data.notas ?? ''}
          onChange={(e) => onChange({ ...data, notas: e.target.value })}
        />
      </CardContent>
    </Card>
  )
}
