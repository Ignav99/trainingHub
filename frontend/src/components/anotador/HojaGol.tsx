'use client'

import { Check } from 'lucide-react'
import { TIPO_ABP_OPTIONS, TIPO_GOL_OPTIONS, ZONA_OPTIONS } from '@/lib/anotador'
import type { EventoEditable } from './edicionEvento'
import { FichaJugador, type DatosFicha } from './FichaJugador'
import { Boton, Chip, Hoja, Rotulo } from './Piezas'

interface Props {
  abierta: boolean
  evento: EventoEditable | null
  /** Nombre ya mostrado del goleador (o "Rival"). */
  titulo: string
  /** Candidatos a asistente (todos menos el goleador). */
  asistentes: DatosFicha[]
  mostrarFoto: boolean
  rivalDorsales: number[]
  onPatch: (patch: Partial<EventoEditable>) => void
  onPedirDorsalRival: () => void
  onCerrar: () => void
}

/**
 * El gol ya está guardado cuando esta hoja se abre: aquí solo se enriquece.
 * Todo es opcional; "Listo" o tocar otra acción la cierra.
 */
export function HojaGol({
  abierta, evento, titulo, asistentes, mostrarFoto, rivalDorsales, onPatch, onPedirDorsalRival, onCerrar,
}: Props) {
  const propio = evento?.type === 'gol'
  return (
    <Hoja
      abierta={abierta && !!evento}
      onCerrar={onCerrar}
      modo="local"
      titulo={evento ? `Gol de ${titulo} · ${evento.minute}′` : 'Gol'}
      acciones={
        <span className="hidden items-center gap-1.5 text-[15px] font-semibold text-success sm:inline-flex">
          <Check className="h-5 w-5" strokeWidth={1.5} /> Gol guardado
        </span>
      }
      pie={<Boton variante="primario" grande className="w-full" onClick={onCerrar}>Listo</Boton>}
    >
      {evento && (
        <div className="space-y-4">
          {propio && (
            <section>
              <Rotulo>Asistente (opcional)</Rotulo>
              <div className="-mx-1 mt-1 flex gap-1 overflow-x-auto overscroll-x-contain pb-1">
                <Chip
                  className="mx-1 mt-3 shrink-0 self-start"
                  activo={!evento.relatedConvId}
                  onClick={() => onPatch({ relatedConvId: undefined })}
                >
                  Sin asistencia
                </Chip>
                {asistentes.map((j) => (
                  <FichaJugador
                    key={j.id}
                    jugador={j}
                    tam="banquillo"
                    mostrarFoto={mostrarFoto}
                    seleccionado={evento.relatedConvId === j.id}
                    onClick={() => onPatch({ relatedConvId: evento.relatedConvId === j.id ? undefined : j.id })}
                  />
                ))}
              </div>
            </section>
          )}

          {!propio && (
            <section>
              <Rotulo>Dorsal del rival (opcional)</Rotulo>
              <div className="mt-2 flex flex-wrap gap-2">
                <Chip activo={evento.rivalDorsal == null} onClick={() => onPatch({ rivalDorsal: undefined })}>Sin dorsal</Chip>
                {rivalDorsales.map((n) => (
                  <Chip key={n} activo={evento.rivalDorsal === n} onClick={() => onPatch({ rivalDorsal: n })}>
                    <span className="tabular-nums">{n}</span>
                  </Chip>
                ))}
                <Chip onClick={onPedirDorsalRival}>Otro dorsal</Chip>
              </div>
            </section>
          )}

          <div className="grid gap-4 landscape:grid-cols-2">
            <div className="space-y-4">
              <section>
                <Rotulo>Cómo fue</Rotulo>
                <div className="mt-2 flex flex-wrap gap-2">
                  {TIPO_GOL_OPTIONS.map((o) => (
                    <Chip
                      key={o.value}
                      activo={!evento.es_abp && (evento.tipo_gol || 'otro') === o.value}
                      onClick={() => onPatch({ es_abp: false, tipo_gol: o.value, tipo_abp: undefined })}
                    >
                      {o.label}
                    </Chip>
                  ))}
                </div>
              </section>
              <section>
                <Rotulo>Zona de la portería</Rotulo>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ZONA_OPTIONS.map((o) => (
                    <Chip key={o.value} activo={(evento.zona || 'central') === o.value} onClick={() => onPatch({ zona: o.value })}>
                      {o.label}
                    </Chip>
                  ))}
                </div>
              </section>
            </div>
            <section>
              <Rotulo>Balón parado</Rotulo>
              <div className="mt-2 flex flex-wrap gap-2">
                {TIPO_ABP_OPTIONS.map((o) => (
                  <Chip
                    key={o.value}
                    activo={!!evento.es_abp && (evento.tipo_abp || 'corner') === o.value}
                    onClick={() => onPatch({ es_abp: true, tipo_abp: o.value, tipo_gol: undefined })}
                  >
                    {o.label}
                  </Chip>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}
    </Hoja>
  )
}
