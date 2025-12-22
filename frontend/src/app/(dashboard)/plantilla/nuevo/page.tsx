'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Save,
  Loader2,
  User,
  Upload,
  AlertCircle
} from 'lucide-react'
import { jugadoresApi, JugadorCreate, POSICIONES } from '@/lib/api/jugadores'
import { useEquipoStore } from '@/stores/equipoStore'

export default function NuevoJugadorPage() {
  const router = useRouter()
  const { equipoActivo } = useEquipoStore()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    apellidos: '',
    fecha_nacimiento: '',
    dorsal: '',
    posicion_principal: 'MC',
    posiciones_secundarias: [] as string[],
    altura: '',
    peso: '',
    pierna_dominante: 'derecha' as 'derecha' | 'izquierda' | 'ambas',
    nivel_tecnico: 5,
    nivel_tactico: 5,
    nivel_fisico: 5,
    nivel_mental: 5,
    es_capitan: false,
    es_convocable: true,
    notas: '',
  })

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handlePosicionSecundaria = (pos: string) => {
    setFormData((prev) => {
      const current = prev.posiciones_secundarias
      if (current.includes(pos)) {
        return { ...prev, posiciones_secundarias: current.filter((p) => p !== pos) }
      } else if (current.length < 3) {
        return { ...prev, posiciones_secundarias: [...current, pos] }
      }
      return prev
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!equipoActivo) {
      setError('Debes seleccionar un equipo primero')
      return
    }

    if (!formData.nombre || !formData.apellidos || !formData.posicion_principal) {
      setError('Los campos nombre, apellidos y posición principal son obligatorios')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const jugadorData: JugadorCreate = {
        equipo_id: equipoActivo.id,
        nombre: formData.nombre,
        apellidos: formData.apellidos,
        fecha_nacimiento: formData.fecha_nacimiento || undefined,
        dorsal: formData.dorsal ? parseInt(formData.dorsal) : undefined,
        posicion_principal: formData.posicion_principal,
        posiciones_secundarias: formData.posiciones_secundarias,
        altura: formData.altura ? parseFloat(formData.altura) : undefined,
        peso: formData.peso ? parseFloat(formData.peso) : undefined,
        pierna_dominante: formData.pierna_dominante,
        nivel_tecnico: formData.nivel_tecnico,
        nivel_tactico: formData.nivel_tactico,
        nivel_fisico: formData.nivel_fisico,
        nivel_mental: formData.nivel_mental,
        es_capitan: formData.es_capitan,
        es_convocable: formData.es_convocable,
        notas: formData.notas || undefined,
      }

      const created = await jugadoresApi.create(jugadorData)
      router.push(`/plantilla/${created.id}`)
    } catch (err: any) {
      console.error('Error creating jugador:', err)
      setError(err.message || 'Error al crear el jugador')
    } finally {
      setSaving(false)
    }
  }

  // Agrupar posiciones por zona
  const posicionesPorZona = {
    porteria: Object.entries(POSICIONES).filter(([_, p]) => p.zona === 'porteria'),
    defensa: Object.entries(POSICIONES).filter(([_, p]) => p.zona === 'defensa'),
    mediocampo: Object.entries(POSICIONES).filter(([_, p]) => p.zona === 'mediocampo'),
    ataque: Object.entries(POSICIONES).filter(([_, p]) => p.zona === 'ataque'),
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/plantilla"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nuevo Jugador</h1>
          <p className="text-gray-500">Añade un jugador a tu plantilla</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Datos básicos */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Datos básicos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => handleChange('nombre', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                placeholder="Ej: Juan"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Apellidos *
              </label>
              <input
                type="text"
                value={formData.apellidos}
                onChange={(e) => handleChange('apellidos', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                placeholder="Ej: García López"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de nacimiento
              </label>
              <input
                type="date"
                value={formData.fecha_nacimiento}
                onChange={(e) => handleChange('fecha_nacimiento', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dorsal
              </label>
              <input
                type="number"
                min="1"
                max="99"
                value={formData.dorsal}
                onChange={(e) => handleChange('dorsal', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                placeholder="Ej: 10"
              />
            </div>
          </div>
        </div>

        {/* Posición */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Posición</h2>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Posición principal *
            </label>
            <div className="space-y-4">
              {Object.entries(posicionesPorZona).map(([zona, posiciones]) => (
                <div key={zona}>
                  <span className="text-xs font-medium text-gray-500 uppercase">
                    {zona === 'porteria' ? 'Portería' : zona.charAt(0).toUpperCase() + zona.slice(1)}
                  </span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {posiciones.map(([code, pos]) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => handleChange('posicion_principal', code)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          formData.posicion_principal === code
                            ? 'text-white shadow-sm'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        style={{
                          backgroundColor: formData.posicion_principal === code ? pos.color : undefined,
                        }}
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Posiciones secundarias (máx. 3)
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(POSICIONES)
                .filter(([code]) => code !== formData.posicion_principal)
                .map(([code, pos]) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => handlePosicionSecundaria(code)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      formData.posiciones_secundarias.includes(code)
                        ? 'text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    style={{
                      backgroundColor: formData.posiciones_secundarias.includes(code)
                        ? pos.color
                        : undefined,
                    }}
                  >
                    {code}
                  </button>
                ))}
            </div>
          </div>
        </div>

        {/* Físico */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Datos físicos</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Altura (m)
              </label>
              <input
                type="number"
                step="0.01"
                min="1.0"
                max="2.5"
                value={formData.altura}
                onChange={(e) => handleChange('altura', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                placeholder="Ej: 1.75"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Peso (kg)
              </label>
              <input
                type="number"
                step="0.1"
                min="30"
                max="150"
                value={formData.peso}
                onChange={(e) => handleChange('peso', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                placeholder="Ej: 70"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pierna dominante
              </label>
              <select
                value={formData.pierna_dominante}
                onChange={(e) => handleChange('pierna_dominante', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white"
              >
                <option value="derecha">Derecha</option>
                <option value="izquierda">Izquierda</option>
                <option value="ambas">Ambas</option>
              </select>
            </div>
          </div>
        </div>

        {/* Niveles */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Niveles (1-10)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { key: 'nivel_tecnico', label: 'Técnico', description: 'Control, pase, regate, tiro' },
              { key: 'nivel_tactico', label: 'Táctico', description: 'Posicionamiento, visión de juego' },
              { key: 'nivel_fisico', label: 'Físico', description: 'Velocidad, resistencia, fuerza' },
              { key: 'nivel_mental', label: 'Mental', description: 'Concentración, liderazgo, personalidad' },
            ].map(({ key, label, description }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {label}
                </label>
                <p className="text-xs text-gray-500 mb-2">{description}</p>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={formData[key as keyof typeof formData] as number}
                    onChange={(e) => handleChange(key, parseInt(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <span className="w-8 text-center font-bold text-primary">
                    {formData[key as keyof typeof formData]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Opciones */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Opciones</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.es_capitan}
                onChange={(e) => handleChange('es_capitan', e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">Es capitán</span>
                <p className="text-xs text-gray-500">Marcar como capitán del equipo</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.es_convocable}
                onChange={(e) => handleChange('es_convocable', e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">Es convocable</span>
                <p className="text-xs text-gray-500">Puede ser convocado para partidos</p>
              </div>
            </label>
          </div>
        </div>

        {/* Notas */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Notas</h2>
          <textarea
            value={formData.notas}
            onChange={(e) => handleChange('notas', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
            placeholder="Añade notas sobre el jugador..."
          />
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3">
          <Link
            href="/plantilla"
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Crear Jugador
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
