/**
 * Cuándo una sesión "trabaja ABP": la fuente de verdad es `abp_config`
 * (se declara en SesionDefinirForm: tipos de ABP ofensivo/defensivo).
 * Soporta el formato legacy (lado/lados + tipos). Sin imports de `@/` para poder testearse.
 */

export interface AbpConfigLike {
  activo?: boolean | null
  ofensivo?: string[] | null
  defensivo?: string[] | null
  lado?: string | null
  lados?: string[] | null
  tipos?: string[] | null
}

const has = (v?: string[] | null) => Array.isArray(v) && v.length > 0

export function sesionTrabajaAbp(cfg: AbpConfigLike | null | undefined): boolean {
  if (!cfg) return false
  return has(cfg.ofensivo) || has(cfg.defensivo) || (has(cfg.tipos) && (has(cfg.lados) || !!cfg.lado))
}

/** La sección es visible si la sesión declara ABP, o si ya hay jugadas vinculadas (para no dejarlas huérfanas). */
export function mostrarVinculoAbp(cfg: AbpConfigLike | null | undefined, vinculadas: number): boolean {
  return sesionTrabajaAbp(cfg) || vinculadas > 0
}

export interface JugadaAbpLike {
  nombre: string
  tipo?: string
  subtipo?: string | null
}

export function etiquetaJugada(j: JugadaAbpLike, tipoLabel?: string): string {
  const parts = [tipoLabel || j.tipo, j.subtipo].filter(Boolean)
  return parts.length ? `${j.nombre} · ${parts.join(' · ')}` : j.nombre
}

/** Diff entre selección actual y guardada. */
export function diffVinculos(actual: string[], nuevo: string[]): { alta: string[]; baja: string[] } {
  const a = new Set(actual)
  const n = new Set(nuevo)
  return { alta: nuevo.filter((id) => !a.has(id)), baja: actual.filter((id) => !n.has(id)) }
}
