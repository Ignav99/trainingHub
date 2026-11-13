'use client'

/**
 * Barra fija de la semana (Cal). Mismo lenguaje que el día del calendario
 * mensual (ver `components/dashboard/calendar/DiaCal.tsx`): riel superior =
 * tipo de día, relleno = hecho, trama = descanso, marco en tinta + "Hoy" =
 * hoy, escudo recortado = partido, muestra de color = nota del día.
 * Cada día con algo dentro es pulsable entero (lleva a la sesión o al partido).
 */

import Link from 'next/link'
import useSWR from 'swr'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, ChevronRight, Clock, FileEdit, Moon, X } from 'lucide-react'
import { useAppearance } from '@/lib/useAppearance'
import { apiKey } from '@/lib/swr'
import { useEquipoStore } from '@/stores/equipoStore'
import { semanaMD, type PartidoSemana } from '@/lib/semanaMD'
import { cn } from '@/lib/utils'
import { Localia } from '@/components/ui/localia'
import {
  esClaveMD,
  MD_HSL,
  MD_NOMBRE,
  numeroSesion,
  resultadoPartido,
  semanaDelAno,
} from '@/lib/calendarioColores'
import { diasPersonalesDe, fechasDescanso, hslColorDia } from '@/lib/diaPersonal'
import { FondoDia, MarcaEscudo, MarcoHoy, Muestra, aspectoDia } from '@/components/dashboard/calendar/DiaCal'
import { useEstiloCasa } from '@/components/dashboard/calendar/useEstiloCasa'
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

/**
 * Objetivo principal del día: el enlace se estira a toda la celda con un
 * `::after`, así todo el día es pulsable sin anidar enlaces. El foco se
 * dibuja en ese `::after`, es decir, alrededor del día entero.
 */
const ESTIRADO =
  "after:absolute after:inset-0 after:z-[1] after:content-[''] focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-offset-[-2px] focus-visible:after:outline-ring"

/** Contenido de la segunda línea: sin caja propia, el día ya lleva riel y relleno. */
const LINEA = 'flex min-w-0 items-center gap-1.5 text-[12px] leading-4 text-foreground'

function estadoDe(s: Sesion) {
  return ESTADO_SESION[s.estado] ?? { texto: String(s.estado), Icono: Clock }
}

