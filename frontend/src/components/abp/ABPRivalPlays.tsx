'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Plus, Trash2, Flag, Edit2, Video, ExternalLink } from 'lucide-react'
import { apiKey, apiFetcher } from '@/lib/swr'
import { abpApi } from '@/lib/api/abp'
import { ABPRivalJugada, ABP_TIPOS, ABP_SUBTIPOS, TipoABP, LadoABP } from '@/types'

interface ABPRivalPlaysProps {
  rivalId: string
}

export default function ABPRivalPlays({ rivalId }: ABPRivalPlaysProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<TipoABP>('corner')
  const [lado, setLado] = useState<LadoABP>('ofensivo')
  const [subtipo, setSubtipo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [videoUrl, setVideoUrl] = useState('')

  const swrKey = apiKey(`/abp/rival/${rivalId}`)
  const { data, mutate } = useSWR<{ data: ABPRivalJugada[] }>(swrKey, apiFetcher)
  const jugadas = data?.data || []

  const resetForm = () => {
    setNombre('')
    setTipo('corner')
    setLado('ofensivo')
    setSubtipo('')
    setDescripcion('')
    setVideoUrl('')
    setEditingId(null)
    setShowForm(false)
  }

  const handleEdit = (j: ABPRivalJugada) => {
    setNombre(j.nombre)
    setTipo(j.tipo)
    setLado(j.lado)
    setSubtipo(j.subtipo || '')
    setDescripcion(j.descripcion || '')
    setVideoUrl(j.video_url || '')
    setEditingId(j.id)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!nombre.trim()) return
    setSaving(true)
    try {
      const data = {
        nombre: nombre.trim(),
        tipo,
        lado,
        subtipo: subtipo || undefined,
        descripcion: descripcion.trim() || undefined,
        video_url: videoUrl.trim() || undefined,
      }
      if (editingId) {
        await abpApi.updateRival(rivalId, editingId, data)
      } else {
        await abpApi.createRival(rivalId, data as any)
      }
      mutate()
      resetForm()
    } catch (e) {
      console.error('Error saving rival play:', e)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar esta jugada del rival?')) return
    try {
      await abpApi.deleteRival(rivalId, id)
      mutate()
    } catch (e) {
      console.error('Error deleting:', e)
    }
  }

  // Group by tipo
  const grouped: Record<string, ABPRivalJugada[]> = {}
  for (const j of jugadas) {
    if (!grouped[j.tipo]) grouped[j.tipo] = []
    grouped[j.tipo].push(j)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flag className="h-4 w-4 text-orange-500" />
          <h3 className="text-base font-semibold text-gray-800">ABP del Rival</h3>
          <span className="text-xs text-gray-400">({jugadas.length})</span>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true) }}
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100"
        >
          <Plus className="h-3.5 w-3.5" /> Nueva
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-semibold text-gray-700">
            {editingId ? 'Editar jugada' : 'Nueva jugada del rival'}
          </h4>
          <input
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Nombre de la jugada"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
          />
          <div className="grid grid-cols-3 gap-2">
            <select value={tipo} onChange={e => setTipo(e.target.value as TipoABP)} className="px-2 py-2 text-sm border border-gray-200 rounded-lg bg-white">
              {ABP_TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select value={lado} onChange={e => setLado(e.target.value as LadoABP)} className="px-2 py-2 text-sm border border-gray-200 rounded-lg bg-white">
              <option value="ofensivo">Ofensivo</option>
              <option value="defensivo">Defensivo</option>
            </select>
            <select value={subtipo} onChange={e => setSubtipo(e.target.value)} className="px-2 py-2 text-sm border border-gray-200 rounded-lg bg-white">
              <option value="">Sin subtipo</option>
              {ABP_SUBTIPOS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <textarea
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            placeholder="Descripcion (movimientos, patron, etc.)"
            rows={2}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none"
          />
          <input
            value={videoUrl}
            onChange={e => setVideoUrl(e.target.value)}
            placeholder="URL del video de referencia"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
          />
          <div className="flex justify-end gap-2">
            <button onClick={resetForm} className="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!nombre.trim() || saving}
              className="px-4 py-1.5 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {jugadas.length === 0 && !showForm ? (
        <div className="text-center py-10 text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg">
          No hay jugadas ABP registradas para este rival
        </div>
      ) : (
        Object.entries(grouped).map(([tipoCode, plays]) => {
          const tipoInfo = ABP_TIPOS.find(t => t.value === tipoCode)
          return (
            <div key={tipoCode}>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {tipoInfo?.label || tipoCode}
              </h4>
              <div className="space-y-1.5">
                {plays.map(j => (
                  <div key={j.id} className="flex items-start gap-2 p-3 bg-white border border-gray-100 rounded-lg group hover:border-gray-200">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          j.lado === 'ofensivo' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {j.lado === 'ofensivo' ? 'OF' : 'DF'}
                        </span>
                        <span className="text-sm font-medium text-gray-800">{j.nombre}</span>
                        {j.subtipo && <span className="text-xs text-gray-400">({j.subtipo})</span>}
                      </div>
                      {j.descripcion && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{j.descripcion}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {j.video_url && (
                        <a href={j.video_url} target="_blank" rel="noopener noreferrer" className="p-1 text-gray-300 hover:text-blue-500 rounded">
                          <Video className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <button onClick={() => handleEdit(j)} className="p-1 text-gray-300 hover:text-gray-600 rounded opacity-0 group-hover:opacity-100">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(j.id)} className="p-1 text-gray-300 hover:text-red-500 rounded opacity-0 group-hover:opacity-100">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
