'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import useSWR, { mutate } from 'swr'
import {
  Plus,
  Search,
  Clock,
  Users,
  MoreHorizontal,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Eye,
  Library,
  BookCopy,
  User2,
  FolderOpen,
  Bot,
  ChevronUp,
  ChevronDown,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { Tarea, PaginatedResponse } from '@/types'
import { tareasApi } from '@/lib/api/tareas'
import { apiKey } from '@/lib/swr'
import { ListPageSkeleton } from '@/components/ui/page-skeletons'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'

// ── Color maps ──────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  RND: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  JDP: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  POS: { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
  EVO: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  AVD: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  PCO: { bg: 'bg-pink-50', text: 'text-pink-700', dot: 'bg-pink-500' },
  ACO: { bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-500' },
  SSG: { bg: 'bg-teal-50', text: 'text-teal-700', dot: 'bg-teal-500' },
  ABP: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  POR: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
}

const DENSITY_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  alta:  { bg: 'bg-red-100', text: 'text-red-700', label: 'Alta' },
  media: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Media' },
  baja:  { bg: 'bg-green-100', text: 'text-green-700', label: 'Baja' },
}

const FASE_LABELS: Record<string, string> = {
  ataque_organizado: 'Ataque Organizado',
  defensa_organizada: 'Defensa Organizada',
  transicion_defensa_ataque: 'Transición D→A',
  transicion_ataque_defensa: 'Transición A→D',
  balon_parado_ofensivo: 'ABP Ofensivo',
  balon_parado_defensivo: 'ABP Defensivo',
}

const SORT_OPTIONS = [
  { value: 'created_at:desc', label: 'Más recientes' },
  { value: 'created_at:asc', label: 'Más antiguas' },
  { value: 'num_usos:desc', label: 'Más usadas' },
  { value: 'valoracion_media:desc', label: 'Mejor valoradas' },
  { value: 'titulo:asc', label: 'A-Z' },
  { value: 'duracion_total:asc', label: 'Menor duración' },
]

// ── Reusable Components ─────────────────────────────────────

function CategoryBadge({ codigo, nombre }: { codigo: string; nombre: string }) {
  const c = CATEGORY_COLORS[codigo] || { bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-500' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {nombre || codigo}
    </span>
  )
}

function CognitiveLevel({ level }: { level?: number }) {
  if (!level) return null
  return (
    <div className="flex gap-0.5" title={`Nivel cognitivo: ${level}/3`}>
      {[1, 2, 3].map((i) => (
        <div key={i} className={`w-1.5 h-1.5 rounded-full ${i <= level ? 'bg-primary' : 'bg-gray-200'}`} />
      ))}
    </div>
  )
}

function DensityPill({ densidad }: { densidad?: string }) {
  if (!densidad) return <span className="text-gray-400">-</span>
  const c = DENSITY_CONFIG[densidad]
  if (!c) return <span className="text-gray-400">-</span>
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  )
}

