'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Shield,
  Building,
  Users,
  Loader2,
  Plus,
  LogOut,
  RefreshCw,
  Search,
  X,
  BarChart3,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/lib/api/client'

import type { Overview, Org, Plan, OrgDetail } from './components/types'
import OverviewCards from './components/OverviewCards'
import OrgCard from './components/OrgCard'
import UsersList from './components/UsersList'
import ConfirmDialog from './components/ConfirmDialog'
import PlatformAnalyticsTab from './components/PlatformAnalyticsTab'

export default function AdminPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuthStore()

  // Core data
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [overview, setOverview] = useState<Overview | null>(null)
  const [orgs, setOrgs] = useState<Org[]>([])
  const [planes, setPlanes] = useState<Plan[]>([])

  // Org detail
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null)
  const [orgDetail, setOrgDetail] = useState<OrgDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // View toggle
  const [activeTab, setActiveTab] = useState<'orgs' | 'users' | 'analytics'>('orgs')
  const [orgSearch, setOrgSearch] = useState('')

  // Create org
  const [showCreateOrg, setShowCreateOrg] = useState(false)
  const [newOrgName, setNewOrgName] = useState('')
  const [newOrgPlan, setNewOrgPlan] = useState('free_trial')
  const [creatingOrg, setCreatingOrg] = useState(false)

  // Confirmation dialog
  const [confirmState, setConfirmState] = useState<{
    open: boolean
    title: string
    message: string
    confirmLabel?: string
    confirmColor?: string
    action: () => Promise<void>
  }>({ open: false, title: '', message: '', action: async () => {} })
  const [confirmLoading, setConfirmLoading] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) { router.push('/login'); return }
    loadData()
  }, [authLoading, isAuthenticated])

  // ── Data loading ──

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [ov, orgList, planList] = await Promise.all([
        api.get<Overview>('/admin/overview'),
        api.get<Org[]>('/admin/organizaciones'),
        api.get<Plan[]>('/admin/planes'),
      ])
      setOverview(ov)
      setOrgs(orgList)
      setPlanes(planList)
    } catch (err: any) {
      setError(err.message || 'Sin acceso de administrador')
    } finally {
      setLoading(false)
    }
  }

  const loadOrgDetail = async (orgId: string) => {
    if (expandedOrg === orgId) { setExpandedOrg(null); return }
    setExpandedOrg(orgId)
    setLoadingDetail(true)
    try {
      const detail = await api.get<OrgDetail>(`/admin/organizaciones/${orgId}/detalle`)
      setOrgDetail(detail)
    } catch { toast.error('Error al cargar detalle') }
    finally { setLoadingDetail(false) }
  }

  const reloadOrgDetail = async (orgId: string) => {
    setLoadingDetail(true)
    try {
      const detail = await api.get<OrgDetail>(`/admin/organizaciones/${orgId}/detalle`)
      setOrgDetail(detail)
    } catch { /* silent */ }
    finally { setLoadingDetail(false) }
  }

  // ── Actions ──

  const handleCreateOrg = async () => {
    if (!newOrgName.trim()) return
    setCreatingOrg(true)
    try {
      const result = await api.post<{ organizacion: Org }>('/admin/organizaciones', {
        nombre: newOrgName.trim(),
        plan_codigo: newOrgPlan,
      })
      setShowCreateOrg(false)
      setNewOrgName('')
      setNewOrgPlan('free_trial')
      toast.success('Organizacion creada')
      await loadData()
      if (result.organizacion?.id) loadOrgDetail(result.organizacion.id)
    } catch (err: any) {
      toast.error(err.message || 'Error al crear organizacion')
    } finally {
      setCreatingOrg(false)
    }
  }

  const requestConfirm = (opts: { title: string; message: string; confirmLabel?: string; confirmColor?: string; action: () => Promise<void> }) => {
    setConfirmState({ open: true, ...opts })
  }

  const executeConfirm = async () => {
    setConfirmLoading(true)
    try { await confirmState.action() }
    catch (err: any) { toast.error(err.message || 'Error al ejecutar accion') }
    finally { setConfirmLoading(false); setConfirmState(prev => ({ ...prev, open: false })) }
  }

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  // ── Filtered orgs ──

  const filteredOrgs = orgSearch
    ? orgs.filter(o => o.nombre.toLowerCase().includes(orgSearch.toLowerCase()))
    : orgs

  // ── Loading & error states ──

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Cargando panel de control...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <Shield className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Acceso denegado</h1>
          <p className="text-gray-500 mb-4">{error}</p>
          <button onClick={() => router.push('/')} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            Volver al dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Confirm dialog */}
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        confirmColor={confirmState.confirmColor}
        loading={confirmLoading}
        onConfirm={executeConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, open: false }))}
      />

      {/* ── Header ── */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo-icon.png" alt="Kabin-e" width={32} height={32} className="rounded-lg" />
            <div>
              <h1 className="font-bold text-gray-900 text-sm sm:text-base">Kabin-e Admin</h1>
              <p className="text-xs text-gray-500 hidden sm:block">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={loadData} className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors" title="Refrescar datos">
              <RefreshCw className="h-4 w-4" />
            </button>
            <button onClick={handleLogout} className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors" title="Cerrar sesion">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ── Overview ── */}
        {overview && <OverviewCards overview={overview} />}

        {/* ── Tabs + search ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('orgs')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === 'orgs' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Building className="h-4 w-4 inline mr-1.5 -mt-0.5" />
              Organizaciones
              <span className="ml-1.5 text-xs text-gray-400">{orgs.length}</span>
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === 'users' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="h-4 w-4 inline mr-1.5 -mt-0.5" />
              Usuarios
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === 'analytics' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <BarChart3 className="h-4 w-4 inline mr-1.5 -mt-0.5" />
              Analiticas
            </button>
          </div>

          {activeTab === 'orgs' && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex-1 sm:w-64 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filtrar organizaciones..."
                  value={orgSearch}
                  onChange={e => setOrgSearch(e.target.value)}
                  className="w-full text-sm pl-9 pr-8 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                />
                {orgSearch && (
                  <button onClick={() => setOrgSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowCreateOrg(true)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1.5 shrink-0 transition-colors shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nuevo Club</span>
              </button>
            </div>
          )}
        </div>

        {/* ── Create Org ── */}
        {showCreateOrg && (
          <div className="bg-white rounded-xl border p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">Crear nueva organizacion</p>
              <button onClick={() => setShowCreateOrg(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Nombre del club</label>
                <input
                  type="text"
                  placeholder="Ej: CD Alcobendas"
                  value={newOrgName}
                  onChange={e => setNewOrgName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateOrg()}
                  className="w-full text-sm px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Plan inicial</label>
                <select value={newOrgPlan} onChange={e => setNewOrgPlan(e.target.value)} className="w-full text-sm px-3 py-2 border rounded-lg bg-white">
                  {planes.map(p => <option key={p.id} value={p.codigo}>{p.nombre}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateOrg}
                disabled={creatingOrg || !newOrgName.trim()}
                className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5 font-medium transition-colors"
              >
                {creatingOrg ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                {creatingOrg ? 'Creando...' : 'Crear club'}
              </button>
              <button onClick={() => setShowCreateOrg(false)} className="text-sm px-4 py-2 bg-white border text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* ── Organizations tab ── */}
        {activeTab === 'orgs' && (
          <div className="space-y-3">
            {filteredOrgs.map(org => (
              <OrgCard
                key={org.id}
                org={org}
                isExpanded={expandedOrg === org.id}
                orgDetail={expandedOrg === org.id ? orgDetail : null}
                loadingDetail={expandedOrg === org.id && loadingDetail}
                planes={planes}
                onToggle={() => loadOrgDetail(org.id)}
                onReload={() => reloadOrgDetail(org.id)}
                onReloadData={loadData}
                onConfirm={requestConfirm}
              />
            ))}

            {filteredOrgs.length === 0 && orgs.length > 0 && (
              <div className="bg-white rounded-xl border p-12 text-center">
                <Search className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Sin resultados para &ldquo;{orgSearch}&rdquo;</p>
              </div>
            )}

            {orgs.length === 0 && (
              <div className="bg-white rounded-xl border p-12 text-center">
                <Building className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No hay organizaciones registradas</p>
                <button onClick={() => setShowCreateOrg(true)} className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium">
                  Crear la primera
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Users tab ── */}
        {activeTab === 'users' && (
          <UsersList onConfirm={requestConfirm} />
        )}

        {/* ── Analytics tab ── */}
        {activeTab === 'analytics' && (
          <PlatformAnalyticsTab />
        )}
      </main>
    </div>
  )
}
