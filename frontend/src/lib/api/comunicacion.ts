import { api } from './client'
import { Conversacion, Mensaje } from '@/types'

export interface CreateConversacionData {
  tipo: 'directa' | 'grupo' | 'canal'
  nombre?: string
  participantes: string[]
  equipo_id?: string
}

export interface SendMensajeData {
  contenido: string
  tipo?: 'texto' | 'imagen' | 'archivo'
  archivo_url?: string
}

export const comunicacionApi = {
  listConversaciones: () =>
    api.get<Conversacion[]>('/comunicacion/conversaciones'),

  getConversacion: (id: string) =>
    api.get<Conversacion>(`/comunicacion/conversaciones/${id}`),

  createConversacion: (data: CreateConversacionData) =>
    api.post<Conversacion>('/comunicacion/conversaciones', data),

  getMensajes: (conversacionId: string, params?: { limit?: number; before?: string }) =>
    api.get<Mensaje[]>(`/comunicacion/conversaciones/${conversacionId}/mensajes`, { params }),

  sendMensaje: (conversacionId: string, data: SendMensajeData) =>
    api.post<Mensaje>(`/comunicacion/conversaciones/${conversacionId}/mensajes`, data),

  markRead: (conversacionId: string) =>
    api.post(`/comunicacion/conversaciones/${conversacionId}/leer`),
}
