'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Shield,
  Building,
  Users,
  Trophy,
  CreditCard,
  Loader2,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Plus,
  LogOut,
  RefreshCw,
  Search,
  X,
  BarChart3,
  Pencil,
  Trash2,
  RotateCcw,
  AlertTriangle,
  UserCog,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/lib/api/client'

// ============ Types ============

interface Overview {
  total_organizaciones: number
  total_usuarios: number
  total_equipos: number
  suscripciones_activas: number
  suscripciones_trial: number
}

interface Plan {
  id: string
  codigo: string
  nombre: string
  precio_mensual: number
  max_equipos?: number
  max_usuarios_por_equipo?: number
  max_jugadores_por_equipo?: number
}

interface Suscripcion {
  id: string
  estado: string
  plan_id: string
  trial_fin?: string
  planes?: Plan
}

interface Org {
  id: string
  nombre: string
  created_at: string
  suscripcion?: Suscripcion
  num_miembros: number
  num_equipos: number
}

interface Limites {
  max_equipos: number
  max_usuarios_por_equipo: number
  max_jugadores_por_equipo: number
  max_storage_mb: number
  max_ai_calls_month: number
  equipos_usados: number
  uso_storage_mb: number
  uso_ai_calls_month: number
}

interface OrgDetail {
  organizacion: { id: string; nombre: string }
  miembros: Array<{
    id: string
    email: string
    nombre: string
    apellidos?: string
    rol: string
    created_at: string
    usuarios_equipos?: Array<{
      equipo_id: string
      rol_en_equipo: string
      equipos?: { nombre: string }
    }>
  }>
  equipos: Array<{
    id: string
    nombre: string
    categoria?: string
    activo: boolean
    num_miembros?: number
  }>
  suscripcion?: any
  invitaciones_pendientes: Array<{
    id: string
    email: string
    nombre?: string
    rol_en_equipo: string
    rol_organizacion?: string
    token: string
    expira_en: string
  }>
  limites?: Limites
}

// Role groups for invite form
const ROLE_GROUPS = [
  {
    label: 'Cuerpo Tecnico',
    roles: [
      { value: 'entrenador_principal', label: 'Entrenador Principal' },
      { value: 'segundo_entrenador', label: '2do Entrenador' },
      { value: 'preparador_fisico', label: 'Preparador Fisico' },
      { value: 'entrenador_porteros', label: 'Entr. Porteros' },
      { value: 'analista', label: 'Analista' },
      { value: 'fisio', label: 'Fisioterapeuta' },
      { value: 'delegado', label: 'Delegado' },
    ],
  },
  {
    label: 'Jugadores',
    roles: [{ value: 'jugador', label: 'Jugador' }],
  },
  {
    label: 'Directiva',
    roles: [
      { value: 'presidente', label: 'Presidente' },
      { value: 'director_deportivo', label: 'Director Deportivo' },
      { value: 'secretario', label: 'Secretario' },
    ],
  },
]

const ALL_ROLES = ROLE_GROUPS.flatMap(g => g.roles)

const DIRECTIVA_ROLES = ['presidente', 'director_deportivo', 'secretario']

// ============ Confirmation Dialog ============

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  confirmColor = 'bg-red-600 hover:bg-red-700',
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  confirmColor?: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 p-5 space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-gray-900">{title}</p>
            <p className="text-sm text-gray-500 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm bg-white border text-gray-600 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50 ${confirmColor}`}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============ Usage Bar ============

function UsageBar({ used, max, label }: { used: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900">{used} / {max}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ============ Helpers ============

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })

const formatRole = (r: string) =>
  r.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

const estadoBadge = (estado: string) => {
  const colors: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-800',
    trial: 'bg-blue-100 text-blue-800',
    suspended: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-600',
    past_due: 'bg-amber-100 text-amber-800',
    grace_period: 'bg-orange-100 text-orange-800',
  }
  return colors[estado] || 'bg-gray-100 text-gray-600'
}

// ============ Component ============

