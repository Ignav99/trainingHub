'use client'

/**
 * Día del calendario en aspecto Cal. Sin cajas interiores: el día ES el
 * elemento y todo él es pulsable (abre el detalle del día).
 *
 * Canales (ver `lib/calendarioColores.ts` y `lib/diaPersonal.ts`):
 *  - Barra superior (riel) = tipo de día: MD, localía o color del día personalizado.
 *  - Relleno = hecho (sesión completada / partido jugado) o día personalizado.
 *  - Trama diagonal = descanso.
 *  - Marco de 2 px en tinta + "Hoy" = hoy.
 *  - Escudo grande recortado por el borde = partido (marca de agua).
 * Solo se usa con `data-appearance="cal"`.
 */

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { Check, ClipboardList, Moon, PenLine, Plus, Swords, Tag, X } from 'lucide-react'
import { Localia } from '@/components/ui/localia'
import { cn } from '@/lib/utils'
import { addDays, startOfWeekMonday, toLocalDateStr } from '@/lib/calendar/types'
import {
  colorDia,
  colorLocalia,
  esClaveMD,
  MD_HSL,
  MD_NOMBRE,
  numeroSesion,
  partidoJugado,
  resultadoPartido,
  solido,
  textoEstadoSesion,
  tinte,
  todasCompletadas,
} from '@/lib/calendarioColores'
import {
  COLOR_POR_DEFECTO,
  MAX_TEXTO,
  PALETA_DIA,
  hslColorDia,
  normalizarTexto,
  type ClaveColorDia,
  type DiaPersonal,
} from '@/lib/diaPersonal'
import type { Partido, Sesion } from '@/types'

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

export const FOCO = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring'

/** Trama diagonal sutil del descanso: textura, no gris plano (el gris es de otro mes). */
export const TRAMA_DESCANSO: CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(135deg, hsl(var(--foreground) / 0.07) 0 1px, transparent 1px 7px)',
}

/** Alfa del tinte de un día personalizado (algo más que "hecho": es el día entero). */
export const ALFA_PERSONAL = 0.16

export type DiaPersonalConId = DiaPersonal & { id: string }

function rival(p: Partido) {
  return p.rival?.nombre_corto || p.rival?.nombre || 'Rival'
}

function hora(h?: string | null) {
  return h ? h.slice(0, 5) : ''
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
  /** El día lo pinta un día personalizado. */
  personal?: boolean
}

