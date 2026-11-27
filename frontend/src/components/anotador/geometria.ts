/** Geometría del campo del anotador. Puro: sin React ni dependencias. */

export type Orientacion = 'horizontal' | 'vertical'

export interface Punto {
  x: number
  y: number
}

export interface SlotPct {
  top: string
  left: string
}

export function pct(valor: string): number {
  const n = parseFloat(valor)
  return Number.isFinite(n) ? n : 50
}

const acotar = (n: number) => Math.min(94, Math.max(6, n))

/**
 * Las formaciones guardan cada hueco con el portero abajo (top 88 %) y el ataque arriba.
 * `dirRight` significa "atacamos hacia la derecha" en horizontal y "hacia arriba" en vertical.
 * Devuelve la posición en % dentro del campo ya orientado.
 */
export function posicionFicha(slot: SlotPct, dirRight: boolean, orientacion: Orientacion): Punto {
  const t = pct(slot.top)
  const l = pct(slot.left)
  if (orientacion === 'horizontal') {
    // Mirando al ataque, nuestra izquierda queda arriba.
    return dirRight
      ? { x: acotar(100 - t), y: acotar(l) }
      : { x: acotar(t), y: acotar(100 - l) }
  }
  return dirRight
    ? { x: acotar(l), y: acotar(t) }
    : { x: acotar(100 - l), y: acotar(100 - t) }
}

/** Grados para girar una flecha que apunta a la derecha. */
export function giroFlechaAtaque(dirRight: boolean, orientacion: Orientacion): number {
  if (orientacion === 'horizontal') return dirRight ? 0 : 180
  return dirRight ? -90 : 90
}

/** Orientación según la caja disponible: apaisada → horizontal, alta → vertical. */
export function orientacionPara(ancho: number, alto: number): Orientacion {
  return alto > ancho * 1.05 ? 'vertical' : 'horizontal'
}

/** Nuestra portería: lado donde está el 11 propio (contrario al ataque). */
export function ladoPorteriaPropia(dirRight: boolean, orientacion: Orientacion): 'izquierda' | 'derecha' | 'arriba' | 'abajo' {
  if (orientacion === 'horizontal') return dirRight ? 'izquierda' : 'derecha'
  return dirRight ? 'abajo' : 'arriba'
}
