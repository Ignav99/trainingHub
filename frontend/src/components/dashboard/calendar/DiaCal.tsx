'use client'

/**
 * Día del calendario en aspecto Cal. Sin cajas interiores: el día ES el
 * elemento. La barra superior dice el tipo de día y el relleno si está hecho
 * (ver `lib/calendarioColores.ts`). Solo se usa con `data-appearance="cal"`.
 */

import Link from 'next/link'
import type { CSSProperties } from 'react'
import { Check, ClipboardList, Moon, MoreHorizontal, Plus, Swords, X } from 'lucide-react'
import { Localia } from '@/components/ui/localia'
import { TeamCrest } from '@/components/ui/team-crest'
import { cn } from '@/lib/utils'
import { addDays, startOfWeekMonday, toLocalDateStr } from '@/lib/calendar/types'
import {
  colorDia,
  colorLocalia,
  esClaveMD,
  MD_NOMBRE,
  numeroSesion,
  partidoJugado,
  resultadoPartido,
  solido,
  textoEstadoSesion,
  tinte,
  todasCompletadas,
} from '@/lib/calendarioColores'
import type { Partido, Sesion } from '@/types'

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

const FOCO = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring'

function rival(p: Partido) {
  return p.rival?.nombre_corto || p.rival?.nombre || 'Rival'
}

/** Lunes y domingo de la semana de hoy. */
export function semanaDeHoy(): { lunes: string; domingo: string } {
  const lunes = startOfWeekMonday(toLocalDateStr(new Date()))
  return { lunes, domingo: addDays(lunes, 6) }
}

export interface AspectoDia {
  /** Canales HSL de la barra superior, o null (descanso / vacío). */
  barra: string | null
  /** Color de relleno (con alfa), o null si no está hecho. */
  relleno: string | null
  /** Contorno sutil del partido de esta semana. */
  contorno: string | null
  /** MD del día de entrenamiento (para textos accesibles). */
  md: string | null
}

/** Reglas de barra + relleno de un día. */
export function aspectoDia(opts: {
  sesiones: Sesion[]
  partidos: Partido[]
  fecha: string
  semana?: { lunes: string; domingo: string }
}): AspectoDia {
  const { sesiones, partidos, fecha } = opts
  const partido = partidos[0]
  if (partido) {
    const c = colorLocalia(partido.localia)
    const semana = opts.semana ?? semanaDeHoy()
    const estaSemana = fecha >= semana.lunes && fecha <= semana.domingo
    return {
      barra: c,
      relleno: partidos.some(partidoJugado) ? tinte(c) : null,
      contorno: estaSemana ? solido(c) : null,
      md: 'MD',
    }
  }
  const md = sesiones.find((s) => esClaveMD(s.match_day))?.match_day ?? sesiones[0]?.match_day ?? null
  const barra = sesiones.length ? colorDia({ md }) ?? (todasCompletadas(sesiones) ? 'var(--muted-foreground)' : null) : null
  return {
    barra,
    relleno: barra && todasCompletadas(sesiones) ? tinte(barra) : null,
    contorno: null,
    md,
  }
}

/** Nombre accesible del día completo. */
export function nombreAccesibleDia(opts: {
  fecha: string
  sesiones: Sesion[]
  partidos: Partido[]
  descanso: boolean
  md: string | null
}): string {
  const d = new Date(opts.fecha + 'T12:00:00')
  const partes = [`${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`]
  for (const p of opts.partidos) {
    const r = resultadoPartido(p.goles_favor, p.goles_contra)
    partes.push(
      [
        `Partido ${p.localia === 'local' ? 'en casa' : p.localia === 'visitante' ? 'fuera' : ''} contra ${rival(p)}`,
        p.jornada ? `jornada ${p.jornada}` : '',
        p.hora ? `a las ${p.hora.slice(0, 5)}` : '',
        r ? `${r.marcador}, ${r.texto}` : 'por jugar',
      ]
        .filter(Boolean)
        .join(', ')
    )
  }
  if (!opts.partidos.length && opts.md) {
    partes.push(esClaveMD(opts.md) ? `${opts.md} ${MD_NOMBRE[opts.md]}` : opts.md)
  }
  for (const s of opts.sesiones) {
    const n = numeroSesion(s)
    partes.push(`Sesión ${n ? `${n} ` : ''}${s.titulo}, ${textoEstadoSesion(s.estado)}`)
  }
  if (opts.descanso) partes.push('Descanso')
  if (partes.length === 1) partes.push('sin actividad')
  return partes.join('. ')
}

