'use client'

import Link from 'next/link'
import { Estado } from '@/components/ui/estado'
import { Localia } from '@/components/ui/localia'
import { TeamCrest } from '@/components/ui/team-crest'
import type { DashboardResumen, DashboardPlantilla } from '@/lib/api/dashboard'

interface HoyCabeceraCalProps {
  proximoPartido: DashboardResumen['proximo_partido'] | undefined
  ligaPosition: { posicion: number; puntos: number } | null
  plantilla: DashboardPlantilla | undefined
  loading: boolean
  onShowDisponibilidad: () => void
}

function cuentaAtras(fecha: string) {
  const hoy = new Date()
  const a = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  const [y, m, d] = fecha.slice(0, 10).split('-').map(Number)
  const dias = Math.round((Date.UTC(y, m - 1, d) - a) / 86_400_000)
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Mañana'
  return dias > 1 ? `En ${dias} días` : null
}

/** Cabecera de Hoy en Cal: una sola banda compacta con el próximo partido y la disponibilidad. */
export function HoyCabeceraCal({
  proximoPartido,
  ligaPosition,
  plantilla,
  loading,
  onShowDisponibilidad,
}: HoyCabeceraCalProps) {
  const rival = proximoPartido?.rival?.nombre_corto || proximoPartido?.rival?.nombre || 'Rival'
  const fecha = proximoPartido
    ? new Date(proximoPartido.fecha).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
    : null
  const cuenta = proximoPartido ? cuentaAtras(proximoPartido.fecha) : null

  const cifras = plantilla && !loading
    ? [
        { tipo: 'disponible' as const, valor: plantilla.disponibles, rotulo: 'Disponibles' },
        { tipo: 'tratamiento' as const, valor: (plantilla.lesionados || 0) + (plantilla.en_recuperacion || 0), rotulo: 'En tratamiento' },
        { tipo: 'sancionado' as const, valor: plantilla.sancionados, rotulo: 'Sancionados' },
      ]
    : null

  return (
    <section
      className="cal-linea bg-card flex shrink-0 flex-col lg:min-h-14 lg:flex-row lg:items-stretch"
      aria-label="Resumen de hoy"
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
        <span className="cal-rotulo text-muted-foreground">Próximo</span>
        {proximoPartido ? (
          <>
            <TeamCrest src={proximoPartido.rival?.escudo_url} name={rival} size="sm" />
            <h1 className="cal-titulo min-w-0 truncate text-lg text-foreground">{rival}</h1>
            <Localia valor={proximoPartido.localia} conTexto className="text-sm font-semibold" />
            <span className="text-sm tabular-nums text-foreground">
              <span className="first-letter:uppercase">{fecha}</span>
              {proximoPartido.hora && <span>, {proximoPartido.hora}</span>}
            </span>
            {cuenta && <span className="text-sm font-semibold tabular-nums text-foreground">{cuenta}</span>}
            {proximoPartido.jornada && (
              <span className="text-xs tabular-nums text-muted-foreground">J{proximoPartido.jornada}</span>
            )}
          </>
        ) : (
          <h1 className="cal-titulo text-lg text-foreground">Sin partido programado</h1>
        )}
        {ligaPosition && (
          <Link
            href="/estadisticas/competicion"
            className="text-xs tabular-nums text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            {ligaPosition.posicion}º · {ligaPosition.puntos} pts
          </Link>
        )}
      </div>

      <button
        type="button"
        onClick={onShowDisponibilidad}
        disabled={!cifras}
        aria-label="Ver disponibilidad de la plantilla"
        className="k-btn flex min-w-0 flex-none items-center gap-4 border-t border-border px-3 py-2 text-left hover:bg-sunken lg:border-l lg:border-t-0"
      >
        {(cifras ?? [
          { tipo: 'neutro' as const, valor: '–', rotulo: 'Disponibles' },
          { tipo: 'neutro' as const, valor: '–', rotulo: 'En tratamiento' },
          { tipo: 'neutro' as const, valor: '–', rotulo: 'Sancionados' },
        ]).map((c) => (
          <span key={c.rotulo} className="flex min-w-0 items-center gap-1.5">
            <Estado tipo={c.tipo} className="cal-titulo text-lg tabular-nums text-foreground">
              {c.valor}
            </Estado>
            <span className="truncate text-xs text-muted-foreground">{c.rotulo}</span>
          </span>
        ))}
      </button>
    </section>
  )
}
