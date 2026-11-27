/**
 * Outbox: estado de entrega de cada paso del volcado, por partido.
 * Persistido en el store `outbox` (clave `${partidoId}:${paso}`).
 * Un paso está pendiente mientras `revEntregado < rev` del estado local.
 */
import type { Diario } from './journal.ts'
import { PASOS, type PasoSync, type RegistroOutbox } from './tipos.ts'

export type RegistrosOutbox = Record<PasoSync, RegistroOutbox>

export function registroNuevo(partidoId: string, paso: PasoSync): RegistroOutbox {
  return { partidoId, paso, revObjetivo: 0, revEntregado: 0, intentos: 0, proximoIntento: 0 }
}

export async function leerOutbox(diario: Pick<Diario, 'leerStore'>, partidoId: string): Promise<RegistrosOutbox> {
  const out = {} as RegistrosOutbox
  for (const paso of PASOS) {
    const r = await diario.leerStore<RegistroOutbox>('outbox', `${partidoId}:${paso}`)
    out[paso] = r && typeof r === 'object' && typeof r.revEntregado === 'number'
      ? { ...registroNuevo(partidoId, paso), ...r }
      : registroNuevo(partidoId, paso)
  }
  return out
}

export async function guardarRegistro(diario: Pick<Diario, 'escribirStore'>, reg: RegistroOutbox): Promise<void> {
  await diario.escribirStore('outbox', `${reg.partidoId}:${reg.paso}`, reg)
}

/** Revisión mínima ya entregada en todos los pasos. */
export function revEntregadaMinima(regs: RegistrosOutbox): number {
  return Math.min(...PASOS.map((p) => regs[p].revEntregado))
}

export function hayPasosPendientes(regs: RegistrosOutbox, rev: number): boolean {
  return PASOS.some((p) => regs[p].revEntregado < rev)
}
