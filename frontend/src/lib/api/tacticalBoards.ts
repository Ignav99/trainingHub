import { api } from './client'

export interface TacticalBoard {
  id: string
  equipo_id: string
  created_by?: string
  nombre: string
  descripcion?: string
  tipo: 'static' | 'animated'
  pitch_type: 'full' | 'half'
  home_team?: any[]
  away_team?: any[]
  elements?: any[]
  arrows?: any[]
  zones?: any[]
  thumbnail_data?: string
  tags?: string[]
  frames?: TacticalBoardFrame[]
  created_at?: string
  updated_at?: string
}

export interface TacticalBoardFrame {
  id: string
  board_id: string
  orden: number
  nombre?: string
  duration_ms: number
  elements?: any[]
  arrows?: any[]
  zones?: any[]
  transition_type: 'linear' | 'ease' | 'ease-in-out'
  created_at?: string
}

export interface CreateBoardData {
  equipo_id: string
  nombre: string
  descripcion?: string
  tipo?: string
  pitch_type?: string
  home_team?: any[]
  away_team?: any[]
  elements?: any[]
  arrows?: any[]
  zones?: any[]
  thumbnail_data?: string
  tags?: string[]
}

export interface CreateFrameData {
  orden?: number
  nombre?: string
  duration_ms?: number
  elements?: any[]
  arrows?: any[]
  zones?: any[]
  transition_type?: string
}

export const tacticalBoardApi = {
  async list(equipoId: string, tipo?: string): Promise<{ data: TacticalBoard[] }> {
    return api.get<{ data: TacticalBoard[] }>('/tactical-boards', {
      params: { equipo_id: equipoId, ...(tipo ? { tipo } : {}) },
    })
  },

  async get(id: string): Promise<TacticalBoard> {
    return api.get<TacticalBoard>(`/tactical-boards/${id}`)
  },

  async create(data: CreateBoardData): Promise<TacticalBoard> {
    return api.post<TacticalBoard>('/tactical-boards', data)
  },

  async update(id: string, data: Partial<CreateBoardData>): Promise<TacticalBoard> {
    return api.put<TacticalBoard>(`/tactical-boards/${id}`, data)
  },

  async delete(id: string): Promise<void> {
    return api.delete(`/tactical-boards/${id}`)
  },

  async duplicate(id: string): Promise<TacticalBoard> {
    return api.post<TacticalBoard>(`/tactical-boards/${id}/duplicate`, {})
  },

  async addFrame(boardId: string, data: CreateFrameData): Promise<TacticalBoardFrame> {
    return api.post<TacticalBoardFrame>(`/tactical-boards/${boardId}/frames`, data)
  },

  async updateFrame(boardId: string, frameId: string, data: Partial<CreateFrameData>): Promise<TacticalBoardFrame> {
    return api.put<TacticalBoardFrame>(`/tactical-boards/${boardId}/frames/${frameId}`, data)
  },

  async deleteFrame(boardId: string, frameId: string): Promise<void> {
    return api.delete(`/tactical-boards/${boardId}/frames/${frameId}`)
  },

  async reorderFrames(boardId: string, frameIds: string[]): Promise<void> {
    return api.put(`/tactical-boards/${boardId}/frames/reorder`, { frame_ids: frameIds })
  },
}
