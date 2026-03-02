'use client'

import { useClubStore } from '@/stores/clubStore'
import { useEquipoStore } from '@/stores/equipoStore'
import { ClubAvatar } from '@/components/ui/avatar'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  const theme = useClubStore((s) => s.theme)
  const organizacion = useClubStore((s) => s.organizacion)
  const equipoActivo = useEquipoStore((s) => s.equipoActivo)

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div className="flex items-center gap-4">
        <div
          className="hidden sm:flex w-12 h-12 rounded-xl items-center justify-center shadow-sm"
          style={{ backgroundColor: theme.colorPrimario }}
        >
          {theme.logoUrl ? (
            <img src={theme.logoUrl} alt="" className="w-9 h-9 object-contain" />
          ) : (
            <span className="text-white font-bold text-lg">
              {(organizacion?.nombre || 'T')[0]}
            </span>
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description ? (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          ) : equipoActivo ? (
            <p className="text-sm text-muted-foreground mt-0.5">
              {equipoActivo.nombre}
              {equipoActivo.temporada && <span className="ml-1">· {equipoActivo.temporada}</span>}
            </p>
          ) : null}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  )
}
