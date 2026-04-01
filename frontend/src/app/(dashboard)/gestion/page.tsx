'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Crown,
  LayoutDashboard,
  Trophy,
  Users,
  ClipboardList,
  Calendar,
  FileText,
  Loader2,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import ClubDashboardTab from './components/ClubDashboardTab'
import TeamsTab from './components/TeamsTab'
import StaffTab from './components/StaffTab'
import TasksTab from './components/TasksTab'
import SessionsTab from './components/SessionsTab'
import MembersTab from './components/MembersTab'
import AuditTab from './components/AuditTab'

const CLUB_ADMIN_ROLES = ['presidente', 'director_deportivo', 'secretario', 'admin']

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'equipos', label: 'Equipos', icon: Trophy },
  { id: 'personal', label: 'Personal', icon: Users },
  { id: 'tareas', label: 'Tareas', icon: ClipboardList },
  { id: 'sesiones', label: 'Sesiones', icon: Calendar },
  { id: 'miembros', label: 'Miembros', icon: Users },
  { id: 'auditoria', label: 'Auditoria', icon: FileText },
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
    if (user && !CLUB_ADMIN_ROLES.includes(user.rol)) {
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

  if (!CLUB_ADMIN_ROLES.includes(user.rol)) return null

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
        {activeTab === 'personal' && <StaffTab />}
        {activeTab === 'tareas' && <TasksTab />}
        {activeTab === 'sesiones' && <SessionsTab />}
        {activeTab === 'miembros' && <MembersTab />}
        {activeTab === 'auditoria' && <AuditTab />}
      </div>
    </div>
  )
}
