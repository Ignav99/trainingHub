'use client'

import { useState, useEffect, useRef, memo, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Settings,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  X,
  Users,
  Check,
  Swords,
  Bell,
  ScanSearch,
  Shield,
  BarChart3,
  Activity,
  HeartPulse,
  Trophy,
  Flag,
  UtensilsCrossed,
  Crown,
  PenTool,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { preload } from 'swr'
import { apiFetcher } from '@/lib/swr'
import { apiKey } from '@/lib/swr'
import { useAuthStore } from '@/stores/authStore'
import { useEquipoStore } from '@/stores/equipoStore'
import { useClubStore } from '@/stores/clubStore'
import { useSidebarStore } from '@/stores/sidebarStore'
import { ClubAvatar, Avatar } from '@/components/ui/avatar'
import { SplashScreen } from '@/components/ui/splash-screen'
import { Toaster } from '@/components/ui/toast'
import { MobileBottomNav } from '@/components/ui/mobile-nav'
import { InstallPrompt } from '@/components/ui/install-prompt'
import { registerServiceWorker } from '@/lib/register-sw'
import { isSaludPath } from '@/components/salud/SaludTabs'
import { cn } from '@/lib/utils'
import type { Equipo, Usuario } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClubTheme {
  colorPrimario: string
  colorSecundario: string
  logoUrl: string | null
}

interface SidebarProps {
  pathname: string
  equipos: Equipo[]
  equipoActivo: Equipo | null
  onSelectEquipo: (equipo: Equipo) => void
  user: Usuario | null
  theme: ClubTheme
  collapsed: boolean
  onClose?: () => void
  onLogout: () => void
  onToggleCollapse?: () => void
}

type NavItem = {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  match?: (pathname: string) => boolean
}

// ─── Navigation ───────────────────────────────────────────────────────────────

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Microciclos', href: '/microciclos', icon: CalendarDays },
  { name: 'Sesiones', href: '/sesiones', icon: Calendar },
  { name: 'Plantilla', href: '/plantilla', icon: Users },
  { name: 'Partidos', href: '/partidos', icon: Swords },
  { name: 'Rivales', href: '/rivales', icon: Shield },
  { name: 'Balón Parado', href: '/abp', icon: Flag },
  { name: 'Competición', href: '/competicion', icon: Trophy },
]

const saludNavigation: NavItem[] = [
  { name: 'Enfermería', href: '/enfermeria', icon: HeartPulse },
  { name: 'RPE', href: '/rpe', icon: Activity },
  { name: 'Nutrición', href: '/nutricion', icon: UtensilsCrossed },
]

const toolsNavigation: NavItem[] = [
  { name: 'Video Análisis', href: '/video-analisis', icon: ScanSearch },
  { name: 'Pizarra Táctica', href: '/pizarra-tactica', icon: PenTool },
  { name: 'Estadísticas', href: '/estadisticas', icon: BarChart3 },
]

function isNavActive(item: NavItem, pathname: string) {
  if (item.match) return item.match(pathname)
  if (item.href === '/') return pathname === '/'
  return pathname === item.href || pathname.startsWith(item.href)
}

