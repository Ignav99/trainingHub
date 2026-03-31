'use client'

import { useEffect, useState } from 'react'
import { Plus, Loader2, Pencil, X, Check, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import { clubAdminApi } from '@/lib/api/clubAdmin'
import type { ClubEquipo } from './types'

export default function TeamsTab() {
  const [equipos, setEquipos] = useState<ClubEquipo[]>([])
  const [loading, setLoading] = useState(true)

  // Create team
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCat, setNewCat] = useState('')
  const [newTemp, setNewTemp] = useState('')
  const [creating, setCreating] = useState(false)

  // Edit team
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCat, setEditCat] = useState('')
  const [editTemp, setEditTemp] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await clubAdminApi.getEquipos()
      setEquipos(data)
    } catch (err: any) {
      toast.error(err.message || 'Error')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      await clubAdminApi.createEquipo({
        nombre: newName.trim(),
        categoria: newCat || undefined,
        temporada: newTemp || undefined,
      })
      toast.success('Equipo creado')
      setShowCreate(false)
      setNewName('')
      setNewCat('')
      setNewTemp('')
      loadData()
    } catch (err: any) {
      toast.error(err.message || 'Error al crear equipo')
    } finally {
      setCreating(false)
    }
  }

  const startEdit = (eq: ClubEquipo) => {
    setEditingId(eq.id)
    setEditName(eq.nombre)
    setEditCat(eq.categoria || '')
    setEditTemp(eq.temporada || '')
  }

  const handleSave = async () => {
    if (!editingId || !editName.trim()) return
    setSaving(true)
    try {
      await clubAdminApi.updateEquipo(editingId, {
        nombre: editName.trim(),
        categoria: editCat || undefined,
        temporada: editTemp || undefined,
      })
      toast.success('Equipo actualizado')
      setEditingId(null)
      loadData()
    } catch (err: any) {
      toast.error(err.message || 'Error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          {equipos.length} equipo{equipos.length !== 1 ? 's' : ''}
        </h3>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Crear equipo
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-white rounded-xl border p-4 space-y-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre del equipo"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              placeholder="Categoria (ej: Cadete A)"
              className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <input
              value={newTemp}
              onChange={(e) => setNewTemp(e.target.value)}
              placeholder="Temporada (ej: 2025-26)"
              className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900">
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Crear
            </button>
          </div>
        </div>
      )}

      {/* Team cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {equipos.map((eq) => (
          <div key={eq.id} className="bg-white rounded-xl border p-4 hover:shadow-sm transition-shadow">
            {editingId === eq.id ? (
              <div className="space-y-2">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  autoFocus
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={editCat}
                    onChange={(e) => setEditCat(e.target.value)}
                    placeholder="Categoria"
                    className="border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <input
                    value={editTemp}
                    onChange={(e) => setEditTemp(e.target.value)}
                    placeholder="Temporada"
                    className="border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="flex gap-1.5 justify-end">
                  <button onClick={() => setEditingId(null)} className="p-1.5 rounded-md hover:bg-gray-100">
                    <X className="h-4 w-4 text-gray-500" />
                  </button>
                  <button onClick={handleSave} disabled={saving} className="p-1.5 rounded-md hover:bg-green-50">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-green-600" />}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Trophy className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">{eq.nombre}</h4>
                      {eq.categoria && <p className="text-xs text-gray-500">{eq.categoria}</p>}
                    </div>
                  </div>
                  <button onClick={() => startEdit(eq)} className="p-1.5 rounded-md hover:bg-gray-100">
                    <Pencil className="h-3.5 w-3.5 text-gray-400" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-lg font-bold text-gray-900 tabular-nums">{eq.num_jugadores}</p>
                    <p className="text-[10px] text-gray-500">Jugadores</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-lg font-bold text-gray-900 tabular-nums">{eq.num_staff}</p>
                    <p className="text-[10px] text-gray-500">Staff</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-lg font-bold text-gray-900 tabular-nums">{eq.sesiones_mes}</p>
                    <p className="text-[10px] text-gray-500">Sesiones</p>
                  </div>
                </div>
                {eq.temporada && (
                  <p className="text-xs text-gray-400 mt-2">Temporada: {eq.temporada}</p>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {equipos.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Trophy className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No hay equipos. Crea el primero.</p>
        </div>
      )}
    </div>
  )
}
