'use client'

import { Gavel, AlertTriangle, CheckCircle2, Clock, Info, ShieldAlert, UserX } from 'lucide-react'
import type { SancionesPartido, SancionadoPartido } from '@/types'

type Tone = 'dark' | 'light'

const TONES = {
  dark: {
    card: 'bg-slate-900 border border-slate-700 text-white',
    muted: 'text-slate-400',
    faint: 'text-slate-500',
    row: 'bg-slate-800/60',
    baja: 'bg-red-950/50 border border-red-800/40',
    aviso: 'bg-amber-950/30 border border-amber-800/30 text-amber-300',
    pipOff: 'bg-slate-700',
    divider: 'border-slate-700',
  },
  light: {
    card: 'bg-card border border-amber-200 text-foreground',
    muted: 'text-muted-foreground',
    faint: 'text-muted-foreground/80',
    row: 'bg-muted/50',
    baja: 'bg-red-50 border border-red-200',
    aviso: 'bg-amber-50 border border-amber-200 text-amber-800',
    pipOff: 'bg-slate-200',
    divider: 'border-border',
  },
} as const

const COMITE = {
  publicado: { icon: CheckCircle2, cls: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' },
  pendiente: { icon: Clock, cls: 'bg-amber-500/15 text-amber-500 border-amber-500/30' },
  retrasado: { icon: AlertTriangle, cls: 'bg-red-500/15 text-red-500 border-red-500/30' },
  faltan_partidos: { icon: Clock, cls: 'bg-sky-500/15 text-sky-500 border-sky-500/30' },
  sin_partidos: { icon: Info, cls: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
} as const

function fechaCorta(iso?: string | null) {
  if (!iso) return ''
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
}

function textoComite(data: SancionesPartido) {
  const { comite } = data
  const viernes = fechaCorta(comite.fecha_esperada)
  switch (comite.estado) {
    case 'publicado':
      return `Comité de la J${comite.jornada} publicado · información definitiva`
    case 'pendiente':
      return `Comité de la J${comite.jornada} pendiente${viernes ? ` · sale el ${viernes}` : ''}`
    case 'retrasado':
      return `Comité de la J${comite.jornada} sin publicar${viernes ? ` (se esperaba el ${viernes})` : ''}`
    case 'faltan_partidos': {
      const js = (comite.jornadas_por_jugar ?? []).map((j) => `J${j}`).join(', ')
      return `El rival aún juega ${js} antes · definitivo con el comité${viernes ? ` del ${viernes}` : ''}`
    }
    default:
      return 'El rival no ha jugado todavía'
  }
}

function Pips({ total, cumplidos, off }: { total: number; cumplidos: number; off: string }) {
  if (total <= 0 || total > 12) return null
  return (
    <div className="flex items-center gap-0.5" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-2.5 w-2.5 rounded-sm ${i < cumplidos ? off : 'bg-red-500'}`}
        />
      ))}
    </div>
  )
}

function Ciclo({ n, off }: { n: number; off: string }) {
  return (
    <div className="flex items-center gap-0.5" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={`h-3 w-2 rounded-[2px] ${i < n % 5 ? 'bg-amber-400' : off}`} />
      ))}
    </div>
  )
}

function SancionadoFila({ s, tone }: { s: SancionadoPartido; tone: Tone }) {
  const t = TONES[tone]
  const motivo = s.temporal?.motivo ?? s.sanciones[s.sanciones.length - 1]?.motivo ?? ''
  const jornadas = s.sanciones
    .map((x) => x.jornada)
    .filter((j, i, all) => all.indexOf(j) === i)
    .map((j) => `J${j}`)
    .join(', ')
  const cumpleAntes = !s.baja && s.pendientes > 0
  const resumen = s.temporal
    ? `${s.temporal.cantidad} ${s.temporal.unidad === 'anos' ? 'año(s)' : 'mes(es)'} de suspensión`
    : `${s.partidos_total} ${s.partidos_total === 1 ? 'partido' : 'partidos'} · ${s.cumplidos} cumplido${s.cumplidos === 1 ? '' : 's'}${
        s.baja ? ` · le falta${s.pendientes_para_partido === 1 ? '' : 'n'} ${s.pendientes_para_partido}` : ''
      }`

  return (
    <li className={`rounded-md px-2.5 py-2 ${s.baja ? t.baja : t.row}`}>
      <div className="flex items-center gap-2">
        {s.categoria === 'jugador' ? (
          <UserX className={`h-3.5 w-3.5 shrink-0 ${s.baja ? 'text-red-500' : t.muted}`} />
        ) : (
          <Gavel className={`h-3.5 w-3.5 shrink-0 ${t.muted}`} />
        )}
        <span className="text-xs font-semibold truncate flex-1">{s.nombre}</span>
        {s.categoria !== 'jugador' && (
          <span className={`text-[9px] uppercase tracking-wide ${t.muted}`}>Banquillo</span>
        )}
        <Pips total={s.partidos_total} cumplidos={s.cumplidos} off={t.pipOff} />
        {s.baja ? (
          <span className="rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-bold text-white">BAJA</span>
        ) : cumpleAntes ? (
          <span className="rounded bg-sky-600/80 px-1.5 py-0.5 text-[9px] font-bold text-white">Cumple antes</span>
        ) : null}
      </div>
      <p className={`mt-1 text-[10px] leading-snug ${t.muted}`}>
        {resumen}
        {jornadas ? ` · sanción ${jornadas}` : ''}
        {motivo ? ` · ${motivo}` : ''}
        {s.sanciones.some((x) => x.deducida) ? ' · deducida por 5ª amarilla' : ''}
      </p>
    </li>
  )
}

export function SancionesPartidoWidget({
  data,
  tone = 'dark',
  className = '',
}: {
  data?: SancionesPartido | null
  tone?: Tone
  className?: string
}) {
  const t = TONES[tone]
  if (!data) return null
  const comite = COMITE[data.comite.estado] ?? COMITE.sin_partidos
  const ComiteIcon = comite.icon
  const bajas = data.sancionados.filter((s) => s.baja)
  const resto = data.sancionados.filter((s) => !s.baja)
  const vacio =
    !data.sancionados.length && !data.provisionales.length && !data.apercibidos.length

  return (
    <section className={`rounded-lg p-4 space-y-3 ${t.card} ${className}`} aria-label="Sancionados del rival">
      <header className="flex flex-wrap items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-red-500" />
        <h4 className="text-sm font-bold">Sancionados para el partido</h4>
        <span className={`text-[10px] ${t.muted}`}>
          J{data.jornada_objetivo}
          {data.fecha_partido ? ` · ${fechaCorta(data.fecha_partido)}` : ''}
        </span>
        {bajas.length > 0 && (
          <span className="ml-auto rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
            {bajas.length} {bajas.length === 1 ? 'baja' : 'bajas'}
          </span>
        )}
      </header>

      <div className={`flex items-start gap-1.5 rounded-md border px-2 py-1.5 text-[11px] ${comite.cls}`}>
        <ComiteIcon className="h-3.5 w-3.5 shrink-0 mt-px" />
        <span>{textoComite(data)}</span>
      </div>

      {bajas.length > 0 && (
        <ul className="space-y-1.5">
          {bajas.map((s) => <SancionadoFila key={`${s.categoria}-${s.nombre}`} s={s} tone={tone} />)}
        </ul>
      )}

      {data.provisionales.length > 0 && (
        <div className="space-y-1.5">
          <p className={`text-[10px] font-semibold uppercase tracking-wide ${t.muted}`}>
            Pendiente de comité · según el acta
          </p>
          <ul className="space-y-1">
            {data.provisionales.map((p) => (
              <li key={`${p.tipo}-${p.nombre}`} className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 ${t.row}`}>
                <span
                  className={`h-3.5 w-2.5 shrink-0 rounded-[2px] ${p.tipo === 'ciclo' ? 'bg-amber-400' : 'bg-red-500'}`}
                  aria-hidden
                />
                <span className="text-xs font-semibold truncate">{p.nombre}</span>
                <span className={`ml-auto text-[10px] text-right ${t.muted}`}>{p.detalle}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.apercibidos.length > 0 && (
        <div className="space-y-1.5">
          <p className={`text-[10px] font-semibold uppercase tracking-wide ${t.muted}`}>
            Apercibidos · una amarilla más y se pierden el siguiente
          </p>
          <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {data.apercibidos.map((a) => (
              <li key={a.nombre} className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 ${t.row}`}>
                <AlertTriangle className="h-3 w-3 shrink-0 text-amber-500" />
                <span className="text-xs truncate flex-1">{a.nombre}</span>
                <Ciclo n={a.amarillas} off={t.pipOff} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {resto.length > 0 && (
        <ul className="space-y-1.5">
          {resto.map((s) => <SancionadoFila key={`${s.categoria}-${s.nombre}`} s={s} tone={tone} />)}
        </ul>
      )}

      {data.cumplidas_recientes.length > 0 && (
        <p className={`text-[10px] leading-relaxed ${t.faint}`}>
          <span className="font-semibold">Ya cumplida: </span>
          {data.cumplidas_recientes
            .map((s) => `${s.nombre} (J${s.sanciones[s.sanciones.length - 1]?.jornada}, ${s.partidos_total} p.)`)
            .join(' · ')}
        </p>
      )}

      {vacio && (
        <p className={`text-xs text-center py-1 ${t.faint}`}>
          {data.sin_datos
            ? 'Sin actas del comité para esta competición todavía.'
            : 'Sin sancionados ni apercibidos para este partido.'}
        </p>
      )}

      {data.avisos.length > 0 && (
        <ul className="space-y-1">
          {data.avisos.map((a) => (
            <li key={a} className={`flex items-start gap-1.5 rounded px-2 py-1 text-[10px] ${t.aviso}`}>
              <Info className="h-3 w-3 shrink-0 mt-px" />
              {a}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
