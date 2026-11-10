'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Ficha } from '@/components/ui/ficha'
import type { FichaEstado } from '@/components/ui/ficha'
import { Estado, type EstadoTipo } from '@/components/ui/estado'
import { FASE_TRATAMIENTO_LABELS } from '@/lib/jugadorTipo'
import { labelsFromZonas } from '@/lib/bodyRegions'
import { CAB, CIFRA, FILA, fechaCorta } from '@/components/salud/SaludCal'
import type { BoardBucket, BoardPlayer, HistoricoGroup, PlayerCaseCard } from './EnfermeriaBoard'

const TIPO_LABEL: Record<string, string> = {
  lesion: 'lesión',
  enfermedad: 'enfermedad',
  molestias: 'molestia',
  rehabilitacion: 'rehabilitación',
  otro: 'otro',
}

const FASE_SHORT: Record<string, string> = {
  fase_1_control_dolor: 'F1 dolor',
  fase_2_movilidad: 'F2 movilidad',
  fase_3_fuerza_base: 'F3 fuerza',
  fase_4_fuerza_funcional: 'F4 funcional',
  fase_5_carrera_lineal: 'F5 carrera',
  fase_6_cambios_direccion: 'F6 COD',
  fase_7_entrenamiento_equipo: 'F7 grupo',
  fase_8_competicion: 'F8 partido',
}

const GRUPOS: { bucket: BoardBucket; rotulo: string; nota: string }[] = [
  { bucket: 'fuera', rotulo: 'Reposo', nota: 'no entrena ni convoca' },
  { bucket: 'individual', rotulo: 'Margen', nota: 'trabajo individual o fisio' },
  { bucket: 'grupo_adaptado', rotulo: 'Inicio grupo', nota: 'con el grupo, carga limitada' },
  { bucket: 'molestias', rotulo: 'Molestias', nota: 'entrena con el grupo' },
]

/** Mapeo bucket del tablero a estado con forma: reposo = baja, margen / inicio grupo = duda, molestia = aviso. */
const ESTADO_BUCKET: Record<BoardBucket, { tipo: EstadoTipo; ficha: FichaEstado; texto: string }> = {
  fuera: { tipo: 'baja', ficha: 'baja', texto: 'en reposo' },
  individual: { tipo: 'duda', ficha: 'duda', texto: 'en margen' },
  grupo_adaptado: { tipo: 'duda', ficha: 'duda', texto: 'inicio grupo' },
  molestias: { tipo: 'aviso', ficha: 'disponible', texto: 'molestia' },
}

function nombreDe(j: BoardPlayer) {
  return j.apodo || `${j.nombre} ${j.apellidos}`.trim()
}

function Fila({ item, bucket }: { item: PlayerCaseCard; bucket: BoardBucket }) {
  const router = useRouter()
  const { jugador, registro, dias } = item
  const est = ESTADO_BUCKET[bucket]
  const nombre = nombreDe(jugador)
  const destino = `/enfermeria/${registro.id}`
  const zona = labelsFromZonas(registro.zonas) || registro.zona_corporal
  const fase =
    registro.tipo === 'molestias'
      ? null
      : registro.fase_rtp
        ? FASE_SHORT[registro.fase_rtp] || registro.fase_rtp
        : registro.fase_tratamiento
          ? FASE_TRATAMIENTO_LABELS[registro.fase_tratamiento] || registro.fase_tratamiento
          : null

  return (
    <tr
      onClick={() => router.push(destino)}
      onPointerEnter={() => router.prefetch(destino)}
      className={`${FILA} cursor-pointer`}
    >
      <td className="px-3">
        <div className="flex items-center gap-3">
          <Ficha dorsal={jugador.dorsal} estado={est.ficha} size="sm" label={nombre} />
          <Link
            href={destino}
            onClick={(e) => e.stopPropagation()}
            className="font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {nombre}
          </Link>
          <span className="font-mono text-xs text-muted-foreground">{jugador.posicion_principal}</span>
        </div>
      </td>
      <td className="px-3 max-w-[320px]">
        <span className="block truncate" title={registro.titulo}>
          {registro.titulo}
        </span>
        {zona && <span className="block truncate text-xs text-muted-foreground leading-tight">{zona}</span>}
      </td>
      <td className="px-3">
        <Estado tipo={est.tipo}>{est.texto}</Estado>
      </td>
      <td className="px-3 text-xs text-muted-foreground">
        {[TIPO_LABEL[registro.tipo] || registro.tipo, fase, registro.severidad].filter(Boolean).join(' · ')}
      </td>
      <td className={CIFRA}>{dias}</td>
      <td className={CIFRA}>{fechaCorta(jugador.fecha_vuelta_estimada)}</td>
    </tr>
  )
}

