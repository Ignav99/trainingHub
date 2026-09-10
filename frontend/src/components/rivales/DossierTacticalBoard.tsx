'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Maximize2 } from 'lucide-react'
import TareaPizarraEditor from '@/components/tactical-board/TareaPizarraEditor'
import type { TareaPizarraData } from '@/components/tactical-board/types'
import { TacticalBoardMini, boardHasAnimation } from '@/components/task-preview'
import { deriveAsignacionesFromDiagram } from '@/lib/planPartidoDiagramRoles'
import type { AsignacionRolTactico } from '@/types'

export interface DossierPizarraPatch {
  pizarra_diagrama: TareaPizarraData
  pizarra_tactica?: string
  roles?: AsignacionRolTactico[]
}

interface DossierTacticalBoardProps {
  value?: TareaPizarraData | null
  onChange: (patch: DossierPizarraPatch) => void
  title?: string
}

export function patchFromPizarra(data: TareaPizarraData): DossierPizarraPatch {
  return {
    pizarra_diagrama: data,
    pizarra_tactica: data.preview || undefined,
    roles: deriveAsignacionesFromDiagram(data),
  }
}

export function DossierTacticalBoard({
  value,
  onChange,
  title = 'Pizarra táctica',
}: DossierTacticalBoardProps) {
  const [editing, setEditing] = useState(false)
  const animated = boardHasAnimation(value)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {animated ? 'Pizarra animada · campo entero · se reproduce en bucle' : 'Pizarra táctica · mismo editor que las tareas'}
        </p>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex h-7 items-center gap-1.5 rounded-md border border-input bg-background px-2 text-[11px] font-medium hover:bg-muted"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          Editar pizarra
        </button>
      </div>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="block w-full overflow-hidden rounded-lg border bg-[#1a3a12] text-left"
        aria-label="Abrir pizarra táctica"
      >
        <TacticalBoardMini
          data={value}
          animate={animated}
          autoplay
          height={220}
          className="pointer-events-none"
        />
      </button>

      {editing && typeof document !== 'undefined'
        ? createPortal(
            <div className="fixed inset-0 z-[80] bg-white">
              <TareaPizarraEditor
                key={title}
                value={value}
                title={title}
                height="100%"
                onChange={(data) => onChange(patchFromPizarra(data))}
                onClose={() => setEditing(false)}
              />
            </div>,
            document.body
          )
        : null}
    </div>
  )
}
