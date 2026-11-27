'use client'

import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  denormalizeFoulDot, normalizeFoulDot, TEAM_STAT_FIELDS,
  type AnotadorSnapshot, type AttackLane, type TeamStatKey,
} from '@/lib/anotador'
import { AvatarJugador, type DatosFicha } from './FichaJugador'
import { Boton, Hoja, Paso, PULSAR, Rotulo, Segmentado } from './Piezas'

type Vista = 'ocasiones' | 'stats' | 'faltas' | 'notas'
type Lado = 'us' | 'rival'

export interface FilaNota {
  ficha: DatosFicha
  minutos: number
  goles: number
  asistencias: number
  amarilla: boolean
  roja: boolean
  nota: number | null
}

interface Props {
  abierta: boolean
  onCerrar: () => void
  vistaInicial?: Vista
  parte: 1 | 2
  club: string
  rival: string
  teamStats: Record<string, number>
  totales: Record<string, number>
  occasionLanes: AnotadorSnapshot['occasionLanes']
  foulMap: AnotadorSnapshot['foulMap']
  dirRight: boolean
  onBump: (key: TeamStatKey, side: Lado, delta: number) => void
  onBumpCarril: (side: Lado, lane: AttackLane, delta: number) => void
  onFoulMap: (m: AnotadorSnapshot['foulMap']) => void
  notas: FilaNota[]
  onNota: (id: string, delta: number) => void
  reflexion: string
  onReflexion: (v: string) => void
  mostrarFoto: boolean
}

const CARRILES: { id: AttackLane; etiqueta: string }[] = [
  { id: 'izq', etiqueta: 'Izquierda' },
  { id: 'cen', etiqueta: 'Centro' },
  { id: 'dch', etiqueta: 'Derecha' },
]

function Cabecera({ club, rival }: { club: string; rival: string }) {
  return (
    <>
      <span />
      <span className="truncate text-center text-sm font-bold text-muted-foreground">{club}</span>
      <span className="truncate text-center text-sm font-bold text-muted-foreground">{rival}</span>
    </>
  )
}

