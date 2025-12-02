'use client'

import { useState, useEffect } from 'react'
import {
  Plus,
  Search,
  Filter,
  User,
  Edit,
  Trash2,
  Activity,
  AlertCircle,
  ChevronDown,
  X
} from 'lucide-react'
import { jugadoresApi, Jugador, JugadorCreate, POSICIONES, ESTADOS_JUGADOR } from '@/lib/api/jugadores'

// Datos demo mientras no haya conexión real
const DEMO_JUGADORES: Jugador[] = [
  {
    id: '1',
    equipo_id: 'demo-team',
    nombre: 'Marc',
    apellidos: 'García López',
    fecha_nacimiento: '2005-03-15',
    dorsal: 1,
    posicion_principal: 'POR',
    posiciones_secundarias: [],
    pierna_dominante: 'derecha',
    nivel_tecnico: 7,
    nivel_tactico: 6,
    nivel_fisico: 8,
    nivel_mental: 7,
    estado: 'activo',
    es_capitan: false,
    es_convocable: true,
    es_portero: true,
    created_at: '',
    updated_at: '',
    edad: 19,
    nivel_global: 7.0,
  },
  {
    id: '2',
    equipo_id: 'demo-team',
    nombre: 'Pablo',
    apellidos: 'Martínez Ruiz',
    fecha_nacimiento: '2004-07-22',
    dorsal: 4,
    posicion_principal: 'DFC',
    posiciones_secundarias: ['MCD'],
    pierna_dominante: 'derecha',
    nivel_tecnico: 6,
    nivel_tactico: 8,
    nivel_fisico: 7,
    nivel_mental: 8,
    estado: 'activo',
    es_capitan: true,
    es_convocable: true,
    es_portero: false,
    created_at: '',
    updated_at: '',
    edad: 20,
    nivel_global: 7.3,
  },
  {
    id: '3',
    equipo_id: 'demo-team',
    nombre: 'Alejandro',
    apellidos: 'Fernández Gil',
    fecha_nacimiento: '2005-11-08',
    dorsal: 10,
    posicion_principal: 'MCO',
    posiciones_secundarias: ['MP', 'EXD'],
    pierna_dominante: 'izquierda',
    nivel_tecnico: 9,
    nivel_tactico: 7,
    nivel_fisico: 6,
    nivel_mental: 7,
    estado: 'activo',
    es_capitan: false,
    es_convocable: true,
    es_portero: false,
    created_at: '',
    updated_at: '',
    edad: 19,
    nivel_global: 7.3,
  },
  {
    id: '4',
    equipo_id: 'demo-team',
    nombre: 'Carlos',
    apellidos: 'Sánchez Mora',
    fecha_nacimiento: '2004-02-14',
    dorsal: 9,
    posicion_principal: 'DC',
    posiciones_secundarias: ['SD'],
    pierna_dominante: 'derecha',
    nivel_tecnico: 8,
    nivel_tactico: 6,
    nivel_fisico: 8,
    nivel_mental: 6,
    estado: 'lesionado',
    fecha_lesion: '2024-11-20',
    fecha_vuelta_estimada: '2024-12-15',
    motivo_baja: 'Esguince de tobillo',
    es_capitan: false,
    es_convocable: true,
    es_portero: false,
    created_at: '',
    updated_at: '',
    edad: 20,
    nivel_global: 7.0,
  },
]

