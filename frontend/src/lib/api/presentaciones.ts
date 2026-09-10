import { api } from './client'
import { useClubStore } from '@/stores/clubStore'
import { informeRivalPdfFilename, planPdfFilename } from '@/lib/pdf/planPartidoPdfLayout'

export type PresentacionTipo = 'informe' | 'plan'

export interface PresentacionMeta {
  rival_nombre?: string
  club_nombre?: string
  fecha?: string
  hora?: string
  campo?: string
  localia?: string
  tramo?: string
  color_primario?: string
  club_logo_url?: string
  rival_escudo_url?: string
}

export const presentacionesApi = {
  export(tipo: PresentacionTipo, data: Record<string, unknown>, meta: PresentacionMeta): Promise<Blob> {
    return api.postBlob(
      '/presentaciones/export',
      { tipo, data, meta },
      { timeout: 90000 }
    )
  },
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function stripNode(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripNode)
  if (!value || typeof value !== 'object') return value
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (k === 'pizarra_diagrama' || k === 'pizarra_tactica' || k === 'clips') continue
    out[k] = stripNode(v)
  }
  return out
}

export async function exportPresentacionDossier(
  tipo: PresentacionTipo,
  data: object,
  metaInput?: PresentacionMeta
) {
  const club = useClubStore.getState()
  const meta: PresentacionMeta = {
    club_nombre: metaInput?.club_nombre || club.organizacion?.nombre || undefined,
    club_logo_url: metaInput?.club_logo_url || club.theme.logoUrl || club.organizacion?.logo_url,
    color_primario: metaInput?.color_primario || club.theme.colorPrimario || club.organizacion?.color_primario,
    rival_nombre: metaInput?.rival_nombre,
    rival_escudo_url: metaInput?.rival_escudo_url,
    fecha: metaInput?.fecha,
    hora: metaInput?.hora,
    campo: metaInput?.campo,
    localia: metaInput?.localia,
    tramo: metaInput?.tramo,
  }
  const blob = await presentacionesApi.export(tipo, stripNode(data) as Record<string, unknown>, meta)
  const stem =
    tipo === 'plan'
      ? planPdfFilename(meta.rival_nombre, meta.fecha, meta.tramo).replace(/\.pdf$/, '')
      : informeRivalPdfFilename(meta.rival_nombre).replace(/\.pdf$/, '')
  downloadBlob(blob, `${stem}.pptx`)
}
