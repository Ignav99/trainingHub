/**
 * Carga de partido condicionado (PCO, campo 11 vs 11).
 * Debe coincidir con backend/app/services/sesion_carga.py
 */

const DENSIDAD_FACTOR: Record<string, number> = {
  alta: 1.35,
  media: 1.0,
  baja: 0.7,
}

const CATEGORIA_FACTOR_PCO = 1.25

export function cargaPartidoCondicionado(duracionMin: number, numJugadores = 22): number {
  let factor = (DENSIDAD_FACTOR.alta || 1) * CATEGORIA_FACTOR_PCO
  if (numJugadores > 0) {
    factor *= Math.min(1.25, 0.85 + numJugadores / 40)
  }
  return Math.round(Math.max(0, duracionMin) * factor * 100) / 100
}

export function countAlineados(
  peto: Record<string, string> | undefined,
  sinPeto: Record<string, string> | undefined
): number {
  const ids = new Set<string>()
  for (const id of Object.values(peto || {})) if (id) ids.add(id)
  for (const id of Object.values(sinPeto || {})) if (id) ids.add(id)
  return ids.size
}
