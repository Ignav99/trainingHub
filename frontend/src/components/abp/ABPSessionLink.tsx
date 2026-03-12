'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Plus, Trash2, Flag, Eye, X } from 'lucide-react'
import { apiKey, apiFetcher } from '@/lib/swr'
import { abpApi } from '@/lib/api/abp'
import { ABPJugada, ABPSesionJugada, ABP_TIPOS, LadoABP } from '@/types'
import { TEAM_COLORS, ELEMENT_SIZES } from '@/components/tarea-editor/types'
import ABPPitch from './ABPPitch'

interface ABPSessionLinkProps {
  sesionId: string
  equipoId: string
}

function MiniDiagram({ jugada }: { jugada: ABPJugada }) {
  const fase = jugada.fases?.[0]
  const elements = fase?.diagram?.elements || []
  const arrows = fase?.diagram?.arrows || []
  const pitchView = jugada.tipo === 'falta_lejana' ? 'full' : 'half'

  return (
    <div className="w-14 h-10 flex-shrink-0 rounded overflow-hidden border border-gray-200">
      <ABPPitch type={pitchView as 'full' | 'half'}>
        {arrows.map((arrow: any) => {
          const angle = Math.atan2(arrow.to.y - arrow.from.y, arrow.to.x - arrow.from.x)
          return (
            <g key={arrow.id}>
              <line x1={arrow.from.x} y1={arrow.from.y} x2={arrow.to.x} y2={arrow.to.y}
                stroke={arrow.color || '#FFF'} strokeWidth="3" strokeDasharray={arrow.type === 'pass' ? '8,4' : 'none'} />
              <polygon
                points={`${arrow.to.x},${arrow.to.y} ${arrow.to.x - 10 * Math.cos(angle - Math.PI / 6)},${arrow.to.y - 10 * Math.sin(angle - Math.PI / 6)} ${arrow.to.x - 10 * Math.cos(angle + Math.PI / 6)},${arrow.to.y - 10 * Math.sin(angle + Math.PI / 6)}`}
                fill={arrow.color || '#FFF'} />
            </g>
          )
        })}
        {elements.map((el: any) => {
          if (el.type === 'player' || el.type === 'opponent' || el.type === 'player_gk') {
            const size = ELEMENT_SIZES[el.type as keyof typeof ELEMENT_SIZES] || 20
            return (
              <g key={el.id} transform={`translate(${el.position.x}, ${el.position.y})`}>
                <circle r={size / 2} fill={el.color || TEAM_COLORS.team1} stroke="#FFF" strokeWidth="2" />
              </g>
            )
          }
          if (el.type === 'ball') return <circle key={el.id} cx={el.position.x} cy={el.position.y} r="6" fill="#FFF" stroke="#000" strokeWidth="1" />
          return null
        })}
      </ABPPitch>
    </div>
  )
}

