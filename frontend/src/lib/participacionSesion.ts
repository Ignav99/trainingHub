/** Marcado con sesión y margen: estuvo al margen y en parte de la sesión. El fisio no entra en esta lista. */

export function isPartialParticipation(tipos: readonly string[] | null | undefined): boolean {
  const list = (tipos || []).filter(Boolean)
  return list.includes('sesion') && list.includes('margen')
}
