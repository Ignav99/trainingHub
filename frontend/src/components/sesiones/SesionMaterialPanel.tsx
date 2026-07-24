'use client'

import { useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { MATERIALES } from '@/lib/catalogos/canonico'
import { cn } from '@/lib/utils'

export function SesionMaterialPanel({
  value,
  derivedFromTareas = [],
  onChange,
  className,
}: {
  value: string[]
  /** Materiales unidos desde tareas (solo lectura + merge) */
  derivedFromTareas?: string[]
  onChange: (next: string[]) => void
  className?: string
}) {
  const [draft, setDraft] = useState('')
  const merged = useMemo(() => {
    const set = new Set([...derivedFromTareas, ...value].map((m) => m.trim()).filter(Boolean))
    return Array.from(set)
  }, [derivedFromTareas, value])

  const toggle = (codigo: string) => {
    if (value.includes(codigo)) onChange(value.filter((v) => v !== codigo))
    else onChange([...value, codigo])
  }

  return (
    <section className={cn('rounded-2xl border bg-card p-4 sm:p-5 space-y-3', className)}>
      <div>
        <h3 className="text-sm font-semibold">Material</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Unión de materiales de las tareas + edición manual (filtrable en biblioteca).
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {MATERIALES.map((m) => {
          const on = value.includes(m.codigo) || derivedFromTareas.includes(m.codigo)
          return (
            <button
              key={m.codigo}
              type="button"
              onClick={() => toggle(m.codigo)}
              className={cn(
                'rounded-lg border px-2.5 py-1 text-xs',
                on
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-card text-muted-foreground hover:bg-muted'
              )}
            >
              {m.nombre}
            </button>
          )
        })}
      </div>
      {merged.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {merged.map((m) => (
            <span
              key={m}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
            >
              {m}
              {value.includes(m) && (
                <button type="button" onClick={() => onChange(value.filter((x) => x !== m))}>
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Material libre"
          className="h-8"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              const t = draft.trim()
              if (!t) return
              onChange([...value, t])
              setDraft('')
            }
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            const t = draft.trim()
            if (!t) return
            onChange([...value, t])
            setDraft('')
          }}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </section>
  )
}
