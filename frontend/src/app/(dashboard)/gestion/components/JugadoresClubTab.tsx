'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Search, Users, X } from 'lucide-react'
import { toast } from 'sonner'
import { clubAdminApi, type ClubJugador, type ClubEquipo } from '@/lib/api/clubAdmin'
import JugadorGridCard from './JugadorGridCard'

const LIMIT = 24

export default function JugadoresClubTab() {
  const [jugadores, setJugadores] = useState<ClubJugador[]>([])
  const [equipos, setEquipos] = useState<ClubEquipo[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [filterEquipo, setFilterEquipo] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    clubAdminApi.getEquipos().then(setEquipos).catch(() => { /* silent */ })
  }, [])

  useEffect(() => {
    setLoading(true)
    clubAdminApi
      .getClubJugadores({
        search: search || undefined,
        equipo_id: filterEquipo || undefined,
        page,
        limit: LIMIT,
      })
      .then((r) => { setJugadores(r.data); setTotal(r.total) })
      .catch((err: any) => toast.error(err.message || 'Error'))
      .finally(() => setLoading(false))
  }, [search, filterEquipo, page])

  const handleSearch = useCallback(() => {
    setSearch(searchInput)
    setPage(1)
  }, [searchInput])

  const resetFilters = () => {
    setFilterEquipo('')
    setSearch('')
    setSearchInput('')
    setPage(1)
  }

  const hasFilters = filterEquipo || search
  const totalPages = Math.ceil(total / LIMIT)

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
            placeholder="Buscar jugadores..."
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <button onClick={handleSearch} className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          Buscar
        </button>
        <span className="text-sm text-gray-500 ml-auto">{total} jugadores</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filterEquipo}
          onChange={(e) => { setFilterEquipo(e.target.value); setPage(1) }}
          className="border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">Todos los equipos</option>
          {equipos.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>

        {hasFilters && (
          <button onClick={resetFilters} className="flex items-center gap-1 px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg">
            <X className="h-3 w-3" /> Limpiar filtros
          </button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : jugadores.length === 0 ? (
        <div className="bg-white rounded-xl border p-10 text-center text-gray-400">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No hay jugadores{hasFilters ? ' con estos filtros' : ''}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {jugadores.map((j) => (
            <JugadorGridCard key={j.id} jugador={j} showEquipo />
          ))}
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
