'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Clock, FileEdit, Moon, X } from 'lucide-react'
import { useAppearance } from '@/lib/useAppearance'
import { apiKey } from '@/lib/swr'
import { useEquipoStore } from '@/stores/equipoStore'
import { semanaMD, type PartidoSemana } from '@/lib/semanaMD'
import { cn } from '@/lib/utils'
import { Localia } from '@/components/ui/localia'
import {
  colorDia,
  esClaveMD,
  etiquetaMicrociclo,
  MD_NOMBRE,
  numeroSesion,
  partidoJugado,
  resultadoPartido,
  solido,
  tinte,
  todasCompletadas,
} from '@/lib/calendarioColores'
import type { Descanso, Microciclo, PaginatedResponse, Partido, Sesion } from '@/types'

function fechaLocal(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function desplazar(fecha: string, dias: number) {
  const t = new Date(fecha + 'T12:00:00Z').getTime() + dias * 86_400_000
  return new Date(t).toISOString().slice(0, 10)
}

const ESTADO_SESION: Record<string, { texto: string; Icono: typeof Check }> = {
  completada: { texto: 'completada', Icono: Check },
  planificada: { texto: 'planificada', Icono: Clock },
  borrador: { texto: 'borrador', Icono: FileEdit },
  cancelada: { texto: 'cancelada', Icono: X },
}

/** Elemento integrado en el día: sin caja propia, el día ya lleva barra y relleno. */
const ITEM =
  'inline-flex min-w-0 max-w-full items-center gap-1 rounded-[var(--radius)] text-[11px] leading-[18px] text-foreground hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring'

function estadoDe(s: Sesion) {
  return ESTADO_SESION[s.estado] ?? { texto: String(s.estado), Icono: Clock }
}

/** Menú pequeño anclado al botón; va en un portal para que el scroll horizontal de la tira no lo recorte. */
function ListaSesiones({
  ancla,
  sesiones,
  titulo,
  onClose,
}: {
  ancla: DOMRect
  sesiones: Sesion[]
  titulo: string
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const ancho = 256
  const left = Math.max(8, Math.min(ancla.left, window.innerWidth - ancho - 8))

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('a')?.focus()
    const alClicFuera = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    const alTecla = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('mousedown', alClicFuera)
    document.addEventListener('keydown', alTecla)
    window.addEventListener('resize', onClose)
    window.addEventListener('scroll', onClose, true)
    return () => {
      document.removeEventListener('mousedown', alClicFuera)
      document.removeEventListener('keydown', alTecla)
      window.removeEventListener('resize', onClose)
      window.removeEventListener('scroll', onClose, true)
    }
  }, [onClose])

  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label={titulo}
      className="fixed z-[60] w-64 rounded-[var(--radius)] border border-line bg-card p-1 text-sm text-foreground"
      style={{ top: ancla.bottom + 4, left }}
    >
      <p className="cal-rotulo px-2 py-1 text-muted-foreground">{titulo}</p>
      {sesiones.map((s) => {
        const e = estadoDe(s)
        return (
          <Link
            key={s.id}
            href={`/sesiones/${s.id}`}
            role="menuitem"
            onClick={onClose}
            className="flex items-center gap-2 px-2 py-1.5 hover:bg-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
          >
            <e.Icono aria-hidden className="h-3.5 w-3.5 flex-none text-muted-foreground" />
            <span className={cn('min-w-0 flex-1 truncate', s.estado === 'cancelada' && 'text-muted-foreground line-through')}>
              {numeroSesion(s) && <span className="font-mono font-bold tabular-nums">{numeroSesion(s)} · </span>}
              {s.titulo}
            </span>
            <span className="flex-none text-xs text-muted-foreground">
              {s.hora ? `${s.hora.slice(0, 5)} · ` : ''}
              {e.texto}
            </span>
          </Link>
        )
      })}
    </div>,
    document.body
  )
}

