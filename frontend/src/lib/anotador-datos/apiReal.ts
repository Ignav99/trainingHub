/** Llamadas reales al servidor para el volcado (envoltorio de los clientes API existentes). */
import { convocatoriasApi } from '../api/convocatorias'
import { estadisticasPartidoApi } from '../api/estadisticasPartido'
import { partidosApi } from '../api/partidos'
import type { ApiSync } from './sincronizar.ts'

export const apiSyncReal: ApiSync = {
  async obtenerNotasPre(id) {
    const p = await partidosApi.get(id)
    return p?.notas_pre ?? null
  },
  async guardarNotasPre(id, notasPre) {
    await partidosApi.update(id, { notas_pre: notasPre }, { timeout: 20_000 })
  },
  async actualizarConvocatorias(filas) {
    await convocatoriasApi.batchUpdateStats(filas as unknown as Parameters<typeof convocatoriasApi.batchUpdateStats>[0], { timeout: 20_000 })
  },
  async registrarResultado(id, gf, gc) {
    await partidosApi.registrarResultado(id, gf, gc)
  },
  async upsertEstadisticas(id, payload) {
    await estadisticasPartidoApi.upsert(id, payload as unknown as Parameters<typeof estadisticasPartidoApi.upsert>[1])
  },
  async upsertRendimiento(convId, nota) {
    await convocatoriasApi.upsertRendimiento(convId, nota)
  },
}

/** Sonda de alcance: cualquier respuesta (incluso opaca) significa que hay ruta hasta el servidor. */
export async function pingServidor(timeoutMs = 4_000): Promise<boolean> {
  try {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/v1'
    const origen = new URL(base).origin
    const c = new AbortController()
    const t = setTimeout(() => c.abort(), timeoutMs)
    try {
      await fetch(`${origen}/health`, { method: 'GET', mode: 'no-cors', cache: 'no-store', signal: c.signal })
      return true
    } finally {
      clearTimeout(t)
    }
  } catch {
    return false
  }
}
