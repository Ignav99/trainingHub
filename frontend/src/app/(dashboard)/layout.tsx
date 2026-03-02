'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  ClipboardList,
  Calendar,
  CalendarDays,
  Library,
  Settings,
  ChevronDown,
  LogOut,
  Menu,
  X,
  Users,
  Check,
  Swords,
  Bell,
  MessageSquare,
  Bot,
  Shield,
  BarChart3,
  Activity,
  UserCheck,
  HeartPulse,
  Trophy,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useEquipoStore } from '@/stores/equipoStore'
import { useClubStore } from '@/stores/clubStore'
import { ClubAvatar, Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { PageReadyGate } from '@/components/providers/PageReadyProvider'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Microciclos', href: '/microciclos', icon: CalendarDays },
  { name: 'Sesiones', href: '/sesiones', icon: Calendar },
  { name: 'Tareas', href: '/tareas', icon: ClipboardList },
  { name: 'Plantilla', href: '/plantilla', icon: Users },
  { name: 'Partidos', href: '/partidos', icon: Swords },
  { name: 'Convocatorias', href: '/convocatorias', icon: UserCheck },
  { name: 'Rivales', href: '/rivales', icon: Shield },
  { name: 'Enfermería', href: '/enfermeria', icon: HeartPulse },
  { name: 'RPE / Wellness', href: '/rpe', icon: Activity },
  { name: 'Competición', href: '/competicion', icon: Trophy },
  { name: 'Estadísticas', href: '/estadisticas', icon: BarChart3 },
]

const secondaryNavigation = [
  { name: 'AI Asistente', href: '/ai', icon: Bot },
  { name: 'Biblioteca AI', href: '/biblioteca-ai', icon: Library },
  { name: 'Notificaciones', href: '/notificaciones', icon: Bell },
  { name: 'Configuracion', href: '/configuracion', icon: Settings },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout, isLoading, isAuthenticated } = useAuthStore()
  const { equipos, equipoActivo, loadEquipos, setEquipoActivo } = useEquipoStore()
  const { theme, isOnboardingComplete } = useClubStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      loadEquipos()
    }
  }, [isAuthenticated, loadEquipos])

  // Redirect to onboarding if not complete
  useEffect(() => {
    if (isAuthenticated && !isOnboardingComplete && pathname !== '/onboarding') {
      router.push('/onboarding')
    }
  }, [isAuthenticated, isOnboardingComplete, pathname, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Mobile sidebar overlay */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-72 bg-card shadow-xl">
          <SidebarContent
            pathname={pathname}
            equipos={equipos}
            equipoActivo={equipoActivo}
            onSelectEquipo={setEquipoActivo}
            user={user}
            theme={theme}
            onClose={() => setSidebarOpen(false)}
            onLogout={handleLogout}
          />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col border-r bg-card">
          <SidebarContent
            pathname={pathname}
            equipos={equipos}
            equipoActivo={equipoActivo}
            onSelectEquipo={setEquipoActivo}
            user={user}
            theme={theme}
            onLogout={handleLogout}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Mobile header */}
        <div
          className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b px-4 shadow-sm lg:hidden"
          style={{ backgroundColor: theme.colorPrimario }}
        >
          <button
            type="button"
            className="-m-2.5 p-2.5"
            style={{ color: 'rgba(255,255,255,0.8)' }}
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex flex-1 items-center gap-3">
            <ClubAvatar
              logoUrl={theme.logoUrl}
              clubName={user?.organizacion?.nombre}
              size="sm"
            />
            <span className="font-semibold text-sm truncate text-white">
              {user?.organizacion?.nombre || 'TrainingHub Pro'}
            </span>
          </div>

          <button className="relative p-2" style={{ color: 'rgba(255,255,255,0.8)' }}>
            <Bell className="h-5 w-5" />
          </button>
        </div>

        <main className="py-6 px-4 sm:px-6 lg:px-8">
          <PageReadyGate>{children}</PageReadyGate>
        </main>
      </div>
    </div>
  )
}

// ============ Sidebar Component ============

interface SidebarProps {
  pathname: string
  equipos: any[]
  equipoActivo: any | null
  onSelectEquipo: (equipo: any) => void
  user: any
  theme: { colorPrimario: string; colorSecundario: string; logoUrl: string | null }
  onClose?: () => void
  onLogout: () => void
}

