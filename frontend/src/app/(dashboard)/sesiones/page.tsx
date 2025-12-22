'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Calendar as CalendarIcon,
  Clock,
  Target,
  MoreHorizontal,
  Edit,
  Trash2,
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  Sparkles,
  Filter,
  ListChecks,
  Eye
} from 'lucide-react'
import { Sesion, MatchDay } from '@/types'
import { sesionesApi } from '@/lib/api/sesiones'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

// Badge de Match Day
function MatchDayBadge({ matchDay }: { matchDay: string }) {
  const colors: Record<string, string> = {
    'MD+1': 'bg-green-100 text-green-800',
    'MD+2': 'bg-green-50 text-green-700',
    'MD-4': 'bg-red-100 text-red-800',
    'MD-3': 'bg-orange-100 text-orange-800',
    'MD-2': 'bg-blue-100 text-blue-800',
    'MD-1': 'bg-purple-100 text-purple-800',
    'MD': 'bg-gray-900 text-white',
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-bold ${colors[matchDay] || 'bg-gray-100 text-gray-800'}`}>
      {matchDay}
    </span>
  )
}

// Badge de estado
function EstadoBadge({ estado }: { estado: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    borrador: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Borrador' },
    planificada: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Planificada' },
    completada: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completada' },
    cancelada: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelada' },
  }

  const { bg, text, label } = config[estado] || config.borrador

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${bg} ${text}`}>
      {label}
    </span>
  )
}

