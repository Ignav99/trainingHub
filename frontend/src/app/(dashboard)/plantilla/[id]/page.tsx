'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Edit,
  Trash2,
  Save,
  Loader2,
  User,
  Calendar,
  Ruler,
  Weight,
  Star,
  AlertCircle,
  CheckCircle,
  Activity,
  Camera
} from 'lucide-react'
import { Jugador, JugadorUpdate, jugadoresApi, POSICIONES, ESTADOS_JUGADOR } from '@/lib/api/jugadores'

export default function JugadorDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [jugador, setJugador] = useState<Jugador | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  // Form state
  const [formData, setFormData] = useState<JugadorUpdate>({})

  useEffect(() => {
    loadJugador()
  }, [params.id])

  const loadJugador = async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await jugadoresApi.get(params.id as string)
      setJugador(data)
      setFormData({
        nombre: data.nombre,
        apellidos: data.apellidos,
        fecha_nacimiento: data.fecha_nacimiento,
        dorsal: data.dorsal,
        posicion_principal: data.posicion_principal,
        posiciones_secundarias: data.posiciones_secundarias,
        altura: data.altura,
        peso: data.peso,
        pierna_dominante: data.pierna_dominante,
        nivel_tecnico: data.nivel_tecnico,
        nivel_tactico: data.nivel_tactico,
        nivel_fisico: data.nivel_fisico,
        nivel_mental: data.nivel_mental,
        es_capitan: data.es_capitan,
        es_convocable: data.es_convocable,
        notas: data.notas,
      })
    } catch (err) {
      setError('Error al cargar el jugador')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!jugador) return

    setSaving(true)
    try {
      await jugadoresApi.update(jugador.id, formData)
      await loadJugador()
      setIsEditing(false)
    } catch (err) {
      console.error('Error saving jugador:', err)
      alert('Error al guardar los cambios')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!jugador) return
    if (!confirm('¿Estás seguro de que quieres eliminar este jugador?')) return

    try {
      await jugadoresApi.delete(jugador.id)
      router.push('/plantilla')
    } catch (err) {
      console.error('Error deleting jugador:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !jugador) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600 mb-4">{error || 'Jugador no encontrado'}</p>
        <Link href="/plantilla" className="text-primary hover:underline">
          Volver a plantilla
        </Link>
      </div>
    )
  }

  const pos = POSICIONES[jugador.posicion_principal as keyof typeof POSICIONES]
  const estadoConfig = ESTADOS_JUGADOR[jugador.estado as keyof typeof ESTADOS_JUGADOR]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/plantilla"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {jugador.nombre} {jugador.apellidos}
            </h1>
            <p className="text-gray-500">Ficha del jugador</p>
          </div>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Edit className="h-4 w-4" />
                Editar
              </button>
              <button
                onClick={handleDelete}
                className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Photo and basic info */}
        <div className="space-y-6">
          {/* Photo card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="relative mx-auto w-40 h-40 mb-4">
              {jugador.foto_url ? (
                <img
                  src={jugador.foto_url}
                  alt={`${jugador.nombre} ${jugador.apellidos}`}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full rounded-full flex items-center justify-center text-white text-4xl font-bold"
                  style={{ backgroundColor: pos?.color || '#6B7280' }}
                >
                  {jugador.nombre[0]}{jugador.apellidos[0]}
                </div>
              )}
              {jugador.dorsal && (
                <span className="absolute bottom-2 right-2 bg-gray-900 text-white text-xl font-bold px-3 py-1 rounded-lg">
                  {jugador.dorsal}
                </span>
              )}
              {jugador.es_capitan && (
                <div className="absolute top-0 right-0 bg-amber-400 rounded-full p-2">
                  <Star className="h-5 w-5 text-white fill-white" />
                </div>
              )}
            </div>

            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900">
                {jugador.nombre} {jugador.apellidos}
              </h2>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span
                  className="px-3 py-1 rounded-full text-white text-sm font-medium"
                  style={{ backgroundColor: pos?.color }}
                >
                  {jugador.posicion_principal}
                </span>
                <span className="text-gray-500">{pos?.nombre}</span>
              </div>
            </div>

            {/* Estado */}
            <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: `${estadoConfig?.color}15` }}>
              <div className="flex items-center gap-2">
                {jugador.estado === 'activo' ? (
                  <CheckCircle className="h-5 w-5" style={{ color: estadoConfig?.color }} />
                ) : (
                  <Activity className="h-5 w-5" style={{ color: estadoConfig?.color }} />
                )}
                <span className="font-medium" style={{ color: estadoConfig?.color }}>
                  {estadoConfig?.nombre}
                </span>
              </div>
              {jugador.motivo_baja && (
                <p className="text-sm text-gray-600 mt-1">{jugador.motivo_baja}</p>
              )}
              {jugador.fecha_vuelta_estimada && (
                <p className="text-xs text-gray-500 mt-1">
                  Vuelta estimada: {new Date(jugador.fecha_vuelta_estimada).toLocaleDateString('es-ES')}
                </p>
              )}
            </div>
          </div>

          {/* Personal info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Datos personales</h3>
            <div className="space-y-3">
              {jugador.fecha_nacimiento && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Fecha de nacimiento</p>
                    <p className="font-medium">
                      {new Date(jugador.fecha_nacimiento).toLocaleDateString('es-ES')}
                      {jugador.edad && ` (${jugador.edad} años)`}
                    </p>
                  </div>
                </div>
              )}
              {jugador.altura && (
                <div className="flex items-center gap-3">
                  <Ruler className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Altura</p>
                    <p className="font-medium">{jugador.altura} m</p>
                  </div>
                </div>
              )}
              {jugador.peso && (
                <div className="flex items-center gap-3">
                  <Weight className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Peso</p>
                    <p className="font-medium">{jugador.peso} kg</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Pierna dominante</p>
                  <p className="font-medium capitalize">{jugador.pierna_dominante}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column - Stats and details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Niveles */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Niveles</h3>
              {jugador.nivel_global && (
                <span className="text-2xl font-bold text-primary">{jugador.nivel_global}</span>
              )}
            </div>

            {isEditing ? (
              <div className="grid grid-cols-2 gap-4">
                {['tecnico', 'tactico', 'fisico', 'mental'].map((nivel) => (
                  <div key={nivel}>
                    <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                      {nivel}
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={formData[`nivel_${nivel}` as keyof JugadorUpdate] as number || 5}
                      onChange={(e) => setFormData({
                        ...formData,
                        [`nivel_${nivel}`]: parseInt(e.target.value)
                      })}
                      className="w-full"
                    />
                    <div className="text-center font-bold text-primary">
                      {formData[`nivel_${nivel}` as keyof JugadorUpdate] as number || 5}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-4">
                {[
                  { key: 'nivel_tecnico', label: 'Técnico', color: 'bg-blue-500' },
                  { key: 'nivel_tactico', label: 'Táctico', color: 'bg-green-500' },
                  { key: 'nivel_fisico', label: 'Físico', color: 'bg-red-500' },
                  { key: 'nivel_mental', label: 'Mental', color: 'bg-purple-500' },
                ].map(({ key, label, color }) => (
                  <div key={key} className="text-center">
                    <div className="relative w-20 h-20 mx-auto mb-2">
                      <svg className="w-full h-full" viewBox="0 0 36 36">
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#e5e7eb"
                          strokeWidth="3"
                        />
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeDasharray={`${(jugador[key as keyof Jugador] as number) * 10}, 100`}
                          className={color.replace('bg-', 'text-')}
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xl font-bold">
                        {jugador[key as keyof Jugador]}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Posiciones */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Posiciones</h3>
            <div className="flex flex-wrap gap-2">
              <span
                className="px-3 py-1.5 rounded-lg text-white font-medium"
                style={{ backgroundColor: pos?.color }}
              >
                {jugador.posicion_principal} - Principal
              </span>
              {jugador.posiciones_secundarias?.map((p) => {
                const secPos = POSICIONES[p as keyof typeof POSICIONES]
                return (
                  <span
                    key={p}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium border"
                    style={{ borderColor: secPos?.color, color: secPos?.color }}
                  >
                    {p}
                  </span>
                )
              })}
            </div>
          </div>

          {/* Datos adicionales */}
          {isEditing ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Datos adicionales</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={formData.nombre || ''}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos</label>
                  <input
                    type="text"
                    value={formData.apellidos || ''}
                    onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dorsal</label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={formData.dorsal || ''}
                    onChange={(e) => setFormData({ ...formData, dorsal: parseInt(e.target.value) || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha nacimiento</label>
                  <input
                    type="date"
                    value={formData.fecha_nacimiento || ''}
                    onChange={(e) => setFormData({ ...formData, fecha_nacimiento: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Altura (m)</label>
                  <input
                    type="number"
                    step={0.01}
                    min={1}
                    max={2.5}
                    value={formData.altura || ''}
                    onChange={(e) => setFormData({ ...formData, altura: parseFloat(e.target.value) || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
                  <input
                    type="number"
                    min={30}
                    max={150}
                    value={formData.peso || ''}
                    onChange={(e) => setFormData({ ...formData, peso: parseFloat(e.target.value) || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.es_capitan || false}
                    onChange={(e) => setFormData({ ...formData, es_capitan: e.target.checked })}
                    className="w-4 h-4 text-primary rounded focus:ring-primary"
                  />
                  <span className="text-sm">Capitán</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.es_convocable !== false}
                    onChange={(e) => setFormData({ ...formData, es_convocable: e.target.checked })}
                    className="w-4 h-4 text-primary rounded focus:ring-primary"
                  />
                  <span className="text-sm">Convocable</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea
                  value={formData.notas || ''}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                  placeholder="Notas sobre el jugador..."
                />
              </div>
            </div>
          ) : jugador.notas ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Notas</h3>
              <p className="text-gray-600">{jugador.notas}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
