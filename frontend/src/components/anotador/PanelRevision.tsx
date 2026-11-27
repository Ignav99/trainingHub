'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { Aviso, EstadoCierre } from './adaptadores'
import { EstadoEnvio } from './EstadoEnvio'
import { IconoErrorTarjeta, IconoRevisar, IconoSinConexion } from './Iconos'
import { Boton, Hoja, Rotulo } from './Piezas'
import { ResumenCierre } from './ResumenCierre'
import { pendientes, puedeEnviar, visibles, type EstadoRevision } from './revisionEstado'
import type { ResumenPartido } from './resumen'

interface Props {
  abierta: boolean
  cerrado: boolean
  resumen: ResumenPartido
  club: string
  rival: string
  avisos: Aviso[]
  estado: EstadoRevision
  guardando: boolean
  cierre: EstadoCierre | null
  onReintentar: () => void
  onCorregir: (aviso: Aviso) => void
  onEstaBien: (aviso: Aviso) => void
  onReabrirAviso: (id: string) => void
  onCerrarPartido: () => void
  onReabrirPartido: () => void
  onCerrar: () => void
  hrefInforme: string
}

const ETIQUETA: Record<Aviso['severidad'], string> = { error: 'Error', aviso: 'Aviso', info: 'Información' }

function Forma({ s }: { s: Aviso['severidad'] }) {
  if (s === 'error') return <IconoErrorTarjeta size={26} className="shrink-0 text-destructive" />
  if (s === 'aviso') return <IconoRevisar size={26} className="shrink-0 text-warning" />
  return <IconoSinConexion size={26} className="shrink-0 text-info" />
}

