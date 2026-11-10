export type FichaEstado = 'disponible' | 'titular' | 'duda' | 'baja' | 'sancionado'

export interface FichaAriaProps {
  dorsal?: number | string
  estado?: FichaEstado
  label?: string
}

const ESTADO_ES: Record<FichaEstado, string> = {
  disponible: 'disponible',
  titular: 'titular',
  duda: 'duda',
  baja: 'baja',
  sancionado: 'sancionado',
}

/** Nombre accesible: "{label}, dorsal {dorsal}, {estado}". Omite lo que falte. */
export function fichaAria({ dorsal, estado = 'disponible', label }: FichaAriaProps): string {
  const partes: string[] = []
  if (label && label.trim()) partes.push(label.trim())
  if (dorsal !== undefined && dorsal !== null && String(dorsal).trim() !== '') partes.push(`dorsal ${dorsal}`)
  partes.push(ESTADO_ES[estado])
  return partes.join(', ')
}
