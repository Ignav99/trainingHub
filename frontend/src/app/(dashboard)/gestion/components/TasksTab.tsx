'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2, ClipboardList, Search, X, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { clubAdminApi } from '@/lib/api/clubAdmin'
import type { ClubTarea, ClubEquipo, ClubMiembro, CategoriaTarea } from './types'
import { formatDate, formatFase, FASES_JUEGO } from './types'

export default function TasksTab() {
  const [tareas, setTareas] = useState<ClubTarea[]>([])
  const [equipos, setEquipos] = useState<ClubEquipo[]>([])
  const [miembros, setMiembros] = useState<ClubMiembro[]>([])
  const [categorias, setCategorias] = useState<CategoriaTarea[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  // Filters
  const [filterTeam, setFilterTeam] = useState('')
  const [filterCategoria, setFilterCategoria] = useState('')
  const [filterFase, setFilterFase] = useState('')
  const [filterCreador, setFilterCreador] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  // Expanded row
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => { loadBaseData() }, [])
  useEffect(() => { loadTareas() }, [page, filterTeam, filterCategoria, filterFase, filterCreador, search])

  const loadBaseData = async () => {
    try {
      const [e, m, c] = await Promise.all([
        clubAdminApi.getEquipos(),
        clubAdminApi.getMiembros(),
        clubAdminApi.getCategorias(),
      ])
      setEquipos(e)
      setMiembros(m)
      setCategorias(c)
    } catch { /* silent */ }
  }

  const loadTareas = async () => {
    setLoading(true)
    try {
      const res = await clubAdminApi.getTareas({
        page,
        limit: 50,
        equipo_id: filterTeam || undefined,
        categoria: filterCategoria || undefined,
        fase_juego: filterFase || undefined,
        creado_por: filterCreador || undefined,
        search: search || undefined,
      })
      setTareas(res.data)
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
    setFilterCategoria('')
    setFilterFase('')
    setFilterCreador('')
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

  const hasFilters = filterTeam || filterCategoria || filterFase || filterCreador || search
  const totalPages = Math.ceil(total / 50)

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
            placeholder="Buscar tareas..."
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <button onClick={handleSearch} className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          Buscar
        </button>
        <span className="text-sm text-gray-500 ml-auto">{total} tareas</span>
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
          value={filterCategoria}
          onChange={(e) => { setFilterCategoria(e.target.value); setPage(1) }}
          className="border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">Todas las categorias</option>
          {categorias.map(c => <option key={c.codigo} value={c.codigo}>{c.nombre}</option>)}
        </select>

        <select
          value={filterFase}
          onChange={(e) => { setFilterFase(e.target.value); setPage(1) }}
          className="border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">Todas las fases</option>
          {FASES_JUEGO.map(f => <option key={f} value={f}>{formatFase(f)}</option>)}
        </select>

        <select
          value={filterCreador}
          onChange={(e) => { setFilterCreador(e.target.value); setPage(1) }}
          className="border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">Todos los creadores</option>
          {miembros.filter(m => m.activo).map(m => (
            <option key={m.id} value={m.id}>{m.nombre} {m.apellidos || ''}</option>
          ))}
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
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Categoria</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Fase</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Equipo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Creador</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Duracion</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {tareas.map(t => (
                  <>
                    <tr
                      key={t.id}
                      onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                      className="border-b last:border-0 hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        {expandedId === t.id
                          ? <ChevronUp className="h-4 w-4 text-gray-400" />
                          : <ChevronDown className="h-4 w-4 text-gray-400" />
                        }
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[250px] truncate">
                        {t.titulo}
                      </td>
                      <td className="px-4 py-3">
                        {t.categorias_tarea ? (
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: (t.categorias_tarea.color || '#6B7280') + '15',
                              color: t.categorias_tarea.color || '#6B7280',
                            }}
                          >
                            {t.categorias_tarea.nombre}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs capitalize max-w-[140px] truncate">
                        {t.fase_juego ? formatFase(t.fase_juego) : '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{teamName(t.equipo_id)}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{creadorName(t.creado_por)}</td>
                      <td className="px-4 py-3 text-gray-600 tabular-nums text-xs">
                        {t.duracion_total ? `${t.duracion_total}'` : '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 tabular-nums text-xs">{formatDate(t.created_at)}</td>
                    </tr>
                    {expandedId === t.id && (
                      <tr key={`${t.id}-detail`} className="border-b bg-gray-50/50">
                        <td colSpan={8} className="px-4 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            {t.descripcion && (
                              <div className="md:col-span-2">
                                <p className="text-xs font-medium text-gray-500 mb-1">Descripcion</p>
                                <p className="text-gray-700 whitespace-pre-line text-xs leading-relaxed">
                                  {t.descripcion.length > 500 ? t.descripcion.slice(0, 500) + '...' : t.descripcion}
                                </p>
                              </div>
                            )}
                            <div className="flex flex-wrap gap-4">
                              {t.principio_tactico && (
                                <div>
                                  <p className="text-xs font-medium text-gray-500">Principio tactico</p>
                                  <p className="text-gray-700 text-xs capitalize">{t.principio_tactico.replace(/_/g, ' ')}</p>
                                </div>
                              )}
                              {t.objetivo_fisico && (
                                <div>
                                  <p className="text-xs font-medium text-gray-500">Objetivo fisico</p>
                                  <p className="text-gray-700 text-xs capitalize">{t.objetivo_fisico.replace(/_/g, ' ')}</p>
                                </div>
                              )}
                              {(t.num_jugadores_min || t.num_jugadores_max) && (
                                <div>
                                  <p className="text-xs font-medium text-gray-500">Jugadores</p>
                                  <p className="text-gray-700 text-xs">
                                    {t.num_jugadores_min || '?'} - {t.num_jugadores_max || '?'}
                                  </p>
                                </div>
                              )}
                              {t.nivel_cognitivo != null && (
                                <div>
                                  <p className="text-xs font-medium text-gray-500">Nivel cognitivo</p>
                                  <p className="text-gray-700 text-xs">{t.nivel_cognitivo}/10</p>
                                </div>
                              )}
                            </div>
                            {t.match_days_recomendados && t.match_days_recomendados.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Match days recomendados</p>
                                <div className="flex gap-1">
                                  {t.match_days_recomendados.map(md => (
                                    <span key={md} className="px-2 py-0.5 rounded-full text-xs bg-purple-50 text-purple-700">{md}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
          {tareas.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No hay tareas{hasFilters ? ' con estos filtros' : ''}</p>
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
