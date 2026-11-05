'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

export interface MultiFiltroOpcion {
  id: string
  label: string
  /** Subelemento (subfase): va sangrado bajo su padre. */
  hija?: boolean
}

export function MultiFiltro({
  opciones,
  value,
  onChange,
  todos,
  plural,
  ariaLabel,
}: {
  opciones: MultiFiltroOpcion[]
  value: string[]
  onChange: (ids: string[]) => void
  todos: string
  plural: string
  ariaLabel: string
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
  const unico = value.length === 1 ? opciones.find((o) => o.id === value[0]) : null
  const resumen = value.length === 0
    ? todos
    : unico
      ? unico.label
      : `${value.length} ${plural}`

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={ariaLabel}
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
            {opciones.map((opcion) => {
              const on = value.includes(opcion.id)
              return (
                <li key={opcion.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={on}
                    onClick={() => toggle(opcion.id)}
                    className={`flex w-full items-center gap-2 rounded-md py-1.5 pr-2 text-left text-sm hover:bg-muted ${opcion.hija ? 'pl-7 text-muted-foreground' : 'pl-2 font-medium'}`}
                  >
                    <span className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${on ? 'border-primary bg-primary text-primary-foreground' : ''}`}>
                      {on ? <Check className="h-3 w-3" /> : null}
                    </span>
                    <span className="truncate">{opcion.label}</span>
                  </button>
                </li>
              )
            })}
            {opciones.length === 0 && <li className="px-2 py-1.5 text-sm text-muted-foreground">Nada que elegir</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
