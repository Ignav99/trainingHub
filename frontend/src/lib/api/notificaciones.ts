import { api } from './client'
import { Notificacion } from '@/types'

export const notificacionesApi = {
  list: (params?: { leida?: boolean; solo_no_leidas?: boolean; limit?: number }) =>
    api.get<{ data: Notificacion[]; total: number }>('/notificaciones', { params }),

  getUnreadCount: () =>
    api.get<{ count: number }>('/notificaciones/no-leidas/count'),

  markRead: (id: string) =>
    api.patch<Notificacion>(`/notificaciones/${id}/leer`),

  markAllRead: () =>
    api.post('/notificaciones/leer-todas'),

  delete: (id: string) =>
    api.delete(`/notificaciones/${id}`),
}
