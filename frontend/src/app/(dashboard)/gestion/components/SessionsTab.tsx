'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2, Calendar, Search, X, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { clubAdminApi } from '@/lib/api/clubAdmin'
import type { ClubSesion, ClubEquipo, ClubMiembro } from './types'
import { formatDate, formatFase, FASES_JUEGO, MATCH_DAYS, MATCH_DAY_COLORS, ESTADOS_SESION } from './types'

export default function SessionsTab() {
  const [sesiones, setSesiones] = useState<ClubSesion[]>([])
  const [equipos, setEquipos] = useState<ClubEquipo[]>([])
  const [miembros, setMiembros] = useState<ClubMiembro[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  // Filters
  const [filterTeam, setFilterTeam] = useState('')
  const [filterMatchDay, setFilterMatchDay] = useState('')
  const [filterEstado, setFilterEstado] = useState('')
  const [filterFase, setFilterFase] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  // Expanded row
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => { loadBaseData() }, [])
  useEffect(() => { loadSesiones() }, [page, filterTeam, filterMatchDay, filterEstado, filterFase, search])

  const loadBaseData = async () => {
    try {
      const [e, m] = await Promise.all([
        clubAdminApi.getEquipos(),
        clubAdminApi.getMiembros(),
      ])
      setEquipos(e)
      setMiembros(m)
    } catch { /* silent */ }
  }

  const loadSesiones = async () => {
    setLoading(true)
    try {
      const res = await clubAdminApi.getSesiones({
        page,
        limit: 50,
        equipo_id: filterTeam || undefined,
        match_day: filterMatchDay || undefined,
        estado: filterEstado || undefined,
        fase_juego: filterFase || undefined,
        search: search || undefined,
      })
      setSesiones(res.data)
      setTotal(res.total)
    } catch (err: any) {
      toast.error(err.message || 'Error')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = useCallback(() => {
    setSearch(searchInput)
    setPage(1)
  }, [searchInput])

  const resetFilters = () => {
    setFilterTeam('')
    setFilterMatchDay('')
    setFilterEstado('')
    setFilterFase('')
    setSearch('')
    setSearchInput('')
    setPage(1)
  }

  const teamName = (id: string) => equipos.find(e => e.id === id)?.nombre || '-'
  const creadorName = (id?: string) => {
    if (!id) return '-'
    const m = miembros.find(u => u.id === id)
    return m ? `${m.nombre} ${m.apellidos || ''}`.trim() : '-'
  }

  const hasFilters = filterTeam || filterMatchDay || filterEstado || filterFase || search
  const totalPages = Math.ceil(total / 50)

  const estadoColor = (estado?: string) => {
    switch (estado) {
      case 'completada': return 'bg-green-50 text-green-700'
      case 'planificada': return 'bg-blue-50 text-blue-700'
      case 'cancelada': return 'bg-red-50 text-red-700'
      default: return 'bg-gray-50 text-gray-600'
    }
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Buscar sesiones..."
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <button onClick={handleSearch} className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          Buscar
        </button>
        <span className="text-sm text-gray-500 ml-auto">{total} sesiones</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filterTeam}
          onChange={(e) => { setFilterTeam(e.target.value); setPage(1) }}
          className="border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">Todos los equipos</option>
          {equipos.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>

        <select
          value={filterMatchDay}
          onChange={(e) => { setFilterMatchDay(e.target.value); setPage(1) }}
          className="border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">Todos los match days</option>
          {MATCH_DAYS.map(md => <option key={md} value={md}>{md}</option>)}
        </select>

        <select
          value={filterEstado}
          onChange={(e) => { setFilterEstado(e.target.value); setPage(1) }}
          className="border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">Todos los estados</option>
          {ESTADOS_SESION.map(e => (
            <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
          ))}
        </select>

        <select
          value={filterFase}
          onChange={(e) => { setFilterFase(e.target.value); setPage(1) }}
          className="border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">Todas las fases</option>
          {FASES_JUEGO.map(f => <option key={f} value={f}>{formatFase(f)}</option>)}
        </select>

        {hasFilters && (
          <button onClick={resetFilters} className="flex items-center gap-1 px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg">
            <X className="h-3 w-3" /> Limpiar filtros
          </button>
        )}
      </div>

      {/* Table */}
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
                  <th className="text-left px-4 py-3 font-medium text-gray-500 w-8"></th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Titulo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Equipo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Match Day</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Estado</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Creador</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Duracion</th>
                </tr>
              </thead>
              <tbody>
                {sesiones.map(s => {
                  const mdColor = MATCH_DAY_COLORS[s.match_day || ''] || { bg: 'bg-gray-50', text: 'text-gray-600' }
                  return (
                    <>
                      <tr
                        key={s.id}
                        onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                        className="border-b last:border-0 hover:bg-gray-50 cursor-pointer"
                      >
                        <td className="px-4 py-3">
                          {expandedId === s.id
                            ? <ChevronUp className="h-4 w-4 text-gray-400" />
                            : <ChevronDown className="h-4 w-4 text-gray-400" />
                          }
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900 max-w-[220px] truncate">
                          {s.titulo || 'Sin titulo'}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{teamName(s.equipo_id)}</td>
                        <td className="px-4 py-3 text-gray-500 tabular-nums text-xs">{formatDate(s.fecha)}</td>
                        <td className="px-4 py-3">
                          {s.match_day ? (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${mdColor.bg} ${mdColor.text}`}>
                              {s.match_day}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3">
                          {s.estado ? (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${estadoColor(s.estado)}`}>
                              {s.estado}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{creadorName(s.creado_por)}</td>
                        <td className="px-4 py-3 text-gray-600 tabular-nums text-xs">
                          {s.duracion_total ? `${s.duracion_total}'` : '-'}
                        </td>
                      </tr>
                      {expandedId === s.id && (
                        <tr key={`${s.id}-detail`} className="border-b bg-gray-50/50">
                          <td colSpan={8} className="px-4 py-4">
                            <div className="flex flex-wrap gap-6 text-sm">
                              {s.objetivo_principal && (
                                <div>
                                  <p className="text-xs font-medium text-gray-500">Objetivo principal</p>
                                  <p className="text-gray-700 text-xs">{s.objetivo_principal}</p>
                                </div>
                              )}
                              {s.fase_juego_principal && (
                                <div>
                                  <p className="text-xs font-medium text-gray-500">Fase de juego</p>
                                  <p className="text-gray-700 text-xs capitalize">{formatFase(s.fase_juego_principal)}</p>
                                </div>
                              )}
                              {s.principio_tactico_principal && (
                                <div>
                                  <p className="text-xs font-medium text-gray-500">Principio tactico</p>
                                  <p className="text-gray-700 text-xs capitalize">{s.principio_tactico_principal.replace(/_/g, ' ')}</p>
                                </div>
                              )}
                              {s.rival && (
                                <div>
                                  <p className="text-xs font-medium text-gray-500">Rival</p>
                                  <p className="text-gray-700 text-xs">{s.rival}</p>
                                </div>
                              )}
                              {s.competicion && (
                                <div>
                                  <p className="text-xs font-medium text-gray-500">Competicion</p>
                                  <p className="text-gray-700 text-xs">{s.competicion}</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
          {sesiones.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No hay sesiones{hasFilters ? ' con estos filtros' : ''}</p>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-sm text-gray-500">Pagina {page} de {totalPages}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  )
}
