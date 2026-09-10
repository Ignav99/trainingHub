'use client'

import { useEffect, useState } from 'react'
import { Calendar, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'

const STORAGE_KEY = 'th-partidos-list-collapsed'

export function usePartidosListCollapsed() {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === '1')
    } catch {
      /* ignore */
    }
  }, [])

  const toggle = (next?: boolean) => {
    setCollapsed((prev) => {
      const value = typeof next === 'boolean' ? next : !prev
      try {
        localStorage.setItem(STORAGE_KEY, value ? '1' : '0')
      } catch {
        /* ignore */
      }
      return value
    })
  }

  return { collapsed, toggle }
}

export function PartidosListCollapseToggle({
  collapsed,
  onToggle,
}: {
  collapsed: boolean
  onToggle: () => void
}) {
  if (collapsed) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-10 w-10 shrink-0"
        onClick={onToggle}
        title="Mostrar partidos"
        aria-label="Mostrar lista de partidos"
      >
        <PanelLeftOpen className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-[11px] text-muted-foreground"
      onClick={onToggle}
      title="Ocultar lista y ganar espacio"
    >
      <PanelLeftClose className="h-3.5 w-3.5 mr-1" />
      Ocultar lista
    </Button>
  )
}

export function PartidosCollapsedRail({
  selectedLabel,
  onExpand,
}: {
  selectedLabel?: string
  onExpand: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <PartidosListCollapseToggle collapsed onToggle={onExpand} />
      <button
        type="button"
        onClick={onExpand}
        className="hidden lg:flex w-10 flex-1 min-h-[8rem] flex-col items-center justify-center gap-2 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 text-muted-foreground"
        title={selectedLabel || 'Mostrar partidos'}
      >
        <Calendar className="h-4 w-4" />
        <span className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-medium uppercase tracking-wider">
          Partidos
        </span>
      </button>
    </div>
  )
}
