import { api } from './client'
import { putToSignedUrl } from './revision'

export interface BibliotecaJugador {
  id: string
  nombre: string
  apellidos?: string | null
  dorsal?: number | null
}

export interface BibliotecaCorte {
  id: string
  equipo_id: string
  titulo: string
  descripcion?: string | null
  partido_id?: string | null
  partido_etiqueta?: string | null
  minuto_inicio?: number | null
  minuto_fin?: number | null
  fase?: string | null
  subfase?: string | null
  url?: string | null
  size_bytes?: number | null
  size_label?: string
  duration_ms?: number | null
  jugadores: BibliotecaJugador[]
}

export interface BibliotecaUso {
  count: number
  size_bytes: number
  size_label: string
  limit_bytes: null
}

/** Archivo original de un corte: `url` para leerlo, `download_url` lo guarda el navegador. */
export interface BibliotecaDescarga {
  id: string
  url: string
  download_url: string
  filename: string
  mime_type: string
  size_bytes: number
}

export interface BibliotecaFiltro {
  equipo_id: string
  q?: string
  partido_id?: string
  fase?: string
  subfase?: string
  jugador_id?: string
  minuto_desde?: number
  minuto_hasta?: number
}

export interface BibliotecaConfirm {
  equipo_id: string
  corte_id: string
  storage_path: string
  titulo: string
  descripcion?: string
  size_bytes: number
  mime_type?: string
  partido_id?: string
  partido_etiqueta?: string
  minuto_inicio?: number
  minuto_fin?: number
  fase?: string
  subfase?: string
  duration_ms?: number
  start_ms?: number
  end_ms?: number
  source_video_id?: string
  jugador_ids?: string[]
  origen?: 'video' | 'revision' | 'manual'
}

export const bibliotecaCortesApi = {
  list(filtro: BibliotecaFiltro): Promise<BibliotecaCorte[]> {
    return api.get('/biblioteca-cortes', { params: { ...filtro } })
  },

  uso(equipoId: string): Promise<BibliotecaUso> {
    return api.get('/biblioteca-cortes/uso', { params: { equipo_id: equipoId } })
  },

  async upload(file: File, meta: Omit<BibliotecaConfirm, 'corte_id' | 'storage_path' | 'size_bytes' | 'mime_type'>, onProgress?: (pct: number) => void) {
    if (file.size > 200 * 1024 * 1024) throw new Error('El recorte no puede superar 200MB')
    if (file.size < 1000) throw new Error('El archivo está vacío o es demasiado pequeño')
    const prepared = await api.post<{
      signed_url: string
      path: string
      corte_id: string
      mime_type: string
    }>('/biblioteca-cortes/upload-url', {
      equipo_id: meta.equipo_id,
      filename: file.name,
      size_bytes: file.size,
      mime_type: file.type || 'video/mp4',
    })
    await putToSignedUrl(prepared.signed_url, file, prepared.mime_type || file.type || 'video/mp4', onProgress)
    return api.post<BibliotecaCorte>('/biblioteca-cortes/confirm', {
      ...meta,
      corte_id: prepared.corte_id,
      storage_path: prepared.path,
      size_bytes: file.size,
      mime_type: prepared.mime_type || file.type || 'video/mp4',
    })
  },

  update(id: string, equipoId: string, data: Partial<BibliotecaConfirm> & { clear_partido?: boolean; jugador_ids?: string[] }) {
    return api.patch<BibliotecaCorte>(`/biblioteca-cortes/${id}`, data, { params: { equipo_id: equipoId } })
  },

  remove(id: string, equipoId: string) {
    return api.delete(`/biblioteca-cortes/${id}`, { params: { equipo_id: equipoId } })
  },

  descargas(equipoId: string, ids: string[]) {
    return api.post<BibliotecaDescarga[]>('/biblioteca-cortes/descargas', { equipo_id: equipoId, ids })
  },

  desdeRevision(equipoId: string, clipId: string) {
    return api.post<BibliotecaCorte>('/biblioteca-cortes/desde-revision', {
      equipo_id: equipoId,
      clip_id: clipId,
    })
  },

  enviarRevision(id: string, equipoId: string, body: { pack_id: string; folder_id: string; frase?: string }) {
    return api.post(`/biblioteca-cortes/${id}/enviar-revision`, body, { params: { equipo_id: equipoId } })
  },
}
