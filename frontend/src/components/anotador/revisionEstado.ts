/** Estado de la revisión: qué avisos se descartaron o confirmaron. Puro. */

export type Severidad = 'error' | 'aviso' | 'info'

export interface AvisoBase {
  id: string
  severidad: Severidad
}

export interface EstadoRevision {
  /** "Está bien": se oculta y se recuerda (avisos e info). */
  descartados: string[]
  /** "Está bien" sobre un error: se mantiene visible pero ya no bloquea el envío. */
  confirmados: string[]
}

export const REVISION_VACIA: EstadoRevision = { descartados: [], confirmados: [] }

export function marcarBien<T extends AvisoBase>(est: EstadoRevision, aviso: T): EstadoRevision {
  if (aviso.severidad === 'error') {
    return est.confirmados.includes(aviso.id)
      ? est
      : { ...est, confirmados: [...est.confirmados, aviso.id] }
  }
  return est.descartados.includes(aviso.id)
    ? est
    : { ...est, descartados: [...est.descartados, aviso.id] }
}

export function reabrir(est: EstadoRevision, id: string): EstadoRevision {
  return {
    descartados: est.descartados.filter((x) => x !== id),
    confirmados: est.confirmados.filter((x) => x !== id),
  }
}

export function visibles<T extends AvisoBase>(avisos: T[], est: EstadoRevision): T[] {
  const orden: Record<Severidad, number> = { error: 0, aviso: 1, info: 2 }
  return avisos
    .filter((a) => !est.descartados.includes(a.id))
    .sort((a, b) => orden[a.severidad] - orden[b.severidad])
}

export function pendientes<T extends AvisoBase>(avisos: T[], est: EstadoRevision) {
  const v = visibles(avisos, est)
  const errores = v.filter((a) => a.severidad === 'error' && !est.confirmados.includes(a.id)).length
  const resto = v.filter((a) => a.severidad !== 'error').length
  return { errores, avisos: resto, total: errores + resto }
}

/** Se puede enviar cuando no queda ningún error sin confirmar. */
export function puedeEnviar<T extends AvisoBase>(avisos: T[], est: EstadoRevision): boolean {
  return pendientes(avisos, est).errores === 0
}

export function parsearEstado(raw: string | null): EstadoRevision {
  if (!raw) return REVISION_VACIA
  try {
    const o = JSON.parse(raw) as Partial<EstadoRevision>
    return {
      descartados: Array.isArray(o.descartados) ? o.descartados.filter((x) => typeof x === 'string') : [],
      confirmados: Array.isArray(o.confirmados) ? o.confirmados.filter((x) => typeof x === 'string') : [],
    }
  } catch {
    return REVISION_VACIA
  }
}