export default function AdminPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuthStore()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [overview, setOverview] = useState<Overview | null>(null)
  const [orgs, setOrgs] = useState<Org[]>([])
  const [planes, setPlanes] = useState<Plan[]>([])
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null)
  const [orgDetail, setOrgDetail] = useState<OrgDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Org search
  const [orgSearch, setOrgSearch] = useState('')

  // Create org
  const [showCreateOrg, setShowCreateOrg] = useState(false)
  const [newOrgName, setNewOrgName] = useState('')
  const [newOrgPlan, setNewOrgPlan] = useState('free_trial')
  const [creatingOrg, setCreatingOrg] = useState(false)

  // Edit org name
  const [editingOrgId, setEditingOrgId] = useState<string | null>(null)
  const [editOrgName, setEditOrgName] = useState('')
  const [savingOrgName, setSavingOrgName] = useState(false)

  // Create team
  const [showCreateTeam, setShowCreateTeam] = useState<string | null>(null)
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamCategoria, setNewTeamCategoria] = useState('')
  const [newTeamTemporada, setNewTeamTemporada] = useState('')
  const [creatingTeam, setCreatingTeam] = useState(false)

  // Invite form
  const [inviteOrgId, setInviteOrgId] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteNombre, setInviteNombre] = useState('')
  const [inviteRol, setInviteRol] = useState('segundo_entrenador')
  const [inviteEquipoId, setInviteEquipoId] = useState('')
  const [inviteRolOrg, setInviteRolOrg] = useState('')
  const [creatingInvite, setCreatingInvite] = useState(false)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Plan change
  const [changingPlanOrg, setChangingPlanOrg] = useState<string | null>(null)
  const [selectedPlan, setSelectedPlan] = useState('')
  const [savingPlan, setSavingPlan] = useState(false)

  // Users
  const [showUsers, setShowUsers] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [userSearch, setUserSearch] = useState('')

  // Confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    message: string
    confirmLabel?: string
    confirmColor?: string
    action: () => Promise<void>
  }>({ open: false, title: '', message: '', action: async () => {} })
  const [confirmLoading, setConfirmLoading] = useState(false)

  // Change user role
  const [changingRoleUserId, setChangingRoleUserId] = useState<string | null>(null)
  const [newRole, setNewRole] = useState('')

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    loadData()
  }, [authLoading, isAuthenticated])

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
    if (expandedOrg === orgId) {
      setExpandedOrg(null)
      return
    }
    setExpandedOrg(orgId)
    setLoadingDetail(true)
    try {
      const detail = await api.get<OrgDetail>(`/admin/organizaciones/${orgId}/detalle`)
      setOrgDetail(detail)
    } catch (err: any) {
      toast.error('Error al cargar detalle')
    } finally {
      setLoadingDetail(false)
    }
  }

  const reloadOrgDetail = async (orgId: string) => {
    setLoadingDetail(true)
    try {
      const detail = await api.get<OrgDetail>(`/admin/organizaciones/${orgId}/detalle`)
      setOrgDetail(detail)
    } catch {
      // silent
    } finally {
      setLoadingDetail(false)
    }
  }

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
      if (result.organizacion?.id) {
        loadOrgDetail(result.organizacion.id)
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al crear organizacion')
    } finally {
      setCreatingOrg(false)
    }
  }

  const handleEditOrgName = async (orgId: string) => {
    if (!editOrgName.trim()) return
    setSavingOrgName(true)
    try {
      await api.patch(`/admin/organizaciones/${orgId}`, { nombre: editOrgName.trim() })
      setEditingOrgId(null)
      toast.success('Nombre actualizado')
      await loadData()
      if (expandedOrg === orgId) reloadOrgDetail(orgId)
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar nombre')
    } finally {
      setSavingOrgName(false)
    }
  }

  const handleCreateTeam = async (orgId: string) => {
    if (!newTeamName.trim()) return
    setCreatingTeam(true)
    try {
      await api.post(`/admin/organizaciones/${orgId}/equipos`, {
        nombre: newTeamName.trim(),
        categoria: newTeamCategoria || undefined,
        temporada: newTeamTemporada || undefined,
      })
      setShowCreateTeam(null)
      setNewTeamName('')
      setNewTeamCategoria('')
      setNewTeamTemporada('')
      toast.success('Equipo creado')
      reloadOrgDetail(orgId)
      loadData()
    } catch (err: any) {
      toast.error(err.message || 'Error al crear equipo')
    } finally {
      setCreatingTeam(false)
    }
  }

  const handleCreateInvite = async () => {
    if (!inviteOrgId || !inviteEmail) return
    setCreatingInvite(true)
    try {
      const isDirectiva = DIRECTIVA_ROLES.includes(inviteRol)
      const result = await api.post<{ token: string }>('/admin/invitaciones', {
        organizacion_id: inviteOrgId,
        email: inviteEmail,
        nombre: inviteNombre || undefined,
        rol_en_equipo: isDirectiva ? 'delegado' : inviteRol,
        equipo_id: inviteEquipoId || undefined,
        rol_organizacion: isDirectiva ? inviteRol : inviteRolOrg || undefined,
      })
      setGeneratedLink(`${window.location.origin}/join?token=${result.token}`)
      toast.success('Invitacion creada')
    } catch (err: any) {
      toast.error(err.message || 'Error al crear invitacion')
    } finally {
      setCreatingInvite(false)
    }
  }

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Enlace copiado')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleChangePlan = async (orgId: string) => {
    if (!selectedPlan) return
    const planName = planes.find(p => p.codigo === selectedPlan)?.nombre || selectedPlan
    setConfirmDialog({
      open: true,
      title: 'Cambiar plan',
      message: `Vas a cambiar el plan de esta organizacion a "${planName}". Esta accion se registrara en el audit log.`,
      confirmLabel: 'Cambiar plan',
      confirmColor: 'bg-blue-600 hover:bg-blue-700',
      action: async () => {
        await api.patch(`/admin/organizaciones/${orgId}/suscripcion`, {
          plan_codigo: selectedPlan,
          estado: 'active',
        })
        setChangingPlanOrg(null)
        setSelectedPlan('')
        toast.success('Plan actualizado')
        loadData()
        if (expandedOrg === orgId) reloadOrgDetail(orgId)
      },
    })
  }

  const handleDeleteUser = (userId: string, userName: string) => {
    setConfirmDialog({
      open: true,
      title: 'Desactivar usuario',
      message: `Vas a desactivar a "${userName}". El usuario no podra acceder a la plataforma. Esta accion se registra en el audit log.`,
      confirmLabel: 'Desactivar',
      action: async () => {
        await api.delete(`/admin/usuarios/${userId}`)
        toast.success('Usuario desactivado')
        loadUsers()
      },
    })
  }

  const handleChangeRole = async (userId: string) => {
    if (!newRole) return
    setConfirmDialog({
      open: true,
      title: 'Cambiar rol',
      message: `Vas a cambiar el rol del usuario a "${formatRole(newRole)}". Esta accion se registra en el audit log.`,
      confirmLabel: 'Cambiar rol',
      confirmColor: 'bg-blue-600 hover:bg-blue-700',
      action: async () => {
        await api.patch(`/admin/usuarios/${userId}/rol`, { rol: newRole })
        setChangingRoleUserId(null)
        setNewRole('')
        toast.success('Rol actualizado')
        loadUsers()
      },
    })
  }

  const handleRevokeInvite = (inviteId: string, email: string, orgId: string) => {
    setConfirmDialog({
      open: true,
      title: 'Revocar invitacion',
      message: `Vas a revocar la invitacion de "${email}". El enlace dejara de funcionar.`,
      confirmLabel: 'Revocar',
      action: async () => {
        await api.delete(`/admin/invitaciones/${inviteId}`)
        toast.success('Invitacion revocada')
        reloadOrgDetail(orgId)
      },
    })
  }

  const handleResendInvite = async (inviteId: string) => {
    try {
      const result = await api.post<{ token: string; new_expiry: string }>(`/admin/invitaciones/${inviteId}/resend`, {})
      toast.success('Invitacion renovada (+30 dias)')
      if (expandedOrg) reloadOrgDetail(expandedOrg)
    } catch (err: any) {
      toast.error(err.message || 'Error al reenviar invitacion')
    }
  }

  const executeConfirm = async () => {
    setConfirmLoading(true)
    try {
      await confirmDialog.action()
    } catch (err: any) {
      toast.error(err.message || 'Error al ejecutar accion')
    } finally {
      setConfirmLoading(false)
      setConfirmDialog(prev => ({ ...prev, open: false }))
    }
  }

  const loadUsers = async () => {
    setShowUsers(true)
    setLoadingUsers(true)
    try {
      const result = await api.get<{ data: any[]; total: number }>('/admin/usuarios', {
        params: { limit: 100, search: userSearch || undefined },
      })
      setUsers(result.data)
    } catch (err: any) {
      toast.error('Error al cargar usuarios')
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  // Filter orgs by search
  const filteredOrgs = orgSearch
    ? orgs.filter(o => o.nombre.toLowerCase().includes(orgSearch.toLowerCase()))
    : orgs

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">Cargando panel de control...</p>
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
          <button
            onClick={() => router.push('/')}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Volver al dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        confirmColor={confirmDialog.confirmColor}
        loading={confirmLoading}
        onConfirm={executeConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
      />

      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo-icon.png" alt="Kabin-e" width={32} height={32} />
            <div>
              <h1 className="font-bold text-gray-900">Kabin-e Admin</h1>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              title="Refrescar"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              title="Salir"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Overview cards */}
        {overview && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Organizaciones', value: overview.total_organizaciones, icon: Building, color: 'text-blue-600 bg-blue-50' },
              { label: 'Usuarios', value: overview.total_usuarios, icon: Users, color: 'text-purple-600 bg-purple-50' },
              { label: 'Equipos', value: overview.total_equipos, icon: Trophy, color: 'text-green-600 bg-green-50' },
              { label: 'Subs activas', value: overview.suscripciones_activas, icon: CreditCard, color: 'text-emerald-600 bg-emerald-50' },
              { label: 'En trial', value: overview.suscripciones_trial, icon: CreditCard, color: 'text-blue-600 bg-blue-50' },
            ].map((card) => (
              <div key={card.label} className="bg-white rounded-xl border p-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.color} mb-2`}>
                  <card.icon className="h-4 w-4" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-xs text-gray-500">{card.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Navigation + Search + New Club button */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => setShowUsers(false)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                !showUsers ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'
              }`}
            >
              <Building className="h-4 w-4 inline mr-1.5" />
              Organizaciones
            </button>
            <button
              onClick={loadUsers}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                showUsers ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'
              }`}
            >
              <Users className="h-4 w-4 inline mr-1.5" />
              Usuarios
            </button>
          </div>

          {!showUsers && (
            <div className="flex items-center gap-2 flex-1 max-w-md ml-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar organizacion..."
                  value={orgSearch}
                  onChange={(e) => setOrgSearch(e.target.value)}
                  className="w-full text-sm pl-9 pr-3 py-2 border rounded-lg"
                />
              </div>
              <button
                onClick={() => setShowCreateOrg(true)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1.5 shrink-0"
              >
                <Plus className="h-4 w-4" />
                Nuevo Club
              </button>
            </div>
          )}
        </div>

        {/* Create Org Dialog */}
        {showCreateOrg && (
          <div className="bg-white rounded-xl border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">Crear nueva organizacion</p>
              <button onClick={() => setShowCreateOrg(false)} className="p-1 hover:bg-gray-100 rounded">
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
                  onChange={(e) => setNewOrgName(e.target.value)}
                  className="w-full text-sm px-3 py-2 border rounded-lg"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Plan inicial</label>
                <select
                  value={newOrgPlan}
                  onChange={(e) => setNewOrgPlan(e.target.value)}
                  className="w-full text-sm px-3 py-2 border rounded-lg bg-white"
                >
                  {planes.map((p) => (
                    <option key={p.id} value={p.codigo}>{p.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateOrg}
                disabled={creatingOrg || !newOrgName.trim()}
                className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                {creatingOrg ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                {creatingOrg ? 'Creando...' : 'Crear club'}
              </button>
              <button
                onClick={() => setShowCreateOrg(false)}
                className="text-sm px-4 py-2 bg-white border text-gray-600 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Organizations list */}
        {!showUsers && (
          <div className="space-y-3">
            {filteredOrgs.map((org) => (
              <div key={org.id} className="bg-white rounded-xl border overflow-hidden">
                {/* Org row */}
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => loadOrgDetail(org.id)}
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
                    {org.nombre?.charAt(0) || '?'}
                  </div>

                  <div className="flex-1 min-w-0">
                    {editingOrgId === org.id ? (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editOrgName}
                          onChange={(e) => setEditOrgName(e.target.value)}
                          className="text-sm px-2 py-1 border rounded font-semibold text-gray-900"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditOrgName(org.id)
                            if (e.key === 'Escape') setEditingOrgId(null)
                          }}
                        />
                        <button
                          onClick={() => handleEditOrgName(org.id)}
                          disabled={savingOrgName}
                          className="text-xs px-2 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {savingOrgName ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Guardar'}
                        </button>
                        <button
                          onClick={() => setEditingOrgId(null)}
                          className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-gray-900 truncate">{org.nombre}</p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingOrgId(org.id)
                              setEditOrgName(org.nombre)
                            }}
                            className="p-0.5 text-gray-300 hover:text-gray-500 rounded"
                            title="Editar nombre"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        </div>
                        <p className="text-xs text-gray-500">
                          {org.num_miembros} miembros · {org.num_equipos} equipos · Creado {formatDate(org.created_at)}
                        </p>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {org.suscripcion ? (
                      <>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${estadoBadge(org.suscripcion.estado)}`}>
                          {org.suscripcion.estado}
                        </span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                          {org.suscripcion.planes?.nombre || 'Sin plan'}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400">Sin suscripcion</span>
                    )}
                    {expandedOrg === org.id ? (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded detail */}
                {expandedOrg === org.id && (
                  <div className="border-t bg-gray-50 p-4">
                    {loadingDetail ? (
                      <div className="flex items-center gap-2 py-4 justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        <span className="text-sm text-gray-500">Cargando detalle...</span>
                      </div>
                    ) : orgDetail ? (
                      <div className="space-y-4">
                        {/* License card */}
                        {orgDetail.suscripcion && (
                          <div className="bg-white p-4 rounded-lg border">
                            <div className="flex items-center gap-2 mb-3">
                              <BarChart3 className="h-4 w-4 text-gray-500" />
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Licencia</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${estadoBadge(orgDetail.suscripcion.estado)}`}>
                                    {orgDetail.suscripcion.estado}
                                  </span>
                                  <span className="text-sm font-medium text-gray-900">
                                    {orgDetail.suscripcion.planes?.nombre || 'Sin plan'}
                                  </span>
                                </div>
                                {orgDetail.suscripcion.trial_fin && (
                                  <p className="text-xs text-gray-500">
                                    Trial hasta: <span className="font-medium">{formatDate(orgDetail.suscripcion.trial_fin)}</span>
                                  </p>
                                )}
                              </div>
                              {orgDetail.limites && (
                                <div className="space-y-2">
                                  <UsageBar used={orgDetail.limites.equipos_usados} max={orgDetail.limites.max_equipos} label="Equipos" />
                                  <UsageBar used={orgDetail.limites.uso_storage_mb} max={orgDetail.limites.max_storage_mb} label="Storage (MB)" />
                                  <UsageBar used={orgDetail.limites.uso_ai_calls_month} max={orgDetail.limites.max_ai_calls_month} label="AI calls / mes" />
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Actions bar */}
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setInviteOrgId(org.id)
                              setGeneratedLink(null)
                              setInviteEmail('')
                              setInviteNombre('')
                              setInviteEquipoId('')
                              setInviteRolOrg('')
                              setInviteRol('segundo_entrenador')
                            }}
                            className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"
                          >
                            <Plus className="h-3 w-3" /> Generar codigo invitacion
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setChangingPlanOrg(changingPlanOrg === org.id ? null : org.id)
                            }}
                            className="text-xs px-3 py-1.5 bg-white border text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-1"
                          >
                            <CreditCard className="h-3 w-3" /> Cambiar plan
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowCreateTeam(showCreateTeam === org.id ? null : org.id)
                              setNewTeamName('')
                              setNewTeamCategoria('')
                              setNewTeamTemporada('')
                            }}
                            className="text-xs px-3 py-1.5 bg-white border text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-1"
                          >
                            <Trophy className="h-3 w-3" /> Crear equipo
                          </button>
                        </div>

                        {/* Change plan inline */}
                        {changingPlanOrg === org.id && (
                          <div className="bg-white p-3 rounded-lg border space-y-2">
                            <p className="text-xs font-medium text-gray-700">Selecciona nuevo plan:</p>
                            <div className="flex gap-2 flex-wrap">
                              {planes.map((p) => (
                                <button
                                  key={p.id}
                                  onClick={() => setSelectedPlan(p.codigo)}
                                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                                    selectedPlan === p.codigo
                                      ? 'bg-blue-600 text-white border-blue-600'
                                      : 'bg-white text-gray-600 hover:bg-gray-50'
                                  }`}
                                >
                                  {p.nombre}
                                </button>
                              ))}
                            </div>
                            {selectedPlan && (
                              <button
                                onClick={() => handleChangePlan(org.id)}
                                disabled={savingPlan}
                                className="text-xs px-4 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                              >
                                {savingPlan ? 'Guardando...' : 'Aplicar plan'}
                              </button>
                            )}
                          </div>
                        )}

                        {/* Invite form */}
                        {inviteOrgId === org.id && !generatedLink && (
                          <div className="bg-white p-3 rounded-lg border space-y-3">
                            <p className="text-xs font-medium text-gray-700">Crear invitacion:</p>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="email"
                                placeholder="Email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                className="text-sm px-3 py-1.5 border rounded-lg"
                              />
                              <input
                                type="text"
                                placeholder="Nombre (opcional)"
                                value={inviteNombre}
                                onChange={(e) => setInviteNombre(e.target.value)}
                                className="text-sm px-3 py-1.5 border rounded-lg"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs text-gray-500 mb-1 block">Rol</label>
                                <select
                                  value={inviteRol}
                                  onChange={(e) => setInviteRol(e.target.value)}
                                  className="w-full text-sm px-3 py-1.5 border rounded-lg bg-white"
                                >
                                  {ROLE_GROUPS.map((group) => (
                                    <optgroup key={group.label} label={group.label}>
                                      {group.roles.map((r) => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                      ))}
                                    </optgroup>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 mb-1 block">Equipo</label>
                                <select
                                  value={inviteEquipoId}
                                  onChange={(e) => setInviteEquipoId(e.target.value)}
                                  className="w-full text-sm px-3 py-1.5 border rounded-lg bg-white"
                                >
                                  <option value="">Auto (primer equipo)</option>
                                  {orgDetail?.equipos.map((eq) => (
                                    <option key={eq.id} value={eq.id}>
                                      {eq.nombre} {eq.categoria ? `(${eq.categoria})` : ''}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            {orgDetail?.limites && (
                              <p className="text-xs text-gray-400">
                                Limite: {orgDetail.limites.max_usuarios_por_equipo} usuarios/equipo · {orgDetail.limites.max_jugadores_por_equipo} jugadores/equipo
                              </p>
                            )}
                            <div className="flex gap-2">
                              <button
                                onClick={handleCreateInvite}
                                disabled={creatingInvite || !inviteEmail}
                                className="text-xs px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                              >
                                {creatingInvite ? 'Creando...' : 'Crear'}
                              </button>
                              <button
                                onClick={() => setInviteOrgId(null)}
                                className="text-xs px-4 py-1.5 bg-white border text-gray-600 rounded-lg hover:bg-gray-50"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Generated link */}
                        {generatedLink && inviteOrgId === org.id && (
                          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg">
                            <p className="text-xs font-medium text-emerald-800 mb-2">Enlace generado (expira en 30 dias):</p>
                            <div className="flex gap-2">
                              <input
                                value={generatedLink}
                                readOnly
                                className="flex-1 text-xs px-3 py-1.5 border rounded-lg bg-white font-mono"
                              />
                              <button
                                onClick={() => handleCopy(generatedLink)}
                                className="px-3 py-1.5 bg-white border rounded-lg hover:bg-gray-50"
                              >
                                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-gray-600" />}
                              </button>
                            </div>
                            <button
                              onClick={() => { setGeneratedLink(null); setInviteOrgId(null) }}
                              className="text-xs text-gray-500 mt-2 hover:text-gray-700"
                            >
                              Cerrar
                            </button>
                          </div>
                        )}

                        {/* Create team form */}
                        {showCreateTeam === org.id && (
                          <div className="bg-white p-3 rounded-lg border space-y-2">
                            <p className="text-xs font-medium text-gray-700">Crear equipo:</p>
                            <div className="grid grid-cols-3 gap-2">
                              <input
                                type="text"
                                placeholder="Nombre del equipo"
                                value={newTeamName}
                                onChange={(e) => setNewTeamName(e.target.value)}
                                className="text-sm px-3 py-1.5 border rounded-lg"
                                autoFocus
                              />
                              <input
                                type="text"
                                placeholder="Categoria (opcional)"
                                value={newTeamCategoria}
                                onChange={(e) => setNewTeamCategoria(e.target.value)}
                                className="text-sm px-3 py-1.5 border rounded-lg"
                              />
                              <input
                                type="text"
                                placeholder="Temporada (opcional)"
                                value={newTeamTemporada}
                                onChange={(e) => setNewTeamTemporada(e.target.value)}
                                className="text-sm px-3 py-1.5 border rounded-lg"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleCreateTeam(org.id)}
                                disabled={creatingTeam || !newTeamName.trim()}
                                className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                              >
                                {creatingTeam ? 'Creando...' : 'Crear'}
                              </button>
                              <button
                                onClick={() => setShowCreateTeam(null)}
                                className="text-xs px-3 py-1.5 bg-white border text-gray-600 rounded-lg hover:bg-gray-50"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Teams */}
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            Equipos ({orgDetail.equipos.length})
                            {orgDetail.limites && (
                              <span className="normal-case font-normal ml-1">
                                — {orgDetail.limites.equipos_usados} de {orgDetail.limites.max_equipos}
                              </span>
                            )}
                          </p>

                          {orgDetail.equipos.length === 0 ? (
                            <p className="text-xs text-gray-400">Sin equipos</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {orgDetail.equipos.map((eq) => (
                                <span key={eq.id} className="text-xs bg-white border px-3 py-1.5 rounded-full text-gray-700 flex items-center gap-1.5">
                                  {eq.nombre} {eq.categoria ? `(${eq.categoria})` : ''}
                                  {eq.num_miembros != null && (
                                    <span className="text-gray-400">· {eq.num_miembros} miembros</span>
                                  )}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Members */}
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Miembros ({orgDetail.miembros.length})</p>
                          <div className="space-y-1">
                            {orgDetail.miembros.map((m) => (
                              <div key={m.id} className="flex items-center justify-between bg-white p-2 rounded-lg border text-sm">
                                <div className="min-w-0">
                                  <span className="font-medium text-gray-900">{m.nombre} {m.apellidos || ''}</span>
                                  <span className="text-gray-400 ml-2">{m.email}</span>
                                </div>
                                <div className="flex gap-1 ml-2 items-center">
                                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{formatRole(m.rol)}</span>
                                  {m.usuarios_equipos?.map((ue) => (
                                    <span key={ue.equipo_id} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                                      {ue.equipos?.nombre}: {formatRole(ue.rol_en_equipo)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Pending invitations */}
                        {orgDetail.invitaciones_pendientes.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                              Invitaciones pendientes ({orgDetail.invitaciones_pendientes.length})
                            </p>
                            <div className="space-y-1">
                              {orgDetail.invitaciones_pendientes.map((inv) => (
                                <div key={inv.id} className="flex items-center justify-between bg-white p-2 rounded-lg border text-sm">
                                  <div>
                                    <span className="font-medium">{inv.nombre || inv.email}</span>
                                    <span className="text-gray-400 ml-2 text-xs">{formatRole(inv.rol_en_equipo)}</span>
                                    {inv.rol_organizacion && (
                                      <span className="text-purple-500 ml-1 text-xs">({formatRole(inv.rol_organizacion)})</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-gray-400">Exp: {formatDate(inv.expira_en)}</span>
                                    {inv.token && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleCopy(`${window.location.origin}/join?token=${inv.token}`)
                                        }}
                                        className="p-1 hover:bg-gray-100 rounded"
                                        title="Copiar enlace"
                                      >
                                        <Copy className="h-3.5 w-3.5 text-gray-500" />
                                      </button>
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleResendInvite(inv.id)
                                      }}
                                      className="p-1 hover:bg-blue-50 rounded"
                                      title="Renovar (+30 dias)"
                                    >
                                      <RotateCcw className="h-3.5 w-3.5 text-blue-500" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleRevokeInvite(inv.id, inv.email, org.id)
                                      }}
                                      className="p-1 hover:bg-red-50 rounded"
                                      title="Revocar invitacion"
                                    >
                                      <Trash2 className="h-3.5 w-3.5 text-red-400" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ))}

            {filteredOrgs.length === 0 && orgs.length > 0 && (
              <div className="bg-white rounded-xl border p-8 text-center">
                <Search className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No se encontraron organizaciones para &quot;{orgSearch}&quot;</p>
              </div>
            )}

            {orgs.length === 0 && (
              <div className="bg-white rounded-xl border p-8 text-center">
                <Building className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No hay organizaciones registradas</p>
              </div>
            )}
          </div>
        )}

        {/* Users list */}
        {showUsers && (
          <div className="bg-white rounded-xl border">
            <div className="p-4 border-b">
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
                    className="w-full text-sm pl-9 pr-3 py-2 border rounded-lg"
                  />
                </div>
                <button onClick={loadUsers} className="px-3 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800">
                  Buscar
                </button>
              </div>
            </div>

            {loadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="divide-y">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-gray-900">
                        {u.nombre} {u.apellidos || ''}
                        {u.activo === false && (
                          <span className="ml-1.5 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Inactivo</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{formatRole(u.rol)}</span>
                      {u.organizaciones && (
                        <span className="text-xs text-gray-400">{u.organizaciones.nombre}</span>
                      )}
                      <span className="text-xs text-gray-300">{formatDate(u.created_at)}</span>

                      {/* Change role button */}
                      {changingRoleUserId === u.id ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value)}
                            className="text-xs px-2 py-1 border rounded bg-white"
                          >
                            <option value="">Seleccionar...</option>
                            {ALL_ROLES.map(r => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                          {newRole && (
                            <button
                              onClick={() => handleChangeRole(u.id)}
                              className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              OK
                            </button>
                          )}
                          <button onClick={() => setChangingRoleUserId(null)} className="p-0.5">
                            <X className="h-3.5 w-3.5 text-gray-400" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setChangingRoleUserId(u.id); setNewRole('') }}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="Cambiar rol"
                        >
                          <UserCog className="h-3.5 w-3.5 text-gray-400" />
                        </button>
                      )}

                      {/* Delete user button */}
                      {u.activo !== false && (
                        <button
                          onClick={() => handleDeleteUser(u.id, `${u.nombre} ${u.apellidos || ''}`)}
                          className="p-1 hover:bg-red-50 rounded"
                          title="Desactivar usuario"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {users.length === 0 && (
                  <div className="py-8 text-center text-sm text-gray-400">No se encontraron usuarios</div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
