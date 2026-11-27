'use client'

import { FichaJugador, type DatosFicha } from './FichaJugador'
import { Rotulo } from './Piezas'

export interface FichaBanco extends DatosFicha {
  tarjeta: 'amarilla' | 'roja' | null
  goles: number
  minutos: number | null
  salio: boolean
}

interface BanquilloProps {
  jugadores: FichaBanco[]
  seleccionado: string | null
  entra: string | null
  candidatos: boolean
  mostrarFoto: boolean
  pulsos: Record<string, number>
  onToque: (id: string) => void
}

export function Banquillo({ jugadores, seleccionado, entra, candidatos, mostrarFoto, pulsos, onToque }: BanquilloProps) {
  return (
    <div className="flex shrink-0 items-stretch gap-2 rounded-lg border-[1.5px] border-line bg-card" data-banquillo>
      <div className="flex w-[84px] shrink-0 flex-col items-start justify-center border-r-[1.5px] border-border px-3">
        <Rotulo>Banquillo</Rotulo>
        <span className="text-sm text-muted-foreground tabular-nums">{jugadores.length}</span>
      </div>
      <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto overscroll-x-contain py-1 pr-2" style={{ scrollSnapType: 'x proximity' }}>
        {jugadores.length === 0 && (
          <p className="self-center px-2 text-[15px] text-muted-foreground">Sin suplentes convocados</p>
        )}
        {jugadores.map((j) => (
          <div key={j.id} style={{ scrollSnapAlign: 'start' }}>
            <FichaJugador
              jugador={j}
              tam="banquillo"
              mostrarFoto={mostrarFoto}
              seleccionado={seleccionado === j.id}
              rol={entra === j.id ? 'entra' : null}
              candidato={candidatos}
              tarjeta={j.tarjeta}
              goles={j.goles}
              minutos={j.minutos}
              salio={j.salio}
              pulso={pulsos[j.id] || 0}
              onClick={() => onToque(j.id)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
