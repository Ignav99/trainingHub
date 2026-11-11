'use client'

import Link from 'next/link'
import { Check, X } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { TeamCrest } from '@/components/ui/team-crest'
import { Localia } from '@/components/ui/localia'
import { cn } from '@/lib/utils'
import type { Partido } from '@/types'

interface PartidosListaCalProps {
  loading: boolean
  error?: Error | null
  allPartidos: Partido[]
  proximos: Partido[]
  jugados: Partido[]
  selectedId: string | null
  onSelectMatch: (id: string) => void
}

type PartidoConRival = Partido & { rival?: { nombre?: string; nombre_corto?: string; escudo_url?: string | null } }

function fechaCorta(fecha: string) {
  return new Date(fecha)
    .toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
    .replace(/[,.]/g, '')
}

export function localiaTexto(localia: Partido['localia']) {
  return localia === 'local' ? 'casa' : localia === 'visitante' ? 'fuera' : 'neutral'
}

/** Marca de forma y color del resultado, siempre con la letra escrita. */
function Resultado({ partido }: { partido: Partido }) {
  if (!partido.resultado) return null
  const marca =
    partido.resultado === 'victoria' ? (
      <span className="inline-flex items-center gap-1 text-success">
        <Check aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.5} />V
      </span>
    ) : partido.resultado === 'derrota' ? (
      <span className="inline-flex items-center gap-1 text-destructive">
        <X aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.5} />D
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <span aria-hidden="true" className="inline-block h-[0.6rem] w-[0.6rem] rounded-full border-2 border-muted-foreground" />E
      </span>
    )
  const nombre = { victoria: 'Victoria', empate: 'Empate', derrota: 'Derrota' }[partido.resultado]
  return (
    <span className="flex flex-none items-center gap-2 text-xs font-semibold" title={nombre}>
      <span className="tabular-nums text-sm text-foreground">
        {partido.goles_favor ?? '-'}-{partido.goles_contra ?? '-'}
      </span>
      <span className="w-7">
        {marca}
        <span className="sr-only"> {nombre}</span>
      </span>
    </span>
  )
}

function Fila({ p, selected, onSelect }: { p: PartidoConRival; selected: boolean; onSelect: (id: string) => void }) {
  const nombre = p.rival?.nombre || 'Rival'
  return (
    <button
      type="button"
      onClick={() => onSelect(p.id)}
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'relative flex h-11 w-full items-center gap-2 border-b border-border px-3 text-left text-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
        selected ? 'bg-sunken' : 'hover:bg-sunken'
      )}
    >
      {selected && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px] bg-primary" />}
      <span className="w-8 flex-none font-mono text-xs text-muted-foreground">{p.jornada ? `J${p.jornada}` : ''}</span>
      <span className="w-[3.25rem] flex-none whitespace-nowrap text-xs tabular-nums text-muted-foreground">
        {fechaCorta(p.fecha)}
      </span>
      <span className="flex h-6 w-6 flex-none items-center justify-center">
        {p.rival?.escudo_url && <TeamCrest src={p.rival.escudo_url} name={nombre} size="sm" />}
      </span>
      <span className="min-w-0 flex-1 truncate font-medium text-foreground">{nombre}</span>
      <Localia valor={p.localia} className="text-sm" />
      <Resultado partido={p} />
    </button>
  )
}

function Grupo({
  titulo,
  lista,
  selectedId,
  onSelect,
}: {
  titulo: string
  lista: Partido[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  if (lista.length === 0) return null
  return (
    <>
      <div className="flex items-center justify-between border-b border-border bg-sunken px-3 py-2">
        <h2 className="cal-rotulo text-muted-foreground">{titulo}</h2>
        <span className="text-xs tabular-nums text-muted-foreground">{lista.length}</span>
      </div>
      {lista.map((p) => (
        <Fila key={p.id} p={p} selected={selectedId === p.id} onSelect={onSelect} />
      ))}
    </>
  )
}

export function PartidosListaCal({
  loading,
  error,
  allPartidos,
  proximos,
  jugados,
  selectedId,
  onSelectMatch,
}: PartidosListaCalProps) {
  if (loading) {
    return (
      <div className="cal-linea bg-card" aria-busy="true">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-11 rounded-none border-b border-border" />
        ))}
      </div>
    )
  }
  if (error) {
    return (
      <div className="cal-linea bg-card p-3 text-sm">
        <p className="font-semibold text-foreground">No se pudieron cargar los partidos</p>
        <p className="mt-1 text-muted-foreground">No están borrados. Recarga la página.</p>
      </div>
    )
  }
  if (allPartidos.length === 0) {
    return (
      <div className="cal-linea bg-card flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
        <span className="text-muted-foreground">Sin partidos.</span>
        <Link href="/partidos/nuevo" className="inline-flex min-h-10 items-center font-semibold text-primary underline underline-offset-4">
          Añadir el primero
        </Link>
      </div>
    )
  }
  return (
    <div className="cal-linea bg-card overflow-hidden [&>*:last-child]:border-b-0">
      <Grupo titulo="Próximos" lista={proximos} selectedId={selectedId} onSelect={onSelectMatch} />
      <Grupo titulo="Jugados" lista={jugados} selectedId={selectedId} onSelect={onSelectMatch} />
    </div>
  )
}
