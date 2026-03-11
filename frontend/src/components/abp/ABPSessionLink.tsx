'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Plus, Trash2, Flag } from 'lucide-react'
import { apiKey, apiFetcher } from '@/lib/swr'
import { abpApi } from '@/lib/api/abp'
import { ABPJugada, ABPSesionJugada, ABP_TIPOS } from '@/types'

interface ABPSessionLinkProps {
  sesionId: string
  equipoId: string
}

export default function ABPSessionLink({ sesionId, equipoId }: ABPSessionLinkProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [loading, setLoading] = useState(false)

  const linkedKey = apiKey(`/abp/sesion/${sesionId}`)
  const { data: linkedData, mutate: mutateLinked } = useSWR<{ data: ABPSesionJugada[] }>(linkedKey, apiFetcher)
  const linked = linkedData?.data || []

  const libraryKey = apiKey('/abp', { equipo_id: equipoId }, ['equipo_id'])
  const { data: libraryData } = useSWR<{ data: ABPJugada[] }>(showPicker ? libraryKey : null, apiFetcher)
  const library = libraryData?.data || []

  const linkedIds = new Set(linked.map(l => l.jugada_id))
  const available = library.filter(j => !linkedIds.has(j.id))

  const handleLink = async (jugadaId: string) => {
    setLoading(true)
    try {
      await abpApi.linkToSesion(sesionId, { jugada_id: jugadaId, orden: linked.length })
      mutateLinked()
      setShowPicker(false)
    } catch (e) {
      console.error('Error linking play:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleUnlink = async (jugadaId: string) => {
    try {
      await abpApi.unlinkFromSesion(sesionId, jugadaId)
      mutateLinked()
    } catch (e) {
      console.error('Error unlinking play:', e)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flag className="h-4 w-4 text-orange-500" />
          <h3 className="text-sm font-semibold text-gray-700">Jugadas ABP vinculadas</h3>
          <span className="text-xs text-gray-400">({linked.length})</span>
        </div>
        <button
          onClick={() => setShowPicker(true)}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100"
        >
          <Plus className="h-3 w-3" /> Vincular
        </button>
      </div>

      {linked.length === 0 ? (
        <div className="text-center py-4 text-gray-400 text-xs border border-dashed border-gray-200 rounded-lg">
          Sin jugadas ABP vinculadas
        </div>
      ) : (
        <div className="space-y-1.5">
          {linked.map(sl => {
            const jugada = sl.jugada
            if (!jugada) return null
            const tipoInfo = ABP_TIPOS.find(t => t.value === jugada.tipo)
            return (
              <div key={sl.id} className="flex items-center gap-2 p-2 bg-white border border-gray-100 rounded-lg group">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold flex-shrink-0 ${
                  jugada.lado === 'ofensivo' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                }`}>
                  {jugada.lado === 'ofensivo' ? 'OF' : 'DF'}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-800 truncate block">{jugada.nombre}</span>
                  <span className="text-xs text-gray-400">{tipoInfo?.label}</span>
                </div>
                <button onClick={() => handleUnlink(sl.jugada_id)} className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Picker */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowPicker(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[60vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold">Vincular jugada ABP</h3>
            </div>
            <div className="overflow-y-auto max-h-[45vh] p-3 space-y-1">
              {available.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm">Sin jugadas disponibles</div>
              ) : (
                available.map(j => {
                  const tipoInfo = ABP_TIPOS.find(t => t.value === j.tipo)
                  return (
                    <button
                      key={j.id}
                      onClick={() => handleLink(j.id)}
                      disabled={loading}
                      className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-orange-50 text-left transition-colors disabled:opacity-50"
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
