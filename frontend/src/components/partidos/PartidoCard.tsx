'use client'

import Image from 'next/image'
import { Calendar, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { Partido } from '@/types'

const RESULTADO_COLORS: Record<string, string> = {
  victoria: 'bg-emerald-100 text-emerald-800',
  empate: 'bg-amber-100 text-amber-800',
  derrota: 'bg-red-100 text-red-800',
}

interface PartidoCardProps {
  partido: Partido
  isSelected: boolean
  isNext?: boolean
  onSelect: (id: string) => void
}

export function PartidoCard({ partido, isSelected, isNext, onSelect }: PartidoCardProps) {
  return (
    <button
      onClick={() => onSelect(partido.id)}
      className={`w-full text-left p-3 rounded-lg border transition-colors ${
        isSelected
          ? 'border-primary bg-primary/5'
          : isNext
            ? 'border-primary/30 bg-primary/[0.02] hover:bg-primary/5'
            : 'border-transparent hover:bg-muted/50'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate flex items-center gap-1.5">
            {(partido as any).rival?.escudo_url && (
              <Image src={(partido as any).rival.escudo_url} alt="" width={16} height={16} className="object-contain shrink-0 inline" unoptimized />
            )}
            {partido.localia === 'local' ? 'vs' : '@'}{' '}
            {(partido as any).rival?.nombre || 'Rival'}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Calendar className="h-3 w-3" />
              {formatDate(partido.fecha)}
            </span>
            {partido.competicion && (
              <Badge variant="outline" className="text-[9px]">
                {partido.competicion}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {partido.resultado && (
            <Badge className={`text-[10px] ${RESULTADO_COLORS[partido.resultado] || ''}`}>
              {partido.goles_favor}-{partido.goles_contra}
            </Badge>
          )}
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </button>
  )
}
