import { useId } from 'react'
import { cn } from '@/lib/utils'

/** Silueta del isotipo (una pieza, sin facetas). Fuente: public/brand/kabine-mark.svg */
export const KABINE_MARK_PATH =
  'M16 12 L33 20 L33 41 L86 5 L62 47 L82 58 L82 81 L50 97 L16 81 Z M35 59 L53 51 L61 68 L45 77 Z'

/** Logotipo "Kabin-e" (Schibsted Grotesk 800 a trazos). */
const WORDMARK_VIEWBOX = '133 -1628 7695 1655'

interface MarkProps {
  className?: string
  /** 'gradient' (marca), 'mono' (currentColor) */
  variant?: 'gradient' | 'mono'
  title?: string
}

export function KabineMark({ className, variant = 'gradient', title = 'Kabin-e' }: MarkProps) {
  const id = useId().replace(/:/g, '')
  const fill = variant === 'gradient' ? `url(#kg-${id})` : 'currentColor'
  return (
    <svg viewBox="0 0 100 100" className={cn('h-8 w-8 shrink-0', className)} role="img" aria-label={title}>
      {variant === 'gradient' && (
        <defs>
          <linearGradient id={`kg-${id}`} x1="14" y1="96" x2="90" y2="6" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#2F3FD6" />
            <stop offset="1" stopColor="#7A5AF0" />
          </linearGradient>
        </defs>
      )}
      <path d={KABINE_MARK_PATH} fill={fill} stroke={fill} strokeWidth={4} strokeLinejoin="round" fillRule="evenodd" />
    </svg>
  )
}

/** Logotipo solo; toma el color del texto (currentColor) vía máscara. */
export function KabineWordmark({ className }: { className?: string }) {
  return (
    <span
      aria-label="Kabin-e"
      role="img"
      className={cn('block h-[1.15em] aspect-[7695/1655] bg-current', className)}
      style={{
        WebkitMask: 'url(/brand/kabine-wordmark.svg) center / contain no-repeat',
        mask: 'url(/brand/kabine-wordmark.svg) center / contain no-repeat',
      }}
    />
  )
}

interface LogoProps {
  className?: string
  markClassName?: string
  wordClassName?: string
  variant?: 'gradient' | 'mono'
}

/** Isotipo + logotipo. El logotipo hereda el color del texto (currentColor). */
export function KabineLogo({ className, markClassName, wordClassName, variant = 'gradient' }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <KabineMark variant={variant} className={markClassName} />
      <KabineWordmark className={wordClassName} />
    </span>
  )
}
