'use client'

import useSWR from 'swr'
import { Estado } from '@/components/ui/estado'
import { Spinner } from '@/components/ui/spinner'
import { rfefApi } from '@/lib/api/rfef'
import { apiKey } from '@/lib/swr'
import { cn } from '@/lib/utils'
import type { PreMatchTarjetas } from '@/types'

const TH = 'cal-rotulo px-3 text-right font-semibold text-muted-foreground'
const TD = 'px-3 text-right tabular-nums'

/** Tarjetas acumuladas de mi equipo en Cal: tabla densa; el estado va escrito con su forma. */
export function TarjetasEquipoCal({ competicionId }: { competicionId: string }) {
  const { data, error, isLoading } = useSWR<PreMatchTarjetas>(
    competicionId ? apiKey(`/rfef/competiciones/${competicionId}/mi-equipo/tarjetas`) : null,
    () => rfefApi.getMiEquipoTarjetas(competicionId),
  )

  if (isLoading) {
    return (
      <div className="cal-linea bg-card flex min-h-[120px] items-center justify-center">
        <Spinner />
      </div>
    )
  }
  if (error || !data) return null

  const jugadores = data.jugadores || []
  const sinDatos = data.jornadas_sin_datos || []

  return (
    <section className="space-y-3" aria-label="Tarjetas de mi equipo">
      <p className="text-sm tabular-nums text-muted-foreground">
        {data.actas_con_tarjetas ?? data.total_actas} de {data.total_actas} actas
        {sinDatos.length > 0 && ` · sin datos en jornada${sinDatos.length > 1 ? 's' : ''} ${sinDatos.join(', ')}`}
      </p>
      {jugadores.length === 0 ? (
        <div className="cal-linea bg-card p-4 text-sm text-muted-foreground">Sin tarjetas registradas.</div>
      ) : (
        <div className="cal-linea bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="h-9 border-b border-border bg-sunken">
                <th scope="col" className={cn(TH, 'text-left')}>Jugador</th>
                <th scope="col" className={TH}>Ciclo</th>
                <th scope="col" className={TH}>Amarillas</th>
                <th scope="col" className={TH}>Rojas</th>
                <th scope="col" className={cn(TH, 'text-left')}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {jugadores.map((j, i) => {
                const nombre = j.apodo || j.nombre.split(',').reverse().join(' ').trim()
                const sancionado = j.estado === 'Sancionado'
                const apercibido = !sancionado && (j.estado === 'Apercibido' || j.amarillas % 5 === 4)
                return (
                  <tr
                    key={j.jugador_id || i}
                    className="h-9 border-b border-border last:border-b-0 hover:bg-sunken [@media(pointer:coarse)]:h-11"
                  >
                    <td className="px-3">
                      <span className="inline-block w-6 text-right tabular-nums text-muted-foreground">{j.dorsal ?? '–'}</span>
                      <span className="ml-3 font-medium">{nombre}</span>
                      {j.posicion_principal && (
                        <span className="ml-2 font-mono text-xs text-muted-foreground">{j.posicion_principal}</span>
                      )}
                    </td>
                    <td className={cn(TD, 'text-muted-foreground')}>
                      {j.amarillas_ciclo != null ? `${j.amarillas_ciclo}/5` : '–'}
                    </td>
                    <td className={TD}>{j.amarillas || '–'}</td>
                    <td className={TD}>{j.rojas || '–'}</td>
                    <td className="px-3">
                      {sancionado ? (
                        <Estado tipo="sancionado">
                          sancionado
                          {j.sancionado_restantes && j.sancionado_restantes > 1 ? ` (${j.sancionado_restantes})` : ''}
                        </Estado>
                      ) : apercibido ? (
                        <Estado tipo="apercibido">apercibido</Estado>
                      ) : (
                        <span className="text-muted-foreground">–</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
