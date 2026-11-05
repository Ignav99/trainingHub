import { api } from './client'
import type { EntidadStaffPost, StaffHilo, TipoStaffPost } from '@/types'

export type FiltroTablero = 'todo' | 'preguntas' | 'tareas' | 'mis_tareas' | 'menciones' | 'avisos'

export interface NuevoPost {
  equipo_id: string
  tipo?: TipoStaffPost
  contenido: string
  parent_id?: string
  asignado_a?: string | null
  fecha_limite?: string | null
  entidad_tipo?: EntidadStaffPost
  entidad_id?: string
}

export interface CambiosPost {
  contenido?: string
  estado?: 'abierta' | 'resuelta'
  asignado_a?: string | null
  fecha_limite?: string | null
  fijado?: boolean
}

export const tableroApi = {
  create: (body: NuevoPost) => api.post<StaffHilo>('/tablero', body),

  update: (equipoId: string, postId: string, cambios: CambiosPost) =>
    api.patch<StaffHilo>(`/tablero/${postId}?equipo_id=${equipoId}`, cambios),

  remove: (equipoId: string, postId: string) =>
    api.delete(`/tablero/${postId}?equipo_id=${equipoId}`),
}

export function isTableroKey(key: unknown): boolean {
  return typeof key === 'string' && key.startsWith('/tablero')
}

export function isNotificacionesKey(key: unknown): boolean {
  return typeof key === 'string' && key.startsWith('/notificaciones')
}
