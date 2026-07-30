'use client'

import { useState } from 'react'
import { Users, UserCheck, Calendar, ClipboardList, Swords, HeartPulse, Loader2, Pencil, X } from 'lucide-react'
import { toast } from 'sonner'
import { clubAdminApi, type EquipoDetalle } from '@/lib/api/clubAdmin'

interface ResumenTabProps {
  equipo: EquipoDetalle
  onUpdated: () => void
}

export default function ResumenTab({ equipo, onUpdated }: ResumenTabProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    nombre: equipo.nombre,
    categoria: equipo.categoria || '',
    temporada: equipo.temporada || '',
    sistema_juego: equipo.sistema_juego || '',
  })

  const startEditing = () => {
    setFormData({
      nombre: equipo.nombre,
      categoria: equipo.categoria || '',
      temporada: equipo.temporada || '',
      sistema_juego: equipo.sistema_juego || '',
    })
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!formData.nombre.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }
    setSaving(true)
    try {
      await clubAdminApi.updateEquipo(equipo.id, {
        nombre: formData.nombre.trim(),
        categoria: formData.categoria || undefined,
        temporada: formData.temporada || undefined,
      })
      toast.success('Equipo actualizado')
      setIsEditing(false)
      onUpdated()
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar el equipo')
    } finally {
      setSaving(false)
    }
  }

  const kpiCards = [
    { label: 'Jugadores', value: equipo.num_jugadores_plantilla, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Staff', value: equipo.num_staff, icon: UserCheck, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Tareas', value: equipo.num_tareas ?? 0, icon: ClipboardList, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Sesiones', value: equipo.num_sesiones ?? 0, icon: Calendar, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Partidos', value: equipo.num_partidos, icon: Swords, color: 'text-red-600', bg: 'bg-red-50' },
  ]

  return (
    <div className="space-y-6">
      {equipo.num_lesiones_activas > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <HeartPulse className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">{equipo.num_lesiones_activas}</span>{' '}
            {equipo.num_lesiones_activas === 1 ? 'lesión activa' : 'lesiones activas'} en este equipo
          </p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpiCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border p-4 hover:shadow-sm transition-shadow">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${card.bg} mb-3`}>
              <card.icon className={`h-4.5 w-4.5 ${card.color}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{card.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Edit form */}
      <div className="bg-white rounded-xl border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Datos del equipo</h3>
          {!isEditing && (
            <button
              onClick={startEditing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <input
                  type="text"
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  placeholder="Ej: Cadete A"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Temporada</label>
                <input
                  type="text"
                  value={formData.temporada}
                  onChange={(e) => setFormData({ ...formData, temporada: e.target.value })}
                  placeholder="Ej: 2025-26"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sistema de juego</label>
                <input
                  type="text"
                  value={formData.sistema_juego}
                  onChange={(e) => setFormData({ ...formData, sistema_juego: e.target.value })}
                  placeholder="Ej: 1-4-3-3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setIsEditing(false)}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <X className="h-4 w-4" />
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.nombre.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 text-sm font-medium"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500">Nombre</p>
              <p className="font-medium text-gray-900">{equipo.nombre}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Categoría</p>
              <p className="font-medium text-gray-900">{equipo.categoria || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Temporada</p>
              <p className="font-medium text-gray-900">{equipo.temporada || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Sistema de juego</p>
              <p className="font-medium text-gray-900">{equipo.sistema_juego || '-'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
