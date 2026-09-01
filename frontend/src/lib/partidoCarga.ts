/**
 * Carga de partido condicionado (PCO, 11 vs 11 de entreno).
 * Debe coincidir con backend/app/services/sesion_carga.py
 *
 * No es un partido de competición: densidad entre media y alta, sin recargo
 * por 22 jugadores (en reducido más gente sube la demanda; aquí no).
 */

const PCO_ENTRENO_DENSIDAD_FACTOR = 1.2
const CATEGORIA_FACTOR_PCO = 1.25
const PCO_ENTRENO_FACTOR = PCO_ENTRENO_DENSIDAD_FACTOR * CATEGORIA_FACTOR_PCO

export function cargaPartidoCondicionado(duracionMin: number, _numJugadores = 22): number {
  return Math.round(Math.max(0, duracionMin) * PCO_ENTRENO_FACTOR * 100) / 100
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
