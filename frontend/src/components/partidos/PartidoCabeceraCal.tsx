'use client'

import Link from 'next/link'
import { Pencil, Trash2, Watch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Localia } from '@/components/ui/localia'
import { TeamCrest } from '@/components/ui/team-crest'
import type { Partido } from '@/types'

interface PartidoCabeceraCalProps {
  partido: Partido
  esAmistoso?: boolean
  onEdit: () => void
  onDelete: () => void
}

/** Cabecera del partido elegido en Cal: datos a la izquierda, acciones a la derecha. */
export function PartidoCabeceraCal({ partido, esAmistoso, onEdit, onDelete }: PartidoCabeceraCalProps) {
  const rival = (partido as Partido & { rival?: { nombre?: string; escudo_url?: string | null } }).rival
  const nombre = rival?.nombre || 'Rival'
  const fecha = new Date(partido.fecha).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const jugado = partido.goles_favor != null && partido.goles_contra != null
  const rotulo = [partido.competicion, partido.jornada ? `Jornada ${partido.jornada}` : null].filter(Boolean).join(' · ')

  return (
    <section className="cal-linea bg-card mb-4 grid grid-cols-1 lg:grid-cols-carriles" aria-label="Partido">
      <div className="min-w-0 p-4 sm:p-5 lg:col-span-3">
        {rotulo && <p className="cal-rotulo text-muted-foreground">{rotulo}</p>}
        <div className="mt-2 flex items-center justify-between gap-4">
          <h2 className="cal-titulo flex min-w-0 items-center gap-2 text-2xl text-foreground sm:text-3xl">
            {rival?.escudo_url && <TeamCrest src={rival.escudo_url} name={nombre} size="md" />}
            <span className="min-w-0 truncate">{nombre}</span>
            <Localia valor={partido.localia} conTexto className="text-sm font-semibold" />
          </h2>
          {jugado && (
            <p className="cal-titulo flex-none text-3xl tabular-nums text-foreground sm:text-4xl" aria-label="Marcador">
              {partido.goles_favor}-{partido.goles_contra}
            </p>
          )}
        </div>
        <p className="mt-2 text-sm tabular-nums text-foreground">
          <span className="first-letter:uppercase">{fecha}</span>
          {partido.hora && <span>, {partido.hora}</span>}
        </p>
        {esAmistoso && (
          <p className="mt-2 text-xs text-muted-foreground">
            No cuenta para resultados ni estadísticas de competición. Sí se pueden consultar minutos y lo ocurrido.
          </p>
        )}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2 border-t border-border p-4 sm:p-5 lg:col-span-2 lg:justify-end lg:border-l lg:border-t-0">
        <Button asChild className="min-h-10">
          <Link href={`/anotador/${partido.id}`} className="inline-flex items-center">
            <Watch className="mr-2 h-4 w-4" />
            Anotar en campo
          </Link>
        </Button>
        <Button variant="outline" size="icon" className="h-10 w-10" onClick={onEdit} aria-label="Editar partido">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 text-destructive"
          onClick={onDelete}
          aria-label="Borrar partido"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </section>
  )
}
