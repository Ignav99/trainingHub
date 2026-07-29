'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { POSICIONES } from '@/lib/api/jugadores'

export type PlayerAvatarPlayer = {
  nombre?: string | null
  apellidos?: string | null
  apodo?: string | null
  foto_url?: string | null
  posicion_principal?: string | null
  dorsal?: number | null
}

const SIZE_CLASSES = {
  xs: 'h-6 w-6 text-[9px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
  '2xl': 'h-24 w-24 text-2xl',
  '3xl': 'h-40 w-40 text-4xl',
} as const

export type PlayerAvatarSize = keyof typeof SIZE_CLASSES

function playerInitials(player: PlayerAvatarPlayer): string {
  const n = (player.nombre || '').trim()
  const a = (player.apellidos || '').trim()
  if (n && a) return `${n[0]}${a[0]}`.toUpperCase()
  if (n) return n.slice(0, 2).toUpperCase()
  if (player.apodo) return player.apodo.slice(0, 2).toUpperCase()
  if (player.dorsal != null) return String(player.dorsal)
  return '?'
}

function positionColor(posicion?: string | null): string {
  if (!posicion) return '#6B7280'
  const pos = POSICIONES[posicion as keyof typeof POSICIONES]
  return pos?.color || '#6B7280'
}

export interface PlayerAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  player: PlayerAvatarPlayer
  size?: PlayerAvatarSize
  /** When true and no photo, show dorsal instead of initials. */
  preferDorsalFallback?: boolean
  /** Optional ring / border class overrides. */
  ringClassName?: string
}

/**
 * Transversal player face: photo with initials/dorsal fallback.
 * Never leaves a broken <img> visible.
 */
export function PlayerAvatar({
  player,
  size = 'md',
  preferDorsalFallback = false,
  ringClassName,
  className,
  ...props
}: PlayerAvatarProps) {
  const [imgError, setImgError] = React.useState(false)
  const src = player.foto_url || null

  React.useEffect(() => {
    setImgError(false)
  }, [src])

  const alt =
    player.apodo ||
    `${player.nombre || ''} ${player.apellidos || ''}`.trim() ||
    'Jugador'
  const bg = positionColor(player.posicion_principal)
  const fallback =
    preferDorsalFallback && player.dorsal != null
      ? String(player.dorsal)
      : playerInitials(player)

  if (src && !imgError) {
    return (
      <div
        className={cn(
          'relative flex shrink-0 overflow-hidden rounded-full bg-muted',
          SIZE_CLASSES[size],
          ringClassName,
          className
        )}
        title={alt}
        {...props}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="aspect-square h-full w-full object-cover"
          onError={() => setImgError(true)}
          loading="lazy"
          decoding="async"
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-bold text-white tabular-nums',
        SIZE_CLASSES[size],
        ringClassName,
        className
      )}
      style={{ backgroundColor: bg }}
      title={alt}
      {...props}
    >
      {fallback}
    </div>
  )
}
