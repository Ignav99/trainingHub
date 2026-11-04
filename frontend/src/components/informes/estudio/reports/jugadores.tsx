/* eslint-disable @next/next/no-img-element */
import type { DatosJugadores, FichaJugador, FilaPlantilla } from '@/lib/api/informesEstudio'
import { cn } from '@/lib/utils'
import {
  Bars,
  Columns,
  Cover,
  Empty,
  Heading,
  Kicker,
  Kpis,
  Lines,
  ResultChip,
  chunk,
  fechaCorta,
  fmt,
  fmtInt,
  s,
} from '../primitives'
import type { BuildCtx, ReportDef } from './types'

const DISP_LABEL: Record<string, string> = { fuera: 'No disponible', limitado: 'Limitado', duda: 'Duda' }
const COMENTARIOS: [string, number][] = [
  ['Valoración general', 3],
  ['Fortalezas', 2],
  ['A mejorar', 2],
  ['Objetivo próximo mes', 2],
]
const VAL_LABEL = { tecnico: 'Técnico', tactico: 'Táctico', fisico: 'Físico', mental: 'Mental' } as const
const WELL_LABEL = { sueno: 'Sueño', fatiga: 'Fatiga', dolor: 'Dolor', estres: 'Estrés', humor: 'Humor' } as const

function cap(t: string | null | undefined): string {
  if (!t) return '—'
  return t[0].toUpperCase() + t.slice(1)
}

