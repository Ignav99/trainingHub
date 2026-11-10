'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Edit3, Trash2 } from 'lucide-react'
import { Estado } from '@/components/ui/estado'
import { Skeleton } from '@/components/ui/skeleton'
import { TeamCrest } from '@/components/ui/team-crest'
import type { Rival } from '@/types'

const TH = 'cal-rotulo px-2 text-left font-semibold text-muted-foreground'

function tieneInforme(r: Rival) {
  const s = r.scout_manual
  if (!s) return false
  return Boolean(
    s.sistema?.trim() ||
      s.anotaciones?.trim() ||
      s.fortalezas?.length ||
      s.debilidades?.length ||
      s.fases?.length ||
      s.clips?.length ||
      s.estrategia
  )
}

export function RivalesTablaSkeletonCal() {
  return (
    <div className="cal-linea bg-card" aria-busy="true">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex h-9 items-center gap-3 border-b border-border px-3 last:border-b-0 [@media(pointer:coarse)]:h-11">
          <Skeleton className="h-6 w-6 flex-none rounded-[2px]" />
          <Skeleton className="h-3 w-40 rounded-[2px]" />
          <Skeleton className="ml-auto h-3 w-24 rounded-[2px]" />
        </div>
      ))}
    </div>
  )
}

interface Props {
  rivales: Rival[]
  onEdit: (r: Rival) => void
  onDelete: (id: string) => void
}

export function RivalesTablaCal({ rivales, onEdit, onDelete }: Props) {
  const router = useRouter()
  return (
    <div className="cal-linea bg-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="h-9 border-b border-border bg-sunken">
            <th scope="col" className={`${TH} pl-3`}>Rival</th>
            <th scope="col" className={`${TH} hidden md:table-cell`}>Ciudad</th>
            <th scope="col" className={`${TH} hidden lg:table-cell`}>Estadio</th>
            <th scope="col" className={`${TH} hidden md:table-cell`}>Sistema</th>
            <th scope="col" className={TH}>Informe</th>
            <th scope="col" className="w-24 px-2"><span className="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          {rivales.map((r) => {
            const informe = tieneInforme(r)
            const sistema = r.sistema_juego || r.scout_manual?.sistema || r.estilo
            return (
              <tr
                key={r.id}
                onClick={() => router.push(`/rivales/${r.id}`)}
                className="h-9 cursor-pointer border-b border-border last:border-b-0 hover:bg-sunken [@media(pointer:coarse)]:h-11"
              >
                <td className="pl-3 pr-2">
                  <Link
                    href={`/rivales/${r.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex min-w-0 items-center gap-2 font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex h-6 w-6 flex-none items-center justify-center">
                      <TeamCrest src={r.escudo_url} name={r.nombre} size="sm" />
                    </span>
                    <span className="truncate">{r.nombre}</span>
                    {r.nombre_corto && <span className="hidden text-xs font-normal text-muted-foreground sm:inline">{r.nombre_corto}</span>}
                  </Link>
                </td>
                <td className="hidden px-2 text-muted-foreground md:table-cell">{r.ciudad || '-'}</td>
                <td className="hidden px-2 text-muted-foreground lg:table-cell">{r.estadio || '-'}</td>
                <td className="hidden px-2 tabular-nums text-muted-foreground md:table-cell">{sistema || '-'}</td>
                <td className="whitespace-nowrap px-2">
                  {informe ? <Estado tipo="disponible">Con informe</Estado> : <span className="text-muted-foreground">Sin informe</span>}
                </td>
                <td className="px-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => onEdit(r)}
                      aria-label={`Editar ${r.nombre}`}
                      className="inline-flex h-9 w-9 items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Edit3 aria-hidden="true" className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(r.id)}
                      aria-label={`Eliminar ${r.nombre}`}
                      className="inline-flex h-9 w-9 items-center justify-center text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
