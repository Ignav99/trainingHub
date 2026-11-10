'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowUpCircle, Edit, Eye, MoreHorizontal, Trash2, UserCog } from 'lucide-react'
import { Ficha, type FichaEstado } from '@/components/ui/ficha'
import { Estado, type EstadoTipo } from '@/components/ui/estado'
import { FormGuide } from '@/components/player/FormGuide'
import { POSICIONES, posicionMeta, jugadorNombreVisible, type Jugador } from '@/lib/api/jugadores'
import { prefetchRecord } from '@/lib/prefetchRecord'
import {
  TIPO_JUGADOR_LABELS,
  etiquetaPrograma,
  isPlantilla,
  resolveDisponibilidad,
  resolveTipoJugador,
} from '@/lib/jugadorTipo'
import type { CargaJugador } from '@/types'
import type { JugadorResumenConvocatorias } from '@/lib/api/convocatorias'

export interface PlantillaStatsCal {
  total: number
  disponibles: number
  porZona: Record<string, number>
}

interface Props {
  jugadores: Jugador[]
  /** Resumen de plantilla oficial; solo en la pestaña Plantilla. */
  stats: PlantillaStatsCal | null
  isCrossTeam: (jugador: Jugador) => boolean
  resumenMap: Record<string, JugadorResumenConvocatorias>
  cargaMap: Record<string, CargaJugador>
  onEdit: (jugador: Jugador) => void
  onDelete: (jugador: Jugador) => void
  onChangeEstado: (jugador: Jugador) => void
  onPromover: (jugador: Jugador) => void
}

const GRUPOS = [
  { zona: 'porteria', rotulo: 'Porteros' },
  { zona: 'defensa', rotulo: 'Defensas' },
  { zona: 'mediocampo', rotulo: 'Medios' },
  { zona: 'ataque', rotulo: 'Delanteros' },
  { zona: 'sin', rotulo: 'Sin posición' },
] as const

function zonaDe(j: Jugador): string {
  return posicionMeta(j.posicion_principal)?.zona ?? 'sin'
}

function plural(n: number, uno: string, varios: string) {
  return `${n} ${n === 1 ? uno : varios}`
}

/** Estado escrito + forma, a partir de los mismos datos que usaban las tarjetas. */
export function estadoDe(j: Jugador): { tipo: EstadoTipo; ficha: FichaEstado; texto: string } {
  const prog = etiquetaPrograma(j)
  if (prog === 'admin') {
    if (j.estado === 'sancionado') return { tipo: 'baja', ficha: 'sancionado', texto: 'sancionado' }
    if (j.estado === 'baja') return { tipo: 'baja', ficha: 'baja', texto: 'baja' }
    const texto = j.estado === 'seleccion' ? '1er equipo' : j.estado
    return { tipo: 'aviso', ficha: 'duda', texto }
  }
  if (prog === 'en_tratamiento') {
    const disp = resolveDisponibilidad(j)
    return disp === 'fuera'
      ? { tipo: 'baja', ficha: 'baja', texto: 'en tratamiento' }
      : { tipo: 'duda', ficha: 'duda', texto: 'en tratamiento' }
  }
  return { tipo: 'disponible', ficha: 'disponible', texto: 'disponible' }
}

const num = (v?: number | null) => (v === undefined || v === null ? '–' : v)

/** Motivo de baja y fecha de vuelta, para el title de la celda de estado. */
export function detalleEstado(j: Jugador): string | undefined {
  const partes: string[] = []
  if (j.motivo_baja) partes.push(j.motivo_baja)
  if (j.fecha_vuelta_estimada) {
    try {
      partes.push(`vuelta estimada: ${format(parseISO(j.fecha_vuelta_estimada), "d MMM yyyy", { locale: es })}`)
    } catch {
      partes.push(`vuelta estimada: ${j.fecha_vuelta_estimada}`)
    }
  }
  return partes.length > 0 ? partes.join(' · ') : undefined
}

function Tarjeta({ color, cantidad, etiqueta }: { color: 'bg-warning' | 'bg-destructive'; cantidad: number; etiqueta: string }) {
  return (
    <span className="inline-flex items-center gap-1" title={`${cantidad} ${etiqueta}`}>
      <span aria-hidden="true" className={`inline-block h-[0.85em] w-[0.6em] flex-none rotate-[10deg] rounded-[1px] ${color}`} />
      <span className="sr-only">{etiqueta}: </span>
      {cantidad}
    </span>
  )
}

