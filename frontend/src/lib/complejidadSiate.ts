/**
 * Complejidad de tarea — sistema inspirado en SIATE (Ibáñez et al., 2016).
 *
 * CT = GO + DT + PES + CC + EJ + IC  (cada factor 1–5 → total 6–30)
 *
 * Factores auto-linkeados a la pizarra / metodología:
 * - DT (densidad), EJ (espacio), IC (cognitivo) ← métricas de la pizarra
 * - CC (carga competitiva) ← metodología
 * - GO / PES ← el entrenador puede ajustar (con defaults sensatos)
 */

import type { FranjaEspacial, SpaceClassification } from '@/lib/tacticalMetrics'
import type { MetodologiaTareaCodigo } from '@/lib/catalogos/canonico'

export type ComplejidadFactorKey = 'go' | 'dt' | 'pes' | 'cc' | 'ej' | 'ic'

export interface ComplejidadFactor {
  key: ComplejidadFactorKey
  nombre: string
  valor: 1 | 2 | 3 | 4 | 5
  origen: 'auto' | 'manual'
  detalle: string
}

export interface ComplejidadScore {
  total: number // 6–30
  dificultad: 1 | 2 | 3 | 4 | 5 // mapeo a escala de tarea
  etiqueta: string
  factores: ComplejidadFactor[]
}

const RANGO_ETIQUETA: { max: number; dificultad: 1 | 2 | 3 | 4 | 5; etiqueta: string }[] = [
  { max: 12, dificultad: 1, etiqueta: 'Muy baja' },
  { max: 18, dificultad: 2, etiqueta: 'Media-baja' },
  { max: 24, dificultad: 3, etiqueta: 'Media-alta' },
  { max: 30, dificultad: 5, etiqueta: 'Muy alta' },
]

export const GRADO_OPOSICION = [
  { codigo: 1, nombre: 'Sin oposición' },
  { codigo: 2, nombre: 'Superioridad clara (≥+2)' },
  { codigo: 3, nombre: 'Superioridad leve (+1)' },
  { codigo: 4, nombre: 'Igualdad numérica' },
  { codigo: 5, nombre: 'Inferioridad / presión alta' },
] as const

export const EJECUTANTES_SIMULTANEOS = [
  { codigo: 1, nombre: '<20% simultáneos' },
  { codigo: 2, nombre: '20–40%' },
  { codigo: 3, nombre: '41–60%' },
  { codigo: 4, nombre: '61–80%' },
  { codigo: 5, nombre: '>80% simultáneos' },
] as const

function densididadToDt(d?: string | null): 1 | 2 | 3 | 4 | 5 {
  if (d === 'alta') return 5
  if (d === 'media') return 3
  if (d === 'baja') return 2
  return 3
}

function franjaToEj(franja?: FranjaEspacial | null): 1 | 2 | 3 | 4 | 5 {
  switch (franja) {
    case 'muy_reducido':
      return 1
    case 'reducido':
      return 2
    case 'medio':
      return 3
    case 'amplio':
      return 4
    case 'muy_amplio':
      return 5
    default:
      return 3
  }
}

function metodologiaToCc(m?: string | null): 1 | 2 | 3 | 4 | 5 {
  switch (m as MetodologiaTareaCodigo) {
    case 'analitica':
      return 1
    case 'general':
      return 1
    case 'global':
      return 3
    case 'competitiva':
      return 5
    default:
      return 3
  }
}

function metodologiaToGoDefault(m?: string | null): 1 | 2 | 3 | 4 | 5 {
  switch (m as MetodologiaTareaCodigo) {
    case 'analitica':
      return 1
    case 'general':
      return 1
    case 'global':
      return 3
    case 'competitiva':
      return 4
    default:
      return 3
  }
}

function cognitivoToIc(n?: number | null): 1 | 2 | 3 | 4 | 5 {
  if (n === 1) return 2
  if (n === 3) return 5
  if (n === 2) return 3
  return 3
}

export interface ComplejidadInput {
  modalidad?: string | null
  clasificacion?: SpaceClassification | null
  /** Override manual grado de oposición (1–5) */
  go?: number | null
  /** Override manual % ejecutantes simultáneos (1–5) */
  pes?: number | null
}

function clamp15(n: number): 1 | 2 | 3 | 4 | 5 {
  return Math.max(1, Math.min(5, Math.round(n))) as 1 | 2 | 3 | 4 | 5
}

export function computeComplejidadScore(input: ComplejidadInput): ComplejidadScore {
  const c = input.clasificacion
  const go = input.go != null ? clamp15(input.go) : metodologiaToGoDefault(input.modalidad)
  const dt = densididadToDt(c?.densidad)
  const pes = input.pes != null ? clamp15(input.pes) : 4
  const cc = metodologiaToCc(input.modalidad)
  const ej = franjaToEj(c?.franja)
  const ic = cognitivoToIc(c?.nivelCognitivo)

  const factores: ComplejidadFactor[] = [
    {
      key: 'go',
      nombre: 'Grado de oposición',
      valor: go,
      origen: input.go != null ? 'manual' : 'auto',
      detalle: GRADO_OPOSICION.find((g) => g.codigo === go)?.nombre || String(go),
    },
    {
      key: 'dt',
      nombre: 'Densidad',
      valor: dt,
      origen: 'auto',
      detalle: c ? `Densidad ${c.densidad} (${c.m2PorJugador} m²/j)` : 'Sin espacio de pizarra',
    },
    {
      key: 'pes',
      nombre: 'Ejecutantes simultáneos',
      valor: pes,
      origen: input.pes != null ? 'manual' : 'auto',
      detalle: EJECUTANTES_SIMULTANEOS.find((e) => e.codigo === pes)?.nombre || String(pes),
    },
    {
      key: 'cc',
      nombre: 'Carga competitiva',
      valor: cc,
      origen: 'auto',
      detalle: `Desde metodología`,
    },
    {
      key: 'ej',
      nombre: 'Espacio de juego',
      valor: ej,
      origen: 'auto',
      detalle: c ? `Espacio ${c.etiqueta.toLowerCase()}` : 'Sin espacio de pizarra',
    },
    {
      key: 'ic',
      nombre: 'Implicación cognitiva',
      valor: ic,
      origen: 'auto',
      detalle: c ? `Cognitivo ${c.nivelCognitivo}` : 'Sin espacio de pizarra',
    },
  ]

  const total = factores.reduce((s, f) => s + f.valor, 0)
  const rango = RANGO_ETIQUETA.find((r) => total <= r.max) || RANGO_ETIQUETA[RANGO_ETIQUETA.length - 1]

  return {
    total,
    dificultad: rango.dificultad,
    etiqueta: rango.etiqueta,
    factores,
  }
}

/** Texto compacto para guardar en `tareas.complejidad`. */
export function complejidadToLabel(score: ComplejidadScore): string {
  return `CT ${score.total}/30 · ${score.etiqueta}`
}
