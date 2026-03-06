'use client'

import { cn } from '@/lib/utils'

interface KabineLoaderProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  className?: string
  /** Full screen centered */
  fullScreen?: boolean
}

export function KabineLoader({ size = 'md', text, className, fullScreen = false }: KabineLoaderProps) {
  const sizes = {
    sm: 'h-10 w-10',
    md: 'h-16 w-16',
    lg: 'h-24 w-24',
  }

  const loader = (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      <div className="relative">
        {/* Outer pulse ring */}
        <div className={cn(
          'absolute inset-0 rounded-full bg-primary/10 animate-kabine-ping',
          sizes[size],
        )} />
        {/* Logo with custom spin animation */}
        <img
          src="/logo-icon.png"
          alt="Kabin-e"
          className={cn(
            'relative animate-kabine-spin drop-shadow-lg',
            sizes[size],
          )}
        />
      </div>
      {text && (
        <p className="text-sm text-muted-foreground animate-pulse">{text}</p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        {loader}
      </div>
    )
  }

  return loader
}
