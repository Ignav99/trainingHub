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

  async delete(id: string): Promise<void> {
    return api.delete(`/descansos/${id}`)
  },
}
