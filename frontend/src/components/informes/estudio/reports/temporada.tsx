import type { Balance, DatosTemporada } from '@/lib/api/informesEstudio'
import { cn } from '@/lib/utils'
import {
  Bars,
  Cover,
  Empty,
  Heading,
  Kicker,
  Kpis,
  Pitch,
  PuntosLine,
  ResultChip,
  TramosChart,
  Versus,
  chunk,
  fechaCorta,
  fmt,
  fmtInt,
  s,
} from '../primitives'
import { PlantillaTabla } from './jugadores'
import type { ReportDef } from './types'

function rango(d: DatosTemporada): string {
  const js = d.partidos.map((p) => p.jornada).filter((n): n is number => typeof n === 'number')
  return js.length ? `J${Math.min(...js)}–J${Math.max(...js)}` : `${d.partidos.length} partidos`
}

function BalanceRow({ label, b }: { label: string; b: Balance }) {
  return (
    <tr>
      <td className={s.strong}>{label}</td>
      <td className={s.r}>{b.pj}</td>
      <td className={s.r}>{b.v}</td>
      <td className={s.r}>{b.e}</td>
      <td className={s.r}>{b.d}</td>
      <td className={s.r}>{b.gf}</td>
      <td className={s.r}>{b.gc}</td>
      <td className={s.r}>{b.dg > 0 ? `+${b.dg}` : b.dg}</td>
      <td className={cn(s.r, s.strong)}>{b.pts}</td>
      <td className={s.r}>{fmt(b.ppp, 2)}</td>
      <td className={s.r}>{b.porteria_cero}</td>
    </tr>
  )
}

