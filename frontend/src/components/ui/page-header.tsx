'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { useClubStore } from '@/stores/clubStore'
import { useEquipoStore } from '@/stores/equipoStore'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  breadcrumbs?: BreadcrumbItem[]
}

export function PageHeader({ title, description, actions, breadcrumbs }: PageHeaderProps) {
  const theme = useClubStore((s) => s.theme)
  const organizacion = useClubStore((s) => s.organizacion)
  const equipoActivo = useEquipoStore((s) => s.equipoActivo)

  return (
    <div className="mb-6">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3" />}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-foreground transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-foreground font-medium">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="hidden sm:flex w-12 h-12 rounded-xl items-center justify-center shadow-sm"
            style={{ backgroundColor: theme.colorPrimario }}
          >
            {theme.logoUrl ? (
              <Image src={theme.logoUrl} alt="" width={36} height={36} className="object-contain" unoptimized />
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
    </div>
  )
}
