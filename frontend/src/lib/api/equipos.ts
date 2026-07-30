import { api } from './client'
import { Equipo } from '@/types'

interface ListEquiposResponse {
  data: Equipo[]
  total: number
}

export const equiposApi = {
  async list(): Promise<ListEquiposResponse> {
    return api.get<ListEquiposResponse>('/equipos')
  },

  async get(id: string): Promise<Equipo> {
    return api.get<Equipo>(`/equipos/${id}`)
  },

  async create(data: Partial<Equipo>): Promise<Equipo> {
    return api.post<Equipo>('/equipos', data)
  },

  async update(id: string, data: Partial<Equipo>): Promise<Equipo> {
    return api.put<Equipo>(`/equipos/${id}`, data)
  },

  async delete(id: string): Promise<void> {
    return api.delete(`/equipos/${id}`)
  },

  async nuevaTemporada(
    id: string,
    data: { temporada: string; nombre?: string; jugadores_continuan: string[] }
  ): Promise<{ equipo_anterior_id: string; equipo_nuevo: Equipo; jugadores_movidos: number }> {
    return api.post(`/equipos/${id}/nueva-temporada`, data)
  },
}
