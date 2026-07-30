'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Crown,
  LayoutDashboard,
  Trophy,
  Users,
  FileText,
  Loader2,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { isClubAdminRole, isSuperadminRole } from '@/lib/roles'
import ClubDashboardTab from './components/ClubDashboardTab'
import TeamsTab from './components/TeamsTab'
import JugadoresClubTab from './components/JugadoresClubTab'
import AuditTab from './components/AuditTab'
import MiCuentaTab from './components/MiCuentaTab'

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'equipos', label: 'Equipos', icon: Trophy },
  { id: 'jugadores', label: 'Jugadores', icon: Users },
  { id: 'auditoria', label: 'Auditoria', icon: FileText },
  { id: 'mi-cuenta', label: 'Mi cuenta', icon: Crown },
] as const

type TabId = typeof TABS[number]['id']

export default function GestionPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading } = useAuthStore()
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    if (user && !isClubAdminRole(user.rol) && !isSuperadminRole(user.rol)) {
      router.push('/')
    }
  }, [isLoading, isAuthenticated, user, router])

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isClubAdminRole(user.rol) && !isSuperadminRole(user.rol)) return null

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="bg-white border-b px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Crown className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Gestion del Club</h1>
              <p className="text-sm text-gray-500">Panel de administracion</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <nav className="flex gap-0.5 -mb-px">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-1.5 px-3 py-3 text-sm font-medium whitespace-nowrap
                    border-b-2 transition-colors
                    ${isActive
                      ? 'border-amber-500 text-amber-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'dashboard' && <ClubDashboardTab />}
        {activeTab === 'equipos' && <TeamsTab />}
        {activeTab === 'jugadores' && <JugadoresClubTab />}
        {activeTab === 'auditoria' && <AuditTab />}
        {activeTab === 'mi-cuenta' && <MiCuentaTab />}
      </div>
    </div>
  )
}
