'use client'

import { ABPJugada, TipoABP, LadoABP, SubtipoABP } from '@/types'
import ABPPlayCard from './ABPPlayCard'
import ABPFilters from './ABPFilters'
import { useState } from 'react'

interface ABPLibraryProps {
  jugadas: ABPJugada[]
  loading?: boolean
  onSelect: (jugada: ABPJugada) => void
  onDuplicate?: (id: string) => void
  onDelete?: (id: string) => void
}

export default function ABPLibrary({ jugadas, loading, onSelect, onDuplicate, onDelete }: ABPLibraryProps) {
  const [tipo, setTipo] = useState<TipoABP | ''>('')
  const [lado, setLado] = useState<LadoABP | ''>('')
  const [subtipo, setSubtipo] = useState<SubtipoABP | ''>('')
  const [busqueda, setBusqueda] = useState('')

  // Client-side filtering (API also filters, but this gives instant feedback)
  const filtered = jugadas.filter(j => {
    if (tipo && j.tipo !== tipo) return false
    if (lado && j.lado !== lado) return false
    if (subtipo && j.subtipo !== subtipo) return false
    if (busqueda && !j.nombre.toLowerCase().includes(busqueda.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-4">
      <ABPFilters
        tipo={tipo}
        lado={lado}
        subtipo={subtipo}
        busqueda={busqueda}
        onTipoChange={setTipo}
        onLadoChange={setLado}
        onSubtipoChange={setSubtipo}
        onBusquedaChange={setBusqueda}
      />

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-52 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No hay jugadas</p>
          <p className="text-sm mt-1">
            {jugadas.length > 0 ? 'Prueba a cambiar los filtros' : 'Crea tu primera jugada de balon parado'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(jugada => (
            <ABPPlayCard
              key={jugada.id}
              jugada={jugada}
              onClick={() => onSelect(jugada)}
              onDuplicate={onDuplicate ? () => onDuplicate(jugada.id) : undefined}
              onDelete={onDelete ? () => onDelete(jugada.id) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}
