import { api } from './client'
import type { VideoAnotacion } from '@/types'

export interface VideoAnotacionCreateData {
  video_id: string
  equipo_id: string
  timestamp_seconds: number
  titulo: string
  descripcion?: string
  drawing_data: unknown[]
  thumbnail_data?: string
  orden?: number
}

export interface VideoAnotacionUpdateData {
  titulo?: string
  descripcion?: string
  timestamp_seconds?: number
  drawing_data?: unknown[]
  thumbnail_data?: string
  orden?: number
}

export const videoAnotacionesApi = {
  async list(videoId: string, equipoId: string): Promise<{ data: VideoAnotacion[] }> {
    return api.get<{ data: VideoAnotacion[] }>(`/video-anotaciones/video/${videoId}`, {
      params: { equipo_id: equipoId },
    })
  },

  async create(data: VideoAnotacionCreateData): Promise<VideoAnotacion> {
    return api.post<VideoAnotacion>('/video-anotaciones/', data)
  },

  async update(id: string, equipoId: string, data: VideoAnotacionUpdateData): Promise<VideoAnotacion> {
    return api.put<VideoAnotacion>(`/video-anotaciones/${id}`, data, {
      params: { equipo_id: equipoId },
    })
  },

  async delete(id: string, equipoId: string): Promise<void> {
    return api.delete(`/video-anotaciones/${id}`, {
      params: { equipo_id: equipoId },
    })
  },
}