export default function SesionesPage() {
  const router = useRouter()
  const [sesiones, setSesiones] = useState<Sesion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Paginación
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 10

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [matchDayFilter, setMatchDayFilter] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Menú de acciones
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  useEffect(() => {
    loadSesiones()
  }, [page, matchDayFilter, estadoFilter, fechaDesde, fechaHasta])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null)
    if (activeMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [activeMenu])

  const loadSesiones = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await sesionesApi.list({
        page,
        limit,
        match_day: matchDayFilter || undefined,
        estado: estadoFilter || undefined,
        fecha_desde: fechaDesde || undefined,
        fecha_hasta: fechaHasta || undefined,
        busqueda: busqueda || undefined,
      })

      setSesiones(response.data)
      setTotalPages(response.pages)
      setTotal(response.total)
    } catch (err) {
      setError('Error al cargar las sesiones')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    loadSesiones()
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('¿Estás seguro de que quieres eliminar esta sesión?')) return

    try {
      await sesionesApi.delete(id)
      loadSesiones()
    } catch (err) {
      console.error('Error deleting sesion:', err)
    }
    setActiveMenu(null)
  }

  const handleGeneratePdf = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const result = await sesionesApi.generatePdf(id)
      if (result.pdf_url) {
        window.open(result.pdf_url, '_blank')
      }
    } catch (err) {
      console.error('Error generating PDF:', err)
      alert('Error al generar el PDF')
    }
    setActiveMenu(null)
  }

  const clearFilters = () => {
    setMatchDayFilter('')
    setEstadoFilter('')
    setFechaDesde('')
    setFechaHasta('')
    setBusqueda('')
    setPage(1)
  }

  const hasActiveFilters = matchDayFilter || estadoFilter || fechaDesde || fechaHasta

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "d 'de' MMMM, yyyy", { locale: es })
    } catch {
      return dateStr
    }
  }

  const formatShortDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "d MMM", { locale: es })
    } catch {
      return dateStr
    }
  }

  const matchDays = ['MD+1', 'MD+2', 'MD-4', 'MD-3', 'MD-2', 'MD-1', 'MD']
  const estados = [
    { value: 'borrador', label: 'Borrador' },
    { value: 'planificada', label: 'Planificada' },
    { value: 'completada', label: 'Completada' },
    { value: 'cancelada', label: 'Cancelada' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sesiones</h1>
          <p className="text-gray-500">
            {total} sesiones en total
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/sesiones/calendario"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <CalendarIcon className="h-4 w-4" />
            Calendario
          </Link>
          <Link
            href="/sesiones/nueva"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Manual
          </Link>
          <Link
            href="/sesiones/nueva-ai"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg text-sm font-medium hover:from-purple-700 hover:to-blue-700 transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Nueva con IA
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Búsqueda */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por título, objetivo, rival..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>

            {/* Match Day filter */}
            <select
              value={matchDayFilter}
              onChange={(e) => { setMatchDayFilter(e.target.value); setPage(1) }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white"
            >
              <option value="">Todos los MD</option>
              {matchDays.map((md) => (
                <option key={md} value={md}>{md}</option>
              ))}
            </select>

            {/* Más filtros toggle */}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                hasActiveFilters
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="h-4 w-4" />
              Filtros
              {hasActiveFilters && (
                <span className="w-2 h-2 bg-primary rounded-full" />
              )}
            </button>

            <button
              type="submit"
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Buscar
            </button>
          </div>

          {/* Filtros expandidos */}
          {showFilters && (
            <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-200">
              {/* Estado */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
                <select
                  value={estadoFilter}
                  onChange={(e) => { setEstadoFilter(e.target.value); setPage(1) }}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white"
                >
                  <option value="">Todos</option>
                  {estados.map((e) => (
                    <option key={e.value} value={e.value}>{e.label}</option>
                  ))}
                </select>
              </div>

              {/* Fecha desde */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => { setFechaDesde(e.target.value); setPage(1) }}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>

              {/* Fecha hasta */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => { setFechaHasta(e.target.value); setPage(1) }}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>

              {/* Limpiar filtros */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="self-end px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          )}
        </form>
      </div>

      {/* Lista de sesiones */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadSesiones}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Reintentar
          </button>
        </div>
      ) : sesiones.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CalendarIcon className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay sesiones</h3>
          <p className="text-gray-500 mb-4">
            {hasActiveFilters
              ? 'No se encontraron sesiones con los filtros seleccionados'
              : 'Comienza planificando tu primera sesión de entrenamiento'
            }
          </p>
          {hasActiveFilters ? (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              Limpiar filtros
            </button>
          ) : (
            <Link
              href="/sesiones/nueva-ai"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg text-sm font-medium hover:from-purple-700 hover:to-blue-700"
            >
              <Sparkles className="h-4 w-4" />
              Crear con IA
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Tabla de sesiones */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Match Day
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Título / Objetivo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tareas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duración
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sesiones.map((sesion) => (
                  <tr
                    key={sesion.id}
                    onClick={() => router.push(`/sesiones/${sesion.id}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {formatDate(sesion.fecha)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <MatchDayBadge matchDay={sesion.match_day} />
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{sesion.titulo}</p>
                        {sesion.objetivo_principal && (
                          <p className="text-sm text-gray-500 truncate max-w-xs">
                            {sesion.objetivo_principal}
                          </p>
                        )}
                        {sesion.rival && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            vs {sesion.rival}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <ListChecks className="h-4 w-4" />
                        {sesion.tareas?.length || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        {sesion.duracion_total ? `${sesion.duracion_total} min` : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <EstadoBadge estado={sesion.estado} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveMenu(activeMenu === sesion.id ? null : sesion.id)
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600 rounded"
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </button>

                        {activeMenu === sesion.id && (
                          <div className="absolute right-0 top-8 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                            <Link
                              href={`/sesiones/${sesion.id}`}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Eye className="h-4 w-4" />
                              Ver detalle
                            </Link>
                            <button
                              onClick={(e) => handleGeneratePdf(sesion.id, e)}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"
                            >
                              <FileText className="h-4 w-4" />
                              Generar PDF
                            </button>
                            <button
                              onClick={(e) => handleDelete(sesion.id, e)}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                            >
                              <Trash2 className="h-4 w-4" />
                              Eliminar
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3">
              <div className="text-sm text-gray-500">
                Mostrando {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} de {total}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-gray-700">
                  Página {page} de {totalPages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                  className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
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
