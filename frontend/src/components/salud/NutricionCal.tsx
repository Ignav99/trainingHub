'use client'

import { Copy, Edit, Loader2, Trash2 } from 'lucide-react'
import { Ficha } from '@/components/ui/ficha'
import { Estado, type EstadoTipo } from '@/components/ui/estado'
import { CAB, CIFRA, FILA } from '@/components/salud/SaludCal'

/** Piezas de Cal para Nutrición. Se montan solo con Cal activo. */

const BOTON_ICONO =
  'inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius)] text-muted-foreground [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary'

function Cifra({ rotulo, valor, unidad }: { rotulo: string; valor: string | number; unidad?: string }) {
  return (
    <div className="min-w-0 p-4">
      <p className="cal-rotulo text-muted-foreground">{rotulo}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums">
        {valor}
        {unidad && <span className="ml-1 text-sm font-medium text-muted-foreground">{unidad}</span>}
      </p>
    </div>
  )
}

export interface ComidaCal {
  tipo: string
  nombre: string
  hora?: string | null
  alimentos: string[]
  kcal: number
}

export function PlanCardCal({
  titulo,
  contexto,
  kcal,
  proteinas,
  carbos,
  grasas,
  hidratacion,
  comidas,
  notas,
  eliminando,
  onEliminar,
}: {
  titulo: string
  contexto?: string
  kcal: number
  proteinas: number
  carbos: number
  grasas: number
  hidratacion?: number | null
  comidas: ComidaCal[]
  notas?: string | null
  eliminando: boolean
  onEliminar: () => void
}) {
  const cifras = [
    { rotulo: 'Energía', valor: kcal, unidad: 'kcal' },
    { rotulo: 'Proteínas', valor: proteinas.toFixed(0), unidad: 'g' },
    { rotulo: 'Carbohidratos', valor: carbos.toFixed(0), unidad: 'g' },
    { rotulo: 'Grasas', valor: grasas.toFixed(0), unidad: 'g' },
    ...(hidratacion ? [{ rotulo: 'Hidratación', valor: hidratacion, unidad: 'L' }] : []),
  ]
  return (
    <section className="cal-linea bg-card min-w-0">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h3 className="cal-titulo truncate text-base">{titulo}</h3>
          {contexto && <p className="text-xs text-muted-foreground">{contexto}</p>}
        </div>
        <button
          type="button"
          onClick={onEliminar}
          disabled={eliminando}
          aria-label={`Eliminar ${titulo}`}
          className={`${BOTON_ICONO} hover:text-destructive`}
        >
          {eliminando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
        </button>
      </header>
      <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-border border-b border-border">
        {cifras.map((c) => (
          <Cifra key={c.rotulo} {...c} />
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className={`${CAB} text-left`}>Comida</th>
              <th scope="col" className={`${CAB} text-left`}>Plato</th>
              <th scope="col" className={`${CAB} text-right`}>Hora</th>
              <th scope="col" className={`${CAB} text-right`}>kcal</th>
            </tr>
          </thead>
          <tbody>
            {comidas.map((c, i) => (
              <tr key={i} className="border-b border-border last:border-b-0 align-top">
                <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{c.tipo}</td>
                <td className="px-3 py-2">
                  <span className="font-medium">{c.nombre}</span>
                  {c.alimentos.length > 0 && (
                    <span className="block text-xs text-muted-foreground">{c.alimentos.join(', ')}</span>
                  )}
                </td>
                <td className={`${CIFRA} py-2 text-muted-foreground`}>{c.hora || '–'}</td>
                <td className={`${CIFRA} py-2`}>{c.kcal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {notas && <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">{notas}</p>}
    </section>
  )
}

export interface PlantillaFilaCal {
  id: string
  nombre: string
  descripcion?: string | null
  alimentos: string
  contexto?: string
  kcal?: number | null
  proteinas?: number | null
  carbos?: number | null
  grasas?: number | null
}

export function PlantillasTablaCal({
  grupos,
  onEditar,
  onDuplicar,
  onEliminar,
}: {
  grupos: { clave: string; rotulo: string; filas: PlantillaFilaCal[] }[]
  onEditar: (id: string) => void
  onDuplicar: (id: string) => void
  onEliminar: (id: string) => void
}) {
  const num = (v?: number | null) => (v == null ? '–' : v)
  return (
    <div className="cal-linea bg-card overflow-x-auto">
      <table className="w-full min-w-[820px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className={`${CAB} text-left`}>Plantilla</th>
            <th scope="col" className={`${CAB} text-left`}>Contexto</th>
            <th scope="col" className={`${CAB} text-right`}>kcal</th>
            <th scope="col" className={`${CAB} text-right`}>Prot. (g)</th>
            <th scope="col" className={`${CAB} text-right`}>Carb. (g)</th>
            <th scope="col" className={`${CAB} text-right`}>Grasas (g)</th>
            <th scope="col" className="w-[132px] px-1">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        {grupos.map((g) => (
          <tbody key={g.clave}>
            <tr className="border-b border-border bg-sunken">
              <th scope="colgroup" colSpan={7} className="h-9 px-3 text-left font-normal">
                <span className="cal-rotulo">{g.rotulo}</span>
                <span className="ml-2 text-xs tabular-nums text-muted-foreground">{g.filas.length}</span>
              </th>
            </tr>
            {g.filas.map((p) => (
              <tr key={p.id} className={FILA}>
                <td className="px-3 max-w-[360px]">
                  <span className="block truncate font-semibold">{p.nombre}</span>
                  {(p.descripcion || p.alimentos) && (
                    <span className="block truncate text-xs text-muted-foreground leading-tight">
                      {p.descripcion || p.alimentos}
                    </span>
                  )}
                </td>
                <td className="px-3 text-muted-foreground">{p.contexto || '–'}</td>
                <td className={CIFRA}>{num(p.kcal)}</td>
                <td className={CIFRA}>{num(p.proteinas)}</td>
                <td className={CIFRA}>{num(p.carbos)}</td>
                <td className={CIFRA}>{num(p.grasas)}</td>
                <td className="px-1 text-right whitespace-nowrap">
                  <button type="button" onClick={() => onEditar(p.id)} aria-label={`Editar ${p.nombre}`} className={BOTON_ICONO}>
                    <Edit className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => onDuplicar(p.id)} aria-label={`Duplicar ${p.nombre}`} className={BOTON_ICONO}>
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onEliminar(p.id)}
                    aria-label={`Eliminar ${p.nombre}`}
                    className={`${BOTON_ICONO} hover:text-destructive`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  )
}

export interface ResumenFilaCal {
  id: string
  nombre: string
  apellidos?: string
  dorsal?: number | null
  posicion_principal?: string
  peso?: number | null
  grasa?: number | null
  planType: 'individual' | 'equipo' | 'none'
  weightTrend: 'up' | 'down' | 'stable' | null
  supCount: number
}

/** Plan de hoy a estado con forma: individual = disponible, de equipo = aviso, sin plan = duda. */
const PLAN: Record<ResumenFilaCal['planType'], { tipo: EstadoTipo; texto: string }> = {
  individual: { tipo: 'disponible', texto: 'plan individual' },
  equipo: { tipo: 'aviso', texto: 'plan de equipo' },
  none: { tipo: 'duda', texto: 'sin plan' },
}

const TENDENCIA: Record<'up' | 'down' | 'stable', string> = { up: 'sube', down: 'baja', stable: 'estable' }

export function ResumenTablaCal({ filas }: { filas: ResumenFilaCal[] }) {
  return (
    <div className="cal-linea bg-card overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className={`${CAB} text-left`}>Jugador</th>
            <th scope="col" className={`${CAB} text-left`}>Pos.</th>
            <th scope="col" className={`${CAB} text-right`}>Peso</th>
            <th scope="col" className={`${CAB} text-right`}>% grasa</th>
            <th scope="col" className={`${CAB} text-right`}>Supl.</th>
            <th scope="col" className={`${CAB} text-left`}>Plan de hoy</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((r) => {
            const nombre = `${r.nombre} ${r.apellidos || ''}`.trim()
            const plan = PLAN[r.planType]
            return (
              <tr key={r.id} className={FILA}>
                <td className="px-3">
                  <div className="flex items-center gap-3">
                    <Ficha dorsal={r.dorsal ?? undefined} size="sm" label={nombre} />
                    <span className="font-semibold">{nombre}</span>
                  </div>
                </td>
                <td className="px-3 font-mono text-xs text-muted-foreground">{r.posicion_principal}</td>
                <td className={CIFRA}>
                  {r.peso ? (
                    <>
                      {r.peso}
                      <span className="ml-1 text-xs text-muted-foreground">kg</span>
                      {r.weightTrend && (
                        <span className="ml-2 text-xs text-muted-foreground">{TENDENCIA[r.weightTrend]}</span>
                      )}
                    </>
                  ) : (
                    <span className="text-muted-foreground">–</span>
                  )}
                </td>
                <td className={CIFRA}>
                  {r.grasa != null ? (
                    <>
                      {r.grasa}
                      <span className="ml-1 text-xs text-muted-foreground">%</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">–</span>
                  )}
                </td>
                <td className={CIFRA}>{r.supCount > 0 ? r.supCount : <span className="text-muted-foreground">0</span>}</td>
                <td className="px-3">
                  <Estado tipo={plan.tipo}>{plan.texto}</Estado>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
