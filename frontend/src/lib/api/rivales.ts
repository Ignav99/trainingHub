import { api } from './client'
import { Rival } from '@/types'

export interface CreateRivalData {
  nombre: string
  nombre_corto?: string
  escudo_url?: string
  estadio?: string
  ciudad?: string
  notas?: string
}

export const rivalesApi = {
  list: (params?: { equipo_id?: string }) =>
    api.get<Rival[]>('/rivales', { params }),

  get: (id: string) =>
    api.get<Rival>(`/rivales/${id}`),

  create: (data: CreateRivalData) =>
    api.post<Rival>('/rivales', data),

  update: (id: string, data: Partial<CreateRivalData>) =>
    api.patch<Rival>(`/rivales/${id}`, data),

  delete: (id: string) =>
    api.delete(`/rivales/${id}`),
}
