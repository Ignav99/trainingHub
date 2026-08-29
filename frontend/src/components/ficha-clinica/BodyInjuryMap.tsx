'use client'

import { useMemo, useState, type KeyboardEvent } from 'react'
import { BODY_REGIONS, regionLabel, zonaIds, type BodyView } from '@/lib/bodyRegions'
import { cn } from '@/lib/utils'

const IDLE = '#D7E0EA'
const HOVER = '#F3C4B8'
const ACTIVE = '#C23B22'
const STROKE = '#16324F'

type Shape = { id: string; d?: string; cx?: number; cy?: number; rx?: number; ry?: number }

const ANTERIOR: Shape[] = [
  { id: 'cabeza', cx: 100, cy: 28, rx: 16, ry: 18 },
  { id: 'cuello', cx: 100, cy: 48, rx: 8, ry: 7 },
  { id: 'hombro_i', cx: 72, cy: 62, rx: 14, ry: 10 },
  { id: 'hombro_d', cx: 128, cy: 62, rx: 14, ry: 10 },
  { id: 'pectoral', cx: 100, cy: 78, rx: 26, ry: 14 },
  { id: 'biceps_i', cx: 58, cy: 92, rx: 8, ry: 18 },
  { id: 'biceps_d', cx: 142, cy: 92, rx: 8, ry: 18 },
  { id: 'antebrazo_i', cx: 50, cy: 124, rx: 7, ry: 16 },
  { id: 'antebrazo_d', cx: 150, cy: 124, rx: 7, ry: 16 },
  { id: 'muneca_i', cx: 46, cy: 144, rx: 6, ry: 6 },
  { id: 'muneca_d', cx: 154, cy: 144, rx: 6, ry: 6 },
  { id: 'abdomen', cx: 100, cy: 112, rx: 22, ry: 22 },
  { id: 'ingle_i', cx: 88, cy: 140, rx: 10, ry: 8 },
  { id: 'ingle_d', cx: 112, cy: 140, rx: 10, ry: 8 },
  { id: 'cuadriceps_i', cx: 86, cy: 178, rx: 12, ry: 28 },
  { id: 'cuadriceps_d', cx: 114, cy: 178, rx: 12, ry: 28 },
  { id: 'rodilla_i', cx: 86, cy: 212, rx: 10, ry: 8 },
  { id: 'rodilla_d', cx: 114, cy: 212, rx: 10, ry: 8 },
  { id: 'tibial_i', cx: 86, cy: 246, rx: 9, ry: 24 },
  { id: 'tibial_d', cx: 114, cy: 246, rx: 9, ry: 24 },
  { id: 'tobillo_i', cx: 86, cy: 274, rx: 7, ry: 6 },
  { id: 'tobillo_d', cx: 114, cy: 274, rx: 7, ry: 6 },
  { id: 'pie_i', cx: 80, cy: 288, rx: 14, ry: 6 },
  { id: 'pie_d', cx: 120, cy: 288, rx: 14, ry: 6 },
]

const POSTERIOR: Shape[] = [
  { id: 'cervical', cx: 100, cy: 42, rx: 8, ry: 8 },
  { id: 'trapecio', cx: 100, cy: 62, rx: 28, ry: 12 },
  { id: 'hombro_post_i', cx: 70, cy: 62, rx: 12, ry: 10 },
  { id: 'hombro_post_d', cx: 130, cy: 62, rx: 12, ry: 10 },
  { id: 'dorsal', cx: 100, cy: 92, rx: 24, ry: 20 },
  { id: 'codo_i', cx: 52, cy: 118, rx: 7, ry: 7 },
  { id: 'codo_d', cx: 148, cy: 118, rx: 7, ry: 7 },
  { id: 'lumbar', cx: 100, cy: 122, rx: 18, ry: 12 },
  { id: 'gluteo_i', cx: 88, cy: 148, rx: 14, ry: 12 },
  { id: 'gluteo_d', cx: 112, cy: 148, rx: 14, ry: 12 },
  { id: 'isquios_i', cx: 86, cy: 186, rx: 12, ry: 26 },
  { id: 'isquios_d', cx: 114, cy: 186, rx: 12, ry: 26 },
  { id: 'gemelo_i', cx: 86, cy: 238, rx: 10, ry: 22 },
  { id: 'gemelo_d', cx: 114, cy: 238, rx: 10, ry: 22 },
  { id: 'aquiles_i', cx: 86, cy: 268, rx: 6, ry: 8 },
  { id: 'aquiles_d', cx: 114, cy: 268, rx: 6, ry: 8 },
]

