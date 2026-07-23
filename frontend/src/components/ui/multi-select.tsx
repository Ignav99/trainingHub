'use client'

/**
 * Selector múltiple con desplegable de casillas y chips debajo.
 * Lo usa el formulario "Crea tu ejercicio" para objetivos y contenidos.
 */

import * as React from 'react'
import { ChevronDown, X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface MultiSelectOption {
  codigo: string
  nombre: string
}

interface MultiSelectProps {
  options: readonly MultiSelectOption[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  className?: string
  /** Máximo de chips visibles antes de resumir */
  maxChips?: number
  disabled?: boolean
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  className,
  maxChips = 6,
  disabled = false,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  const toggle = (codigo: string) => {
    onChange(value.includes(codigo) ? value.filter((v) => v !== codigo) : [...value, codigo])
  }

  const nombreDe = (codigo: string) => options.find((o) => o.codigo === codigo)?.nombre || codigo
  const visibles = value.slice(0, maxChips)
  const resto = value.length - visibles.length

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm',
          'ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        <span className={cn('truncate', value.length === 0 && 'text-muted-foreground')}>
          {value.length === 0 ? placeholder : `${value.length} seleccionado${value.length > 1 ? 's' : ''}`}
        </span>
        <ChevronDown className={cn('h-4 w-4 opacity-50 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md">
          {options.map((opt) => {
            const checked = value.includes(opt.codigo)
            return (
              <button
                key={opt.codigo}
                type="button"
                onClick={() => toggle(opt.codigo)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent text-left"
              >
                <span
                  className={cn(
                    'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border',
                    checked ? 'bg-primary border-primary text-primary-foreground' : 'border-input',
                  )}
                >
                  {checked && <Check className="h-3 w-3" />}
                </span>
                <span className="truncate">{opt.nombre}</span>
              </button>
            )
          })}
        </div>
      )}

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {visibles.map((codigo) => (
            <span
              key={codigo}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-[11px] px-2 py-0.5"
            >
              {nombreDe(codigo)}
              <button
                type="button"
                onClick={() => toggle(codigo)}
                className="hover:text-primary/70"
                aria-label={`Quitar ${nombreDe(codigo)}`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
          {resto > 0 && (
            <span className="text-[11px] text-muted-foreground px-1 py-0.5">+{resto} más</span>
          )}
        </div>
      )}
    </div>
  )
}
