import { api } from './client'
import type { PruebaMedica, RegistroMedico } from '@/types'

export interface CreateRegistroMedicoData {
  jugador_id: string
  equipo_id: string
  tipo: string
  titulo: string
  descripcion?: string
  diagnostico?: string
  diagnostico_fisioterapeutico?: string
  tratamiento?: string
  medicacion?: string
  fecha_inicio: string
  fecha_fin?: string
  fecha_alta?: string
  dias_baja_estimados?: number
  documentos_urls?: string[]
  estado?: string
  solo_medico?: boolean
  registro_padre_id?: string
  severidad?: string
  zona_corporal?: string
  lado?: string
  mecanismo?: string
  es_relesion?: boolean
  registro_origen_id?: string
  disponibilidad?: string
  fase_rtp?: string
}

export interface CreatePruebaMedicaData {
  tipo: string
  titulo: string
  fecha: string
  resultado?: string
  apto?: boolean
  documento_url?: string
  notas?: string
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

  moveToRehab: (id: string, data: { dias_recuperacion_estimados?: number; fase_rtp?: string; disponibilidad?: string }) =>
    api.post(`/medico/${id}/move-to-rehab`, data),

  delete: (id: string) =>
    api.delete(`/medico/${id}`),

  uploadDocument: async (registroId: string, file: File): Promise<{ url: string; documentos_urls: string[] }> => {
    const formData = new FormData()
    formData.append('file', file)
    return api.upload<{ url: string; documentos_urls: string[] }>(`/medico/${registroId}/upload-document`, formData)
  },

  deleteDocument: (registroId: string, url: string) =>
    api.delete(`/medico/${registroId}/document`, { params: { url } }),

  listPruebas: (registroId: string) =>
    api.get<PruebaMedica[]>(`/medico/${registroId}/pruebas`),

  createPrueba: (registroId: string, data: CreatePruebaMedicaData) =>
    api.post<PruebaMedica>(`/medico/${registroId}/pruebas`, data),

  updatePrueba: (registroId: string, pruebaId: string, data: Partial<CreatePruebaMedicaData>) =>
    api.put<PruebaMedica>(`/medico/${registroId}/pruebas/${pruebaId}`, data),

  deletePrueba: (registroId: string, pruebaId: string) =>
    api.delete(`/medico/${registroId}/pruebas/${pruebaId}`),
}