/** Reglas de barra + relleno de un día. El partido manda, luego las sesiones, luego el día personalizado. */
export function aspectoDia(opts: {
  sesiones: Sesion[]
  partidos: Partido[]
  fecha: string
  semana?: { lunes: string; domingo: string }
  personal?: DiaPersonal | null
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
  if (!sesiones.length && opts.personal) {
    const c = hslColorDia(opts.personal.color)
    return { barra: c, relleno: tinte(c, ALFA_PERSONAL), contorno: null, md: null, personal: true }
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
  personal?: DiaPersonal | null
  esHoy?: boolean
}): string {
  const d = new Date(opts.fecha + 'T12:00:00')
  const partes = [`${opts.esHoy ? 'Hoy, ' : ''}${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`]
  if (opts.personal) partes.push(opts.personal.texto)
  for (const p of opts.partidos) {
    const r = resultadoPartido(p.goles_favor, p.goles_contra)
    partes.push(
      [
        `Partido ${p.localia === 'local' ? 'en casa' : p.localia === 'visitante' ? 'fuera' : ''} contra ${rival(p)}`,
        p.jornada ? `jornada ${p.jornada}` : '',
        p.hora ? `a las ${hora(p.hora)}` : '',
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
    partes.push(`Sesión ${n ? `${n} ` : ''}${s.titulo}${s.hora ? ` a las ${hora(s.hora)}` : ''}, ${textoEstadoSesion(s.estado)}`)
  }
  if (opts.descanso) partes.push('Descanso')
  if (partes.length === 1) partes.push('sin actividad')
  return partes.join('. ')
}

/** Capa de relleno + barra superior + contorno (+ trama de descanso). Va dentro de un contenedor `relative`. */
export function FondoDia({ aspecto, grosor = 3, descanso }: { aspecto: AspectoDia; grosor?: number; descanso?: boolean }) {
  return (
    <>
      {descanso && !aspecto.barra && (
        <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit]" style={TRAMA_DESCANSO} />
      )}
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

/** Marco de hoy: 2 px en tinta alrededor de toda la celda. */
export function MarcoHoy() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[3] outline outline-2 outline-offset-[-2px] outline-[hsl(var(--line))]"
    />
  )
}

/** Escudo del rival como marca de agua nítida, recortado por el borde de la celda. */
export function MarcaEscudo({ partido: p, tam = 72, className }: { partido: Partido; tam?: number; className?: string }) {
  const nombre = p.rival?.nombre || p.rival?.nombre_corto || 'Rival'
  const iniciales = nombre
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      <span
        className={cn(
          'absolute flex items-center justify-center opacity-[0.3] transition-opacity duration-150 ease-sale group-hover:opacity-[0.45] motion-reduce:transition-none',
          className
        )}
        style={{ width: tam, height: tam, right: -Math.round(tam * 0.16), bottom: -Math.round(tam * 0.18) }}
      >
        {p.rival?.escudo_url ? (
          <Image src={p.rival.escudo_url} alt="" width={tam} height={tam} unoptimized className="h-full w-full object-contain" />
        ) : (
          <span className="font-bold leading-none tracking-tight text-foreground/40" style={{ fontSize: Math.round(tam * 0.42) }}>
            {iniciales}
          </span>
        )}
      </span>
    </span>
  )
}

/** Cuadradito de color (MD o día personalizado). */
export function Muestra({ canales, className }: { canales: string; className?: string }) {
  return <span aria-hidden className={cn('inline-block h-2 w-2 flex-none', className)} style={{ backgroundColor: solido(canales) }} />
}

// ---------------------------------------------------------------------------
// Líneas reutilizadas por la vista semana
// ---------------------------------------------------------------------------

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
  return (
    <Link
      href={`/sesiones/${s.id}`}
      onClick={onClick}
      aria-label={`Sesión ${n ? `${n} ` : ''}${s.titulo}${s.hora ? `, ${hora(s.hora)}` : ''}${md ? `, ${md}` : ''}, ${textoEstadoSesion(s.estado)}`}
      title={[n, hora(s.hora), s.titulo, md, textoEstadoSesion(s.estado)].filter(Boolean).join(' · ')}
      className={cn('group/ses block min-w-0 rounded-[var(--radius)] text-foreground', FOCO, className)}
    >
      {compacta ? (
        <span className="flex min-w-0 items-baseline gap-1.5 text-[11.5px] leading-[16px]">
          {n && <span className="flex-none font-mono text-[11px] font-bold tabular-nums">{n}</span>}
          {s.hora && <span className="flex-none tabular-nums text-muted-foreground">{hora(s.hora)}</span>}
          <span className={cn('min-w-0 truncate font-medium group-hover/ses:underline', cancelada && 'text-muted-foreground line-through')}>
            {s.titulo}
          </span>
          {completada && marcarCompletada !== false && (
            <Check aria-hidden className="ml-auto h-3 w-3 flex-none self-center" strokeWidth={2.5} />
          )}
        </span>
      ) : (
        <>
          <span className="flex min-w-0 items-baseline gap-1.5 text-[11px] leading-[15px]">
            {n && <span className="flex-none font-mono font-bold tabular-nums">{n}</span>}
            {s.hora && <span className="flex-none tabular-nums text-muted-foreground">{hora(s.hora)}</span>}
            {s.estado === 'borrador' && <span className="truncate text-muted-foreground">borrador</span>}
            {cancelada && <span className="truncate text-muted-foreground">cancelada</span>}
            {completada && marcarCompletada !== false && (
              <Check aria-label="completada" className="ml-auto h-3 w-3 flex-none self-center" strokeWidth={2.5} />
            )}
          </span>
          <span
            className={cn(
              'mt-px line-clamp-2 break-words text-[12.5px] font-medium leading-[16px] group-hover/ses:underline',
              cancelada && 'text-muted-foreground line-through'
            )}
          >
            {s.titulo}
          </span>
        </>
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
  const localia = p.localia === 'local' ? 'en casa' : p.localia === 'visitante' ? 'fuera' : 'campo neutral'
  return (
    <Link
      href={href ?? `/partidos?match=${p.id}`}
      onClick={onClick}
      aria-label={`Partido ${localia} contra ${rival(p)}${p.jornada ? `, jornada ${p.jornada}` : ''}${
        r ? `, ${r.marcador} ${r.texto}` : p.hora ? `, ${hora(p.hora)}` : ''
      }`}
      className={cn('group/par block min-w-0 rounded-[var(--radius)] text-foreground', FOCO, className)}
    >
      <span className="flex min-w-0 items-center gap-1 text-[12.5px] font-semibold leading-[16px]">
        <Localia valor={p.localia} className="text-[12px]" />
        <span className="truncate group-hover/par:underline">{rival(p)}</span>
      </span>
      <span className="mt-0.5 flex min-w-0 items-baseline gap-1.5 whitespace-nowrap text-[11px] leading-[15px] tabular-nums">
        {r ? (
          <>
            <span className="font-mono text-[12px] font-bold text-foreground">{r.marcador}</span>
            <span
              className={cn(
                'font-mono font-bold',
                r.marca === 'V' ? 'text-success' : r.marca === 'D' ? 'text-destructive' : 'text-muted-foreground'
              )}
            >
              {r.marca}
            </span>
          </>
        ) : p.hora ? (
          <span className="font-semibold text-foreground">{hora(p.hora)}</span>
        ) : null}
        {p.jornada ? <span className="font-mono text-muted-foreground">J{p.jornada}</span> : null}
      </span>
    </Link>
  )
}

/** Descanso con diseño propio: luna + palabra, sobre la trama del día. */
export function DescansoCal({ onQuitar, className }: { onQuitar?: () => void; className?: string }) {
  return (
    <span className={cn('flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground', className)}>
      <span aria-hidden className="inline-flex h-5 w-5 flex-none items-center justify-center rounded-full border-[1.5px] border-current">
        <Moon className="h-3 w-3" strokeWidth={2} />
      </span>
      <span>Descanso</span>
      {onQuitar && (
        <button
          type="button"
          className={cn(
            'pointer-events-auto ml-auto rounded-[var(--radius)] p-0.5 opacity-0 transition-opacity duration-150 hover:bg-card focus-visible:opacity-100 group-hover:opacity-100 motion-reduce:transition-none',
            FOCO
          )}
          onClick={(e) => {
            e.stopPropagation()
            onQuitar()
          }}
          title="Quitar descanso"
          aria-label="Quitar descanso"
        >
          <X aria-hidden className="h-3 w-3" />
        </button>
      )}
    </span>
  )
}

/** Texto del día personalizado. `discreto` = como etiqueta junto a otro contenido. */
export function NotaDiaCal({ dia, discreto, className }: { dia: DiaPersonal; discreto?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        'flex min-w-0 items-center gap-1.5 text-foreground',
        discreto ? 'text-[11px] font-medium' : 'text-[12.5px] font-semibold leading-[16px]',
        className
      )}
      title={dia.texto}
    >
      <Muestra canales={hslColorDia(dia.color)} className={discreto ? 'h-1.5 w-1.5' : 'h-2.5 w-2.5'} />
      <span className="truncate">{dia.texto}</span>
    </span>
  )
}

// ---------------------------------------------------------------------------
// Menú y editor del día
// ---------------------------------------------------------------------------

/** Menú "añadir al día" (mismas acciones que el aspecto clásico, con "Otro" real). */
export function MenuAnadirDia({
  fecha,
  esDescanso,
  personal,
  abreArriba,
  onClose,
  onNavigate,
  onToggleDescanso,
  onOtro,
}: {
  fecha: string
  esDescanso: boolean
  personal?: DiaPersonal | null
  abreArriba?: boolean
  onClose: () => void
  onNavigate: (path: string) => void
  onToggleDescanso: () => void
  /** Abre el editor de nota del día. */
  onOtro?: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('button')?.focus()
  }, [])
  const item =
    'flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] text-foreground hover:bg-sunken focus-visible:bg-sunken focus-visible:outline-none'
  const icono = 'h-3.5 w-3.5 flex-none text-muted-foreground'
  const mover = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
      return
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('[role=menuitem]') ?? [])
    const i = items.indexOf(document.activeElement as HTMLElement)
    items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus()
  }
  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Añadir al día"
      onKeyDown={mover}
      className={cn(
        'absolute right-1 z-50 w-48 max-w-[calc(100vw-2rem)] rounded-[var(--radius)] border-[1.5px] border-line bg-popover py-1',
        abreArriba ? 'bottom-8' : 'top-8'
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <button role="menuitem" className={item} onClick={() => { onClose(); onNavigate(`/sesiones/nueva?fecha=${fecha}`) }}>
        <ClipboardList aria-hidden className={icono} />
        <span>Nueva sesión</span>
      </button>
      <button role="menuitem" className={item} onClick={() => { onClose(); onNavigate(`/partidos/nuevo?fecha=${fecha}`) }}>
        <Swords aria-hidden className={icono} />
        <span>Partido</span>
      </button>
      <button role="menuitem" className={item} onClick={() => { onClose(); onToggleDescanso() }}>
        <Moon aria-hidden className={icono} />
        <span>{esDescanso ? 'Quitar descanso' : 'Descanso'}</span>
      </button>
      {onOtro && (
        <>
          <span aria-hidden className="my-1 block border-t border-border" />
          <button role="menuitem" className={item} onClick={() => { onClose(); onOtro() }}>
            {personal ? <PenLine aria-hidden className={icono} /> : <Tag aria-hidden className={icono} />}
            <span className="min-w-0 flex-1 truncate">{personal ? 'Editar nota' : 'Otro…'}</span>
            {personal && <Muestra canales={hslColorDia(personal.color)} />}
          </button>
        </>
      )}
    </div>
  )
}

