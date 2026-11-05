'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import type { Partido } from '@/types'

function etiqueta(partido: Partido): string {
  const rival = partido.rival?.nombre_corto || partido.rival?.nombre
  return [(partido.fecha || '').slice(0, 10), rival].filter(Boolean).join(' · ')
}

export function PartidosFiltro({
  partidos,
  value,
  onChange,
}: {
  partidos: Partido[]
  value: string[]
  onChange: (ids: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', close)
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('keydown', esc)
    }
  }, [open])

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id])
  }
  const unico = value.length === 1 ? partidos.find((p) => p.id === value[0]) : null
  const resumen = value.length === 0
    ? 'Todos los partidos'
    : unico
      ? etiqueta(unico)
      : `${value.length} partidos`

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Partidos"
        className="flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-background px-2 text-left text-sm"
      >
        <span className="truncate">{resumen}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-72 rounded-lg border bg-popover shadow-lg">
          <div className="flex items-center justify-between border-b px-3 py-2 text-xs text-muted-foreground">
            <span>Marca uno o varios</span>
            {value.length > 0 && (
              <button type="button" className="font-medium text-foreground hover:underline" onClick={() => onChange([])}>
                Quitar
              </button>
            )}
          </div>
          <ul className="max-h-72 overflow-y-auto p-1" role="listbox" aria-multiselectable="true">
            {partidos.map((partido) => {
              const on = value.includes(partido.id)
              return (
                <li key={partido.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={on}
                    onClick={() => toggle(partido.id)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                  >
                    <span className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${on ? 'border-primary bg-primary text-primary-foreground' : ''}`}>
                      {on ? <Check className="h-3 w-3" /> : null}
                    </span>
                    <span className="truncate">{etiqueta(partido)}</span>
                  </button>
                </li>
              )
            })}
            {partidos.length === 0 && <li className="px-2 py-1.5 text-sm text-muted-foreground">No hay partidos</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
