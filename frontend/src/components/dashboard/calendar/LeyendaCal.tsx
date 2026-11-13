'use client'

/**
 * Leyenda del calendario (Cal), generada desde `lib/calendarioColores.ts` y
 * `lib/diaPersonal.ts`. Plegada por defecto: un botón "Leyenda" abre un
 * panel pequeño. Casi no se mira, así que no ocupa sitio del calendario.
 */

import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown, Moon } from 'lucide-react'
import { Localia } from '@/components/ui/localia'
import { cn } from '@/lib/utils'
import { LOCALIA_HSL, MD_HSL, MD_NOMBRE, ORDEN_MD, solido, tinte } from '@/lib/calendarioColores'
import { PALETA_DIA } from '@/lib/diaPersonal'
import { TRAMA_DESCANSO } from './DiaCal'

function Barra({ canales }: { canales: string }) {
  return <span aria-hidden className="inline-block h-[3px] w-4 flex-none" style={{ backgroundColor: solido(canales) }} />
}

function Muestra({ children, style, className }: { children?: React.ReactNode; style?: React.CSSProperties; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('relative inline-flex h-4 w-6 flex-none items-center justify-center border border-border bg-card', className)}
      style={style}
    >
      {children}
    </span>
  )
}

function Fila({ children }: { children: React.ReactNode }) {
  return <li className="flex min-w-0 items-center gap-2">{children}</li>
}

/** Contenido de la leyenda. */
export function LeyendaCal({ className }: { className?: string }) {
  const muestra = MD_HSL['MD-3']
  return (
    <div role="note" aria-label="Leyenda del calendario" className={cn('grid gap-3 text-[12px] text-foreground sm:grid-cols-2', className)}>
      <section>
        <h3 className="cal-rotulo mb-1.5 text-[10.5px] text-muted-foreground">Barra superior · tipo de día</h3>
        <ul className="space-y-1">
          {ORDEN_MD.map((md) => (
            <Fila key={md}>
              <Barra canales={MD_HSL[md]} />
              <span className="w-10 font-mono text-[11px] font-semibold tabular-nums">{md}</span>
              <span className="text-muted-foreground">{MD_NOMBRE[md]}</span>
            </Fila>
          ))}
        </ul>
      </section>
      <section className="space-y-3">
        <div>
          <h3 className="cal-rotulo mb-1.5 text-[10.5px] text-muted-foreground">Partido · localía</h3>
          <ul className="space-y-1">
            <Fila>
              <Barra canales={LOCALIA_HSL.local} />
              <Localia valor="local" conTexto />
            </Fila>
            <Fila>
              <Barra canales={LOCALIA_HSL.visitante} />
              <Localia valor="visitante" conTexto />
            </Fila>
          </ul>
        </div>
        <div>
          <h3 className="cal-rotulo mb-1.5 text-[10.5px] text-muted-foreground">Estado y días</h3>
          <ul className="space-y-1">
            <Fila>
              <Muestra style={{ backgroundColor: tinte(muestra) }}>
                <Check className="h-3 w-3" strokeWidth={2.5} />
              </Muestra>
              Relleno: completada / jugado
            </Fila>
            <Fila>
              <Muestra />
              Sin relleno: planificada / por jugar
            </Fila>
            <Fila>
              <Muestra style={TRAMA_DESCANSO}>
                <Moon className="h-2.5 w-2.5 text-muted-foreground" />
              </Muestra>
              Descanso
            </Fila>
            <Fila>
              <span aria-hidden className="flex flex-none gap-px">
                {PALETA_DIA.slice(0, 3).map((p) => (
                  <span key={p.clave} className="h-4 w-2" style={{ backgroundColor: tinte(p.hsl, 0.5) }} />
                ))}
              </span>
              Nota del día (Otro…)
            </Fila>
            <Fila>
              <Muestra className="border-0 outline outline-2 outline-offset-[-2px] outline-[hsl(var(--line))]" />
              Hoy
            </Fila>
            <Fila>
              <Muestra className="bg-sunken" />
              Otro mes
            </Fila>
            <Fila>
              <span
                aria-hidden
                className="inline-flex h-4 w-6 flex-none items-center justify-center border-l-2 font-mono text-[8px] font-bold"
                style={{ borderLeftColor: solido(LOCALIA_HSL.local), backgroundColor: tinte(LOCALIA_HSL.local, 0.12) }}
              >
                46
              </span>
              Microciclo (abre la semana)
            </Fila>
          </ul>
        </div>
      </section>
    </div>
  )
}

/** Botón "Leyenda" con panel desplegable. */
export function BotonLeyendaCal({ className }: { className?: string }) {
  const [abierta, setAbierta] = useState(false)
  const raiz = useRef<HTMLDivElement>(null)
  const id = useId()

  useEffect(() => {
    if (!abierta) return
    const fuera = (e: MouseEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAbierta(false)
    }
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAbierta(false)
        raiz.current?.querySelector<HTMLElement>('button')?.focus()
      }
    }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('mousedown', fuera)
      document.removeEventListener('keydown', tecla)
    }
  }, [abierta])

  return (
    <div ref={raiz} className={cn('relative', className)}>
      <button
        type="button"
        aria-expanded={abierta}
        aria-controls={id}
        onClick={() => setAbierta((v) => !v)}
        className={cn(
          'inline-flex h-8 items-center gap-1 rounded-[var(--radius)] px-2 text-xs text-muted-foreground hover:bg-sunken hover:text-foreground',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring',
          abierta && 'bg-sunken text-foreground'
        )}
      >
        Leyenda
        <ChevronDown
          aria-hidden
          className={cn('h-3.5 w-3.5 transition-transform duration-150 ease-sale motion-reduce:transition-none', abierta && 'rotate-180')}
        />
      </button>
      {abierta && (
        <div
          id={id}
          className="absolute right-0 top-9 z-50 w-[min(30rem,calc(100vw-2rem))] rounded-[var(--radius)] border-[1.5px] border-line bg-popover p-3"
        >
          <LeyendaCal />
        </div>
      )}
    </div>
  )
}
