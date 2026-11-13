import { mutate } from 'swr'
import { api } from './client'
import { Descanso } from '@/types'

export const descansosApi = {
  async list(equipo_id: string, fecha_desde: string, fecha_hasta: string): Promise<{ data: Descanso[] }> {
    return api.get<{ data: Descanso[] }>('/descansos', {
      params: { equipo_id, fecha_desde, fecha_hasta },
    })
  },

  async toggle(equipo_id: string, fecha: string, tipo: string = 'descanso'): Promise<Descanso | { deleted: true; id: string }> {
    return api.post<Descanso | { deleted: true; id: string }>('/descansos', {
      equipo_id,
      fecha,
      tipo,
    })
  },

  /** Fija el día sin alternar (crea o reemplaza la fila de equipo+fecha). */
  async guardar(
    equipo_id: string,
    fecha: string,
    tipo: Descanso['tipo'],
    notas: string | null
  ): Promise<Descanso> {
    return api.put<Descanso>('/descansos', { equipo_id, fecha, tipo, notas })
  },

  async delete(id: string): Promise<void> {
    return api.delete(`/descansos/${id}`)
  },
}

const esClaveDescansos = (k: unknown): k is string => typeof k === 'string' && k.startsWith('/descansos')

/**
 * Cambio optimista en TODAS las listas de descansos cacheadas (calendario de
 * la temporada, tira de la semana, precarga del layout) y revalidación al
 * terminar la petición, para que el calendario y la tira cambien a la vez.
 * Si la petición falla, la revalidación devuelve el estado real y se relanza.
 * Una fila fuera del rango de una lista no estorba: cada vista mira solo sus
 * fechas, y la revalidación la quita.
 */
export async function sincronizarDescansos(
  cambio: (lista: Descanso[]) => Descanso[],
  peticion: () => Promise<unknown>
): Promise<void> {
  await mutate(
    esClaveDescansos,
    (actual?: { data?: Descanso[] }) => {
      if (!actual || !Array.isArray(actual.data)) return actual
      return { ...actual, data: cambio(actual.data) }
    },
    { revalidate: false }
  ).catch(() => undefined)
  try {
    await peticion()
  } finally {
    await mutate(esClaveDescansos).catch(() => undefined)
  }
}
