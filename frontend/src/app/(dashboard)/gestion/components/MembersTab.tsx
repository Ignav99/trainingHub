'use client'

import { useEffect, useState } from 'react'
import { Loader2, UserMinus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { clubAdminApi } from '@/lib/api/clubAdmin'
import type { ClubMiembro, ClubEquipo } from './types'
import { formatRole, formatDate, CLUB_ROLES } from './types'
import MassInviteDialog from './MassInviteDialog'

export default function MembersTab() {
  const [miembros, setMiembros] = useState<ClubMiembro[]>([])
  const [equipos, setEquipos] = useState<ClubEquipo[]>([])
  const [loading, setLoading] = useState(true)
  const [showMassInvite, setShowMassInvite] = useState(false)

  // Confirm dialog
  const [confirmAction, setConfirmAction] = useState<{
    type: 'role' | 'deactivate'
    userId: string
    userName: string
    newRole?: string
  } | null>(null)
  const [confirming, setConfirming] = useState(false)

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

  const handleChangeRole = async () => {
    if (!confirmAction || confirmAction.type !== 'role' || !confirmAction.newRole) return
    setConfirming(true)
    try {
      await clubAdminApi.changeMemberRole(confirmAction.userId, confirmAction.newRole)
      toast.success('Rol actualizado')
      setConfirmAction(null)
      loadData()
    } catch (err: any) {
      toast.error(err.message || 'Error')
    } finally {
      setConfirming(false)
    }
  }

  const handleDeactivate = async () => {
    if (!confirmAction || confirmAction.type !== 'deactivate') return
    setConfirming(true)
    try {
      await clubAdminApi.deactivateMember(confirmAction.userId)
      toast.success('Usuario desactivado')
      setConfirmAction(null)
      loadData()
    } catch (err: any) {
      toast.error(err.message || 'Error')
    } finally {
      setConfirming(false)
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
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          {miembros.length} miembro{miembros.length !== 1 ? 's' : ''}
        </h3>
        <button
          onClick={() => setShowMassInvite(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
        >
          <Users className="h-4 w-4" />
          Invitacion masiva
        </button>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Rol</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Equipos</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Ultimo login</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {miembros.map(m => (
                <tr key={m.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {m.nombre} {m.apellidos || ''}
                    {!m.activo && <span className="ml-1.5 text-xs text-red-500">(inactivo)</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{m.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={m.rol}
                      onChange={(e) => {
                        setConfirmAction({
                          type: 'role',
                          userId: m.id,
                          userName: `${m.nombre} ${m.apellidos || ''}`.trim(),
                          newRole: e.target.value,
                        })
                      }}
                      className="border rounded-md px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      {CLUB_ROLES.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {m.usuarios_equipos?.map(ue => ue.equipos?.nombre).filter(Boolean).join(', ') || '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 tabular-nums text-xs">
                    {m.ultimo_acceso ? new Date(m.ultimo_acceso).toLocaleDateString('es-ES') : 'Nunca'}
                  </td>
                  <td className="px-4 py-3">
                    {m.activo && (
                      <button
                        onClick={() => setConfirmAction({
                          type: 'deactivate',
                          userId: m.id,
                          userName: `${m.nombre} ${m.apellidos || ''}`.trim(),
                        })}
                        className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600"
                        title="Desactivar usuario"
                      >
                        <UserMinus className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {confirmAction.type === 'role' ? 'Cambiar rol' : 'Desactivar usuario'}
            </h3>
            <p className="text-sm text-gray-600">
              {confirmAction.type === 'role'
                ? `Cambiar el rol de ${confirmAction.userName} a "${formatRole(confirmAction.newRole!)}"?`
                : `Desactivar a ${confirmAction.userName}? No podra acceder a la plataforma.`
              }
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
              >
                Cancelar
              </button>
              <button
                onClick={confirmAction.type === 'role' ? handleChangeRole : handleDeactivate}
                disabled={confirming}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-white text-sm font-medium disabled:opacity-50 ${
                  confirmAction.type === 'deactivate' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {confirming && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      <MassInviteDialog
        equipos={equipos}
        open={showMassInvite}
        onClose={() => { setShowMassInvite(false); loadData() }}
      />
    </div>
  )
}
