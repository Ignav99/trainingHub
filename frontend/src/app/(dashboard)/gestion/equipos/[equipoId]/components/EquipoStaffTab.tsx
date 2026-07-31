'use client'

import { useEffect, useState } from 'react'
import { Loader2, UserPlus, X } from 'lucide-react'
import { toast } from 'sonner'
import { clubAdminApi } from '@/lib/api/clubAdmin'
import type { EquipoStaffMember } from '../../../components/types'
import { ROLES_EN_EQUIPO, formatRole } from '../../../components/types'

interface EquipoStaffTabProps {
  equipoId: string
}

export default function EquipoStaffTab({ equipoId }: EquipoStaffTabProps) {
  const [staff, setStaff] = useState<EquipoStaffMember[]>([])
  const [loading, setLoading] = useState(true)

  // Invite form
  const [showInvite, setShowInvite] = useState(false)
  const [invEmail, setInvEmail] = useState('')
  const [invNombre, setInvNombre] = useState('')
  const [invRol, setInvRol] = useState('segundo_entrenador')
  const [inviting, setInviting] = useState(false)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)

  // Unlink confirmation
  const [unlinkTarget, setUnlinkTarget] = useState<EquipoStaffMember | null>(null)
  const [unlinking, setUnlinking] = useState(false)

  const load = () => {
    setLoading(true)
    clubAdminApi
      .getEquipoStaff(equipoId)
      .then(setStaff)
      .catch((err: any) => toast.error(err.message || 'Error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [equipoId])

  const handleInvite = async () => {
    if (!invEmail.trim()) return
    setInviting(true)
    try {
      const result = await clubAdminApi.inviteStaff({
        email: invEmail.trim(),
        nombre: invNombre.trim() || undefined,
        equipo_id: equipoId,
        rol_en_equipo: invRol,
      })
      setGeneratedLink(window.location.origin + result.link)
      toast.success('Invitacion creada')
      load()
    } catch (err: any) {
      toast.error(err.message || 'Error')
    } finally {
      setInviting(false)
    }
  }

  const handleUnlink = async () => {
    if (!unlinkTarget) return
    setUnlinking(true)
    try {
      await clubAdminApi.unlinkStaffFromEquipo(equipoId, unlinkTarget.usuario_id)
      toast.success('Staff desvinculado del equipo')
      setUnlinkTarget(null)
      load()
    } catch (err: any) {
      toast.error(err.message || 'Error')
    } finally {
      setUnlinking(false)
    }
  }

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
      <div className="flex items-center justify-end">
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
              <select
                value={invRol}
                onChange={(e) => setInvRol(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-auto"
              >
                {ROLES_EN_EQUIPO.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
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
                <th className="text-left px-4 py-3 font-medium text-gray-500">Rol en el equipo</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {staff.map(s => (
                <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {s.usuarios?.nombre} {s.usuarios?.apellidos || ''}
                    {s.usuarios && !s.usuarios.activo && (
                      <span className="ml-1.5 text-xs text-red-500">(inactivo)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.usuarios?.email}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      {formatRole(s.rol_en_equipo)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setUnlinkTarget(s)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      <X className="h-3.5 w-3.5" />
                      Quitar del equipo
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {staff.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">Este equipo aun no tiene staff vinculado</div>
        )}
      </div>

      {/* Unlink confirmation modal */}
      {unlinkTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="font-semibold mb-2">
              ¿Quitar a {unlinkTarget.usuarios?.nombre} de este equipo?
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Su cuenta sigue activa en el club, solo deja de estar vinculado a este equipo.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setUnlinkTarget(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Cancelar
              </button>
              <button
                onClick={handleUnlink}
                disabled={unlinking}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {unlinking && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {unlinking ? 'Quitando...' : 'Quitar del equipo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
