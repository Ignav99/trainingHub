'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import useSWR, { mutate } from 'swr'
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
  Camera,
  HeartPulse,
  Plus,
  Clock,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { DetailPageSkeleton } from '@/components/ui/page-skeletons'
import { PageHeader } from '@/components/ui/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Jugador, JugadorUpdate, jugadoresApi, POSICIONES, ESTADOS_JUGADOR } from '@/lib/api/jugadores'
import { medicoApi } from '@/lib/api/medico'
import { apiKey } from '@/lib/swr'
import type { RegistroMedico } from '@/types'

const TIPO_BADGE: Record<string, { label: string; color: string }> = {
  lesion: { label: 'Lesión', color: 'bg-red-100 text-red-800' },
  enfermedad: { label: 'Enfermedad', color: 'bg-orange-100 text-orange-800' },
  molestias: { label: 'Molestias', color: 'bg-yellow-100 text-yellow-800' },
  rehabilitacion: { label: 'Rehabilitación', color: 'bg-blue-100 text-blue-800' },
  otro: { label: 'Otro', color: 'bg-gray-100 text-gray-800' },
}

const ESTADO_BADGE: Record<string, { label: string; color: string }> = {
  activo: { label: 'Activo', color: 'bg-red-100 text-red-700' },
  en_recuperacion: { label: 'En recuperación', color: 'bg-amber-100 text-amber-700' },
  alta: { label: 'Alta', color: 'bg-green-100 text-green-700' },
  cronico: { label: 'Crónico', color: 'bg-purple-100 text-purple-700' },
}

