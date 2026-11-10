'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Activity, Eye, FileText, MoreHorizontal, Trash2 } from 'lucide-react'
import { format, parseISO, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { Estado, type EstadoTipo } from '@/components/ui/estado'
import { continueHref, PASO_LABEL, readCreacionPaso } from '@/lib/sesionBorrador'
import type { Sesion } from '@/types'

export interface Props {
  sesiones: Sesion[]
  activeMenu: string | null
  setActiveMenu: (id: string | null) => void
  onWarm: (sesion: Sesion) => void
  onPdf: (id: string, e: React.MouseEvent, fecha: string | null | undefined, variant: 'reducido' | 'extendido') => void
  onRpe: (id: string) => void
  onDelete: (id: string, e: React.MouseEvent) => void
}

/** Color de cada MD con tokens (equivalentes a los que usa la pastilla clásica). */
export const MD_COLOR: Record<string, string> = {
  'MD+1': 'bg-success',
  'MD+2': 'bg-success',
  'MD-4': 'bg-destructive',
  'MD-3': 'bg-warning',
  'MD-2': 'bg-info',
  'MD-1': 'bg-primary',
  MD: 'bg-foreground',
}

/** Estado escrito + forma. */
export function estadoDe(s: Sesion): { tipo: EstadoTipo; texto: string; title?: string } {
  const paso = readCreacionPaso(s.fase_notas)
  if (s.estado === 'borrador' && paso) {
    const lugar = PASO_LABEL[paso as keyof typeof PASO_LABEL] || paso
    return { tipo: 'duda', texto: 'Sin terminar', title: `Te quedaste en ${lugar}` }
  }
  switch (s.estado) {
    case 'completada':
      return { tipo: 'disponible', texto: 'Completada' }
    case 'planificada':
      return { tipo: 'aviso', texto: 'Planificada' }
    case 'cancelada':
      return { tipo: 'baja', texto: 'Cancelada' }
    default:
      return { tipo: 'neutro', texto: 'Borrador' }
  }
}

export function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn()
  } catch {
    return fallback
  }
}

export function MenuFila({
  sesion,
  abierto,
  setActiveMenu,
  onPdf,
  onRpe,
  onDelete,
}: {
  sesion: Sesion
  abierto: boolean
  setActiveMenu: (id: string | null) => void
  onPdf: Props['onPdf']
  onRpe: Props['onRpe']
  onDelete: Props['onDelete']
}) {
  const boton = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)

  useLayoutEffect(() => {
    if (!abierto || !boton.current) return
    const r = boton.current.getBoundingClientRect()
    setPos({ top: r.bottom + 4, right: window.innerWidth - r.right })
  }, [abierto])

  const item =
    'flex w-full items-center gap-2 px-3 h-10 text-left text-sm hover:bg-sunken focus-visible:bg-sunken focus-visible:outline-none'
  const href = continueHref(sesion.id, sesion.fase_notas, sesion.estado)
  const continuar = readCreacionPaso(sesion.fase_notas) && sesion.estado === 'borrador'

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <button
        ref={boton}
        type="button"
        aria-label={`Acciones de ${sesion.titulo}`}
        aria-haspopup="menu"
        aria-expanded={abierto}
        onClick={(e) => {
          e.stopPropagation()
          setActiveMenu(abierto ? null : sesion.id)
        }}
        className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius)] text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11"
      >
        <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
      </button>
      {abierto &&
        pos &&
        createPortal(
          <div
            role="menu"
            style={{ top: pos.top, right: pos.right }}
            className="cal-linea fixed z-50 w-52 bg-card py-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Link role="menuitem" href={href} className={item}>
              <Eye className="h-4 w-4" aria-hidden="true" />
              {continuar ? 'Continuar' : 'Ver detalle'}
            </Link>
            <button role="menuitem" type="button" className={item} onClick={(e) => onPdf(sesion.id, e, sesion.fecha, 'reducido')}>
              <FileText className="h-4 w-4" aria-hidden="true" />
              PDF reducido
            </button>
            <button role="menuitem" type="button" className={item} onClick={(e) => onPdf(sesion.id, e, sesion.fecha, 'extendido')}>
              <FileText className="h-4 w-4" aria-hidden="true" />
              PDF extendido
            </button>
            <button
              role="menuitem"
              type="button"
              className={item}
              onClick={(e) => {
                e.stopPropagation()
                setActiveMenu(null)
                onRpe(sesion.id)
              }}
            >
              <Activity className="h-4 w-4" aria-hidden="true" />
              Asignar RPE
            </button>
            <button role="menuitem" type="button" className={`${item} text-destructive`} onClick={(e) => onDelete(sesion.id, e)}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Eliminar
            </button>
          </div>,
          document.body
        )}
    </div>
  )
}

