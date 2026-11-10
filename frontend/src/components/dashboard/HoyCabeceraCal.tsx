'use client'

import Link from 'next/link'
import { Estado } from '@/components/ui/estado'
import type { DashboardResumen, DashboardPlantilla } from '@/lib/api/dashboard'

interface HoyCabeceraCalProps {
  proximoPartido: DashboardResumen['proximo_partido'] | undefined
  ligaPosition: { posicion: number; puntos: number } | null
  plantilla: DashboardPlantilla | undefined
  loading: boolean
  onShowDisponibilidad: () => void
}

/** Cabecera de Hoy en Cal: próximo partido a la izquierda, disponibilidad a la derecha. */
export function HoyCabeceraCal({
  proximoPartido,
  ligaPosition,
  plantilla,
  loading,
  onShowDisponibilidad,
}: HoyCabeceraCalProps) {
  const rival = proximoPartido?.rival?.nombre_corto || proximoPartido?.rival?.nombre || 'Rival'
  const fecha = proximoPartido
    ? new Date(proximoPartido.fecha).toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : null

  const cifras = plantilla && !loading
    ? [
        { tipo: 'disponible' as const, valor: plantilla.disponibles, rotulo: 'Disponibles' },
        {
          tipo: 'duda' as const,
          valor: (plantilla.lesionados || 0) + (plantilla.en_recuperacion || 0),
          rotulo: 'En tratamiento',
        },
        { tipo: 'baja' as const, valor: plantilla.sancionados, rotulo: 'Sancionados' },
      ]
    : null

  return (
    <section className="cal-linea bg-card grid grid-cols-1 lg:grid-cols-carriles" aria-label="Resumen de hoy">
      <div className="min-w-0 p-4 sm:p-5 lg:col-span-3">
        <p className="cal-rotulo text-muted-foreground">Próximo partido</p>
        {proximoPartido ? (
          <>
            <h1 className="cal-titulo mt-2 text-2xl sm:text-3xl text-foreground">
              {rival}{' '}
              <span className="text-muted-foreground font-semibold">
                {proximoPartido.localia === 'local' ? 'en casa' : 'fuera'}
              </span>
            </h1>
            <p className="mt-2 text-sm tabular-nums text-foreground">
              <span className="first-letter:uppercase">{fecha}</span>
              {proximoPartido.hora && <span>, {proximoPartido.hora}</span>}
              {proximoPartido.jornada && <span className="text-muted-foreground"> · Jornada {proximoPartido.jornada}</span>}
            </p>
          </>
        ) : (
          <h1 className="cal-titulo mt-2 text-2xl sm:text-3xl text-foreground">Sin partido programado</h1>
        )}
        {ligaPosition && (
          <p className="mt-3 text-sm tabular-nums text-muted-foreground">
            <Link href="/estadisticas/competicion" className="underline underline-offset-4 hover:text-foreground">
              {ligaPosition.posicion}º · {ligaPosition.puntos} pts
            </Link>
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onShowDisponibilidad}
        disabled={!cifras}
        aria-label="Ver disponibilidad de la plantilla"
        className="k-btn min-w-0 border-t border-border p-4 text-left hover:bg-sunken sm:p-5 lg:col-span-2 lg:border-l lg:border-t-0"
      >
        <p className="cal-rotulo text-muted-foreground">Disponibilidad</p>
        <div className="mt-2 grid grid-cols-3 gap-3">
          {(cifras ?? [
            { tipo: 'neutro' as const, valor: '–', rotulo: 'Disponibles' },
            { tipo: 'neutro' as const, valor: '–', rotulo: 'En tratamiento' },
            { tipo: 'neutro' as const, valor: '–', rotulo: 'Sancionados' },
          ]).map((c) => (
            <div key={c.rotulo} className="min-w-0">
              <Estado tipo={c.tipo} className="cal-titulo text-3xl tabular-nums text-foreground">
                {c.valor}
              </Estado>
              <p className="mt-1 truncate text-xs text-muted-foreground">{c.rotulo}</p>
            </div>
          ))}
        </div>
      </button>
    </section>
  )
}
