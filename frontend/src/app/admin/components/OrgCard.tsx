'use client'

import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Loader2,
  X,
  CreditCard,
  BarChart3,
  UserCog,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api/client'
import type { Org, OrgDetail, Plan } from './types'
import { formatDate, estadoBadge } from './helpers'

interface Props {
  org: Org
  isExpanded: boolean
  orgDetail: OrgDetail | null
  loadingDetail: boolean
  planes: Plan[]
  onToggle: () => void
  onReload: () => void
  onReloadData: () => void
  onRemoveInvite: (inviteId: string) => void
  onConfirm: (opts: { title: string; message: string; confirmLabel?: string; confirmColor?: string; action: () => Promise<void> }) => void
}

function UsageBar({ used, max, label }: { used: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900 tabular-nums">{used} / {max}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function OrgCard({
  org,
  isExpanded,
  orgDetail,
  loadingDetail,
  planes,
  onToggle,
  onReload,
  onReloadData,
  onConfirm,
}: Props) {
  // Edit org name
  const [editingName, setEditingName] = useState(false)
  const [editName, setEditName] = useState('')
  const [savingName, setSavingName] = useState(false)

  // Plan change
  const [showPlanChange, setShowPlanChange] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState('')

  // Administrador del club
  const [editingAdmin, setEditingAdmin] = useState(false)
  const [adminUsername, setAdminUsername] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminNombre, setAdminNombre] = useState('')
  const [savingAdmin, setSavingAdmin] = useState(false)

  const handleEditName = async () => {
    if (!editName.trim()) return
    setSavingName(true)
    try {
      await api.patch(`/admin/organizaciones/${org.id}`, { nombre: editName.trim() })
      setEditingName(false)
      toast.success('Nombre actualizado')
      onReloadData()
      if (isExpanded) onReload()
    } catch (err: any) {
      toast.error(err.message || 'Error')
    } finally {
      setSavingName(false)
    }
  }

  const handleChangePlan = () => {
    if (!selectedPlan) return
    const planName = planes.find(p => p.codigo === selectedPlan)?.nombre || selectedPlan
    onConfirm({
      title: 'Cambiar plan',
      message: `Vas a cambiar el plan a "${planName}". Se registrara en el audit log.`,
      confirmLabel: 'Cambiar plan',
      confirmColor: 'bg-blue-600 hover:bg-blue-700',
      action: async () => {
        await api.patch(`/admin/organizaciones/${org.id}/suscripcion`, {
          plan_codigo: selectedPlan,
          estado: 'active',
        })
        setShowPlanChange(false)
        setSelectedPlan('')
        toast.success('Plan actualizado')
        onReloadData()
        onReload()
      },
    })
  }

  const startEditAdmin = () => {
    setAdminUsername(orgDetail?.administrador_club?.username || '')
    setAdminNombre(orgDetail?.administrador_club?.nombre || '')
    setAdminPassword('')
    setEditingAdmin(true)
  }

  const handleSaveAdmin = async () => {
    if (adminPassword && adminPassword.length < 8) {
      toast.error('La contrasena debe tener al menos 8 caracteres')
      return
    }
    setSavingAdmin(true)
    try {
      await api.patch(`/admin/organizaciones/${org.id}/administrador`, {
        username: adminUsername.trim() || undefined,
        password: adminPassword || undefined,
        nombre: adminNombre.trim() || undefined,
      })
      toast.success('Administrador del club actualizado')
      setEditingAdmin(false)
      setAdminPassword('')
      onReload()
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar')
    } finally {
      setSavingAdmin(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border overflow-hidden hover:shadow-sm transition-shadow">
      {/* Header row */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50/80 transition-colors"
        onClick={onToggle}
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center text-blue-700 font-bold text-lg shrink-0">
          {org.nombre?.charAt(0)?.toUpperCase() || '?'}
        </div>

        <div className="flex-1 min-w-0">
          {editingName ? (
            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="text-sm px-2.5 py-1 border rounded-lg font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') handleEditName()
                  if (e.key === 'Escape') setEditingName(false)
                }}
              />
              <button onClick={handleEditName} disabled={savingName} className="text-xs px-2.5 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium">
                {savingName ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Guardar'}
              </button>
              <button onClick={() => setEditingName(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5 group">
                <p className="font-semibold text-gray-900 truncate">{org.nombre}</p>
                <button
                  onClick={e => { e.stopPropagation(); setEditingName(true); setEditName(org.nombre) }}
                  className="p-0.5 text-gray-300 opacity-0 group-hover:opacity-100 hover:text-gray-500 rounded transition-opacity"
                  title="Editar nombre"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </div>
              <p className="text-xs text-gray-500">
                {org.num_equipos} equipos · {formatDate(org.created_at)}
              </p>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {org.suscripcion ? (
            <>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${estadoBadge(org.suscripcion.estado)}`}>
                {org.suscripcion.estado}
              </span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full hidden sm:inline">
                {org.suscripcion.planes?.nombre || 'Sin plan'}
              </span>
            </>
          ) : (
            <span className="text-xs text-gray-400 italic">Sin suscripcion</span>
          )}
          <div className="w-5 flex justify-center">
            {isExpanded
              ? <ChevronDown className="h-4 w-4 text-gray-400" />
              : <ChevronRight className="h-4 w-4 text-gray-400" />
            }
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="border-t bg-gray-50/50 p-4 space-y-4">
          {loadingDetail ? (
            <div className="flex items-center gap-2 py-8 justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              <span className="text-sm text-gray-500">Cargando detalle...</span>
            </div>
          ) : orgDetail ? (
            <>
              {/* License + Usage */}
              {orgDetail.suscripcion && (
                <div className="bg-white p-4 rounded-xl border">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="h-4 w-4 text-gray-400" />
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Licencia y uso</p>
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
                      <div className="space-y-2.5">
                        <UsageBar used={orgDetail.limites.equipos_usados} max={orgDetail.limites.max_equipos} label="Equipos" />
                        <UsageBar used={orgDetail.limites.uso_storage_mb} max={orgDetail.limites.max_storage_mb} label="Storage (MB)" />
                        <UsageBar used={orgDetail.limites.uso_ai_calls_month} max={orgDetail.limites.max_ai_calls_month} label="AI calls / mes" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => { setShowPlanChange(!showPlanChange); setSelectedPlan('') }}
                  className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 font-medium border transition-colors ${showPlanChange ? 'bg-gray-100 border-gray-300' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                >
                  <CreditCard className="h-3 w-3" /> Cambiar plan
                </button>
              </div>

              {/* Plan change */}
              {showPlanChange && (
                <div className="bg-white p-3 rounded-xl border space-y-2">
                  <p className="text-xs font-medium text-gray-700">Selecciona nuevo plan:</p>
                  <div className="flex gap-2 flex-wrap">
                    {planes.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPlan(p.codigo)}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                          selectedPlan === p.codigo
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {p.nombre}
                      </button>
                    ))}
                  </div>
                  {selectedPlan && (
                    <button onClick={handleChangePlan} className="text-xs px-4 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium">
                      Aplicar plan
                    </button>
                  )}
                </div>
              )}

              {/* Administrador del club */}
              <div className="bg-white p-4 rounded-xl border">
                <div className="flex items-center gap-2 mb-3">
                  <UserCog className="h-4 w-4 text-gray-400" />
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Administrador del club</p>
                </div>

                {!orgDetail.administrador_club ? (
                  <p className="text-xs text-gray-400 italic">Este club no tiene administrador asignado todavia.</p>
                ) : editingAdmin ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Usuario"
                        value={adminUsername}
                        onChange={e => setAdminUsername(e.target.value)}
                        className="text-sm px-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        autoFocus
                      />
                      <input
                        type="text"
                        placeholder="Nombre"
                        value={adminNombre}
                        onChange={e => setAdminNombre(e.target.value)}
                        className="text-sm px-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Nueva contrasena (opcional)"
                        value={adminPassword}
                        onChange={e => setAdminPassword(e.target.value)}
                        className="text-sm px-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveAdmin}
                        disabled={savingAdmin || !adminUsername.trim()}
                        className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium flex items-center gap-1"
                      >
                        {savingAdmin ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        Guardar
                      </button>
                      <button onClick={() => setEditingAdmin(false)} className="text-xs px-3 py-1.5 bg-white border text-gray-600 rounded-lg hover:bg-gray-50">
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {orgDetail.administrador_club.nombre}
                        {orgDetail.administrador_club.username && (
                          <span className="text-gray-400 ml-2 text-xs font-mono">@{orgDetail.administrador_club.username}</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400">Desde {formatDate(orgDetail.administrador_club.created_at)}</p>
                    </div>
                    <button
                      onClick={startEditAdmin}
                      className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-1 font-medium"
                    >
                      <Pencil className="h-3 w-3" /> Editar
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}
