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
}
