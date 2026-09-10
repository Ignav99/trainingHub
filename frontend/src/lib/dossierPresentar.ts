import {
  revisionApi,
  type RevisionAmbito,
  type RevisionSession,
} from '@/lib/api/revision'
import { attachRevisionPack, type DossierShow } from '@/lib/dossierShow'

export async function prepareDossierSala(params: {
  show: DossierShow
  equipoId?: string
  ambito: RevisionAmbito
  rivalId?: string
  microcicloId?: string
  partidoId?: string
}): Promise<{ show: DossierShow; session: RevisionSession | null }> {
  let { show } = params
  if (!params.equipoId) return { show, session: null }

  try {
    const pack = await revisionApi.getOrCreatePack({
      equipo_id: params.equipoId,
      ambito: params.ambito,
      rival_id: params.rivalId,
      microciclo_id: params.microcicloId,
      partido_id: params.partidoId,
    })
    show = attachRevisionPack(show, pack)
    try {
      const session = await revisionApi.createSession({
        equipo_id: params.equipoId,
        pack_id: pack.id,
      })
      return { show, session }
    } catch {
      return { show, session: null }
    }
  } catch {
    return { show, session: null }
  }
}
