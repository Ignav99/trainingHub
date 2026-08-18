'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { Flag, Loader2, Plus, Trash2, X } from 'lucide-react'
import Link from 'next/link'
import { apiFetcher, apiKey } from '@/lib/swr'
import type { ABPJugada } from '@/types'
import { ABP_TIPOS } from '@/types'
import { Button } from '@/components/ui/button'
import ABPPlayCard from '@/components/abp/ABPPlayCard'

interface PartidoAbpPickerProps {
  equipoId?: string
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

export function PartidoAbpPicker({ equipoId, selectedIds, onChange }: PartidoAbpPickerProps) {
  const [open, setOpen] = useState(false)
  const libraryKey = apiKey('/abp', { equipo_id: equipoId }, ['equipo_id'])
  const { data, isLoading } = useSWR<{ data: ABPJugada[] }>(
    libraryKey,
    apiFetcher
  )
  const library: ABPJugada[] = data?.data || []
  const linked = useMemo(
    () => library.filter((j) => selectedIds.includes(j.id)),
    [library, selectedIds]
  )
  const available = useMemo(
    () => library.filter((j) => !selectedIds.includes(j.id)),
    [library, selectedIds]
  )

  if (!equipoId) {
    return (
      <p className="text-xs text-muted-foreground">
        Asigna un equipo a la sesión para vincular jugadas ABP a este partido.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium text-muted-foreground">Jugadas ABP del partido</p>
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setOpen(true)}>
          <Plus className="h-3 w-3 mr-1" /> Vincular ABP
        </Button>
      </div>
      {isLoading ? (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Cargando biblioteca ABP…
        </div>
      ) : linked.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Ninguna jugada vinculada. El partido reducido (SSG) sigue siendo una tarea; aquí solo van
          las jugadas a ejecutar en el 11 vs 11.
        </p>
      ) : (
        <ul className="space-y-1">
          {linked.map((j) => {
            const tipo = ABP_TIPOS.find((t) => t.value === j.tipo)
            return (
              <li
                key={j.id}
                className="flex items-center gap-2 rounded-md border bg-background px-2 py-1.5"
              >
                <Flag className="h-3.5 w-3.5 text-orange-600 shrink-0" />
                <span className="text-xs font-medium truncate flex-1">{j.nombre}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">{tipo?.label}</span>
                <button
                  type="button"
                  className="p-0.5 text-muted-foreground hover:text-destructive"
                  onClick={() => onChange(selectedIds.filter((id) => id !== j.id))}
                  title="Desvincular"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-background rounded-2xl shadow-2xl w-[min(96vw,960px)] h-[min(88vh,720px)] flex flex-col overflow-hidden border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 px-5 py-3 border-b">
              <div>
                <h2 className="text-base font-semibold">Vincular jugada ABP al partido</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Estas jugadas quedan en este bloque, no como tarea aparte.
                </p>
              </div>
              <button
                type="button"
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted"
                onClick={() => setOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {available.length === 0 ? (
                <div className="text-center py-16 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">No hay jugadas disponibles</p>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/abp">Ir al laboratorio ABP</Link>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {available.map((j) => (
                    <ABPPlayCard
                      key={j.id}
                      jugada={j}
                      onClick={() => {
                        onChange([...selectedIds, j.id])
                        setOpen(false)
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
