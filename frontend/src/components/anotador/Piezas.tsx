'use client'

import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Piezas base del anotador: todo con tokens Cal, línea de 1,5 px y 48 px mínimo de toque. */

export const PULSAR =
  'transition-transform duration-rapido ease-sale active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:active:scale-100'

type Variante = 'primario' | 'secundario' | 'contorno' | 'peligro' | 'fantasma'

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-primary text-primary-foreground border-primary',
  secundario: 'bg-secondary text-secondary-foreground border-border',
  contorno: 'bg-transparent text-foreground border-line',
  peligro: 'bg-transparent text-destructive border-destructive',
  fantasma: 'bg-transparent text-foreground border-transparent',
}

interface BotonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  grande?: boolean
}

export function Boton({ variante = 'secundario', grande, className, type = 'button', ...rest }: BotonProps) {
  return (
    <button
      type={type}
      {...rest}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg border-[1.5px] px-4 text-base font-semibold',
        grande ? 'min-h-14' : 'min-h-12',
        'disabled:opacity-45 disabled:cursor-not-allowed',
        PULSAR,
        VARIANTES[variante],
        className,
      )}
    />
  )
}

interface ChipProps {
  activo?: boolean
  onClick: () => void
  children: ReactNode
  className?: string
  disabled?: boolean
  'aria-label'?: string
}

/** Opción de una lista corta (tipo de gol, zona, dorsal reciente). 48 px. */
export function Chip({ activo, onClick, children, className, disabled, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={activo}
      aria-label={rest['aria-label']}
      className={cn(
        'inline-flex min-h-12 min-w-12 items-center justify-center rounded-lg border-[1.5px] px-3.5 text-[15px] font-semibold',
        activo ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-secondary text-secondary-foreground',
        'disabled:opacity-45',
        PULSAR,
        className,
      )}
    >
      {children}
    </button>
  )
}

export function Rotulo({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn('text-sm font-semibold text-muted-foreground', className)}
      style={{ fontStretch: '75%', letterSpacing: '0.04em' }}
    >
      {children}
    </p>
  )
}

interface SegmentadoProps<T extends string | number> {
  valor: T
  opciones: { valor: T; etiqueta: ReactNode }[]
  onChange: (v: T) => void
  className?: string
  etiqueta: string
}

export function Segmentado<T extends string | number>({ valor, opciones, onChange, className, etiqueta }: SegmentadoProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={etiqueta}
      className={cn('grid min-h-12 overflow-hidden rounded-lg border-[1.5px] border-line', className)}
      style={{ gridTemplateColumns: `repeat(${opciones.length}, minmax(0, 1fr))` }}
    >
      {opciones.map((o) => {
        const on = o.valor === valor
        return (
          <button
            key={String(o.valor)}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.valor)}
            className={cn(
              'min-h-[45px] px-3 text-[15px] font-semibold',
              on ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground',
              PULSAR,
            )}
          >
            {o.etiqueta}
          </button>
        )
      })}
    </div>
  )
}

/** Contador con − y + de 56 px. */
export function Paso({
  valor, onDelta, etiqueta, bloqueado, sufijo = '',
}: { valor: number; onDelta: (d: number) => void; etiqueta: string; bloqueado?: boolean; sufijo?: string }) {
  if (bloqueado) {
    return (
      <div className="flex min-h-14 items-center justify-center rounded-lg border-[1.5px] border-border bg-sunken text-xl font-bold tabular-nums">
        {valor}
      </div>
    )
  }
  return (
    <div className="grid min-h-14 grid-cols-[56px_1fr_56px] overflow-hidden rounded-lg border-[1.5px] border-line">
      <button type="button" aria-label={`Restar ${etiqueta}`} onClick={() => onDelta(-1)} className={cn('bg-card text-2xl font-semibold', PULSAR)}>−</button>
      <span className="flex items-center justify-center text-xl font-bold tabular-nums">{valor}{sufijo}</span>
      <button type="button" aria-label={`Sumar ${etiqueta}`} onClick={() => onDelta(1)} className={cn('bg-secondary text-2xl font-semibold', PULSAR)}>+</button>
    </div>
  )
}

/**
 * Botón que hay que mantener pulsado (acciones difíciles de revertir).
 * El relleno avanza con `transform` y termina a los 900 ms.
 */
