'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Save,
  Loader2,
  Clock,
  Users,
  Maximize2,
  Target,
  Brain,
  MessageCircle
} from 'lucide-react'
import { tareasApi, catalogosApi, TareaCreateData } from '@/lib/api/tareas'

const FASES_JUEGO = [
  { value: 'ataque_organizado', label: 'Ataque Organizado' },
  { value: 'defensa_organizada', label: 'Defensa Organizada' },
  { value: 'transicion_ataque_defensa', label: 'Transición Ataque-Defensa' },
  { value: 'transicion_defensa_ataque', label: 'Transición Defensa-Ataque' },
]

const DENSIDADES = [
  { value: 'alta', label: 'Alta' },
  { value: 'media', label: 'Media' },
  { value: 'baja', label: 'Baja' },
]

export default function NuevaTareaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(1)
  const totalSteps = 4

  // Catálogos
  const [categorias, setCategorias] = useState<Array<{ codigo: string; nombre: string; color: string }>>([])
  const [principios, setPrincipios] = useState<string[]>([])

  // Form data
  const [formData, setFormData] = useState<TareaCreateData>({
    titulo: '',
    categoria_id: '',
    duracion_total: 15,
    num_jugadores_min: 8,
    num_jugadores_max: 12,
    num_porteros: 0,
    espacio_largo: 30,
    espacio_ancho: 20,
    espacio_forma: 'rectangular',
    descripcion: '',
    como_inicia: '',
    como_finaliza: '',
    fase_juego: undefined,
    principio_tactico: '',
    nivel_cognitivo: 2,
    densidad: 'media',
    reglas_tecnicas: [],
    reglas_tacticas: [],
    consignas_ofensivas: [],
    consignas_defensivas: [],
    errores_comunes: [],
    es_plantilla: false,
    tags: [],
  })

  // Inputs temporales para arrays
  const [newReglaTecnica, setNewReglaTecnica] = useState('')
  const [newReglaTactica, setNewReglaTactica] = useState('')
  const [newConsignaOfensiva, setNewConsignaOfensiva] = useState('')
  const [newConsignaDefensiva, setNewConsignaDefensiva] = useState('')

  useEffect(() => {
    loadCategorias()
  }, [])

  useEffect(() => {
    if (formData.fase_juego) {
      loadPrincipios(formData.fase_juego)
    } else {
      setPrincipios([])
    }
  }, [formData.fase_juego])

  const loadCategorias = async () => {
    try {
      const response = await catalogosApi.getCategorias()
      setCategorias(response.data)
    } catch (err) {
      console.error('Error loading categorias:', err)
    }
  }

  const loadPrincipios = async (fase: string) => {
    try {
      const response = await catalogosApi.getPrincipios(fase)
      setPrincipios(response.data)
    } catch (err) {
      console.error('Error loading principios:', err)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)

    try {
      // Obtener el ID de la categoría
      const categoria = categorias.find(c => c.codigo === formData.categoria_id)
      if (!categoria) {
        setError('Selecciona una categoría')
        setLoading(false)
        return
      }

      // Por ahora usamos el código como ID (el backend buscará el ID real)
      const dataToSend: TareaCreateData = {
        ...formData,
        categoria_id: formData.categoria_id, // El backend resolverá esto
      }

      await tareasApi.create(dataToSend)
      router.push('/tareas')
    } catch (err: any) {
      setError(err.message || 'Error al crear la tarea')
    } finally {
      setLoading(false)
    }
  }

  const addToArray = (field: keyof TareaCreateData, value: string, setter: (v: string) => void) => {
    if (!value.trim()) return
    const current = (formData[field] as string[]) || []
    setFormData({ ...formData, [field]: [...current, value.trim()] })
    setter('')
  }

  const removeFromArray = (field: keyof TareaCreateData, index: number) => {
    const current = (formData[field] as string[]) || []
    setFormData({ ...formData, [field]: current.filter((_, i) => i !== index) })
  }

  const canGoNext = () => {
    switch (step) {
      case 1:
        return formData.titulo && formData.categoria_id && formData.duracion_total > 0
      case 2:
        return formData.num_jugadores_min > 0
      case 3:
        return true // Paso de contenido táctico es opcional
      case 4:
        return true // Paso de coaching points es opcional
      default:
        return false
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/tareas"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nueva Tarea</h1>
          <p className="text-gray-500">Paso {step} de {totalSteps}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex gap-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-2 rounded-full ${i < step ? 'bg-primary' : 'bg-gray-200'}`}
            />
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {error}
        </div>
      )}

      {/* Formulario */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {/* Paso 1: Datos básicos */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-primary mb-4">
              <Clock className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Datos básicos</h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Título de la tarea *
              </label>
              <input
                type="text"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                placeholder="Ej: Rondo 4vs2 con movilidad"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {categorias.map((cat) => (
                  <button
                    key={cat.codigo}
                    type="button"
                    onClick={() => setFormData({ ...formData, categoria_id: cat.codigo })}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      formData.categoria_id === cat.codigo
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-sm font-medium">{cat.nombre}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duración total (min) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={formData.duracion_total}
                  onChange={(e) => setFormData({ ...formData, duracion_total: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nivel cognitivo
                </label>
                <select
                  value={formData.nivel_cognitivo}
                  onChange={(e) => setFormData({ ...formData, nivel_cognitivo: parseInt(e.target.value) as 1 | 2 | 3 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white"
                >
                  <option value={1}>1 - Baja</option>
                  <option value={2}>2 - Media</option>
                  <option value={3}>3 - Alta</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                value={formData.descripcion || ''}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                placeholder="Describe brevemente la dinámica de la tarea..."
              />
            </div>
          </div>
        )}

        {/* Paso 2: Espacio y jugadores */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-primary mb-4">
              <Users className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Espacio y jugadores</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jugadores mínimo *
                </label>
                <input
                  type="number"
                  min="2"
                  max="30"
                  value={formData.num_jugadores_min}
                  onChange={(e) => setFormData({ ...formData, num_jugadores_min: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jugadores máximo
                </label>
                <input
                  type="number"
                  min="2"
                  max="30"
                  value={formData.num_jugadores_max || ''}
                  onChange={(e) => setFormData({ ...formData, num_jugadores_max: parseInt(e.target.value) || undefined })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Porteros
                </label>
                <input
                  type="number"
                  min="0"
                  max="4"
                  value={formData.num_porteros}
                  onChange={(e) => setFormData({ ...formData, num_porteros: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estructura equipos
                </label>
                <input
                  type="text"
                  value={formData.estructura_equipos || ''}
                  onChange={(e) => setFormData({ ...formData, estructura_equipos: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="Ej: 4vs4+3 comodines"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Largo (m)
                </label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={formData.espacio_largo || ''}
                  onChange={(e) => setFormData({ ...formData, espacio_largo: parseInt(e.target.value) || undefined })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ancho (m)
                </label>
                <input
                  type="number"
                  min="5"
                  max="80"
                  value={formData.espacio_ancho || ''}
                  onChange={(e) => setFormData({ ...formData, espacio_ancho: parseInt(e.target.value) || undefined })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Densidad
                </label>
                <select
                  value={formData.densidad || 'media'}
                  onChange={(e) => setFormData({ ...formData, densidad: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white"
                >
                  {DENSIDADES.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Paso 3: Contenido táctico */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-primary mb-4">
              <Target className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Contenido táctico</h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fase de juego
              </label>
              <select
                value={formData.fase_juego || ''}
                onChange={(e) => setFormData({ ...formData, fase_juego: e.target.value || undefined })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white"
              >
                <option value="">Seleccionar...</option>
                {FASES_JUEGO.map((fase) => (
                  <option key={fase.value} value={fase.value}>{fase.label}</option>
                ))}
              </select>
            </div>

            {formData.fase_juego && principios.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Principio táctico
                </label>
                <select
                  value={formData.principio_tactico || ''}
                  onChange={(e) => setFormData({ ...formData, principio_tactico: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white"
                >
                  <option value="">Seleccionar...</option>
                  {principios.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Reglas técnicas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reglas técnicas
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newReglaTecnica}
                  onChange={(e) => setNewReglaTecnica(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('reglas_tecnicas', newReglaTecnica, setNewReglaTecnica))}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="Ej: Máximo 2 toques"
                />
                <button
                  type="button"
                  onClick={() => addToArray('reglas_tecnicas', newReglaTecnica, setNewReglaTecnica)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Añadir
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(formData.reglas_tecnicas || []).map((regla, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                  >
                    {regla}
                    <button
                      type="button"
                      onClick={() => removeFromArray('reglas_tecnicas', i)}
                      className="hover:text-blue-900"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Reglas tácticas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reglas tácticas
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newReglaTactica}
                  onChange={(e) => setNewReglaTactica(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('reglas_tacticas', newReglaTactica, setNewReglaTactica))}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="Ej: Cambio de orientación obligatorio cada 5 pases"
                />
                <button
                  type="button"
                  onClick={() => addToArray('reglas_tacticas', newReglaTactica, setNewReglaTactica)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Añadir
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(formData.reglas_tacticas || []).map((regla, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm"
                  >
                    {regla}
                    <button
                      type="button"
                      onClick={() => removeFromArray('reglas_tacticas', i)}
                      className="hover:text-green-900"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Paso 4: Coaching points */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-primary mb-4">
              <MessageCircle className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Coaching Points</h2>
            </div>

            {/* Consignas ofensivas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Consignas ofensivas
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newConsignaOfensiva}
                  onChange={(e) => setNewConsignaOfensiva(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('consignas_ofensivas', newConsignaOfensiva, setNewConsignaOfensiva))}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="Ej: Perfiles orientados hacia el juego"
                />
                <button
                  type="button"
                  onClick={() => addToArray('consignas_ofensivas', newConsignaOfensiva, setNewConsignaOfensiva)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Añadir
                </button>
              </div>
              <div className="space-y-1">
                {(formData.consignas_ofensivas || []).map((consigna, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-2 bg-blue-50 rounded-lg"
                  >
                    <span className="text-sm text-blue-700">{consigna}</span>
                    <button
                      type="button"
                      onClick={() => removeFromArray('consignas_ofensivas', i)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Consignas defensivas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Consignas defensivas
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newConsignaDefensiva}
                  onChange={(e) => setNewConsignaDefensiva(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('consignas_defensivas', newConsignaDefensiva, setNewConsignaDefensiva))}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="Ej: Presión coordinada tras pérdida"
                />
                <button
                  type="button"
                  onClick={() => addToArray('consignas_defensivas', newConsignaDefensiva, setNewConsignaDefensiva)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Añadir
                </button>
              </div>
              <div className="space-y-1">
                {(formData.consignas_defensivas || []).map((consigna, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-2 bg-red-50 rounded-lg"
                  >
                    <span className="text-sm text-red-700">{consigna}</span>
                    <button
                      type="button"
                      onClick={() => removeFromArray('consignas_defensivas', i)}
                      className="text-red-500 hover:text-red-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Guardar como plantilla */}
            <div className="pt-4 border-t border-gray-200">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.es_plantilla}
                  onChange={(e) => setFormData({ ...formData, es_plantilla: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Guardar como plantilla</span>
                  <p className="text-xs text-gray-500">Podrás reutilizarla fácilmente en futuras sesiones</p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Navegación */}
        <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Anterior
            </button>
          ) : (
            <div />
          )}

          {step < totalSteps ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={!canGoNext()}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !canGoNext()}
              className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {loading ? 'Guardando...' : 'Guardar tarea'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
