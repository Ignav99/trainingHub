'use client'

import { useCallback, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Pencil, Shirt } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { TacticalBoardMini } from '@/components/task-preview'
import TacticalBoardEditor from '@/components/tactical-board/TacticalBoardEditor'
import { useTacticalBoardStore } from '@/stores/useTacticalBoardStore'
import { emptyPartido } from '@/lib/sesionEstructura'
import { cargaPartidoCondicionado, countAlineados } from '@/lib/partidoCarga'
import { formacionSlotKeys } from '@/lib/formaciones11'
import { canonicalPosicion } from '@/lib/api/jugadores'
import type { PartidoCondicionadoData, SesionBloque } from '@/types'
import { cn } from '@/lib/utils'
import { PartidoAbpPicker } from './PartidoAbpPicker'
import { PartidoOncePitch, playerLabel, type PartidoJugador } from './PartidoOncePitch'

interface PartidoCondicionadoPanelProps {
  bloque: SesionBloque
  jugadores: PartidoJugador[]
  equipoId?: string
  onChange: (patch: Partial<SesionBloque>) => void
}

export function PartidoCondicionadoPanel({
  bloque,
  jugadores,
  equipoId,
  onChange,
}: PartidoCondicionadoPanelProps) {
  const partido: PartidoCondicionadoData = bloque.partido || emptyPartido(bloque.duracion_objetivo || 20)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [boardEditing, setBoardEditing] = useState(false)

  const duracion = partido.duracion_min || bloque.duracion_objetivo || 20
  const nAlineados = countAlineados(partido.equipo_peto, partido.equipo_sin_peto)
  const carga = cargaPartidoCondicionado(duracion)

  const takenIds = useMemo(() => {
    const ids = new Set<string>()
    for (const id of Object.values(partido.equipo_peto || {})) if (id) ids.add(id)
    for (const id of Object.values(partido.equipo_sin_peto || {})) if (id) ids.add(id)
    for (const id of partido.fuera || []) if (id) ids.add(id)
    return ids
  }, [partido.equipo_peto, partido.equipo_sin_peto, partido.fuera])

  const patchPartido = useCallback(
    (next: Partial<PartidoCondicionadoData>) => {
      const merged = { ...partido, ...next }
      onChange({
        partido: merged,
        duracion_objetivo: merged.duracion_min,
      })
    },
    [onChange, partido]
  )

  const assignSlot = (
    side: 'equipo_peto' | 'equipo_sin_peto',
    slotKey: string,
    jugadorId: string
  ) => {
    const otherSide = side === 'equipo_peto' ? 'equipo_sin_peto' : 'equipo_peto'
    const updated = { ...partido[side] }
    if (!jugadorId) {
      delete updated[slotKey]
    } else {
      for (const k of Object.keys(updated)) {
        if (updated[k] === jugadorId && k !== slotKey) delete updated[k]
      }
      const other = { ...partido[otherSide] }
      for (const k of Object.keys(other)) {
        if (other[k] === jugadorId) delete other[k]
      }
      updated[slotKey] = jugadorId
      patchPartido({
        [side]: updated,
        [otherSide]: other,
        fuera: (partido.fuera || []).filter((id) => id !== jugadorId),
      } as Partial<PartidoCondicionadoData>)
      return
    }
    patchPartido({ [side]: updated } as Partial<PartidoCondicionadoData>)
  }

  const changeSistema = (side: 'sistema_peto' | 'sistema_sin_peto', sistema: string) => {
    const equipoKey = side === 'sistema_peto' ? 'equipo_peto' : 'equipo_sin_peto'
    const valid = new Set(formacionSlotKeys(sistema))
    const filtered: Record<string, string> = {}
    for (const [k, v] of Object.entries(partido[equipoKey] || {})) {
      if (valid.has(k) && v) filtered[k] = v
    }
    patchPartido({ [side]: sistema, [equipoKey]: filtered } as Partial<PartidoCondicionadoData>)
  }

  const toggleFuera = (jugadorId: string) => {
    const isFuera = (partido.fuera || []).includes(jugadorId)
    if (isFuera) {
      patchPartido({ fuera: (partido.fuera || []).filter((id) => id !== jugadorId) })
      return
    }
    const peto = { ...partido.equipo_peto }
    const sin = { ...partido.equipo_sin_peto }
    for (const k of Object.keys(peto)) if (peto[k] === jugadorId) delete peto[k]
    for (const k of Object.keys(sin)) if (sin[k] === jugadorId) delete sin[k]
    patchPartido({
      equipo_peto: peto,
      equipo_sin_peto: sin,
      fuera: [...(partido.fuera || []), jugadorId],
    })
  }

  const disponiblesFuera = jugadores.filter(
    (j) =>
      !Object.values(partido.equipo_peto || {}).includes(j.id) &&
      !Object.values(partido.equipo_sin_peto || {}).includes(j.id)
  )

  const handleOpenBoard = () => {
    const grafico = (partido.pizarra || {}) as any
    useTacticalBoardStore.getState().loadBoard({
      id: null,
      nombre: 'Partido condicionado',
      descripcion: partido.objetivo || '',
      tipo: grafico?.tipo || 'static',
      pitch_type: grafico?.pitchType || 'full',
      elements: grafico?.elements || [],
      arrows: grafico?.arrows || [],
      zones: grafico?.zones || [],
      frames: grafico?.frames || [],
    })
    setBoardEditing(true)
  }

  const handleBoardSave = () => {
    const s = useTacticalBoardStore.getState()
    if (s.tipo === 'animated') s.saveCurrentToKeyframe()
    const frames = useTacticalBoardStore.getState().keyframes
    patchPartido({
      pizarra: {
        pitchType: s.pitchType,
        tipo: s.tipo,
        elements: s.elements,
        arrows: s.arrows,
        zones: s.zones,
        ...(s.tipo === 'animated' && frames.length > 0 ? { frames } : {}),
      },
    })
    setBoardEditing(false)
    useTacticalBoardStore.getState().reset()
  }

  return (
    <div className="p-3 space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-[11px] font-medium text-muted-foreground mb-1">Minutos</label>
          <Input
            type="number"
            min={1}
            max={90}
            className="h-8 w-20 text-sm tabular-nums"
            value={duracion}
            onChange={(e) => {
              const v = Math.max(1, parseInt(e.target.value, 10) || 0)
              patchPartido({ duracion_min: v })
            }}
          />
        </div>
        <div className="rounded-md border bg-muted/40 px-3 py-1.5 min-w-[8rem]">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Carga PCO</p>
          <p className="text-lg font-semibold tabular-nums leading-tight">{carga}</p>
        </div>
        <p className="text-xs text-muted-foreground pb-1">
          Partido de entreno (no competición) · {nAlineados || 0} alineados
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] font-medium text-muted-foreground mb-1">
            Objetivo del partido
          </label>
          <Textarea
            className="resize-none text-xs min-h-[56px]"
            placeholder="Qué se va a trabajar (presión alta, salida, amplitud…)"
            value={partido.objetivo || ''}
            onChange={(e) => patchPartido({ objetivo: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-muted-foreground mb-1">
            Normas / condicionantes
          </label>
          <Textarea
            className="resize-none text-xs min-h-[56px]"
            placeholder="Si hay normas: gol solo de centro, 3 toques, fuera de juego…"
            value={partido.normas || ''}
            onChange={(e) => patchPartido({ normas: e.target.value })}
          />
        </div>
      </div>

      {jugadores.length === 0 ? (
        <p className="text-xs text-muted-foreground rounded-md border border-dashed px-3 py-2">
          Completa la convocatoria para poner nombres por posición (con peto / sin peto).
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <PartidoOncePitch
            title="Con peto"
            bib="peto"
            sistema={partido.sistema_peto}
            titulares={partido.equipo_peto}
            jugadores={jugadores}
            takenIds={takenIds}
            onSistemaChange={(s) => changeSistema('sistema_peto', s)}
            onSelect={(slot, id) => assignSlot('equipo_peto', slot, id)}
          />
          <PartidoOncePitch
            title="Sin peto"
            bib="sin_peto"
            sistema={partido.sistema_sin_peto}
            titulares={partido.equipo_sin_peto}
            jugadores={jugadores}
            takenIds={takenIds}
            onSistemaChange={(s) => changeSistema('sistema_sin_peto', s)}
            onSelect={(slot, id) => assignSlot('equipo_sin_peto', slot, id)}
          />
        </div>
      )}

      {jugadores.length > 0 && (
        <div>
          <p className="text-[11px] font-medium text-muted-foreground mb-1">
            Fuera del 11 vs 11
            {(partido.fuera || []).length > 0 && (
              <span className="ml-1 tabular-nums">({partido.fuera.length})</span>
            )}
          </p>
          {disponiblesFuera.length === 0 && (partido.fuera || []).length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Todos están alineados.</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {disponiblesFuera.map((j) => {
                const marcado = (partido.fuera || []).includes(j.id)
                return (
                  <button
                    key={j.id}
                    type="button"
                    onClick={() => toggleFuera(j.id)}
                    className={cn(
                      'rounded-md border px-2 py-0.5 text-[11px] transition-colors',
                      marcado
                        ? 'border-slate-400 bg-slate-100 text-slate-800'
                        : 'hover:bg-muted text-muted-foreground'
                    )}
                  >
                    {playerLabel(j)}
                    {j.posicion_principal ? ` · ${canonicalPosicion(j.posicion_principal)}` : ''}
                    {marcado ? ' · fuera' : ''}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setDetailsOpen((o) => !o)}
        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
      >
        {detailsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {detailsOpen ? 'Ocultar pizarra y ABP' : 'Pizarra táctica y jugadas ABP'}
      </button>

      {detailsOpen && (
        <div className="space-y-3 border-t pt-3">
          <button
            type="button"
            onClick={handleOpenBoard}
            className="group relative overflow-hidden rounded-lg border bg-[#1a3a0a] text-left w-full max-w-md"
          >
            <div className="absolute top-2 left-2 z-10 rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              Pizarra
            </div>
            <div className="relative w-full" style={{ paddingBottom: '48%' }}>
              <div className="absolute inset-0">
                <TacticalBoardMini
                  data={partido.pizarra as any}
                  width="100%"
                  height="100%"
                  animate={false}
                  showPlayBadge={false}
                />
              </div>
            </div>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity group-hover:bg-black/25 group-hover:opacity-100">
              <span className="inline-flex items-center gap-1 rounded-md bg-black/50 px-2.5 py-1 text-xs font-medium text-white">
                <Pencil className="h-3 w-3" /> Editar pizarra
              </span>
            </div>
          </button>
          <PartidoAbpPicker
            equipoId={equipoId}
            selectedIds={partido.abp_ids || []}
            onChange={(ids) => patchPartido({ abp_ids: ids })}
          />
        </div>
      )}

      {boardEditing && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          <TacticalBoardEditor
            onSave={handleBoardSave}
            onCancel={() => {
              setBoardEditing(false)
              useTacticalBoardStore.getState().reset()
            }}
          />
        </div>
      )}

      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
        <Shirt className="h-3 w-3" />
        Un partido reducido (espacios y n.º de jugadores) se añade como tarea. Este bloque es el 11 vs 11.
      </p>
    </div>
  )
}
