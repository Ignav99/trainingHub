/**
 * Copia oculta de lo que el delegado descarta a propósito ("Descartar" en la recuperación).
 * Se guarda en el store `meta` del diario durante 24 h por si fue un error; pasado ese plazo se purga.
 * Sin dependencias de la app (se prueba con node --test).
 */
import type { Diario } from './journal.ts'
import type { EstadoPartido } from './tipos.ts'

export const RETENCION_DESCARTADO_MS = 24 * 3600 * 1000
export const PREFIJO_DESCARTADO = 'descartado:'
export const claveDescartado = (partidoId: string) => `${PREFIJO_DESCARTADO}${partidoId}`

export interface Descartado {
  ts: number
  partidoId: string
  estado: EstadoPartido
}

/** Guarda la copia. Si esto falla NO se debe descartar nada (la excepción sube). */
export async function guardarDescartado(
  diario: Pick<Diario, 'escribirMeta'>,
  partidoId: string,
  estado: EstadoPartido,
  now: number = Date.now(),
): Promise<void> {
  await diario.escribirMeta<Descartado>(claveDescartado(partidoId), { ts: now, partidoId, estado })
}

/** La copia descartada, o null si no hay o ya caducó. */
export async function leerDescartado(
  diario: Pick<Diario, 'leerMeta'>,
  partidoId: string,
  now: number = Date.now(),
): Promise<Descartado | null> {
  const d = await diario.leerMeta<Descartado>(claveDescartado(partidoId))
  if (!d || typeof d.ts !== 'number' || !d.estado) return null
  return now - d.ts > RETENCION_DESCARTADO_MS ? null : d
}

/** Borra las copias con más de 24 h. Devuelve los partidos purgados. */
export async function purgarDescartados(
  diario: Pick<Diario, 'listarStore' | 'almacen'>,
  now: number = Date.now(),
): Promise<string[]> {
  const purgados: string[] = []
  const filas = await diario.listarStore<Descartado>('meta', PREFIJO_DESCARTADO)
  for (const f of filas) {
    if (now - (f.value?.ts ?? 0) <= RETENCION_DESCARTADO_MS) continue
    await diario.almacen.delete('meta', f.key)
    purgados.push(f.key.slice(PREFIJO_DESCARTADO.length))
  }
  return purgados
}

/** Una copia descartada que el servidor ya no necesita se puede recuperar con esto (soporte / consola). */
export async function restaurarDescartado(
  diario: Pick<Diario, 'leerMeta' | 'reemplazar'>,
  partidoId: string,
  now: number = Date.now(),
): Promise<EstadoPartido | null> {
  const d = await leerDescartado(diario, partidoId, now)
  if (!d) return null
  await diario.reemplazar(partidoId, d.estado)
  return d.estado
}
