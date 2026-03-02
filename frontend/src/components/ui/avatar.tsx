import * as React from 'react'
import { cn } from '@/lib/utils'
import { getInitials } from '@/lib/utils'

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null
  alt?: string
  fallback?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, fallback, size = 'md', ...props }, ref) => {
    const [imgError, setImgError] = React.useState(false)

    if (src && !imgError) {
      return (
        <div
          ref={ref}
          className={cn(
            'relative flex shrink-0 overflow-hidden rounded-full',
            sizeClasses[size],
            className
          )}
          {...props}
        >
          <img
            src={src}
            alt={alt || ''}
            className="aspect-square h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        </div>
      )
    }

    return (
      <div
        ref={ref}
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full bg-muted font-medium text-muted-foreground',
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {fallback || alt?.charAt(0)?.toUpperCase() || '?'}
      </div>
    )
  }
)
Avatar.displayName = 'Avatar'

// Club escudo avatar - uses organization logo
interface ClubAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  logoUrl?: string | null
  clubName?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const ClubAvatar = React.forwardRef<HTMLDivElement, ClubAvatarProps>(
  ({ className, logoUrl, clubName, size = 'md', ...props }, ref) => {
    const [imgError, setImgError] = React.useState(false)

    if (logoUrl && !imgError) {
      return (
        <div
          ref={ref}
          className={cn(
            'relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-1',
            sizeClasses[size],
            className
          )}
          {...props}
        >
          <img
            src={logoUrl}
            alt={clubName || 'Escudo'}
            className="h-full w-full object-contain"
            onError={() => setImgError(true)}
          />
        </div>
      )
    }

    return (
      <div
        ref={ref}
        className={cn(
          'flex shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--club-primary))] font-bold text-white',
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {clubName ? getInitials(clubName) : '?'}
      </div>
    )
  }
)
ClubAvatar.displayName = 'ClubAvatar'

export { Avatar, ClubAvatar }
