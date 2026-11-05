import { api } from './client'
import { Notificacion } from '@/types'

export type AmbitoNotificaciones = 'todo' | 'para_ti'

export const notificacionesApi = {
  list: (params?: { solo_no_leidas?: boolean; limit?: number; page?: number; ambito?: AmbitoNotificaciones }) =>
    api.get<{ data: Notificacion[]; total: number; pages: number }>('/notificaciones', { params }),

  getUnreadCount: () =>
    api.get<{ no_leidas: number; para_ti: number }>('/notificaciones/count'),

  emergentes: () =>
    api.get<{ data: Notificacion[] }>('/notificaciones/emergentes'),

  markPresented: (ids: string[]) =>
    api.put('/notificaciones/presentadas', { ids }),

  markRead: (id: string) =>
    api.put(`/notificaciones/${id}/leer`),

  markAllRead: (ambito: AmbitoNotificaciones = 'todo') =>
    api.put(`/notificaciones/leer-todas?ambito=${ambito}`),

  delete: (id: string) =>
    api.delete(`/notificaciones/${id}`),
}
