'use client'

import { cn } from '@/lib/utils'
import { useAppearance } from '@/lib/useAppearance'
import {
  Check,
  ClipboardList,
  PenTool,
  UserCheck,
  Flag,
  type LucideIcon,
} from 'lucide-react'

/** Pasos separados: Definir | Convocatoria | Diseño | Cierre */
export type SesionPhase = 'definir' | 'convocatoria' | 'diseno' | 'cierre'

/** Alias legacy */
export type SesionPhaseLegacy =
  | SesionPhase
  | 'contexto'
  | 'campo'

export function normalizeSesionPhase(phase: SesionPhaseLegacy | string): SesionPhase {
  if (phase === 'contexto') return 'definir'
  if (phase === 'campo') return 'diseno'
  if (phase === 'definir' || phase === 'convocatoria' || phase === 'diseno' || phase === 'cierre') {
    return phase
  }
  return 'definir'
}

const PHASES: { id: SesionPhase; label: string; hint: string; icon: LucideIcon }[] = [
  { id: 'definir', label: 'Definir', hint: 'Fases, ABP, objetivo', icon: ClipboardList },
  { id: 'convocatoria', label: 'Convocatoria', hint: 'Quién asiste', icon: UserCheck },
  { id: 'diseno', label: 'Diseño', hint: 'Tareas y material', icon: PenTool },
  { id: 'cierre', label: 'Cierre', hint: 'PDF, link y planificar', icon: Flag },
]

export function SesionPhaseNav({
  value,
  onChange,
  done,
}: {
  value: SesionPhase
  onChange: (phase: SesionPhase) => void
  done?: Partial<Record<SesionPhase, boolean>>
}) {
  const appearance = useAppearance()
  if (appearance === 'cal') {
    return (
      <nav className="w-full min-w-0" aria-label="Fases de la sesión">
        <ol className="grid grid-cols-2 lg:grid-cols-4 border border-border bg-card divide-border [&>li]:border-border">
          {PHASES.map((phase, idx) => {
            const active = value === phase.id
            const isDone = !!done?.[phase.id]
            const Icon = phase.icon
            return (
              <li
                key={phase.id}
                className={cn(
                  'min-w-0 border-border',
                  idx % 2 === 1 && 'border-l',
                  idx > 0 && 'lg:border-l',
                  idx >= 2 && 'border-t lg:border-t-0'
                )}
              >
                <button
                  type="button"
                  onClick={() => onChange(phase.id)}
                  aria-current={active ? 'step' : undefined}
                  className={cn(
                    'flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : isDone
                        ? 'bg-card text-foreground hover:bg-sunken'
                        : 'bg-sunken text-muted-foreground hover:text-foreground'
                  )}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden>
                    {isDone && !active ? <Check className="h-4 w-4 text-success" /> : <Icon className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold leading-tight">{phase.label}</span>
                    <span className={cn('block cal-rotulo leading-tight', active ? 'opacity-80' : isDone ? 'text-success' : 'text-muted-foreground')}>
                      {active ? 'En curso' : isDone ? 'Completado' : 'Pendiente'}
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
  return (
    <nav className="w-full min-w-0" aria-label="Fases de la sesión">
      <ol className="grid grid-cols-2 gap-1 lg:flex lg:min-w-max lg:gap-2">
        {PHASES.map((phase, idx) => {
          const active = value === phase.id
          const isDone = !!done?.[phase.id]
          const Icon = phase.icon
          return (
            <li key={phase.id} className="min-w-0 lg:flex lg:items-center lg:gap-2">
              {idx > 0 && (
                <span className="hidden lg:block w-4 h-px bg-border shrink-0" aria-hidden />
              )}
              <button
                type="button"
                onClick={() => onChange(phase.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors',
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