function MenuAcciones({
  jugador,
  onEdit,
  onDelete,
  onChangeEstado,
  onPromover,
}: {
  jugador: Jugador
  onEdit: () => void
  onDelete: () => void
  onChangeEstado: () => void
  onPromover?: () => void
}) {
  const [abierto, setAbierto] = useState(false)
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)
  const boton = useRef<HTMLButtonElement>(null)
  const nombre = jugadorNombreVisible(jugador)

  useLayoutEffect(() => {
    if (!abierto || !boton.current) return
    const r = boton.current.getBoundingClientRect()
    setPos({ top: r.bottom + 4, right: window.innerWidth - r.right })
  }, [abierto])

  useEffect(() => {
    if (!abierto) return
    const cerrar = () => setAbierto(false)
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAbierto(false)
        boton.current?.focus()
      }
    }
    window.addEventListener('scroll', cerrar, true)
    window.addEventListener('resize', cerrar)
    window.addEventListener('keydown', tecla)
    return () => {
      window.removeEventListener('scroll', cerrar, true)
      window.removeEventListener('resize', cerrar)
      window.removeEventListener('keydown', tecla)
    }
  }, [abierto])

  const item =
    'flex w-full items-center gap-2 px-3 h-10 text-left text-sm hover:bg-sunken focus-visible:bg-sunken focus-visible:outline-none'

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <button
        ref={boton}
        type="button"
        aria-label={`Acciones de ${nombre}`}
        aria-haspopup="menu"
        aria-expanded={abierto}
        onClick={() => setAbierto((v) => !v)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius)] text-muted-foreground [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
      </button>
      {abierto &&
        pos &&
        createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={() => setAbierto(false)} aria-hidden="true" />
            <div
              role="menu"
              style={{ top: pos.top, right: pos.right }}
              className="cal-linea fixed z-50 w-48 bg-card py-1"
            >
              <Link role="menuitem" href={`/plantilla/${jugador.id}`} className={item}>
                <Eye className="h-4 w-4" aria-hidden="true" />
                Ver ficha
              </Link>
              <button
                role="menuitem"
                type="button"
                className={item}
                onClick={() => {
                  setAbierto(false)
                  onEdit()
                }}
              >
                <Edit className="h-4 w-4" aria-hidden="true" />
                Editar
              </button>
              <button
                role="menuitem"
                type="button"
                className={item}
                onClick={() => {
                  setAbierto(false)
                  onChangeEstado()
                }}
              >
                <UserCog className="h-4 w-4" aria-hidden="true" />
                Cambiar estado
              </button>
              {onPromover && (
                <button
                  role="menuitem"
                  type="button"
                  className={`${item} text-success`}
                  onClick={() => {
                    setAbierto(false)
                    onPromover()
                  }}
                >
                  <ArrowUpCircle className="h-4 w-4" aria-hidden="true" />
                  Promover a plantilla
                </button>
              )}
              <button
                role="menuitem"
                type="button"
                className={`${item} text-destructive`}
                onClick={() => {
                  setAbierto(false)
                  onDelete()
                }}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Eliminar
              </button>
            </div>
          </>,
          document.body
        )}
    </div>
  )
}