export interface Semana {
  clave: string
  inicio: Date | null
  sesiones: Sesion[]
}

export function SesionesTablaCal({ sesiones, activeMenu, setActiveMenu, onWarm, onPdf, onRpe, onDelete }: Props) {
  const router = useRouter()
  const hoy = format(new Date(), 'yyyy-MM-dd')

  // Agrupa por semana (lunes a domingo) conservando el orden recibido.
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

  const cab = 'h-9 px-3 text-xs font-semibold text-muted-foreground [font-stretch:75%]'
  const cifra = 'px-3 text-right tabular-nums'

  return (
    <div className="cal-linea overflow-x-auto bg-card">
      <table className="w-full min-w-[820px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className={`${cab} text-left`}>Día</th>
            <th scope="col" className={`${cab} text-left`}>MD</th>
            <th scope="col" className={`${cab} text-right`}>Nº</th>
            <th scope="col" className={`${cab} w-full text-left`}>Sesión</th>
            <th scope="col" className={`${cab} text-right`}>Tareas</th>
            <th scope="col" className={`${cab} text-right`}>Min.</th>
            <th scope="col" className={`${cab} text-left`}>Estado</th>
            <th scope="col" className="w-12 px-1">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        {semanas.map((g) => {
          const minutos = g.sesiones.reduce((acc, s) => acc + (s.duracion_total || 0), 0)
          const rival = g.sesiones.find((s) => s.rival)?.rival
          const rotulo = g.inicio ? `Semana del ${format(g.inicio, 'd MMM', { locale: es })}` : 'Sin fecha'
          return (
            <tbody key={g.clave}>
              <tr className="border-b border-border bg-sunken">
                <th scope="colgroup" colSpan={8} className="h-9 px-3 text-left font-normal">
                  <div className="flex items-center justify-between gap-3">
                    <span className="cal-rotulo">{rotulo}</span>
                    <span className="flex items-center gap-3 text-xs text-muted-foreground">
                      {rival && <span>vs {rival}</span>}
                      <span className="tabular-nums">{minutos} min</span>
                    </span>
                  </div>
                </th>
              </tr>
              {g.sesiones.map((s) => {
                const est = estadoDe(s)
                const href = continueHref(s.id, s.fase_notas, s.estado)
                const esHoy = s.fecha?.slice(0, 10) === hoy
                const dia = safe(() => format(parseISO(s.fecha), 'EEE d', { locale: es }), s.fecha)
                const extra =
                  s.es_pretemporada || s.contexto_periodo === 'pretemporada'
                    ? 'Pretemporada'
                    : s.contexto_periodo === 'transicion'
                      ? 'Transición'
                      : null
                return (
                  <tr
                    key={s.id}
                    tabIndex={0}
                    onClick={() => router.push(href)}
                    onKeyDown={(e) => {
                      if (e.target === e.currentTarget && e.key === 'Enter') router.push(href)
                    }}
                    onPointerEnter={() => onWarm(s)}
                    className="h-9 cursor-pointer border-b border-border last:border-b-0 hover:bg-sunken focus-visible:bg-sunken focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary [@media(pointer:coarse)]:h-11"
                  >
                    <td className="relative whitespace-nowrap px-3 tabular-nums">
                      {esHoy && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px] bg-primary" />}
                      {dia}
                      {esHoy && <span className="sr-only"> (hoy)</span>}
                    </td>
                    <td className="whitespace-nowrap px-3">
                      <span className="inline-flex items-center gap-2 font-mono text-xs">
                        <span aria-hidden="true" className={`inline-block h-2 w-2 flex-none ${MD_COLOR[s.match_day] || 'bg-muted-foreground'}`} />
                        {s.match_day}
                      </span>
                    </td>
                    <td className={cifra}>{s.numero_sesion ?? '–'}</td>
                    <td className="max-w-0 px-3" title={est.title ?? extra ?? undefined}>
                      <div className="flex items-baseline gap-3 overflow-hidden">
                        <span className="flex-none whitespace-nowrap font-medium">{s.titulo}</span>
                        {s.objetivo_principal && (
                          <span className="min-w-0 truncate text-muted-foreground">{s.objetivo_principal}</span>
                        )}
                      </div>
                    </td>
                    <td className={cifra}>{s.tareas?.length || 0}</td>
                    <td className={cifra}>{s.duracion_total || '–'}</td>
                    <td className="whitespace-nowrap px-3" title={est.title}>
                      <Estado tipo={est.tipo}>{est.texto}</Estado>
                    </td>
                    <td className="px-1 text-right">
                      <MenuFila
                        sesion={s}
                        abierto={activeMenu === s.id}
                        setActiveMenu={setActiveMenu}
                        onPdf={onPdf}
                        onRpe={onRpe}
                        onDelete={onDelete}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          )
        })}
      </table>
    </div>
  )
}
