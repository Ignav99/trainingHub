/* eslint-disable @next/next/no-img-element */
import type { CSSProperties, ReactNode } from 'react'
import type { Punto, Tramo } from '@/lib/api/informesEstudio'
import { cn } from '@/lib/utils'
import { informeFontVars } from './fonts'
import s from './informe.module.css'

export { s }

export interface DocMeta {
  club: string
  equipo: string
  titulo: string
  logo: string | null
  fecha: string
  alcance: string
}

export interface PageSpec {
  key: string
  kicker?: string
  cover?: boolean
  body: ReactNode
}

const pad2 = (n: number) => String(n).padStart(2, '0')

export function fmt(n: number | null | undefined, dec = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return n.toLocaleString('es-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

export function fmtInt(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return Math.round(n).toLocaleString('es-ES')
}

export function fechaPuntos(iso: string | null | undefined): string {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d} · ${m} · ${y}`
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return ''
  const [, m, d] = iso.slice(0, 10).split('-')
  return `${Number(d)} ${MESES[Number(m) - 1] ?? ''}`
}

export function chunk<T>(arr: T[], size: number): T[][] {
  if (arr.length === 0) return [[]]
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

export function Crest({ src, name, className, fallbackClassName }: {
  src: string | null | undefined
  name: string
  className: string
  fallbackClassName: string
}) {
  if (!src) return <div className={fallbackClassName}>{initials(name)}</div>
  return <img src={src} alt="" className={className} crossOrigin="anonymous" />
}

export function InformeDocumento({
  meta,
  pages,
  accent,
  highlight,
}: {
  meta: DocMeta
  pages: PageSpec[]
  accent: string
  highlight: string
}) {
  const total = pages.length
  const style = { '--accent': accent, '--hl': highlight } as CSSProperties
  return (
    <div className={cn(s.doc, informeFontVars)} style={style}>
      {pages.map((p, i) =>
        p.cover ? (
          <section key={p.key} className={s.cover}>
            {p.body}
          </section>
        ) : (
          <section key={p.key} className={s.page}>
            <header className={s.band}>
              <Crest
                src={meta.logo}
                name={meta.club}
                className={s.bandCrest}
                fallbackClassName={s.bandCrestFallback}
              />
              <div className={s.bandText}>
                <div className={s.bandKicker}>{p.kicker}</div>
                <div>
                  {meta.titulo} · {meta.club}
                </div>
              </div>
              <div className={s.bandMeta}>
                <div>{meta.fecha}</div>
                <div>{meta.alcance}</div>
              </div>
            </header>
            <div className={s.body}>{p.body}</div>
            <footer className={s.footer}>
              <span>
                {meta.titulo} · {meta.club} · Información confidencial
              </span>
              <span>
                Pág. {pad2(i + 1)} / {pad2(total)}
              </span>
            </footer>
          </section>
        )
      )}
    </div>
  )
}

export function Cover({
  meta,
  top,
  titulo,
  outline,
  subtitulo,
  scope,
  rivalLogo,
}: {
  meta: DocMeta
  top: string
  titulo: string
  outline?: string
  subtitulo?: string
  scope?: string
  rivalLogo?: string | null
}) {
  return (
    <>
      <div className={s.coverSplit} />
      <div className={s.coverLine} />
      <Crest src={meta.logo} name={meta.club} className={s.coverCrest} fallbackClassName={s.coverCrestFallback} />
      {rivalLogo ? <img src={rivalLogo} alt="" className={s.coverRival} crossOrigin="anonymous" /> : null}
      <div className={s.coverInner}>
        <div className={s.coverTop}>{top}</div>
        <div className={s.coverTitle}>
          {titulo}
          {outline ? <span>{outline}</span> : null}
        </div>
        {subtitulo ? <div className={s.coverSubtitle}>{subtitulo}</div> : null}
        <div className={s.coverBottom}>
          <span className={s.coverDate}>{meta.fecha}</span>
          {scope ? <span className={s.coverScope}>{scope}</span> : null}
        </div>
        <div className={s.coverFoot}>
          {meta.titulo} · {meta.club} · Información confidencial
        </div>
      </div>
    </>
  )
}

export function Heading({ kicker, children, lead }: { kicker: string; children: ReactNode; lead?: ReactNode }) {
  return (
    <div>
      <div className={s.kicker}>{kicker}</div>
      <h2 className={s.title}>{children}</h2>
      {lead ? <p className={s.lead}>{lead}</p> : null}
    </div>
  )
}

export function Kicker({ children }: { children: ReactNode }) {
  return <div className={s.kicker}>{children}</div>
}

export interface KpiItem {
  value: string
  unit?: string
  label: string
  accent?: boolean
}

export function Kpis({ items, cols = 4 }: { items: KpiItem[]; cols?: number }) {
  return (
    <div className={s.kpis} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {items.map((k) => (
        <div key={k.label} className={cn(s.kpi, k.accent && s.kpiAccent)}>
          <div>
            <span className={s.kpiValue}>{k.value}</span>
            {k.unit ? <span className={s.kpiUnit}>{k.unit}</span> : null}
          </div>
          <div className={s.kpiLabel}>{k.label}</div>
        </div>
      ))}
    </div>
  )
}

export function Bars({
  rows,
  max,
  tone = 'ink',
  labelWidth,
}: {
  rows: { label: ReactNode; value: number; display?: string }[]
  max?: number
  tone?: 'ink' | 'accent' | 'hl'
  labelWidth?: string
}) {
  const top = max ?? Math.max(1, ...rows.map((r) => r.value))
  const fill = tone === 'accent' ? s.barFillAccent : tone === 'hl' ? s.barFillHl : s.barFill
  return (
    <div className={s.bars}>
      {rows.map((r, i) => (
        <div
          key={i}
          className={s.barRow}
          style={labelWidth ? { gridTemplateColumns: `${labelWidth} 1fr minmax(14mm, auto)` } : undefined}
        >
          <span>{r.label}</span>
          <span className={s.barTrack}>
            <span className={fill} style={{ width: `${Math.min(100, (r.value / top) * 100)}%` }} />
          </span>
          <span className={cn(s.num, s.mono)} style={{ textAlign: 'right' }}>
            {r.display ?? fmtInt(r.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

export function Versus({
  rows,
  left,
  right,
}: {
  rows: { label: string; nos: number; rival: number; fmtValue?: (n: number) => string }[]
  left: string
  right: string
}) {
  return (
    <div>
      <div className={s.vsRow} style={{ borderBottom: '0.5mm solid var(--ink)' }}>
        <span />
        <span className={s.vsLabel} style={{ textAlign: 'right' }}>
          {left}
        </span>
        <span />
        <span className={s.vsLabel} style={{ textAlign: 'left' }}>
          {right}
        </span>
        <span />
      </div>
      {rows.map((r) => {
        const top = Math.max(1, r.nos, r.rival)
        const f = r.fmtValue ?? fmtInt
        return (
          <div key={r.label} className={s.vsRow}>
            <span className={s.vsNum} style={{ textAlign: 'right' }}>
              {f(r.nos)}
            </span>
            <span className={s.vsTrackL}>
              <span className={s.vsFillL} style={{ width: `${(r.nos / top) * 100}%` }} />
            </span>
            <span className={s.vsLabel}>{r.label}</span>
            <span className={s.vsTrackR}>
              <span className={s.vsFillR} style={{ width: `${(r.rival / top) * 100}%` }} />
            </span>
            <span className={s.vsNum}>{f(r.rival)}</span>
          </div>
        )
      })}
    </div>
  )
}

export function ResultChip({ r, gf, gc }: { r: string | null; gf: number | null; gc: number | null }) {
  const cls = r === 'V' ? s.chipV : r === 'D' ? s.chipD : s.chipE
  const txt = gf === null || gc === null ? '–' : `${gf}–${gc}`
  return <span className={cn(s.chip, cls)}>{txt}</span>
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className={s.empty}>{children}</div>
}

export function Lines({ n }: { n: number }) {
  return (
    <div className={s.lines}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} />
      ))}
    </div>
  )
}

/* ---------- SVG charts ---------- */

export interface ColumnDatum {
  label: string
  sub?: string
  value: number | null
  display?: string
  tone?: 'ink' | 'accent' | 'hl' | 'soft'
  ref?: number | null
}

const TONE: Record<string, string> = {
  ink: 'var(--ink)',
  accent: 'var(--accent)',
  hl: 'var(--hl)',
  soft: '#cfcfcf',
}

export function Columns({
  data,
  height = 52,
  max,
  refLabel,
}: {
  data: ColumnDatum[]
  height?: number
  max?: number
  refLabel?: string
}) {
  const W = 180
  const top = 9
  const bottom = 12
  const plotH = height - top - bottom
  const vmax = max ?? Math.max(1, ...data.map((d) => Math.max(d.value ?? 0, d.ref ?? 0)))
  const n = Math.max(1, data.length)
  const slot = W / n
  const bw = Math.min(16, slot * 0.62)
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className={s.svg} role="img">
      <line x1={0} x2={W} y1={top + plotH} y2={top + plotH} stroke="var(--ink)" strokeWidth={0.35} />
      {data.map((d, i) => {
        const x = i * slot + (slot - bw) / 2
        const h = d.value ? (d.value / vmax) * plotH : 0
        const y = top + plotH - h
        const refY = d.ref ? top + plotH - (d.ref / vmax) * plotH : null
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={h} fill={TONE[d.tone ?? 'ink']} />
            {refY !== null ? (
              <line x1={x - 1} x2={x + bw + 1} y1={refY} y2={refY} stroke="var(--ink)" strokeWidth={0.5} />
            ) : null}
            <text x={x + bw / 2} y={y - 1.6} textAnchor="middle" fontSize={3.2} className={s.svgText}>
              {d.display ?? (d.value === null ? '—' : fmtInt(d.value))}
            </text>
            <text x={x + bw / 2} y={top + plotH + 4.4} textAnchor="middle" fontSize={3} className={s.svgText}>
              {d.label}
            </text>
            {d.sub ? (
              <text
                x={x + bw / 2}
                y={top + plotH + 8.2}
                textAnchor="middle"
                fontSize={2.5}
                fill="#777"
                className={s.svgText}
              >
                {d.sub}
              </text>
            ) : null}
          </g>
        )
      })}
      {refLabel ? (
        <text x={W} y={4} textAnchor="end" fontSize={2.6} fill="#555" className={s.svgText}>
          {refLabel}
        </text>
      ) : null}
    </svg>
  )
}

export function TramosChart({ tramos, height = 58 }: { tramos: Tramo[]; height?: number }) {
  const W = 180
  const mid = height / 2
  const half = mid - 9
  const vmax = Math.max(1, ...tramos.map((t) => Math.max(t.favor, t.contra)))
  const slot = W / Math.max(1, tramos.length)
  const bw = Math.min(18, slot * 0.6)
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className={s.svg} role="img">
      <line x1={0} x2={W} y1={mid} y2={mid} stroke="var(--ink)" strokeWidth={0.4} />
      {tramos.map((t, i) => {
        const x = i * slot + (slot - bw) / 2
        const hf = (t.favor / vmax) * half
        const hc = (t.contra / vmax) * half
        return (
          <g key={t.tramo}>
            <rect x={x} y={mid - hf} width={bw} height={hf} fill="var(--ink)" />
            <rect x={x} y={mid} width={bw} height={hc} fill="var(--accent)" />
            {t.favor ? (
              <text x={x + bw / 2} y={mid - hf - 1.4} textAnchor="middle" fontSize={3.2} className={s.svgText}>
                {t.favor}
              </text>
            ) : null}
            {t.contra ? (
              <text x={x + bw / 2} y={mid + hc + 3.8} textAnchor="middle" fontSize={3.2} className={s.svgText}>
                {t.contra}
              </text>
            ) : null}
            <text x={x + bw / 2} y={height - 1} textAnchor="middle" fontSize={2.8} fill="#555" className={s.svgText}>
              {t.tramo}&apos;
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function PuntosLine({
  puntos,
  labels,
  height = 46,
}: {
  puntos: number[]
  labels: string[]
  height?: number
}) {
  const W = 180
  const top = 6
  const bottom = 9
  const plotH = height - top - bottom
  const n = puntos.length
  const maxPts = Math.max(3, n * 3)
  const x = (i: number) => (n <= 1 ? W / 2 : 6 + (i * (W - 12)) / (n - 1))
  const y = (v: number) => top + plotH - (v / maxPts) * plotH
  const path = puntos.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const ideal = `M${x(0).toFixed(1)},${y(3).toFixed(1)} L${x(n - 1).toFixed(1)},${y(n * 3).toFixed(1)}`
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className={s.svg} role="img">
      <line x1={0} x2={W} y1={top + plotH} y2={top + plotH} stroke="var(--ink)" strokeWidth={0.35} />
      {n > 1 ? <path d={ideal} stroke="#bbb" strokeWidth={0.4} strokeDasharray="1.5 1.2" fill="none" /> : null}
      <path d={path} stroke="var(--accent)" strokeWidth={0.9} fill="none" />
      {puntos.map((v, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(v)} r={1.2} fill="var(--ink)" />
          <text x={x(i)} y={y(v) - 2.2} textAnchor="middle" fontSize={2.8} className={s.svgText}>
            {v}
          </text>
          <text x={x(i)} y={height - 2} textAnchor="middle" fontSize={2.6} fill="#555" className={s.svgText}>
            {labels[i]}
          </text>
        </g>
      ))}
    </svg>
  )
}

/** Campo 150×100 con la portería propia a la izquierda. */
export function Pitch({
  puntos,
  tercios,
  tone = 'ink',
  label,
}: {
  puntos: Punto[]
  tercios?: number[]
  tone?: 'ink' | 'accent'
  label?: string
}) {
  const color = tone === 'accent' ? 'var(--accent)' : 'var(--ink)'
  const total = (tercios ?? []).reduce((a, b) => a + b, 0)
  const line = { stroke: '#9a9a9a', strokeWidth: 0.35, fill: 'none' }
  return (
    <svg viewBox="0 0 150 108" className={s.svg} role="img">
      <rect x={5} y={0} width={140} height={100} fill="#f6f6f6" />
      {(tercios ?? []).map((n, i) => {
        const share = total ? n / total : 0
        return (
          <g key={i}>
            <rect
              x={5 + (i * 140) / 3}
              y={0}
              width={140 / 3}
              height={100}
              fill={color}
              opacity={0.05 + share * 0.28}
            />
            <text
              x={5 + (i * 140) / 3 + 140 / 6}
              y={106}
              textAnchor="middle"
              fontSize={4}
              className={s.svgText}
            >
              {n} · {total ? Math.round(share * 100) : 0}%
            </text>
          </g>
        )
      })}
      <rect x={5} y={0} width={140} height={100} {...line} />
      <line x1={75} x2={75} y1={0} y2={100} {...line} />
      <circle cx={75} cy={50} r={9.15} {...line} />
      <rect x={5} y={29.8} width={16.5} height={40.4} {...line} />
      <rect x={128.5} y={29.8} width={16.5} height={40.4} {...line} />
      <rect x={5} y={41.6} width={5.5} height={16.8} {...line} />
      <rect x={139.5} y={41.6} width={5.5} height={16.8} {...line} />
      <line x1={5 + 140 / 3} x2={5 + 140 / 3} y1={0} y2={100} stroke="#bbb" strokeWidth={0.3} strokeDasharray="1.4 1.4" />
      <line x1={5 + 280 / 3} x2={5 + 280 / 3} y1={0} y2={100} stroke="#bbb" strokeWidth={0.3} strokeDasharray="1.4 1.4" />
      {puntos.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={1.7} fill={color} stroke="#fff" strokeWidth={0.4} />
      ))}
      {label ? (
        <text x={7} y={5.5} fontSize={3.4} className={s.svgText} fill="#444">
          {label}
        </text>
      ) : null}
    </svg>
  )
}

export function Swatch({ color }: { color: string }) {
  return <span className={s.swatch} style={{ background: color }} />
}
