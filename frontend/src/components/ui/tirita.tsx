import { cn } from '@/lib/utils'

/** Tirita: marca de lesión o tratamiento. El color lo pone quien la usa (text-*). */
export function Tirita({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn('inline-block h-[1em] w-[1em] flex-none', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g transform="rotate(-45 12 12)">
        <rect x="2" y="8" width="20" height="8" rx="4" />
        <path d="M9 8v8M15 8v8" />
        <circle cx="12" cy="12" r="0.6" fill="currentColor" />
      </g>
    </svg>
  )
}
