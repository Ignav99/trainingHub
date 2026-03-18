import { api } from './client'
import { RPERegistro, RPEResumenEquipo } from '@/types'

export interface CreateRPEData {
  jugador_id: string
  sesion_id?: string
  fecha: string
  rpe?: number
  duracion_percibida?: number
  tipo?: 'sesion' | 'manual' | 'wellness'
  titulo?: string
  sueno?: number
  fatiga?: number
  dolor?: number
  estres?: number
  humor?: number
  notas?: string
}

export interface UpdateRPEData {
  rpe?: number
  duracion_percibida?: number
  titulo?: string
  notas?: string
  fecha?: string
}

export const rpeApi = {
  create: (data: CreateRPEData) =>
    api.post<RPERegistro>('/rpe', data),

  listBySesion: (sesionId: string) =>
    api.get<RPERegistro[]>(`/rpe/sesion/${sesionId}`),

  listByJugador: (jugadorId: string, params?: { tipo?: string; limit?: number }) =>
    api.get<{ data: RPERegistro[] }>(`/rpe/jugador/${jugadorId}`, { params }),

  getResumen: (equipoId: string, params?: { fecha_desde?: string; fecha_hasta?: string }) =>
    api.get<RPEResumenEquipo>(`/rpe/resumen/${equipoId}`, { params }),

  update: (id: string, data: UpdateRPEData) =>
    api.put<RPERegistro>(`/rpe/${id}`, data),

  delete: (id: string) =>
    api.delete(`/rpe/${id}`),
}
