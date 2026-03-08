'use client'

import type { NivelCarga } from '@/types'

interface PlayerStatusBadgesProps {
  estado: string
  nivelCarga?: NivelCarga | null
  sancionado?: boolean
  className?: string
}

const ESTADO_BADGES: Record<string, { label: string; className: string } | undefined> = {
  lesionado: { label: 'Lesion', className: 'bg-red-100 text-red-700 border-red-200' },
  sancionado: { label: 'Sancion', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  enfermo: { label: 'Enfermo', className: 'bg-orange-100 text-orange-700 border-orange-200' },
}

const NIVEL_BADGES: Record<string, { className: string } | undefined> = {
  critico: { className: 'bg-red-500' },
  alto: { className: 'bg-orange-500' },
  optimo: { className: 'bg-green-500' },
  bajo: { className: 'bg-blue-400' },
}

export function PlayerStatusBadges({ estado, nivelCarga, sancionado, className = '' }: PlayerStatusBadgesProps) {
  const badges: JSX.Element[] = []

  // Estado-based badges
  const estadoBadge = ESTADO_BADGES[estado]
  if (estadoBadge) {
    badges.push(
      <span
        key="estado"
        className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${estadoBadge.className}`}
      >
        {estadoBadge.label}
      </span>
    )
  }

  // Explicit sancion badge (from sanciones system, independent of estado)
  if (sancionado && estado !== 'sancionado') {
    badges.push(
      <span
        key="sancion"
        className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border bg-yellow-100 text-yellow-700 border-yellow-200"
      >
        Sancion
      </span>
    )
  }

  // Nivel carga dot
  if (nivelCarga && nivelCarga !== 'optimo') {
    const nivelBadge = NIVEL_BADGES[nivelCarga]
    if (nivelBadge) {
      badges.push(
        <span
          key="carga"
          className={`inline-block w-2 h-2 rounded-full ${nivelBadge.className}`}
          title={`Carga: ${nivelCarga}`}
        />
      )
    }
  }

  if (badges.length === 0) return null

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {badges}
    </span>
  )
}
