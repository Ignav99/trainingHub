'use client'

import type { NivelCarga } from '@/types'

interface PlayerStatusBadgesProps {
  estado: string
  nivelCarga?: NivelCarga | null
  sancionado?: boolean
  tarjetasAmarillas?: number
  tarjetasRojas?: number
  className?: string
}

const ESTADO_BADGES: Record<string, { label: string; className: string } | undefined> = {
  lesionado: { label: 'Lesion', className: 'bg-red-100 text-red-700 border-red-200' },
  sancionado: { label: 'Sancion', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  enfermo: { label: 'Enfermo', className: 'bg-orange-100 text-orange-700 border-orange-200' },
}

const NIVEL_COLORS: Record<string, { bg: string; text: string; label: string } | undefined> = {
  critico: { bg: 'bg-red-100', text: 'text-red-700', label: 'Critico' },
  alto: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Alto' },
  optimo: { bg: 'bg-green-100', text: 'text-green-700', label: 'Optimo' },
  bajo: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Bajo' },
}

export function PlayerStatusBadges({ estado, nivelCarga, sancionado, tarjetasAmarillas, tarjetasRojas, className = '' }: PlayerStatusBadgesProps) {
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

  // Tarjetas amarillas
  if (tarjetasAmarillas && tarjetasAmarillas > 0) {
    badges.push(
      <span
        key="amarillas"
        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold"
        style={{ backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}
        title={`${tarjetasAmarillas} tarjeta${tarjetasAmarillas > 1 ? 's' : ''} amarilla${tarjetasAmarillas > 1 ? 's' : ''}`}
      >
        <span style={{ width: 7, height: 9, backgroundColor: '#F59E0B', borderRadius: 1, display: 'inline-block', flexShrink: 0 }} />
        {tarjetasAmarillas}
      </span>
    )
  }

  // Tarjetas rojas
  if (tarjetasRojas && tarjetasRojas > 0) {
    badges.push(
      <span
        key="rojas"
        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold"
        style={{ backgroundColor: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA' }}
        title={`${tarjetasRojas} tarjeta${tarjetasRojas > 1 ? 's' : ''} roja${tarjetasRojas > 1 ? 's' : ''}`}
      >
        <span style={{ width: 7, height: 9, backgroundColor: '#EF4444', borderRadius: 1, display: 'inline-block', flexShrink: 0 }} />
        {tarjetasRojas}
      </span>
    )
  }

  // Nivel carga badge (always show, with label)
  if (nivelCarga) {
    const nivelInfo = NIVEL_COLORS[nivelCarga]
    if (nivelInfo) {
      badges.push(
        <span
          key="carga"
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${nivelInfo.bg} ${nivelInfo.text}`}
          title={`Carga: ${nivelInfo.label}`}
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <circle cx="4" cy="4" r="3" fill="currentColor" opacity="0.6" />
          </svg>
          {nivelInfo.label}
        </span>
      )
    }
  }

  if (badges.length === 0) return null

  return (
    <span className={`inline-flex items-center gap-1 flex-wrap ${className}`}>
      {badges}
    </span>
  )
}
