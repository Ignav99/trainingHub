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
  onCreate?: () => void
}

export default function ABPLibrary({ jugadas, loading, onSelect, onDuplicate, onDelete, onCreate }: ABPLibraryProps) {
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
        <div className="text-center py-16 rounded-2xl border border-dashed bg-orange-50/30">
          <p className="text-lg font-medium text-foreground">No hay jugadas</p>
          <p className="text-sm mt-1 text-muted-foreground">
            {jugadas.length > 0
              ? 'Prueba a cambiar los filtros'
              : 'Crea tu primera jugada de balón parado'}
          </p>
          {jugadas.length === 0 && onCreate && (
            <button
              type="button"
              onClick={onCreate}
              className="mt-4 inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-orange-600 text-white hover:bg-orange-700"
            >
              Nueva jugada
            </button>
          )}
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
