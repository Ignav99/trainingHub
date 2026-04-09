'use client'

import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Loader2,
  X,
  Plus,
  CreditCard,
  Trophy,
  Copy,
  Check,
  BarChart3,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api/client'
import type { Org, OrgDetail, Plan } from './types'
import { ROLE_GROUPS, DIRECTIVA_ROLES } from './types'
import { formatDate, formatRole, estadoBadge } from './helpers'

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
  onRemoveInvite,
  onConfirm,
}: Props) {
  // Edit org name
  const [editingName, setEditingName] = useState(false)
  const [editName, setEditName] = useState('')
  const [savingName, setSavingName] = useState(false)

  // Create team
  const [showTeamForm, setShowTeamForm] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [teamCat, setTeamCat] = useState('')
  const [teamTemp, setTeamTemp] = useState('')
  const [creatingTeam, setCreatingTeam] = useState(false)

  // Invite
  const [showInvite, setShowInvite] = useState(false)
  const [invEmail, setInvEmail] = useState('')
  const [invNombre, setInvNombre] = useState('')
  const [invRol, setInvRol] = useState('segundo_entrenador')
  const [invEquipoId, setInvEquipoId] = useState('')
  const [creatingInvite, setCreatingInvite] = useState(false)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Plan change
  const [showPlanChange, setShowPlanChange] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState('')

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

  const handleCreateTeam = async () => {
    if (!teamName.trim()) return
    setCreatingTeam(true)
    try {
      await api.post(`/admin/organizaciones/${org.id}/equipos`, {
        nombre: teamName.trim(),
        categoria: teamCat || undefined,
        temporada: teamTemp || undefined,
      })
      setShowTeamForm(false)
      setTeamName('')
      setTeamCat('')
      setTeamTemp('')
      toast.success('Equipo creado')
      onReload()
      onReloadData()
    } catch (err: any) {
      toast.error(err.message || 'Error al crear equipo')
    } finally {
      setCreatingTeam(false)
    }
  }

  const handleInvite = async () => {
    if (!invEmail) return
    setCreatingInvite(true)
    try {
      const isDir = DIRECTIVA_ROLES.includes(invRol)
      const result = await api.post<{ token: string }>('/admin/invitaciones', {
        organizacion_id: org.id,
        email: invEmail,
        nombre: invNombre || undefined,
        rol_en_equipo: isDir ? 'delegado' : invRol,
        equipo_id: invEquipoId || undefined,
        rol_organizacion: isDir ? invRol : undefined,
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

  const handleRevokeInvite = (inviteId: string, email: string) => {
    onConfirm({
      title: 'Revocar invitacion',
      message: `El enlace de "${email}" dejara de funcionar.`,
      confirmLabel: 'Revocar',
      action: async () => {
        await api.delete(`/admin/invitaciones/${inviteId}`)
        toast.success('Invitacion revocada')
        onRemoveInvite(inviteId)
        onReload()
      },
    })
  }

  const handleResendInvite = async (inviteId: string) => {
    try {
      await api.post(`/admin/invitaciones/${inviteId}/resend`, {})
      toast.success('Invitacion renovada (+30 dias)')
      onReload()
    } catch (err: any) {
      toast.error(err.message || 'Error')
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
                {org.num_miembros} miembros · {org.num_equipos} equipos · {formatDate(org.created_at)}
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
                  onClick={() => { setShowInvite(!showInvite); setGeneratedLink(null); setInvEmail(''); setInvNombre(''); setInvEquipoId(''); setInvRol('segundo_entrenador') }}
                  className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 font-medium transition-colors ${showInvite ? 'bg-blue-700 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                >
                  <Plus className="h-3 w-3" /> Invitar miembro
                </button>
                <button
                  onClick={() => { setShowPlanChange(!showPlanChange); setSelectedPlan('') }}
                  className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 font-medium border transition-colors ${showPlanChange ? 'bg-gray-100 border-gray-300' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                >
                  <CreditCard className="h-3 w-3" /> Cambiar plan
                </button>
                <button
                  onClick={() => { setShowTeamForm(!showTeamForm); setTeamName(''); setTeamCat(''); setTeamTemp('') }}
                  className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 font-medium border transition-colors ${showTeamForm ? 'bg-gray-100 border-gray-300' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                >
                  <Trophy className="h-3 w-3" /> Crear equipo
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

              {/* Invite form */}
              {showInvite && !generatedLink && (
                <div className="bg-white p-3 rounded-xl border space-y-3">
                  <p className="text-xs font-medium text-gray-700">Nueva invitacion:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="email" placeholder="Email" value={invEmail} onChange={e => setInvEmail(e.target.value)} className="text-sm px-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                    <input type="text" placeholder="Nombre (opcional)" value={invNombre} onChange={e => setInvNombre(e.target.value)} className="text-sm px-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Rol</label>
                      <select value={invRol} onChange={e => setInvRol(e.target.value)} className="w-full text-sm px-3 py-1.5 border rounded-lg bg-white">
                        {ROLE_GROUPS.map(g => (
                          <optgroup key={g.label} label={g.label}>
                            {g.roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Equipo</label>
                      <select value={invEquipoId} onChange={e => setInvEquipoId(e.target.value)} className="w-full text-sm px-3 py-1.5 border rounded-lg bg-white">
                        <option value="">Auto (primer equipo)</option>
                        {orgDetail.equipos.map(eq => (
                          <option key={eq.id} value={eq.id}>{eq.nombre} {eq.categoria ? `(${eq.categoria})` : ''}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {orgDetail.limites && (
                    <p className="text-xs text-gray-400">
                      Limite: {orgDetail.limites.max_usuarios_por_equipo} usuarios/equipo · {orgDetail.limites.max_jugadores_por_equipo} jugadores/equipo
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button onClick={handleInvite} disabled={creatingInvite || !invEmail} className="text-xs px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center gap-1">
                      {creatingInvite && <Loader2 className="h-3 w-3 animate-spin" />}
                      {creatingInvite ? 'Creando...' : 'Crear invitacion'}
                    </button>
                    <button onClick={() => setShowInvite(false)} className="text-xs px-4 py-1.5 bg-white border text-gray-600 rounded-lg hover:bg-gray-50">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Generated link */}
              {generatedLink && showInvite && (
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                  <p className="text-xs font-medium text-emerald-800 mb-2">Enlace generado (expira en 30 dias):</p>
                  <div className="flex gap-2">
                    <input value={generatedLink} readOnly className="flex-1 text-xs px-3 py-1.5 border rounded-lg bg-white font-mono" />
                    <button onClick={() => handleCopy(generatedLink)} className="px-3 py-1.5 bg-white border rounded-lg hover:bg-gray-50 transition-colors">
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-gray-600" />}
                    </button>
                  </div>
                  <button onClick={() => { setGeneratedLink(null); setShowInvite(false) }} className="text-xs text-gray-500 mt-2 hover:text-gray-700">
                    Cerrar
                  </button>
                </div>
              )}

              {/* Create team form */}
              {showTeamForm && (
                <div className="bg-white p-3 rounded-xl border space-y-2">
                  <p className="text-xs font-medium text-gray-700">Nuevo equipo:</p>
                  <div className="grid grid-cols-3 gap-2">
                    <input type="text" placeholder="Nombre" value={teamName} onChange={e => setTeamName(e.target.value)} className="text-sm px-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" autoFocus />
                    <input type="text" placeholder="Categoria" value={teamCat} onChange={e => setTeamCat(e.target.value)} className="text-sm px-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                    <input type="text" placeholder="Temporada" value={teamTemp} onChange={e => setTeamTemp(e.target.value)} className="text-sm px-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleCreateTeam} disabled={creatingTeam || !teamName.trim()} className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium flex items-center gap-1">
                      {creatingTeam && <Loader2 className="h-3 w-3 animate-spin" />}
                      {creatingTeam ? 'Creando...' : 'Crear equipo'}
                    </button>
                    <button onClick={() => setShowTeamForm(false)} className="text-xs px-3 py-1.5 bg-white border text-gray-600 rounded-lg hover:bg-gray-50">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Teams */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Equipos ({orgDetail.equipos.length})
                  {orgDetail.limites && (
                    <span className="normal-case font-normal ml-1 text-gray-400">
                      — {orgDetail.limites.equipos_usados}/{orgDetail.limites.max_equipos}
                    </span>
                  )}
                </p>
                {orgDetail.equipos.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Sin equipos</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {orgDetail.equipos.map(eq => (
                      <span key={eq.id} className="text-xs bg-white border px-3 py-1.5 rounded-full text-gray-700 flex items-center gap-1.5">
                        <Trophy className="h-3 w-3 text-gray-400" />
                        {eq.nombre} {eq.categoria ? `(${eq.categoria})` : ''}
                        {eq.num_miembros != null && <span className="text-gray-400">· {eq.num_miembros}</span>}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Members */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Miembros ({orgDetail.miembros.length})</p>
                <div className="space-y-1">
                  {orgDetail.miembros.map(m => (
                    <div key={m.id} className="flex items-center justify-between bg-white p-2.5 rounded-lg border text-sm hover:shadow-sm transition-shadow">
                      <div className="min-w-0">
                        <span className="font-medium text-gray-900">{m.nombre} {m.apellidos || ''}</span>
                        <span className="text-gray-400 ml-2 text-xs">{m.email}</span>
                      </div>
                      <div className="flex gap-1 ml-2 items-center flex-wrap justify-end">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{formatRole(m.rol)}</span>
                        {m.usuarios_equipos?.map(ue => (
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
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Invitaciones pendientes ({orgDetail.invitaciones_pendientes.length})
                  </p>
                  <div className="space-y-1">
                    {orgDetail.invitaciones_pendientes.map(inv => (
                      <div key={inv.id} className="flex items-center justify-between bg-white p-2.5 rounded-lg border text-sm">
                        <div>
                          <span className="font-medium">{inv.nombre || inv.email}</span>
                          <span className="text-gray-400 ml-2 text-xs">{formatRole(inv.rol_en_equipo)}</span>
                          {inv.rol_organizacion && (
                            <span className="text-purple-500 ml-1 text-xs">({formatRole(inv.rol_organizacion)})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-400 mr-1">Exp: {formatDate(inv.expira_en)}</span>
                          {inv.token && (
                            <button onClick={() => handleCopy(`${window.location.origin}/join?token=${inv.token}`)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Copiar enlace">
                              <Copy className="h-3.5 w-3.5 text-gray-500" />
                            </button>
                          )}
                          <button onClick={() => handleResendInvite(inv.id)} className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors" title="Renovar (+30 dias)">
                            <RotateCcw className="h-3.5 w-3.5 text-blue-500" />
                          </button>
                          <button onClick={() => handleRevokeInvite(inv.id, inv.email)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors" title="Revocar">
                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}