/**
 * Editor del día personalizado: texto corto (máx. 18) + color de la paleta.
 * Enter guarda, Esc cierra. Flechas mueven entre colores.
 */
export function EditorDiaPersonal({
  inicial,
  abreArriba,
  alinear = 'derecha',
  flotante = true,
  onGuardar,
  onQuitar,
  onClose,
}: {
  inicial?: DiaPersonal | null
  abreArriba?: boolean
  alinear?: 'derecha' | 'izquierda'
  /** false = dentro del flujo (p. ej. en el panel del día), sin cerrar al hacer clic fuera. */
  flotante?: boolean
  onGuardar: (dia: DiaPersonal) => void
  onQuitar?: () => void
  onClose: () => void
}) {
  const [texto, setTexto] = useState(inicial?.texto ?? '')
  const [color, setColor] = useState<ClaveColorDia>(inicial?.color ?? COLOR_POR_DEFECTO)
  const input = useRef<HTMLInputElement>(null)
  const idTexto = useId()
  const raiz = useRef<HTMLFormElement>(null)
  const limpio = normalizarTexto(texto)
  const largo = Array.from(texto).length

  useEffect(() => {
    input.current?.focus()
    input.current?.select()
    if (!flotante) return
    const fuera = (e: MouseEvent) => {
      if (!raiz.current?.contains(e.target as Node)) onClose()
    }
    const t = setTimeout(() => document.addEventListener('mousedown', fuera), 0)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', fuera)
    }
  }, [onClose, flotante])

  const moverColor = (e: KeyboardEvent<HTMLDivElement>) => {
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!dir) return
    e.preventDefault()
    const i = PALETA_DIA.findIndex((p) => p.clave === color)
    const sig = PALETA_DIA[(i + dir + PALETA_DIA.length) % PALETA_DIA.length]
    setColor(sig.clave)
    raiz.current?.querySelector<HTMLElement>(`[data-color="${sig.clave}"]`)?.focus()
  }

  return (
    <form
      ref={raiz}
      role="dialog"
      aria-label={inicial ? 'Editar nota del día' : 'Nota del día'}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          onClose()
        }
      }}
      onSubmit={(e) => {
        e.preventDefault()
        if (limpio) onGuardar({ texto: limpio, color })
      }}
      className={cn(
        'cursor-default rounded-[var(--radius)] border-[1.5px] border-line bg-popover p-3 text-foreground',
        flotante && 'absolute z-50 w-60 max-w-[calc(100vw-2rem)]',
        flotante && (alinear === 'derecha' ? 'right-1' : 'left-1'),
        flotante && (abreArriba ? 'bottom-8' : 'top-8')
      )}
    >
      <label htmlFor={idTexto} className="cal-rotulo block text-[11px] text-muted-foreground">
        Nota del día
      </label>
      <div className="mt-1.5 flex items-center gap-2 border-b-[1.5px] border-line pb-1 focus-within:border-[hsl(var(--ring))]">
        <Muestra canales={hslColorDia(color)} className="h-3 w-3" />
        <input
          ref={input}
          id={idTexto}
          value={texto}
          maxLength={MAX_TEXTO}
          onChange={(e) => setTexto(Array.from(e.target.value).slice(0, MAX_TEXTO).join(''))}
          placeholder="Vacaciones"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:font-normal placeholder:text-muted-foreground"
        />
        <span
          className={cn('flex-none font-mono text-[10px] tabular-nums', largo >= MAX_TEXTO ? 'text-foreground' : 'text-muted-foreground')}
          aria-live="polite"
        >
          {largo}/{MAX_TEXTO}
        </span>
      </div>

      <div role="radiogroup" aria-label="Color" onKeyDown={moverColor} className="mt-3 flex items-center gap-1.5">
        {PALETA_DIA.map((p) => {
          const activo = p.clave === color
          return (
            <button
              key={p.clave}
              type="button"
              role="radio"
              aria-checked={activo}
              aria-label={p.nombre}
              title={p.nombre}
              data-color={p.clave}
              tabIndex={activo ? 0 : -1}
              onClick={() => setColor(p.clave)}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-[var(--radius)] outline-offset-1 transition-transform duration-rapido ease-sale active:scale-[0.94] motion-reduce:transition-none',
                activo ? 'outline outline-2 outline-[hsl(var(--line))]' : 'hover:outline hover:outline-1 hover:outline-border',
                FOCO
              )}
            >
              <span className="block h-5 w-5" style={{ backgroundColor: solido(p.hsl) }}>
                {activo && <Check aria-hidden className="h-5 w-5 p-0.5 text-white" strokeWidth={3} />}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex items-center gap-2">
        {onQuitar && (
          <button
            type="button"
            onClick={onQuitar}
            className={cn('rounded-[var(--radius)] px-1.5 py-1 text-xs text-muted-foreground hover:bg-sunken hover:text-foreground', FOCO)}
          >
            Quitar
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className={cn('ml-auto rounded-[var(--radius)] px-2 py-1 text-xs text-muted-foreground hover:bg-sunken hover:text-foreground', FOCO)}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!limpio}
          className={cn(
            'rounded-[var(--radius)] bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground transition-transform duration-rapido ease-sale active:scale-[0.97] disabled:opacity-40 motion-reduce:transition-none',
            FOCO
          )}
        >
          Guardar
        </button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Celda de la vista mes
// ---------------------------------------------------------------------------

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** Etiqueta pequeña a la derecha de la cabecera: MD con su muestra o jornada. */
function EtiquetaTipo({ aspecto, partido }: { aspecto: AspectoDia; partido?: Partido }) {
  if (partido) {
    return partido.jornada ? (
      <span className="font-mono text-[10.5px] font-semibold tabular-nums text-muted-foreground">J{partido.jornada}</span>
    ) : null
  }
  if (aspecto.md && esClaveMD(aspecto.md)) {
    return (
      <span className="inline-flex items-center gap-1 font-mono text-[10.5px] font-semibold tabular-nums text-muted-foreground" title={MD_NOMBRE[aspecto.md]}>
        <Muestra canales={MD_HSL[aspecto.md]} className="h-1.5 w-1.5" />
        {aspecto.md}
      </span>
    )
  }
  return null
}

export function DiaCal({
  fecha,
  dia,
  esHoy,
  enMes,
  esPasado,
  sesiones,
  partidos,
  descanso: descansoFila,
  personal,
  menuAbierto,
  menuAbreArriba,
  editorAbierto,
  alinearIzquierda,
  semana,
  onSelectDay,
  onToggleMenu,
  onCloseMenu,
  onNavigate,
  onToggleDescanso,
  onQuitarDescanso,
  onAbrirEditor,
  onCerrarEditor,
  onGuardarPersonal,
  onQuitarPersonal,
}: {
  fecha: string
  dia: number
  esHoy: boolean
  enMes: boolean
  esPasado: boolean
  sesiones: Sesion[]
  partidos: Partido[]
  descanso: boolean
  personal?: DiaPersonal | null
  menuAbierto: boolean
  menuAbreArriba: boolean
  editorAbierto?: boolean
  /** Ancla el editor al borde izquierdo (primeras columnas, para que no se salga de la tarjeta). */
  alinearIzquierda?: boolean
  semana: { lunes: string; domingo: string }
  onSelectDay: () => void
  onToggleMenu: () => void
  onCloseMenu: () => void
  onNavigate: (path: string) => void
  onToggleDescanso: () => void
  onQuitarDescanso?: () => void
  onAbrirEditor?: () => void
  onCerrarEditor?: () => void
  onGuardarPersonal?: (dia: DiaPersonal) => void
  onQuitarPersonal?: () => void
}) {
  // Un día personalizado no es descanso aunque venga de la tabla de descansos.
  const descanso = descansoFila && !personal
  const aspecto = aspectoDia({ sesiones, partidos, fecha, semana, personal })
  const etiqueta = nombreAccesibleDia({ fecha, sesiones, partidos, descanso, md: aspecto.md, personal, esHoy })
  const partido = partidos[0]
  const conPartido = partidos.length > 0
  const compactas = sesiones.length > 1 || conPartido || !!personal
  const visibles = conPartido ? sesiones.slice(0, 1) : sesiones.slice(0, 2)
  const ocultas = sesiones.length - visibles.length
  const vacio = !conPartido && !sesiones.length && !descanso && !personal
  const editable = !esPasado

  return (
    <div
      role="group"
      aria-label={etiqueta}
      className={cn(
        'group relative flex min-h-[78px] flex-col border-b border-r p-1.5 pt-2 last:border-r-0 md:min-h-[104px] lg:min-h-0',
        enMes ? 'bg-card' : 'bg-sunken'
      )}
    >
      <FondoDia aspecto={aspecto} descanso={descanso} />
      {partido && <MarcaEscudo partido={partido} />}

      {/* Toda la celda abre el día: botón estirado debajo del contenido. */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onCloseMenu()
          onSelectDay()
        }}
        aria-label={`Abrir ${etiqueta.split('.')[0]}`}
        aria-current={esHoy ? 'date' : undefined}
        className="peer absolute inset-0 z-[1] cursor-pointer rounded-[inherit] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
      />
      {/* Pista de interacción: marco fino al pasar y más marcado al pulsar. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[2] outline outline-[1.5px] outline-offset-[-1.5px] outline-[hsl(var(--foreground)/0.22)] opacity-0 transition-opacity duration-150 ease-sale group-hover:opacity-100 peer-active:opacity-100 peer-active:outline-[hsl(var(--foreground)/0.45)] motion-reduce:transition-none"
      />
      {esHoy && <MarcoHoy />}

      <div className={cn('pointer-events-none relative z-[2] flex h-5 items-center gap-1.5', !enMes && 'opacity-60')}>
        <span
          className={cn(
            'inline-flex h-5 min-w-5 items-center justify-center gap-0.5 rounded-[var(--radius)] px-1 text-[13px] font-semibold leading-none tabular-nums',
            esHoy
              ? 'border-[1.5px] border-line font-bold text-foreground'
              : !enMes || esPasado
                ? 'text-muted-foreground'
                : 'text-foreground'
          )}
        >
          {dia}
          {!enMes && !esHoy && (
            <span className="text-[8px] font-semibold uppercase">{MESES_CORTOS[Number(fecha.slice(5, 7)) - 1]}</span>
          )}
        </span>
        {esHoy && <span className="cal-rotulo text-[10.5px] leading-none text-foreground">Hoy</span>}
        <span className="ml-auto flex items-center gap-1">
          <EtiquetaTipo aspecto={aspecto} partido={partido} />
          {editable && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onCerrarEditor?.()
                onToggleMenu()
              }}
              className={cn(
                'pointer-events-auto -mr-0.5 inline-flex h-6 w-6 items-center justify-center rounded-[var(--radius)] border-[1.5px] transition-opacity duration-150 ease-sale motion-reduce:transition-none',
                FOCO,
                menuAbierto || editorAbierto
                  ? 'border-line bg-card opacity-100'
                  : 'border-transparent opacity-0 hover:border-line hover:bg-card focus-visible:opacity-100 group-hover:opacity-100'
              )}
              title="Añadir al día"
              aria-label={`Añadir al ${etiqueta.split('.')[0]}`}
              aria-haspopup="menu"
              aria-expanded={menuAbierto}
            >
              <Plus aria-hidden className="h-3.5 w-3.5 text-foreground" strokeWidth={2} />
            </button>
          )}
        </span>
      </div>

      {menuAbierto && (
        <MenuAnadirDia
          fecha={fecha}
          esDescanso={descanso}
          personal={personal}
          abreArriba={menuAbreArriba}
          onClose={onCloseMenu}
          onNavigate={onNavigate}
          onToggleDescanso={onToggleDescanso}
          onOtro={onAbrirEditor}
        />
      )}
      {editorAbierto && onGuardarPersonal && onCerrarEditor && (
        <EditorDiaPersonal
          inicial={personal}
          abreArriba={menuAbreArriba}
          alinear={alinearIzquierda ? 'izquierda' : 'derecha'}
          onGuardar={onGuardarPersonal}
          onQuitar={personal ? onQuitarPersonal : undefined}
          onClose={onCerrarEditor}
        />
      )}

      <div
        className={cn(
          'pointer-events-none relative z-[2] mt-1 flex min-h-0 flex-1 flex-col gap-1 overflow-hidden [&_a]:pointer-events-auto',
          !enMes && 'opacity-60'
        )}
      >
        {personal && (conPartido || sesiones.length > 0) && <NotaDiaCal dia={personal} discreto />}
        {partidos.map((p) => (
          <LineaPartidoCal key={p.id} partido={p} className="pr-8" onClick={(e) => e.stopPropagation()} />
        ))}
        {visibles.map((s) => (
          <LineaSesionCal key={s.id} sesion={s} compacta={compactas} onClick={(e) => e.stopPropagation()} />
        ))}
        {ocultas > 0 && (
          <span className="text-[10.5px] font-medium tabular-nums text-muted-foreground">
            +{ocultas} {ocultas === 1 ? 'sesión' : 'sesiones'}
          </span>
        )}
        {personal && !conPartido && !sesiones.length && (
          <span className="flex flex-1 items-center">
            <NotaDiaCal dia={personal} />
          </span>
        )}
        {descanso && (
          <span className="flex flex-1 items-center">
            <DescansoCal onQuitar={editable ? onQuitarDescanso : undefined} className="w-full" />
          </span>
        )}
        {vacio && editable && (
          <span
            aria-hidden
            className="flex flex-1 items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground opacity-0 transition-opacity duration-150 ease-sale group-hover:opacity-100 motion-reduce:transition-none"
          >
            <Plus className="h-3 w-3" /> Ver o añadir
          </span>
        )}
      </div>
    </div>
  )
}
