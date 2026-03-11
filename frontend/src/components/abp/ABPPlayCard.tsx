'use client'

import { Copy, Trash2, MoreVertical } from 'lucide-react'
import { ABPJugada, ABP_TIPOS } from '@/types'
import { useState } from 'react'
import { TEAM_COLORS, ELEMENT_SIZES } from '@/components/tarea-editor/types'
import ABPPitch from './ABPPitch'

interface ABPPlayCardProps {
  jugada: ABPJugada
  onClick: () => void
  onDuplicate?: () => void
  onDelete?: () => void
}

export default function ABPPlayCard({ jugada, onClick, onDuplicate, onDelete }: ABPPlayCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const tipoInfo = ABP_TIPOS.find(t => t.value === jugada.tipo)
  const firstFase = jugada.fases?.[0]
  const elements = firstFase?.diagram?.elements || []
  const arrows = firstFase?.diagram?.arrows || []
  const pitchView = jugada.tipo === 'falta_lejana' ? 'full' : 'half'

  return (
    <div
      className="group relative border border-gray-200 rounded-xl overflow-hidden hover:shadow-md hover:border-orange-300 transition-all cursor-pointer bg-white"
      onClick={onClick}
    >
      {/* Thumbnail — real SVG mini diagram */}
      <div className="relative h-40 overflow-hidden">
        <ABPPitch type={pitchView as 'full' | 'half'}>
          {/* Render arrows */}
          {arrows.map((arrow: any) => {
            const angle = Math.atan2(arrow.to.y - arrow.from.y, arrow.to.x - arrow.from.x)
            return (
              <g key={arrow.id}>
                <line x1={arrow.from.x} y1={arrow.from.y} x2={arrow.to.x} y2={arrow.to.y}
                  stroke={arrow.color || '#FFFFFF'} strokeWidth="2"
                  strokeDasharray={arrow.type === 'pass' ? '8,4' : 'none'}
                />
                <polygon
                  points={`${arrow.to.x},${arrow.to.y} ${arrow.to.x - 8 * Math.cos(angle - Math.PI / 6)},${arrow.to.y - 8 * Math.sin(angle - Math.PI / 6)} ${arrow.to.x - 8 * Math.cos(angle + Math.PI / 6)},${arrow.to.y - 8 * Math.sin(angle + Math.PI / 6)}`}
                  fill={arrow.color || '#FFFFFF'}
                />
              </g>
            )
          })}
          {/* Render elements */}
          {elements.map((el: any) => {
            const size = ELEMENT_SIZES[el.type as keyof typeof ELEMENT_SIZES] || 20
            if (el.type === 'player' || el.type === 'opponent' || el.type === 'player_gk') {
              return (
                <g key={el.id} transform={`translate(${el.position.x}, ${el.position.y})`}>
                  <circle r={size / 2} fill={el.color || TEAM_COLORS.team1} stroke="#FFFFFF" strokeWidth="1.5" />
                  <text x="0" y="1" textAnchor="middle" dominantBaseline="middle" fill="#FFF" fontSize="8" fontWeight="bold" fontFamily="Arial">
                    {el.label}
                  </text>
                </g>
              )
            }
            if (el.type === 'cone') {
              return <polygon key={el.id} points={`${el.position.x},${el.position.y - 8} ${el.position.x + 6},${el.position.y + 6} ${el.position.x - 6},${el.position.y + 6}`} fill="#FF6B00" />
            }
            if (el.type === 'ball') {
              return <circle key={el.id} cx={el.position.x} cy={el.position.y} r="5" fill="#FFFFFF" stroke="#000" strokeWidth="0.5" />
            }
            return null
          })}
        </ABPPitch>

        {/* Badges overlay */}
        <div className="absolute top-2 left-2 flex gap-1">
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
            jugada.lado === 'ofensivo'
              ? 'bg-blue-500 text-white'
              : 'bg-red-500 text-white'
          }`}>
            {jugada.lado === 'ofensivo' ? 'OF' : 'DF'}
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-500 text-white">
            {tipoInfo?.label || jugada.tipo}
          </span>
        </div>
        {jugada.codigo && (
          <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-black/40 text-white">
            {jugada.codigo}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-gray-900 truncate">{jugada.nombre}</h3>
            {jugada.subtipo && (
              <span className="text-xs text-gray-500">{jugada.subtipo}</span>
            )}
          </div>

          {(onDuplicate || onDelete) && (
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu) }}
                className="p-1 rounded hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4 text-gray-400" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-8 z-10 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-32">
                  {onDuplicate && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDuplicate(); setShowMenu(false) }}
                      className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      <Copy className="h-3.5 w-3.5" /> Duplicar
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(); setShowMenu(false) }}
                      className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Eliminar
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {jugada.senal_codigo && (
          <div className="mt-1 text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded inline-block font-medium">
            {jugada.senal_codigo}
          </div>
        )}

        {jugada.tags?.length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {jugada.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