function daysSince(dateStr: string): number {
  const start = new Date(dateStr)
  const now = new Date()
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

export default function JugadorDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(searchParams.get('edit') === 'true')
  const [activeTab, setActiveTab] = useState<'datos' | 'ficha_clinica'>('datos')

  // Form state
  const [formData, setFormData] = useState<JugadorUpdate>({})
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  // SWR for jugador detail
  const { data: jugador, isLoading: loading, error: swrError } = useSWR<Jugador>(
    `/jugadores/${params.id}`
  )

  // SWR for medical records — only when Ficha Clínica tab is active
  const { data: registrosMedicos } = useSWR<RegistroMedico[] | { data: RegistroMedico[] }>(
    activeTab === 'ficha_clinica' && jugador?.equipo_id
      ? apiKey('/medico', { equipo_id: jugador.equipo_id, jugador_id: String(params.id) }, ['equipo_id', 'jugador_id'])
      : null
  )

  const medicalRecords: RegistroMedico[] = registrosMedicos
    ? Array.isArray(registrosMedicos) ? registrosMedicos : (registrosMedicos as any).data || []
    : []

  const activeIncident = medicalRecords.find(
    (r) => r.estado === 'activo' || r.estado === 'en_recuperacion'
  )

  const error = swrError ? 'Error al cargar el jugador' : null

  // Sync form data when jugador data loads or changes
  useEffect(() => {
    if (jugador) {
      setFormData({
        nombre: jugador.nombre,
        apellidos: jugador.apellidos,
        apodo: jugador.apodo,
        fecha_nacimiento: jugador.fecha_nacimiento,
        dorsal: jugador.dorsal,
        posicion_principal: jugador.posicion_principal,
        posiciones_secundarias: jugador.posiciones_secundarias,
        altura: jugador.altura,
        peso: jugador.peso,
        pierna_dominante: jugador.pierna_dominante,
        nivel_tecnico: jugador.nivel_tecnico,
        nivel_tactico: jugador.nivel_tactico,
        nivel_fisico: jugador.nivel_fisico,
        nivel_mental: jugador.nivel_mental,
        es_capitan: jugador.es_capitan,
        es_convocable: jugador.es_convocable,
        notas: jugador.notas,
      })
    }
  }, [jugador])

  const invalidateJugadores = () => {
    mutate((key: string) => typeof key === 'string' && key.includes('/jugadores'), undefined, { revalidate: true })
  }

  const handleSave = async () => {
    if (!jugador) return

    setSaving(true)
    try {
      await jugadoresApi.update(jugador.id, formData)
      invalidateJugadores()
      setIsEditing(false)
      toast.success('Cambios guardados')
    } catch (err) {
      console.error('Error saving jugador:', err)
      toast.error('Error al guardar los cambios')
    } finally {
      setSaving(false)
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !jugador) return

    setUploadingPhoto(true)
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const ext = file.name.split('.').pop()
      const path = `player-photos/${jugador.id}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('player-photos')
        .upload(path, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('player-photos')
        .getPublicUrl(path)

      if (urlData?.publicUrl) {
        await jugadoresApi.update(jugador.id, { foto_url: urlData.publicUrl })
        invalidateJugadores()
      }
    } catch (err) {
      console.error('Error uploading photo:', err)
      toast.error('Error al subir la foto')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleDelete = async () => {
    if (!jugador) return
    if (!confirm('¿Estás seguro de que quieres eliminar este jugador?')) return

    try {
      await jugadoresApi.delete(jugador.id)
      toast.success('Jugador eliminado')
      router.push('/plantilla')
    } catch (err: any) {
      console.error('Error deleting jugador:', err)
      toast.error(err?.message || 'Error al eliminar el jugador')
    }
  }

  if (loading) {
    return <DetailPageSkeleton />
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
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        title={jugador.apodo || `${jugador.nombre} ${jugador.apellidos}`}
        description={jugador.apodo ? `${jugador.nombre} ${jugador.apellidos}` : 'Ficha del jugador'}
        breadcrumbs={[
          { label: 'Plantilla', href: '/plantilla' },
          { label: jugador.apodo || `${jugador.nombre} ${jugador.apellidos}` },
        ]}
        actions={
          isEditing ? (
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
          )
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('datos')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'datos'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Datos
        </button>
        <button
          onClick={() => setActiveTab('ficha_clinica')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'ficha_clinica'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <HeartPulse className="h-4 w-4" />
          Ficha Clínica
          {activeIncident && (
            <span className="w-2 h-2 rounded-full bg-red-500" />
          )}
        </button>
      </div>

      {/* Tab: Datos */}
      {activeTab === 'datos' && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Photo and basic info */}
        <div className="space-y-6">
          {/* Photo card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 card-hover">
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
              {isEditing && (
                <label className="absolute bottom-2 left-2 bg-gray-900/70 text-white rounded-full p-2 cursor-pointer hover:bg-gray-900/90 transition-colors">
                  {uploadingPhoto ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Camera className="h-5 w-5" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                  />
                </label>
              )}
            </div>

            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900">
                {jugador.apodo || `${jugador.nombre} ${jugador.apellidos}`}
              </h2>
              {jugador.apodo && (
                <p className="text-sm text-gray-500">{jugador.nombre} {jugador.apellidos}</p>
              )}
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
          <div className="bg-white rounded-xl border border-gray-200 p-6 card-hover">
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
          <div className="bg-white rounded-xl border border-gray-200 p-6 card-hover">
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
                        {String(jugador[key as keyof Jugador] ?? '')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Posiciones */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 card-hover">
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
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 card-hover">
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
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apodo</label>
                  <input
                    type="text"
                    value={formData.apodo || ''}
                    onChange={(e) => setFormData({ ...formData, apodo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="Nombre preferente (opcional)"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Posición principal</label>
                  <select
                    value={formData.posicion_principal || ''}
                    onChange={(e) => setFormData({ ...formData, posicion_principal: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white"
                  >
                    {Object.entries(POSICIONES).map(([code, p]) => (
                      <option key={code} value={code}>{code} - {p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pierna dominante</label>
                  <select
                    value={formData.pierna_dominante || 'derecha'}
                    onChange={(e) => setFormData({ ...formData, pierna_dominante: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white"
                  >
                    <option value="derecha">Derecha</option>
                    <option value="izquierda">Izquierda</option>
                    <option value="ambas">Ambas</option>
                  </select>
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
            <div className="bg-white rounded-xl border border-gray-200 p-6 card-hover">
              <h3 className="font-semibold text-gray-900 mb-2">Notas</h3>
              <p className="text-gray-600">{jugador.notas}</p>
            </div>
          ) : null}
        </div>
      </div>
      )}

      {/* Tab: Ficha Clínica */}
      {activeTab === 'ficha_clinica' && (
      <div className="space-y-6">
        {/* Estado Actual */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Estado Actual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${estadoConfig?.color}15` }}
              >
                {jugador.estado === 'activo' ? (
                  <CheckCircle className="h-5 w-5" style={{ color: estadoConfig?.color }} />
                ) : (
                  <Activity className="h-5 w-5" style={{ color: estadoConfig?.color }} />
                )}
              </div>
              <div>
                <p className="font-medium" style={{ color: estadoConfig?.color }}>
                  {estadoConfig?.nombre}
                </p>
                {jugador.motivo_baja && (
                  <p className="text-sm text-muted-foreground">{jugador.motivo_baja}</p>
                )}
              </div>
              {jugador.fecha_vuelta_estimada && jugador.estado !== 'activo' && (
                <div className="ml-auto text-right">
                  <p className="text-xs text-muted-foreground">Vuelta estimada</p>
                  <p className="text-sm font-medium">
                    {new Date(jugador.fecha_vuelta_estimada).toLocaleDateString('es-ES')}
                  </p>
                </div>
              )}
            </div>

            {/* Recovery progress bar for active incident */}
            {activeIncident && activeIncident.dias_baja_estimados && (
              <div className="mt-4">
                {(() => {
                  const dias = daysSince(activeIncident.fecha_inicio)
                  const progress = Math.min(100, (dias / activeIncident.dias_baja_estimados!) * 100)
                  return (
                    <>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            progress >= 100 ? 'bg-green-500' : progress >= 75 ? 'bg-amber-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${Math.min(100, progress)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {dias} / {activeIncident.dias_baja_estimados} días
                      </p>
                    </>
                  )
                })()}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Incidencia Activa */}
        {activeIncident && (
          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-red-700">Incidencia Activa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium">{activeIncident.titulo}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={`${TIPO_BADGE[activeIncident.tipo]?.color || 'bg-gray-100 text-gray-800'} border-0 text-xs`}>
                      {TIPO_BADGE[activeIncident.tipo]?.label || activeIncident.tipo}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {daysSince(activeIncident.fecha_inicio)} días
                    </span>
                  </div>
                </div>
                <Link href={`/enfermeria/${activeIncident.id}`}>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    Ver detalle
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Historial Clínico */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Historial Clínico</CardTitle>
            <Link href={`/enfermeria`}>
              <Button size="sm">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Nuevo Registro
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {medicalRecords.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No hay registros médicos para este jugador
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Días baja</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {medicalRecords.map((r) => {
                      const tipoBadge = TIPO_BADGE[r.tipo] || TIPO_BADGE.otro
                      const estadoBadge = ESTADO_BADGE[r.estado] || ESTADO_BADGE.activo
                      const dias = r.estado === 'alta' && r.dias_baja_reales
                        ? r.dias_baja_reales
                        : daysSince(r.fecha_inicio)

                      return (
                        <tr
                          key={r.id}
                          onClick={() => router.push(`/enfermeria/${r.id}`)}
                          className="hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            {new Date(r.fecha_inicio).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' })}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${tipoBadge.color}`}>
                              {tipoBadge.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">{r.titulo}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{dias} días</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${estadoBadge.color}`}>
                              {estadoBadge.label}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      )}
    </div>
  )
}
