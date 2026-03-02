import { api } from './client'
import { Invitacion, InvitacionVerify, Usuario } from '@/types'

export interface CreateInvitacionData {
  email: string
  nombre?: string
  equipo_id?: string
  rol_organizacion?: string
  rol_en_equipo?: string
  es_invitacion_tutor?: boolean
  jugador_id?: string
}

export interface AcceptInvitacionData {
  token: string
  nombre: string
  apellidos?: string
  password?: string
}

interface InvitacionListResponse {
  data: Invitacion[]
  total: number
}

export const invitacionesApi = {
  list: (params?: { estado?: string; equipo_id?: string; page?: number; limit?: number }) =>
    api.get<InvitacionListResponse>('/invitaciones', { params }),

  create: (data: CreateInvitacionData) =>
    api.post<Invitacion>('/invitaciones', data),

  verify: (token: string) =>
    api.get<InvitacionVerify>(`/invitaciones/verify/${token}`),

  accept: (data: AcceptInvitacionData) =>
    api.post<Usuario>('/invitaciones/accept', data),

  resend: (id: string) =>
    api.post<Invitacion>(`/invitaciones/${id}/resend`),

  revoke: (id: string) =>
    api.delete(`/invitaciones/${id}`),
}
