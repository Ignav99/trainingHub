/** Jugador que no hace la sesión entera: margen o fisio, sin «sesion». */

export function isPartialParticipation(tipos: readonly string[] | null | undefined): boolean {
  const list = (tipos || []).filter(Boolean)
  if (list.length === 0 || list.includes('sesion') || list.includes('presente')) return false
  return list.includes('margen') || list.includes('fisio')
}
