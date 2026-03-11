'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Plus, Trash2, Flag, Download, GripVertical } from 'lucide-react'
import { apiKey, apiFetcher } from '@/lib/swr'
import { abpApi } from '@/lib/api/abp'
import { ABPJugada, ABPPartidoJugada, ABP_TIPOS } from '@/types'

interface ABPMatchPlanProps {
  partidoId: string
  equipoId: string
}

export default function ABPMatchPlan({ partidoId, equipoId }: ABPMatchPlanProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [loading, setLoading] = useState(false)

  // Jugadas assigned to match
  const assignedKey = apiKey(`/abp/partido/${partidoId}`)
  const { data: assignedData, mutate: mutateAssigned } = useSWR<{ data: ABPPartidoJugada[] }>(assignedKey, apiFetcher)
  const assigned = assignedData?.data || []

  // All jugadas for picker
  const libraryKey = apiKey('/abp', { equipo_id: equipoId }, ['equipo_id'])
  const { data: libraryData } = useSWR<{ data: ABPJugada[] }>(showPicker ? libraryKey : null, apiFetcher)
  const library = libraryData?.data || []

  const assignedIds = new Set(assigned.map(a => a.jugada_id))
  const available = library.filter(j => !assignedIds.has(j.id))

  const handleAssign = async (jugadaId: string) => {
    setLoading(true)
    try {
      await abpApi.assignToPartido(partidoId, { jugada_id: jugadaId, orden: assigned.length })
      mutateAssigned()
      setShowPicker(false)
    } catch (e) {
      console.error('Error assigning play:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleUnassign = async (jugadaId: string) => {
    try {
      await abpApi.unassignFromPartido(partidoId, jugadaId)
      mutateAssigned()
    } catch (e) {
      console.error('Error unassigning play:', e)
    }
  }

  const handleDownloadPdf = async () => {
    try {
      const blob = await abpApi.downloadPartidoPdf(partidoId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `abp_partido.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Error downloading PDF:', e)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flag className="h-4 w-4 text-orange-500" />
          <h3 className="text-sm font-semibold text-gray-700">Jugadas de Balon Parado</h3>
          <span className="text-xs text-gray-400">({assigned.length})</span>
        </div>
        <div className="flex items-center gap-1.5">
          {assigned.length > 0 && (
            <button onClick={handleDownloadPdf} className="p-1.5 text-gray-400 hover:text-gray-600 rounded" title="Descargar PDF ABP">
              <Download className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => setShowPicker(true)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100"
          >
            <Plus className="h-3 w-3" /> Agregar
          </button>
        </div>
      </div>

      {/* Assigned plays */}
      {assigned.length === 0 ? (
        <div className="text-center py-6 text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg">
          No hay jugadas ABP asignadas a este partido
        </div>
      ) : (
        <div className="space-y-2">
          {assigned.map((ap) => {
            const jugada = ap.jugada
            if (!jugada) return null
            const tipoInfo = ABP_TIPOS.find(t => t.value === jugada.tipo)
            return (
              <div key={ap.id} className="flex items-center gap-2 p-2.5 bg-white border border-gray-100 rounded-lg group">
                <GripVertical className="h-4 w-4 text-gray-300 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      jugada.lado === 'ofensivo' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {jugada.lado === 'ofensivo' ? 'OF' : 'DF'}
                    </span>
                    <span className="text-sm font-medium text-gray-800 truncate">{jugada.nombre}</span>
                  </div>
                  <span className="text-xs text-gray-400">{tipoInfo?.label || jugada.tipo}</span>
                </div>
                {jugada.codigo && (
                  <span className="text-[10px] font-mono text-gray-400">{jugada.codigo}</span>
                )}
                <button
                  onClick={() => handleUnassign(ap.jugada_id)}
                  className="p-1 rounded text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Picker modal */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowPicker(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[70vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold">Seleccionar jugada</h3>
            </div>
            <div className="overflow-y-auto max-h-[55vh] p-3 space-y-1.5">
              {available.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  {library.length === 0 ? 'No hay jugadas en la biblioteca' : 'Todas las jugadas ya estan asignadas'}
                </div>
              ) : (
                available.map(j => {
                  const tipoInfo = ABP_TIPOS.find(t => t.value === j.tipo)
                  return (
                    <button
                      key={j.id}
                      onClick={() => handleAssign(j.id)}
                      disabled={loading}
                      className="flex items-center gap-2 w-full p-2.5 rounded-lg hover:bg-orange-50 text-left transition-colors disabled:opacity-50"
                    >
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold flex-shrink-0 ${
                        j.lado === 'ofensivo' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {j.lado === 'ofensivo' ? 'OF' : 'DF'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">{j.nombre}</div>
                        <span className="text-xs text-gray-400">{tipoInfo?.label}</span>
                      </div>
                      {j.codigo && <span className="text-[10px] font-mono text-gray-400">{j.codigo}</span>}
                    </button>
                  )
                })
              )}
            </div>
            <div className="px-4 py-3 border-t border-gray-200">
              <button onClick={() => setShowPicker(false)} className="w-full py-1.5 text-sm text-gray-500 hover:bg-gray-50 rounded-lg">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