function hora(h?: string | null) {
  return h ? h.slice(0, 5) : ''
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
  const ancho = 288
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
      className="fixed z-[60] w-72 rounded-[var(--radius)] border-[1.5px] border-line bg-card p-1 text-sm text-foreground"
      style={{ top: ancla.bottom + 4, left }}
    >
      <p className="cal-rotulo px-2 py-1 text-[11px] text-muted-foreground">{titulo}</p>
      {sesiones.map((s) => {
        const e = estadoDe(s)
        const n = numeroSesion(s)
        return (
          <Link
            key={s.id}
            href={`/sesiones/${s.id}`}
            role="menuitem"
            onClick={onClose}
            className="grid grid-cols-[2.25rem_2.5rem_1fr_auto] items-baseline gap-1.5 px-2 py-1.5 hover:bg-sunken focus-visible:bg-sunken focus-visible:outline-none"
          >
            <span className="font-mono text-xs font-bold tabular-nums">{n ?? '—'}</span>
            <span className="text-xs tabular-nums text-muted-foreground">{hora(s.hora) || '—'}</span>
            <span className={cn('min-w-0 truncate', s.estado === 'cancelada' && 'text-muted-foreground line-through')}>
              {s.titulo}
            </span>
            <e.Icono aria-label={e.texto} className="h-3.5 w-3.5 self-center text-muted-foreground" />
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
  const estiloCasa = useEstiloCasa()
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

  // Los cambios del calendario (descanso, nota del día) se aplican a esta
  // clave también: ver `sincronizarDescansos` en lib/api/descansos.ts.
  const { data: descData } = useSWR<{ data: Descanso[] }>(
    enCal ? apiKey('/descansos', { equipo_id: equipoId, fecha_desde: lunes, fecha_hasta: domingo }, ['equipo_id']) : null
  )
  const descansos = useMemo(() => fechasDescanso(descData?.data), [descData])
  const personales = useMemo(() => diasPersonalesDe(descData?.data), [descData])

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
    m.forEach((lista) => lista.sort((a, b) => String(a.hora ?? '').localeCompare(String(b.hora ?? ''))))
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
  const semana = useMemo(() => ({ lunes, domingo }), [lunes, domingo])

  return (
    <nav
      aria-label="Semana de competición"
      className="sticky top-14 z-20 border-b border-line bg-card lg:top-0"
      style={estiloCasa}
    >
      <div className="flex overflow-x-auto">
        <div className="grid min-w-[56rem] flex-1 grid-cols-7">
          {dias.map((d, i) => {
            const ses = sesionesPorDia.get(d.fecha) ?? []
            const nombreDia = `${d.dia} ${d.diaMes}`
            const p = d.partido ? partidoPorId.get(d.partido.id) : undefined
            const personal = personales[d.fecha] ?? null
            const descanso = descansos.has(d.fecha)
            // MD del día: el de la sesión si la hay; si no, el calculado por la semana.
            const md = ses.find((s) => esClaveMD(s.match_day))?.match_day || d.etiqueta
            const aspecto = aspectoDia({ sesiones: ses, partidos: p ? [p] : [], fecha: d.fecha, semana, personal })
            // La tira no repite el contorno de "partido de esta semana": toda la tira es esta semana.
            const fondo = { ...aspecto, contorno: null, barra: aspecto.barra ?? (d.partido && !p ? 'var(--muted-foreground)' : null) }
            const r = p ? resultadoPartido(p.goles_favor, p.goles_contra) : null
            const abre = abierto?.fecha === d.fecha
            const mdTexto = esClaveMD(md) ? `${md} ${MD_NOMBRE[md]}` : md
            const pulsable = !!d.partido || ses.length > 0
            const sesionVisible = d.partido ? ses[0] : ses.length === 1 ? ses[0] : undefined
            return (
              <div
                key={d.fecha}
                aria-current={d.esHoy ? 'date' : undefined}
                className={cn(
                  'group relative isolate flex h-12 min-w-0 flex-col justify-center gap-0.5 px-2',
                  i > 0 && 'border-l border-border'
                )}
              >
                <span aria-hidden className="absolute inset-0 -z-10">
                  <FondoDia aspecto={fondo} descanso={descanso && !personal} />
                  {p && <MarcaEscudo partido={p} tam={46} />}
                  {pulsable && (
                    <span className="absolute inset-0 outline outline-[1.5px] outline-offset-[-1.5px] outline-[hsl(var(--foreground)/0.22)] opacity-0 transition-opacity duration-150 ease-sale group-hover:opacity-100 motion-reduce:transition-none" />
                  )}
                </span>
                {d.esHoy && <MarcoHoy />}

                <div className="flex min-w-0 items-center gap-1.5 text-[11px] leading-[14px]">
                  <span className={cn('font-semibold tabular-nums', d.esHoy ? 'text-foreground' : 'text-muted-foreground')}>
                    <span className="inline-block first-letter:uppercase">{d.dia}</span> <span className="text-foreground">{d.diaMes}</span>
                  </span>
                  {d.esHoy && <span className="cal-rotulo text-[10px] leading-none text-foreground">Hoy</span>}
                  {md && (
                    <span className="ml-auto inline-flex flex-none items-center gap-1 font-mono text-[10.5px] font-semibold tabular-nums text-muted-foreground" title={mdTexto}>
                      {esClaveMD(md) && <Muestra canales={MD_HSL[md]} className="h-1.5 w-1.5" />}
                      {md}
                    </span>
                  )}
                </div>

                <div className="flex min-w-0 items-center gap-2">
                  {d.partido && (
                    <Link
                      href={`/partidos/${d.partido.id}`}
                      aria-label={`Partido ${nombreDia}: ${
                        p?.localia === 'local' ? 'en casa' : p?.localia === 'visitante' ? 'fuera' : ''
                      } contra ${d.partido.rival ?? 'rival'}${p?.jornada ? `, jornada ${p.jornada}` : ''}${
                        r ? `, ${r.marcador} ${r.texto}` : p?.hora ? `, ${hora(p.hora)}` : ', por jugar'
                      }`}
                      className={cn(LINEA, 'min-w-0 font-semibold', ESTIRADO)}
                    >
                      <Localia valor={p?.localia} className="text-[12px]" />
                      <span className="truncate">{d.partido.rival ?? 'Partido'}</span>
                      {r ? (
                        <span className="flex-none font-mono tabular-nums">
                          {r.marcador}{' '}
                          <span className={r.marca === 'V' ? 'text-success' : r.marca === 'D' ? 'text-destructive' : 'text-muted-foreground'}>
                            {r.marca}
                          </span>
                        </span>
                      ) : p?.hora ? (
                        <span className="flex-none font-normal tabular-nums text-muted-foreground">{hora(p.hora)}</span>
                      ) : null}
                      {p?.jornada ? (
                        <span className="flex-none font-mono font-normal tabular-nums text-muted-foreground">J{p.jornada}</span>
                      ) : null}
                    </Link>
                  )}
                  {!d.partido && sesionVisible &&
                    (() => {
                      const s = sesionVisible
                      const e = estadoDe(s)
                      const n = numeroSesion(s)
                      return (
                        <Link
                          href={`/sesiones/${s.id}`}
                          aria-label={`Sesión ${n ? `${n} ` : ''}${s.titulo}${s.hora ? `, ${hora(s.hora)}` : ''}${mdTexto ? `, ${mdTexto}` : ''}, ${e.texto}`}
                          title={[n, hora(s.hora), s.titulo, e.texto].filter(Boolean).join(' · ')}
                          className={cn(LINEA, ESTIRADO)}
                        >
                          {n && <span className="flex-none font-mono text-[11px] font-bold tabular-nums">{n}</span>}
                          {s.hora && <span className="flex-none tabular-nums text-muted-foreground">{hora(s.hora)}</span>}
                          <span className={cn('min-w-0 truncate font-medium', s.estado === 'cancelada' && 'text-muted-foreground line-through')}>
                            {s.titulo}
                          </span>
                          {s.estado === 'completada' && <Check aria-hidden className="h-3 w-3 flex-none" strokeWidth={2.5} />}
                        </Link>
                      )
                    })()}
                  {!d.partido && ses.length > 1 && (
                    <button
                      type="button"
                      aria-haspopup="menu"
                      aria-expanded={abre}
                      aria-label={`${ses.length} sesiones el ${nombreDia}`}
                      onClick={(ev) =>
                        abre ? cerrar() : setAbierto({ fecha: d.fecha, rect: ev.currentTarget.getBoundingClientRect() })
                      }
                      className={cn(LINEA, ESTIRADO, 'cursor-pointer')}
                    >
                      <span className="truncate font-mono text-[11px] font-bold tabular-nums">
                        {ses.map((s) => numeroSesion(s)).filter(Boolean).join(' · ') || `${ses.length} sesiones`}
                      </span>
                      {ses[0]?.hora && <span className="flex-none tabular-nums text-muted-foreground">{hora(ses[0].hora)}</span>}
                      <ChevronDown aria-hidden className="h-3 w-3 flex-none text-muted-foreground" />
                    </button>
                  )}
                  {d.partido && ses.length > 0 && (
                    <span
                      className="flex-none font-mono text-[10.5px] font-semibold tabular-nums text-muted-foreground"
                      title={`${ses.length} sesión${ses.length > 1 ? 'es' : ''} también este día`}
                    >
                      +{ses.map((s) => numeroSesion(s)).filter(Boolean)[0] ?? `${ses.length} ses.`}
                    </span>
                  )}
                  {!d.partido && ses.length === 0 && personal && (
                    <span className={cn(LINEA, 'font-semibold')} title={personal.texto}>
                      <Muestra canales={hslColorDia(personal.color)} className="h-2 w-2" />
                      <span className="truncate">{personal.texto}</span>
                    </span>
                  )}
                  {!d.partido && ses.length === 0 && !personal && descanso && (
                    <span className={cn(LINEA, 'text-muted-foreground')}>
                      <Moon aria-hidden className="h-3 w-3" />
                      Descanso
                    </span>
                  )}
                  {!d.partido && ses.length === 0 && !personal && !descanso && (
                    <span className="text-[12px] leading-4 text-muted-foreground/70">Sin sesión</span>
                  )}
                </div>
                {abre && abierto && (
                  <ListaSesiones ancla={abierto.rect} sesiones={ses} titulo={`Sesiones · ${nombreDia}`} onClose={cerrar} />
                )}
              </div>
            )
          })}
        </div>
        <div className="flex h-12 flex-none items-stretch border-l border-border p-1.5">
          <Link
            href={micro ? `/microciclos/${micro.id}` : '/microciclos'}
            title={micro ? `Abrir microciclo Sem ${semanaDelAno(String(micro.fecha_inicio))}` : 'Microciclos'}
            aria-label={micro ? `Abrir microciclo de la semana ${semanaDelAno(String(micro.fecha_inicio))}` : 'Ver microciclos'}
            className="group/mc inline-flex items-center gap-1.5 rounded-[var(--radius)] border-l-2 border-[hsl(var(--casa,var(--primary)))] bg-[hsl(var(--casa,var(--primary))/0.1)] pl-2 pr-1.5 text-foreground transition-colors duration-150 ease-sale hover:bg-[hsl(var(--casa,var(--primary))/0.2)] motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
          >
            <span className="flex flex-col leading-none">
              <span className="cal-rotulo text-[9px] text-muted-foreground">Microciclo</span>
              <span className="mt-0.5 font-mono text-[12px] font-bold tabular-nums">
                {micro ? `Sem ${semanaDelAno(String(micro.fecha_inicio))}` : 'Todos'}
              </span>
            </span>
            <ChevronRight
              aria-hidden
              className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-150 ease-sale group-hover/mc:translate-x-px group-hover/mc:text-foreground motion-reduce:transition-none"
            />
          </Link>
        </div>
      </div>
    </nav>
  )
}