export function PlantillaTabla({ rows }: { rows: FilaPlantilla[] }) {
  return (
    <table className={s.table}>
      <thead>
        <tr>
          <th />
          <th>Jugador</th>
          <th className={s.r}>Conv.</th>
          <th className={s.r}>PJ</th>
          <th className={s.r}>Tit.</th>
          <th className={s.r}>Min</th>
          <th className={s.r}>% min</th>
          <th className={s.r}>G</th>
          <th className={s.r}>A</th>
          <th className={s.r}>TA/TR</th>
          <th className={s.r}>Nota</th>
          {rows.some((r) => r.asistencia_pct !== undefined) ? <th className={s.r}>Asist. entr.</th> : null}
        </tr>
      </thead>
      <tbody>
        {rows.map((j) => (
          <tr key={j.id ?? `${j.dorsal}-${j.nombre}`}>
            <td className={s.dorsal}>{j.dorsal ?? ''}</td>
            <td>
              <span className={s.strong}>{j.nombre}</span>
              <span className={s.sub}>{j.posicion ?? ''}</span>
            </td>
            <td className={s.r}>{j.convocatorias}</td>
            <td className={s.r}>{j.jugados}</td>
            <td className={s.r}>{j.titular}</td>
            <td className={s.r}>{fmtInt(j.minutos)}&apos;</td>
            <td className={s.r}>{j.minutos_pct}%</td>
            <td className={s.r}>{j.goles}</td>
            <td className={s.r}>{j.asistencias}</td>
            <td className={s.r}>
              {j.amarillas}/{j.rojas}
            </td>
            <td className={s.r}>{fmt(j.nota_media)}</td>
            {j.asistencia_pct !== undefined ? (
              <td className={s.r}>{j.asistencia_pct === null ? '—' : `${j.asistencia_pct}%`}</td>
            ) : null}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function NotaBox({ n }: { n: number | null }) {
  if (n === null) return <span className={s.notaNone}>S/C</span>
  const cls = n >= 7 ? s.notaHi : n < 5 ? s.notaLo : s.notaBox
  return <span className={cls}>{fmt(n)}</span>
}

function Ficha({ j, d, ctx }: { j: FichaJugador; d: DatosJugadores; ctx: BuildCtx }) {
  const t = j.totales
  const cols = Math.min(10, Math.max(5, j.partidos.length))
  const maxMin = Math.max(90, ...j.partidos.map((p) => p.minutos))
  const disponible = !j.disponibilidad || j.disponibilidad === 'pleno'
  const dispTxt = disponible
    ? 'Disponible'
    : j.estado === 'lesionado'
      ? 'Lesionado'
      : j.estado === 'baja'
        ? 'Baja'
        : DISP_LABEL[j.disponibilidad ?? ''] ?? cap(j.disponibilidad)
  const w = j.wellness
  const val = Object.entries(j.valoracion).filter(([, v]) => v !== null && v !== undefined) as [
    keyof typeof VAL_LABEL,
    number,
  ][]
  return (
    <>
      <div className={s.pHead}>
        <div className={s.pPhotoWrap}>
          {j.foto_url ? (
            <img src={j.foto_url} alt="" className={s.pPhoto} crossOrigin="anonymous" />
          ) : (
            <div className={s.pPhotoFallback}>{j.dorsal ?? ''}</div>
          )}
        </div>
        <div>
          <div className={s.pName}>
            {j.nombre}
            <em>{j.apellidos}</em>
          </div>
          <div style={{ display: 'flex', gap: '2mm', flexWrap: 'wrap' }}>
            <span className={s.tagInk}>{j.posicion ?? 'Sin posición'}</span>
            {j.capitan ? <span className={s.tagHl}>Capitán</span> : null}
            {j.portero ? <span className={s.tag} style={{ border: '0.25mm solid var(--ink)' }}>Portero</span> : null}
          </div>
          <div className={s.bio}>
            {[
              ['Edad', j.edad ? `${j.edad}` : '—'],
              ['Altura', j.altura ? `${j.altura} cm` : '—'],
              ['Peso', j.peso ? `${j.peso} kg` : '—'],
              ['Pierna', cap(j.pierna)],
            ].map(([k, v]) => (
              <div key={k} className={s.bioItem}>
                <div className={s.bioLabel}>{k}</div>
                <div className={s.bioValue}>{v}</div>
              </div>
            ))}
          </div>
        </div>
        <div className={s.pDorsal}>{j.dorsal ?? ''}</div>
      </div>

      <Kpis
        cols={7}
        items={[
          { value: `${t.jugados}`, unit: `/${t.partidos_equipo}`, label: 'Partidos' },
          { value: `${t.titular}`, label: 'Titular' },
          { value: fmtInt(t.minutos), unit: `${t.minutos_pct}%`, label: 'Minutos' },
          { value: `${t.goles}`, label: 'Goles' },
          { value: `${t.asistencias}`, label: 'Asistencias' },
          { value: `${t.amarillas}·${t.rojas}`, label: 'TA · TR' },
          { value: fmt(t.nota_media), label: 'Nota media', accent: true },
        ]}
      />

      <div>
        <Kicker>Partido a partido · {d.ambito_label}</Kicker>
        {j.partidos.length ? (
          <div className={s.matchStrip} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {j.partidos.map((p) => (
              <div key={p.id} className={s.matchCell} style={{ opacity: p.convocado ? 1 : 0.45 }}>
                <span className={s.matchCellTit}>{p.titular ? 'TIT' : p.convocado ? '' : 'NC'}</span>
                <span className={s.mono} style={{ fontSize: '5.4pt' }}>
                  {p.jornada ? `J${p.jornada}` : fechaCorta(p.fecha)}
                </span>
                <span className={s.matchRival}>{p.rival}</span>
                <ResultChip r={p.resultado} gf={p.gf} gc={p.gc} />
                <span className={s.minBar}>
                  <span
                    className={p.titular ? s.barFill : s.barFillAccent}
                    style={{ width: `${(p.minutos / maxMin) * 100}%` }}
                  />
                </span>
                <span className={s.mono} style={{ fontSize: '5.4pt' }}>
                  {p.minutos}&apos;
                </span>
                {p.minutos > 0 ? <NotaBox n={p.nota} /> : <span className={s.small}>—</span>}
                <span className={s.mono} style={{ fontSize: '5pt', minHeight: '1.2em' }}>
                  {[p.goles ? `${p.goles}G` : '', p.asistencias ? `${p.asistencias}A` : ''].filter(Boolean).join(' ')}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <Empty>Sin partidos en el periodo</Empty>
        )}
      </div>

      <div className={cn(s.row, s.col2)}>
        <div style={{ display: 'grid', gap: '3mm', alignContent: 'start' }}>
          <Kicker>Entrenamiento y bienestar</Kicker>
          <Bars
            tone="hl"
            max={100}
            rows={[
              {
                label: 'Asistencia',
                value: j.entrenamiento.asistencia_pct ?? 0,
                display: j.entrenamiento.asistencia_pct === null ? '—' : `${j.entrenamiento.asistencia_pct}%`,
              },
            ]}
          />
          <div className={s.small}>
            {j.entrenamiento.presente} de {j.entrenamiento.sesiones} sesiones
            {j.entrenamiento.ausencias.length
              ? ` · ausencias: ${j.entrenamiento.ausencias.map((a) => `${a.n} ${a.motivo.toLowerCase()}`).join(', ')}`
              : ''}
          </div>
          {w && w.n ? (
            <>
              <Bars
                tone="hl"
                max={25}
                rows={[{ label: 'Wellness', value: w.total ?? 0, display: `${fmt(w.total)}/25` }]}
              />
              <Bars
                max={5}
                rows={(Object.keys(WELL_LABEL) as (keyof typeof WELL_LABEL)[]).map((k) => ({
                  label: WELL_LABEL[k],
                  value: w[k] ?? 0,
                  display: fmt(w[k]),
                }))}
              />
            </>
          ) : null}
          {j.rpe ? (
            <table className={s.table}>
              <tbody>
                <tr>
                  <td>RPE en sesión (media)</td>
                  <td className={s.r}>
                    {fmt(j.rpe.sesion_media)} · {j.rpe.sesion_n} reg.
                  </td>
                  <td className={cn(s.r, s.small)}>equipo {fmt(d.media_equipo.rpe_sesion)}</td>
                </tr>
                <tr>
                  <td>RPE tras partido (media)</td>
                  <td className={s.r}>
                    {fmt(j.rpe.partido_media)} · {j.rpe.partido_n} reg.
                  </td>
                  <td className={cn(s.r, s.small)}>equipo {fmt(d.media_equipo.rpe_partido)}</td>
                </tr>
              </tbody>
            </table>
          ) : null}
          {j.carga_semanal && j.carga_semanal.some((c) => c.ua > 0) ? (
            <div>
              <div className={s.small}>Carga semanal (u.a.)</div>
              <Columns
                height={40}
                data={j.carga_semanal.map((c) => ({ label: fechaCorta(c.semana), value: c.ua, tone: 'accent' }))}
              />
            </div>
          ) : null}
        </div>
        <div style={{ display: 'grid', gap: '3mm', alignContent: 'start' }}>
          <Kicker>Disponibilidad</Kicker>
          <div>
            <span className={disponible ? s.tagHl : s.tagAccent}>{dispTxt}</span>
          </div>
          {j.medico ? (
            <div className={s.small}>
              {j.medico.registros
                ? `${j.medico.registros} registros en enfermería · ${j.medico.lesiones} lesiones · ${j.medico.dias_baja} días de baja${
                    j.medico.zonas.length ? ` · ${j.medico.zonas.join(', ')}` : ''
                  }`
                : 'Sin registros en enfermería'}
            </div>
          ) : null}
          {val.length ? (
            <>
              <Kicker>Valoración del cuerpo técnico (1–10)</Kicker>
              <Bars
                max={10}
                rows={val.map(([k, v]) => ({ label: VAL_LABEL[k] ?? k, value: v, display: fmt(v) }))}
              />
            </>
          ) : null}
          {ctx.comentarios ? (
            <>
              <Kicker>Comentarios del entrenador</Kicker>
              <div className={s.box} style={{ display: 'grid', gap: '2.4mm' }}>
                {COMENTARIOS.map(([k, n]) => (
                  <div key={k}>
                    <div className={s.bioLabel}>{k}</div>
                    <Lines n={n} />
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>
  )
}

export const JUGADORES: ReportDef<DatosJugadores> = {
  tituloDefecto: 'Fichas de jugadores',
  alcance: (d) => {
    const ps = d.partidos
    const js = ps.map((p) => p.jornada).filter((n): n is number => typeof n === 'number')
    const rango = js.length ? `J${Math.min(...js)}–J${Math.max(...js)}` : `${ps.length} partidos`
    return `${d.ambito_label} · ${rango}`
  },
  bloques: [
    {
      id: 'portada',
      label: 'Portada',
      hint: 'Escudo y alcance',
      build: (d, ctx) => [
        {
          key: 'portada',
          cover: true,
          body: (
            <Cover
              meta={ctx.meta}
              top={`Temporada ${d.equipo.temporada ?? ''} · ${d.equipo.nombre}`}
              titulo="Fichas"
              outline="de jugadores"
              subtitulo={d.jugadores.length === 1 ? `${d.jugadores[0].nombre} ${d.jugadores[0].apellidos}` : `${d.jugadores.length} jugadores`}
              scope={JUGADORES.alcance(d)}
            />
          ),
        },
      ],
    },
    {
      id: 'plantilla',
      label: 'Vista general',
      hint: 'Minutos y participación de toda la plantilla',
      build: (d) =>
        chunk(d.plantilla, 24).map((rows, pi) => ({
          key: `pl${pi}`,
          kicker: 'Plantilla · vista general',
          body: (
            <>
              {pi === 0 ? (
                <Heading
                  kicker="Minutos y participación · ordenado por minutos"
                  lead={`Media del equipo: ${fmtInt(d.media_equipo.minutos_media)}' por jugador, nota ${fmt(d.media_equipo.nota_media)}, asistencia a entrenamientos ${d.media_equipo.asistencia_pct ?? '—'}%.`}
                >
                  {d.plantilla.length} jugadores, <em>{d.partidos.length} partidos</em>
                </Heading>
              ) : null}
              <PlantillaTabla rows={rows} />
            </>
          ),
        })),
    },
    {
      id: 'fichas',
      label: 'Ficha por jugador',
      hint: 'Una página por jugador',
      build: (d, ctx) =>
        d.jugadores.map((j) => ({
          key: j.id,
          kicker: 'Ficha de jugador',
          body: <Ficha j={j} d={d} ctx={ctx} />,
        })),
    },
  ],
}