function MapaFaltas({
  foulMap, dirRight, parte, onChange,
}: { foulMap: AnotadorSnapshot['foulMap']; dirRight: boolean; parte: 1 | 2; onChange: (m: AnotadorSnapshot['foulMap']) => void }) {
  const [modo, setModo] = useState<'cometidas' | 'recibidas'>('cometidas')
  const puntos = foulMap[modo].map((d) => denormalizeFoulDot(d, dirRight))
  const otros = (modo === 'cometidas' ? foulMap.recibidas : foulMap.cometidas).map((d) => denormalizeFoulDot(d, dirRight))
  const poner = (next: { x: number; y: number }[]) => onChange({ ...foulMap, [modo]: next.map((d) => normalizeFoulDot(d, dirRight)) })
  const linea = { stroke: 'hsl(var(--line) / 0.55)', strokeWidth: 1.5, fill: 'none', vectorEffect: 'non-scaling-stroke' as const }
  return (
    <div className="space-y-3">
      <Segmentado
        etiqueta="Tipo de falta"
        valor={modo}
        onChange={setModo}
        opciones={[
          { valor: 'cometidas', etiqueta: `Cometidas (${foulMap.cometidas.length})` },
          { valor: 'recibidas', etiqueta: `Recibidas (${foulMap.recibidas.length})` },
        ]}
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-[15px] text-muted-foreground">
          {parte}ª parte. Toca el campo donde fue la falta. Nuestra portería queda a la izquierda. Toca un punto para quitarlo.
        </p>
        <Boton className="shrink-0" onClick={() => poner(puntos.slice(0, -1))}>Quitar última</Boton>
      </div>
      <svg
        viewBox="0 0 150 100"
        className="aspect-[3/2] max-h-[44dvh] w-full rounded-lg border-[1.5px] border-line bg-card"
        onClick={(e) => {
          const svg = e.currentTarget
          const pt = svg.createSVGPoint()
          pt.x = e.clientX
          pt.y = e.clientY
          const ctm = svg.getScreenCTM()
          if (!ctm) return
          const p = pt.matrixTransform(ctm.inverse())
          poner([...puntos, { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 }])
        }}
      >
        <rect x="5" y="5" width="140" height="90" {...linea} />
        <line x1="75" y1="5" x2="75" y2="95" {...linea} />
        <circle cx="75" cy="50" r="10" {...linea} />
        <rect x="5" y="20" width="18" height="60" {...linea} />
        <rect x="127" y="20" width="18" height="60" {...linea} />
        <rect x="5" y="32" width="8" height="36" {...linea} />
        <rect x="137" y="32" width="8" height="36" {...linea} />
        <text x="8" y="13" fill="hsl(var(--muted-foreground))" fontSize="6">Nuestra portería</text>
        <text x="142" y="13" textAnchor="end" fill="hsl(var(--muted-foreground))" fontSize="6">Ataque {dirRight ? '→' : '←'}</text>
        {otros.map((d, i) => (
          <circle key={`o${i}`} cx={d.x} cy={d.y} r="2.6" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1" className="pointer-events-none" />
        ))}
        {puntos.map((d, i) => (
          <g key={`d${i}`} onClick={(ev) => { ev.stopPropagation(); poner(puntos.filter((_, j) => j !== i)) }}>
            <circle cx={d.x} cy={d.y} r="7" fill="transparent" />
            {modo === 'cometidas'
              ? <circle cx={d.x} cy={d.y} r="3.4" fill="hsl(var(--destructive))" />
              : <rect x={d.x - 3.2} y={d.y - 3.2} width="6.4" height="6.4" fill="hsl(var(--info))" />}
          </g>
        ))}
      </svg>
    </div>
  )
}

