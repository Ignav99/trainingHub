'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft,
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Upload,
  X,
  Save,
  Loader2,
  MapPin,
  Building,
  FileText,
  Shield,
  MoreVertical
} from 'lucide-react'
import { rivalesApi } from '@/lib/api/partidos'
import { Rival } from '@/types'

interface RivalFormData {
  nombre: string
  nombre_corto: string
  escudo_url: string
  estadio: string
  ciudad: string
  notas: string
}

const emptyForm: RivalFormData = {
  nombre: '',
  nombre_corto: '',
  escudo_url: '',
  estadio: '',
  ciudad: '',
  notas: ''
}

// Modal para crear/editar rival
function RivalModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  isLoading
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (data: RivalFormData) => Promise<void>
  initialData?: RivalFormData
  isLoading: boolean
}) {
  const [formData, setFormData] = useState<RivalFormData>(initialData || emptyForm)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (initialData) {
      setFormData(initialData)
      setPreviewUrl(initialData.escudo_url || '')
    } else {
      setFormData(emptyForm)
      setPreviewUrl('')
    }
  }, [initialData, isOpen])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Por ahora usamos URL local, en producción subiríamos a Supabase Storage
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      // TODO: Subir a Supabase Storage y obtener URL pública
      setFormData({ ...formData, escudo_url: url })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nombre.trim()) return
    await onSave(formData)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-bold text-gray-900">
            {initialData ? 'Editar Rival' : 'Nuevo Rival'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Escudo */}
          <div className="flex flex-col items-center">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 hover:border-primary cursor-pointer flex items-center justify-center overflow-hidden bg-gray-50 transition-colors"
            >
              {previewUrl ? (
                <Image
                  src={previewUrl}
                  alt="Escudo"
                  width={96}
                  height={96}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center">
                  <Upload className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                  <span className="text-xs text-gray-500">Escudo</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <p className="text-xs text-gray-500 mt-2">Opcional - Click para subir</p>
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del equipo *
            </label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Ej: Real Madrid CF"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              required
            />
          </div>

          {/* Nombre corto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre corto
            </label>
            <input
              type="text"
              value={formData.nombre_corto}
              onChange={(e) => setFormData({ ...formData, nombre_corto: e.target.value.substring(0, 10) })}
              placeholder="Ej: RMD"
              maxLength={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <p className="text-xs text-gray-500 mt-1">Máximo 10 caracteres</p>
          </div>

          {/* Estadio y Ciudad */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Building className="h-3.5 w-3.5 inline mr-1" />
                Estadio
              </label>
              <input
                type="text"
                value={formData.estadio}
                onChange={(e) => setFormData({ ...formData, estadio: e.target.value })}
                placeholder="Estadio Municipal"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="h-3.5 w-3.5 inline mr-1" />
                Ciudad
              </label>
              <input
                type="text"
                value={formData.ciudad}
                onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                placeholder="Madrid"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FileText className="h-3.5 w-3.5 inline mr-1" />
              Notas
            </label>
            <textarea
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              placeholder="Sistema de juego, estilo, puntos fuertes/débiles..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none"
            />
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isLoading || !formData.nombre.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Guardar
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Card de rival
function RivalCard({
  rival,
  onEdit,
  onDelete
}: {
  rival: Rival
  onEdit: () => void
  onDelete: () => void
}) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        {/* Escudo */}
        <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
          {rival.escudo_url ? (
            <Image
              src={rival.escudo_url}
              alt={rival.nombre}
              width={64}
              height={64}
              className="w-full h-full object-contain"
            />
          ) : (
            <Shield className="h-8 w-8 text-gray-400" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">{rival.nombre}</h3>
              {rival.nombre_corto && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded mt-1 inline-block">
                  {rival.nombre_corto}
                </span>
              )}
            </div>

            {/* Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <MoreVertical className="h-4 w-4 text-gray-500" />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 min-w-[120px]">
                    <button
                      onClick={() => { onEdit(); setShowMenu(false); }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Edit2 className="h-4 w-4" />
                      Editar
                    </button>
                    <button
                      onClick={() => { onDelete(); setShowMenu(false); }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                      Eliminar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Detalles */}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
            {rival.estadio && (
              <span className="flex items-center gap-1">
                <Building className="h-3.5 w-3.5" />
                {rival.estadio}
              </span>
            )}
            {rival.ciudad && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {rival.ciudad}
              </span>
            )}
          </div>

          {rival.notas && (
            <p className="mt-2 text-sm text-gray-600 line-clamp-2">{rival.notas}</p>
          )}
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
        <Link
          href={`/analisis/rivales/${rival.id}`}
          className="flex-1 text-center px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Ver análisis
        </Link>
        <Link
          href={`/partidos/nuevo?rival_id=${rival.id}`}
          className="flex-1 text-center px-3 py-1.5 text-sm bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors"
        >
          Programar partido
        </Link>
      </div>
    </div>
  )
}

export default function RivalesPage() {
  const [rivales, setRivales] = useState<Rival[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRival, setEditingRival] = useState<Rival | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadRivales()
  }, [])

  const loadRivales = async () => {
    try {
      const response = await rivalesApi.list({ limit: 100 })
      setRivales(response.data)
    } catch (err) {
      console.error('Error loading rivales:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (data: RivalFormData) => {
    setSaving(true)
    try {
      if (editingRival) {
        await rivalesApi.update(editingRival.id, data)
      } else {
        await rivalesApi.create(data)
      }
      await loadRivales()
      setIsModalOpen(false)
      setEditingRival(null)
    } catch (err) {
      console.error('Error saving rival:', err)
      alert('Error al guardar el rival')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (rival: Rival) => {
    if (!confirm(`¿Eliminar a ${rival.nombre}? Esta acción no se puede deshacer.`)) return

    try {
      await rivalesApi.delete(rival.id)
      await loadRivales()
    } catch (err) {
      console.error('Error deleting rival:', err)
      alert('Error al eliminar el rival')
    }
  }

  const openEdit = (rival: Rival) => {
    setEditingRival(rival)
    setIsModalOpen(true)
  }

  const openCreate = () => {
    setEditingRival(null)
    setIsModalOpen(true)
  }

  const filteredRivales = rivales.filter(r =>
    r.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.nombre_corto?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.ciudad?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/analisis"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Análisis
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="h-7 w-7 text-primary" />
              Rivales de Liga
            </h1>
            <p className="text-gray-500 mt-1">
              Gestiona los equipos de tu liga para análisis y calendario
            </p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Añadir Rival
          </button>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por nombre, abreviatura o ciudad..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
        />
      </div>

      {/* Lista de rivales */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredRivales.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Shield className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery ? 'No se encontraron rivales' : 'No hay rivales registrados'}
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            {searchQuery
              ? 'Intenta con otro término de búsqueda'
              : 'Añade los equipos de tu liga para poder programar partidos y hacer análisis de rivales'
            }
          </p>
          {!searchQuery && (
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Añadir primer rival
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRivales.map(rival => (
            <RivalCard
              key={rival.id}
              rival={rival}
              onEdit={() => openEdit(rival)}
              onDelete={() => handleDelete(rival)}
            />
          ))}
        </div>
      )}

      {/* Contador */}
      {!loading && filteredRivales.length > 0 && (
        <p className="text-center text-sm text-gray-500">
          {filteredRivales.length} {filteredRivales.length === 1 ? 'equipo' : 'equipos'} en tu liga
        </p>
      )}

      {/* Modal */}
      <RivalModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingRival(null); }}
        onSave={handleSave}
        initialData={editingRival ? {
          nombre: editingRival.nombre,
          nombre_corto: editingRival.nombre_corto || '',
          escudo_url: editingRival.escudo_url || '',
          estadio: editingRival.estadio || '',
          ciudad: editingRival.ciudad || '',
          notas: editingRival.notas || ''
        } : undefined}
        isLoading={saving}
      />
    </div>
  )
}
