'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR, { mutate } from 'swr'
import {
  ArrowLeft,
  Plus,
  Search,
  Trash2,
  Edit,
  Save,
  X,
  Loader2,
  UserPlus,
  Users,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { Jugador, jugadoresApi, POSICIONES } from '@/lib/api/jugadores'
import { useEquipoStore } from '@/stores/equipoStore'
import { apiKey } from '@/lib/swr'

// Modal para añadir/editar invitado
function InvitadoModal({
  invitado,
  equipos,
  onClose,
  onSave,
  saving,
}: {
  invitado?: Jugador
  equipos: { id: string; nombre: string; categoria?: string }[]
  onClose: () => void
  onSave: (data: { nombre: string; apellidos: string; posicion_principal: string; equipo_origen_id?: string; notas?: string }) => void
  saving: boolean
}) {
  const [nombre, setNombre] = useState(invitado?.nombre || '')
  const [apellidos, setApellidos] = useState(invitado?.apellidos || '')
  const [posicion, setPosicion] = useState(invitado?.posicion_principal || 'MC')
  const [equipoOrigenId, setEquipoOrigenId] = useState(invitado?.equipo_origen_id || '')
  const [notas, setNotas] = useState(invitado?.notas || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim() || !apellidos.trim()) return
    onSave({
      nombre: nombre.trim(),
      apellidos: apellidos.trim(),
      posicion_principal: posicion,
      equipo_origen_id: equipoOrigenId || undefined,
      notas: notas.trim() || undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {invitado ? 'Editar invitado' : 'Nuevo invitado'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Pablo"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                autoFocus
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Apellidos *
              </label>
              <input
                type="text"
                value={apellidos}
                onChange={(e) => setApellidos(e.target.value)}
                placeholder="Garcia Lopez"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Posicion *
            </label>
            <select
              value={posicion}
              onChange={(e) => setPosicion(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white"
            >
              {Object.entries(POSICIONES).map(([code, pos]) => (
                <option key={code} value={code}>
                  {code} - {pos.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Equipo de origen
            </label>
            <select
              value={equipoOrigenId}
              onChange={(e) => setEquipoOrigenId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white"
            >
              <option value="">-- Sin especificar --</option>
              {equipos.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.nombre} {eq.categoria ? `(${eq.categoria})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Observaciones sobre el jugador..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !nombre.trim() || !apellidos.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {invitado ? 'Guardar' : 'Añadir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function InvitadosPage() {
  const { equipoActivo, equipos } = useEquipoStore()
  const [busqueda, setBusqueda] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingInvitado, setEditingInvitado] = useState<Jugador | null>(null)
  const [saving, setSaving] = useState(false)

  // Fetch invitados from API (real DB players with es_invitado=true)
  const { data: jugadoresResponse, isLoading: loading } = useSWR<{ data: Jugador[]; total: number }>(
    apiKey('/jugadores', {
      equipo_id: equipoActivo?.id,
      organizacion_completa: true,
    }, ['equipo_id'])
  )

  // Filter to only show invitados
  const allJugadores = jugadoresResponse?.data || []
  const invitados = allJugadores.filter((j) => j.es_invitado)

  const invalidate = () => {
    mutate((key: string) => typeof key === 'string' && key.includes('/jugadores'), undefined, { revalidate: true })
  }

  const handleAdd = async (data: { nombre: string; apellidos: string; posicion_principal: string; equipo_origen_id?: string; notas?: string }) => {
    if (!equipoActivo) return
    setSaving(true)
    try {
      await jugadoresApi.create({
        equipo_id: equipoActivo.id,
        nombre: data.nombre,
        apellidos: data.apellidos,
        posicion_principal: data.posicion_principal,
        equipo_origen_id: data.equipo_origen_id,
        notas: data.notas,
        es_invitado: true,
      })
      toast.success('Invitado creado')
      setModalOpen(false)
      invalidate()
    } catch (err: any) {
      toast.error(err?.message || 'Error al crear invitado')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async (data: { nombre: string; apellidos: string; posicion_principal: string; equipo_origen_id?: string; notas?: string }) => {
    if (!editingInvitado) return
    setSaving(true)
    try {
      await jugadoresApi.update(editingInvitado.id, {
        nombre: data.nombre,
        apellidos: data.apellidos,
        posicion_principal: data.posicion_principal,
        equipo_origen_id: data.equipo_origen_id,
        notas: data.notas,
      })
      toast.success('Invitado actualizado')
      setEditingInvitado(null)
      invalidate()
    } catch (err: any) {
      toast.error(err?.message || 'Error al actualizar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este jugador invitado?')) return
    try {
      await jugadoresApi.delete(id)
      toast.success('Invitado eliminado')
      invalidate()
    } catch (err: any) {
      toast.error(err?.message || 'Error al eliminar')
    }
  }

  // Filtrar por busqueda
  const invitadosFiltrados = invitados.filter((i) => {
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    const fullName = `${i.nombre} ${i.apellidos}`.toLowerCase()
    return fullName.includes(q) || i.notas?.toLowerCase().includes(q)
  })

  if (!equipoActivo) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-gray-900 mb-2">Selecciona un equipo</h2>
        <p className="text-gray-500">Debes seleccionar un equipo para gestionar los jugadores invitados</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/plantilla"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Jugadores Invitados</h1>
            <p className="text-gray-500">
              {invitados.length} jugador{invitados.length !== 1 ? 'es' : ''} invitado{invitados.length !== 1 ? 's' : ''} — juveniles y otras categorias
            </p>
          </div>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Añadir Invitado
        </button>
      </div>

      {/* Info card */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex gap-3">
          <UserPlus className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-amber-900">¿Que son los jugadores invitados?</h3>
            <p className="text-sm text-amber-700 mt-1">
              Son jugadores de categorias inferiores (juveniles, cadetes, infantiles) o de otros equipos
              que participan en tus entrenamientos. No forman parte de la plantilla oficial pero estan
              disponibles para añadir en las sesiones.
            </p>
          </div>
        </div>
      </div>

      {/* Busqueda */}
      {invitados.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          />
        </div>
      )}

      {/* Lista compacta */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : invitados.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay jugadores invitados</h3>
          <p className="text-gray-500 mb-4">
            Añade juveniles u otros jugadores que entrenan con tu equipo
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Añadir primer invitado
          </button>
        </div>
      ) : invitadosFiltrados.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500">No se encontraron jugadores con &quot;{busqueda}&quot;</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Table header */}
          <div className="hidden sm:grid sm:grid-cols-[1fr_100px_1fr_120px_auto] gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <span>Jugador</span>
            <span>Posición</span>
            <span>Notas</span>
            <span>Equipo origen</span>
            <span className="w-20" />
          </div>

          {/* Rows */}
          <div className="divide-y divide-gray-100">
            {invitadosFiltrados.map((inv) => {
              const pos = POSICIONES[inv.posicion_principal as keyof typeof POSICIONES]
              return (
                <div
                  key={inv.id}
                  className="grid grid-cols-1 sm:grid-cols-[1fr_100px_1fr_120px_auto] gap-2 sm:gap-4 items-center px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  {/* Name + avatar */}
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                      style={{ backgroundColor: pos?.color || '#6B7280' }}
                    >
                      {inv.nombre[0]}{inv.apellidos[0]}
                    </div>
                    <span className="font-medium text-gray-900 truncate">
                      {inv.nombre} {inv.apellidos}
                    </span>
                  </div>

                  {/* Position */}
                  <div>
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white"
                      style={{ backgroundColor: pos?.color || '#6B7280' }}
                    >
                      {inv.posicion_principal}
                    </span>
                  </div>

                  {/* Notes */}
                  <p className="text-sm text-gray-500 truncate">
                    {inv.notas || '—'}
                  </p>

                  {/* Origin team */}
                  <span className="text-sm text-gray-500 truncate">
                    {inv.equipos?.nombre || '—'}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1 justify-end sm:w-20">
                    <button
                      onClick={() => setEditingInvitado(inv)}
                      className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(inv.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal */}
      {(modalOpen || editingInvitado) && (
        <InvitadoModal
          invitado={editingInvitado || undefined}
          equipos={equipos.filter((e) => e.id !== equipoActivo?.id)}
          onClose={() => {
            setModalOpen(false)
            setEditingInvitado(null)
          }}
          onSave={editingInvitado ? handleEdit : handleAdd}
          saving={saving}
        />
      )}
    </div>
  )
}