/** Capa de relleno + barra superior + contorno. Va dentro de un contenedor `relative`. */
export function FondoDia({ aspecto, grosor = 3 }: { aspecto: AspectoDia; grosor?: number }) {
  return (
    <>
      {aspecto.relleno && (
        <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit]" style={{ backgroundColor: aspecto.relleno }} />
      )}
      {aspecto.barra && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 rounded-t-[inherit]"
          style={{ height: aspecto.contorno ? grosor + 1 : grosor, backgroundColor: solido(aspecto.barra) }}
        />
      )}
      {aspecto.contorno && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{ outline: `1.5px solid ${aspecto.contorno}`, outlineOffset: '-1.5px' } as CSSProperties}
        />
      )}
    </>
  )
}

export function LineaSesionCal({
  sesion: s,
  compacta,
  marcarCompletada,
  onClick,
  className,
}: {
  sesion: Sesion
  /** Una sola línea de título (varias sesiones en el día). */
  compacta?: boolean
  /** Muestra el check si está completada. */
  marcarCompletada?: boolean
  onClick?: (e: React.MouseEvent) => void
  className?: string
}) {
  const n = numeroSesion(s)
  const completada = s.estado === 'completada'
  const cancelada = s.estado === 'cancelada'
  const md = esClaveMD(s.match_day) ? `${s.match_day} ${MD_NOMBRE[s.match_day]}` : s.match_day || ''
  const meta = [
    s.duracion_total ? `${s.duracion_total} min` : '',
    s.estado === 'borrador' ? 'borrador' : '',
    cancelada ? 'cancelada' : '',
  ].filter(Boolean)
  return (
    <Link
      href={`/sesiones/${s.id}`}
      onClick={onClick}
      aria-label={`Sesión ${n ? `${n} ` : ''}${s.titulo}${md ? `, ${md}` : ''}, ${textoEstadoSesion(s.estado)}`}
      title={[n, s.titulo, md, textoEstadoSesion(s.estado)].filter(Boolean).join(' · ')}
      className={cn('block min-w-0 rounded-[var(--radius)] text-foreground hover:underline', FOCO, className)}
    >
      <span className="flex min-w-0 items-start gap-1 text-[11px] leading-tight">
        {completada && marcarCompletada !== false && (
          <Check aria-hidden className="mt-px h-3 w-3 flex-none text-foreground" strokeWidth={2.5} />
        )}
        <span className={cn('min-w-0', compacta ? 'truncate' : 'line-clamp-2 break-words', cancelada && 'text-muted-foreground line-through')}>
          {n && <span className="font-mono font-bold tabular-nums">{n}</span>}
          {n && <span className="text-muted-foreground"> · </span>}
          <span className="font-medium">{s.titulo}</span>
        </span>
      </span>
      {meta.length > 0 && (
        <span className="block truncate text-[10px] leading-tight text-muted-foreground tabular-nums">{meta.join(' · ')}</span>
      )}
    </Link>
  )
}

