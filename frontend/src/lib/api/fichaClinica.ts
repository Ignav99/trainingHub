import { api } from './client'
import type { BloqueEvaluacion, MomentoEvaluacion } from '@/lib/fichaClinicaCatalog'

export interface EvaluacionClinica {
  id: string
  jugador_id: string
  equipo_id: string
  bloque: BloqueEvaluacion
  fecha: string
  momento: MomentoEvaluacion
  titulo?: string | null
  datos: Record<string, unknown>
  notas?: string | null
  creado_por?: string | null
  created_at: string
  updated_at: string
}

export interface EvaluacionCreatePayload {
  jugador_id: string
  equipo_id: string
  bloque: BloqueEvaluacion
  fecha: string
  momento: MomentoEvaluacion
  titulo?: string | null
  datos?: Record<string, unknown>
  notas?: string | null
}

export const fichaClinicaApi = {
  list: async (jugadorId: string, bloque?: BloqueEvaluacion) => {
    const res = await api.get<EvaluacionClinica[] | { data: EvaluacionClinica[]; total?: number }>(
      '/ficha-clinica',
      { params: { jugador_id: jugadorId, bloque } },
    )
    return Array.isArray(res) ? res : res?.data || []
  },

  create: (data: EvaluacionCreatePayload) =>
    api.post<EvaluacionClinica>('/ficha-clinica', data),

  update: (id: string, data: Partial<EvaluacionCreatePayload>) =>
    api.put<EvaluacionClinica>(`/ficha-clinica/${id}`, data),

  delete: (id: string) => api.delete(`/ficha-clinica/${id}`),

  getHabitos: (jugadorId: string) =>
    api.get<HabitosJugador>(`/ficha-clinica/habitos/${jugadorId}`),

  saveHabitos: (jugadorId: string, data: Partial<HabitosJugador>) =>
    api.put<HabitosJugador>(`/ficha-clinica/habitos/${jugadorId}`, data),
}

export interface HabitosJugador {
  id?: string | null
  jugador_id: string
  comidas?: string | null
  sueno?: string | null
  actividades_nocivas?: string | null
  deportes_externos?: string | null
  notas?: string | null
  datos?: Record<string, unknown>
}
