import { api } from './client'
import { RegistroMedico } from '@/types'

export interface CreateRegistroMedicoData {
  jugador_id: string
  equipo_id: string
  tipo: string
  titulo: string
  descripcion?: string
  diagnostico?: string
  tratamiento?: string
  medicacion?: string
  fecha_inicio: string
  fecha_fin?: string
  dias_baja_estimados?: number
  solo_medico?: boolean
}

export const medicoApi = {
  list: (equipoId: string, params?: { jugador_id?: string; tipo?: string; estado?: string }) =>
    api.get<RegistroMedico[]>('/medico', { params: { equipo_id: equipoId, ...params } }),

  get: (id: string) =>
    api.get<RegistroMedico>(`/medico/${id}`),

  create: (data: CreateRegistroMedicoData) =>
    api.post<RegistroMedico>('/medico', data),

  update: (id: string, data: Partial<CreateRegistroMedicoData>) =>
    api.put<RegistroMedico>(`/medico/${id}`, data),

  darAlta: (id: string, data: { fecha_alta: string; dias_baja_reales?: number }) =>
    api.post<RegistroMedico>(`/medico/${id}/mark-fit`, data),

  delete: (id: string) =>
    api.delete(`/medico/${id}`),
}
