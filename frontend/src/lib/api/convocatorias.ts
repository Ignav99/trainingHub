import { api } from './client'
import { Convocatoria, ConvocatoriasJugadorStats, RendimientoNotaResponse } from '@/types'

export interface CreateConvocatoriaData {
  partido_id: string
  jugador_id: string
  titular: boolean
  posicion_asignada?: string
  dorsal?: number
}

export interface UpdateConvocatoriaData {
  titular?: boolean
  posicion_asignada?: string
  dorsal?: number
  minutos_jugados?: number
  goles?: number
  asistencias?: number
  tarjeta_amarilla?: boolean
  tarjeta_roja?: boolean
  notas?: string
}

export const convocatoriasApi = {
  listByPartido: (partidoId: string) =>
    api.get<{ data: Convocatoria[]; total: number }>(`/convocatorias/partido/${partidoId}`),

  listByJugador: (jugadorId: string, params?: { limit?: number }) =>
    api.get<{ data: Convocatoria[]; estadisticas: ConvocatoriasJugadorStats }>(`/convocatorias/jugador/${jugadorId}`, { params }),

  create: (data: CreateConvocatoriaData) =>
    api.post<Convocatoria>('/convocatorias', data),

  createBatch: (jugadores: CreateConvocatoriaData[]) =>
    api.post<{ created: number; data: Convocatoria[] }>('/convocatorias/batch', jugadores),

  update: (id: string, data: UpdateConvocatoriaData) =>
    api.put<Convocatoria>(`/convocatorias/${id}`, data),

  delete: (id: string) =>
    api.delete(`/convocatorias/${id}`),

  batchUpdateStats: (updates: Array<{ id: string; minutos_jugados?: number; goles?: number; asistencias?: number; tarjeta_amarilla?: boolean; tarjeta_roja?: boolean }>) =>
    api.put<{ updated: number; data: any[] }>('/convocatorias/batch-update', updates),

  upsertRendimiento: (convocatoriaId: string, nota: number) =>
    api.put<RendimientoNotaResponse>(`/convocatorias/${convocatoriaId}/rendimiento`, { nota }),

  /** Elimina mi nota; el backend recalcula la media (respuesta no tipada en api.delete). */
  deleteRendimiento: async (convocatoriaId: string): Promise<RendimientoNotaResponse> => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/v1'
    let token: string | null = null
    try {
      const stored = localStorage.getItem('traininghub-auth')
      if (stored) token = JSON.parse(stored)?.state?.accessToken || null
    } catch { /* ignore */ }
    const res = await fetch(`${base}/convocatorias/${convocatoriaId}/rendimiento`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.detail || 'Error al eliminar nota')
    }
    return res.json()
  },

  async generatePdf(partidoId: string): Promise<Blob> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/convocatorias/partido/${partidoId}/pdf`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    })
    if (!response.ok) throw new Error('Error generating PDF')
    return response.blob()
  },
}