function Figure({
  shapes,
  selected,
  hover,
  onToggle,
  onHover,
  readOnly,
}: {
  shapes: Shape[]
  selected: Set<string>
  hover: string | null
  onToggle: (id: string) => void
  onHover: (id: string | null) => void
  readOnly?: boolean
}) {
  return (
    <svg viewBox="0 0 200 310" className="h-[320px] w-auto max-w-full" aria-hidden={false} role="img">
      <ellipse cx="100" cy="28" rx="18" ry="20" fill="none" stroke={STROKE} strokeWidth="1.2" opacity="0.25" />
      {shapes.map((s) => {
        const on = selected.has(s.id)
        const over = hover === s.id
        const fill = on ? ACTIVE : over ? HOVER : IDLE
        const common = {
          key: s.id,
          fill,
          stroke: STROKE,
          strokeWidth: on ? 1.6 : 1,
          className: cn('transition-colors duration-150', readOnly ? 'cursor-default' : 'cursor-pointer'),
          onMouseEnter: () => onHover(s.id),
          onMouseLeave: () => onHover(null),
          onClick: () => {
            if (!readOnly) onToggle(s.id)
          },
          onKeyDown: (e: KeyboardEvent) => {
            if (readOnly) return
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onToggle(s.id)
            }
          },
          tabIndex: readOnly ? -1 : 0,
          role: 'button' as const,
          'aria-pressed': on,
          'aria-label': regionLabel(s.id),
        }
        if (s.d) {
          return <path d={s.d} {...common} />
        }
        return <ellipse cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} {...common} />
      })}
    </svg>
  )
}

export function BodyInjuryMap({
  value,
  onChange,
  readOnly,
}: {
  value: unknown
  onChange?: (zonas: string[]) => void
  readOnly?: boolean
}) {
  const selected = useMemo(() => new Set(zonaIds(value)), [value])
  const [view, setView] = useState<BodyView>('anterior')
  const [hover, setHover] = useState<string | null>(null)

  const toggle = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange?.(Array.from(next))
  }

  const labels = Array.from(selected).map(regionLabel)
  const shapes = view === 'anterior' ? ANTERIOR : POSTERIOR

  return (
    <div className="rounded-xl border border-slate-200 bg-[#F7F5F0] p-3">
      <div className="mb-2 flex gap-1 rounded-md bg-[#16324F] p-0.5">
        {(['anterior', 'posterior'] as BodyView[]).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={cn(
              'flex-1 rounded px-2 py-1 text-xs font-medium',
              view === v ? 'bg-white text-[#16324F]' : 'text-white/80 hover:text-white',
            )}
          >
            {v === 'anterior' ? 'Frente' : 'Espalda'}
          </button>
        ))}
      </div>
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
        <Figure
          shapes={shapes}
          selected={selected}
          hover={hover}
          onToggle={toggle}
          onHover={setHover}
          readOnly={readOnly}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {readOnly ? 'Zonas marcadas' : 'Pulsa el músculo o la zona'}
          </p>
          {hover ? (
            <p className="mt-1 text-sm font-medium text-[#16324F]">{regionLabel(hover)}</p>
          ) : (
            <p className="mt-1 text-sm text-slate-500">
              {labels.length ? labels.join(' · ') : 'Ninguna zona'}
            </p>
          )}
          {!readOnly ? (
            <ul className="mt-3 grid grid-cols-1 gap-1 text-[11px] text-slate-600">
              {BODY_REGIONS.filter((r) => r.view === view).map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => toggle(r.id)}
                    className={cn(
                      'w-full rounded px-2 py-1 text-left',
                      selected.has(r.id) ? 'bg-[#C23B22] text-white' : 'hover:bg-white',
                    )}
                  >
                    {r.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  )
}
