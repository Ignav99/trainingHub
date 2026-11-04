import type { DatosEntrenamiento, SesionInforme } from '@/lib/api/informesEstudio'
import { cn } from '@/lib/utils'
import {
  Bars,
  Columns,
  Cover,
  Empty,
  Heading,
  Kicker,
  Kpis,
  chunk,
  fechaCorta,
  fmt,
  fmtInt,
  s,
} from '../primitives'
import type { ReportDef } from './types'

const NUM = ['cero', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce']

function semanasTxt(n: number): string {
  const w = n < NUM.length ? NUM[n] : String(n)
  return `${w} ${n === 1 ? 'semana' : 'semanas'}`
}

function periodo(d: DatosEntrenamiento): string {
  const a = d.alcance
  if (!a.desde && !a.hasta) return 'Toda la temporada'
  return `${fechaCorta(a.desde)} – ${fechaCorta(a.hasta)}`
}

function tiempoEfectivo(sesiones: SesionInforme[]): number | null {
  let dur = 0
  let tar = 0
  for (const x of sesiones) {
    if (!x.duracion) continue
    dur += x.duracion
    tar += Math.min(x.minutos_tareas, x.duracion)
  }
  return dur ? Math.round((tar / dur) * 100) : null
}

function SesionCard({ x }: { x: SesionInforme }) {
  const tareas = x.tareas.slice(0, 9)
  return (
    <div className={s.boxSoft} style={{ display: 'grid', gap: '2mm', breakInside: 'avoid' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '4mm', alignItems: 'baseline' }}>
        <div style={{ minWidth: 0 }}>
          <div className={s.kicker} style={{ margin: 0 }}>
            {fechaCorta(x.fecha)} · {x.md ?? 'Sin MD'}
            {x.pretemporada ? ' · Pretemporada' : ''}
          </div>
          <div className={s.h3}>{x.titulo || 'Sesión'}</div>
        </div>
        <div className={s.mono} style={{ textAlign: 'right', fontSize: '6.4pt', whiteSpace: 'nowrap' }}>
          {x.duracion ?? '—'}&apos; · {x.presentes}/{x.convocados} jug. · RPE {fmt(x.rpe_medio)}
        </div>
      </div>
      {x.objetivo ? <div className={s.small} style={{ color: '#333' }}>{x.objetivo}</div> : null}
      {tareas.length ? (
        <table className={s.table}>
          <tbody>
            {tareas.map((t, i) => (
              <tr key={i}>
                <td style={{ width: '6mm' }} className={s.mono}>
                  {String(i + 1).padStart(2, '0')}
                </td>
                <td>{t.titulo}</td>
                <td className={s.small} style={{ width: '38mm' }}>
                  {t.fase || t.fase_sesion}
                </td>
                <td className={s.r} style={{ width: '10mm' }}>
                  {t.minutos ? `${t.minutos}'` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className={s.small}>Sin tareas registradas</div>
      )}
      {x.tareas.length > tareas.length ? (
        <div className={s.small}>+ {x.tareas.length - tareas.length} tareas más</div>
      ) : null}
    </div>
  )
}

export const ENTRENAMIENTO: ReportDef<DatosEntrenamiento> = {
  tituloDefecto: 'Sesiones de entrenamiento',
  alcance: (d) => periodo(d),
  bloques: [
    {
      id: 'portada',
      label: 'Portada',
      hint: 'Escudo, periodo o microciclo',
      build: (d, ctx) => [
        {
          key: 'portada',
          cover: true,
          body: (
            <Cover
              meta={ctx.meta}
              top={`Temporada ${d.equipo.temporada ?? ''} · ${d.equipo.nombre}`}
              titulo={d.alcance.tipo === 'microciclo' ? 'Microciclo' : 'Sesiones'}
              outline={d.alcance.tipo === 'microciclo' ? 'de trabajo' : 'de entrenamiento'}
              subtitulo={d.alcance.rival ? `Semana ante ${d.alcance.rival}` : periodo(d)}
              scope={`${d.resumen.sesiones} sesiones · ${periodo(d)}`}
              rivalLogo={d.alcance.escudo_rival}
            />
          ),
        },
      ],
    },
    {
      id: 'resumen',
      label: 'Resumen',
      hint: 'Sesiones, tiempo efectivo, asistencia y carga',
      build: (d) => {
        const r = d.resumen
        const te = tiempoEfectivo(d.sesiones)
        const objetivos = [
          ['Objetivo', d.alcance.objetivo],
          ['Táctico', d.alcance.objetivo_tactico],
          ['Físico', d.alcance.objetivo_fisico],
        ].filter(([, v]) => v)
        return [
          {
            key: 'resumen',
            kicker: 'Resumen',
            body: (
              <>
                <Heading
                  kicker="Visión general"
                  lead={`Del ${fechaCorta(d.alcance.desde)} al ${fechaCorta(d.alcance.hasta)}. Tiempo efectivo = minutos en tareas sobre la duración de la sesión.`}
                >
                  {r.sesiones} sesiones, <em>{semanasTxt(r.semanas)}</em> de trabajo
                </Heading>
                <Kpis
                  cols={3}
                  items={[
                    { value: String(r.sesiones), label: `Sesiones · ${r.tareas} tareas` },
                    { value: te === null ? '—' : String(te), unit: '%', label: 'Tiempo efectivo' },
                    { value: fmtInt(r.duracion_media), unit: 'min', label: 'Duración media de sesión' },
                    { value: r.asistencia_pct === null ? '—' : String(r.asistencia_pct), unit: '%', label: 'Asistencia media', accent: true },
                    { value: fmt(r.rpe_medio), unit: '/10', label: `RPE medio · ${r.registros_rpe} registros` },
                    { value: fmtInt(r.carga_media), unit: 'u.a.', label: 'Carga media por registro' },
                  ]}
                />
                {objetivos.length ? (
                  <div className={cn(s.row, s.col3)}>
                    {objetivos.map(([k, v]) => (
                      <div key={k} className={s.box}>
                        <div className={s.h3}>{k}</div>
                        <div>{v}</div>
                      </div>
                    ))}
                  </div>
                ) : null}
                {d.semanas.length > 1 ? (
                  <div>
                    <Kicker>Minutos por semana · debajo, asistencia</Kicker>
                    <Columns
                      height={62}
                      data={d.semanas.map((w) => ({
                        label: fechaCorta(w.inicio),
                        sub: w.asistencia_pct === null ? '' : `${Math.round(w.asistencia_pct)}%`,
                        value: w.minutos,
                        tone: 'ink',
                      }))}
                    />
                  </div>
                ) : null}
                {d.sesiones.length > 1 && d.semanas.length <= 1 ? (
                  <div>
                    <Kicker>Minutos por sesión</Kicker>
                    <Columns
                      height={62}
                      data={d.sesiones.map((x) => ({
                        label: x.md ?? fechaCorta(x.fecha),
                        sub: fechaCorta(x.fecha),
                        value: x.duracion ?? 0,
                        tone: 'ink',
                      }))}
                    />
                  </div>
                ) : null}
              </>
            ),
          },
        ]
      },
    },
    {
      id: 'semana_tipo',
      label: 'Semana tipo',
      hint: 'Duración, RPE, carga y asistencia por día (MD)',
      build: (d) => {
        if (!d.por_md.length) return []
        return [
          {
            key: 'md',
            kicker: 'Semana tipo',
            body: (
              <>
                <Heading kicker="Semana tipo · respecto al partido (MD)">
                  Cómo se <em>reparte</em> la semana
                </Heading>
                <div>
                  <Kicker>RPE medio por día</Kicker>
                  <Columns
                    height={56}
                    max={10}
                    data={d.por_md.map((m) => ({
                      label: m.md,
                      sub: `${m.sesiones} ses.`,
                      value: m.rpe_medio,
                      display: fmt(m.rpe_medio),
                      tone: 'accent',
                    }))}
                  />
                </div>
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th>Día</th>
                      <th className={s.r}>Sesiones</th>
                      <th className={s.r}>Duración media</th>
                      <th className={s.r}>RPE medio</th>
                      <th className={s.r}>Carga media (u.a.)</th>
                      <th className={s.r}>Asistencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.por_md.map((m) => (
                      <tr key={m.md}>
                        <td className={s.strong}>{m.md}</td>
                        <td className={s.r}>{m.sesiones}</td>
                        <td className={s.r}>{fmtInt(m.duracion_media)}&apos;</td>
                        <td className={s.r}>{fmt(m.rpe_medio)}</td>
                        <td className={s.r}>{fmtInt(m.carga_media)}</td>
                        <td className={s.r}>{m.asistencia_pct === null ? '—' : `${Math.round(m.asistencia_pct)}%`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ),
          },
        ]
      },
    },
    {
      id: 'contenidos',
      label: 'Qué se trabaja',
      hint: 'Contenidos por minutos y ejercicios más usados',
      build: (d) => [
        {
          key: 'contenidos',
          kicker: 'Contenidos',
          body: (
            <>
              <Heading kicker="Contenidos por tiempo de tarea">
                Qué se <em>trabaja</em>
              </Heading>
              {d.contenidos.length ? (
                <Bars
                  labelWidth="48mm"
                  tone="accent"
                  max={Math.max(...d.contenidos.map((c) => c.pct))}
                  rows={d.contenidos.map((c) => ({
                    label: c.bloque,
                    value: c.pct,
                    display: `${c.pct}% · ${c.minutos}'`,
                  }))}
                />
              ) : (
                <Empty>Sin tareas con fase registrada</Empty>
              )}
              {d.ejercicios.length ? (
                <div>
                  <Kicker>Ejercicios más repetidos</Kicker>
                  <table className={s.table}>
                    <thead>
                      <tr>
                        <th>Ejercicio</th>
                        <th>Contenido</th>
                        <th className={s.r}>Veces</th>
                        <th className={s.r}>Minutos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.ejercicios.map((e) => (
                        <tr key={e.titulo}>
                          <td className={s.strong}>{e.titulo}</td>
                          <td>{e.fase || '—'}</td>
                          <td className={s.r}>{e.veces}</td>
                          <td className={s.r}>{e.minutos}&apos;</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </>
          ),
        },
      ],
    },
    {
      id: 'asistencia',
      label: 'Asistencia y carga',
      hint: 'Por jugador: sesiones, asistencia, RPE y carga',
      build: (d) => {
        const filas = d.jugadores
        const pages = chunk(filas, 26)
        return pages.map((rows, pi) => ({
          key: `asis${pi}`,
          kicker: 'Asistencia y carga',
          body: (
            <>
              {pi === 0 ? (
                <Heading kicker="Asistencia y carga por jugador">
                  {d.resumen.asistencia_pct ?? '—'}% de <em>asistencia</em>
                </Heading>
              ) : null}
              {pi === 0 && d.ausencias.length ? (
                <div>
                  <Kicker>Motivos de ausencia</Kicker>
                  <Bars rows={d.ausencias.map((a) => ({ label: a.motivo, value: a.n }))} />
                </div>
              ) : null}
              <table className={s.table}>
                <thead>
                  <tr>
                    <th />
                    <th>Jugador</th>
                    <th className={s.r}>Sesiones</th>
                    <th className={s.r}>Presente</th>
                    <th style={{ width: '46mm' }}>Asistencia</th>
                    <th className={s.r}>RPE medio</th>
                    <th className={s.r}>Carga total</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((j) => (
                    <tr key={`${j.dorsal}-${j.nombre}`}>
                      <td className={s.dorsal}>{j.dorsal ?? ''}</td>
                      <td>
                        <span className={s.strong}>{j.nombre}</span>
                        <span className={s.sub}>{j.posicion ?? ''}</span>
                      </td>
                      <td className={s.r}>{j.sesiones}</td>
                      <td className={s.r}>{j.presente}</td>
                      <td>
                        <span className={s.barTrack} style={{ display: 'block' }}>
                          <span className={s.barFillHl} style={{ width: `${j.asistencia_pct ?? 0}%` }} />
                        </span>
                        <span className={s.sub}>{j.asistencia_pct ?? '—'}%</span>
                      </td>
                      <td className={s.r}>{fmt(j.rpe_medio)}</td>
                      <td className={s.r}>{fmtInt(j.carga_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ),
        }))
      },
    },
    {
      id: 'microciclos',
      label: 'Microciclos',
      hint: 'Cada semana: rival, objetivo, minutos y carga',
      build: (d) => {
        if (!d.semanas.length) return []
        return chunk(d.semanas, 16).map((rows, pi) => ({
          key: `sem${pi}`,
          kicker: 'Microciclos',
          body: (
            <>
              {pi === 0 ? (
                <Heading kicker="Semana a semana">
                  {d.semanas.length} <em>microciclos</em>
                </Heading>
              ) : null}
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Semana</th>
                    <th>Rival · objetivo</th>
                    <th className={s.r}>Ses.</th>
                    <th className={s.r}>Min</th>
                    <th className={s.r}>RPE</th>
                    <th className={s.r}>Carga</th>
                    <th className={s.r}>Asist.</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((w) => (
                    <tr key={w.inicio}>
                      <td className={s.strong} style={{ whiteSpace: 'nowrap' }}>
                        {fechaCorta(w.inicio)} – {fechaCorta(w.fin)}
                      </td>
                      <td>
                        {w.rival || '—'}
                        {w.objetivo ? <span className={s.sub}>{w.objetivo}</span> : null}
                      </td>
                      <td className={s.r}>{w.sesiones}</td>
                      <td className={s.r}>{w.minutos}&apos;</td>
                      <td className={s.r}>{fmt(w.rpe_medio)}</td>
                      <td className={s.r}>{fmtInt(w.carga)}</td>
                      <td className={s.r}>{w.asistencia_pct === null ? '—' : `${Math.round(w.asistencia_pct)}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ),
        }))
      },
    },
    {
      id: 'fichas',
      label: 'Fichas de sesión',
      hint: 'Cada sesión con su objetivo y tareas',
      build: (d) =>
        d.sesiones.length
          ? [d.sesiones.slice(0, 2), ...chunk(d.sesiones.slice(2), 3)].filter((r) => r.length).map((rows, pi) => ({
              key: `ses${pi}`,
              kicker: 'Fichas de sesión',
              body: (
                <>
                  {pi === 0 ? (
                    <Heading kicker="Fichas de sesión">
                      {d.sesiones.length} <em>sesiones</em>
                    </Heading>
                  ) : null}
                  {rows.map((x) => (
                    <SesionCard key={x.id} x={x} />
                  ))}
                </>
              ),
            }))
          : [],
    },
  ],
}
