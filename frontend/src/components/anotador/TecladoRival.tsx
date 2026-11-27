'use client'

import { useEffect, useState } from 'react'
import { Delete } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Boton, Chip, Hoja, PULSAR, Rotulo } from './Piezas'

interface Props {
  abierta: boolean
  titulo: string
  recientes: number[]
  /** Permitir guardar sin dorsal (goles, cualquier tarjeta). */
  permitirSinDorsal?: boolean
  onElegir: (dorsal: number | null) => void
  onQuitar: (dorsal: number) => void
  onCerrar: () => void
}

/** Teclado numérico grande para el dorsal rival. Un toque en un reciente ya lo elige. */
export function TecladoRival({ abierta, titulo, recientes, permitirSinDorsal = true, onElegir, onQuitar, onCerrar }: Props) {
  const [digitos, setDigitos] = useState('')
  const [editando, setEditando] = useState(false)
  useEffect(() => {
    if (abierta) { setDigitos(''); setEditando(false) }
  }, [abierta])
  const pulsar = (d: string) => setDigitos((v) => (v.length >= 2 ? v : v + d))
  const numero = digitos === '' ? null : parseInt(digitos, 10)

  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} modo="local" titulo={titulo} ancho={760}>
      <div className="grid gap-4 landscape:grid-cols-[1fr_300px] portrait:grid-cols-1">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Rotulo>Dorsales rivales de este partido</Rotulo>
            {recientes.length > 0 && (
              <button type="button" onClick={() => setEditando((v) => !v)} className={cn('min-h-12 px-2 text-[15px] font-semibold underline underline-offset-4', PULSAR)}>
                {editando ? 'Terminar' : 'Quitar de la lista'}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {recientes.length === 0 && <p className="text-[15px] text-muted-foreground">Aún no hay dorsales. Escribe uno en el teclado.</p>}
            {recientes.map((n) => (
              <Chip key={n} onClick={() => (editando ? onQuitar(n) : onElegir(n))} className={cn('min-w-14 text-xl', editando && 'border-destructive text-destructive')} aria-label={editando ? `Quitar dorsal ${n}` : `Dorsal ${n}`}>
                <span className="tabular-nums">{n}</span>
                {editando && <span aria-hidden> ×</span>}
              </Chip>
            ))}
          </div>
          {permitirSinDorsal && (
            <Boton onClick={() => onElegir(null)} className="w-full">No sé el dorsal</Boton>
          )}
        </div>

        <div>
          <div className="mb-2 flex min-h-14 items-center justify-center rounded-lg border-[1.5px] border-line bg-sunken text-4xl font-extrabold tabular-nums" aria-live="polite">
            {digitos || <span className="text-muted-foreground">Dorsal</span>}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
              <button key={d} type="button" onClick={() => pulsar(d)} className={cn('min-h-14 rounded-lg border-[1.5px] border-border bg-secondary text-2xl font-bold tabular-nums', PULSAR)}>{d}</button>
            ))}
            <button type="button" onClick={() => setDigitos((v) => v.slice(0, -1))} aria-label="Borrar" className={cn('flex min-h-14 items-center justify-center rounded-lg border-[1.5px] border-border bg-secondary', PULSAR)}>
              <Delete className="h-6 w-6" strokeWidth={1.5} />
            </button>
            <button type="button" onClick={() => pulsar('0')} className={cn('min-h-14 rounded-lg border-[1.5px] border-border bg-secondary text-2xl font-bold tabular-nums', PULSAR)}>0</button>
            <button
              type="button"
              disabled={numero == null}
              onClick={() => numero != null && onElegir(numero)}
              className={cn('min-h-14 rounded-lg border-[1.5px] border-primary bg-primary text-lg font-bold text-primary-foreground disabled:opacity-40', PULSAR)}
            >
              Listo
            </button>
          </div>
        </div>
      </div>
    </Hoja>
  )
}
