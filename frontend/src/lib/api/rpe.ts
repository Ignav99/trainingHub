import { api } from './client'
import { RPERegistro, RPEResumenEquipo, TipoJugador } from '@/types'

export interface CreateRPEData {
  jugador_id: string
  sesion_id?: string
  partido_id?: string
  fecha: string
  rpe?: number
  duracion_percibida?: number
  tipo?: 'sesion' | 'manual' | 'wellness' | 'partido'
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

  listByJugador: (jugadorId: string, params?: { tipo?: string; limit?: number }) =>
    api.get<{ data: RPERegistro[] }>(`/rpe/jugador/${jugadorId}`, { params }),

  getResumen: (equipoId: string, params?: { fecha_desde?: string; fecha_hasta?: string }) =>
    api.get<RPEResumenEquipo>('/rpe/resumen', { params: { equipo_id: equipoId, ...params } }),

  listBySesion: (sesionId: string, params?: { page?: number; limit?: number }) =>
    api.get<{ data: RPERegistro[]; total?: number }>('/rpe', {
      params: { sesion_id: sesionId, page: params?.page || 1, limit: params?.limit || 100 },
    }),

  update: (id: string, data: UpdateRPEData) =>
    api.put<RPERegistro>(`/rpe/${id}`, data),

  delete: (id: string) =>
    api.delete(`/rpe/${id}`),

  getSesionAsignacion: (sesionId: string) =>
    api.get<SesionRpeAsignacion>(`/rpe/sesion/${sesionId}/asignacion`),

  putSesionAsignacion: (sesionId: string, items: { jugador_id: string; rpe: number | null }[]) =>
    api.put<SesionRpeAsignacion>(`/rpe/sesion/${sesionId}/asignacion`, { items }),
}

export interface SesionRpeJugador {
  jugador_id: string
  nombre: string
  apellidos?: string | null
  apodo?: string | null
  dorsal?: number | null
  tipo_jugador?: TipoJugador | null
  presente: boolean
  rpe?: number | null
  minutos_efectivos: number
  registro_id?: string | null
  carga_sesion?: number | null
}

export interface SesionRpeAsignacion {
  sesion_id: string
  fecha: string
  titulo?: string | null
  jugadores: SesionRpeJugador[]
  saved?: number
}
