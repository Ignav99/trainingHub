'use client'

import Link from 'next/link'
import { ExternalLink, FileText } from 'lucide-react'
import { RivalInformeTab } from '@/components/rivales/RivalInformeTab'
import type { Partido } from '@/types'

interface PartidoPlanRivalTabProps {
  partido: Partido
  equipoId?: string
}

export function PartidoPlanRivalTab({ partido, equipoId }: PartidoPlanRivalTabProps) {
  const rivalId = partido.rival_id
  const rivalNombre = partido.rival?.nombre

  if (!rivalId) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Este partido no tiene rival asignado. Edítalo para vincular la ficha.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          <span>
            {rivalNombre ? `Informe Rival · ${rivalNombre}` : 'Informe Rival'}
            {' — '}el mismo que en la ficha
          </span>
        </div>
        <Link
          href={`/rivales/${rivalId}?tab=informe`}
          className="text-[10px] text-blue-600 hover:underline inline-flex items-center gap-1"
        >
          Abrir ficha del rival
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
      <RivalInformeTab
        rivalId={rivalId}
        rivalNombre={rivalNombre}
        rivalEscudoUrl={partido.rival?.escudo_url}
        equipoId={equipoId}
      />
    </div>
  )
}
