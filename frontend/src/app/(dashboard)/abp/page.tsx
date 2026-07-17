'use client'

import { useState } from 'react'
import useSWR, { mutate } from 'swr'
import { Flag, Plus, Download, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { useEquipoStore } from '@/stores/equipoStore'
import { apiKey, apiFetcher } from '@/lib/swr'
import { abpApi } from '@/lib/api/abp'
import { ABPJugada } from '@/types'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import ABPLibrary from '@/components/abp/ABPLibrary'
import ABPEditor from '@/components/abp/ABPEditor'
import ABPPreparePlan from '@/components/abp/ABPPreparePlan'

export default function ABPPage() {
  const { equipoActivo } = useEquipoStore()
  const equipoId = equipoActivo?.id

  const [editorOpen, setEditorOpen] = useState(false)
  const [editingJugada, setEditingJugada] = useState<ABPJugada | null>(null)
  const [saving, setSaving] = useState(false)
  const [prepareOpen, setPrepareOpen] = useState(false)

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

  const handleSave = async (payload: Partial<ABPJugada>) => {
    if (!equipoId) return
    setSaving(true)
    try {
      if (editingJugada?.id) {
        await abpApi.update(editingJugada.id, payload as Parameters<typeof abpApi.update>[1])
        toast.success('Jugada actualizada')
      } else {
        await abpApi.create({ ...payload, equipo_id: equipoId } as Parameters<typeof abpApi.create>[0])
        toast.success('Jugada creada')
      }
      refreshList()
      setEditorOpen(false)
      setEditingJugada(null)
    } catch (e) {
      console.error('Error saving ABP jugada:', e)
      toast.error('No se pudo guardar la jugada')
    } finally {
      setSaving(false)
    }
  }

  const handleDuplicate = async (id: string) => {
    try {
      await abpApi.duplicate(id)
      refreshList()
      toast.success('Jugada duplicada')
    } catch (e) {
      console.error('Error duplicating:', e)
      toast.error('No se pudo duplicar')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta jugada?')) return
    try {
      await abpApi.delete(id)
      refreshList()
      toast.success('Jugada eliminada')
    } catch (e) {
      console.error('Error deleting:', e)
      toast.error('No se pudo eliminar')
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
      toast.success('Playbook descargado')
    } catch (e) {
      console.error('Error downloading playbook:', e)
      toast.error('No se pudo descargar el playbook')
    }
  }

  if (!equipoId) {
    return (
      <div className="rounded-2xl border bg-card">
        <EmptyState
          icon={<Flag className="h-12 w-12" />}
          title="Selecciona un equipo"
          description="Necesitas un equipo activo para ver la biblioteca de balón parado."
        />
      </div>
    )
  }

  if (prepareOpen) {
    return <ABPPreparePlan onClose={() => setPrepareOpen(false)} />
  }

  if (editorOpen) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col">
        <ABPEditor
          jugada={editingJugada || undefined}
          onSave={handleSave}
          onCancel={() => {
            setEditorOpen(false)
            setEditingJugada(null)
          }}
          saving={saving}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Balón Parado"
        description={`${jugadas.length} jugada${jugadas.length !== 1 ? 's' : ''} en la biblioteca · ${equipoActivo?.nombre || ''}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPrepareOpen(true)}>
              <FileText className="h-4 w-4 mr-1.5" />
              Preparar partido
            </Button>
            {jugadas.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleDownloadPlaybook}>
                <Download className="h-4 w-4 mr-1.5" />
                Playbook PDF
              </Button>
            )}
            <Button size="sm" onClick={handleNew} className="bg-orange-600 hover:bg-orange-700 text-white">
              <Plus className="h-4 w-4 mr-1.5" />
              Nueva jugada
            </Button>
          </div>
        }
      />

      <ABPLibrary
        jugadas={jugadas}
        loading={isLoading}
        onSelect={handleSelect}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
        onCreate={handleNew}
      />
    </div>
  )
}
