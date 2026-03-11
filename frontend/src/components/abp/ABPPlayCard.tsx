'use client'

import { Copy, Trash2, MoreVertical } from 'lucide-react'
import { ABPJugada, ABP_TIPOS } from '@/types'
import { useState } from 'react'

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
  const elementCount = firstFase?.diagram?.elements?.length || 0

  return (
    <div
      className="group relative border border-gray-200 rounded-xl overflow-hidden hover:shadow-md hover:border-orange-300 transition-all cursor-pointer bg-white"
      onClick={onClick}
    >
      {/* Thumbnail area */}
      <div className="relative h-36 bg-gradient-to-br from-green-800 to-green-900 flex items-center justify-center">
        {elementCount > 0 ? (
          <div className="text-white/30 text-xs">
            {elementCount} elementos
          </div>
        ) : (
          <div className="text-white/20 text-xs">Sin diagrama</div>
        )}
        {/* Badges */}
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
        {/* Phases count */}
        {jugada.fases?.length > 1 && (
          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/20 text-white">
            {jugada.fases.length} fases
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

          {/* Menu */}
          {(onDuplicate || onDelete) && (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMenu(!showMenu)
                }}
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