export function PlantillaTablaCal({
  jugadores,
  stats,
  isCrossTeam,
  resumenMap,
  cargaMap,
  onEdit,
  onDelete,
  onChangeEstado,
  onPromover,
}: Props) {
  const router = useRouter()

  const grupos = GRUPOS.map((g) => ({
    ...g,
    jugadores: jugadores.filter((j) => zonaDe(j) === g.zona),
  })).filter((g) => g.jugadores.length > 0)

  const cab = 'h-9 px-3 text-xs font-semibold text-muted-foreground [font-stretch:75%]'
  const cifra = 'px-3 text-right tabular-nums'

  return (
    <div className="space-y-3">
      {stats && (
        <p className="text-sm tabular-nums text-muted-foreground">
          {plural(stats.total, 'jugador', 'jugadores')} · {plural(stats.disponibles, 'disponible', 'disponibles')} ·{' '}
          {plural(stats.porZona.porteria || 0, 'portero', 'porteros')} ·{' '}
          {plural(stats.porZona.defensa || 0, 'defensa', 'defensas')} ·{' '}
          {plural(stats.porZona.mediocampo || 0, 'medio', 'medios')} ·{' '}
          {plural(stats.porZona.ataque || 0, 'delantero', 'delanteros')}
        </p>
      )}
      <div className="cal-linea overflow-x-auto bg-card">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className={`${cab} text-left`}>Jugador</th>
              <th scope="col" className={`${cab} text-left`}>Pos.</th>
              <th scope="col" className={`${cab} text-left`}>Estado</th>
              <th scope="col" className={`${cab} text-right`}>Edad</th>
              <th scope="col" className={`${cab} text-right`}>Min.</th>
              <th scope="col" className={`${cab} text-right`}>Tarj.</th>
              <th scope="col" className={`${cab} text-left`}>Racha</th>
              <th scope="col" className={`${cab} text-right`}>TEC</th>
              <th scope="col" className={`${cab} text-right`}>TAC</th>
              <th scope="col" className={`${cab} text-right`}>FIS</th>
              <th scope="col" className={`${cab} text-right`}>MEN</th>
              <th scope="col" className={`${cab} text-right`}>Media</th>
              <th scope="col" className="w-12 px-1">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          {grupos.map((g) => (
            <tbody key={g.zona}>
              <tr className="border-b border-border bg-sunken">
                <th scope="colgroup" colSpan={13} className="h-9 px-3 text-left font-normal">
                  <span className="cal-rotulo">{g.rotulo}</span>
                  <span className="ml-2 text-xs tabular-nums text-muted-foreground">{g.jugadores.length}</span>
                </th>
              </tr>
              {g.jugadores.map((j) => {
                const meta = POSICIONES[j.posicion_principal as keyof typeof POSICIONES] ?? posicionMeta(j.posicion_principal)
                const est = estadoDe(j)
                const nombre = jugadorNombreVisible(j)
                const tipo = resolveTipoJugador(j)
                const extra = !isPlantilla(j)
                const cruz = isCrossTeam(j)
                const resumen = resumenMap[j.id]
                const carga = cargaMap?.[j.id]
                const amarillas = resumen?.amarillas ?? carga?.tarjetas_amarillas ?? 0
                const rojas = resumen?.rojas ?? carga?.tarjetas_rojas ?? 0
                const racha = resumen?.racha ?? []
                const destino = `/plantilla/${j.id}`
                return (
                  <tr
                    key={j.id}
                    onClick={() => router.push(destino)}
                    onPointerEnter={() => {
                      router.prefetch(destino)
                      prefetchRecord(`/jugadores/${j.id}`)
                    }}
                    className="h-9 cursor-pointer [@media(pointer:coarse)]:h-11 border-b border-border last:border-b-0 hover:bg-sunken focus-within:bg-sunken"
                  >
                    <td className="px-3">
                      <div className="flex items-center gap-3">
                        <Ficha dorsal={j.dorsal} estado={est.ficha} size="sm" label={nombre} />
                        <Link
                          href={destino}
                          onClick={(e) => e.stopPropagation()}
                          className="font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                          {nombre}
                        </Link>
                        {j.es_capitan && (
                          <span className="text-xs text-muted-foreground [font-stretch:75%]">capitán</span>
                        )}
                        {extra && (
                          <span className="text-xs text-muted-foreground [font-stretch:75%]">
                            {TIPO_JUGADOR_LABELS[tipo].toLowerCase()}
                          </span>
                        )}
                        {cruz && j.equipos && (
                          <span className="text-xs text-muted-foreground [font-stretch:75%]">{j.equipos.nombre}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3">
                      <span className="inline-flex items-center gap-2 font-mono text-xs">
                        {meta && (
                          <span
                            aria-hidden="true"
                            className="inline-block h-2 w-2 flex-none"
                            style={{ backgroundColor: meta.color }}
                          />
                        )}
                        {j.posicion_principal}
                      </span>
                    </td>
                    <td className="px-3" title={detalleEstado(j)}>
                      <Estado tipo={est.tipo}>{est.texto}</Estado>
                    </td>
                    <td className={cifra}>{num(j.edad)}</td>
                    <td className={cifra}>{resumen?.minutos_totales ?? 0}</td>
                    <td className={cifra}>
                      {amarillas === 0 && rojas === 0 ? (
                        <span className="text-muted-foreground">–</span>
                      ) : (
                        <span className="inline-flex items-center justify-end gap-3">
                          {amarillas > 0 && <Tarjeta color="bg-warning" cantidad={amarillas} etiqueta={amarillas === 1 ? 'amarilla' : 'amarillas'} />}
                          {rojas > 0 && <Tarjeta color="bg-destructive" cantidad={rojas} etiqueta={rojas === 1 ? 'roja' : 'rojas'} />}
                        </span>
                      )}
                    </td>
                    <td className="px-3">
                      {racha.length > 0 ? <FormGuide racha={racha} /> : <span className="text-muted-foreground">–</span>}
                    </td>
                    <td className={cifra}>{num(j.nivel_tecnico)}</td>
                    <td className={cifra}>{num(j.nivel_tactico)}</td>
                    <td className={cifra}>{num(j.nivel_fisico)}</td>
                    <td className={cifra}>{num(j.nivel_mental)}</td>
                    <td className={`${cifra} font-extrabold`}>{num(j.nivel_global)}</td>
                    <td className="px-1 text-right">
                      <MenuAcciones
                        jugador={j}
                        onEdit={() => onEdit(j)}
                        onDelete={() => onDelete(j)}
                        onChangeEstado={() => onChangeEstado(j)}
                        onPromover={!isPlantilla(j) ? () => onPromover(j) : undefined}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          ))}
        </table>
      </div>
    </div>
  )
}
