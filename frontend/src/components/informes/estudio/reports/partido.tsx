import type { DatosPartido, JugadorPartido } from '@/lib/api/informesEstudio'
import { cn } from '@/lib/utils'
import {
  Cover,
  Empty,
  Heading,
  Kicker,
  Kpis,
  Pitch,
  Swatch,
  TramosChart,
  Versus,
  fechaPuntos,
  fmt,
  fmtInt,
  s,
} from '../primitives'
import type { ReportDef } from './types'

const RESULTADO_PALABRA: Record<string, string> = { V: 'Victoria', E: 'Empate', D: 'Derrota' }

type DatosPartidoUI = DatosPartido & { equipo_nombre_corto: string }

function marcador(d: DatosPartidoUI): string {
  const p = d.partido
  const nos = d.equipo_nombre_corto
  if (p.gf === null || p.gc === null) return `${nos} – ${p.rival}`
  return p.localia === 'visitante' ? `${p.rival} ${p.gc}–${p.gf} ${nos}` : `${nos} ${p.gf}–${p.gc} ${p.rival}`
}

function jornadaTxt(d: DatosPartido): string {
  const p = d.partido
  const comp = p.competicion ? p.competicion[0].toUpperCase() + p.competicion.slice(1) : 'Partido'
  return p.jornada ? `${comp} · J${p.jornada}` : comp
}

function PlayerRows({ rows, suplentes }: { rows: JugadorPartido[]; suplentes?: boolean }) {
  return (
    <>
      {rows.map((j) => (
        <tr key={j.conv_id}>
          <td className={s.dorsal}>{j.dorsal ?? ''}</td>
          <td className={s.strong}>{j.nombre_completo || j.nombre}</td>
          <td className={s.mono} style={{ fontSize: '6pt' }}>
            {j.posicion ?? ''}
          </td>
          <td className={s.c}>{suplentes ? (j.entra ? `${j.entra}'` : '—') : j.sale ? `${j.sale}'` : '—'}</td>
          <td className={s.r}>{j.minutos ? `${j.minutos}'` : '—'}</td>
          <td className={s.c}>{j.goles || '·'}</td>
          <td className={s.c}>{j.asistencias || '·'}</td>
          <td className={s.c}>
            {j.amarilla ? <Swatch color="#f2c200" /> : null}
            {j.roja ? <Swatch color="#d01d1d" /> : null}
            {!j.amarilla && !j.roja ? '·' : null}
          </td>
          <td className={s.r}>{fmt(j.nota)}</td>
          <td className={s.r}>{j.rpe ?? '—'}</td>
        </tr>
      ))}
    </>
  )
}

function Timeline({ d }: { d: DatosPartido }) {
  const W = 180
  const end = Math.max(90, ...d.goles.map((g) => g.minuto ?? 0), ...d.cambios.map((c) => c.minuto ?? 0))
  const x = (m: number) => 4 + (Math.min(m, end) / end) * (W - 8)
  return (
    <svg viewBox={`0 0 ${W} 40`} className={s.svg} role="img">
      <line x1={4} x2={W - 4} y1={17} y2={17} stroke="var(--ink)" strokeWidth={0.6} />
      <line x1={x(45)} x2={x(45)} y1={12} y2={22} stroke="#999" strokeWidth={0.35} strokeDasharray="1 1" />
      {[0, 15, 30, 45, 60, 75, 90].map((m) => (
        <text key={m} x={x(m)} y={39} textAnchor="middle" fontSize={2.4} fill="#888" className={s.svgText}>
          {m}&apos;
        </text>
      ))}
      {d.goles.map((g, i) =>
        g.minuto === null ? null : (
          <g key={`g${i}`}>
            <circle
              cx={x(g.minuto)}
              cy={g.lado === 'favor' ? 9 : 25}
              r={2.4}
              fill={g.lado === 'favor' ? 'var(--ink)' : 'var(--accent)'}
            />
            <line
              x1={x(g.minuto)}
              x2={x(g.minuto)}
              y1={g.lado === 'favor' ? 11.4 : 17}
              y2={g.lado === 'favor' ? 17 : 22.6}
              stroke="#999"
              strokeWidth={0.3}
            />
            <text
              x={x(g.minuto)}
              y={g.lado === 'favor' ? 4.6 : 30}
              textAnchor="middle"
              fontSize={2.6}
              className={s.svgText}
            >
              {g.minuto}&apos;
            </text>
          </g>
        )
      )}
      {d.cambios.map((c, i) =>
        c.minuto === null ? null : (
          <rect key={`c${i}`} x={x(c.minuto) - 0.8} y={15.4} width={1.6} height={3.2} fill="var(--hl)" stroke="var(--ink)" strokeWidth={0.2} />
        )
      )}
    </svg>
  )
}

