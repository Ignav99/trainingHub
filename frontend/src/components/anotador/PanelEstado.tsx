'use client'

import Link from 'next/link'
import { Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EstadoCierre } from './adaptadores'
import { EstadoEnvio } from './EstadoEnvio'
import { Boton, Rotulo, Segmentado, PULSAR } from './Piezas'

interface PreviaProps {
  formaciones: string[]
  formacion: string
  onFormacion: (n: string) => void
  llenos: number
  total: number
  mostrarFoto: boolean
  onMostrarFoto: (v: boolean) => void
  contexto: string
  onEmpezar: () => void
}

/** Columna de la previa: comprobar el once y empezar. */
export function PanelPrevia({
  formaciones, formacion, onFormacion, llenos, total, mostrarFoto, onMostrarFoto, contexto, onEmpezar,
}: PreviaProps) {
  const completo = llenos >= total
  return (
    <aside aria-label="Antes del partido" className="flex shrink-0 flex-col gap-3 overflow-y-auto landscape:w-[244px] portrait:w-full">
      <div className="rounded-lg border-[1.5px] border-line bg-card p-3">
        <Rotulo>Antes del saque</Rotulo>
        <p className="mt-1 text-[15px] text-muted-foreground">{contexto}</p>
      </div>

      <div className="rounded-lg border-[1.5px] border-border bg-card p-3">
        <Rotulo>Sistema</Rotulo>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {formaciones.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onFormacion(f)}
              aria-pressed={f === formacion}
              className={cn(
                'min-h-12 rounded-lg border-[1.5px] text-[15px] font-bold tabular-nums',
                f === formacion ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-secondary',
                PULSAR,
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border-[1.5px] border-border bg-card p-3">
        <Rotulo>Fichas</Rotulo>
        <Segmentado
          etiqueta="Mostrar fichas con"
          className="mt-2"
          valor={mostrarFoto ? 'foto' : 'dorsal'}
          onChange={(v) => onMostrarFoto(v === 'foto')}
          opciones={[{ valor: 'foto', etiqueta: 'Foto' }, { valor: 'dorsal', etiqueta: 'Dorsal' }]}
        />
      </div>

      <div className={cn('rounded-lg border-[1.5px] p-3', completo ? 'border-success' : 'border-warning')}>
        <p className="text-lg font-bold tabular-nums">{llenos} de {total} en el campo</p>
        <p className="text-[15px] text-muted-foreground">
          {completo
            ? 'El once está completo. Revisa el sentido de ataque.'
            : 'Toca un suplente y luego un hueco vacío para colocarlo. Entre dos del campo se intercambian.'}
        </p>
      </div>

      <Boton variante="primario" grande className="min-h-16 w-full text-xl" onClick={onEmpezar}>
        <Play className="h-6 w-6" strokeWidth={1.5} /> Empezar partido
      </Boton>
    </aside>
  )
}

interface CerradoProps {
  gf: number
  gc: number
  cierre: EstadoCierre | null
  onReintentar: () => void
  onResumen: () => void
  onReabrir: () => void
  hrefInforme: string
}

export function PanelCerrado({ gf, gc, cierre, onReintentar, onResumen, onReabrir, hrefInforme }: CerradoProps) {
  return (
    <aside aria-label="Partido cerrado" className="flex shrink-0 flex-col gap-3 landscape:w-[244px] portrait:w-full">
      <div className="rounded-lg border-[1.5px] border-line bg-card p-4 text-center">
        <Rotulo>Partido cerrado</Rotulo>
        <p className="mt-1 text-5xl font-extrabold tabular-nums" style={{ fontStretch: '90%' }}>{gf}–{gc}</p>
      </div>
      {cierre && <EstadoEnvio cierre={cierre} onReintentar={onReintentar} />}
      <Boton variante="primario" grande onClick={onResumen}>Ver resumen</Boton>
      <Link
        href={hrefInforme}
        className={cn('inline-flex min-h-14 items-center justify-center rounded-lg border-[1.5px] border-line bg-card px-4 text-base font-semibold', PULSAR)}
      >
        Abrir informe
      </Link>
      <Boton onClick={onReabrir}>Seguir anotando</Boton>
    </aside>
  )
}
