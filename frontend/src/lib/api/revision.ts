import { api } from './client'

export type RevisionAmbito = 'partido_post' | 'rival' | 'partido_plan'
export type RevisionClipStatus = 'hot' | 'en_drive' | 'missing'

export interface RevisionFolder {
  id: string
  pack_id: string
  parent_id?: string | null
  nombre: string
  fase?: string | null
  orden: number
}

export interface RevisionClip {
  id: string
  pack_id: string
  equipo_id: string
  titulo: string
  frase?: string | null
  nota?: string | null
  url?: string | null
  storage_path?: string | null
  mime_type?: string | null
  size_bytes?: number | null
  duration_ms?: number | null
  fase?: string | null
  jugador_id?: string | null
  rival_jugador_nombre?: string | null
  rival_jugador_dorsal?: string | null
  hot_until?: string
  drive_file_id?: string | null
  drive_path?: string | null
  status: RevisionClipStatus
  archive_warning?: string | null
  created_at: string
}

export interface RevisionClipLink {
  id: string
  clip_id: string
  folder_id?: string | null
  slot_tipo: 'folder' | 'once_jugador'
  jugador_id?: string | null
  rival_jugador_nombre?: string | null
  rival_jugador_dorsal?: string | null
}

export interface RevisionPack {
  id: string
  equipo_id: string
  ambito: RevisionAmbito
  partido_id?: string | null
  rival_id?: string | null
  microciclo_id?: string | null
  folders: RevisionFolder[]
  clips: RevisionClip[]
  links: RevisionClipLink[]
}

export interface RevisionSession {
  id: string
  equipo_id: string
  pack_id: string
  code: string
  host_user_id?: string | null
  current_clip_id?: string | null
  current_time_ms: number
  paused: boolean
  overlay_json: unknown[]
  pack?: RevisionPack
  current_clip?: RevisionClip | null
}

export const revisionApi = {
  getOrCreatePack(data: {
    equipo_id: string
    ambito: RevisionAmbito
    partido_id?: string
    rival_id?: string
    microciclo_id?: string
  }): Promise<RevisionPack> {
    return api.post('/revision/packs', data)
  },

  getPack(packId: string, equipoId: string): Promise<RevisionPack> {
    return api.get(`/revision/packs/${packId}`, { params: { equipo_id: equipoId } })
  },

  createFolder(data: {
    pack_id: string
    nombre: string
    parent_id?: string
    fase?: string
  }): Promise<RevisionFolder> {
    return api.post('/revision/folders', data)
  },

  updateFolder(id: string, data: { nombre?: string; parent_id?: string | null; orden?: number }): Promise<RevisionFolder> {
    return api.patch(`/revision/folders/${id}`, data)
  },

  deleteFolder(id: string): Promise<void> {
    return api.delete(`/revision/folders/${id}`)
  },

  uploadClip(formData: FormData): Promise<RevisionClip> {
    return api.upload('/revision/clips/upload', formData, { timeout: 300000 })
  },

  updateClip(id: string, data: Partial<Pick<RevisionClip, 'titulo' | 'frase' | 'nota' | 'fase'>>): Promise<RevisionClip> {
    return api.patch(`/revision/clips/${id}`, data)
  },

  deleteClip(id: string): Promise<void> {
    return api.delete(`/revision/clips/${id}`)
  },

  addLink(clipId: string, data: {
    folder_id?: string
    slot_tipo?: 'folder' | 'once_jugador'
    jugador_id?: string
    rival_jugador_nombre?: string
    rival_jugador_dorsal?: string
  }): Promise<RevisionClipLink> {
    return api.post(`/revision/clips/${clipId}/links`, data)
  },

  deleteLink(linkId: string): Promise<void> {
    return api.delete(`/revision/clip-links/${linkId}`)
  },

  createSession(data: { equipo_id: string; pack_id: string; clip_id?: string }): Promise<RevisionSession> {
    return api.post('/revision/sessions', data)
  },

  getSession(code: string): Promise<RevisionSession> {
    return api.get(`/revision/sessions/by-code/${code}`)
  },

  updateSession(code: string, data: {
    current_clip_id?: string
    current_time_ms?: number
    paused?: boolean
    overlay_json?: unknown[]
  }): Promise<RevisionSession> {
    return api.patch(`/revision/sessions/${code}`, data)
  },
}
