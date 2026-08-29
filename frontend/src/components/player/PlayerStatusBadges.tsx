'use client'

import type { DisponibilidadOperativa, FaseTratamiento, NivelCarga } from '@/types'
import {
  DISPONIBILIDAD_COLORS,
  DISPONIBILIDAD_LABELS,
  FASE_TRATAMIENTO_COLORS,
  FASE_TRATAMIENTO_LABELS,
  faseFromDisponibilidad,
  resolveDisponibilidad,
} from '@/lib/jugadorTipo'

interface PlayerStatusBadgesProps {
  estado: string
  disponibilidad?: DisponibilidadOperativa | null
  faseTratamiento?: FaseTratamiento | string | null
  /** clinico: reposo/margen/inicio grupo. programa: disponible vs en tratamiento. */
  variante?: 'programa' | 'clinico'
  nivelCarga?: NivelCarga | null
  sancionado?: boolean
  apercibido?: boolean
  tarjetasAmarillas?: number
  tarjetasRojas?: number
  className?: string
}

const ESTADO_BADGES: Record<string, { label: string; className: string } | undefined> = {
  lesionado: { label: 'En tratamiento', className: 'bg-red-100 text-red-700 border-red-200' },
  en_recuperacion: { label: 'En tratamiento', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  sancionado: { label: 'Sancionado', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  enfermo: { label: 'En tratamiento', className: 'bg-orange-100 text-orange-700 border-orange-200' },
}

const NIVEL_COLORS: Record<string, { bg: string; text: string; label: string } | undefined> = {
  critico: { bg: 'bg-red-100', text: 'text-red-700', label: 'Critico' },
  alto: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Alto' },
  optimo: { bg: 'bg-green-100', text: 'text-green-700', label: 'Optimo' },
  bajo: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Bajo' },
}

export function PlayerStatusBadges({
  estado,
  disponibilidad,
  faseTratamiento,
  variante = 'programa',
  nivelCarga,
  sancionado,
  apercibido,
  tarjetasAmarillas,
  tarjetasRojas,
  className = '',
}: PlayerStatusBadgesProps) {
  const badges: JSX.Element[] = []

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

  const disp = resolveDisponibilidad({ estado: estado as any, disponibilidad: disponibilidad ?? undefined })
  if (variante === 'clinico' && disp !== 'pleno') {
    const fase = faseTratamiento || faseFromDisponibilidad(disp)
    badges.push(
      <span
        key="fase"
        className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${FASE_TRATAMIENTO_COLORS[fase] || DISPONIBILIDAD_COLORS[disp]}`}
      >
        {FASE_TRATAMIENTO_LABELS[fase] || DISPONIBILIDAD_LABELS[disp]}
      </span>
    )
  } else if (variante === 'programa' && !estadoBadge && disp !== 'pleno') {
    badges.push(
      <span
        key="disp"
        className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border bg-red-100 text-red-700 border-red-200"
      >
        En tratamiento
      </span>
    )
  }

  if (apercibido && estado !== 'sancionado') {
    badges.push(
      <span
        key="apercibido"
        className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border bg-amber-50 text-amber-800 border-amber-200"
      >
        Apercibido
      </span>
    )
  }

  if (sancionado && estado !== 'sancionado') {
    badges.push(
      <span
        key="sancion"
        className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border bg-yellow-100 text-yellow-700 border-yellow-200"
      >
        Sanción
      </span>
    )
  }

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
