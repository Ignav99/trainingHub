'use client'

import { useState, useCallback } from 'react'
import useSWR, { mutate } from 'swr'
import { PenTool, Plus, Copy, Trash2, Clock } from 'lucide-react'
import { useEquipoStore } from '@/stores/equipoStore'
import { apiKey, apiFetcher } from '@/lib/swr'
import { tacticalBoardApi, TacticalBoard } from '@/lib/api/tacticalBoards'
import { useTacticalBoardStore } from '@/stores/useTacticalBoardStore'
import TacticalBoardEditor from '@/components/tactical-board/TacticalBoardEditor'

export default function PizarraTacticaPage() {
  const equipoActivo = useEquipoStore((s) => s.equipoActivo)
  const equipoId = equipoActivo?.id

  const [editorOpen, setEditorOpen] = useState(false)

  const loadBoard = useTacticalBoardStore((s) => s.loadBoard)
  const reset = useTacticalBoardStore((s) => s.reset)
  const setSaving = useTacticalBoardStore((s) => s.setSaving)
  const markClean = useTacticalBoardStore((s) => s.markClean)

  // Fetch boards
  const swrKey = equipoId ? apiKey('/tactical-boards', { equipo_id: equipoId }) : null
  const { data, isLoading } = useSWR<{ data: TacticalBoard[] }>(swrKey, apiFetcher)
  const boards = data?.data || []

  const refreshList = () => { if (swrKey) mutate(swrKey) }

  const handleNew = () => {
    reset()
    setEditorOpen(true)
  }

  const handleSelect = async (board: TacticalBoard) => {
    try {
      const full = await tacticalBoardApi.get(board.id)
      loadBoard(full)
      setEditorOpen(true)
    } catch (e) {
      console.error('Error loading board:', e)
    }
  }

  const handleSave = useCallback(async () => {
    if (!equipoId) return
    const store = useTacticalBoardStore.getState()
    if (!store.nombre.trim()) return

    setSaving(true)
    try {
      const payload = {
        equipo_id: equipoId,
        nombre: store.nombre,
        descripcion: store.descripcion || undefined,
        tipo: store.tipo,
        pitch_type: store.pitchType,
        elements: store.elements,
        arrows: store.arrows,
        zones: store.zones,
        tags: store.tags.length > 0 ? store.tags : undefined,
      }

      // Save current edits to active keyframe before persisting
      if (store.tipo === 'animated') {
        store.saveCurrentToKeyframe()
      }

      if (store.boardId) {
        const { equipo_id, ...updatePayload } = payload
        await tacticalBoardApi.update(store.boardId, updatePayload)
      } else {
        const created = await tacticalBoardApi.create(payload)
        useTacticalBoardStore.setState({ boardId: created.id })
      }

      // Save keyframes for animated boards
      const boardId = useTacticalBoardStore.getState().boardId
      if (store.tipo === 'animated' && boardId) {
        const currentKeyframes = useTacticalBoardStore.getState().keyframes
        for (const kf of currentKeyframes) {
          const frameData = {
            orden: kf.orden,
            nombre: kf.nombre,
            duration_ms: kf.duration_ms,
            elements: kf.elements,
            arrows: kf.arrows,
            zones: kf.zones,
            transition_type: kf.transition_type,
          }
          // If frame has a UUID-like id (from server), update it; otherwise create
          if (kf.id && kf.id.includes('-')) {
            await tacticalBoardApi.updateFrame(boardId, kf.id, frameData)
          } else {
            await tacticalBoardApi.addFrame(boardId, frameData)
          }
        }
      }
      markClean()
      refreshList()
    } catch (e) {
      console.error('Error saving board:', e)
    } finally {
      setSaving(false)
    }
  }, [equipoId, setSaving, markClean])

  const handleDuplicate = async (id: string) => {
    try {
      await tacticalBoardApi.duplicate(id)
      refreshList()
    } catch (e) {
      console.error('Error duplicating:', e)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar esta pizarra?')) return
    try {
      await tacticalBoardApi.delete(id)
      refreshList()
    } catch (e) {
      console.error('Error deleting:', e)
    }
  }

  if (!equipoId) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-400">
        Selecciona un equipo para ver las pizarras tacticas
      </div>
    )
  }

  // Full-screen editor
  if (editorOpen) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col">
        <TacticalBoardEditor
          onSave={handleSave}
          onCancel={() => { setEditorOpen(false); reset() }}
        />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 rounded-xl">
            <PenTool className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pizarra Tactica</h1>
            <p className="text-sm text-gray-500">
              {boards.length} pizarra{boards.length !== 1 ? 's' : ''} en la biblioteca
            </p>
          </div>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nueva Pizarra
        </button>
      </div>

      {/* Board grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : boards.length === 0 ? (
        <div className="text-center py-20">
          <PenTool className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">Sin pizarras</h3>
          <p className="text-sm text-gray-500 mb-4">Crea tu primera pizarra tactica para diseñar formaciones y jugadas</p>
          <button
            onClick={handleNew}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Nueva Pizarra
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {boards.map((board) => (
            <div
              key={board.id}
              className="group relative bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleSelect(board)}
            >
              {/* Thumbnail / placeholder */}
              <div className="h-36 bg-gradient-to-br from-green-700 to-green-900 flex items-center justify-center">
                <PenTool className="h-10 w-10 text-white/30" />
              </div>

              {/* Info */}
              <div className="p-3">
                <h3 className="text-sm font-semibold text-gray-900 truncate">{board.nombre}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    board.tipo === 'animated' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {board.tipo === 'animated' ? 'Animada' : 'Estatica'}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {board.pitch_type === 'full' ? 'Completo' : 'Medio'}
                  </span>
                </div>
                {board.tags && board.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {board.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full">{tag}</span>
                    ))}
                  </div>
                )}
                {board.updated_at && (
                  <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-400">
                    <Clock className="h-3 w-3" />
                    {new Date(board.updated_at).toLocaleDateString('es-ES')}
                  </div>
                )}
              </div>

              {/* Actions overlay */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); handleDuplicate(board.id) }}
                  className="p-1.5 bg-white/90 rounded-lg shadow hover:bg-white text-gray-600"
                  title="Duplicar"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(board.id) }}
                  className="p-1.5 bg-white/90 rounded-lg shadow hover:bg-white text-red-500"
                  title="Eliminar"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