export default function EquipoPage() {
  const [jugadores, setJugadores] = useState<Jugador[]>(DEMO_JUGADORES)
  const [filteredJugadores, setFilteredJugadores] = useState<Jugador[]>(DEMO_JUGADORES)
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPosicion, setFilterPosicion] = useState<string>('')
  const [filterEstado, setFilterEstado] = useState<string>('')
  const [showModal, setShowModal] = useState(false)
  const [editingJugador, setEditingJugador] = useState<Jugador | null>(null)

  // Filtrar jugadores
  useEffect(() => {
    let filtered = [...jugadores]

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(j =>
        j.nombre.toLowerCase().includes(term) ||
        j.apellidos.toLowerCase().includes(term)
      )
    }

    if (filterPosicion) {
      filtered = filtered.filter(j => j.posicion_principal === filterPosicion)
    }

    if (filterEstado) {
      filtered = filtered.filter(j => j.estado === filterEstado)
    }

    setFilteredJugadores(filtered)
  }, [jugadores, searchTerm, filterPosicion, filterEstado])

  const handleAddJugador = () => {
    setEditingJugador(null)
    setShowModal(true)
  }

  const handleEditJugador = (jugador: Jugador) => {
    setEditingJugador(jugador)
    setShowModal(true)
  }

  const handleDeleteJugador = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este jugador?')) return
    setJugadores(prev => prev.filter(j => j.id !== id))
  }

  const handleSaveJugador = (data: JugadorCreate) => {
    if (editingJugador) {
      // Editar
      setJugadores(prev => prev.map(j =>
        j.id === editingJugador.id
          ? { ...j, ...data, updated_at: new Date().toISOString() }
          : j
      ))
    } else {
      // Crear
      const newJugador: Jugador = {
        ...data,
        id: Math.random().toString(36).substr(2, 9),
        posiciones_secundarias: data.posiciones_secundarias || [],
        pierna_dominante: data.pierna_dominante || 'derecha',
        nivel_tecnico: data.nivel_tecnico || 5,
        nivel_tactico: data.nivel_tactico || 5,
        nivel_fisico: data.nivel_fisico || 5,
        nivel_mental: data.nivel_mental || 5,
        estado: data.estado || 'activo',
        es_capitan: data.es_capitan || false,
        es_convocable: data.es_convocable !== false,
        es_portero: data.posicion_principal === 'POR',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        nivel_global: ((data.nivel_tecnico || 5) + (data.nivel_tactico || 5) + (data.nivel_fisico || 5) + (data.nivel_mental || 5)) / 4,
      }
      setJugadores(prev => [...prev, newJugador])
    }
    setShowModal(false)
  }

  // Estadísticas
  const stats = {
    total: jugadores.length,
    activos: jugadores.filter(j => j.estado === 'activo').length,
    lesionados: jugadores.filter(j => j.estado === 'lesionado').length,
    porteros: jugadores.filter(j => j.es_portero).length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Equipo</h1>
          <p className="text-gray-500">Administra la plantilla y fichas de jugadores</p>
        </div>
        <button
          onClick={handleAddJugador}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Añadir Jugador
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">Jugadores</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Activity className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.activos}</p>
              <p className="text-sm text-gray-500">Activos</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.lesionados}</p>
              <p className="text-sm text-gray-500">Lesionados</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <User className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.porteros}</p>
              <p className="text-sm text-gray-500">Porteros</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar jugador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <select
            value={filterPosicion}
            onChange={(e) => setFilterPosicion(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">Todas las posiciones</option>
            {Object.entries(POSICIONES).map(([codigo, pos]) => (
              <option key={codigo} value={codigo}>{pos.nombre}</option>
            ))}
          </select>
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS_JUGADOR).map(([codigo, estado]) => (
              <option key={codigo} value={codigo}>{estado.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de jugadores */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jugador
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Posición
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Edad
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nivel
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredJugadores.map((jugador) => {
                const posicion = POSICIONES[jugador.posicion_principal as keyof typeof POSICIONES]
                const estado = ESTADOS_JUGADOR[jugador.estado as keyof typeof ESTADOS_JUGADOR]

                return (
                  <tr key={jugador.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: posicion?.color || '#6B7280' }}
                        >
                          {jugador.dorsal || '?'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {jugador.nombre} {jugador.apellidos}
                            {jugador.es_capitan && (
                              <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                                C
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-gray-500">
                            {jugador.pierna_dominante === 'izquierda' ? 'Zurdo' :
                             jugador.pierna_dominante === 'ambas' ? 'Ambidiestro' : 'Diestro'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium text-white"
                        style={{ backgroundColor: posicion?.color || '#6B7280' }}
                      >
                        {jugador.posicion_principal}
                      </span>
                      {jugador.posiciones_secundarias.length > 0 && (
                        <span className="ml-2 text-xs text-gray-500">
                          +{jugador.posiciones_secundarias.length}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center text-sm text-gray-900">
                      {jugador.edad || '-'}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`
                        inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold
                        ${(jugador.nivel_global || 5) >= 7 ? 'bg-green-100 text-green-700' :
                          (jugador.nivel_global || 5) >= 5 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'}
                      `}>
                        {jugador.nivel_global?.toFixed(1) || '5.0'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium text-white"
                        style={{ backgroundColor: estado?.color || '#6B7280' }}
                      >
                        {estado?.nombre || jugador.estado}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditJugador(jugador)}
                          className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-100 rounded"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteJugador(jugador.id)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredJugadores.length === 0 && (
          <div className="text-center py-12">
            <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No se encontraron jugadores</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <JugadorModal
          jugador={editingJugador}
          onClose={() => setShowModal(false)}
          onSave={handleSaveJugador}
        />
      )}
    </div>
  )
}

// Modal para crear/editar jugador
function JugadorModal({
  jugador,
  onClose,
  onSave,
}: {
  jugador: Jugador | null
  onClose: () => void
  onSave: (data: JugadorCreate) => void
}) {
  const [formData, setFormData] = useState<JugadorCreate>({
    equipo_id: jugador?.equipo_id || 'demo-team',
    nombre: jugador?.nombre || '',
    apellidos: jugador?.apellidos || '',
    fecha_nacimiento: jugador?.fecha_nacimiento || '',
    dorsal: jugador?.dorsal,
    posicion_principal: jugador?.posicion_principal || 'MC',
    posiciones_secundarias: jugador?.posiciones_secundarias || [],
    altura: jugador?.altura,
    peso: jugador?.peso,
    pierna_dominante: jugador?.pierna_dominante || 'derecha',
    nivel_tecnico: jugador?.nivel_tecnico || 5,
    nivel_tactico: jugador?.nivel_tactico || 5,
    nivel_fisico: jugador?.nivel_fisico || 5,
    nivel_mental: jugador?.nivel_mental || 5,
    es_capitan: jugador?.es_capitan || false,
    es_convocable: jugador?.es_convocable !== false,
    notas: jugador?.notas || '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-900/50" onClick={onClose} />

        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {jugador ? 'Editar Jugador' : 'Nuevo Jugador'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Datos personales */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Datos Personales</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Nombre *</label>
                  <input
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Apellidos *</label>
                  <input
                    type="text"
                    required
                    value={formData.apellidos}
                    onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Fecha Nacimiento</label>
                  <input
                    type="date"
                    value={formData.fecha_nacimiento || ''}
                    onChange={(e) => setFormData({ ...formData, fecha_nacimiento: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Dorsal</label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={formData.dorsal || ''}
                    onChange={(e) => setFormData({ ...formData, dorsal: parseInt(e.target.value) || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Posición */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Posición</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Posición Principal *</label>
                  <select
                    required
                    value={formData.posicion_principal}
                    onChange={(e) => setFormData({ ...formData, posicion_principal: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    {Object.entries(POSICIONES).map(([codigo, pos]) => (
                      <option key={codigo} value={codigo}>{pos.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Pierna Dominante</label>
                  <select
                    value={formData.pierna_dominante}
                    onChange={(e) => setFormData({ ...formData, pierna_dominante: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="derecha">Diestro</option>
                    <option value="izquierda">Zurdo</option>
                    <option value="ambas">Ambidiestro</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Físico */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Datos Físicos</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Altura (m)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={1}
                    max={2.5}
                    value={formData.altura || ''}
                    onChange={(e) => setFormData({ ...formData, altura: parseFloat(e.target.value) || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="1.75"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Peso (kg)</label>
                  <input
                    type="number"
                    min={30}
                    max={150}
                    value={formData.peso || ''}
                    onChange={(e) => setFormData({ ...formData, peso: parseFloat(e.target.value) || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="70"
                  />
                </div>
              </div>
            </div>

            {/* Niveles */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Niveles (1-10)</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {(['nivel_tecnico', 'nivel_tactico', 'nivel_fisico', 'nivel_mental'] as const).map((nivel) => (
                  <div key={nivel}>
                    <label className="block text-sm text-gray-600 mb-1 capitalize">
                      {nivel.replace('nivel_', '')}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={formData[nivel] || 5}
                      onChange={(e) => setFormData({ ...formData, [nivel]: parseInt(e.target.value) || 5 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Opciones */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Opciones</h3>
              <div className="flex gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.es_capitan}
                    onChange={(e) => setFormData({ ...formData, es_capitan: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-600">Capitán</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.es_convocable}
                    onChange={(e) => setFormData({ ...formData, es_convocable: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-600">Convocable</span>
                </label>
              </div>
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Notas</label>
              <textarea
                value={formData.notas || ''}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Observaciones sobre el jugador..."
              />
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                {jugador ? 'Guardar Cambios' : 'Crear Jugador'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
