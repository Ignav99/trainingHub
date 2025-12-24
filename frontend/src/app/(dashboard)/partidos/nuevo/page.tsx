'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Trophy,
  Calendar,
  Clock,
  MapPin,
  Users,
  Save,
  Loader2,
  Plus
} from 'lucide-react'
import { partidosApi, rivalesApi } from '@/lib/api/partidos'
import { useEquipoStore } from '@/stores/equipoStore'
import { Rival } from '@/types'

type Localia = 'local' | 'visitante' | 'neutral'
type Competicion = 'liga' | 'copa' | 'amistoso' | 'torneo' | 'otro'

export default function NuevoPartidoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { equipoActivo } = useEquipoStore()

  const fechaInicial = searchParams.get('fecha') || new Date().toISOString().split('T')[0]

  const [loading, setLoading] = useState(false)
  const [loadingRivales, setLoadingRivales] = useState(true)
  const [rivales, setRivales] = useState<Rival[]>([])
  const [showNewRival, setShowNewRival] = useState(false)
  const [newRivalName, setNewRivalName] = useState('')

  const [formData, setFormData] = useState({
    rival_id: '',
    fecha: fechaInicial,
    hora: '12:00',
    localia: 'local' as Localia,
    competicion: 'liga' as Competicion,
    jornada: '',
    ubicacion: '',
    notas_pre: ''
  })

  useEffect(() => {
    loadRivales()
  }, [])

  const loadRivales = async () => {
    try {
      const response = await rivalesApi.list()
      setRivales(response.data)
    } catch (err) {
      console.error('Error loading rivales:', err)
    } finally {
      setLoadingRivales(false)
    }
  }

  const handleCreateRival = async () => {
    if (!newRivalName.trim()) return

    try {
      const newRival = await rivalesApi.create({
        nombre: newRivalName.trim(),
        nombre_corto: newRivalName.trim().substring(0, 10)
      })
      setRivales([...rivales, newRival])
      setFormData({ ...formData, rival_id: newRival.id })
      setNewRivalName('')
      setShowNewRival(false)
    } catch (err) {
      console.error('Error creating rival:', err)
      alert('Error al crear el rival')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.rival_id) {
      alert('Selecciona un rival')
      return
    }

    setLoading(true)
    try {
      await partidosApi.create({
        ...formData,
        equipo_id: equipoActivo?.id,
        jornada: formData.jornada ? parseInt(formData.jornada) : undefined
      })

      router.push('/calendario')
    } catch (err) {
      console.error('Error creating partido:', err)
      alert('Error al crear el partido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/calendario"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al calendario
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Trophy className="h-7 w-7 text-amber-500" />
          Nuevo Partido
        </h1>
        <p className="text-gray-500 mt-1">
          Añade un partido o competición al calendario
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        {/* Rival */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rival *
          </label>
          {loadingRivales ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando rivales...
            </div>
          ) : showNewRival ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={newRivalName}
                onChange={(e) => setNewRivalName(e.target.value)}
                placeholder="Nombre del nuevo rival"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                autoFocus
              />
              <button
                type="button"
                onClick={handleCreateRival}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                Crear
              </button>
              <button
                type="button"
                onClick={() => setShowNewRival(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <select
                value={formData.rival_id}
                onChange={(e) => setFormData({ ...formData, rival_id: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">Seleccionar rival...</option>
                {rivales.map((rival) => (
                  <option key={rival.id} value={rival.id}>
                    {rival.nombre}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewRival(true)}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Nuevo
              </button>
            </div>
          )}
        </div>

        {/* Fecha y Hora */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-1" />
              Fecha *
            </label>
            <input
              type="date"
              value={formData.fecha}
              onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="h-4 w-4 inline mr-1" />
              Hora
            </label>
            <input
              type="time"
              value={formData.hora}
              onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
        </div>

        {/* Localía y Competición */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="h-4 w-4 inline mr-1" />
              Localía
            </label>
            <select
              value={formData.localia}
              onChange={(e) => setFormData({ ...formData, localia: e.target.value as Localia })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="local">Local</option>
              <option value="visitante">Visitante</option>
              <option value="neutral">Campo neutral</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Trophy className="h-4 w-4 inline mr-1" />
              Competición
            </label>
            <select
              value={formData.competicion}
              onChange={(e) => setFormData({ ...formData, competicion: e.target.value as Competicion })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="liga">Liga</option>
              <option value="copa">Copa</option>
              <option value="amistoso">Amistoso</option>
              <option value="torneo">Torneo</option>
              <option value="otro">Otro</option>
            </select>
          </div>
        </div>

        {/* Jornada y Ubicación */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Jornada
            </label>
            <input
              type="number"
              value={formData.jornada}
              onChange={(e) => setFormData({ ...formData, jornada: e.target.value })}
              placeholder="Ej: 15"
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ubicación / Estadio
            </label>
            <input
              type="text"
              value={formData.ubicacion}
              onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
              placeholder="Ej: Estadio Municipal"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
        </div>

        {/* Notas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notas previas
          </label>
          <textarea
            value={formData.notas_pre}
            onChange={(e) => setFormData({ ...formData, notas_pre: e.target.value })}
            placeholder="Información adicional sobre el partido..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Guardar Partido
              </>
            )}
          </button>
          <Link
            href="/calendario"
            className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