// ─── Layout ───────────────────────────────────────────────────────────────────

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
  const { collapsed, toggle: toggleSidebar } = useSidebarStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [dataReady, setDataReady] = useState(false)
  const genRef = useRef(0)

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

  useEffect(() => {
    if (isAuthenticated && !isOnboardingComplete && pathname !== '/onboarding') {
      router.push('/onboarding')
    }
  }, [isAuthenticated, isOnboardingComplete, pathname, router])

  useEffect(() => {
    if (!isAuthenticated || !equipoActivo?.id) return
    const eid = equipoActivo.id
    genRef.current += 1
    const gen = genRef.current

    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth()
    const fechaDesde = `${y}-${String(m + 1).padStart(2, '0')}-01`
    const lastDay = new Date(y, m + 1, 0).getDate()
    const fechaHasta = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const allEndpoints = [
      apiKey('/dashboard/resumen', { equipo_id: eid }),
      apiKey('/dashboard/plantilla', { equipo_id: eid }),
      apiKey('/jugadores', { equipo_id: eid, estado: 'activo' }),
      apiKey('/catalogos/categorias-tarea'),
      apiKey('/microciclos', { equipo_id: eid, estado: 'en_curso', limit: 1 }),
      apiKey('/sesiones', { equipo_id: eid, estado: 'borrador', limit: 1 }),
      apiKey('/partidos', { equipo_id: eid, solo_jugados: true, limit: 1, orden: 'fecha', direccion: 'desc' }),
      apiKey('/rfef/competiciones', { equipo_id: eid }),
      apiKey('/sesiones', { equipo_id: eid, fecha_desde: fechaDesde, fecha_hasta: fechaHasta, limit: 50 }),
      apiKey('/partidos', { equipo_id: eid, fecha_desde: fechaDesde, fecha_hasta: fechaHasta, limit: 20 }),
      apiKey('/microciclos', { equipo_id: eid, fecha_desde: fechaDesde, fecha_hasta: fechaHasta }),
      apiKey('/descansos', { equipo_id: eid, fecha_desde: fechaDesde, fecha_hasta: fechaHasta }),
      apiKey('/partidos', { equipo_id: eid, solo_pendientes: true, orden: 'fecha', direccion: 'asc', limit: 20 }),
      apiKey('/sesiones', { page: 1, limit: 10, equipo_id: eid }),
      apiKey('/tareas', { page: 1, limit: 20, equipo_id: eid }),
      apiKey('/partidos', { equipo_id: eid, orden: 'fecha', direccion: 'desc', limit: 50 }),
      apiKey('/carga/equipo/' + eid),
    ].filter(Boolean) as string[]

    Promise.allSettled(allEndpoints.map((key) => preload(key, apiFetcher))).then(() => {
      if (gen === genRef.current) {
        setDataReady(true)
      }

      const hoy = `${y}-${String(m + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      const bgEndpoints = [
        apiKey('/medico', { equipo_id: eid }),
        apiKey('/nutricion/planes', { equipo_id: eid, fecha: hoy }),
        apiKey('/nutricion/composicion', { equipo_id: eid }),
        apiKey('/nutricion/suplementos', { equipo_id: eid, activo: true }),
        apiKey('/estadisticas/dashboard', { equipo_id: eid }),
        apiKey('/dashboard/carga-semanal', { equipo_id: eid, semanas: 12 }),
        apiKey('/abp', { equipo_id: eid }),
        apiKey('/tactical-boards', { equipo_id: eid }),
        apiKey('/game-models', { equipo_id: eid }),
        apiKey('/rivales', { orden: 'nombre', direccion: 'asc' }),
        apiKey('/wellness/equipo/' + eid),
        apiKey('/wellness/equipo/' + eid + '/alertas'),
      ].filter(Boolean) as string[]
      bgEndpoints.forEach((key) => preload(key, apiFetcher))
    })

    const timeout = setTimeout(() => {
      if (gen === genRef.current) {
        setDataReady(true)
      }
    }, 15000)
    return () => clearTimeout(timeout)
  }, [isAuthenticated, equipoActivo?.id])

  useEffect(() => {
    registerServiceWorker()
  }, [])

  const handleLogout = useCallback(async () => {
    await logout()
    router.push('/login')
  }, [logout, router])

  const handleCloseSidebar = useCallback(() => setSidebarOpen(false), [])
  const handleOpenSidebar = useCallback(() => setSidebarOpen(true), [])

  const activeTeam = equipoActivo ?? equipos[0] ?? null

  if (!isAuthenticated || !activeTeam || !dataReady) {
    return <SplashScreen />
  }

  const sidebarWidth = collapsed ? 'lg:w-[4.5rem]' : 'lg:w-72'
  const contentPad = collapsed ? 'lg:pl-[4.5rem]' : 'lg:pl-72'

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Mobile sidebar overlay */}
      <div className={cn('fixed inset-0 z-50 lg:hidden', sidebarOpen ? '' : 'hidden')}>
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCloseSidebar} />
        <div className="fixed inset-y-0 left-0 w-72 bg-card shadow-xl">
          <SidebarContent
            pathname={pathname}
            equipos={equipos}
            equipoActivo={activeTeam}
            onSelectEquipo={setEquipoActivo}
            user={user}
            theme={theme}
            collapsed={false}
            onClose={handleCloseSidebar}
            onLogout={handleLogout}
          />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className={cn('hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col transition-[width] duration-200 ease-out', sidebarWidth)}>
        <div className="flex min-h-0 flex-1 flex-col border-r bg-card">
          <SidebarContent
            pathname={pathname}
            equipos={equipos}
            equipoActivo={activeTeam}
            onSelectEquipo={setEquipoActivo}
            user={user}
            theme={theme}
            collapsed={collapsed}
            onLogout={handleLogout}
            onToggleCollapse={toggleSidebar}
          />
        </div>
      </div>

      {/* Main column */}
      <div className={cn('transition-[padding] duration-200 ease-out', contentPad)}>
        {/* Mobile header */}
        <div
          className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-x-3 border-b px-4 shadow-sm lg:hidden"
          style={{ backgroundColor: theme.colorPrimario }}
        >
          <button
            type="button"
            className="-m-2 p-2"
            style={{ color: 'rgba(255,255,255,0.85)' }}
            onClick={handleOpenSidebar}
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex flex-1 items-center gap-2.5 min-w-0">
            <ClubAvatar logoUrl={theme.logoUrl} clubName={user?.organizacion?.nombre} size="sm" />
            <span className="font-semibold text-sm truncate text-white">
              {user?.organizacion?.nombre || 'Kabin-e'}
            </span>
          </div>

          <Link
            href="/alertas"
            className="relative p-2"
            style={{ color: 'rgba(255,255,255,0.85)' }}
            aria-label="Notificaciones"
          >
            <Bell className="h-5 w-5" />
          </Link>
          <Link
            href="/configuracion"
            className="p-2"
            style={{ color: 'rgba(255,255,255,0.85)' }}
            aria-label="Configuración"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </div>

        {/* Desktop top bar — user + config + collapse */}
        <div className="hidden lg:sticky lg:top-0 lg:z-30 lg:flex h-12 items-center gap-3 border-b bg-card/95 backdrop-blur px-4">
          <button
            type="button"
            onClick={toggleSidebar}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title={collapsed ? 'Mostrar menú' : 'Ocultar menú'}
            aria-label={collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
          >
            {collapsed ? <PanelLeftOpen className="h-4.5 w-4.5 h-[18px] w-[18px]" /> : <PanelLeftClose className="h-4.5 w-4.5 h-[18px] w-[18px]" />}
          </button>

          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">
              {equipoActivo?.nombre}
              {equipoActivo?.categoria ? ` · ${equipoActivo.categoria}` : ''}
            </p>
          </div>

          <Link
            href="/alertas"
            className="relative p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Notificaciones"
            aria-label="Notificaciones"
          >
            <Bell className="h-4 w-4" />
          </Link>

          {user && (
            <div className="flex items-center gap-2 pl-2 border-l">
              <Avatar
                src={user.avatar_url}
                fallback={user.nombre?.charAt(0)?.toUpperCase()}
                size="sm"
              />
              <div className="min-w-0 max-w-[160px]">
                <p className="text-sm font-medium truncate leading-tight">
                  {user.nombre} {user.apellidos}
                </p>
                <p className="text-[10px] text-muted-foreground truncate capitalize leading-tight">
                  {user.rol?.replace('_', ' ')}
                </p>
              </div>
              <Link
                href="/configuracion"
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Configuración"
                aria-label="Configuración"
              >
                <Settings className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>

        <main className="py-6 pb-24 lg:pb-6 px-4 sm:px-6 lg:px-8">{children}</main>
      </div>
      <MobileBottomNav />
      <InstallPrompt />
      <Toaster />
    </div>
  )
}

// ─── Nav link ─────────────────────────────────────────────────────────────────

function NavLink({
  item,
  pathname,
  collapsed,
  onClose,
}: {
  item: NavItem
  pathname: string
  collapsed: boolean
  onClose?: () => void
}) {
  const active = isNavActive(item, pathname)
  return (
    <Link
      href={item.href}
      onClick={onClose}
      title={collapsed ? item.name : undefined}
      className={cn(
        'group flex items-center gap-x-3 rounded-lg text-sm font-medium transition-all',
        collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2',
        active
          ? 'bg-[hsl(var(--club-primary)/0.1)] text-[hsl(var(--club-primary))] border-l-[3px] border-[hsl(var(--club-primary))]'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground border-l-[3px] border-transparent'
      )}
    >
      <item.icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span className="truncate">{item.name}</span>}
    </Link>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const SidebarContent = memo(function SidebarContent({
  pathname,
  equipos,
  equipoActivo,
  onSelectEquipo,
  user,
  theme,
  collapsed,
  onClose,
  onLogout,
  onToggleCollapse,
}: SidebarProps) {
  const [equipoDropdownOpen, setEquipoDropdownOpen] = useState(false)
  const [saludOpen, setSaludOpen] = useState(() => isSaludPath(pathname))
  const dropdownRef = useRef<HTMLLIElement>(null)

  useEffect(() => {
    if (isSaludPath(pathname)) setSaludOpen(true)
  }, [pathname])

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
    <div className="flex grow flex-col gap-y-4 overflow-y-auto pb-4 scrollbar-thin">
      {/* Club header */}
      <div
        className={cn('flex shrink-0 items-center justify-between shadow-sm', collapsed ? 'px-2 py-3' : 'px-5 py-4')}
        style={{ backgroundColor: theme.colorPrimario }}
      >
        <Link href="/" className={cn('flex items-center gap-3 group min-w-0', collapsed && 'justify-center w-full')}>
          <ClubAvatar logoUrl={theme.logoUrl} clubName={user?.organizacion?.nombre} size={collapsed ? 'sm' : 'md'} />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate group-hover:opacity-80 transition-opacity">
                {user?.organizacion?.nombre || 'Kabin-e'}
              </p>
              <p className="text-[10px] text-white/60 uppercase tracking-wider flex items-center gap-1">
                <Image src="/logo-icon.png" alt="Kabin-e" width={14} height={14} className="h-3.5 w-3.5" />
                Kabin-e
              </p>
            </div>
          )}
        </Link>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1 rounded-md hover:bg-white/10">
            <X className="h-5 w-5 text-white/80" />
          </button>
        )}
      </div>

      {!collapsed && onToggleCollapse && (
        <div className="px-5 -mt-1 hidden lg:block">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="w-full flex items-center justify-center gap-2 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <PanelLeftClose className="h-3.5 w-3.5" />
            Ocultar menú
          </button>
        </div>
      )}

      {/* Club Admin */}
      {user && ['presidente', 'director_deportivo', 'secretario', 'admin'].includes(user.rol) && (
        <div className={cn(collapsed ? 'px-2' : 'px-5')}>
          <Link
            href="/gestion"
            onClick={onClose}
            title={collapsed ? 'Gestión del Club' : undefined}
            className={cn(
              'flex items-center rounded-xl text-sm font-semibold transition-all',
              collapsed ? 'justify-center p-2.5' : 'gap-2 px-3 py-2.5',
              pathname.startsWith('/gestion')
                ? 'bg-amber-100 border border-amber-300 text-amber-900'
                : 'bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100'
            )}
          >
            <Crown className="h-4 w-4 shrink-0" />
            {!collapsed && 'Gestión del Club'}
          </Link>
        </div>
      )}

      <nav className={cn('flex flex-1 flex-col', collapsed ? 'px-2' : 'px-5')}>
        <ul role="list" className="flex flex-1 flex-col gap-y-5">
          <li>
            <ul role="list" className="space-y-0.5">
              {navigation.map((item) => (
                <li key={item.name}>
                  <NavLink item={item} pathname={pathname} collapsed={collapsed} onClose={onClose} />
                </li>
              ))}
            </ul>
          </li>

          {/* Salud group */}
          <li>
            {!collapsed && (
              <button
                type="button"
                onClick={() => setSaludOpen((v) => !v)}
                className="w-full flex items-center justify-between px-3 mb-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
              >
                <span>Salud</span>
                <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', saludOpen && 'rotate-90')} />
              </button>
            )}
            {collapsed && (
              <div className="text-center text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Salud
              </div>
            )}
            {(collapsed || saludOpen) && (
              <ul role="list" className="space-y-0.5">
                {saludNavigation.map((item) => (
                  <li key={item.name}>
                    <NavLink item={item} pathname={pathname} collapsed={collapsed} onClose={onClose} />
                  </li>
                ))}
              </ul>
            )}
          </li>

          {/* Herramientas */}
          <li>
            {!collapsed && (
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
                Herramientas
              </div>
            )}
            {collapsed && (
              <div className="text-center text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Tools
              </div>
            )}
            <ul role="list" className="space-y-0.5">
              {toolsNavigation.map((item) => (
                <li key={item.name}>
                  <NavLink item={item} pathname={pathname} collapsed={collapsed} onClose={onClose} />
                </li>
              ))}
            </ul>
          </li>

          {/* Team selector */}
          <li className="mt-auto" ref={dropdownRef}>
            {!collapsed && (
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
                Equipo
              </div>
            )}
            <div className="relative">
              <button
                onClick={() => setEquipoDropdownOpen(!equipoDropdownOpen)}
                title={collapsed ? equipoActivo?.nombre : undefined}
                className={cn(
                  'flex w-full items-center rounded-lg bg-muted/70 text-sm font-medium hover:bg-muted transition-colors',
                  collapsed ? 'justify-center p-2' : 'gap-x-3 p-2.5'
                )}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ backgroundColor: theme.colorPrimario }}
                >
                  {equipoActivo
                    ? equipoActivo.nombre
                        .split(' ')
                        .map((w: string) => w[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)
                    : '??'}
                </div>
                {!collapsed && (
                  <>
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
                    <ChevronDown
                      className={cn('h-4 w-4 text-muted-foreground transition-transform', equipoDropdownOpen && 'rotate-180')}
                    />
                  </>
                )}
              </button>

              {equipoDropdownOpen && (
                <div
                  className={cn(
                    'absolute bottom-full mb-1 bg-popover border rounded-lg shadow-lg overflow-hidden z-50',
                    collapsed ? 'left-0 w-56' : 'left-0 right-0'
                  )}
                >
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
                              {equipo.nombre
                                .split(' ')
                                .map((w: string) => w[0])
                                .join('')
                                .toUpperCase()
                                .slice(0, 2)}
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <span className="block truncate">{equipo.nombre}</span>
                              {equipo.categoria && (
                                <span className="text-[10px] text-muted-foreground">{equipo.categoria}</span>
                              )}
                            </div>
                            {equipoActivo?.id === equipo.id && <Check className="h-4 w-4 text-primary" />}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </li>

          <li>
            <button
              onClick={onLogout}
              title={collapsed ? 'Cerrar sesión' : undefined}
              className={cn(
                'group flex w-full items-center rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors',
                collapsed ? 'justify-center px-2 py-2' : 'gap-x-3 px-3 py-2'
              )}
            >
              <LogOut className="h-5 w-5 shrink-0" />
              {!collapsed && 'Cerrar sesión'}
            </button>
          </li>
        </ul>
      </nav>
    </div>
  )
})

SidebarContent.displayName = 'SidebarContent'