export function BotonMantener({
  children, onConfirmar, className, variante = 'peligro', ms = 900,
}: { children: ReactNode; onConfirmar: () => void; className?: string; variante?: Variante; ms?: number }) {
  const [activo, setActivo] = useState(false)
  const timer = useRef<number | null>(null)
  const limpiar = () => {
    if (timer.current != null) window.clearTimeout(timer.current)
    timer.current = null
    setActivo(false)
  }
  useEffect(() => limpiar, [])
  const empezar = () => {
    setActivo(true)
    timer.current = window.setTimeout(() => {
      timer.current = null
      setActivo(false)
      onConfirmar()
    }, ms)
  }
  return (
    <button
      type="button"
      onPointerDown={empezar}
      onPointerUp={limpiar}
      onPointerLeave={limpiar}
      onPointerCancel={limpiar}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) empezar() }}
      onKeyUp={limpiar}
      onContextMenu={(e) => e.preventDefault()}
      className={cn(
        'relative inline-flex min-h-12 select-none items-center justify-center overflow-hidden rounded-lg border-[1.5px] px-4 text-base font-semibold',
        VARIANTES[variante],
        PULSAR,
        className,
      )}
    >
      <span
        aria-hidden
        className="absolute inset-0 origin-left bg-destructive/25"
        style={{
          transform: activo ? 'scaleX(1)' : 'scaleX(0)',
          transition: activo ? `transform ${ms}ms linear` : 'transform 120ms cubic-bezier(0.2,0,0,1)',
        }}
      />
      <span className="relative">{children}</span>
      <span className="sr-only"> (mantén pulsado)</span>
    </button>
  )
}

/** Montaje con salida animada: devuelve si pintar y si está visible. */
export function useMontaje(abierta: boolean, ms = 180) {
  const [montado, setMontado] = useState(abierta)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (abierta) {
      setMontado(true)
      const id = window.requestAnimationFrame(() => window.requestAnimationFrame(() => setVisible(true)))
      return () => window.cancelAnimationFrame(id)
    }
    setVisible(false)
    const t = window.setTimeout(() => setMontado(false), ms)
    return () => window.clearTimeout(t)
  }, [abierta, ms])
  return { montado, visible }
}

interface HojaProps {
  abierta: boolean
  onCerrar: () => void
  titulo: ReactNode
  /** modal: pantalla completa con velo. local: anclada abajo dentro del contenedor relativo (deja libre el resto). */
  modo?: 'modal' | 'local'
  lado?: 'abajo' | 'derecha'
  ancho?: number
  children: ReactNode
  pie?: ReactNode
  acciones?: ReactNode
  className?: string
}

export function Hoja({
  abierta, onCerrar, titulo, modo = 'modal', lado = 'abajo', ancho = 760, children, pie, acciones, className,
}: HojaProps) {
  const { montado, visible } = useMontaje(abierta, 180)
  useEffect(() => {
    if (!abierta) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [abierta, onCerrar])
  if (!montado) return null
  const derecha = lado === 'derecha'
  const ocultoTransform = derecha ? 'translateX(100%)' : 'translateY(100%)'
  return (
    <div
      className={cn(
        modo === 'modal' ? 'fixed inset-0 z-40' : 'absolute inset-0 z-30 pointer-events-none',
      )}
    >
      {modo === 'modal' && (
        <button
          type="button"
          aria-label="Cerrar"
          tabIndex={-1}
          onClick={onCerrar}
          className="absolute inset-0 bg-background/70 transition-opacity duration-base ease-sale motion-reduce:transition-none"
          style={{ opacity: visible ? 1 : 0 }}
        />
      )}
      <section
        role="dialog"
        aria-modal={modo === 'modal'}
        aria-label={typeof titulo === 'string' ? titulo : undefined}
        className={cn(
          'pointer-events-auto absolute flex flex-col border-line bg-card text-card-foreground',
          derecha
            ? 'bottom-0 right-0 top-0 border-l-[1.5px]'
            : 'inset-x-0 bottom-0 mx-auto max-h-[80dvh] w-full rounded-t-lg border-[1.5px] border-b-0',
          className,
        )}
        style={{
          maxWidth: derecha ? undefined : ancho,
          width: derecha ? ancho : undefined,
          transform: visible ? 'translate(0,0)' : ocultoTransform,
          transition: `transform ${visible ? 260 : 180}ms cubic-bezier(0.2,0,0,1)`,
        }}
      >
        <header className="flex min-h-[60px] shrink-0 items-center gap-3 border-b-[1.5px] border-border px-4">
          <h2 className="min-w-0 flex-1 truncate text-lg font-bold" style={{ fontStretch: '112%' }}>{titulo}</h2>
          {acciones}
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border-[1.5px] border-border bg-secondary', PULSAR)}
          >
            <X className="h-6 w-6" strokeWidth={1.5} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">{children}</div>
        {pie && <footer className="shrink-0 border-t-[1.5px] border-border px-4 py-3">{pie}</footer>}
      </section>
    </div>
  )
}