export function HojaMas(p: Props) {
  const [vista, setVista] = useState<Vista>(p.vistaInicial || 'ocasiones')
  const normales = TEAM_STAT_FIELDS.filter((f) => f.key !== 'ocasiones_gol')
  const usBloq = p.foulMap.cometidas.length > 0
  const rivBloq = p.foulMap.recibidas.length > 0
  return (
    <Hoja abierta={p.abierta} onCerrar={p.onCerrar} titulo={`Más · ${p.parte}ª parte`} ancho={880}>
      <div className="space-y-4">
        <Segmentado
          etiqueta="Herramienta"
          valor={vista}
          onChange={setVista}
          opciones={[
            { valor: 'ocasiones', etiqueta: 'Ocasiones' },
            { valor: 'stats', etiqueta: 'Estadísticas' },
            { valor: 'faltas', etiqueta: 'Mapa de faltas' },
            { valor: 'notas', etiqueta: 'Notas' },
          ]}
        />

        {vista === 'ocasiones' && (
          <section className="space-y-3">
            <p className="text-[15px] text-muted-foreground">
              Ocasiones por carril de la {p.parte}ª parte: {p.teamStats.ocasiones_gol || 0} nuestras · {p.teamStats.rival_ocasiones_gol || 0} rivales.
              Total del partido {p.totales.ocasiones_gol || 0}–{p.totales.rival_ocasiones_gol || 0}.
            </p>
            <div className="grid grid-cols-[110px_1fr_1fr] items-center gap-2">
              <Cabecera club={p.club} rival={p.rival} />
              {CARRILES.map((c) => (
                <div key={c.id} className="contents">
                  <span className="text-base font-semibold">{c.etiqueta}</span>
                  <Paso valor={p.occasionLanes.us[c.id]} etiqueta={`ocasión ${c.etiqueta} nuestra`} onDelta={(d) => p.onBumpCarril('us', c.id, d)} />
                  <Paso valor={p.occasionLanes.rival[c.id]} etiqueta={`ocasión ${c.etiqueta} rival`} onDelta={(d) => p.onBumpCarril('rival', c.id, d)} />
                </div>
              ))}
            </div>
          </section>
        )}

        {vista === 'stats' && (
          <section className="space-y-3">
            <p className="text-[15px] text-muted-foreground">
              Contadores de la {p.parte}ª parte. Las faltas del mapa se copian aquí
              ({p.foulMap.cometidas.length} cometidas · {p.foulMap.recibidas.length} recibidas).
            </p>
            <div className="grid grid-cols-[150px_1fr_1fr] items-center gap-2">
              <Cabecera club={p.club} rival={p.rival} />
              {normales.map((f) => (
                <div key={f.key} className="contents">
                  <span className="text-base font-semibold">{f.label}</span>
                  <Paso
                    valor={p.teamStats[f.key] || 0}
                    etiqueta={`${f.label} nuestras`}
                    bloqueado={f.key === 'faltas_cometidas' && usBloq}
                    onDelta={(d) => p.onBump(f.key, 'us', d)}
                  />
                  <Paso
                    valor={p.teamStats[`rival_${f.key}`] || 0}
                    etiqueta={`${f.label} rivales`}
                    bloqueado={f.key === 'faltas_cometidas' && rivBloq}
                    onDelta={(d) => p.onBump(f.key, 'rival', d)}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {vista === 'faltas' && (
          <MapaFaltas foulMap={p.foulMap} dirRight={p.dirRight} parte={p.parte} onChange={p.onFoulMap} />
        )}

        {vista === 'notas' && (
          <section className="space-y-4">
            <div>
              <Rotulo>Rendimiento (1–10)</Rotulo>
              <ul className="mt-2 divide-y-[1.5px] divide-border rounded-lg border-[1.5px] border-border">
                {p.notas.map((n) => (
                  <li key={n.ficha.id} className="flex min-h-16 items-center gap-3 px-3 py-1.5">
                    <AvatarJugador jugador={n.ficha} mostrarFoto={p.mostrarFoto} tam={44} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-semibold">{n.ficha.etiqueta}</span>
                      <span className="block text-[14px] text-muted-foreground tabular-nums">
                        {n.minutos}′
                        {n.goles > 0 ? ` · ${n.goles} ${n.goles === 1 ? 'gol' : 'goles'}` : ''}
                        {n.asistencias > 0 ? ` · ${n.asistencias} asist.` : ''}
                        {n.amarilla ? ' · amarilla' : ''}
                        {n.roja ? ' · roja' : ''}
                      </span>
                    </span>
                    <button type="button" aria-label={`Bajar nota de ${n.ficha.etiqueta}`} onClick={() => p.onNota(n.ficha.id, -0.5)} className={cn('flex h-12 w-12 items-center justify-center rounded-lg border-[1.5px] border-border bg-secondary', PULSAR)}>
                      <Minus className="h-5 w-5" strokeWidth={1.5} />
                    </button>
                    <span className="w-12 text-center text-xl font-bold tabular-nums">{n.nota ?? '—'}</span>
                    <button type="button" aria-label={`Subir nota de ${n.ficha.etiqueta}`} onClick={() => p.onNota(n.ficha.id, 0.5)} className={cn('flex h-12 w-12 items-center justify-center rounded-lg border-[1.5px] border-border bg-secondary', PULSAR)}>
                      <Plus className="h-5 w-5" strokeWidth={1.5} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <Rotulo>Reflexión del entrenador</Rotulo>
              <textarea
                value={p.reflexion}
                onChange={(e) => p.onReflexion(e.target.value)}
                rows={5}
                placeholder="Qué mejorar esta semana. Sale en la Sala del Lunes."
                className="mt-2 w-full resize-none rounded-lg border-[1.5px] border-line bg-background p-3 text-base"
              />
            </div>
          </section>
        )}
      </div>
    </Hoja>
  )
}
