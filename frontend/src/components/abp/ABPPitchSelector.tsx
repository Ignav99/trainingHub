'use client'

import { ABP_TIPOS, TipoABP } from '@/types'

interface ABPPitchSelectorProps {
  tipo: TipoABP
  onChange: (tipo: TipoABP) => void
}

export default function ABPPitchSelector({ tipo, onChange }: ABPPitchSelectorProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ABP_TIPOS.map(t => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
            tipo === t.value
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