export function LineaPartidoCal({
  partido: p,
  href,
  onClick,
  className,
}: {
  partido: Partido
  href?: string
  onClick?: (e: React.MouseEvent) => void
  className?: string
}) {
  const r = resultadoPartido(p.goles_favor, p.goles_contra)
  const segunda = [p.jornada ? `J${p.jornada}` : '', r ? '' : p.hora ? p.hora.slice(0, 5) : ''].filter(Boolean)
  const localia = p.localia === 'local' ? 'en casa' : p.localia === 'visitante' ? 'fuera' : 'campo neutral'
  return (
    <Link
      href={href ?? `/partidos?match=${p.id}`}
      onClick={onClick}
      aria-label={`Partido ${localia} contra ${rival(p)}${p.jornada ? `, jornada ${p.jornada}` : ''}${
        r ? `, ${r.marcador} ${r.texto}` : p.hora ? `, ${p.hora.slice(0, 5)}` : ''
      }`}
      className={cn('block min-w-0 rounded-[var(--radius)] text-foreground hover:underline', FOCO, className)}
    >
      <span className="flex min-w-0 items-center gap-1 text-[11px] font-semibold leading-tight">
        <TeamCrest src={p.rival?.escudo_url} name={p.rival?.nombre || 'Rival'} size="sm" className="flex-none" />
        <Localia valor={p.localia} className="text-[11px]" />
        <span className="truncate">{rival(p)}</span>
      </span>
      <span className="mt-px flex min-w-0 items-center gap-1 whitespace-nowrap text-[10px] leading-tight tabular-nums">
        {segunda.length > 0 && <span className="text-muted-foreground">{segunda.join(' · ')}</span>}
        {r && (
          <>
            {segunda.length > 0 && <span className="text-muted-foreground">·</span>}
            <span className="font-mono font-bold text-foreground">{r.marcador}</span>
            <span
              className={cn(
                'font-mono font-bold',
                r.marca === 'V' ? 'text-success' : r.marca === 'D' ? 'text-destructive' : 'text-muted-foreground'
              )}
            >
              {r.marca}
            </span>
          </>
        )}
      </span>
    </Link>
  )
}

