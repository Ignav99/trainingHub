import { api } from './client'
import type { VideoTag } from './videoTags'

// ============ Types ============

export interface VideoPlaylist {
  id: string
  equipo_id: string
  nombre: string
  descripcion: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  items?: VideoPlaylistItem[]
}

export interface VideoPlaylistItem {
  id: string
  playlist_id: string
  tag_id: string
  orden: number
  created_at: string
  video_tags?: VideoTag
}

export interface CreatePlaylistData {
  equipo_id: string
  nombre: string
  descripcion?: string
}

export interface UpdatePlaylistData {
  nombre?: string
  descripcion?: string
}

// ============ API ============

export const videoPlaylistsApi = {
  async list(equipoId: string): Promise<{ data: VideoPlaylist[] }> {
    return api.get<{ data: VideoPlaylist[] }>(`/video-playlists/equipos/${equipoId}/video-playlists`)
  },

  async get(playlistId: string): Promise<VideoPlaylist> {
    return api.get<VideoPlaylist>(`/video-playlists/video-playlists/${playlistId}`)
  },

  async create(equipoId: string, data: CreatePlaylistData): Promise<VideoPlaylist> {
    return api.post<VideoPlaylist>(`/video-playlists/equipos/${equipoId}/video-playlists`, data)
  },

  async update(playlistId: string, data: UpdatePlaylistData): Promise<VideoPlaylist> {
    return api.put<VideoPlaylist>(`/video-playlists/video-playlists/${playlistId}`, data)
  },

  async delete(playlistId: string): Promise<void> {
    return api.delete(`/video-playlists/video-playlists/${playlistId}`)
  },

  async addItem(playlistId: string, tagId: string, orden: number = 0): Promise<VideoPlaylistItem> {
    return api.post<VideoPlaylistItem>(`/video-playlists/video-playlists/${playlistId}/items`, {
      tag_id: tagId,
      orden,
    })
  },

  async removeItem(itemId: string): Promise<void> {
    return api.delete(`/video-playlists/video-playlist-items/${itemId}`)
  },

  async reorderItems(playlistId: string, items: { id: string; orden: number }[]): Promise<void> {
    await api.put(`/video-playlists/video-playlists/${playlistId}/reorder`, items)
  },
}
