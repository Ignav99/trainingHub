'use client'

import { useState } from 'react'
import { X, Plus, ListChecks } from 'lucide-react'
import type { Jugador } from '@/types'
import type { ABPFuncionAsignada, DiagramElement } from '@/components/tarea-editor/types'

interface ABPFuncionesPanelProps {
  /** Plantilla real, para el picker por dorsal/nombre (mismo patrón que ABPPlayerAssigner). */
  jugadores: Jugador[]
  /** Elementos actuales del diagrama, para "asociar a" un movimiento/marcador concreto. */
  elementos: DiagramElement[]
  funciones: ABPFuncionAsignada[]
  onChange: (funciones: ABPFuncionAsignada[]) => void
  /**
   * Si se define, el picker de jugador se oculta y toda función nueva se crea
   * ya asignada a este jugador (uso: panel embebido para UN jugador ya
   * seleccionado en el tablero, en vez de una lista libre multi-jugador).
   */
  fixedJugador?: { jugadorId?: string; jugadorLabel: string }
  compact?: boolean
}

const jugadorLabel = (j: Jugador) => `${j.dorsal ? `${j.dorsal}. ` : ''}${j.nombre} ${j.apellidos || ''}`.trim()

export default function ABPFuncionesPanel({
  jugadores,
  elementos,
  funciones,
  onChange,
  fixedJugador,
  compact = false,
}: ABPFuncionesPanelProps) {
  const [jugadorIdInput, setJugadorIdInput] = useState('')
  const [funcionInput, setFuncionInput] = useState('')
  const [elementIdInput, setElementIdInput] = useState('')

  const handleAdd = () => {
    const funcion = funcionInput.trim()
    if (!funcion) return

    let jugadorId: string | undefined
    let label: string

    if (fixedJugador) {
      jugadorId = fixedJugador.jugadorId
      label = fixedJugador.jugadorLabel
    } else {
      const jugador = jugadores.find((j) => j.id === jugadorIdInput)
      if (!jugador) return
      jugadorId = jugador.id
      label = jugadorLabel(jugador)
    }

    onChange([
      ...funciones,
      {
        id: typeof crypto !== 'undefined' ? crypto.randomUUID() : Date.now().toString(),
        jugadorId,
        jugadorLabel: label,
        funcion,
        elementId: elementIdInput || undefined,
      },
    ])
    setFuncionInput('')
    setElementIdInput('')
    if (!fixedJugador) setJugadorIdInput('')
  }

  const handleRemove = (id: string) => {
    onChange(funciones.filter((f) => f.id !== id))
  }

  const elementLabel = (elementId?: string) => {
    if (!elementId) return null
    const el = elementos.find((e) => e.id === elementId)
    if (!el) return null
    return el.jugador || el.label || el.type
  }

  return (
    <div className={`space-y-2 ${compact ? '' : 'rounded-lg border bg-muted/20 p-3'}`}>
      {!compact && (
        <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
          <ListChecks className="h-3.5 w-3.5" />
          Funciones
        </p>
      )}

      <div className="flex flex-wrap gap-1.5 min-h-[24px]">
        {funciones.length === 0 ? (
          <span className="text-[10px] text-muted-foreground italic">Sin funciones asignadas</span>
        ) : (
          funciones.map((f) => {
            const linked = elementLabel(f.elementId)
            return (
              <span
                key={f.id}
                className="inline-flex items-center gap-1 pr-1 pl-2 py-0.5 bg-white border rounded text-[10px]"
              >
                <span className="font-medium text-primary">{f.jugadorLabel}</span>
                <span className="text-muted-foreground">·</span>
                <span>{f.funcion}</span>
                {linked && (
                  <>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-muted-foreground">{linked}</span>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(f.id)}
                  className="ml-0.5 rounded-sm hover:bg-muted p-0.5"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            )
          })
        )}
      </div>

      <div className="space-y-1.5">
        {!fixedJugador && (
          <select
            value={jugadorIdInput}
            onChange={(e) => setJugadorIdInput(e.target.value)}
            className="w-full px-1.5 py-1 text-[11px] border border-gray-200 rounded bg-white"
          >
            <option value="">Jugador (dorsal / nombre)...</option>
            {jugadores.map((j) => (
              <option key={j.id} value={j.id}>{jugadorLabel(j)}</option>
            ))}
          </select>
        )}

        <input
          type="text"
          value={funcionInput}
          onChange={(e) => setFuncionInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleAdd()
            }
          }}
          placeholder="Función (texto libre): bloquea, remata..."
          className="w-full px-1.5 py-1 text-[11px] border border-gray-200 rounded bg-white"
        />

        {elementos.length > 0 && (
          <select
            value={elementIdInput}
            onChange={(e) => setElementIdInput(e.target.value)}
            className="w-full px-1.5 py-1 text-[11px] border border-gray-200 rounded bg-white"
          >
            <option value="">Asociar a elemento (opcional)...</option>
            {elementos.map((el) => (
              <option key={el.id} value={el.id}>{el.jugador || el.label || el.type}</option>
            ))}
          </select>
        )}

        <button
          type="button"
          onClick={handleAdd}
          className="w-full flex items-center justify-center gap-1 px-2 py-1 text-[11px] font-medium border border-gray-200 rounded bg-white hover:bg-gray-50"
        >
          <Plus className="h-3 w-3" />
          Añadir función
        </button>
      </div>
    </div>
  )
}
