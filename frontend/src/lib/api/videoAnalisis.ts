import { api } from './client'
import type { CodeButton, CodeEvent } from '@/components/video-analyzer/types'

/** Saved analysis of a local video: botonera + clips, named like a tactical board. */
export interface VideoAnalisis {
  id: string
  equipo_id: string
  created_by?: string
  nombre: string
  descripcion?: string | null
  video_filename?: string | null
  video_fingerprint?: string | null
  video_duration_ms?: number | null
  buttons: CodeButton[]
  events: CodeEvent[]
  created_at?: string
  updated_at?: string
}

/** List rows omit buttons/events and carry the clip count instead. */
export type VideoAnalisisSummary = Omit<VideoAnalisis, 'buttons' | 'events'> & { clips_count: number }

export interface VideoAnalisisPayload {
  equipo_id: string
  nombre: string
  descripcion?: string | null
  video_filename?: string | null
  video_fingerprint?: string | null
  video_duration_ms?: number | null
  buttons: CodeButton[]
  events: CodeEvent[]
}

export const videoAnalisisApi = {
  async list(equipoId: string): Promise<{ data: VideoAnalisisSummary[] }> {
    return api.get<{ data: VideoAnalisisSummary[] }>('/video-analisis', { params: { equipo_id: equipoId } })
  },

  async get(id: string): Promise<VideoAnalisis> {
    return api.get<VideoAnalisis>(`/video-analisis/${id}`)
  },

  async create(data: VideoAnalisisPayload): Promise<VideoAnalisis> {
    return api.post<VideoAnalisis>('/video-analisis', data)
  },

  async update(id: string, data: Partial<Omit<VideoAnalisisPayload, 'equipo_id'>>): Promise<VideoAnalisis> {
    return api.put<VideoAnalisis>(`/video-analisis/${id}`, data)
  },

  async delete(id: string): Promise<void> {
    return api.delete(`/video-analisis/${id}`)
  },
}
