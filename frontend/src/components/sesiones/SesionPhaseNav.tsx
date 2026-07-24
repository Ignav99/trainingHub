'use client'

import { cn } from '@/lib/utils'
import {
  ClipboardList,
  PenTool,
  Flag,
  type LucideIcon,
} from 'lucide-react'

/** Wizard 3 pasos: Definir → Diseño → Cierre */
export type SesionPhase = 'definir' | 'diseno' | 'cierre'

/** Alias legacy para migrar pantallas que aún usaban 5 fases */
export type SesionPhaseLegacy =
  | SesionPhase
  | 'contexto'
  | 'convocatoria'
  | 'campo'

export function normalizeSesionPhase(phase: SesionPhaseLegacy | string): SesionPhase {
  if (phase === 'contexto') return 'definir'
  if (phase === 'convocatoria' || phase === 'campo') return 'diseno'
  if (phase === 'definir' || phase === 'diseno' || phase === 'cierre') return phase
  return 'definir'
}

const PHASES: { id: SesionPhase; label: string; hint: string; icon: LucideIcon }[] = [
  { id: 'definir', label: 'Definir', hint: 'Fases, ABP, objetivo', icon: ClipboardList },
  { id: 'diseno', label: 'Diseño', hint: 'Convocatoria y tareas', icon: PenTool },
  { id: 'cierre', label: 'Cierre', hint: 'PDF, link y planificar', icon: Flag },
]

export function SesionPhaseNav({
  value,
  onChange,
  done,
}: {
  value: SesionPhase
  onChange: (phase: SesionPhase) => void
  /** Phases considered "done" for the progress dots */
  done?: Partial<Record<SesionPhase, boolean>>
}) {
  return (
    <nav className="w-full overflow-x-auto scrollbar-thin -mx-1 px-1" aria-label="Fases de la sesión">
      <ol className="flex min-w-max gap-1 sm:gap-2">
        {PHASES.map((phase, idx) => {
          const active = value === phase.id
          const isDone = !!done?.[phase.id]
          const Icon = phase.icon
          return (
            <li key={phase.id} className="flex items-center gap-1 sm:gap-2">
              {idx > 0 && (
                <span className="hidden sm:block w-4 h-px bg-border shrink-0" aria-hidden />
              )}
              <button
                type="button"
                onClick={() => onChange(phase.id)}
                className={cn(
                  'flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active
                    ? 'bg-foreground text-background border-foreground shadow-sm'
                    : isDone
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100'
                      : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold tabular-nums',
                    active ? 'bg-background/15' : isDone ? 'bg-emerald-100' : 'bg-muted'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold leading-tight">{phase.label}</span>
                  <span className={cn('block text-[10px] leading-tight', active ? 'text-background/70' : 'text-muted-foreground')}>
                    {phase.hint}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
