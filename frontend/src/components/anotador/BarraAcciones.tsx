'use client'

import type { ReactNode } from 'react'
import { Undo2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { IconoBalon, IconoCambio, IconoCorner, IconoFalta, IconoMas, IconoTarjeta } from './Iconos'
import { PULSAR, Segmentado } from './Piezas'
import type { AccionArmada } from './emparejamiento'

export type AccionSimple = 'corner' | 'falta'

interface BarraProps {
  armada: AccionArmada
  rival: boolean
  onRival: (r: boolean) => void
  /** Hay jugador seleccionado: la acción se ejecuta al instante. */
  hayJugador: boolean
  cambioListo: boolean
  onGol: () => void
  onGolRival: () => void
  onAmarilla: () => void
  onRoja: () => void
  onCambio: () => void
  onCorner: () => void
  onFalta: () => void
  onMas: () => void
  ultimo: string | null
  onDeshacer: () => void
  puedeDeshacer: boolean
}

function Accion({
  icono, etiqueta, onClick, activo, primario, className, sub,
}: {
  icono: ReactNode
  etiqueta: string
  onClick: () => void
  activo?: boolean
  primario?: boolean
  className?: string
  sub?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={cn(
        'flex min-h-14 items-center justify-center gap-2 rounded-lg border-[1.5px] px-2 text-[16px] font-bold leading-tight',
        primario
          ? 'border-primary bg-primary text-primary-foreground'
          : activo
            ? 'border-foreground bg-foreground text-background'
            : 'border-line bg-card text-foreground',
        PULSAR,
        className,
      )}
    >
      <span className="shrink-0">{icono}</span>
      <span className="text-left">
        {etiqueta}
        {sub && <span className="block text-[14px] font-medium opacity-80">{sub}</span>}
      </span>
    </button>
  )
}

export function BarraAcciones(p: BarraProps) {
  const sufijo = p.rival ? ' rival' : ''
  return (
    <aside
      aria-label="Acciones del partido"
      className="grid shrink-0 grid-cols-2 content-start gap-2 overflow-y-auto landscape:w-[244px] portrait:w-full portrait:grid-cols-4"
    >
      <Accion
        primario
        icono={<IconoBalon size={26} />}
        etiqueta="Gol"
        sub={p.armada === 'gol' ? 'Toca al goleador' : undefined}
        activo={p.armada === 'gol'}
        onClick={p.onGol}
        className="min-h-16 text-xl landscape:order-1 landscape:col-span-2"
      />
      <Accion
        icono={<IconoBalon size={24} />}
        etiqueta="Gol rival"
        onClick={p.onGolRival}
        className="min-h-16 landscape:order-2 landscape:col-span-2"
      />
      <Accion
        icono={<IconoCambio size={24} />}
        etiqueta={p.cambioListo ? 'Confirmar cambio' : 'Cambio'}
        sub={p.armada === 'cambio' ? (p.hayJugador ? 'Toca al suplente' : 'Toca al que sale') : undefined}
        activo={p.armada === 'cambio' || p.cambioListo}
        onClick={p.onCambio}
        className="min-h-16 landscape:order-[8] landscape:min-h-14"
      />
      <Accion
        icono={<IconoMas size={26} />}
        etiqueta="Más"
        sub="Ocasiones, stats"
        onClick={p.onMas}
        className="min-h-16 landscape:order-[9] landscape:min-h-14"
      />
      <Segmentado
        etiqueta="Equipo de la acción"
        valor={p.rival ? 'rival' : 'nos'}
        onChange={(v) => p.onRival(v === 'rival')}
        className="col-span-2 portrait:col-span-4 landscape:order-3"
        opciones={[
          { valor: 'nos', etiqueta: 'Nosotros' },
          { valor: 'rival', etiqueta: 'Rival' },
        ]}
      />
      <Accion
        icono={<IconoTarjeta tipo="amarilla" size={26} />}
        etiqueta={`Amarilla${sufijo}`}
        activo={p.armada === 'amarilla'}
        onClick={p.onAmarilla}
        className="landscape:order-4"
      />
      <Accion
        icono={<IconoTarjeta tipo="roja" size={26} />}
        etiqueta={`Roja${sufijo}`}
        activo={p.armada === 'roja'}
        onClick={p.onRoja}
        className="landscape:order-5"
      />
      <Accion icono={<IconoCorner size={24} />} etiqueta={`Córner${sufijo}`} onClick={p.onCorner} className="landscape:order-6" />
      <Accion icono={<IconoFalta size={24} />} etiqueta={`Falta${sufijo}`} onClick={p.onFalta} className="landscape:order-7" />

      <div className="col-span-2 flex items-stretch gap-2 rounded-lg border-[1.5px] border-border bg-sunken p-2 portrait:col-span-4 landscape:order-10">
        <div className="min-w-0 flex-1 self-center">
          <p className="text-sm font-semibold text-muted-foreground">Último evento</p>
          <p className="truncate text-[15px] font-semibold tabular-nums">{p.ultimo || 'Todavía ninguno'}</p>
        </div>
        <button
          type="button"
          onClick={p.onDeshacer}
          disabled={!p.puedeDeshacer}
          className={cn(
            'flex min-h-12 shrink-0 items-center gap-1.5 rounded-lg border-[1.5px] border-line bg-card px-3 text-[15px] font-bold disabled:opacity-40',
            PULSAR,
          )}
        >
          <Undo2 className="h-5 w-5" strokeWidth={1.5} /> Deshacer
        </button>
      </div>
    </aside>
  )
}
