'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HeartPulse, Activity, UtensilsCrossed } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppearance } from '@/lib/useAppearance'

const TABS = [
  { name: 'Enfermería', href: '/enfermeria', icon: HeartPulse, match: (p: string) => p.startsWith('/enfermeria') },
  { name: 'RPE', href: '/rpe', icon: Activity, match: (p: string) => p.startsWith('/rpe') },
  { name: 'Nutrición', href: '/nutricion', icon: UtensilsCrossed, match: (p: string) => p.startsWith('/nutricion') },
] as const

export function SaludTabs() {
  const pathname = usePathname()
  const cal = useAppearance() === 'cal'

  if (cal) {
    return (
      <div
        className="flex gap-x-5 border-b-[1.5px] border-line w-full overflow-x-auto scrollbar-thin"
        role="tablist"
        aria-label="Área de salud"
      >
        {TABS.map((tab) => {
          const active = tab.match(pathname)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              role="tab"
              aria-selected={active}
              className={cn(
                '-mb-[1.5px] inline-flex h-9 items-center border-b-[3px] text-sm font-medium whitespace-nowrap [@media(pointer:coarse)]:h-11',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary',
                active ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.name}
            </Link>
          )
        })}
      </div>
    )
  }

  return (
    <div
      className="flex gap-1 p-1 rounded-xl bg-muted/70 border w-full sm:w-auto overflow-x-auto scrollbar-thin"
      role="tablist"
      aria-label="Área de salud"
    >
      {TABS.map((tab) => {
        const active = tab.match(pathname)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            role="tab"
            aria-selected={active}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.name}
          </Link>
        )
      })}
    </div>
  )
}

export function isSaludPath(pathname: string) {
  return (
    pathname.startsWith('/enfermeria') ||
    pathname.startsWith('/rpe') ||
    pathname.startsWith('/nutricion')
  )
}