function SortableHeader({
  label,
  field,
  currentSort,
  onSort,
  className = '',
}: {
  label: string
  field: string
  currentSort: string
  onSort: (field: string) => void
  className?: string
}) {
  const [currentField, currentDir] = currentSort.split(':')
  const isActive = currentField === field
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 transition-colors ${className}`}
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive ? (
          currentDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-30" />
        )}
      </span>
    </th>
  )
}

// ── Main Page ───────────────────────────────────────────────

export default function TareasPage() {
  const router = useRouter()

  // Pagination
  const [page, setPage] = useState(1)
  const limit = 20

  // Tabs
  const [tab, setTab] = useState<'mis_tareas' | 'biblioteca'>('mis_tareas')

  // Filters
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [busquedaActiva, setBusquedaActiva] = useState('')
  const [selectedCategorias, setSelectedCategorias] = useState<string[]>([])
  const [faseFilter, setFaseFilter] = useState('')
  const [densidadFilter, setDensidadFilter] = useState('')
  const [jugadoresMin, setJugadoresMin] = useState('')
  const [jugadoresMax, setJugadoresMax] = useState('')
  const [sortBy, setSortBy] = useState('created_at:desc')

  // Action menu
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [copying, setCopying] = useState<string | null>(null)

  const [orden, direccion] = sortBy.split(':')

  // SWR: Categories
  const { data: categoriasRes } = useSWR<{ data: Array<{ codigo: string; nombre: string; color: string }> }>(
    apiKey('/catalogos/categorias-tarea')
  )
  const categorias = categoriasRes?.data || []

  // SWR: Tareas
  const { data: tareasRes, error: tareasError, isLoading } = useSWR<PaginatedResponse<Tarea>>(
    apiKey('/tareas', {
      page,
      limit,
      orden,
      direccion,
      categoria: selectedCategorias.length === 1 ? selectedCategorias[0] : undefined,
      categorias: selectedCategorias.length > 1 ? selectedCategorias.join(',') : undefined,
      fase_juego: faseFilter || undefined,
      densidad: densidadFilter || undefined,
      jugadores_min: jugadoresMin ? parseInt(jugadoresMin) : undefined,
      jugadores_max: jugadoresMax ? parseInt(jugadoresMax) : undefined,
      busqueda: busquedaActiva || undefined,
      biblioteca: tab === 'biblioteca' ? true : undefined,
    })
  )

  const tareas = tareasRes?.data || []
  const totalPages = tareasRes?.pages || 1
  const total = tareasRes?.total || 0
  const error = tareasError ? 'Error al cargar las tareas' : null

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null)
    if (activeMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [activeMenu])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setBusquedaActiva(busqueda)
    setPage(1)
  }

  const handleTabChange = (newTab: 'mis_tareas' | 'biblioteca') => {
    setTab(newTab)
    setPage(1)
  }

  const handleSort = useCallback((field: string) => {
    setSortBy(prev => {
      const [currentField, currentDir] = prev.split(':')
      if (currentField === field) {
        return `${field}:${currentDir === 'asc' ? 'desc' : 'asc'}`
      }
      return `${field}:asc`
    })
    setPage(1)
  }, [])

  const invalidateTareas = () => {
    mutate((key: string) => typeof key === 'string' && key.includes('/tareas'), undefined, { revalidate: true })
  }

  const handleDuplicate = async (tarea: Tarea, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await tareasApi.duplicate(tarea.id)
      invalidateTareas()
    } catch (err) {
      console.error('Error duplicating tarea:', err)
    }
    setActiveMenu(null)
  }

  const handleCopyToMyTeam = async (tarea: Tarea, e: React.MouseEvent) => {
    e.stopPropagation()
    setCopying(tarea.id)
    try {
      await tareasApi.duplicate(tarea.id, tarea.titulo)
      invalidateTareas()
    } catch (err) {
      console.error('Error copying tarea:', err)
    } finally {
      setCopying(null)
    }
    setActiveMenu(null)
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('¿Estás seguro de que quieres eliminar esta tarea?')) return
    try {
      await tareasApi.delete(id)
      invalidateTareas()
    } catch (err) {
      console.error('Error deleting tarea:', err)
    }
    setActiveMenu(null)
  }

  const toggleCategoria = (codigo: string) => {
    setSelectedCategorias(prev =>
      prev.includes(codigo) ? prev.filter(c => c !== codigo) : [...prev, codigo]
    )
    setPage(1)
  }

  const clearFilters = () => {
    setBusqueda('')
    setBusquedaActiva('')
    setSelectedCategorias([])
    setFaseFilter('')
    setDensidadFilter('')
    setJugadoresMin('')
    setJugadoresMax('')
    setPage(1)
  }

  const hasActiveFilters = selectedCategorias.length > 0 || faseFilter || densidadFilter || jugadoresMin || jugadoresMax

  // ── Filter sidebar content (shared between desktop sidebar and mobile drawer) ──
  const filterContent = (
    <div className="space-y-6">
      {/* Category checkboxes */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Categoría</h4>
        <div className="space-y-1.5">
          {categorias.map((cat) => {
            const c = CATEGORY_COLORS[cat.codigo] || { dot: 'bg-gray-500' }
            const checked = selectedCategorias.includes(cat.codigo)
            return (
              <label key={cat.codigo} className="flex items-center gap-2 cursor-pointer group py-1">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleCategoria(cat.codigo)}
                  className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5"
                />
                <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                <span className="text-sm text-gray-700 group-hover:text-gray-900">{cat.nombre}</span>
              </label>
            )
          })}
        </div>
      </div>

      {/* Phase */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Fase de juego</h4>
        <select
          value={faseFilter}
          onChange={(e) => { setFaseFilter(e.target.value); setPage(1) }}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
        >
          <option value="">Todas</option>
          {Object.entries(FASE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Density toggles */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Densidad</h4>
        <div className="flex gap-1.5">
          {(['alta', 'media', 'baja'] as const).map((d) => {
            const active = densidadFilter === d
            const c = DENSITY_CONFIG[d]
            return (
              <button
                key={d}
                onClick={() => { setDensidadFilter(active ? '' : d); setPage(1) }}
                className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  active ? `${c.bg} ${c.text} ring-1 ring-current` : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {c.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Player range */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Jugadores</h4>
        <div className="flex gap-2">
          <input
            type="number"
            min={1}
            max={30}
            value={jugadoresMin}
            onChange={(e) => { setJugadoresMin(e.target.value); setPage(1) }}
            placeholder="Mín"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          />
          <span className="text-gray-400 self-center">–</span>
          <input
            type="number"
            min={1}
            max={30}
            value={jugadoresMax}
            onChange={(e) => { setJugadoresMax(e.target.value); setPage(1) }}
            placeholder="Máx"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          />
        </div>
      </div>

      {/* Sort */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Ordenar</h4>
        <select
          value={sortBy}
          onChange={(e) => { setSortBy(e.target.value); setPage(1) }}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Clear filters */}
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="w-full px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <PageHeader
        title="Biblioteca de Tareas"
        description={`${total} tareas ${tab === 'biblioteca' ? 'en la biblioteca del club' : 'en tu colección'}`}
        actions={
          <>
            <Link
              href="/tareas/nueva"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Nueva Tarea
            </Link>
            <Link
              href="/tareas/nueva-ai"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Bot className="h-4 w-4" />
              Crear con IA
            </Link>
          </>
        }
      />

      {/* Pill tabs */}
      <div className="flex items-center gap-2">
        <div className="inline-flex bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => handleTabChange('mis_tareas')}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              tab === 'mis_tareas'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Mis tareas
          </button>
          <button
            onClick={() => handleTabChange('biblioteca')}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              tab === 'biblioteca'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Library className="h-3.5 w-3.5" />
            Biblioteca del Club
          </button>
        </div>

        {/* Mobile filter toggle */}
        <button
          onClick={() => setShowMobileFilters(true)}
          className={`lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm transition-colors ml-auto ${
            hasActiveFilters
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filtros
          {hasActiveFilters && <span className="w-1.5 h-1.5 bg-primary rounded-full" />}
        </button>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por título, descripción..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white text-sm"
          />
        </div>
        <button
          type="submit"
          className="px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          Buscar
        </button>
      </form>

      {/* Mobile filter drawer overlay */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowMobileFilters(false)} />
          <div className="fixed inset-y-0 right-0 w-80 max-w-[85vw] bg-white shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-gray-900">Filtros</h3>
              <button onClick={() => setShowMobileFilters(false)} className="p-1 rounded-md hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4">
              {filterContent}
            </div>
          </div>
        </div>
      )}

      {/* Main content: sidebar filters + table */}
      <div className="flex gap-6">
        {/* Desktop sidebar filters */}
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-24 bg-white rounded-xl border border-gray-200 p-4">
            {filterContent}
          </div>
        </aside>

        {/* Table / content area */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <ListPageSkeleton />
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={() => invalidateTareas()}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                Reintentar
              </button>
            </div>
          ) : tareas.length === 0 ? (
            <EmptyState
              icon={tab === 'biblioteca' ? <Library className="h-12 w-12" /> : <Search className="h-12 w-12" />}
              title={tab === 'biblioteca' ? 'Biblioteca vacía' : 'No hay tareas'}
              description={
                hasActiveFilters
                  ? 'No se encontraron tareas con los filtros aplicados'
                  : tab === 'biblioteca'
                  ? 'Las tareas creadas por cualquier miembro del club aparecerán aquí'
                  : 'Comienza creando tu primera tarea de entrenamiento'
              }
              action={
                hasActiveFilters ? (
                  <button onClick={clearFilters} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                    Limpiar filtros
                  </button>
                ) : tab === 'mis_tareas' ? (
                  <Link
                    href="/tareas/nueva"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
                  >
                    <Plus className="h-4 w-4" />
                    Crear tarea
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <>
              {/* ── Desktop Table ── */}
              <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden animate-fade-in">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50/80">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Categoría</th>
                      <SortableHeader label="Título" field="titulo" currentSort={sortBy} onSort={handleSort} />
                      <SortableHeader label="Duración" field="duracion_total" currentSort={sortBy} onSort={handleSort} className="w-24" />
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Jugadores</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">Densidad</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Fase</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">Cogn.</th>
                      <SortableHeader label="Usos" field="num_usos" currentSort={sortBy} onSort={handleSort} className="w-16 text-center" />
                      <th className="px-4 py-3 w-12" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {tareas.map((tarea) => (
                      <tr
                        key={tarea.id}
                        onClick={() => router.push(`/tareas/${tarea.id}`)}
                        className="hover:bg-gray-50/80 cursor-pointer transition-colors group"
                      >
                        {/* Category */}
                        <td className="px-4 py-3">
                          <CategoryBadge
                            codigo={tarea.categoria?.codigo || ''}
                            nombre={tarea.categoria?.nombre_corto || tarea.categoria?.nombre || ''}
                          />
                        </td>

                        {/* Title */}
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900 group-hover:text-primary transition-colors line-clamp-1">
                            {tarea.titulo}
                          </p>
                          {tarea.fase_juego && tarea.principio_tactico && (
                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{tarea.principio_tactico}</p>
                          )}
                        </td>

                        {/* Duration */}
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-gray-400" />
                            {tarea.duracion_total}′
                          </span>
                        </td>

                        {/* Players */}
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3.5 w-3.5 text-gray-400" />
                            {tarea.num_jugadores_min}
                            {tarea.num_jugadores_max && tarea.num_jugadores_max !== tarea.num_jugadores_min
                              ? `-${tarea.num_jugadores_max}`
                              : ''}
                          </span>
                        </td>

                        {/* Density */}
                        <td className="px-4 py-3">
                          <DensityPill densidad={tarea.densidad} />
                        </td>

                        {/* Phase */}
                        <td className="px-4 py-3">
                          {tarea.fase_juego ? (
                            <span className="text-xs text-gray-500 line-clamp-1">
                              {FASE_LABELS[tarea.fase_juego] || tarea.fase_juego.replace(/_/g, ' ')}
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>

                        {/* Cognitive */}
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center">
                            <CognitiveLevel level={tarea.nivel_cognitivo} />
                          </div>
                        </td>

                        {/* Uses */}
                        <td className="px-4 py-3 text-center text-sm text-gray-500">
                          {tarea.num_usos || 0}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setActiveMenu(activeMenu === tarea.id ? null : tarea.id)
                              }}
                              className="p-1 text-gray-400 hover:text-gray-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>

                            {activeMenu === tarea.id && (
                              <div className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                                <Link
                                  href={`/tareas/${tarea.id}`}
                                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Eye className="h-4 w-4" />
                                  Ver detalle
                                </Link>
                                <button
                                  onClick={(e) => handleDuplicate(tarea, e)}
                                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"
                                >
                                  <Copy className="h-4 w-4" />
                                  Duplicar
                                </button>
                                {tab === 'biblioteca' && (
                                  <button
                                    onClick={(e) => handleCopyToMyTeam(tarea, e)}
                                    className="flex items-center gap-2 px-4 py-2 text-sm text-primary hover:bg-primary/5 w-full"
                                    disabled={copying === tarea.id}
                                  >
                                    {copying === tarea.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <BookCopy className="h-4 w-4" />
                                    )}
                                    Copiar a mi equipo
                                  </button>
                                )}
                                <button
                                  onClick={(e) => handleDelete(tarea.id, e)}
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

              {/* ── Mobile Cards ── */}
              <div className="md:hidden space-y-3 animate-fade-in">
                {tareas.map((tarea) => (
                  <div
                    key={tarea.id}
                    onClick={() => router.push(`/tareas/${tarea.id}`)}
                    className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:border-primary/30 transition-colors active:bg-gray-50"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <CategoryBadge
                        codigo={tarea.categoria?.codigo || ''}
                        nombre={tarea.categoria?.nombre_corto || tarea.categoria?.nombre || ''}
                      />
                      <div className="flex items-center gap-2">
                        <DensityPill densidad={tarea.densidad} />
                        <CognitiveLevel level={tarea.nivel_cognitivo} />
                      </div>
                    </div>

                    <h3 className="font-medium text-gray-900 text-sm mb-2 line-clamp-2">{tarea.titulo}</h3>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {tarea.duracion_total}′
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {tarea.num_jugadores_min}
                        {tarea.num_jugadores_max && tarea.num_jugadores_max !== tarea.num_jugadores_min
                          ? `-${tarea.num_jugadores_max}`
                          : ''} jug.
                      </span>
                      {tarea.fase_juego && (
                        <span className="text-gray-400 capitalize truncate">
                          {FASE_LABELS[tarea.fase_juego] || tarea.fase_juego.replace(/_/g, ' ')}
                        </span>
                      )}
                      {tarea.num_usos > 0 && (
                        <span className="ml-auto">{tarea.num_usos}x</span>
                      )}
                    </div>

                    {(tarea.creador_nombre || tarea.equipo_nombre) && (
                      <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-3 text-[11px] text-gray-400">
                        {tarea.creador_nombre && (
                          <span className="flex items-center gap-1">
                            <User2 className="h-3 w-3" />
                            {tarea.creador_nombre}
                          </span>
                        )}
                        {tarea.equipo_nombre && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {tarea.equipo_nombre}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3">
                  <div className="text-sm text-gray-500">
                    {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} de {total}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      className="p-2 border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm text-gray-700">
                      {page} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={page === totalPages}
                      className="p-2 border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
