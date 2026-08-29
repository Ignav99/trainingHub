'use client'

import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { MUSCLE_CATALOG, regionLabel, zonaIds } from '@/lib/bodyRegions'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const GROUPS = Array.from(new Set(MUSCLE_CATALOG.map((m) => m.group)))

export function MusclePicker({
  value,
  onChange,
  readOnly,
}: {
  value: unknown
  onChange?: (zonas: string[]) => void
  readOnly?: boolean
}) {
  const selected = useMemo(() => zonaIds(value), [value])
  const [query, setQuery] = useState('')
  const [custom, setCustom] = useState('')

  const q = query.trim().toLowerCase()
  const filtered = q
    ? MUSCLE_CATALOG.filter((m) => m.label.toLowerCase().includes(q) || m.group.toLowerCase().includes(q))
    : MUSCLE_CATALOG

  const toggle = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange?.(Array.from(next))
  }

  const addCustom = () => {
    const label = custom.trim()
    if (!label) return
    const id = `otro:${label}`
    if (!selected.includes(id)) onChange?.([...selected, id])
    setCustom('')
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-[#F7F5F0] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {readOnly ? 'Estructura / músculo' : 'Elige músculo o estructura'}
      </p>
      {selected.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-md bg-[#C23B22] px-2 py-0.5 text-[11px] text-white"
            >
              {regionLabel(id)}
              {!readOnly ? (
                <button type="button" onClick={() => toggle(id)} className="hover:text-white/70" aria-label="Quitar">
                  <X className="h-3 w-3" />
                </button>
              ) : null}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-slate-500">Ninguna zona</p>
      )}

      {!readOnly ? (
        <>
          <Input
            className="mt-3 bg-white"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar: bíceps femoral, LCA, aquiles…"
          />
          <div className="mt-3 max-h-56 overflow-y-auto rounded-md border border-slate-200 bg-white">
            {GROUPS.map((group) => {
              const items = filtered.filter((m) => m.group === group)
              if (!items.length) return null
              return (
                <div key={group} className="border-b border-slate-100 last:border-b-0">
                  <p className="bg-slate-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    {group}
                  </p>
                  <ul>
                    {items.map((m) => (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => toggle(m.id)}
                          className={cn(
                            'w-full px-2 py-1.5 text-left text-sm',
                            selected.includes(m.id) ? 'bg-[#C23B22] text-white' : 'hover:bg-slate-50',
                          )}
                        >
                          {m.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
          <div className="mt-2 flex gap-2">
            <Input
              className="bg-white"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Otro músculo o estructura…"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addCustom()
                }
              }}
            />
            <button
              type="button"
              onClick={addCustom}
              className="shrink-0 rounded-md border border-slate-200 bg-white px-3 text-sm text-[#16324F]"
            >
              Añadir
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}

/** Compat: el mapa esquemático se sustituyó por el listado de músculos. */
export const BodyInjuryMap = MusclePicker
