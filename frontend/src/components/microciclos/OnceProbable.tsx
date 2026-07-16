'use client'

import { Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { OnceProbableData, Jugador, Posicion } from '@/types'

interface OnceProbableProps {
  data: Partial<OnceProbableData>
  jugadores: Array<Pick<Jugador, 'id' | 'nombre' | 'apellidos' | 'apodo' | 'dorsal' | 'posicion_principal' | 'estado' | 'es_invitado' | 'tipo_jugador'>>
  onChange: (data: Partial<OnceProbableData>) => void
}

// ─── Formation layouts ────────────────────────────────────────────────────────

interface FormationSlot {
  slotKey: string
  label: Posicion | string
}

interface FormationLayout {
  rows: FormationSlot[][]
}

// Each inner array = one horizontal row rendered bottom-to-top (attack first in DOM, pitch logic bottom-to-top)
const FORMATION_LAYOUTS: Record<string, FormationLayout> = {
  '4-3-3': {
    rows: [
      [{ slotKey: 'pos_0', label: 'DC' }, { slotKey: 'pos_1', label: 'DC' }, { slotKey: 'pos_2', label: 'DC' }],
      [{ slotKey: 'pos_3', label: 'MC' }, { slotKey: 'pos_4', label: 'MC' }, { slotKey: 'pos_5', label: 'MC' }],
      [{ slotKey: 'pos_6', label: 'DFC' }, { slotKey: 'pos_7', label: 'DFC' }, { slotKey: 'pos_8', label: 'DFC' }, { slotKey: 'pos_9', label: 'DFC' }],
      [{ slotKey: 'pos_10', label: 'POR' }],
    ],
  },
  '4-4-2': {
    rows: [
      [{ slotKey: 'pos_0', label: 'DC' }, { slotKey: 'pos_1', label: 'DC' }],
      [{ slotKey: 'pos_2', label: 'MC' }, { slotKey: 'pos_3', label: 'MC' }, { slotKey: 'pos_4', label: 'MC' }, { slotKey: 'pos_5', label: 'MC' }],
      [{ slotKey: 'pos_6', label: 'DFC' }, { slotKey: 'pos_7', label: 'DFC' }, { slotKey: 'pos_8', label: 'DFC' }, { slotKey: 'pos_9', label: 'DFC' }],
      [{ slotKey: 'pos_10', label: 'POR' }],
    ],
  },
  '4-2-3-1': {
    rows: [
      [{ slotKey: 'pos_0', label: 'DC' }],
      [{ slotKey: 'pos_1', label: 'EXI' }, { slotKey: 'pos_2', label: 'MCO' }, { slotKey: 'pos_3', label: 'EXD' }],
      [{ slotKey: 'pos_4', label: 'MCD' }, { slotKey: 'pos_5', label: 'MCD' }],
      [{ slotKey: 'pos_6', label: 'LTI' }, { slotKey: 'pos_7', label: 'DFC' }, { slotKey: 'pos_8', label: 'DFC' }, { slotKey: 'pos_9', label: 'LTD' }],
      [{ slotKey: 'pos_10', label: 'POR' }],
    ],
  },
  '3-4-3': {
    rows: [
      [{ slotKey: 'pos_0', label: 'EXI' }, { slotKey: 'pos_1', label: 'DC' }, { slotKey: 'pos_2', label: 'EXD' }],
      [{ slotKey: 'pos_3', label: 'MII' }, { slotKey: 'pos_4', label: 'MC' }, { slotKey: 'pos_5', label: 'MC' }, { slotKey: 'pos_6', label: 'MID' }],
      [{ slotKey: 'pos_7', label: 'DFC' }, { slotKey: 'pos_8', label: 'DFC' }, { slotKey: 'pos_9', label: 'DFC' }],
      [{ slotKey: 'pos_10', label: 'POR' }],
    ],
  },
  '3-5-2': {
    rows: [
      [{ slotKey: 'pos_0', label: 'DC' }, { slotKey: 'pos_1', label: 'DC' }],
      [{ slotKey: 'pos_2', label: 'MII' }, { slotKey: 'pos_3', label: 'MC' }, { slotKey: 'pos_4', label: 'MC' }, { slotKey: 'pos_5', label: 'MC' }, { slotKey: 'pos_6', label: 'MID' }],
      [{ slotKey: 'pos_7', label: 'DFC' }, { slotKey: 'pos_8', label: 'DFC' }, { slotKey: 'pos_9', label: 'DFC' }],
      [{ slotKey: 'pos_10', label: 'POR' }],
    ],
  },
  '4-1-4-1': {
    rows: [
      [{ slotKey: 'pos_0', label: 'DC' }],
      [{ slotKey: 'pos_1', label: 'EXI' }, { slotKey: 'pos_2', label: 'MC' }, { slotKey: 'pos_3', label: 'MC' }, { slotKey: 'pos_4', label: 'EXD' }],
      [{ slotKey: 'pos_5', label: 'MCD' }],
      [{ slotKey: 'pos_6', label: 'LTI' }, { slotKey: 'pos_7', label: 'DFC' }, { slotKey: 'pos_8', label: 'DFC' }, { slotKey: 'pos_9', label: 'LTD' }],
      [{ slotKey: 'pos_10', label: 'POR' }],
    ],
  },
  '4-3-2-1': {
    rows: [
      [{ slotKey: 'pos_0', label: 'DC' }],
      [{ slotKey: 'pos_1', label: 'MCO' }, { slotKey: 'pos_2', label: 'MCO' }],
      [{ slotKey: 'pos_3', label: 'MC' }, { slotKey: 'pos_4', label: 'MCD' }, { slotKey: 'pos_5', label: 'MC' }],
      [{ slotKey: 'pos_6', label: 'LTI' }, { slotKey: 'pos_7', label: 'DFC' }, { slotKey: 'pos_8', label: 'DFC' }, { slotKey: 'pos_9', label: 'LTD' }],
      [{ slotKey: 'pos_10', label: 'POR' }],
    ],
  },
}

const FALLBACK_LAYOUT = FORMATION_LAYOUTS['4-4-2']

const SISTEMAS = ['4-3-3', '4-4-2', '4-2-3-1', '3-4-3', '3-5-2', '4-1-4-1', '4-3-2-1']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPlayerLabel(j: OnceProbableProps['jugadores'][number]): string {
  const name = j.apodo ?? `${j.nombre} ${j.apellidos}`
  return j.dorsal ? `${j.dorsal}. ${name}` : name
}

function getLayout(sistema: string | undefined): FormationLayout {
  return sistema ? (FORMATION_LAYOUTS[sistema] ?? FALLBACK_LAYOUT) : FALLBACK_LAYOUT
}

// ─── Sub-component: position slot ────────────────────────────────────────────

interface SlotProps {
  slot: FormationSlot
  jugadores: OnceProbableProps['jugadores']
  titulares: Record<string, string>
  onSelect: (slotKey: string, playerId: string) => void
}

function PositionSlot({ slot, jugadores, titulares, onSelect }: SlotProps) {
  const selectedId = titulares[slot.slotKey] ?? ''
  const active = jugadores.filter((j) => j.estado === 'activo' && (j.tipo_jugador ? j.tipo_jugador === 'plantilla' : !j.es_invitado))

  return (
    <div className="flex flex-col items-center gap-1 min-w-[72px]">
      <span className="text-[10px] font-bold text-white/70 tracking-widest uppercase">
        {slot.label}
      </span>
      <select
        value={selectedId}
        onChange={(e) => onSelect(slot.slotKey, e.target.value)}
        className="w-full text-[11px] rounded bg-white/10 border border-white/20 text-white placeholder-white/50 px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-white/40 max-w-[110px]"
      >
        <option value="">-- elige --</option>
        {active.map((j) => (
          <option key={j.id} value={j.id} className="text-black">
            {getPlayerLabel(j)}
          </option>
        ))}
      </select>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function OnceProbable({ data, jugadores, onChange }: OnceProbableProps) {
  const titulares = data.titulares ?? {}
  const suplentes = data.suplentes ?? []
  const sistema = data.sistema ?? '4-3-3'
  const layout = getLayout(sistema)

  // All 11 slot keys for this layout
  const allSlotKeys = layout.rows.flatMap((row) => row.map((s) => s.slotKey))
  const titularIds = new Set(allSlotKeys.map((k) => titulares[k]).filter(Boolean))

  const handleSlotSelect = (slotKey: string, playerId: string) => {
    const updated = { ...titulares }
    if (playerId === '') {
      delete updated[slotKey]
    } else {
      // Remove the player from any other slot (one player per slot)
      for (const k of Object.keys(updated)) {
        if (updated[k] === playerId && k !== slotKey) delete updated[k]
      }
      updated[slotKey] = playerId
    }
    // Remove from suplentes if now a titular
    const updatedSuplentes = suplentes.filter((id) => id !== playerId)
    onChange({ ...data, titulares: updated, suplentes: updatedSuplentes })
  }

  const handleToggleSuplente = (playerId: string) => {
    const isSuplente = suplentes.includes(playerId)
    const updatedSuplentes = isSuplente
      ? suplentes.filter((id) => id !== playerId)
      : [...suplentes, playerId]
    onChange({ ...data, suplentes: updatedSuplentes })
  }

  const handleSistemaChange = (value: string) => {
    // Reset titulares when formation changes since slot count/keys may differ
    onChange({ ...data, sistema: value, titulares: {} })
  }

  const availableForSuplentes = jugadores
    .filter((j) => j.estado === 'activo' && (j.tipo_jugador ? j.tipo_jugador === 'plantilla' : !j.es_invitado) && !titularIds.has(j.id))
    .sort((a, b) => getPlayerLabel(a).localeCompare(getPlayerLabel(b)))

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-muted-foreground" />
          Once Probable
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Sistema selector */}
        <div className="flex items-center gap-3">
          <Label className="text-sm font-medium shrink-0">Sistema</Label>
          <Select value={sistema} onValueChange={handleSistemaChange}>
            <SelectTrigger className="w-36 h-8 text-sm">
              <SelectValue placeholder="Seleccionar..." />
            </SelectTrigger>
            <SelectContent>
              {SISTEMAS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Formation pitch */}
        <div
          className="rounded-lg overflow-hidden min-h-[360px] flex flex-col"
          style={{ background: 'linear-gradient(180deg, #1a6b2e 0%, #155a26 50%, #1a6b2e 100%)' }}
        >
          {/* Pitch markings */}
          <div className="relative flex-1 px-6 py-8 flex flex-col justify-between">
            {/* Center circle hint */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-24 h-24 rounded-full border border-white/10" />
            </div>
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/10 -translate-x-px pointer-events-none" />

            {layout.rows.map((row, rowIndex) => (
              <div key={rowIndex} className="flex justify-center gap-4 flex-wrap relative z-10">
                {row.map((slot) => (
                  <PositionSlot
                    key={slot.slotKey}
                    slot={slot}
                    jugadores={jugadores}
                    titulares={titulares}
                    onSelect={handleSlotSelect}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Suplentes */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Suplentes
            {suplentes.length > 0 && (
              <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                ({suplentes.length} seleccionados)
              </span>
            )}
          </Label>

          {availableForSuplentes.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              No hay jugadores disponibles (todos en el once o sin activos)
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto rounded-md border p-2">
              {availableForSuplentes.map((j) => {
                const isSuplente = suplentes.includes(j.id)
                return (
                  <label
                    key={j.id}
                    className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded cursor-pointer transition-colors ${
                      isSuplente
                        ? 'bg-blue-50 text-blue-800'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 accent-blue-600"
                      checked={isSuplente}
                      onChange={() => handleToggleSuplente(j.id)}
                    />
                    <span className="truncate">{getPlayerLabel(j)}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground shrink-0">
                      {j.posicion_principal}
                    </span>
                  </label>
                )
              })}
            </div>
          )}
        </div>

        {/* Notas */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Notas</Label>
          <Textarea
            rows={2}
            className="resize-none text-sm"
            placeholder="Notas sobre el once, dudas de última hora, condicionantes físicos..."
            value={data.notas ?? ''}
            onChange={(e) => onChange({ ...data, notas: e.target.value })}
          />
        </div>
      </CardContent>
    </Card>
  )
}
