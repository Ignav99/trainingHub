import { cn } from '@/lib/utils'
import type { RFEFClasificacionEquipo } from '@/lib/api/rfef'
import { SerieResultados } from './MarcaResultado'

const TH = 'cal-rotulo px-2 text-right font-semibold text-muted-foreground'
const TD = 'px-2 text-right tabular-nums'

export function ClasificacionTablaCal({ clasificacion, miEquipo }: { clasificacion: RFEFClasificacionEquipo[]; miEquipo: string }) {
  if (clasificacion.length === 0) {
    return (
      <div className="cal-linea bg-card p-4 text-sm text-muted-foreground">
        No hay datos de clasificación. Pulsa «Sync completo» para importar.
      </div>
    )
  }
  return (
    <div className="cal-linea bg-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="h-9 border-b border-border bg-sunken">
            <th scope="col" className={cn(TH, 'w-10 pl-4 text-left')}>#</th>
            <th scope="col" className={cn(TH, 'text-left')}>Equipo</th>
            <th scope="col" className={TH}>Pts</th>
            <th scope="col" className={TH}>PJ</th>
            <th scope="col" className={TH}>PG</th>
            <th scope="col" className={TH}>PE</th>
            <th scope="col" className={TH}>PP</th>
            <th scope="col" className={TH}>GF</th>
            <th scope="col" className={TH}>GC</th>
            <th scope="col" className={cn(TH, 'hidden pr-4 text-left sm:table-cell')}>Forma</th>
          </tr>
        </thead>
        <tbody>
          {clasificacion.map((e) => {
            const propio = miEquipo.toLowerCase() === e.equipo.toLowerCase()
            return (
              <tr
                key={e.equipo}
                className={cn(
                  'h-9 border-b border-border last:border-b-0 [@media(pointer:coarse)]:h-11',
                  propio ? 'bg-sunken' : 'hover:bg-sunken'
                )}
              >
                <td className="relative pl-4 pr-2 tabular-nums text-muted-foreground">
                  {propio && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px] bg-primary" />}
                  {e.posicion}
                </td>
                <td className={cn('px-2', propio ? 'font-bold text-foreground' : 'font-medium')}>{e.equipo}</td>
                <td className={cn(TD, 'font-bold')}>{e.puntos}</td>
                <td className={cn(TD, 'text-muted-foreground')}>{e.pj}</td>
                <td className={TD}>{e.pg}</td>
                <td className={TD}>{e.pe}</td>
                <td className={TD}>{e.pp}</td>
                <td className={TD}>{e.gf}</td>
                <td className={TD}>{e.gc}</td>
                <td className="hidden px-2 pr-4 sm:table-cell">
                  <SerieResultados serie={e.ultimos_5 || []} className="gap-1.5" />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
