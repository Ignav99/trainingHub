import type { CSSProperties } from 'react'
import { KabineMark, KabineWordmark } from '@/components/brand/KabineLogo'
import { cn } from '@/lib/utils'

/**
 * Cal · superficie Visitante para las salas de presentación (vídeo, revisión, pizarra, charla).
 * Mismos valores que `html[data-appearance="cal"] [data-superficie="visitante"]` (globals.css),
 * pero en línea para que la sala sea Cal también con los aspectos `acta` y `clasico`.
 * Referencia: docs/diseno/cal.md
 */
export const SALA_VISITANTE_STYLE = {
  '--background': 'var(--club-h) 10% 9%',
  '--foreground': 'var(--club-h) 12% 94%',
  '--card': 'var(--club-h) 10% 12%',
  '--card-foreground': 'var(--club-h) 12% 94%',
  '--popover': 'var(--club-h) 10% 12%',
  '--popover-foreground': 'var(--club-h) 12% 94%',
  '--primary': 'var(--club-safe-dark)',
  '--primary-foreground': 'var(--club-h) 10% 9%',
  '--secondary': 'var(--club-h) 9% 16%',
  '--secondary-foreground': 'var(--club-h) 12% 94%',
  '--muted': 'var(--club-h) 9% 16%',
  '--muted-foreground': 'var(--club-h) 8% 68%',
  '--accent': 'var(--club-h) 9% 19%',
  '--accent-foreground': 'var(--club-h) 12% 94%',
  '--destructive': '6 80% 62%',
  '--destructive-foreground': 'var(--club-h) 10% 9%',
  '--border': 'var(--club-h) 8% 24%',
  '--input': 'var(--club-h) 8% 24%',
  '--ring': 'var(--club-safe-dark)',
  '--success': '152 50% 58%',
  '--warning': '45 96% 58%',
  '--info': '215 70% 68%',
  '--line': 'var(--club-h) 12% 94%',
  '--sunken': 'var(--club-h) 9% 16%',
  '--radius': '0.125rem',
  background: 'hsl(var(--background))',
  color: 'hsl(var(--foreground))',
  colorScheme: 'dark',
} as CSSProperties

/** Atributos para el contenedor raíz de cualquier sala. */
export const salaSuperficie = {
  'data-superficie': 'visitante',
  style: SALA_VISITANTE_STYLE,
} as const

/**
 * Logo de Kabin-e siempre visible: isotipo + logotipo en un solo color (currentColor).
 * `large` es para lienzos de diapositiva (1280×720) y portadas; el tamaño normal, para el chrome.
 */
export function SalaMarca({
  className,
  compact = false,
  large = false,
}: {
  className?: string
  compact?: boolean
  large?: boolean
}) {
  return (
    <span
      className={cn(
        'pointer-events-none inline-flex items-center text-foreground/80',
        large ? 'gap-3 text-[22px]' : 'gap-1.5 text-[11px]',
        className,
      )}
      data-testid="sala-marca"
    >
      <KabineMark variant="mono" className={large ? 'h-9 w-9' : 'h-4 w-4'} />
      {!compact && <KabineWordmark />}
    </span>
  )
}
