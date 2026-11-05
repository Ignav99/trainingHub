'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { Avatar } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { apiKey } from '@/lib/swr'
import type { StaffActividad } from '@/types'
import { fechaHora, hace, nombreVisible } from './tablero-utils'

export function ActivityFeed({ equipoId, meId, limite = 25 }: { equipoId: string; meId?: string; limite?: number }) {
  const { data, isLoading } = useSWR<{ data: StaffActividad[] }>(
    apiKey('/tablero/actividad', { equipo_id: equipoId, limit: limite }),
    { refreshInterval: 120_000 }
  )
  const entradas = data?.data ?? []

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    )
  }

  if (entradas.length === 0) {
    return <p className="text-xs text-muted-foreground">Sin actividad del staff en las dos últimas semanas.</p>
  }

  return (
    <ol className="relative space-y-3 before:absolute before:bottom-2 before:left-[13px] before:top-2 before:w-px before:bg-border">
      {entradas.map((e) => {
        const quien = e.usuario_id === meId ? 'Tú' : nombreVisible(e.usuario)
        const contenido = (
          <>
            <span className="font-medium text-foreground">{quien}</span> {e.usuario_id === meId ? e.texto.replace(/^ha /, 'has ') : e.texto}
            {e.titulo && (
              <>
                {' '}
                <span className="text-foreground">{e.entidad_tipo === 'staff_post' ? `«${e.titulo}»` : e.titulo}</span>
              </>
            )}
            {e.cambios > 1 && <span className="tabular-nums"> · {e.cambios} cambios</span>}
          </>
        )
        return (
          <li key={e.id} className="relative flex gap-2.5">
            <Avatar
              src={e.usuario?.avatar_url}
              fallback={(e.usuario?.nombre || '?')[0]}
              size="sm"
              className="relative h-7 w-7 shrink-0 text-[10px] ring-2 ring-background"
            />
            <div className="min-w-0 flex-1 text-xs leading-snug text-muted-foreground">
              {e.href ? (
                <Link href={e.href} className="line-clamp-2 hover:[&_span]:underline">
                  {contenido}
                </Link>
              ) : (
                <p className="line-clamp-2">{contenido}</p>
              )}
              <time className="mt-0.5 block text-[11px] tabular-nums" dateTime={e.created_at} title={fechaHora(e.created_at)}>
                {hace(e.created_at)}
              </time>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