function SidebarContent({
  pathname,
  equipos,
  equipoActivo,
  onSelectEquipo,
  user,
  theme,
  onClose,
  onLogout,
}: SidebarProps) {
  const [equipoDropdownOpen, setEquipoDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLLIElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setEquipoDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="flex grow flex-col gap-y-5 overflow-y-auto pb-4 scrollbar-thin">
      {/* Club header with escudo - corporate colors */}
      <div
        className="flex shrink-0 items-center justify-between px-5 py-4 -mx-0 rounded-b-xl shadow-sm"
        style={{ backgroundColor: theme.colorPrimario }}
      >
        <Link href="/" className="flex items-center gap-3 group">
          <ClubAvatar
            logoUrl={theme.logoUrl}
            clubName={user?.organizacion?.nombre}
            size="md"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate group-hover:opacity-80 transition-opacity">
              {user?.organizacion?.nombre || 'TrainingHub Pro'}
            </p>
            <p className="text-[10px] text-white/60 uppercase tracking-wider">
              TrainingHub Pro
            </p>
          </div>
        </Link>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1 rounded-md hover:bg-white/10">
            <X className="h-5 w-5 text-white/80" />
          </button>
        )}
      </div>

      {/* User info card */}
      {user && (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/50 mx-5">
          <Avatar
            src={user.avatar_url}
            fallback={user.nombre?.charAt(0)?.toUpperCase()}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user.nombre} {user.apellidos}
            </p>
            <p className="text-xs text-muted-foreground truncate capitalize">
              {user.rol?.replace('_', ' ')}
            </p>
          </div>
          <button
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Notificaciones"
          >
            <Bell className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main navigation */}
      <nav className="flex flex-1 flex-col px-5">
        <ul role="list" className="flex flex-1 flex-col gap-y-5">
          <li>
            <ul role="list" className="-mx-2 space-y-0.5">
              {navigation.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== '/' && pathname.startsWith(item.href))
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={`
                        group flex gap-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-all
                        ${isActive
                          ? 'bg-[hsl(var(--club-primary)/0.1)] text-[hsl(var(--club-primary))] border-l-[3px] border-[hsl(var(--club-primary))] ml-0 pl-2.5'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground border-l-[3px] border-transparent'
                        }
                      `}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {item.name}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </li>

          {/* Secondary navigation */}
          <li>
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
              Herramientas
            </div>
            <ul role="list" className="-mx-2 space-y-0.5">
              {secondaryNavigation.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== '/' && pathname.startsWith(item.href))
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={`
                        group flex gap-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-all
                        ${isActive
                          ? 'bg-[hsl(var(--club-primary)/0.1)] text-[hsl(var(--club-primary))] border-l-[3px] border-[hsl(var(--club-primary))] ml-0 pl-2.5'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground border-l-[3px] border-transparent'
                        }
                      `}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {item.name}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </li>

          {/* Team selector */}
          <li className="mt-auto" ref={dropdownRef}>
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
              Equipo
            </div>
            <div className="relative">
              <button
                onClick={() => setEquipoDropdownOpen(!equipoDropdownOpen)}
                className="flex w-full items-center gap-x-3 rounded-lg bg-muted/70 p-2.5 text-sm font-medium hover:bg-muted transition-colors"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: theme.colorPrimario }}
                >
                  {equipoActivo
                    ? equipoActivo.nombre.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
                    : '??'}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <span className="block truncate text-sm">
                    {equipoActivo?.nombre || 'Seleccionar equipo'}
                  </span>
                  {equipoActivo?.categoria && (
                    <span className="block text-[10px] text-muted-foreground truncate">
                      {equipoActivo.categoria} - {equipoActivo.temporada || 'Sin temporada'}
                    </span>
                  )}
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${equipoDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {equipoDropdownOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-popover border rounded-lg shadow-lg overflow-hidden z-50">
                  {equipos.length === 0 ? (
                    <div className="px-3 py-3 text-sm text-muted-foreground text-center">
                      No hay equipos disponibles
                    </div>
                  ) : (
                    <ul className="py-1 max-h-52 overflow-y-auto scrollbar-thin">
                      {equipos.map((equipo) => (
                        <li key={equipo.id}>
                          <button
                            onClick={() => {
                              onSelectEquipo(equipo)
                              setEquipoDropdownOpen(false)
                            }}
                            className="flex w-full items-center gap-3 px-3 py-2 text-sm hover:bg-muted transition-colors"
                          >
                            <div
                              className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-white"
                              style={{ backgroundColor: theme.colorPrimario }}
                            >
                              {equipo.nombre.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <span className="block truncate">{equipo.nombre}</span>
                              {equipo.categoria && (
                                <span className="text-[10px] text-muted-foreground">{equipo.categoria}</span>
                              )}
                            </div>
                            {equipoActivo?.id === equipo.id && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </li>

          {/* Logout */}
          <li className="-mx-2">
            <button
              onClick={onLogout}
              className="group flex w-full gap-x-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              Cerrar sesión
            </button>
          </li>
        </ul>
      </nav>
    </div>
  )
}