export function EnfermeriaTablaCal({ columns }: { columns: Record<BoardBucket, PlayerCaseCard[]> }) {
  const grupos = GRUPOS.filter((g) => columns[g.bucket].length > 0)
  return (
    <div className="cal-linea bg-card overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className={`${CAB} text-left`}>Jugador</th>
            <th scope="col" className={`${CAB} text-left`}>Caso</th>
            <th scope="col" className={`${CAB} text-left`}>Estado</th>
            <th scope="col" className={`${CAB} text-left`}>Tipo y fase</th>
            <th scope="col" className={`${CAB} text-right`}>Días</th>
            <th scope="col" className={`${CAB} text-right`}>Vuelta est.</th>
          </tr>
        </thead>
        {grupos.map((g) => (
          <tbody key={g.bucket}>
            <tr className="border-b border-border bg-sunken">
              <th scope="colgroup" colSpan={6} className="h-9 px-3 text-left font-normal">
                <span className="cal-rotulo">{g.rotulo}</span>
                <span className="ml-2 text-xs tabular-nums text-muted-foreground">{columns[g.bucket].length}</span>
                <span className="ml-2 text-xs text-muted-foreground">{g.nota}</span>
              </th>
            </tr>
            {columns[g.bucket].map((item) => (
              <Fila key={item.jugador.id} item={item} bucket={g.bucket} />
            ))}
          </tbody>
        ))}
      </table>
    </div>
  )
}

function FilaHistorico({ registro, dias }: { registro: HistoricoGroup['cases'][number]; dias: number }) {
  const router = useRouter()
  const destino = `/enfermeria/${registro.id}`
  return (
    <tr onClick={() => router.push(destino)} className={`${FILA} cursor-pointer`}>
      <td className="pl-14 pr-3 max-w-[360px]">
        <Link
          href={destino}
          onClick={(e) => e.stopPropagation()}
          className="block truncate font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {registro.titulo}
        </Link>
      </td>
      <td className="px-3">
        <Estado tipo="disponible">alta</Estado>
      </td>
      <td className="px-3 text-xs text-muted-foreground">{TIPO_LABEL[registro.tipo] || registro.tipo}</td>
      <td className={CIFRA}>{fechaCorta(registro.fecha_inicio, true)}</td>
      <td className={CIFRA}>{fechaCorta(registro.fecha_alta, true)}</td>
      <td className={CIFRA}>{dias}</td>
    </tr>
  )
}

export function EnfermeriaHistoricoCal({
  groups,
  daysBetween,
  daysSince,
}: {
  groups: HistoricoGroup[]
  daysBetween: (a: string, b: string) => number
  daysSince: (a: string) => number
}) {
  return (
    <div className="cal-linea bg-card overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className={`${CAB} text-left`}>Caso</th>
            <th scope="col" className={`${CAB} text-left`}>Estado</th>
            <th scope="col" className={`${CAB} text-left`}>Tipo</th>
            <th scope="col" className={`${CAB} text-right`}>Inicio</th>
            <th scope="col" className={`${CAB} text-right`}>Alta</th>
            <th scope="col" className={`${CAB} text-right`}>Días de baja</th>
          </tr>
        </thead>
        {groups.map((group) => {
          const nombre = nombreDe(group.jugador)
          return (
            <tbody key={group.jugador.id}>
              <tr className="border-b border-border bg-sunken">
                <th scope="colgroup" colSpan={6} className="h-9 px-3 text-left font-normal">
                  <span className="inline-flex items-center gap-3">
                    <Ficha dorsal={group.jugador.dorsal} size="sm" label={nombre} />
                    <span className="font-semibold">{nombre}</span>
                    <span className="text-xs text-muted-foreground">{group.jugador.posicion_principal}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {group.cases.length} {group.cases.length === 1 ? 'alta' : 'altas'}
                    </span>
                  </span>
                </th>
              </tr>
              {group.cases.map((registro) => {
                const dias =
                  registro.dias_baja_reales ??
                  (registro.fecha_alta
                    ? daysBetween(registro.fecha_inicio, registro.fecha_alta)
                    : daysSince(registro.fecha_inicio))
                return <FilaHistorico key={registro.id} registro={registro} dias={dias} />
              })}
            </tbody>
          )
        })}
      </table>
    </div>
  )
}
