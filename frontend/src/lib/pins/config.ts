/**
 * Comentarios anclados a un punto: código listo pero dormante. Necesitan la
 * columna `staff_posts.ancla` (migración opcional, no aplicada). Se activan con
 * NEXT_PUBLIC_PINS_ANCLADOS=1 y, además, el servidor debe confirmar `disponible`.
 */
export const PINS_ANCLADOS = process.env.NEXT_PUBLIC_PINS_ANCLADOS === '1'
