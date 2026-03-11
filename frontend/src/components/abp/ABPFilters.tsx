'use client'

import { Search } from 'lucide-react'
import { ABP_TIPOS, ABP_SUBTIPOS, TipoABP, LadoABP, SubtipoABP } from '@/types'

interface ABPFiltersProps {
  tipo: TipoABP | ''
  lado: LadoABP | ''
  subtipo: SubtipoABP | ''
  busqueda: string
  onTipoChange: (v: TipoABP | '') => void
  onLadoChange: (v: LadoABP | '') => void
  onSubtipoChange: (v: SubtipoABP | '') => void
  onBusquedaChange: (v: string) => void
}

export default function ABPFilters({
  tipo, lado, subtipo, busqueda,
  onTipoChange, onLadoChange, onSubtipoChange, onBusquedaChange,
}: ABPFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Tabs Ofensivo/Defensivo */}
      <div className="flex rounded-lg border border-gray-200 overflow-hidden">
        {[
          { value: '', label: 'Todo' },
          { value: 'ofensivo', label: 'Ofensivo' },
          { value: 'defensivo', label: 'Defensivo' },
        ].map(opt => (
          <button
            key={opt.value}
            onClick={() => onLadoChange(opt.value as LadoABP | '')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              lado === opt.value
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Tipo */}
      <select
        value={tipo}
        onChange={e => onTipoChange(e.target.value as TipoABP | '')}
        className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-700"
      >
        <option value="">Todos los tipos</option>
        {ABP_TIPOS.map(t => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      {/* Subtipo */}
      <select
        value={subtipo}
        onChange={e => onSubtipoChange(e.target.value as SubtipoABP | '')}
        className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-700"
      >
        <option value="">Todos los subtipos</option>
        {ABP_SUBTIPOS.map(s => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>

      {/* Search */}
      <div className="relative flex-1 min-w-48">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar jugada..."
          value={busqueda}
          onChange={e => onBusquedaChange(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white"
        />
      </div>
    </div>
  )
}
