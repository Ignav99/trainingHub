import { cn } from '@/lib/utils'
import { Estado } from '@/components/ui/estado'
import type { RFEFSancion } from '@/lib/api/rfef'

const TH = 'cal-rotulo px-3 text-left font-semibold text-muted-foreground'
const CATEGORIA: Record<string, string> = {
  jugador: 'Jugadores',
  tecnico: 'Técnicos y cuerpo técnico',
  equipo: 'Equipos',
}

function esSuspension(desc: string) {
  const d = desc.toLowerCase()
  return d.includes('partido') && d.includes('suspensi')
}

/** Sanciones del comité en Cal: una tabla plana por jornada, sin pastillas de color. */
export function SancionesTablaCal({ sanciones, miEquipo }: { sanciones: RFEFSancion[]; miEquipo: string }) {
  const porJornada = sanciones.reduce<Record<number, RFEFSancion[]>>((acc, s) => {
    ;(acc[s.jornada_numero] ||= []).push(s)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {Object.keys(porJornada)
        .sort((a, b) => Number(b) - Number(a))
        .map((j) => {
          const items = porJornada[Number(j)]
          return (
            <section key={j} className="cal-linea bg-card overflow-x-auto">
              <div className="flex h-9 items-center justify-between border-b border-border bg-sunken px-3">
                <h3 className="cal-rotulo font-semibold text-muted-foreground">Jornada {j}</h3>
                {items[0]?.jornada_fecha && (
                  <span className="text-xs tabular-nums text-muted-foreground">{items[0].jornada_fecha}</span>
                )}
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="h-9 border-b border-border">
                    <th scope="col" className={TH}>Categoría</th>
                    <th scope="col" className={TH}>Equipo y persona</th>
                    <th scope="col" className={cn(TH, 'hidden sm:table-cell')}>Art.</th>
                    <th scope="col" className={TH}>Sanción</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((s, i) => {
                    const propio = !!miEquipo && s.equipo_nombre.toLowerCase().includes(miEquipo.toLowerCase())
                    return (
                      <tr
                        key={i}
                        className={cn(
                          'h-9 border-b border-border align-middle last:border-b-0 [@media(pointer:coarse)]:h-11',
                          propio ? 'bg-sunken' : 'hover:bg-sunken',
                        )}
                      >
                        <td className="px-3 text-muted-foreground">{CATEGORIA[s.categoria] || s.categoria}</td>
                        <td className={cn('px-3', propio ? 'font-bold' : 'font-medium')}>
                          {s.equipo_nombre}
                          {s.persona_nombre && (
                            <span className="font-normal text-muted-foreground"> · {s.persona_nombre}</span>
                          )}
                        </td>
                        <td className="hidden px-3 tabular-nums text-muted-foreground sm:table-cell">{s.articulo || '–'}</td>
                        <td className="px-3 py-1">
                          {esSuspension(s.descripcion) ? (
                            <Estado tipo="sancionado">{s.descripcion}</Estado>
                          ) : (
                            s.descripcion
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </section>
          )
        })}
    </div>
  )
}
