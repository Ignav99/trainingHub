'use client'

import { ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Full document load in a new tab so the existing localStorage session is read.
 * The informe (or whatever is open) stays where it is.
 */
export function OpenVideoTabLink({
  variant = 'icon',
  className,
}: {
  variant?: 'icon' | 'text'
  className?: string
}) {
  return (
    <a
      href="/video-analisis"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Abrir vídeo en otra pestaña"
      title="Abrir vídeo en otra pestaña"
      className={cn(
        'inline-flex items-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
        variant === 'text'
          ? 'gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium'
          : 'h-8 w-8 justify-center rounded-md shrink-0',
        className
      )}
    >
      <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {variant === 'text' ? <span>Abrir vídeo en otra pestaña</span> : null}
    </a>
  )
}
