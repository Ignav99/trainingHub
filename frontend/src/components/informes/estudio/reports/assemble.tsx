import { Heading, Lines, s, type PageSpec } from '../primitives'
import type { BloqueDef, BuildCtx, ReportDef } from './types'

export const INDICE: BloqueDef<unknown> = {
  id: 'indice',
  label: 'Índice',
  hint: 'Qué contiene el informe y en qué página',
  build: () => [],
}

export const NOTAS: BloqueDef<unknown> = {
  id: 'notas',
  label: 'Notas del cuerpo técnico',
  hint: 'Tu texto, tal cual lo escribas (o en blanco para rellenar a mano)',
  build: (_d, ctx) => {
    if (!ctx.notas.trim() && !ctx.comentarios) return []
    return [
      {
        key: 'notas',
        kicker: 'Notas',
        body: (
          <>
            <Heading kicker="Cuerpo técnico">
              Notas <em>del cuerpo técnico</em>
            </Heading>
            {ctx.notas.trim() ? <div className={s.notes}>{ctx.notas.trim()}</div> : null}
            {ctx.comentarios ? <Lines n={ctx.notas.trim() ? 14 : 30} /> : null}
          </>
        ),
      },
    ]
  },
}

export function bloquesDe<D>(def: ReportDef<D>): BloqueDef<D>[] {
  const [portada, ...resto] = def.bloques
  return [portada, INDICE as BloqueDef<D>, ...resto, NOTAS as BloqueDef<D>]
}

export function assemble<D>(def: ReportDef<D>, data: D, ctx: BuildCtx, orden: string[]): PageSpec[] {
  const all = bloquesDe(def)
  const byId = new Map(all.map((b) => [b.id, b]))
  const parts: { bloque: BloqueDef<D>; pages: PageSpec[] }[] = []
  for (const id of orden) {
    const b = byId.get(id)
    if (!b) continue
    if (id === 'indice') {
      parts.push({ bloque: b, pages: [] })
      continue
    }
    const pages = b.build(data, ctx)
    if (pages.length) parts.push({ bloque: b, pages })
  }

  const conIndice = parts.some((p) => p.bloque.id === 'indice')
  const entradas: { label: string; hint: string; page: number }[] = []
  let n = 0
  for (const p of parts) {
    if (p.bloque.id === 'indice') {
      n += 1
      continue
    }
    if (p.bloque.id !== 'portada') entradas.push({ label: p.bloque.label, hint: p.bloque.hint, page: n + 1 })
    n += p.pages.length
  }

  if (conIndice) {
    const idx = parts.find((p) => p.bloque.id === 'indice')
    if (idx) {
      idx.pages = [
        {
          key: 'indice',
          kicker: 'Contenido',
          body: (
            <>
              <Heading kicker="Contenido">
                Cómo está <em>organizado</em>
              </Heading>
              <div className={s.toc}>
                {entradas.map((e, i) => (
                  <div key={e.label} className={s.tocRow}>
                    <span className={s.tocNum}>{String(i + 1).padStart(2, '0')}</span>
                    <span>
                      <div className={s.tocName}>{e.label}</div>
                      <div className={s.small}>{e.hint}</div>
                    </span>
                    <span className={s.mono} style={{ textAlign: 'right' }}>
                      {e.page}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ),
        },
      ]
    }
  }

  return parts.flatMap((p) => p.pages.map((pg, i) => ({ ...pg, key: `${p.bloque.id}-${pg.key}-${i}` })))
}