export const PARTIDO: ReportDef<DatosPartidoUI> = {
  tituloDefecto: 'Informe de partido',
  alcance: (d) => jornadaTxt(d),
  bloques: [
    {
      id: 'portada',
      label: 'Portada',
      hint: 'Escudo, rival y resultado',
      build: (d, ctx) => [
        {
          key: 'portada',
          cover: true,
          body: (
            <Cover
              meta={ctx.meta}
              top={`Temporada ${d.equipo.temporada ?? ''} · ${d.equipo.nombre}`}
              titulo="Informe"
              outline="de partido"
              subtitulo={marcador(d)}
              scope={`${jornadaTxt(d)} · ${d.partido.localia === 'visitante' ? 'Fuera' : 'Casa'}`}
              rivalLogo={d.partido.escudo_rival}
            />
          ),
        },
      ],
    },
    {
      id: 'resumen',
      label: 'Resumen y alineación',
      hint: 'Ficha del partido, once, banquillo y cambios',
      build: (d) => {
        const p = d.partido
        const detalles = [
          fechaPuntos(p.fecha),
          p.hora ? `${p.hora.slice(0, 5)} h` : null,
          p.ubicacion,
          p.arbitro ? `Árbitro: ${p.arbitro}` : null,
          p.formacion ? `Sistema ${p.formacion}` : null,
        ].filter(Boolean)
        return [
          {
            key: 'resumen',
            kicker: 'Resumen',
            body: (
              <>
                <Heading kicker={jornadaTxt(d)} lead={detalles.join(' · ')}>
                  {p.resultado ? `${RESULTADO_PALABRA[p.resultado]} ` : ''}
                  {p.gf !== null && p.gc !== null ? `${p.gf}–${p.gc} ` : ''}
                  <em>{p.localia === 'visitante' ? 'en' : 'ante'} {p.rival}</em>
                </Heading>
                <Kpis
                  cols={5}
                  items={[
                    { value: `${p.gf ?? '–'}–${p.gc ?? '–'}`, label: 'Resultado', accent: true },
                    { value: String(d.media_equipo.convocados), label: 'Convocados' },
                    { value: String(d.media_equipo.jugaron), label: 'Jugaron' },
                    { value: fmt(d.media_equipo.nota_media), unit: '/10', label: 'Nota media' },
                    { value: fmt(d.media_equipo.rpe_medio), unit: '/10', label: 'RPE medio' },
                  ]}
                />
                <div>
                  <Kicker>Once titular{p.formacion ? ` · ${p.formacion}` : ''} y banquillo</Kicker>
                  {d.once.length === 0 ? (
                    <Empty>Sin alineación guardada en la convocatoria</Empty>
                  ) : (
                    <table className={s.table}>
                      <thead>
                        <tr>
                          <th />
                          <th>Jugador</th>
                          <th>Pos.</th>
                          <th className={s.c}>Sale / entra</th>
                          <th className={s.r}>Min</th>
                          <th className={s.c}>G</th>
                          <th className={s.c}>A</th>
                          <th className={s.c}>Tarj.</th>
                          <th className={s.r}>Nota</th>
                          <th className={s.r}>RPE</th>
                        </tr>
                      </thead>
                      <tbody>
                        <PlayerRows rows={d.once} />
                        <tr>
                          <td colSpan={10} className={s.mono} style={{ paddingTop: '3mm', fontSize: '6pt', letterSpacing: '0.16em' }}>
                            BANQUILLO
                          </td>
                        </tr>
                        <PlayerRows rows={d.banquillo} suplentes />
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            ),
          },
        ]
      },
    },
    {
      id: 'estadisticas',
      label: 'Estadísticas',
      hint: 'Comparativa con el rival, total y por partes',
      build: (d) => {
        if (d.stats.length === 0) {
          return [
            {
              key: 'stats',
              kicker: 'Estadísticas',
              body: (
                <>
                  <Heading kicker="Estadísticas">Cifras <em>del partido</em></Heading>
                  <Empty>No hay estadísticas registradas en el anotador</Empty>
                </>
              ),
            },
          ]
        }
        const nos = d.equipo_nombre_corto
        const carril = (k: 'izq' | 'cen' | 'dch') => ({ izq: 'Izquierda', cen: 'Centro', dch: 'Derecha' })[k]
        return [
          {
            key: 'stats',
            kicker: 'Estadísticas',
            body: (
              <>
                <Heading kicker="Estadísticas del anotador">
                  {nos} <em>{d.partido.localia === 'visitante' ? 'Fuera' : 'En casa'} · {d.partido.rival}</em>
                </Heading>
                <Versus left={nos} right={d.partido.rival} rows={d.stats.map((x) => ({ label: x.label, nos: x.nos, rival: x.rival }))} />
                <div className={cn(s.row, s.col2)}>
                  <div>
                    <Kicker>Por partes</Kicker>
                    <table className={s.table}>
                      <thead>
                        <tr>
                          <th>Acción</th>
                          <th className={s.r}>1ª nos.</th>
                          <th className={s.r}>1ª riv.</th>
                          <th className={s.r}>2ª nos.</th>
                          <th className={s.r}>2ª riv.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.stats.map((x) => (
                          <tr key={x.key}>
                            <td>{x.label}</td>
                            <td className={s.r}>{x.p1?.nos ?? '—'}</td>
                            <td className={s.r}>{x.p1?.rival ?? '—'}</td>
                            <td className={s.r}>{x.p2?.nos ?? '—'}</td>
                            <td className={s.r}>{x.p2?.rival ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {d.carriles ? (
                    <div>
                      <Kicker>Ataques por carril</Kicker>
                      <Versus
                        left={nos}
                        right={d.partido.rival}
                        rows={(['izq', 'cen', 'dch'] as const).map((k) => ({
                          label: carril(k),
                          nos: d.carriles?.nos[k] ?? 0,
                          rival: d.carriles?.rival[k] ?? 0,
                        }))}
                      />
                    </div>
                  ) : null}
                </div>
              </>
            ),
          },
        ]
      },
    },
    {
      id: 'goles',
      label: 'Goles y cronología',
      hint: 'Minuto, autor, tipo de gol y cambios',
      build: (d) => [
        {
          key: 'goles',
          kicker: 'Goles',
          body: (
            <>
              <Heading kicker="Goles y cronología">
                {d.goles.filter((g) => g.lado === 'favor').length} a favor,{' '}
                <em>{d.goles.filter((g) => g.lado === 'contra').length} en contra</em>
              </Heading>
              <div>
                <Kicker>Cronología · goles arriba a favor, abajo en contra · cuadro = cambio</Kicker>
                <Timeline d={d} />
              </div>
              <div>
                <Kicker>Goles por tramo de 15 minutos</Kicker>
                <TramosChart tramos={d.goles_tramos} height={46} />
              </div>
              {d.goles.length ? (
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th>Min</th>
                      <th>Equipo</th>
                      <th>Autor</th>
                      <th>Asistencia</th>
                      <th>Tipo</th>
                      <th className={s.c}>ABP</th>
                      <th>Zona</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.goles.map((g, i) => (
                      <tr key={i}>
                        <td className={s.strong}>{g.minuto !== null ? `${g.minuto}'` : '—'}</td>
                        <td>
                          <span className={g.lado === 'favor' ? s.tagInk : s.tagAccent}>
                            {g.lado === 'favor' ? 'A favor' : 'En contra'}
                          </span>
                        </td>
                        <td>{g.jugador || '—'}</td>
                        <td>{g.asistente || '—'}</td>
                        <td>{g.tipo || '—'}</td>
                        <td className={s.c}>{g.abp ? 'Sí' : '·'}</td>
                        <td style={{ textTransform: 'capitalize' }}>{g.zona || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <Empty>Sin goles en el partido</Empty>
              )}
              {d.cambios.length ? (
                <div>
                  <Kicker>Cambios</Kicker>
                  <table className={s.table}>
                    <tbody>
                      {d.cambios.map((c, i) => (
                        <tr key={i}>
                          <td className={s.strong} style={{ width: '14mm' }}>
                            {c.minuto !== null ? `${c.minuto}'` : '—'}
                          </td>
                          <td>Entra {c.entra}</td>
                          <td>Sale {c.sale}</td>
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
      id: 'faltas',
      label: 'Mapa de faltas',
      hint: 'Dónde se cometen y reciben, por tercios',
      build: (d) => [
        {
          key: 'faltas',
          kicker: 'Faltas',
          body: (
            <>
              <Heading kicker="Mapa de faltas · atacamos hacia la derecha">
                {d.faltas.cometidas.length} cometidas, <em>{d.faltas.recibidas.length} recibidas</em>
              </Heading>
              <div style={{ width: '150mm', margin: '0 auto' }}>
                <Kicker>Cometidas · tercio propio, medio y rival</Kicker>
                <Pitch puntos={d.faltas.cometidas} tercios={d.faltas.tercios_cometidas} />
              </div>
              <div style={{ width: '150mm', margin: '0 auto' }}>
                <Kicker>Recibidas</Kicker>
                <Pitch puntos={d.faltas.recibidas} tercios={d.faltas.tercios_recibidas} tone="accent" />
              </div>
            </>
          ),
        },
      ],
    },
    {
      id: 'jugadores',
      label: 'Rendimiento individual',
      hint: 'Minutos, nota y RPE de cada jugador',
      build: (d) => {
        const todos = [...d.once, ...d.banquillo].filter((j) => j.minutos > 0)
        const maxMin = Math.max(90, ...todos.map((j) => j.minutos))
        return [
          {
            key: 'individual',
            kicker: 'Individual',
            body: (
              <>
                <Heading kicker="Rendimiento individual">
                  {todos.length} jugadores <em>con minutos</em>
                </Heading>
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th />
                      <th>Jugador</th>
                      <th style={{ width: '62mm' }}>Minutos</th>
                      <th className={s.r}>Nota</th>
                      <th className={s.r}>RPE</th>
                      <th className={s.r}>Carga (min × RPE)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todos
                      .slice()
                      .sort((a, b) => b.minutos - a.minutos)
                      .map((j) => (
                        <tr key={j.conv_id}>
                          <td className={s.dorsal}>{j.dorsal ?? ''}</td>
                          <td>
                            <span className={s.strong}>{j.nombre}</span>
                            <span className={s.sub}>{j.posicion ?? ''}</span>
                          </td>
                          <td>
                            <span className={s.barTrack} style={{ display: 'block', width: '100%' }}>
                              <span
                                className={d.once.some((o) => o.conv_id === j.conv_id) ? s.barFill : s.barFillAccent}
                                style={{ width: `${(j.minutos / maxMin) * 100}%` }}
                              />
                            </span>
                            <span className={s.sub}>{j.minutos}&apos;</span>
                          </td>
                          <td className={s.r}>{fmt(j.nota)}</td>
                          <td className={s.r}>{j.rpe ?? '—'}</td>
                          <td className={s.r}>{j.rpe ? fmtInt(j.rpe * j.minutos) : '—'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                <div className={s.legend}>
                  <span>
                    <Swatch color="var(--ink)" />
                    Titular
                  </span>
                  <span>
                    <Swatch color="var(--accent)" />
                    Suplente
                  </span>
                </div>
              </>
            ),
          },
        ]
      },
    },
  ],
}

export function conNombreCorto(d: DatosPartido, nombreCorto: string): DatosPartidoUI {
  return { ...d, equipo_nombre_corto: nombreCorto }
}

export type { DatosPartidoUI }
