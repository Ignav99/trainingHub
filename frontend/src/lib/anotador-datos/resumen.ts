/**
 * Resumen del almacén local sin abrir ningún partido: qué hay preparado para jugar sin conexión
 * y qué partidos tienen cambios sin enviar al servidor ("3 cambios sin enviar").
 * Solo lectura; sin dependencias de la app.
 */
import type { Diario } from './journal.ts'
import { hayPasosPendientes, leerOutbox, revEntregadaMinima } from './outbox.ts'
import { tieneContenido } from './estado.ts'
import type { PartidoLocal } from './prefetch.ts'

export interface ResumenAlmacen {
  pendientes: Record<string, number>
  conDatos: string[]
  preparados: Record<string, { guardadoAt: number; partido: unknown }>
}

export async function resumirAlmacen(diario: Pick<Diario, 'listarPartidos' | 'cargar' | 'leerStore' | 'listarStore' | 'contarOpsDesde' | 'almacen'>): Promise<ResumenAlmacen> {
  const out: ResumenAlmacen = { pendientes: {}, conDatos: [], preparados: {} }
  // Un partido puede tener operaciones en el diario antes de su primer checkpoint (≤2 s): se cuentan también.
  const ids = new Set(await diario.listarPartidos())
  try {
    for (const f of await diario.almacen.listar('journal')) ids.add(f.key.split(':')[0])
  } catch { /* sin diario legible: nos quedamos con los checkpoints */ }
  for (const pid of Array.from(ids)) {
    let estado = null
    try { estado = await diario.cargar(pid) } catch { /* partido ilegible: se ignora, no se borra */ }
    if (!estado) continue
    if (tieneContenido(estado)) out.conDatos.push(pid)
    const regs = await leerOutbox(diario, pid)
    if (hayPasosPendientes(regs, estado.meta.rev)) {
      const n = await diario.contarOpsDesde(pid, revEntregadaMinima(regs)).catch(() => 1)
      out.pendientes[pid] = Math.max(1, n)
    }
  }
  const pre = await diario.listarStore<PartidoLocal>('meta', 'prefetch:')
  for (const f of pre) {
    const r = f.value
    if (r && typeof r === 'object' && typeof r.partidoId === 'string') {
      out.preparados[r.partidoId] = { guardadoAt: r.guardadoAt, partido: r.partido }
    }
  }
  return out
}
