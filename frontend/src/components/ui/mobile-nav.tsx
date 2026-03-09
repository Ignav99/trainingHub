'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Swords,
  Calendar,
  Users,
  MoreHorizontal,
  Shield,
  BarChart3,
  Settings,
  Bot,
  HeartPulse,
  Trophy,
  X,
} from 'lucide-react'

const mainTabs = [
  { name: 'Inicio', href: '/', icon: LayoutDashboard },
  { name: 'Partidos', href: '/partidos', icon: Swords },
  { name: 'Sesiones', href: '/sesiones', icon: Calendar },
  { name: 'Plantilla', href: '/plantilla', icon: Users },
]

const moreTabs = [
  { name: 'Rivales', href: '/rivales', icon: Shield },
  { name: 'Competición', href: '/competicion', icon: Trophy },
  { name: 'Estadísticas', href: '/estadisticas', icon: BarChart3 },
  { name: 'Enfermería', href: '/enfermeria', icon: HeartPulse },
  { name: 'AI Asistente', href: '/ai', icon: Bot },
  { name: 'Configuración', href: '/configuracion', icon: Settings },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <>
      {/* More menu overlay */}
      {moreOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMoreOpen(false)} />
          <div className="fixed bottom-16 left-0 right-0 bg-card border-t rounded-t-2xl shadow-2xl z-50 safe-bottom">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="text-sm font-semibold">Más opciones</span>
              <button onClick={() => setMoreOpen(false)} className="p-1 rounded-full hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1 p-3">
              {moreTabs.map((tab) => (
                <Link
                  key={tab.href}
                  href={tab.href}
                  onClick={() => setMoreOpen(false)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl text-xs transition-colors ${
                    isActive(tab.href)
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <tab.icon className="h-5 w-5" />
                  {tab.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-card border-t safe-bottom">
        <div className="flex items-center justify-around h-16">
          {mainTabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 min-w-[64px] transition-colors ${
                isActive(tab.href)
                  ? 'text-primary'
                  : 'text-muted-foreground'
              }`}
            >
              <tab.icon className={`h-5 w-5 ${isActive(tab.href) ? 'stroke-[2.5]' : ''}`} />
              <span className="text-[10px] font-medium">{tab.name}</span>
            </Link>
          ))}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 min-w-[64px] transition-colors ${
              moreOpen ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-medium">Más</span>
          </button>
        </div>
      </nav>
    </>
  )
}