export function SemanaTira() {
  const equipoId = useEquipoStore((s) => s.equipoActivo?.id)
  // La tira solo se ve en Cal: con otro aspecto no se piden datos.
  const enCal = useAppearance() === 'cal'
  const hoy = fechaLocal(new Date())
  const base = useMemo(() => semanaMD(hoy, []), [hoy])
  const lunes = base[0].fecha
  const domingo = base[6].fecha
  const desde = desplazar(lunes, -7)
  const hasta = desplazar(domingo, 7)

  const { data } = useSWR<PaginatedResponse<Partido>>(
    enCal
      ? apiKey(
          '/partidos',
          { equipo_id: equipoId, fecha_desde: desde, fecha_hasta: hasta, orden: 'fecha', direccion: 'asc', limit: 50 },
          ['equipo_id']
        )
      : null
  )
  const { data: sesData } = useSWR<PaginatedResponse<Sesion>>(
    enCal
      ? apiKey('/sesiones', { equipo_id: equipoId, fecha_desde: lunes, fecha_hasta: domingo, limit: 100 }, ['equipo_id'])
      : null
  )
  const { data: microData } = useSWR<PaginatedResponse<Microciclo>>(
    enCal
      ? apiKey('/microciclos', { equipo_id: equipoId, fecha_desde: lunes, fecha_hasta: domingo, limit: 10 }, ['equipo_id'])
      : null
  )

  const { data: descData } = useSWR<{ data: Descanso[] }>(
    enCal ? apiKey('/descansos', { equipo_id: equipoId, fecha_desde: lunes, fecha_hasta: domingo }, ['equipo_id']) : null
  )
  const descansos = useMemo(
    () => new Set((descData?.data ?? []).map((d) => String(d.fecha).slice(0, 10))),
    [descData]
  )

  const partidosRaw = data?.data
  const partidos: PartidoSemana[] = useMemo(
    () =>
      (partidosRaw ?? []).map((p) => ({
        id: p.id,
        fecha: String(p.fecha).slice(0, 10),
        rival: p.rival?.nombre_corto || p.rival?.nombre,
      })),
    [partidosRaw]
  )
  const partidoPorId = useMemo(() => {
    const m = new Map<string, Partido>()
    for (const p of partidosRaw ?? []) m.set(p.id, p)
    return m
  }, [partidosRaw])
  const dias = useMemo(() => semanaMD(hoy, partidos), [hoy, partidos])

  const sesionesPorDia = useMemo(() => {
    const m = new Map<string, Sesion[]>()
    for (const s of sesData?.data ?? []) {
      const f = String(s.fecha).slice(0, 10)
      m.set(f, [...(m.get(f) ?? []), s])
    }
    return m
  }, [sesData])

  const micro = useMemo(
    () =>
      (microData?.data ?? []).find(
        (m) => String(m.fecha_inicio).slice(0, 10) <= domingo && String(m.fecha_fin).slice(0, 10) >= lunes
      ),
    [microData, lunes, domingo]
  )

  const [abierto, setAbierto] = useState<{ fecha: string; rect: DOMRect } | null>(null)
  const cerrar = useCallback(() => setAbierto(null), [])

  return (
    <nav
      aria-label="Semana de competición"
      className="sticky top-14 z-20 border-b border-line bg-card lg:top-0"
    >
      <div className="flex overflow-x-auto">
        <div className="grid min-w-[56rem] flex-1 grid-cols-7">
          {dias.map((d, i) => {
            const ses = sesionesPorDia.get(d.fecha) ?? []
            const nombreDia = `${d.dia} ${d.diaMes}`
            const p = d.partido ? partidoPorId.get(d.partido.id) : undefined
            const descanso = descansos.has(d.fecha)
            // MD del día: el de la sesión si la hay; si no, el calculado por la semana.
            const md = ses.find((s) => esClaveMD(s.match_day))?.match_day || d.etiqueta
            // Barra: partido → localía; entrenamiento (con sesión) → MD. Descanso o vacío → nada.
            const barra = d.partido ? colorDia({ hayPartido: true, localiaPartido: p?.localia }) : ses.length ? colorDia({ md }) : null
            const hecho = d.partido ? !!p && partidoJugado(p) : todasCompletadas(ses)
            const r = p ? resultadoPartido(p.goles_favor, p.goles_contra) : null
            const abre = abierto?.fecha === d.fecha
            const mdTexto = esClaveMD(md) ? `${md} ${MD_NOMBRE[md]}` : md
            return (
              <div
                key={d.fecha}
                aria-current={d.esHoy ? 'date' : undefined}
                className={cn(
                  'relative flex h-11 min-w-0 flex-col justify-center gap-0.5 px-2',
                  i > 0 && 'border-l border-border'
                )}
              >
                {barra && hecho && (
                  <span aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundColor: tinte(barra) }} />
                )}
                {barra && (
                  <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: solido(barra) }} />
                )}
                {d.esHoy && (
                  <span aria-hidden className="pointer-events-none absolute inset-0 outline outline-2 outline-offset-[-2px] outline-foreground" />
                )}
                <div className="relative flex min-w-0 items-baseline gap-1.5 text-[11px] leading-none">
                  <span
                    className={cn(
                      'font-semibold tabular-nums',
                      d.esHoy && '-mx-0.5 rounded-[var(--radius)] bg-foreground px-0.5 text-background'
                    )}
                  >
                    {nombreDia}
                  </span>
                  {md && <span className="font-mono font-semibold text-muted-foreground">{md}</span>}
                </div>
                <div className="relative flex min-w-0 items-center gap-1">
                  {d.partido && (
                    <Link
                      href={`/partidos/${d.partido.id}`}
                      aria-label={`Partido ${nombreDia}: ${
                        p?.localia === 'local' ? 'en casa' : p?.localia === 'visitante' ? 'fuera' : ''
                      } contra ${d.partido.rival ?? 'rival'}${p?.jornada ? `, jornada ${p.jornada}` : ''}${
                        r ? `, ${r.marcador} ${r.texto}` : ', por jugar'
                      }`}
                      className={cn(ITEM, 'font-semibold')}
                    >
                      <Localia valor={p?.localia} className="text-[11px]" />
                      <span className="truncate">{d.partido.rival ?? 'Partido'}</span>
                      {p?.jornada ? (
                        <span className="flex-none font-mono font-normal tabular-nums text-muted-foreground">J{p.jornada}</span>
                      ) : null}
                      {r && (
                        <span className="flex-none font-mono tabular-nums">
                          {r.marcador} {r.marca}
                        </span>
                      )}
                    </Link>
                  )}
                  {ses.length === 1 &&
                    (() => {
                      const s = ses[0]
                      const e = estadoDe(s)
                      const n = numeroSesion(s)
                      return (
                        <Link
                          href={`/sesiones/${s.id}`}
                          aria-label={`Sesión ${n ? `${n} ` : ''}${s.titulo}${mdTexto ? `, ${mdTexto}` : ''}, ${e.texto}`}
                          title={`${n ? `${n} · ` : ''}${s.titulo} (${e.texto})`}
                          className={cn(ITEM, s.estado === 'cancelada' && 'text-muted-foreground line-through')}
                        >
                          {s.estado === 'completada' && <Check aria-hidden className="h-3 w-3 flex-none" strokeWidth={2.5} />}
                          {n ? (
                            <span className="flex-none font-mono font-bold tabular-nums">{n}</span>
                          ) : (
                            <span className="truncate">{s.titulo}</span>
                          )}
                          {s.estado === 'borrador' && <span className="truncate text-muted-foreground">borrador</span>}
                        </Link>
                      )
                    })()}
                  {ses.length > 1 && (
                    <button
                      type="button"
                      aria-haspopup="menu"
                      aria-expanded={abre}
                      aria-label={`${ses.length} sesiones el ${nombreDia}${hecho ? ', completadas' : ''}`}
                      onClick={(ev) =>
                        abre ? cerrar() : setAbierto({ fecha: d.fecha, rect: ev.currentTarget.getBoundingClientRect() })
                      }
                      className={cn(ITEM, 'cursor-pointer')}
                    >
                      {hecho && <Check aria-hidden className="h-3 w-3 flex-none" strokeWidth={2.5} />}
                      <span className="truncate font-mono tabular-nums">
                        {ses.map((s) => numeroSesion(s)).filter(Boolean).join(' ') || `${ses.length} ses.`}
                      </span>
                      <ChevronDown aria-hidden className="h-3 w-3 flex-none" />
                    </button>
                  )}
                  {!d.partido && ses.length === 0 && descanso && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Moon aria-hidden className="h-3 w-3" />
                      Descanso
                    </span>
                  )}
                  {!d.partido && ses.length === 0 && !descanso && (
                    <span aria-hidden className="text-[11px] text-muted-foreground">·</span>
                  )}
                </div>
                {abre && abierto && (
                  <ListaSesiones ancla={abierto.rect} sesiones={ses} titulo={`Sesiones · ${nombreDia}`} onClose={cerrar} />
                )}
              </div>
            )
          })}
        </div>
        <div className="flex h-11 flex-none items-center border-l border-border px-2">
          <Link
            href={micro ? `/microciclos/${micro.id}` : '/microciclos'}
            title={micro ? `Microciclo ${etiquetaMicrociclo(micro)}` : 'Microciclos'}
            aria-label={micro ? `Ver microciclo ${etiquetaMicrociclo(micro)}` : 'Ver microciclos'}
            className="inline-flex h-7 items-center gap-1 rounded-[var(--radius)] border-[1.5px] border-line bg-card px-2 text-[11px] font-semibold text-foreground hover:bg-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
          >
            {micro ? 'Microciclo' : 'Microciclos'}
            {micro && <span className="font-mono tabular-nums text-muted-foreground">{etiquetaMicrociclo(micro)}</span>}
          </Link>
        </div>
      </div>
    </nav>
  )
}