export const TEMPORADA: ReportDef<DatosTemporada> = {
  tituloDefecto: 'Balance de temporada',
  alcance: (d) => `${d.ambito_label} · ${rango(d)}`,
  bloques: [
    {
      id: 'portada',
      label: 'Portada',
      hint: 'Escudo y periodo',
      build: (d, ctx) => [
        {
          key: 'portada',
          cover: true,
          body: (
            <Cover
              meta={ctx.meta}
              top={`Temporada ${d.equipo.temporada ?? ''} · ${d.equipo.nombre}`}
              titulo="Balance"
              outline="de temporada"
              subtitulo={`${d.resumen.pj} partidos · ${d.resumen.pts} puntos`}
              scope={`${d.ambito_label} · ${rango(d)}`}
            />
          ),
        },
      ],
    },
    {
      id: 'resumen',
      label: 'Resumen',
      hint: 'Balance, casa y fuera, evolución de puntos',
      build: (d) => {
        const r = d.resumen
        return [
          {
            key: 'resumen',
            kicker: 'Resumen',
            body: (
              <>
                <Heading
                  kicker="Visión general"
                  lead={`Del ${fechaCorta(d.desde)} al ${fechaCorta(d.hasta)} · ${d.ambito_label}.`}
                >
                  {r.pj} partidos, <em>{r.pts} puntos</em>
                </Heading>
                <Kpis
                  cols={4}
                  items={[
                    { value: `${r.v}-${r.e}-${r.d}`, label: 'Ganados · empatados · perdidos' },
                    { value: String(r.pts), unit: `${fmt(r.ppp, 2)} por partido`, label: 'Puntos', accent: true },
                    { value: `${r.gf}–${r.gc}`, unit: r.dg > 0 ? `+${r.dg}` : String(r.dg), label: 'Goles a favor · en contra' },
                    { value: String(r.porteria_cero), unit: `${r.sin_marcar} sin marcar`, label: 'Porterías a cero' },
                  ]}
                />
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th />
                      <th className={s.r}>PJ</th>
                      <th className={s.r}>G</th>
                      <th className={s.r}>E</th>
                      <th className={s.r}>P</th>
                      <th className={s.r}>GF</th>
                      <th className={s.r}>GC</th>
                      <th className={s.r}>DG</th>
                      <th className={s.r}>Pts</th>
                      <th className={s.r}>Pts/PJ</th>
                      <th className={s.r}>Port. 0</th>
                    </tr>
                  </thead>
                  <tbody>
                    <BalanceRow label="Total" b={d.resumen} />
                    <BalanceRow label="En casa" b={d.local} />
                    <BalanceRow label="Fuera" b={d.visitante} />
                  </tbody>
                </table>
                {d.partidos.length > 1 ? (
                  <div>
                    <Kicker>Puntos acumulados · discontinua = pleno de victorias</Kicker>
                    <PuntosLine
                      puntos={d.partidos.map((p) => p.puntos_acum)}
                      labels={d.partidos.map((p) => (p.jornada ? `J${p.jornada}` : fechaCorta(p.fecha)))}
                      height={58}
                    />
                  </div>
                ) : null}
                <div className={cn(s.row, s.col2)}>
                  <div>
                    <Kicker>Entrenamiento en el periodo</Kicker>
                    <Kpis
                      cols={2}
                      items={[
                        { value: String(d.entrenamiento.sesiones), label: 'Sesiones' },
                        { value: fmtInt(d.entrenamiento.duracion_media), unit: 'min', label: 'Duración media' },
                        { value: d.entrenamiento.asistencia_pct === null ? '—' : String(d.entrenamiento.asistencia_pct), unit: '%', label: 'Asistencia' },
                        { value: fmt(d.entrenamiento.rpe_medio), unit: '/10', label: 'RPE medio' },
                      ]}
                    />
                  </div>
                  <div>
                    <Kicker>Máximos goleadores</Kicker>
                    {d.goleadores.length ? (
                      <Bars
                        tone="accent"
                        rows={d.goleadores.slice(0, 6).map((g) => ({
                          label: g.nombre,
                          value: g.goles,
                          display: `${g.goles} G · ${g.asistencias} A`,
                        }))}
                      />
                    ) : (
                      <Empty>Sin goles registrados</Empty>
                    )}
                  </div>
                </div>
              </>
            ),
          },
        ]
      },
    },
    {
      id: 'resultados',
      label: 'Resultados',
      hint: 'Partido a partido con puntos acumulados',
      build: (d) =>
        chunk(d.partidos, 26).map((rows, pi) => ({
          key: `res${pi}`,
          kicker: 'Resultados',
          body: (
            <>
              {pi === 0 ? (
                <Heading kicker="Partido a partido">
                  Todos los <em>resultados</em>
                </Heading>
              ) : null}
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Jornada</th>
                    <th>Fecha</th>
                    <th>Rival</th>
                    <th>Campo</th>
                    <th className={s.c}>Resultado</th>
                    <th className={s.r}>Pts acum.</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.id}>
                      <td className={s.strong}>{p.jornada ? `J${p.jornada}` : '—'}</td>
                      <td>{fechaCorta(p.fecha)}</td>
                      <td className={s.strong}>{p.rival}</td>
                      <td>{p.localia === 'visitante' ? 'Fuera' : 'Casa'}</td>
                      <td className={s.c}>
                        <ResultChip r={p.resultado} gf={p.gf} gc={p.gc} />
                      </td>
                      <td className={s.r}>{p.puntos_acum}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ),
        })),
    },
    {
      id: 'goles',
      label: 'Goles',
      hint: 'Por tramo de minutos, por tipo y a balón parado',
      build: (d) => {
        const abpF = d.abp.favor_total ? Math.round((d.abp.favor / d.abp.favor_total) * 100) : 0
        const abpC = d.abp.contra_total ? Math.round((d.abp.contra / d.abp.contra_total) * 100) : 0
        return [
          {
            key: 'goles',
            kicker: 'Goles',
            body: (
              <>
                <Heading kicker="Goles por minuto y tipo">
                  {d.resumen.gf} a favor, <em>{d.resumen.gc} en contra</em>
                </Heading>
                <div>
                  <Kicker>Por tramo de 15 minutos · arriba a favor, abajo en contra</Kicker>
                  <TramosChart tramos={d.goles_tramos} height={62} />
                </div>
                <Kpis
                  cols={4}
                  items={[
                    { value: String(d.abp.favor), unit: `${abpF}%`, label: 'Goles ABP a favor' },
                    { value: String(d.abp.contra), unit: `${abpC}%`, label: 'Goles ABP en contra', accent: true },
                    { value: String(d.resumen.porteria_cero), label: 'Porterías a cero' },
                    { value: String(d.resumen.sin_marcar), label: 'Partidos sin marcar' },
                  ]}
                />
                <div className={cn(s.row, s.col2)}>
                  <div>
                    <Kicker>Tipo de gol · a favor</Kicker>
                    {d.goles_tipo.favor.length ? (
                      <Bars rows={d.goles_tipo.favor.map((t) => ({ label: t.tipo, value: t.n }))} />
                    ) : (
                      <Empty>Sin goles</Empty>
                    )}
                  </div>
                  <div>
                    <Kicker>Tipo de gol · en contra</Kicker>
                    {d.goles_tipo.contra.length ? (
                      <Bars tone="accent" rows={d.goles_tipo.contra.map((t) => ({ label: t.tipo, value: t.n }))} />
                    ) : (
                      <Empty>Sin goles</Empty>
                    )}
                  </div>
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
      hint: 'Medias por partido frente a los rivales',
      build: (d) => [
        {
          key: 'stats',
          kicker: 'Estadísticas',
          body: (
            <>
              <Heading kicker="Medias por partido del anotador">
                Nosotros <em>vs rivales</em>
              </Heading>
              {d.stats.length ? (
                <>
                  <Versus
                    left="Nosotros"
                    right="Rivales"
                    rows={d.stats.map((x) => ({
                      label: x.label,
                      nos: x.nos_media ?? 0,
                      rival: x.rival_media ?? 0,
                      fmtValue: (n: number) => fmt(n),
                    }))}
                  />
                  <table className={s.table}>
                    <thead>
                      <tr>
                        <th>Acción</th>
                        <th className={s.r}>Total nos.</th>
                        <th className={s.r}>Total riv.</th>
                        <th className={s.r}>Partidos con dato</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.stats.map((x) => (
                        <tr key={x.key}>
                          <td>{x.label}</td>
                          <td className={s.r}>{x.nos}</td>
                          <td className={s.r}>{x.rival}</td>
                          <td className={s.r}>{x.partidos}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : (
                <Empty>No hay estadísticas del anotador en el periodo</Empty>
              )}
            </>
          ),
        },
      ],
    },
    {
      id: 'faltas',
      label: 'Faltas',
      hint: 'Mapa acumulado y faltas por partido',
      build: (d) => [
        {
          key: 'faltas',
          kicker: 'Faltas',
          body: (
            <>
              <Heading kicker="Mapa acumulado · atacamos hacia la derecha">
                {d.faltas.cometidas.length} cometidas, <em>{d.faltas.recibidas.length} recibidas</em>
              </Heading>
              <div className={cn(s.row, s.col2)}>
                <div>
                  <Kicker>Cometidas</Kicker>
                  <Pitch puntos={d.faltas.cometidas} tercios={d.faltas.tercios_cometidas} />
                </div>
                <div>
                  <Kicker>Recibidas</Kicker>
                  <Pitch puntos={d.faltas.recibidas} tercios={d.faltas.tercios_recibidas} tone="accent" />
                </div>
              </div>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Rival</th>
                    <th className={s.c}>Resultado</th>
                    <th className={s.r}>Cometidas</th>
                    <th className={s.r}>Recibidas</th>
                    <th className={s.r}>Amarillas</th>
                  </tr>
                </thead>
                <tbody>
                  {d.faltas.por_partido.map((p, i) => (
                    <tr key={i}>
                      <td className={s.strong}>{p.rival}</td>
                      <td className={s.c}>
                        <ResultChip r={p.resultado} gf={p.gf} gc={p.gc} />
                      </td>
                      <td className={s.r}>{p.cometidas}</td>
                      <td className={s.r}>{p.recibidas}</td>
                      <td className={s.r}>{p.amarillas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ),
        },
      ],
    },
    {
      id: 'plantilla',
      label: 'Minutos de la plantilla',
      hint: 'Participación, goles y nota por jugador',
      build: (d) =>
        chunk(d.plantilla, 24).map((rows, pi) => ({
          key: `pl${pi}`,
          kicker: 'Plantilla',
          body: (
            <>
              {pi === 0 ? (
                <Heading kicker="Minutos y participación · ordenado por minutos">
                  {d.plantilla.length} jugadores <em>utilizados</em>
                </Heading>
              ) : null}
              <PlantillaTabla rows={rows} />
            </>
          ),
        })),
    },
  ],
}
