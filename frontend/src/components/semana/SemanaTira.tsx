'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Clock, FileEdit, X } from 'lucide-react'
import { useAppearance } from '@/lib/useAppearance'
import { apiKey } from '@/lib/swr'
import { useEquipoStore } from '@/stores/equipoStore'
import { semanaMD, type PartidoSemana } from '@/lib/semanaMD'
import { cn } from '@/lib/utils'
import { Localia } from '@/components/ui/localia'
import { MD_COLOR } from '@/components/sesiones/SesionesTablaCal'
import type { Microciclo, PaginatedResponse, Partido, Sesion } from '@/types'

function fechaLocal(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function desplazar(fecha: string, dias: number) {
  const t = new Date(fecha + 'T12:00:00Z').getTime() + dias * 86_400_000
  return new Date(t).toISOString().slice(0, 10)
}

const ESTADO_SESION: Record<string, { texto: string; borde: string; Icono: typeof Check }> = {
  completada: { texto: 'completada', borde: 'border-l-success', Icono: Check },
  planificada: { texto: 'planificada', borde: 'border-l-info', Icono: Clock },
  borrador: { texto: 'borrador', borde: 'border-l-muted-foreground', Icono: FileEdit },
  cancelada: { texto: 'cancelada', borde: 'border-l-destructive', Icono: X },
}

const CHIP =
  'inline-flex min-w-0 max-w-full items-center gap-1 rounded-[var(--radius)] border border-border border-l-2 bg-card px-1 text-[11px] leading-[18px] text-foreground hover:bg-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring'

function estadoDe(s: Sesion) {
  return ESTADO_SESION[s.estado] ?? { texto: String(s.estado), borde: 'border-l-muted-foreground', Icono: Clock }
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
            className={cn(
              'flex items-center gap-2 border-l-2 px-2 py-1.5 hover:bg-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring',
              e.borde
            )}
          >
            <e.Icono aria-hidden className="h-3.5 w-3.5 flex-none text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">{s.titulo}</span>
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
  const localiaPorId = useMemo(() => {
    const m = new Map<string, Partido['localia']>()
    for (const p of partidosRaw ?? []) m.set(p.id, p.localia)
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
            const colorMD = d.etiqueta ? MD_COLOR[d.etiqueta] : undefined
            const abre = abierto?.fecha === d.fecha
            return (
              <div
                key={d.fecha}
                aria-current={d.esHoy ? 'date' : undefined}
                className={cn(
                  'relative flex h-11 min-w-0 flex-col justify-center gap-0.5 px-2',
                  i > 0 && 'border-l border-border',
                  d.esHoy && 'bg-primary text-primary-foreground'
                )}
              >
                {colorMD && <span aria-hidden className={cn('absolute inset-x-0 top-0 h-[3px]', colorMD)} />}
                <div className="flex min-w-0 items-baseline gap-1.5 text-[11px] leading-none">
                  <span className="font-semibold tabular-nums">{nombreDia}</span>
                  {d.etiqueta && (
                    <span
                      className={cn(
                        'font-mono font-semibold',
                        d.esHoy ? 'text-primary-foreground/90' : 'text-muted-foreground'
                      )}
                    >
                      {d.etiqueta}
                    </span>
                  )}
                </div>
                <div className="flex min-w-0 items-center gap-1">
                  {d.partido && (
                    <Link
                      href={`/partidos/${d.partido.id}`}
                      aria-label={`Partido ${d.dia} ${d.diaMes}: ${d.partido.rival ?? 'rival'}`}
                      className={cn(CHIP, 'border-l-foreground')}
                    >
                      <Localia valor={localiaPorId.get(d.partido.id)} className="text-[11px]" />
                      <span className="truncate font-semibold">{d.partido.rival ?? 'Partido'}</span>
                    </Link>
                  )}
                  {ses.length === 1 &&
                    (() => {
                      const s = ses[0]
                      const e = estadoDe(s)
                      return (
                        <Link
                          href={`/sesiones/${s.id}`}
                          aria-label={`Sesión ${e.texto}: ${s.titulo}`}
                          title={`${s.titulo} (${e.texto})`}
                          className={cn(CHIP, e.borde, s.estado === 'completada' && 'bg-success/10')}
                        >
                          <e.Icono aria-hidden className="h-3 w-3 flex-none" />
                          <span className="truncate">{s.match_day || 'Sesión'}</span>
                        </Link>
                      )
                    })()}
                  {ses.length > 1 && (
                    <button
                      type="button"
                      aria-haspopup="menu"
                      aria-expanded={abre}
                      aria-label={`${ses.length} sesiones el ${nombreDia}`}
                      onClick={(ev) =>
                        abre ? cerrar() : setAbierto({ fecha: d.fecha, rect: ev.currentTarget.getBoundingClientRect() })
                      }
                      className={cn(
                        CHIP,
                        'cursor-pointer border-l-info',
                        ses.every((s) => s.estado === 'completada') && 'border-l-success bg-success/10'
                      )}
                    >
                      <span className="tabular-nums">{ses.length} ses.</span>
                      <ChevronDown aria-hidden className="h-3 w-3 flex-none" />
                    </button>
                  )}
                  {!d.partido && ses.length === 0 && <span className="text-[11px] opacity-40">·</span>}
                </div>
                {abre && abierto && (
                  <ListaSesiones ancla={abierto.rect} sesiones={ses} titulo={`Sesiones · ${nombreDia}`} onClose={cerrar} />
                )}
              </div>
            )
          })}
        </div>
        <Link
          href={micro ? `/microciclos/${micro.id}` : '/microciclos'}
          className="flex h-11 flex-none items-center border-l border-border px-3 text-[11px] font-semibold hover:bg-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
        >
          {micro ? 'Microciclo' : 'Microciclos'}
        </Link>
      </div>
    </nav>
  )
}
