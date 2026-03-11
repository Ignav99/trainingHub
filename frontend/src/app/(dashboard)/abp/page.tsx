'use client'

import { useState, useCallback } from 'react'
import useSWR, { mutate } from 'swr'
import { Flag, Plus, Download } from 'lucide-react'
import { useEquipoStore } from '@/stores/equipoStore'
import { apiKey, apiFetcher } from '@/lib/swr'
import { abpApi } from '@/lib/api/abp'
import { ABPJugada } from '@/types'
import ABPLibrary from '@/components/abp/ABPLibrary'
import ABPEditor from '@/components/abp/ABPEditor'

export default function ABPPage() {
  const { equipoActivo } = useEquipoStore()
  const equipoId = equipoActivo?.id

  const [editorOpen, setEditorOpen] = useState(false)
  const [editingJugada, setEditingJugada] = useState<ABPJugada | null>(null)
  const [saving, setSaving] = useState(false)

  // Fetch jugadas
  const swrKey = apiKey('/abp', { equipo_id: equipoId }, ['equipo_id'])
  const { data, isLoading } = useSWR<{ data: ABPJugada[] }>(swrKey, apiFetcher)
  const jugadas = data?.data || []

  const refreshList = () => mutate(swrKey)

  const handleNew = () => {
    setEditingJugada(null)
    setEditorOpen(true)
  }

  const handleSelect = (jugada: ABPJugada) => {
    setEditingJugada(jugada)
    setEditorOpen(true)
  }

  const handleSave = async (data: Partial<ABPJugada>) => {
    if (!equipoId) return
    setSaving(true)
    try {
      if (editingJugada?.id) {
        await abpApi.update(editingJugada.id, data as any)
      } else {
        await abpApi.create({ ...data, equipo_id: equipoId } as any)
      }
      refreshList()
      setEditorOpen(false)
      setEditingJugada(null)
    } catch (e) {
      console.error('Error saving ABP jugada:', e)
    } finally {
      setSaving(false)
    }
  }

  const handleDuplicate = async (id: string) => {
    try {
      await abpApi.duplicate(id)
      refreshList()
    } catch (e) {
      console.error('Error duplicating:', e)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar esta jugada?')) return
    try {
      await abpApi.delete(id)
      refreshList()
    } catch (e) {
      console.error('Error deleting:', e)
    }
  }

  const handleDownloadPlaybook = async () => {
    if (!equipoId) return
    try {
      const blob = await abpApi.downloadPlaybookPdf(equipoId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `playbook_abp_${equipoActivo?.nombre || 'equipo'}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Error downloading playbook:', e)
    }
  }

  if (!equipoId) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-400">
        Selecciona un equipo para ver las jugadas de balon parado
      </div>
    )
  }

  // Full-screen editor overlay
  if (editorOpen) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col">
        <ABPEditor
          jugada={editingJugada || undefined}
          onSave={handleSave}
          onCancel={() => { setEditorOpen(false); setEditingJugada(null) }}
          saving={saving}
        />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-orange-100 rounded-xl">
            <Flag className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Balon Parado</h1>
            <p className="text-sm text-gray-500">
              {jugadas.length} jugada{jugadas.length !== 1 ? 's' : ''} en la biblioteca
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {jugadas.length > 0 && (
            <button
              onClick={handleDownloadPlaybook}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <Download className="h-4 w-4" />
              Playbook PDF
            </button>
          )}
          <button
            onClick={handleNew}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            <Plus className="h-4 w-4" />
            Nueva Jugada
          </button>
        </div>
      </div>

      {/* Library */}
      <ABPLibrary
        jugadas={jugadas}
        loading={isLoading}
        onSelect={handleSelect}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
      />
    </div>
  )
}
