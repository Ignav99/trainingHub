import { api } from './client'

// ============ Types ============

export interface VideoTagCategory {
  id: string
  equipo_id: string
  nombre: string
  color: string
  shortcut_key: string | null
  fase: string | null
  default_duration_secs: number
  orden: number
  descriptors: VideoTagDescriptor[]
  created_at: string
  updated_at: string
}

export interface VideoTagDescriptor {
  id: string
  category_id: string
  nombre: string
  color: string | null
  shortcut_key: string | null
  orden: number
  created_at: string
}

export interface VideoTag {
  id: string
  video_id: string
  category_id: string
  descriptor_id: string | null
  jugador_id: string | null
  start_ms: number
  end_ms: number
  fase: string | null
  zona_campo: string | null
  nota: string | null
  drawing_data: unknown[]
  thumbnail_data: string | null
  source: 'manual' | 'ai' | 'import'
  confidence: number | null
  created_at: string
  updated_at: string
}

export interface CreateTagData {
  video_id: string
  category_id: string
  descriptor_id?: string
  jugador_id?: string
  start_ms: number
  end_ms: number
  fase?: string
  zona_campo?: string
  nota?: string
  drawing_data?: unknown[]
  thumbnail_data?: string
  source?: string
  confidence?: number
}

export interface UpdateTagData {
  category_id?: string
  descriptor_id?: string
  jugador_id?: string
  start_ms?: number
  end_ms?: number
  fase?: string
  zona_campo?: string
  nota?: string
  drawing_data?: unknown[]
  thumbnail_data?: string
}

export interface CreateCategoryData {
  equipo_id: string
  nombre: string
  color?: string
  shortcut_key?: string
  fase?: string
  default_duration_secs?: number
  orden?: number
}

export interface UpdateCategoryData {
  nombre?: string
  color?: string
  shortcut_key?: string
  fase?: string
  default_duration_secs?: number
  orden?: number
}

export interface CreateDescriptorData {
  category_id: string
  nombre: string
  color?: string
  shortcut_key?: string
  orden?: number
}

// ============ API ============

export const videoTagsApi = {
  // Categories
  async listCategories(equipoId: string): Promise<{ data: VideoTagCategory[] }> {
    return api.get<{ data: VideoTagCategory[] }>(`/video-tagging/equipos/${equipoId}/video-tag-categories`)
  },

  async createCategory(equipoId: string, data: CreateCategoryData): Promise<VideoTagCategory> {
    return api.post<VideoTagCategory>(`/video-tagging/equipos/${equipoId}/video-tag-categories`, data)
  },

  async updateCategory(categoryId: string, data: UpdateCategoryData): Promise<VideoTagCategory> {
    return api.put<VideoTagCategory>(`/video-tagging/video-tag-categories/${categoryId}`, data)
  },

  async deleteCategory(categoryId: string): Promise<void> {
    return api.delete(`/video-tagging/video-tag-categories/${categoryId}`)
  },

  async seedCategories(equipoId: string): Promise<{ data: VideoTagCategory[]; count: number }> {
    return api.post<{ data: VideoTagCategory[]; count: number }>(`/video-tagging/equipos/${equipoId}/video-tag-categories/seed`)
  },

  // Descriptors
  async createDescriptor(categoryId: string, data: CreateDescriptorData): Promise<VideoTagDescriptor> {
    return api.post<VideoTagDescriptor>(`/video-tagging/video-tag-categories/${categoryId}/descriptors`, data)
  },

  async updateDescriptor(descriptorId: string, data: Partial<CreateDescriptorData>): Promise<VideoTagDescriptor> {
    return api.put<VideoTagDescriptor>(`/video-tagging/video-tag-descriptors/${descriptorId}`, data)
  },

  async deleteDescriptor(descriptorId: string): Promise<void> {
    return api.delete(`/video-tagging/video-tag-descriptors/${descriptorId}`)
  },

  // Tags
  async listTags(
    videoId: string,
    filters?: {
      category_id?: string
      jugador_id?: string
      fase?: string
      start_ms?: number
      end_ms?: number
      source?: string
    }
  ): Promise<{ data: VideoTag[] }> {
    return api.get<{ data: VideoTag[] }>(`/video-tagging/videos/${videoId}/tags`, {
      params: filters as Record<string, string | number | boolean | undefined>,
    })
  },

  async createTag(videoId: string, data: CreateTagData): Promise<VideoTag> {
    return api.post<VideoTag>(`/video-tagging/videos/${videoId}/tags`, data)
  },

  async createTagsBulk(videoId: string, tags: CreateTagData[]): Promise<{ data: VideoTag[]; count: number }> {
    return api.post<{ data: VideoTag[]; count: number }>(`/video-tagging/videos/${videoId}/tags/bulk`, { tags })
  },

  async updateTag(tagId: string, data: UpdateTagData): Promise<VideoTag> {
    return api.put<VideoTag>(`/video-tagging/video-tags/${tagId}`, data)
  },

  async deleteTag(tagId: string): Promise<void> {
    return api.delete(`/video-tagging/video-tags/${tagId}`)
  },

  async exportCsv(videoId: string): Promise<Blob> {
    return api.getBlob(`/video-tagging/videos/${videoId}/tags/export-csv`)
  },
}
