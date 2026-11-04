import type { DocMeta, PageSpec } from '../primitives'

export interface BuildCtx {
  meta: DocMeta
  notas: string
  comentarios: boolean
}

export interface BloqueDef<D> {
  id: string
  label: string
  hint: string
  build: (d: D, ctx: BuildCtx) => PageSpec[]
}

export interface ReportDef<D> {
  bloques: BloqueDef<D>[]
  alcance: (d: D) => string
  tituloDefecto: string
}
