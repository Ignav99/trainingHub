'use client'

import { useEffect, useState } from 'react'
import { Loader2, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { clubAdminApi } from '@/lib/api/clubAdmin'
import type { ClubSesion, ClubEquipo } from './types'
import { formatDate } from './types'

export default function SessionsTab() {
  const [sesiones, setSesiones] = useState<ClubSesion[]>([])
  const [equipos, setEquipos] = useState<ClubEquipo[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filterTeam, setFilterTeam] = useState('')

  useEffect(() => { loadEquipos() }, [])
  useEffect(() => { loadSesiones() }, [page, filterTeam])

  const loadEquipos = async () => {
    try {
      const data = await clubAdminApi.getEquipos()
      setEquipos(data)
    } catch { /* silent */ }
  }

  const loadSesiones = async () => {
    setLoading(true)
    try {
      const res = await clubAdminApi.getSesiones({
        page,
        limit: 50,
        equipo_id: filterTeam || undefined,
      })
      setSesiones(res.data)
      setTotal(res.total)
    } catch (err: any) {
      toast.error(err.message || 'Error')
    } finally {
      setLoading(false)
    }
  }

  const teamName = (id: string) => equipos.find(e => e.id === id)?.nombre || '-'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <select
          value={filterTeam}
          onChange={(e) => { setFilterTeam(e.target.value); setPage(1) }}
          className="border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">Todos los equipos</option>
          {equipos.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
        <span className="text-sm text-gray-500">{total} sesiones</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Titulo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Equipo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Match Day</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Duracion (min)</th>
                </tr>
              </thead>
              <tbody>
                {sesiones.map(s => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{s.titulo || 'Sin titulo'}</td>
                    <td className="px-4 py-3 text-gray-600">{teamName(s.equipo_id)}</td>
                    <td className="px-4 py-3 text-gray-500 tabular-nums">{formatDate(s.fecha)}</td>
                    <td className="px-4 py-3">
                      {s.match_day ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                          {s.match_day}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 tabular-nums">
                      {s.duracion_total ? `${s.duracion_total} min` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {sesiones.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No hay sesiones</p>
            </div>
          )}
        </div>
      )}

      {total > 50 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-sm text-gray-500">Pagina {page}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page * 50 >= total}
            className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  )
}
