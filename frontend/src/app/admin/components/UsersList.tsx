'use client'

import { useState } from 'react'
import { Search, Loader2, UserCog, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api/client'
import type { UserRecord } from './types'
import { ALL_ROLES } from './types'
import { formatDate, formatRole } from './helpers'

interface Props {
  onConfirm: (opts: { title: string; message: string; confirmLabel?: string; confirmColor?: string; action: () => Promise<void> }) => void
}

const PAGE_SIZE = 25

export default function UsersList({ onConfirm }: Props) {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [loaded, setLoaded] = useState(false)

  // Role change
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null)
  const [newRole, setNewRole] = useState('')

  const loadUsers = async (p = 1, s = search) => {
    setLoading(true)
    try {
      const result = await api.get<{ data: UserRecord[]; total: number }>('/admin/usuarios', {
        params: { page: p, limit: PAGE_SIZE, search: s || undefined },
      })
      setUsers(result.data)
      setTotal(result.total)
      setPage(p)
      setLoaded(true)
    } catch {
      toast.error('Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    loadUsers(1, search)
  }

  const handleChangeRole = (userId: string) => {
    if (!newRole) return
    onConfirm({
      title: 'Cambiar rol',
      message: `Vas a cambiar el rol a "${formatRole(newRole)}". Se registrara en el audit log.`,
      confirmLabel: 'Cambiar rol',
      confirmColor: 'bg-blue-600 hover:bg-blue-700',
      action: async () => {
        await api.patch(`/admin/usuarios/${userId}/rol`, { rol: newRole })
        setChangingRoleId(null)
        setNewRole('')
        toast.success('Rol actualizado')
        loadUsers(page)
      },
    })
  }

  const handleDelete = (userId: string, name: string) => {
    onConfirm({
      title: 'Desactivar usuario',
      message: `"${name}" no podra acceder a la plataforma. Se registra en el audit log.`,
      confirmLabel: 'Desactivar',
      action: async () => {
        await api.delete(`/admin/usuarios/${userId}`)
        toast.success('Usuario desactivado')
        loadUsers(page)
      },
    })
  }

  // Load on first render
  if (!loaded && !loading) {
    loadUsers()
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="bg-white rounded-xl border">
      {/* Search bar */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="w-full text-sm pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <button onClick={handleSearch} className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 font-medium transition-colors">
            Buscar
          </button>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          <div className="divide-y">
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50/80 transition-colors">
                <div className="min-w-0">
                  <p className="font-medium text-sm text-gray-900">
                    {u.nombre} {u.apellidos || ''}
                    {u.activo === false && (
                      <span className="ml-1.5 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">Inactivo</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{formatRole(u.rol)}</span>
                  {u.organizaciones && (
                    <span className="text-xs text-gray-400 hidden sm:inline">{u.organizaciones.nombre}</span>
                  )}
                  <span className="text-xs text-gray-300 hidden md:inline">{formatDate(u.created_at)}</span>

                  {/* Change role */}
                  {changingRoleId === u.id ? (
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <select value={newRole} onChange={e => setNewRole(e.target.value)} className="text-xs px-2 py-1 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="">Seleccionar...</option>
                        {ALL_ROLES.map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                      {newRole && (
                        <button onClick={() => handleChangeRole(u.id)} className="text-xs px-2 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                          OK
                        </button>
                      )}
                      <button onClick={() => setChangingRoleId(null)} className="p-0.5 text-gray-400 hover:text-gray-600">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => { setChangingRoleId(u.id); setNewRole('') }} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Cambiar rol">
                      <UserCog className="h-3.5 w-3.5 text-gray-400" />
                    </button>
                  )}

                  {u.activo !== false && (
                    <button onClick={() => handleDelete(u.id, `${u.nombre} ${u.apellidos || ''}`)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors" title="Desactivar usuario">
                      <Trash2 className="h-3.5 w-3.5 text-red-400" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {users.length === 0 && loaded && (
              <div className="py-12 text-center text-sm text-gray-400">No se encontraron usuarios</div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50/50">
              <p className="text-xs text-gray-500">
                {total} usuarios · Pagina {page} de {totalPages}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => loadUsers(page - 1)}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => loadUsers(page + 1)}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
