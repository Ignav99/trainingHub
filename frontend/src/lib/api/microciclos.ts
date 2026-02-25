import { api } from './client'
import { Microciclo, MicrocicloCompleto, PaginatedResponse, Sesion } from '@/types'

export interface CreateMicrocicloData {
  equipo_id: string
  fecha_inicio: string
  fecha_fin: string
  partido_id?: string
  objetivo_principal?: string
  objetivo_tactico?: string
  objetivo_fisico?: string
  estado?: string
  notas?: string
}

interface ListMicrociclosParams {
  page?: number
  limit?: number
  equipo_id?: string
  estado?: string
  fecha_desde?: string
  fecha_hasta?: string
  [key: string]: string | number | boolean | undefined
}

export const microciclosApi = {
  async list(params?: ListMicrociclosParams): Promise<PaginatedResponse<Microciclo>> {
    return api.get<PaginatedResponse<Microciclo>>('/microciclos', { params })
  },

  async get(id: string): Promise<Microciclo> {
    return api.get<Microciclo>(`/microciclos/${id}`)
  },

  async getCompleto(id: string): Promise<MicrocicloCompleto> {
    return api.get<MicrocicloCompleto>(`/microciclos/${id}/completo`)
  },

  async getSesiones(id: string): Promise<{ data: Sesion[]; total: number }> {
    return api.get<{ data: Sesion[]; total: number }>(`/microciclos/${id}/sesiones`)
  },

  async create(data: CreateMicrocicloData): Promise<Microciclo> {
    return api.post<Microciclo>('/microciclos', data)
  },

  async update(id: string, data: Partial<CreateMicrocicloData>): Promise<Microciclo> {
    return api.put<Microciclo>(`/microciclos/${id}`, data)
  },

  async delete(id: string): Promise<void> {
    return api.delete(`/microciclos/${id}`)
  },
}
