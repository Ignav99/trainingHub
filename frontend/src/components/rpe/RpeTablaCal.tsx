'use client'

import { Fragment } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Ficha, type FichaEstado } from '@/components/ui/ficha'
import { Estado, type EstadoTipo } from '@/components/ui/estado'
import { BarraFina, CAB, CIFRA, FILA, type TonoBarra } from '@/components/salud/SaludCal'
import { PlayerRpeCharts } from '@/components/rpe/PlayerRpeCharts'
import type { CargaJugador, NivelCarga } from '@/types'

/** Agregado de wellness por jugador (campos que usa la tabla). */
export interface WellnessFila {
  wellness_alerta?: boolean | null
  wellness_general_avg?: number | null
  wellness_7d_avg?: number | null
  wellness_last?: number | null
}

interface Props {
  data: CargaJugador[]
  wellnessMap: Map<string, WellnessFila>
  expandedRow: string | null
  setExpandedRow: (id: string | null) => void
  wellnessCols: boolean
  setWellnessCols: (fn: (v: boolean) => boolean) => void
  rpeCols: boolean
  setRpeCols: (fn: (v: boolean) => boolean) => void
  onVerGrafica: (jugadorId: string) => void
  /** Registros de RPE del jugador desplegado (editable). */
  renderRegistros: (jugadorId: string) => React.ReactNode
}

/** Nivel de carga a estado con forma: crítico = baja, alto = duda, óptimo = disponible, bajo = aviso. */
const NIVEL: Record<string, { tipo: EstadoTipo; ficha: FichaEstado; texto: string; tono: TonoBarra }> = {
  critico: { tipo: 'baja', ficha: 'baja', texto: 'crítico', tono: 'destructive' },
  alto: { tipo: 'duda', ficha: 'duda', texto: 'alto', tono: 'warning' },
  optimo: { tipo: 'disponible', ficha: 'disponible', texto: 'óptimo', tono: 'success' },
  bajo: { tipo: 'aviso', ficha: 'disponible', texto: 'bajo', tono: 'info' },
}
const NIVEL_NEUTRO = { tipo: 'neutro' as EstadoTipo, ficha: 'disponible' as FichaEstado, texto: '', tono: 'neutro' as TonoBarra }

function nivelDe(n: NivelCarga) {
  return NIVEL[n as string] ?? NIVEL_NEUTRO
}

/** Wellness (0-25, más es mejor): bien ≥20, regular 15-19, bajo <15. */
function wellnessNivel(v: number): { tono: TonoBarra; texto: string } {
  if (v >= 20) return { tono: 'success', texto: 'bien' }
  if (v >= 15) return { tono: 'warning', texto: 'regular' }
  return { tono: 'destructive', texto: 'bajo' }
}

/** RPE (1-10): alta ≥8, moderada ≥6, normal el resto. */
function rpeNivel(v: number): { tono: TonoBarra; texto: string } {
  if (v >= 8) return { tono: 'destructive', texto: 'alta' }
  if (v >= 6) return { tono: 'warning', texto: 'moderada' }
  return { tono: 'success', texto: 'normal' }
}

/** Solo las alertas llevan color: lo normal (verde/azul) se pinta neutro. */
function soloAlerta(tono: TonoBarra): TonoBarra {
  return tono === 'warning' || tono === 'destructive' ? tono : 'neutro'
}

function CifraBarra({
  texto,
  pct,
  tono,
  nota,
}: {
  texto: string
  pct: number
  tono: TonoBarra
  nota?: string
}) {
  return (
    <div className="ml-auto w-[92px]">
      <div className="flex items-baseline justify-end gap-1.5 leading-none">
        {nota && <span className="text-[11px] text-muted-foreground">{nota}</span>}
        <span className="font-semibold tabular-nums">{texto}</span>
      </div>
      <BarraFina pct={pct} tono={soloAlerta(tono)} className="mt-1" />
    </div>
  )
}

const VACIO = <span className="text-muted-foreground">–</span>

