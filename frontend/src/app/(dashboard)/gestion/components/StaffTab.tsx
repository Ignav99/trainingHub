'use client'

import { useEffect, useState } from 'react'
import { Loader2, Plus, X, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { clubAdminApi } from '@/lib/api/clubAdmin'
import type { ClubMiembro, ClubEquipo } from './types'
import { formatRole, formatDate } from './types'

export default function StaffTab() {
  const [miembros, setMiembros] = useState<ClubMiembro[]>([])
  const [equipos, setEquipos] = useState<ClubEquipo[]>([])
  const [loading, setLoading] = useState(true)
  const [filterTeam, setFilterTeam] = useState('')
  const [filterRole, setFilterRole] = useState('')

  // Invite form
  const [showInvite, setShowInvite] = useState(false)
  const [invEmail, setInvEmail] = useState('')
  const [invNombre, setInvNombre] = useState('')
  const [invRol, setInvRol] = useState('segundo_entrenador')
  const [invEquipo, setInvEquipo] = useState('')
  const [inviting, setInviting] = useState(false)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [m, e] = await Promise.all([
        clubAdminApi.getMiembros(),
        clubAdminApi.getEquipos(),
      ])
      setMiembros(m)
      setEquipos(e)
    } catch (err: any) {
      toast.error(err.message || 'Error')
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async () => {
    if (!invEmail.trim()) return
    setInviting(true)
    try {
      const result = await clubAdminApi.inviteStaff({
        email: invEmail.trim(),
        nombre: invNombre.trim() || undefined,
        equipo_id: invEquipo || undefined,
        rol_en_equipo: invRol,
      })
      setGeneratedLink(window.location.origin + result.link)
      toast.success('Invitacion creada')
    } catch (err: any) {
      toast.error(err.message || 'Error')
    } finally {
      setInviting(false)
    }
  }

  const filtered = miembros.filter(m => {
    if (filterTeam) {
      const hasTeam = m.usuarios_equipos?.some(ue => ue.equipo_id === filterTeam)
      if (!hasTeam) return false
    }
    if (filterRole && m.rol !== filterRole) return false
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <select
            value={filterTeam}
            onChange={(e) => setFilterTeam(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Todos los equipos</option>
            {equipos.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Todos los roles</option>
            <option value="tecnico_principal">Entrenador Principal</option>
            <option value="segundo_entrenador">2do Entrenador</option>
            <option value="preparador_fisico">Preparador Fisico</option>
            <option value="analista">Analista</option>
            <option value="delegado">Delegado</option>
          </select>
        </div>
        <button
          onClick={() => { setShowInvite(true); setGeneratedLink(null) }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Invitar staff
        </button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <div className="bg-white rounded-xl border p-4 space-y-3">
          {!generatedLink ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  value={invEmail}
                  onChange={(e) => setInvEmail(e.target.value)}
                  placeholder="Email"
                  type="email"
                  className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  autoFocus
                />
                <input
                  value={invNombre}
                  onChange={(e) => setInvNombre(e.target.value)}
                  placeholder="Nombre (opcional)"
                  className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={invRol}
                  onChange={(e) => setInvRol(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="segundo_entrenador">2do Entrenador</option>
                  <option value="preparador_fisico">Preparador Fisico</option>
                  <option value="entrenador_porteros">Entr. Porteros</option>
                  <option value="analista">Analista</option>
                  <option value="fisio">Fisioterapeuta</option>
                  <option value="delegado">Delegado</option>
                </select>
                <select
                  value={invEquipo}
                  onChange={(e) => setInvEquipo(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Equipo (auto)</option>
                  {equipos.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowInvite(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900">
                  Cancelar
                </button>
                <button
                  onClick={handleInvite}
                  disabled={inviting || !invEmail.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {inviting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Enviar invitacion
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-green-700 font-medium">Invitacion creada. Comparte este enlace:</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={generatedLink}
                  className="flex-1 bg-gray-50 border rounded-lg px-3 py-2 text-sm text-gray-700"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={() => { navigator.clipboard.writeText(generatedLink); toast.success('Copiado') }}
                  className="px-3 py-2 rounded-lg bg-gray-100 text-sm hover:bg-gray-200"
                >
                  Copiar
                </button>
              </div>
              <button onClick={() => { setShowInvite(false); setGeneratedLink(null) }} className="text-sm text-gray-500 hover:text-gray-700">
                Cerrar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Staff table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Rol</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Equipos</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Alta</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {m.nombre} {m.apellidos || ''}
                    {!m.activo && <span className="ml-1.5 text-xs text-red-500">(inactivo)</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{m.email}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      {formatRole(m.rol)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {m.usuarios_equipos?.map(ue => ue.equipos?.nombre).filter(Boolean).join(', ') || '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 tabular-nums">{formatDate(m.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">No hay miembros con estos filtros</div>
        )}
      </div>
    </div>
  )
}
