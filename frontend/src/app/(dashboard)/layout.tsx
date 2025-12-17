'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  ClipboardList,
  Calendar,
  Library,
  Settings,
  ChevronDown,
  LogOut,
  Menu,
  X,
  User,
  Users,
  Check
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useEquipoStore } from '@/stores/equipoStore'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Tareas', href: '/tareas', icon: ClipboardList },
  { name: 'Sesiones', href: '/sesiones', icon: Calendar },
  { name: 'Equipo', href: '/equipo', icon: Users },
  { name: 'Biblioteca', href: '/biblioteca', icon: Library },
  { name: 'Configuración', href: '/configuracion', icon: Settings },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const { equipos, equipoActivo, loadEquipos, setEquipoActivo } = useEquipoStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Cargar equipos al montar
  useEffect(() => {
    loadEquipos()
  }, [loadEquipos])

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar móvil */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-900/80" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-64 bg-white">
          <SidebarContent
            pathname={pathname}
            equipos={equipos}
            equipoActivo={equipoActivo}
            onSelectEquipo={setEquipoActivo}
            user={user}
            onClose={() => setSidebarOpen(false)}
            onLogout={handleLogout}
          />
        </div>
      </div>

      {/* Sidebar desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-white">
          <SidebarContent
            pathname={pathname}
            equipos={equipos}
            equipoActivo={equipoActivo}
            onSelectEquipo={setEquipoActivo}
            user={user}
            onLogout={handleLogout}
          />
        </div>
      </div>

      {/* Contenido principal */}
      <div className="lg:pl-64">
        {/* Header móvil */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm lg:hidden">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex-1 text-sm font-semibold">TrainingHub Pro</div>
          {user && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
            </div>
          )}
        </div>

        <main className="py-6 px-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  )
}

function SidebarContent({
  pathname,
  equipos,
  equipoActivo,
  onSelectEquipo,
  user,
  onClose,
  onLogout
}: {
  pathname: string
  equipos: any[]
  equipoActivo: any | null
  onSelectEquipo: (equipo: any) => void
  user: any
  onClose?: () => void
  onLogout: () => void
}) {
  const [equipoDropdownOpen, setEquipoDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setEquipoDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getEquipoInitials = (nombre: string) => {
    return nombre.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div className="flex grow flex-col gap-y-5 overflow-y-auto px-6 pb-4">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">TH</span>
          </div>
          <span className="font-semibold text-gray-900">TrainingHub Pro</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden">
            <X className="h-6 w-6 text-gray-500" />
          </button>
        )}
      </div>

      {/* Usuario info */}
      {user && (
        <div className="flex items-center gap-3 px-2 py-3 bg-gray-50 rounded-lg">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <span className="text-primary font-bold text-sm">
              {user.nombre?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user.nombre} {user.apellidos}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user.organizacion?.nombre || 'Sin organización'}
            </p>
          </div>
        </div>
      )}

      {/* Navegación */}
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== '/' && pathname.startsWith(item.href))
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={`
                        group flex gap-x-3 rounded-md p-2 text-sm font-medium
                        ${isActive
                          ? 'bg-gray-100 text-primary'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-primary'
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

          {/* Selector de equipo */}
          <li className="mt-auto" ref={dropdownRef}>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Equipo actual
            </div>
            <div className="relative">
              <button
                onClick={() => setEquipoDropdownOpen(!equipoDropdownOpen)}
                className="flex w-full items-center gap-x-2 rounded-md bg-gray-100 p-2 text-sm font-medium text-gray-900 hover:bg-gray-200"
              >
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-primary text-xs font-bold">
                    {equipoActivo ? getEquipoInitials(equipoActivo.nombre) : '??'}
                  </span>
                </div>
                <span className="flex-1 text-left truncate">
                  {equipoActivo?.nombre || 'Seleccionar equipo'}
                </span>
                <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${equipoDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown */}
              {equipoDropdownOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                  {equipos.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      No hay equipos disponibles
                    </div>
                  ) : (
                    <ul className="py-1 max-h-48 overflow-y-auto">
                      {equipos.map((equipo) => (
                        <li key={equipo.id}>
                          <button
                            onClick={() => {
                              onSelectEquipo(equipo)
                              setEquipoDropdownOpen(false)
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                              <span className="text-primary text-xs font-bold">
                                {getEquipoInitials(equipo.nombre)}
                              </span>
                            </div>
                            <span className="flex-1 text-left truncate">{equipo.nombre}</span>
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

          {/* Cerrar sesión */}
          <li className="-mx-2">
            <button
              onClick={onLogout}
              className="group flex w-full gap-x-3 rounded-md p-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-red-600"
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
