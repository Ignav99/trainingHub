'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

/** Marcador cuadrado con el número del comentario. Resuelto: apagado y tachado. */
export const PinMarcador = forwardRef<
  HTMLButtonElement,
  {
    numero: number | string
    resuelto?: boolean
    activo?: boolean
    fantasma?: boolean
    onClick?: () => void
    etiqueta: string
  }
>(function PinMarcador({ numero, resuelto, activo, fantasma, onClick, etiqueta }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={etiqueta}
      aria-expanded={activo}
      tabIndex={fantasma ? -1 : 0}
      className={cn(
        'pointer-events-auto flex h-[22px] min-w-[22px] items-center justify-center rounded-[var(--radius)] border-[1.5px] bg-card px-1 text-xs font-semibold tabular-nums transition-transform duration-rapido ease-sale active:scale-[.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--club-primary))] focus-visible:ring-offset-1 focus-visible:ring-offset-background',
        resuelto
          ? 'border-muted-foreground/40 text-muted-foreground line-through'
          : 'border-[hsl(var(--club-primary))] text-foreground',
        activo && !resuelto && 'bg-[hsl(var(--club-primary))] text-[hsl(var(--club-primary-foreground))]',
        fantasma && 'border-dashed'
      )}
    >
      {numero}
    </button>
  )
})
