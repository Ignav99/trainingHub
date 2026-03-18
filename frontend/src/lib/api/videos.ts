import { api } from './client'
import type { VideoPartido, TipoVideo, ContextoVideo } from '@/types'

export interface VideoLinkData {
  partido_id: string
  equipo_id: string
  tipo: TipoVideo
  contexto: ContextoVideo
  titulo: string
  descripcion?: string
  url: string
}

export interface VideoUpdateData {
  titulo?: string
  descripcion?: string
  url?: string
}

export const videosApi = {
  async list(partidoId: string, equipoId: string, contexto?: ContextoVideo): Promise<{ data: VideoPartido[] }> {
    const params: Record<string, string> = { equipo_id: equipoId }
    if (contexto) params.contexto = contexto
    return api.get<{ data: VideoPartido[] }>(`/videos/partido/${partidoId}`, { params })
  },

  async addLink(data: VideoLinkData): Promise<VideoPartido> {
    return api.post<VideoPartido>('/videos/link', data)
  },

  async upload(formData: FormData): Promise<VideoPartido> {
    return api.upload<VideoPartido>('/videos/upload', formData)
  },

  async update(id: string, equipoId: string, data: VideoUpdateData): Promise<VideoPartido> {
    return api.put<VideoPartido>(`/videos/${id}`, data, { params: { equipo_id: equipoId } })
  },

  async delete(id: string, equipoId: string): Promise<void> {
    return api.delete(`/videos/${id}`, { params: { equipo_id: equipoId } })
  },
}
