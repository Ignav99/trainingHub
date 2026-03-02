import { api } from './client'
import { AIConversacion, AIMensaje, AIChatResponse, PaginatedResponse } from '@/types'

export interface AIChatMessageData {
  mensaje: string
  conversacion_id?: string
  equipo_id?: string
  contexto?: Record<string, any>
}

export const aiChatApi = {
  chat: (data: AIChatMessageData) =>
    api.post<AIChatResponse>('/ai/chat', data),

  listConversaciones: (params?: { page?: number; limit?: number }) =>
    api.get<PaginatedResponse<AIConversacion>>('/ai/conversaciones', { params }),

  getConversacion: (id: string) =>
    api.get<{ conversacion: AIConversacion; mensajes: AIMensaje[] }>(`/ai/conversaciones/${id}`),

  deleteConversacion: (id: string) =>
    api.delete(`/ai/conversaciones/${id}`),
}
