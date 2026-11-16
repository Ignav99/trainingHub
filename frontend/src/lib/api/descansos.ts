import { cache as swrCache, mutate } from 'swr/_internal'
import { api } from './client'
import { Descanso } from '@/types'
import {
  efectoDelCambio,
  filaDeRespuesta,
  listaTrasGuardar,
  empezarEscrituraDescansos,
  respuestaBorra,
  terminarEscrituraDescansos,
} from '../descansosSync'

type ListaDescansos = { data: Descanso[] }

const esClaveDescansos = (k: unknown): k is string => typeof k === 'string' && k.startsWith('/descansos')

function estadoCache(clave: string): { data?: unknown } | undefined {
  for (const hashed of Array.from(swrCache.keys())) {
    const state = swrCache.get(hashed) as { _k?: unknown; data?: unknown } | undefined
    if (state && state._k === clave) return state
  }
  return undefined
}

export function listaDescansosEnCache(clave: string): ListaDescansos | undefined {
  const data = estadoCache(clave)?.data
  if (!data || typeof data !== 'object' || !Array.isArray((data as ListaDescansos).data)) return undefined
  return data as ListaDescansos
}

function clavesEnCache(): string[] {
  const claves: string[] = []
  for (const hashed of Array.from(swrCache.keys())) {
    const state = swrCache.get(hashed) as { _k?: unknown } | undefined
    if (state && typeof state._k === 'string' && esClaveDescansos(state._k)) claves.push(state._k)
  }
  return claves
}

async function confirmarFila(fila: Descanso): Promise<void> {
  await Promise.all(
    clavesEnCache().map(async (clave) => {
      const actual = listaDescansosEnCache(clave)
      if (!actual) return
      await mutate(
        clave,
        { ...actual, data: listaTrasGuardar(actual.data, clave, fila.fecha, fila) },
        { revalidate: false }
      )
    })
  )
}

async function deshacerCambio(
  previos: Map<string, Descanso[]>,
  cambio: (lista: Descanso[]) => Descanso[]
): Promise<void> {
  await Promise.all(
    clavesEnCache().map(async (clave) => {
      const actual = listaDescansosEnCache(clave)
      const antes = previos.get(clave)
      if (!actual || !antes) return
      const efecto = efectoDelCambio(antes, cambio(antes))
      let siguiente = actual.data
      efecto.forEach((_fila, fecha) => {
        const previa = antes.find((fila) => fila.fecha.slice(0, 10) === fecha) ?? null
        siguiente = listaTrasGuardar(siguiente, clave, fecha, previa)
      })
      await mutate(clave, { ...actual, data: siguiente }, { revalidate: false })
    })
  )
}

/**
 * Pinta el día al momento en todas las listas (calendario, tira y precarga)
 * y lo deja ahí cuando el servidor acepta. No revalida: SWR reutiliza hasta
 * 4 s una lista pedida antes del clic y el día se borraba recién pintado.
 * Una lectura empezada antes del guardado tampoco puede pisarlo.
 */
export async function sincronizarDescansos(
  cambio: (lista: Descanso[]) => Descanso[],
  peticion: () => Promise<unknown>
): Promise<void> {
  const previos = new Map<string, Descanso[]>()
  for (const clave of clavesEnCache()) {
    const actual = listaDescansosEnCache(clave)
    if (actual) previos.set(clave, actual.data)
  }

  empezarEscrituraDescansos()
  await mutate(
    esClaveDescansos,
    (actual?: ListaDescansos) => {
      if (!actual || !Array.isArray(actual.data)) return actual
      return { ...actual, data: cambio(actual.data) }
    },
    { revalidate: false }
  ).catch(() => undefined)

  let result: unknown
  try {
    result = await peticion()
  } catch (err) {
    terminarEscrituraDescansos()
    await deshacerCambio(previos, cambio)
    throw err
  }

  terminarEscrituraDescansos()
  const confirmada = respuestaBorra(result) ? null : filaDeRespuesta<Descanso>(result)
  if (confirmada) await confirmarFila(confirmada)
}

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
