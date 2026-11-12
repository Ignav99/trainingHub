'use client'

import { useRouter } from 'next/navigation'
import { format, parseISO, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { Estado } from '@/components/ui/estado'
import { continueHref } from '@/lib/sesionBorrador'
import { RivalSemana, usePartidosDeSesiones } from './RivalSemana'
import { estadoDe, MD_COLOR, MenuFila, safe, type Props, type Semana } from './SesionesTablaCal'

/** Lista continua de sesiones para Cal por debajo de lg: dos líneas por sesión, agrupada por semana. */
export function SesionesListaCal({ sesiones, activeMenu, setActiveMenu, onWarm, onPdf, onRpe, onDelete }: Props) {
  const router = useRouter()
  const partidos = usePartidosDeSesiones(sesiones)
  const hoy = format(new Date(), 'yyyy-MM-dd')

  const semanas: Semana[] = []
  const porClave = new Map<string, Semana>()
  for (const s of sesiones) {
    const inicio = safe(() => startOfWeek(parseISO(s.fecha), { weekStartsOn: 1 }), null as Date | null)
    const clave = inicio ? format(inicio, 'yyyy-MM-dd') : 'sin-fecha'
    let g = porClave.get(clave)
    if (!g) {
      g = { clave, inicio, sesiones: [] }
      porClave.set(clave, g)
      semanas.push(g)
    }
    g.sesiones.push(s)
  }

  return (
    <div className="cal-linea bg-card">
      {semanas.map((g) => {
        const minutos = g.sesiones.reduce((acc, s) => acc + (s.duracion_total || 0), 0)
        const rival = g.sesiones.find((s) => s.rival)?.rival
        const rotulo = g.inicio ? `Semana del ${format(g.inicio, 'd MMM', { locale: es })}` : 'Sin fecha'
        return (
          <section key={g.clave} aria-label={rotulo}>
            <div className="flex h-9 items-center justify-between gap-3 border-b border-border bg-sunken px-3">
              <span className="cal-rotulo">{rotulo}</span>
              <span className="flex min-w-0 items-center gap-3 text-xs text-muted-foreground">
                <RivalSemana inicio={g.inicio} rival={rival} partidos={partidos} />
                <span className="flex-none tabular-nums">{minutos} min</span>
              </span>
            </div>
            <ul>
              {g.sesiones.map((s) => {
                const est = estadoDe(s)
                const href = continueHref(s.id, s.fase_notas, s.estado)
                const esHoy = s.fecha?.slice(0, 10) === hoy
                const dia = safe(() => format(parseISO(s.fecha), 'EEE d', { locale: es }), s.fecha)
                return (
                  <li
                    key={s.id}
                    tabIndex={0}
                    onClick={() => router.push(href)}
                    onKeyDown={(e) => {
                      if (e.target === e.currentTarget && e.key === 'Enter') router.push(href)
                    }}
                    onPointerEnter={() => onWarm(s)}
                    title={est.title}
                    className={`relative flex min-h-14 cursor-pointer items-center gap-2 border-b border-border py-2 pl-3 pr-1 last:border-b-0 ${s.estado === 'completada' ? 'bg-success/[0.16] hover:bg-success/[0.26] focus-visible:bg-success/[0.26]' : 'hover:bg-sunken focus-visible:bg-sunken'}${s.estado === 'cancelada' ? ' text-muted-foreground' : ''} focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary`}
                  >
                    {esHoy && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px] bg-primary" />}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-2 font-mono text-xs tabular-nums">
                          <span>{dia}</span>
                          {esHoy && <span className="sr-only">(hoy)</span>}
                          <span
                            aria-hidden="true"
                            className={`inline-block h-2 w-2 flex-none ${MD_COLOR[s.match_day] || 'bg-muted-foreground'}`}
                          />
                          <span>{s.match_day}</span>
                        </span>
                        <span className="flex-none font-mono text-xs tabular-nums text-muted-foreground">
                          {s.duracion_total ? `${s.duracion_total} min` : '–'}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate font-medium">{s.titulo}</span>
                        <Estado tipo={est.tipo} className="flex-none text-xs">
                          {est.texto}
                        </Estado>
                      </div>
                    </div>
                    <MenuFila
                      sesion={s}
                      abierto={activeMenu === s.id}
                      setActiveMenu={setActiveMenu}
                      onPdf={onPdf}
                      onRpe={onRpe}
                      onDelete={onDelete}
                    />
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