function DiagramPreview({ jugada, onClose }: { jugada: ABPJugada; onClose: () => void }) {
  const fase = jugada.fases?.[0]
  const elements = fase?.diagram?.elements || []
  const arrows = fase?.diagram?.arrows || []
  const pitchView = jugada.tipo === 'falta_lejana' ? 'full' : 'half'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${jugada.lado === 'ofensivo' ? 'bg-blue-500 text-white' : 'bg-red-500 text-white'}`}>
              {jugada.lado === 'ofensivo' ? 'OF' : 'DF'}
            </span>
            <h3 className="text-sm font-semibold text-gray-900">{jugada.nombre}</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-4">
          <ABPPitch type={pitchView as 'full' | 'half'}>
            {arrows.map((arrow: any) => {
              const angle = Math.atan2(arrow.to.y - arrow.from.y, arrow.to.x - arrow.from.x)
              const midX = (arrow.from.x + arrow.to.x) / 2
              const midY = (arrow.from.y + arrow.to.y) / 2
              return (
                <g key={arrow.id}>
                  <line x1={arrow.from.x} y1={arrow.from.y} x2={arrow.to.x} y2={arrow.to.y}
                    stroke={arrow.color || '#FFF'} strokeWidth="2.5" strokeDasharray={arrow.type === 'pass' ? '8,4' : 'none'} />
                  <polygon
                    points={`${arrow.to.x},${arrow.to.y} ${arrow.to.x - 10 * Math.cos(angle - Math.PI / 6)},${arrow.to.y - 10 * Math.sin(angle - Math.PI / 6)} ${arrow.to.x - 10 * Math.cos(angle + Math.PI / 6)},${arrow.to.y - 10 * Math.sin(angle + Math.PI / 6)}`}
                    fill={arrow.color || '#FFF'} />
                  {arrow.label && (
                    <>
                      <circle cx={midX} cy={midY} r="10" fill="rgba(0,0,0,0.7)" />
                      <text x={midX} y={midY + 1} textAnchor="middle" dominantBaseline="middle" fill="#FFF" fontSize="9" fontWeight="bold" fontFamily="Arial">{arrow.label}</text>
                    </>
                  )}
                </g>
              )
            })}
            {elements.map((el: any) => {
              const size = ELEMENT_SIZES[el.type as keyof typeof ELEMENT_SIZES] || 24
              if (el.type === 'player' || el.type === 'opponent' || el.type === 'player_gk') {
                return (
                  <g key={el.id} transform={`translate(${el.position.x}, ${el.position.y})`}>
                    <circle r={size / 2} fill={el.color || TEAM_COLORS.team1} stroke="#FFF" strokeWidth="2" />
                    <text x="0" y="1" textAnchor="middle" dominantBaseline="middle" fill="#FFF" fontSize="10" fontWeight="bold" fontFamily="Arial">{el.label}</text>
                  </g>
                )
              }
              if (el.type === 'ball') return <circle key={el.id} cx={el.position.x} cy={el.position.y} r="6" fill="#FFF" stroke="#000" strokeWidth="1" />
              if (el.type === 'cone') return <polygon key={el.id} points={`${el.position.x},${el.position.y - 8} ${el.position.x + 6},${el.position.y + 6} ${el.position.x - 6},${el.position.y + 6}`} fill="#FF6B00" />
              return null
            })}
          </ABPPitch>
          {jugada.descripcion && <p className="mt-3 text-sm text-gray-600">{jugada.descripcion}</p>}
        </div>
      </div>
    </div>
  )
}

export default function ABPSessionLink({ sesionId, equipoId }: ABPSessionLinkProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [pickerFilter, setPickerFilter] = useState<LadoABP | 'todo'>('todo')
  const [loading, setLoading] = useState(false)
  const [previewJugada, setPreviewJugada] = useState<ABPJugada | null>(null)

  const linkedKey = apiKey(`/abp/sesion/${sesionId}`)
  const { data: linkedData, mutate: mutateLinked } = useSWR<{ data: ABPSesionJugada[] }>(linkedKey, apiFetcher)
  const linked = linkedData?.data || []

  const libraryKey = apiKey('/abp', { equipo_id: equipoId }, ['equipo_id'])
  const { data: libraryData } = useSWR<{ data: ABPJugada[] }>(showPicker ? libraryKey : null, apiFetcher)
  const library = libraryData?.data || []

  const linkedIds = new Set(linked.map(l => l.jugada_id))
  const available = library
    .filter(j => !linkedIds.has(j.id))
    .filter(j => pickerFilter === 'todo' || j.lado === pickerFilter)

  const handleLink = async (jugadaId: string) => {
    setLoading(true)
    try {
      await abpApi.linkToSesion(sesionId, { jugada_id: jugadaId, orden: linked.length })
      mutateLinked()
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
          Sin jugadas ABP vinculadas a esta sesion
        </div>
      ) : (
        <div className="space-y-1.5">
          {linked.map(sl => {
            const jugada = sl.jugada
            if (!jugada) return null
            const tipoInfo = ABP_TIPOS.find(t => t.value === jugada.tipo)
            const hasElements = (jugada.fases?.[0]?.diagram?.elements?.length || 0) > 0
            return (
              <div key={sl.id} className="flex items-center gap-2 p-2 bg-white border border-gray-100 rounded-lg group">
                {hasElements && <MiniDiagram jugada={jugada} />}
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold flex-shrink-0 ${
                  jugada.lado === 'ofensivo' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                }`}>
                  {jugada.lado === 'ofensivo' ? 'OF' : 'DF'}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-800 truncate block">{jugada.nombre}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-400">{tipoInfo?.label}</span>
                    {jugada.senal_codigo && <span className="text-[10px] px-1 py-0.5 bg-amber-50 text-amber-600 rounded">{jugada.senal_codigo}</span>}
                  </div>
                </div>
                <button onClick={() => setPreviewJugada(jugada)} className="p-1 text-gray-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Ver diagrama">
                  <Eye className="h-3.5 w-3.5" />
                </button>
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
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[70vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold mb-2">Vincular jugada ABP a la sesion</h3>
              <div className="flex gap-1">
                {(['todo', 'ofensivo', 'defensivo'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setPickerFilter(f)}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                      pickerFilter === f
                        ? f === 'ofensivo' ? 'bg-blue-500 text-white'
                          : f === 'defensivo' ? 'bg-red-500 text-white'
                          : 'bg-gray-800 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {f === 'todo' ? 'Todas' : f === 'ofensivo' ? 'Ofensivas' : 'Defensivas'}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-y-auto max-h-[50vh] p-3 space-y-1.5">
              {available.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm">Sin jugadas disponibles</div>
              ) : (
                available.map(j => {
                  const tipoInfo = ABP_TIPOS.find(t => t.value === j.tipo)
                  const hasElements = (j.fases?.[0]?.diagram?.elements?.length || 0) > 0
                  return (
                    <button
                      key={j.id}
                      onClick={() => handleLink(j.id)}
                      disabled={loading}
                      className="flex items-center gap-2.5 w-full p-2 rounded-lg hover:bg-orange-50 text-left transition-colors disabled:opacity-50"
                    >
                      {hasElements && <MiniDiagram jugada={j} />}
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
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diagram preview */}
      {previewJugada && <DiagramPreview jugada={previewJugada} onClose={() => setPreviewJugada(null)} />}
    </div>
  )
}