export function PanelRevision({
  abierta, cerrado, resumen, club, rival, avisos, estado, guardando, cierre, onReintentar, onCorregir, onEstaBien, onReabrirAviso,
  onCerrarPartido, onReabrirPartido, onCerrar, hrefInforme,
}: Props) {
  const [verConfirmados, setVerConfirmados] = useState(true)
  const lista = visibles(avisos, estado)
  const p = pendientes(avisos, estado)
  const ok = puedeEnviar(avisos, estado)
  return (
    <Hoja
      abierta={abierta}
      onCerrar={onCerrar}
      lado="derecha"
      ancho={640}
      titulo={cerrado ? 'Partido cerrado' : 'Revisar y cerrar'}
      pie={
        cerrado ? (
          <div className="grid grid-cols-2 gap-3">
            <Boton onClick={onReabrirPartido}>Seguir anotando</Boton>
            <a href={hrefInforme} className="inline-flex min-h-12 items-center justify-center rounded-lg border-[1.5px] border-primary bg-primary px-4 text-base font-semibold text-primary-foreground">
              Ver informe
            </a>
          </div>
        ) : (
          <div className="space-y-2">
            {!ok && (
              <p role="alert" className="text-[15px] font-semibold text-destructive">
                Confirma {p.errores === 1 ? 'el error' : `los ${p.errores} errores`} con «Está bien» o corrígelos para poder enviar.
              </p>
            )}
            <div className="grid grid-cols-[1fr_2fr] gap-3">
              <Boton onClick={onCerrar}>Seguir anotando</Boton>
              <Boton variante="primario" grande disabled={!ok || guardando} onClick={onCerrarPartido}>
                {guardando ? 'Enviando…' : 'Enviar y cerrar partido'}
              </Boton>
            </div>
          </div>
        )
      }
    >
      <div className="space-y-5">
        {cierre && <EstadoEnvio cierre={cierre} onReintentar={onReintentar} />}
        {lista.length > 0 && (
        <section>
            <div className="flex items-center justify-between gap-2">
              <Rotulo>
                {lista.length === 0 ? 'Revisión' : `Revisión · ${p.total} por mirar`}
              </Rotulo>
              {lista.some((a) => estado.confirmados.includes(a.id)) && (
                <button type="button" onClick={() => setVerConfirmados((v) => !v)} className="min-h-12 px-2 text-[15px] font-semibold underline underline-offset-4">
                  {verConfirmados ? 'Ocultar confirmados' : 'Ver confirmados'}
                </button>
              )}
            </div>
            {lista.length === 0 ? (
              <p className="mt-2 rounded-lg border-[1.5px] border-border bg-background p-4 text-base">
                El programa no ha encontrado nada raro. Si algo no cuadra, puedes corregirlo desde la cronología.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {lista
                  .filter((a) => verConfirmados || !estado.confirmados.includes(a.id))
                  .map((a) => {
                    const confirmado = estado.confirmados.includes(a.id)
                    const corregible = Boolean(a.eventIds?.length || a.convIds?.length)
                    return (
                      <li
                        key={a.id}
                        className={cn(
                          'rounded-lg border-[1.5px] bg-background p-3',
                          a.severidad === 'error' && !confirmado ? 'border-destructive' : 'border-border',
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <Forma s={a.severidad} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-muted-foreground">
                              {ETIQUETA[a.severidad]}{confirmado ? ' · confirmado' : ''}
                            </p>
                            <p className="text-[16px] font-semibold leading-snug">{a.mensaje}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {corregible && (
                            <Boton variante="primario" onClick={() => onCorregir(a)}>{a.accion || 'Corregir'}</Boton>
                          )}
                          {confirmado ? (
                            <Boton onClick={() => onReabrirAviso(a.id)}>Volver a marcar</Boton>
                          ) : (
                            <Boton onClick={() => onEstaBien(a)}>Está bien</Boton>
                          )}
                        </div>
                      </li>
                    )
                  })}
              </ul>
            )}
          </section>
        )}
        <section>
          <Rotulo>Resumen</Rotulo>
          <div className="mt-2">
            <ResumenCierre resumen={resumen} club={club} rival={rival} />
          </div>
        </section>

        {lista.length === 0 && (
        <section>
            <div className="flex items-center justify-between gap-2">
              <Rotulo>
                {lista.length === 0 ? 'Revisión' : `Revisión · ${p.total} por mirar`}
              </Rotulo>
              {lista.some((a) => estado.confirmados.includes(a.id)) && (
                <button type="button" onClick={() => setVerConfirmados((v) => !v)} className="min-h-12 px-2 text-[15px] font-semibold underline underline-offset-4">
                  {verConfirmados ? 'Ocultar confirmados' : 'Ver confirmados'}
                </button>
              )}
            </div>
            {lista.length === 0 ? (
              <p className="mt-2 rounded-lg border-[1.5px] border-border bg-background p-4 text-base">
                El programa no ha encontrado nada raro. Si algo no cuadra, puedes corregirlo desde la cronología.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {lista
                  .filter((a) => verConfirmados || !estado.confirmados.includes(a.id))
                  .map((a) => {
                    const confirmado = estado.confirmados.includes(a.id)
                    const corregible = Boolean(a.eventIds?.length || a.convIds?.length)
                    return (
                      <li
                        key={a.id}
                        className={cn(
                          'rounded-lg border-[1.5px] bg-background p-3',
                          a.severidad === 'error' && !confirmado ? 'border-destructive' : 'border-border',
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <Forma s={a.severidad} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-muted-foreground">
                              {ETIQUETA[a.severidad]}{confirmado ? ' · confirmado' : ''}
                            </p>
                            <p className="text-[16px] font-semibold leading-snug">{a.mensaje}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {corregible && (
                            <Boton variante="primario" onClick={() => onCorregir(a)}>{a.accion || 'Corregir'}</Boton>
                          )}
                          {confirmado ? (
                            <Boton onClick={() => onReabrirAviso(a.id)}>Volver a marcar</Boton>
                          ) : (
                            <Boton onClick={() => onEstaBien(a)}>Está bien</Boton>
                          )}
                        </div>
                      </li>
                    )
                  })}
              </ul>
            )}
          </section>
        )}
      </div>
    </Hoja>
  )
}
