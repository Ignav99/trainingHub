'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { FichaJugador, type DatosFicha } from './FichaJugador'
import { giroFlechaAtaque, orientacionPara, posicionFicha, type Orientacion } from './geometria'
import { IconoFlecha } from './Iconos'
import { PULSAR } from './Piezas'

export interface HuecoCampo {
  id: string
  label: string
  top: string
  left: string
}

export interface FichaCampo extends DatosFicha {
  titular: boolean
  tarjeta: 'amarilla' | 'roja' | null
  goles: number
  minutos: number | null
}

interface CampoProps {
  huecos: HuecoCampo[]
  /** slotId → ficha en ese hueco. */
  ocupantes: Record<string, FichaCampo | undefined>
  dirRight: boolean
  mostrarFoto: boolean
  seleccionado: string | null
  sale: string | null
  candidatos: boolean
  pulsos: Record<string, number>
  /** Antes del saque: los huecos vacíos se pueden rellenar. */
  editandoOnce: boolean
  onToque: (hueco: HuecoCampo, convId: string | null) => void
}

export function useOrientacion(): Orientacion {
  const [o, setO] = useState<Orientacion>('horizontal')
  useEffect(() => {
    const calc = () => setO(orientacionPara(window.innerWidth, window.innerHeight))
    calc()
    window.addEventListener('resize', calc)
    window.addEventListener('orientationchange', calc)
    return () => {
      window.removeEventListener('resize', calc)
      window.removeEventListener('orientationchange', calc)
    }
  }, [])
  return o
}

export function Campo({
  huecos, ocupantes, dirRight, mostrarFoto, seleccionado, sale, candidatos, pulsos, editandoOnce,
  onToque,
}: CampoProps) {
  const o = useOrientacion()
  const horizontal = o === 'horizontal'
  const giro = giroFlechaAtaque(dirRight, o)
  const linea = { stroke: 'hsl(var(--line) / 0.55)', strokeWidth: 1.5, fill: 'none', vectorEffect: 'non-scaling-stroke' as const }

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border-[1.5px] border-line bg-card" data-campo>
      {/* Campo en línea Cal: un solo trazo, sin textura. */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={horizontal ? '0 0 105 68' : '0 0 68 105'}
        preserveAspectRatio="none"
        aria-hidden
      >
        {horizontal ? (
          <>
            <rect x="2" y="2" width="101" height="64" {...linea} />
            <line x1="52.5" y1="2" x2="52.5" y2="66" {...linea} />
            <ellipse cx="52.5" cy="34" rx="9.15" ry="9.15" {...linea} />
            <rect x="2" y="13.8" width="16.5" height="40.3" {...linea} />
            <rect x="86.5" y="13.8" width="16.5" height="40.3" {...linea} />
            <rect x="2" y="24.8" width="5.5" height="18.3" {...linea} />
            <rect x="97.5" y="24.8" width="5.5" height="18.3" {...linea} />
          </>
        ) : (
          <>
            <rect x="2" y="2" width="64" height="101" {...linea} />
            <line x1="2" y1="52.5" x2="66" y2="52.5" {...linea} />
            <ellipse cx="34" cy="52.5" rx="9.15" ry="9.15" {...linea} />
            <rect x="13.8" y="2" width="40.3" height="16.5" {...linea} />
            <rect x="13.8" y="86.5" width="40.3" height="16.5" {...linea} />
            <rect x="24.8" y="2" width="18.3" height="5.5" {...linea} />
            <rect x="24.8" y="97.5" width="18.3" height="5.5" {...linea} />
          </>
        )}
      </svg>

      {/* Franja de sentido de ataque: tres chevrones grandes que cruzan el campo. */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 flex items-center gap-1 text-foreground/25"
        style={{ transform: `translate(-50%, -50%) rotate(${giro}deg)` }}
        aria-hidden
      >
        {[0, 1, 2].map((i) => (
          <svg key={i} width="64" height="96" viewBox="0 0 64 96" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 8 48 48 16 88" />
          </svg>
        ))}
      </div>

      {huecos.map((h) => {
        const p = posicionFicha(h, dirRight, o)
        const ocupante = ocupantes[h.id]
        return (
          <div
            key={h.id}
            className="absolute z-[1]"
            style={{ left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -50%)' }}
          >
            {ocupante ? (
              <FichaJugador
                jugador={ocupante}
                mostrarFoto={mostrarFoto}
                titular={ocupante.titular}
                seleccionado={seleccionado === ocupante.id}
                rol={sale === ocupante.id ? 'sale' : null}
                candidato={candidatos}
                tarjeta={ocupante.tarjeta}
                goles={ocupante.goles}
                minutos={null}
                pulso={pulsos[ocupante.id] || 0}
                onClick={() => onToque(h, ocupante.id)}
              />
            ) : (
              <button
                type="button"
                onClick={() => onToque(h, null)}
                aria-label={`Hueco ${h.label} vacío`}
                className={cn(
                  'flex h-14 w-14 items-center justify-center rounded-full border-[1.5px] border-dashed border-foreground/70 bg-card text-[14px] font-bold text-muted-foreground',
                  editandoOnce && seleccionado ? 'outline outline-2 outline-offset-2 outline-primary' : '',
                  PULSAR,
                )}
              >
                {h.label}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** Control del sentido de ataque. Va en la franja sobre el campo, siempre visible. */
export function ControlSentido({ dirRight, onCambiar, nombreClub }: { dirRight: boolean; onCambiar: () => void; nombreClub: string }) {
  const o = useOrientacion()
  const horizontal = o === 'horizontal'
  const giro = giroFlechaAtaque(dirRight, o)
  return (
    <button
      type="button"
      onClick={onCambiar}
      className={cn('flex min-h-12 shrink-0 items-center gap-2 rounded-lg border-[1.5px] border-line bg-card px-3 text-[15px] font-semibold', PULSAR)}
      aria-label={`Sentido de ataque de ${nombreClub}. Pulsa para invertirlo`}
    >
      <span className="text-primary" style={{ transform: `rotate(${giro}deg)`, display: 'inline-flex' }}>
        <IconoFlecha size={22} />
      </span>
      Atacamos {horizontal ? (dirRight ? 'a la derecha' : 'a la izquierda') : (dirRight ? 'hacia arriba' : 'hacia abajo')}
      <span className="text-muted-foreground">· Invertir</span>
    </button>
  )
}
