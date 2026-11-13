'use client'

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { MiembroStaff } from '@/types'
import {
  aTokens,
  desdeTokens,
  nombreVisible,
  normalizar,
  ROL_LABEL,
  type MencionElegida,
} from './tablero-utils'

export interface MentionDraft {
  texto: string
  elegidas: MencionElegida[]
}

export function draftDesde(contenido = ''): MentionDraft {
  return desdeTokens(contenido)
}

export function serializar(d: MentionDraft): string {
  return aTokens(d.texto.trim(), d.elegidas)
}

interface Consulta {
  inicio: number
  texto: string
}

function consultaEnCursor(texto: string, cursor: number): Consulta | null {
  const antes = texto.slice(0, cursor)
  const at = antes.lastIndexOf('@')
  if (at < 0) return null
  if (at > 0 && !/\s|[(¿¡"']/.test(antes[at - 1])) return null
  const q = antes.slice(at + 1)
  if (q.length > 30 || /[\n@]/.test(q) || /\s{2}/.test(q)) return null
  return { inicio: at, texto: q }
}

export function MentionTextarea({
  value,
  onChange,
  miembros,
  meId,
  placeholder,
  rows = 3,
  autoFocus,
  disabled,
  onSubmit,
  className,
  ariaLabel,
}: {
  value: MentionDraft
  onChange: (d: MentionDraft) => void
  miembros: MiembroStaff[]
  meId?: string
  placeholder?: string
  rows?: number
  autoFocus?: boolean
  disabled?: boolean
  onSubmit?: () => void
  className?: string
  ariaLabel?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const listId = useId()
  const [consulta, setConsulta] = useState<Consulta | null>(null)
  const [activo, setActivo] = useState(0)

  const candidatos = useMemo(() => {
    if (!consulta) return []
    const q = normalizar(consulta.texto.trim())
    return miembros
      .filter((m) => m.id !== meId)
      .filter((m) => {
        if (!q) return true
        const completo = normalizar(`${m.nombre} ${m.apellidos}`)
        const rol = normalizar(ROL_LABEL[m.rol_en_equipo || ''] || '')
        return [completo, rol].some((t) => t.startsWith(q) || t.split(/\s+/).some((p) => p.startsWith(q)))
      })
  }, [consulta, miembros, meId])

  const listaRef = useRef<HTMLUListElement>(null)
  useEffect(() => {
    listaRef.current?.children[activo]?.scrollIntoView({ block: 'nearest' })
  }, [activo])

  const abierto = consulta !== null && candidatos.length > 0

  const actualizarConsulta = useCallback((texto: string, cursor: number) => {
    const c = consultaEnCursor(texto, cursor)
    setConsulta(c)
    setActivo(0)
  }, [])

  const elegir = useCallback(
    (m: MiembroStaff) => {
      const el = ref.current
      if (!el || !consulta) return
      const nombre = nombreVisible(m)
      const cursor = el.selectionStart ?? value.texto.length
      const texto = `${value.texto.slice(0, consulta.inicio)}@${nombre} ${value.texto.slice(cursor)}`
      const elegidas = value.elegidas.some((e) => e.id === m.id.toLowerCase())
        ? value.elegidas
        : [...value.elegidas, { id: m.id.toLowerCase(), nombre }]
      onChange({ texto, elegidas })
      setConsulta(null)
      const pos = consulta.inicio + nombre.length + 2
      requestAnimationFrame(() => {
        el.focus()
        el.setSelectionRange(pos, pos)
      })
    },
    [consulta, onChange, value]
  )

  return (
    <div className={cn('relative', className)}>
      <textarea
        ref={ref}
        value={value.texto}
        rows={rows}
        autoFocus={autoFocus}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel}
        role="combobox"
        aria-expanded={abierto}
        aria-controls={abierto ? listId : undefined}
        aria-autocomplete="list"
        className="flex w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--club-primary))] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px]"
        onChange={(e) => {
          onChange({ ...value, texto: e.target.value })
          actualizarConsulta(e.target.value, e.target.selectionStart ?? e.target.value.length)
        }}
        onClick={(e) => actualizarConsulta(value.texto, e.currentTarget.selectionStart ?? 0)}
        onBlur={() => setTimeout(() => setConsulta(null), 120)}
        onKeyDown={(e) => {
          if (abierto) {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActivo((i) => (i + 1) % candidatos.length)
              return
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActivo((i) => (i - 1 + candidatos.length) % candidatos.length)
              return
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
              e.preventDefault()
              elegir(candidatos[activo])
              return
            }
            if (e.key === 'Escape') {
              e.preventDefault()
              e.stopPropagation()
              setConsulta(null)
              return
            }
          }
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && onSubmit) {
            e.preventDefault()
            onSubmit()
          }
        }}
      />
      {abierto && (
        <ul
          ref={listaRef}
          id={listId}
          role="listbox"
          className="absolute left-0 top-full z-50 mt-1 max-h-64 w-full max-w-xs overflow-y-auto overscroll-contain rounded-lg border bg-popover p-1 shadow-lg [html[data-appearance=cal]_&]:shadow-none animate-in fade-in-0 slide-in-from-top-1"
        >
          {candidatos.map((m, i) => (
            <li
              key={m.id}
              role="option"
              aria-selected={i === activo}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm',
                i === activo ? 'bg-muted' : 'hover:bg-muted/60'
              )}
              onMouseDown={(e) => {
                e.preventDefault()
                elegir(m)
              }}
              onMouseEnter={() => setActivo(i)}
            >
              <Avatar src={m.avatar_url} fallback={(m.nombre || '?')[0]} size="sm" className="h-6 w-6 text-[10px]" />
              <span className="min-w-0 flex-1 truncate font-medium">
                {m.nombre} {m.apellidos}
              </span>
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {ROL_LABEL[m.rol_en_equipo || ''] || ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
