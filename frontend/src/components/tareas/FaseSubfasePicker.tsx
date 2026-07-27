'use client'

/**
 * Selector de fase de juego + subfases tipadas.
 * Al elegir ataque/defensa organizada se abren las subfases (y opciones).
 * Persistencia: principio_tactico = subfase, subprincipio_tactico = opción.
 */

import { FASES_JUEGO, subfasesForFase } from '@/lib/catalogos/canonico'
import { cn } from '@/lib/utils'

const selectClass =
  'flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'

export interface FaseSubfaseValue {
  fase_juego?: string
  principio_tactico?: string
  subprincipio_tactico?: string
}

interface FaseSubfasePickerProps {
  value: FaseSubfaseValue
  onChange: (patch: FaseSubfaseValue) => void
  className?: string
  /** Si true, solo muestra el bloque de subfases (fase ya fijada fuera). */
  hideFaseSelect?: boolean
}

export function FaseSubfasePicker({
  value,
  onChange,
  className,
  hideFaseSelect = false,
}: FaseSubfasePickerProps) {
  const catalog = subfasesForFase(value.fase_juego)
  const faseNombre =
    FASES_JUEGO.find((f) => f.codigo === value.fase_juego)?.nombre || value.fase_juego

  const setFase = (fase: string) => {
    onChange({
      fase_juego: fase || undefined,
      principio_tactico: undefined,
      subprincipio_tactico: undefined,
    })
  }

  const toggleSubfase = (codigo: string) => {
    const same = value.principio_tactico === codigo
    onChange({
      fase_juego: value.fase_juego,
      principio_tactico: same ? undefined : codigo,
      subprincipio_tactico: same ? undefined : undefined,
    })
  }

  const setOpcion = (subfase: string, opcion: string) => {
    onChange({
      fase_juego: value.fase_juego,
      principio_tactico: subfase,
      subprincipio_tactico: value.subprincipio_tactico === opcion ? undefined : opcion,
    })
  }

  return (
    <div className={cn('space-y-3', className)}>
      {!hideFaseSelect && (
        <div>
          <label className="text-sm font-medium mb-1.5 block">Fase de juego</label>
          <select
            className={selectClass}
            value={value.fase_juego || ''}
            onChange={(e) => setFase(e.target.value)}
          >
            <option value="">—</option>
            {FASES_JUEGO.map((f) => (
              <option key={f.codigo} value={f.codigo}>
                {f.nombre}
              </option>
            ))}
          </select>
        </div>
      )}

      {catalog && (
        <div className="rounded-xl border border-dashed border-primary/30 bg-primary/[0.03] p-3 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
          <p className="text-xs font-semibold text-primary">
            Subfases · {faseNombre}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {catalog.map((sf) => {
              const active = value.principio_tactico === sf.codigo
              return (
                <button
                  key={sf.codigo}
                  type="button"
                  onClick={() => toggleSubfase(sf.codigo)}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                    active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background hover:border-primary/50 hover:bg-primary/5'
                  )}
                >
                  {sf.nombre}
                </button>
              )
            })}
          </div>

          {catalog.map((sf) => {
            if (!sf.opciones?.length) return null
            if (value.principio_tactico !== sf.codigo) return null
            return (
              <div key={`${sf.codigo}-opts`} className="flex flex-wrap gap-1.5 pl-0.5 pt-1">
                <span className="text-[10px] text-muted-foreground self-center mr-1">
                  {sf.nombre}:
                </span>
                {sf.opciones.map((op) => {
                  const active = value.subprincipio_tactico === op.codigo
                  return (
                    <button
                      key={op.codigo}
                      type="button"
                      onClick={() => setOpcion(sf.codigo, op.codigo)}
                      className={cn(
                        'rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors',
                        active
                          ? 'border-primary/60 bg-primary/15 text-primary'
                          : 'border-border bg-background hover:bg-muted'
                      )}
                    >
                      {op.nombre}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
