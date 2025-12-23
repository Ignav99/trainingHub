'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Search,
  Filter,
  Users,
  UserPlus,
  MoreHorizontal,
  Edit,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle,
  Activity,
  Thermometer,
  AlertTriangle,
  Plane,
  CalendarOff,
  Flag,
  XCircle,
  Star,
  Eye,
  UserCog,
  ChevronDown
} from 'lucide-react'
import { Jugador, jugadoresApi, POSICIONES, ESTADOS_JUGADOR } from '@/lib/api/jugadores'
import { useEquipoStore } from '@/stores/equipoStore'

// Avatar del jugador
function PlayerAvatar({ jugador, size = 'md' }: { jugador: Jugador; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-lg',
  }

  const initials = `${jugador.nombre[0]}${jugador.apellidos[0]}`.toUpperCase()

  if (jugador.foto_url) {
    return (
      <img
        src={jugador.foto_url}
        alt={`${jugador.nombre} ${jugador.apellidos}`}
        className={`${sizeClasses[size]} rounded-full object-cover`}
      />
    )
  }

  // Color based on position zone
  const pos = POSICIONES[jugador.posicion_principal as keyof typeof POSICIONES]
  const bgColor = pos?.color || '#6B7280'

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center text-white font-bold`}
      style={{ backgroundColor: bgColor }}
    >
      {initials}
    </div>
  )
}

// Badge de estado
function EstadoBadge({ estado }: { estado: string }) {
  const config = ESTADOS_JUGADOR[estado as keyof typeof ESTADOS_JUGADOR] || ESTADOS_JUGADOR.activo

  const iconMap: Record<string, React.ReactNode> = {
    check: <CheckCircle className="h-3 w-3" />,
    activity: <Activity className="h-3 w-3" />,
    thermometer: <Thermometer className="h-3 w-3" />,
    'alert-triangle': <AlertTriangle className="h-3 w-3" />,
    plane: <Plane className="h-3 w-3" />,
    'calendar-off': <CalendarOff className="h-3 w-3" />,
    flag: <Flag className="h-3 w-3" />,
    'x-circle': <XCircle className="h-3 w-3" />,
  }

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
      style={{ backgroundColor: config.color }}
    >
      {iconMap[config.icon]}
      {config.nombre}
    </span>
  )
}

// Badge de posicion
function PosicionBadge({ posicion }: { posicion: string }) {
  const pos = POSICIONES[posicion as keyof typeof POSICIONES]
  if (!pos) return <span className="text-sm text-gray-500">{posicion}</span>

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white"
      style={{ backgroundColor: pos.color }}
    >
      {posicion}
    </span>
  )
}

// Tarjeta de jugador
function JugadorCard({
  jugador,
  onEdit,
  onDelete,
  onChangeEstado,
}: {
  jugador: Jugador
  onEdit: () => void
  onDelete: () => void
  onChangeEstado: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()

  const pos = POSICIONES[jugador.posicion_principal as keyof typeof POSICIONES]
  const isNoDisponible = jugador.estado !== 'activo'

  return (
    <div
      className={`relative bg-white rounded-xl border p-4 transition-all cursor-pointer group hover:shadow-md ${
        isNoDisponible ? 'border-gray-300 bg-gray-50' : 'border-gray-200 hover:border-primary/30'
      }`}
      onClick={() => router.push(`/plantilla/${jugador.id}`)}
    >
      {/* Indicador de capitan */}
      {jugador.es_capitan && (
        <div className="absolute -top-2 -right-2 bg-amber-400 rounded-full p-1">
          <Star className="h-4 w-4 text-white fill-white" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="relative">
          <PlayerAvatar jugador={jugador} size="lg" />
          {jugador.dorsal && (
            <span className="absolute -bottom-1 -right-1 bg-gray-900 text-white text-xs font-bold px-1.5 py-0.5 rounded">
              {jugador.dorsal}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold truncate ${isNoDisponible ? 'text-gray-500' : 'text-gray-900'}`}>
            {jugador.nombre} {jugador.apellidos}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <PosicionBadge posicion={jugador.posicion_principal} />
            {pos && <span className="text-xs text-gray-500">{pos.nombre}</span>}
          </div>
        </div>
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
              <Link
                href={`/plantilla/${jugador.id}`}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Eye className="h-4 w-4" />
                Ver ficha
              </Link>
              <button
                onClick={() => { onEdit(); setMenuOpen(false) }}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"
              >
                <Edit className="h-4 w-4" />
                Editar
              </button>
              <button
                onClick={() => { onChangeEstado(); setMenuOpen(false) }}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"
              >
                <UserCog className="h-4 w-4" />
                Cambiar estado
              </button>
              <button
                onClick={() => { onDelete(); setMenuOpen(false) }}
                className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Estado si no disponible */}
      {isNoDisponible && (
        <div className="mb-3">
          <EstadoBadge estado={jugador.estado} />
          {jugador.motivo_baja && (
            <p className="text-xs text-gray-500 mt-1">{jugador.motivo_baja}</p>
          )}
          {jugador.fecha_vuelta_estimada && (
            <p className="text-xs text-gray-400 mt-0.5">
              Vuelta: {new Date(jugador.fecha_vuelta_estimada).toLocaleDateString('es-ES')}
            </p>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div>
          <div className="text-lg font-bold text-gray-900">{jugador.nivel_tecnico}</div>
          <div className="text-xs text-gray-500">TEC</div>
        </div>
        <div>
          <div className="text-lg font-bold text-gray-900">{jugador.nivel_tactico}</div>
          <div className="text-xs text-gray-500">TAC</div>
        </div>
        <div>
          <div className="text-lg font-bold text-gray-900">{jugador.nivel_fisico}</div>
          <div className="text-xs text-gray-500">FIS</div>
        </div>
        <div>
          <div className="text-lg font-bold text-gray-900">{jugador.nivel_mental}</div>
          <div className="text-xs text-gray-500">MEN</div>
        </div>
      </div>

      {/* Footer info */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
        {jugador.edad && <span>{jugador.edad} años</span>}
        {jugador.nivel_global && (
          <span className="font-medium text-primary">
            Media: {jugador.nivel_global}
          </span>
        )}
      </div>
    </div>
  )
}

// Modal de cambio de estado
function EstadoModal({
  jugador,
  onClose,
  onSave,
}: {
  jugador: Jugador
  onClose: () => void
  onSave: (estado: string, motivo?: string, fechaVuelta?: string) => void
}) {
  const [estado, setEstado] = useState(jugador.estado)
  const [motivo, setMotivo] = useState(jugador.motivo_baja || '')
  const [fechaVuelta, setFechaVuelta] = useState(jugador.fecha_vuelta_estimada || '')

  const estados = Object.entries(ESTADOS_JUGADOR).map(([value, config]) => ({
    value,
    ...config,
  }))

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4">
          Cambiar estado de {jugador.nombre}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
            <div className="grid grid-cols-2 gap-2">
              {estados.map((e) => (
                <button
                  key={e.value}
                  onClick={() => setEstado(e.value as any)}
                  className={`p-2 rounded-lg border text-sm font-medium transition-all ${
                    estado === e.value
                      ? 'border-2 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  style={{
                    borderColor: estado === e.value ? e.color : undefined,
                    backgroundColor: estado === e.value ? `${e.color}10` : undefined,
                  }}
                >
                  {e.nombre}
                </button>
              ))}
            </div>
          </div>

          {estado !== 'activo' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo (opcional)
                </label>
                <input
                  type="text"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ej: Rotura fibrilar gemelo derecho"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha vuelta estimada (opcional)
                </label>
                <input
                  type="date"
                  value={fechaVuelta}
                  onChange={(e) => setFechaVuelta(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(estado, motivo || undefined, fechaVuelta || undefined)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PlantillaPage() {
  const router = useRouter()
  const { equipos, equipoActivo, setEquipoActivo, loadEquipos, isLoading: equiposLoading } = useEquipoStore()
  const [jugadores, setJugadores] = useState<Jugador[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [equipoDropdownOpen, setEquipoDropdownOpen] = useState(false)

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [posicionFilter, setPosicionFilter] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Modal estado
  const [estadoModal, setEstadoModal] = useState<Jugador | null>(null)

  // Estadisticas
  const [stats, setStats] = useState<{
    total: number
    disponibles: number
    noDisponibles: number
    porZona: Record<string, number>
  } | null>(null)

  // Cargar equipos al montar
  useEffect(() => {
    loadEquipos()
  }, [loadEquipos])

  // Cargar jugadores cuando cambia el equipo activo
  useEffect(() => {
    if (equipoActivo) {
      loadJugadores()
    }
  }, [equipoActivo, posicionFilter, estadoFilter])

  const loadJugadores = async () => {
    if (!equipoActivo) return

    setLoading(true)
    setError(null)

    try {
      const response = await jugadoresApi.list({
        equipo_id: equipoActivo.id,
        posicion: posicionFilter || undefined,
        estado: estadoFilter || undefined,
        busqueda: busqueda || undefined,
      })

      setJugadores(response.data)

      // Calcular stats
      const disponibles = response.data.filter((j) => j.estado === 'activo').length
      const porZona: Record<string, number> = { porteria: 0, defensa: 0, mediocampo: 0, ataque: 0 }
      response.data.forEach((j) => {
        const pos = POSICIONES[j.posicion_principal as keyof typeof POSICIONES]
        if (pos) {
          porZona[pos.zona] = (porZona[pos.zona] || 0) + 1
        }
      })

      setStats({
        total: response.data.length,
        disponibles,
        noDisponibles: response.data.length - disponibles,
        porZona,
      })
    } catch (err) {
      setError('Error al cargar la plantilla')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadJugadores()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este jugador?')) return

    try {
      await jugadoresApi.delete(id)
      loadJugadores()
    } catch (err) {
      console.error('Error deleting jugador:', err)
    }
  }

  const handleChangeEstado = async (estado: string, motivo?: string, fechaVuelta?: string) => {
    if (!estadoModal) return

    try {
      await jugadoresApi.updateEstado(estadoModal.id, estado, motivo, fechaVuelta)
      setEstadoModal(null)
      loadJugadores()
    } catch (err) {
      console.error('Error updating estado:', err)
    }
  }

  const clearFilters = () => {
    setBusqueda('')
    setPosicionFilter('')
    setEstadoFilter('')
  }

  const hasActiveFilters = posicionFilter || estadoFilter

  // Agrupar jugadores por zona
  const jugadoresPorZona = {
    porteria: jugadores.filter((j) => POSICIONES[j.posicion_principal as keyof typeof POSICIONES]?.zona === 'porteria'),
    defensa: jugadores.filter((j) => POSICIONES[j.posicion_principal as keyof typeof POSICIONES]?.zona === 'defensa'),
    mediocampo: jugadores.filter((j) => POSICIONES[j.posicion_principal as keyof typeof POSICIONES]?.zona === 'mediocampo'),
    ataque: jugadores.filter((j) => POSICIONES[j.posicion_principal as keyof typeof POSICIONES]?.zona === 'ataque'),
  }

  const zonaLabels = {
    porteria: 'Porteros',
    defensa: 'Defensas',
    mediocampo: 'Mediocampistas',
    ataque: 'Atacantes',
  }

  const zonaColors = {
    porteria: 'border-amber-500',
    defensa: 'border-blue-500',
    mediocampo: 'border-green-500',
    ataque: 'border-red-500',
  }

  // Si no hay equipos cargados, mostrar loading o error
  if (equiposLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (equipos.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-gray-900 mb-2">No hay equipos</h2>
        <p className="text-gray-500">Contacta con el administrador para crear equipos</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con selector de equipo */}
      <div className="flex flex-col gap-4">
        {/* Selector de equipo */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              onClick={() => setEquipoDropdownOpen(!equipoDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Users className="h-5 w-5 text-primary" />
              <span className="font-medium text-gray-900">
                {equipoActivo?.nombre || 'Seleccionar equipo'}
              </span>
              {equipoActivo?.categoria && (
                <span className="text-sm text-gray-500">({equipoActivo.categoria})</span>
              )}
              <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${equipoDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {equipoDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                {equipos.map((equipo) => (
                  <button
                    key={equipo.id}
                    onClick={() => {
                      setEquipoActivo(equipo)
                      setEquipoDropdownOpen(false)
                    }}
                    className={`flex items-center justify-between w-full px-4 py-2 text-sm hover:bg-gray-50 ${
                      equipoActivo?.id === equipo.id ? 'bg-primary/5 text-primary' : 'text-gray-700'
                    }`}
                  >
                    <span className="font-medium">{equipo.nombre}</span>
                    {equipo.categoria && (
                      <span className="text-xs text-gray-500">{equipo.categoria}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Título y acciones */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Plantilla</h1>
            <p className="text-gray-500">
              {stats ? `${stats.disponibles} disponibles de ${stats.total} jugadores` : 'Selecciona un equipo'}
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/plantilla/invitados"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              Invitados
            </Link>
            <Link
              href="/plantilla/nuevo"
              className={`inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors ${!equipoActivo ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <Plus className="h-4 w-4" />
              Nuevo Jugador
            </Link>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500">Total</div>
          </div>
          <div className="bg-white rounded-xl border border-green-200 p-4">
            <div className="text-2xl font-bold text-green-600">{stats.disponibles}</div>
            <div className="text-sm text-gray-500">Disponibles</div>
          </div>
          <div className="bg-white rounded-xl border border-amber-200 p-4">
            <div className="text-2xl font-bold text-amber-600">{stats.porZona.porteria || 0}</div>
            <div className="text-sm text-gray-500">Porteros</div>
          </div>
          <div className="bg-white rounded-xl border border-blue-200 p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.porZona.defensa || 0}</div>
            <div className="text-sm text-gray-500">Defensas</div>
          </div>
          <div className="bg-white rounded-xl border border-emerald-200 p-4">
            <div className="text-2xl font-bold text-emerald-600">{stats.porZona.mediocampo || 0}</div>
            <div className="text-sm text-gray-500">Medios</div>
          </div>
          <div className="bg-white rounded-xl border border-red-200 p-4">
            <div className="text-2xl font-bold text-red-600">{stats.porZona.ataque || 0}</div>
            <div className="text-sm text-gray-500">Delanteros</div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>

            <select
              value={posicionFilter}
              onChange={(e) => setPosicionFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white"
            >
              <option value="">Todas las posiciones</option>
              {Object.entries(POSICIONES).map(([code, pos]) => (
                <option key={code} value={code}>
                  {code} - {pos.nombre}
                </option>
              ))}
            </select>

            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white"
            >
              <option value="">Todos los estados</option>
              {Object.entries(ESTADOS_JUGADOR).map(([value, config]) => (
                <option key={value} value={value}>
                  {config.nombre}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Buscar
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="px-3 py-2 text-gray-500 hover:text-gray-700"
              >
                Limpiar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Lista de jugadores */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadJugadores}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Reintentar
          </button>
        </div>
      ) : jugadores.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay jugadores</h3>
          <p className="text-gray-500 mb-4">
            {hasActiveFilters
              ? 'No se encontraron jugadores con los filtros aplicados'
              : 'Comienza agregando jugadores a tu plantilla'
            }
          </p>
          {!hasActiveFilters && (
            <Link
              href="/plantilla/nuevo"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Agregar jugador
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(jugadoresPorZona).map(([zona, jugadoresZona]) => {
            if (jugadoresZona.length === 0) return null

            return (
              <div key={zona}>
                <h2 className={`text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 ${zonaColors[zona as keyof typeof zonaColors]}`}>
                  {zonaLabels[zona as keyof typeof zonaLabels]} ({jugadoresZona.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {jugadoresZona.map((jugador) => (
                    <JugadorCard
                      key={jugador.id}
                      jugador={jugador}
                      onEdit={() => router.push(`/plantilla/${jugador.id}/editar`)}
                      onDelete={() => handleDelete(jugador.id)}
                      onChangeEstado={() => setEstadoModal(jugador)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de estado */}
      {estadoModal && (
        <EstadoModal
          jugador={estadoModal}
          onClose={() => setEstadoModal(null)}
          onSave={handleChangeEstado}
        />
      )}
    </div>
  )
}