export function RpeTablaCal({
  data,
  wellnessMap,
  expandedRow,
  setExpandedRow,
  wellnessCols,
  setWellnessCols,
  rpeCols,
  setRpeCols,
  onVerGrafica,
  renderRegistros,
}: Props) {
  const maxAguda = Math.max(1, ...data.map((d) => d.carga_aguda || 0))
  const columnas = 7 + (wellnessCols ? 2 : 0) + (rpeCols ? 4 : 0)
  const toggle = 'font-semibold hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary'

  return (
    <div className="cal-linea bg-card overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className={`${CAB} text-left`}>Jugador</th>
            <th scope="col" className={`${CAB} text-left`}>Nivel</th>
            <th scope="col" className={`${CAB} text-right`}>EWMA aguda</th>
            <th scope="col" className={`${CAB} text-right`}>ACWR</th>
            <th scope="col" className={`${CAB} text-right`}>
              <button type="button" className={toggle} aria-expanded={wellnessCols} onClick={() => setWellnessCols((v) => !v)}>
                Wellness {wellnessCols ? '−' : '+'}
              </button>
            </th>
            {wellnessCols && (
              <>
                <th scope="col" className={`${CAB} text-right`}>Últ. 7 d</th>
                <th scope="col" className={`${CAB} text-right`}>Último</th>
              </>
            )}
            <th scope="col" className={`${CAB} text-right`}>
              <button type="button" className={toggle} aria-expanded={rpeCols} onClick={() => setRpeCols((v) => !v)}>
                RPE {rpeCols ? '−' : '+'}
              </button>
            </th>
            {rpeCols && (
              <>
                <th scope="col" className={`${CAB} text-right`}>Martes</th>
                <th scope="col" className={`${CAB} text-right`}>Jueves</th>
                <th scope="col" className={`${CAB} text-right`}>Viernes</th>
                <th scope="col" className={`${CAB} text-right`}>Partido</th>
              </>
            )}
            <th scope="col" className={`${CAB} text-right`}>Carga (UA)</th>
            <th scope="col" className="w-12 px-1">
              <span className="sr-only">Detalle</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => {
            const w = wellnessMap.get(item.jugador_id)
            const abierto = expandedRow === item.jugador_id
            const nv = nivelDe(item.nivel_carga)
            const nombre = `${item.nombre} ${item.apellidos}`.trim()
            const wGen = w?.wellness_general_avg ?? null
            const w7 = w?.wellness_7d_avg ?? null
            const wUlt = w?.wellness_last ?? null
            const rpe = item.rpe_ultimo
            const toggleFila = () => setExpandedRow(abierto ? null : item.jugador_id)
            return (
              <Fragment key={item.jugador_id}>
                <tr onClick={toggleFila} className={`${FILA} cursor-pointer`}>
                  <td className="px-3">
                    <div className="flex items-center gap-3">
                      <Ficha dorsal={item.dorsal ?? undefined} estado={nv.ficha} size="sm" label={nombre} />
                      <span className="font-semibold">{nombre}</span>
                      {item.posicion_principal && (
                        <span className="font-mono text-xs text-muted-foreground">{item.posicion_principal}</span>
                      )}
                      {w?.wellness_alerta && (
                        <Estado tipo="baja" className="text-xs">alerta wellness</Estado>
                      )}
                    </div>
                  </td>
                  <td className="px-3">{nv.texto ? <Estado tipo={nv.tipo}>{nv.texto}</Estado> : VACIO}</td>
                  <td className="px-3">
                    <CifraBarra
                      texto={item.carga_aguda.toFixed(0)}
                      pct={((item.carga_aguda || 0) / maxAguda) * 100}
                      tono={nv.tono}
                    />
                  </td>
                  <td className={`${CIFRA} font-mono text-xs`}>
                    {item.ratio_acwr != null ? item.ratio_acwr.toFixed(2) : VACIO}
                  </td>
                  <td className="px-3">
                    {wGen != null ? (
                      <CifraBarra
                        texto={wGen.toFixed(1)}
                        pct={(wGen / 25) * 100}
                        tono={wellnessNivel(wGen).tono}
                        nota={wellnessNivel(wGen).texto}
                      />
                    ) : (
                      <span className="block text-right text-muted-foreground">–</span>
                    )}
                  </td>
                  {wellnessCols && (
                    <>
                      <td className={CIFRA}>{w7 != null ? w7.toFixed(1) : VACIO}</td>
                      <td className={CIFRA}>{wUlt != null ? wUlt : VACIO}</td>
                    </>
                  )}
                  <td className="px-3">
                    {rpe != null ? (
                      <CifraBarra
                        texto={rpe.toFixed(1)}
                        pct={(rpe / 10) * 100}
                        tono={rpeNivel(rpe).tono}
                        nota={rpeNivel(rpe).texto}
                      />
                    ) : (
                      <span className="block text-right text-muted-foreground">–</span>
                    )}
                    {item.rpe_ultimo_tipo && (
                      <span className="block text-right text-[11px] leading-tight text-muted-foreground">
                        {item.rpe_ultimo_tipo === 'partido' ? 'partido' : 'sesión'}
                      </span>
                    )}
                  </td>
                  {rpeCols && (
                    <>
                      <td className={CIFRA}>{item.rpe_media_martes ?? VACIO}</td>
                      <td className={CIFRA}>{item.rpe_media_jueves ?? VACIO}</td>
                      <td className={CIFRA}>{item.rpe_media_viernes ?? VACIO}</td>
                      <td className={CIFRA}>{item.rpe_media_partido ?? VACIO}</td>
                    </>
                  )}
                  <td className={`${CIFRA} font-semibold`}>
                    {item.carga_ua_ultimo != null ? Math.round(item.carga_ua_ultimo) : VACIO}
                  </td>
                  <td className="px-1 text-center">
                    <button
                      type="button"
                      aria-label={`${abierto ? 'Cerrar' : 'Abrir'} detalle de ${nombre}`}
                      aria-expanded={abierto}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFila()
                      }}
                      className="inline-flex h-9 w-9 items-center justify-center text-muted-foreground [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      {abierto ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
                    </button>
                  </td>
                </tr>
                {abierto && (
                  <tr>
                    <td colSpan={columnas} className="p-0">
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-border bg-sunken px-4 py-3 text-xs">
                        <span>
                          <span className="text-muted-foreground">Aguda (EWMA): </span>
                          <span className="font-semibold tabular-nums">{item.carga_aguda.toFixed(0)}</span>
                        </span>
                        <span>
                          <span className="text-muted-foreground">Crónica (EWMA): </span>
                          <span className="font-semibold tabular-nums">{item.carga_cronica.toFixed(0)}</span>
                        </span>
                        {item.monotonia != null && (
                          <span>
                            <span className="text-muted-foreground">Monotonía: </span>
                            <span className="font-semibold tabular-nums">{item.monotonia.toFixed(1)}</span>
                            {item.monotonia > 2 && <span className="ml-1 text-muted-foreground">alta</span>}
                          </span>
                        )}
                        {item.strain != null && (
                          <span>
                            <span className="text-muted-foreground">Strain: </span>
                            <span className="font-semibold tabular-nums">{item.strain.toFixed(0)}</span>
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onVerGrafica(item.jugador_id)
                          }}
                          className="font-semibold text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                        >
                          Ver gráfica
                        </button>
                      </div>
                      <PlayerRpeCharts jugadorId={item.jugador_id} />
                      {renderRegistros(item.jugador_id)}
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
