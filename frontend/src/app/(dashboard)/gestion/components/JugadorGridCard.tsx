'use client'

import Link from 'next/link'
import { PlayerAvatar } from '@/components/player/PlayerAvatar'
import { POSICIONES, ESTADOS_JUGADOR, jugadorNombreVisible } from '@/lib/api/jugadores'
import type { ClubJugador } from '@/lib/api/clubAdmin'

const NIVELES: Array<{ key: 'nivel_tecnico' | 'nivel_tactico' | 'nivel_fisico' | 'nivel_mental'; label: string; color: string }> = [
  { key: 'nivel_tecnico', label: 'T', color: 'bg-blue-500' },
  { key: 'nivel_tactico', label: 'TA', color: 'bg-green-500' },
  { key: 'nivel_fisico', label: 'F', color: 'bg-red-500' },
  { key: 'nivel_mental', label: 'M', color: 'bg-purple-500' },
]

interface JugadorGridCardProps {
  jugador: ClubJugador
  /** Muestra el badge de equipo/categoria (para vistas transversales del club). */
  showEquipo?: boolean
}

export default function JugadorGridCard({ jugador, showEquipo }: JugadorGridCardProps) {
  const pos = POSICIONES[jugador.posicion_principal as keyof typeof POSICIONES]
  const estadoConfig = ESTADOS_JUGADOR[jugador.estado as keyof typeof ESTADOS_JUGADOR]
  const hasNiveles = NIVELES.some(({ key }) => jugador[key] != null)

  return (
    <Link
      href={`/plantilla/${jugador.id}`}
      className="card-interactive rounded-xl p-4 block hover:border-primary/30 transition-colors"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="relative">
          <PlayerAvatar player={jugador} size="lg" />
          {jugador.dorsal != null && (
            <span className="absolute -bottom-1 -right-1 bg-gray-900 text-white text-xs font-bold px-1.5 py-0.5 rounded">
              {jugador.dorsal}
            </span>
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm leading-snug whitespace-normal break-words text-gray-900">
            {jugadorNombreVisible(jugador)}
          </h3>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white"
              style={{ backgroundColor: pos?.color || '#6B7280' }}
            >
              {jugador.posicion_principal}
            </span>
            {estadoConfig && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: estadoConfig.color }}
              >
                {estadoConfig.nombre}
              </span>
            )}
          </div>
          {showEquipo && jugador.equipos && (
            <div className="mt-1.5">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                {jugador.equipos.nombre}
                {jugador.equipos.categoria ? ` · ${jugador.equipos.categoria}` : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {hasNiveles && (
        <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-gray-100">
          {NIVELES.map(({ key, label, color }) => {
            const value = jugador[key]
            return (
              <div key={key} className="text-center">
                <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${color}`}
                    style={{ width: `${Math.min(100, ((value ?? 0) / 10) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-400 mt-0.5 block">{label}</span>
              </div>
            )
          })}
        </div>
      )}
    </Link>
  )
}
