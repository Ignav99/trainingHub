import { api } from './client'

export type RevisionAmbito = 'partido_post' | 'rival' | 'partido_plan'
export type RevisionClipStatus = 'hot' | 'en_drive' | 'missing'

export const REVISION_FOLDER_PRESETS: Record<RevisionAmbito, { fase: string; nombre: string }[]> = {
  partido_post: [
    { fase: 'ataque_organizado', nombre: 'Ataque organizado' },
    { fase: 'defensa_organizada', nombre: 'Defensa organizada' },
    { fase: 'transicion_defensa_ataque', nombre: 'Transición defensa → ataque' },
    { fase: 'transicion_ataque_defensa', nombre: 'Transición ataque → defensa' },
    { fase: 'balon_parado_ofensivo', nombre: 'ABP ofensivo' },
    { fase: 'balon_parado_defensivo', nombre: 'ABP defensivo' },
  ],
  rival: [
    { fase: 'ataque_organizado', nombre: 'Ataque organizado' },
    { fase: 'defensa_organizada', nombre: 'Defensa organizada' },
    { fase: 'transicion_ofensiva', nombre: 'Transición ofensiva' },
    { fase: 'transicion_defensiva', nombre: 'Transición defensiva' },
    { fase: 'abp_ofensiva', nombre: 'ABP ofensiva' },
    { fase: 'abp_defensiva', nombre: 'ABP defensiva' },
    { fase: 'once_probable', nombre: 'Once probable' },
  ],
  partido_plan: [
    { fase: 'ataque_organizado', nombre: 'Ataque organizado' },
    { fase: 'defensa_organizada', nombre: 'Defensa organizada' },
    { fase: 'transicion_ofensiva', nombre: 'Transición ofensiva' },
    { fase: 'transicion_defensiva', nombre: 'Transición defensiva' },
    { fase: 'abp_ofensiva', nombre: 'ABP ofensiva' },
    { fase: 'abp_defensiva', nombre: 'ABP defensiva' },
  ],
}

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

export interface RevisionClipUploadMeta {
  pack_id: string
  equipo_id: string
  titulo: string
  frase?: string
  folder_id?: string
  fase?: string
  duration_ms?: number
  start_ms?: number
  end_ms?: number
  source_video_id?: string
  rival_jugador_nombre?: string
  rival_jugador_dorsal?: string
  jugador_id?: string
  slot_tipo?: 'folder' | 'once_jugador'
  mime_type?: string
}

async function putToSignedUrl(signedUrl: string, file: File, mime: string) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 300000)
  try {
    const headers: Record<string, string> = {
      'Content-Type': mime,
      'x-upsert': 'true',
    }
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (anon) {
      headers.apikey = anon
      headers.Authorization = `Bearer ${anon}`
    }
    const res = await fetch(signedUrl, {
      method: 'PUT',
      headers,
      body: file,
      signal: controller.signal,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(storageUploadMessage(res.status, text))
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error('La subida tardó demasiado. Prueba un recorte más corto.')
    }
    if (e instanceof TypeError) {
      throw new Error('No se pudo enviar el recorte a Storage. Revisa la conexión e inténtalo de nuevo.')
    }
    throw e
  } finally {
    window.clearTimeout(timer)
  }
}

function storageUploadMessage(status: number, text: string): string {
  const raw = (text || '').trim()
  try {
    const parsed = JSON.parse(raw) as { code?: string; error?: string; message?: string }
    const code = String(parsed.code || '')
    const err = String(parsed.error || '')
    if (
      status === 413
      || code === 'EntityTooLarge'
      || /payload too large/i.test(err)
      || /exceeded the maximum allowed size/i.test(String(parsed.message || ''))
    ) {
      return 'El recorte supera el límite de Storage (máximo 200MB). Recorta más corto e inténtalo de nuevo.'
    }
  } catch {
    if (status === 413 || /EntityTooLarge|Payload too large/i.test(raw)) {
      return 'El recorte supera el límite de Storage (máximo 200MB). Recorta más corto e inténtalo de nuevo.'
    }
  }
  return raw || `No se pudo subir el archivo (${status})`
}

export const revisionApi = {
  getOrCreatePack(data: {
    equipo_id: string
    ambito: RevisionAmbito
    partido_id?: string
    rival_id?: string
    microciclo_id?: string
  }): Promise<RevisionPack> {
    return api.post('/revision/packs', data, { timeout: 15000 })
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

  async uploadClip(file: File, meta: RevisionClipUploadMeta): Promise<RevisionClip> {
    if (file.size > 200 * 1024 * 1024) {
      throw new Error('El recorte no puede superar 200MB')
    }
    if (file.size < 1000) {
      throw new Error('El archivo está vacío o es demasiado pequeño')
    }

    const prepared = await api.post<{
      signed_url: string
      token: string
      path: string
      mime_type: string
    }>('/revision/clips/upload-url', {
      pack_id: meta.pack_id,
      equipo_id: meta.equipo_id,
      filename: file.name,
      size_bytes: file.size,
      mime_type: file.type || meta.mime_type,
    })

    await putToSignedUrl(prepared.signed_url, file, prepared.mime_type || file.type || 'video/webm')

    return api.post('/revision/clips/confirm', {
      pack_id: meta.pack_id,
      equipo_id: meta.equipo_id,
      storage_path: prepared.path,
      titulo: meta.titulo,
      size_bytes: file.size,
      mime_type: prepared.mime_type || file.type || 'video/webm',
      frase: meta.frase,
      folder_id: meta.folder_id,
      fase: meta.fase,
      duration_ms: meta.duration_ms,
      start_ms: meta.start_ms,
      end_ms: meta.end_ms,
      source_video_id: meta.source_video_id,
      rival_jugador_nombre: meta.rival_jugador_nombre,
      rival_jugador_dorsal: meta.rival_jugador_dorsal,
      jugador_id: meta.jugador_id,
      slot_tipo: meta.slot_tipo || 'folder',
    })
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