export function DescansoCal({ onQuitar, className }: { onQuitar?: () => void; className?: string }) {
  return (
    <span className={cn('flex items-center gap-1 text-[10px] text-muted-foreground', className)}>
      <Moon aria-hidden className="h-3 w-3 flex-none" />
      <span>Descanso</span>
      {onQuitar && (
        <button
          type="button"
          className={cn('ml-auto rounded-[var(--radius)] p-0.5 opacity-0 hover:bg-sunken focus-visible:opacity-100 group-hover:opacity-100', FOCO)}
          onClick={(e) => {
            e.stopPropagation()
            onQuitar()
          }}
          title="Quitar descanso"
          aria-label="Quitar descanso"
        >
          <X aria-hidden className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  )
}

/** Menú "añadir al día" (mismas acciones que el aspecto clásico). */
export function MenuAnadirDia({
  fecha,
  esDescanso,
  abreArriba,
  onClose,
  onNavigate,
  onToggleDescanso,
}: {
  fecha: string
  esDescanso: boolean
  abreArriba?: boolean
  onClose: () => void
  onNavigate: (path: string) => void
  onToggleDescanso: () => void
}) {
  const item = 'flex w-full items-center gap-2 px-3 py-2 text-left text-xs row-hover'
  return (
    <div
      className={cn(
        'absolute right-1 z-50 w-44 max-w-[calc(100vw-2rem)] rounded-[var(--radius)] border border-line bg-popover py-1',
        abreArriba ? 'bottom-8' : 'top-8'
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <button className={item} onClick={() => { onClose(); onNavigate(`/sesiones/nueva?fecha=${fecha}`) }}>
        <ClipboardList aria-hidden className="h-3.5 w-3.5 text-muted-foreground" />
        <span>Nueva sesión</span>
      </button>
      <button className={item} onClick={() => { onClose(); onNavigate(`/partidos/nuevo?fecha=${fecha}`) }}>
        <Swords aria-hidden className="h-3.5 w-3.5 text-muted-foreground" />
        <span>Partido</span>
      </button>
      <button className={item} onClick={() => { onClose(); onToggleDescanso() }}>
        <Moon aria-hidden className="h-3.5 w-3.5 text-muted-foreground" />
        <span>{esDescanso ? 'Quitar descanso' : 'Descanso'}</span>
      </button>
      <button className={item} onClick={onClose}>
        <MoreHorizontal aria-hidden className="h-3.5 w-3.5 text-muted-foreground" />
        <span>Otro</span>
      </button>
    </div>
  )
}

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** Celda de la vista mes. */
export function DiaCal({
  fecha,
  dia,
  esHoy,
  enMes,
  esPasado,
  sesiones,
  partidos,
  descanso,
  menuAbierto,
  menuAbreArriba,
  semana,
  onSelectDay,
  onToggleMenu,
  onCloseMenu,
  onNavigate,
  onToggleDescanso,
  onQuitarDescanso,
}: {
  fecha: string
  dia: number
  esHoy: boolean
  enMes: boolean
  esPasado: boolean
  sesiones: Sesion[]
  partidos: Partido[]
  descanso: boolean
  menuAbierto: boolean
  menuAbreArriba: boolean
  semana: { lunes: string; domingo: string }
  onSelectDay: () => void
  onToggleMenu: () => void
  onCloseMenu: () => void
  onNavigate: (path: string) => void
  onToggleDescanso: () => void
  onQuitarDescanso?: () => void
}) {
  const hayContenido = sesiones.length > 0 || partidos.length > 0 || descanso
  const aspecto = aspectoDia({ sesiones, partidos, fecha, semana })
  const etiqueta = nombreAccesibleDia({ fecha, sesiones, partidos, descanso, md: aspecto.md })
  const varias = sesiones.length > 1

  return (
    <div
      role="group"
      aria-label={etiqueta}
      onClick={(e) => {
        if (hayContenido) {
          e.stopPropagation()
          onSelectDay()
          onCloseMenu()
        }
      }}
      className={cn(
        'group relative min-h-[70px] border-b border-r p-1.5 pt-2 last:border-r-0 md:min-h-[100px] lg:flex lg:min-h-0 lg:flex-col',
        enMes ? 'bg-card' : 'bg-sunken',
        hayContenido && 'cursor-pointer'
      )}
    >
      <FondoDia aspecto={aspecto} />

      <div className={cn('relative flex items-center justify-between', !enMes && 'opacity-60')}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onSelectDay()
            onCloseMenu()
          }}
          aria-label={`Abrir ${etiqueta.split('.')[0]}`}
          aria-current={esHoy ? 'date' : undefined}
          className={cn(
            'inline-flex h-5 min-w-5 items-center justify-center gap-0.5 rounded-[var(--radius)] px-1 text-xs font-semibold leading-none tabular-nums',
            FOCO,
            esHoy
              ? 'bg-foreground text-background'
              : !enMes || esPasado
                ? 'text-muted-foreground'
                : 'text-foreground'
          )}
        >
          {dia}
          {!enMes && !esHoy && (
            <span className="text-[8px] font-semibold uppercase">{MESES_CORTOS[Number(fecha.slice(5, 7)) - 1]}</span>
          )}
        </button>
        {!esPasado && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggleMenu()
            }}
            className={cn(
              'rounded-[var(--radius)] p-1 md:p-0.5',
              FOCO,
              menuAbierto ? 'bg-sunken opacity-100' : 'opacity-0 hover:bg-sunken focus-visible:opacity-100 group-hover:opacity-100'
            )}
            title="Añadir al día"
            aria-label="Añadir al día"
            aria-expanded={menuAbierto}
          >
            <Plus aria-hidden className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {menuAbierto && (
        <MenuAnadirDia
          fecha={fecha}
          esDescanso={descanso}
          abreArriba={menuAbreArriba}
          onClose={onCloseMenu}
          onNavigate={onNavigate}
          onToggleDescanso={onToggleDescanso}
        />
      )}

      <div className={cn('relative mt-1 space-y-1 lg:min-h-0 lg:flex-1 lg:overflow-y-auto', !enMes && 'opacity-60')}>
        {partidos.map((p) => (
          <LineaPartidoCal key={p.id} partido={p} onClick={(e) => e.stopPropagation()} />
        ))}
        {sesiones.map((s) => (
          <LineaSesionCal
            key={s.id}
            sesion={s}
            compacta={varias}
            onClick={(e) => e.stopPropagation()}
          />
        ))}
        {descanso && <DescansoCal onQuitar={!esPasado ? onQuitarDescanso : undefined} />}
        {!hayContenido && !esPasado && (
          <span className="block py-2 text-center text-[9px] text-muted-foreground opacity-0 group-hover:opacity-70">
            Pulsa + para añadir
          </span>
        )}
      </div>
    </div>
  )
}
