'use client'

import { useEffect, useState } from 'react'
import { Loader2, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { clubAdminApi } from '@/lib/api/clubAdmin'
import type { AuditEntry } from './types'
import { formatDateTime } from './types'

const SEVERITY_COLORS: Record<string, string> = {
  info: 'bg-blue-50 text-blue-700',
  warning: 'bg-amber-50 text-amber-700',
  critical: 'bg-red-50 text-red-700',
}

export default function AuditTab() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [filterAction, setFilterAction] = useState('')
  const [filterSeverity, setFilterSeverity] = useState('')

  useEffect(() => { loadData() }, [page, filterAction, filterSeverity])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await clubAdminApi.getAudit({
        page,
        limit: 50,
        accion: filterAction || undefined,
        severidad: filterSeverity || undefined,
      })
      setEntries(res.data)
      setTotal(res.total)
    } catch (err: any) {
      toast.error(err.message || 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <select
          value={filterAction}
          onChange={(e) => { setFilterAction(e.target.value); setPage(1) }}
          className="border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">Todas las acciones</option>
          <option value="crear">Crear</option>
          <option value="actualizar">Actualizar</option>
          <option value="eliminar">Eliminar</option>
          <option value="invitar">Invitar</option>
          <option value="login">Login</option>
          <option value="cambiar_rol">Cambiar rol</option>
          <option value="revocar_acceso">Revocar acceso</option>
        </select>
        <select
          value={filterSeverity}
          onChange={(e) => { setFilterSeverity(e.target.value); setPage(1) }}
          className="border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">Toda severidad</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
        <span className="text-sm text-gray-500 ml-auto">{total} registros</span>
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
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Accion</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Entidad</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Severidad</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(e => (
                  <tr key={e.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 tabular-nums text-xs whitespace-nowrap">
                      {formatDateTime(e.created_at)}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 capitalize">
                      {e.accion.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3 text-gray-600 capitalize">
                      {e.entidad_tipo.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SEVERITY_COLORS[e.severidad] || 'bg-gray-50 text-gray-600'}`}>
                        {e.severidad}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate">
                      {e.datos_nuevos ? JSON.stringify(e.datos_nuevos).slice(0, 60) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {entries.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No hay registros de auditoria</p>
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
