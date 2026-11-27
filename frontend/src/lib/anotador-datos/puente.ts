/**
 * Puente con el motor del anotador (`lib/anotador.ts`): traduce el snapshot a lo que
 * espera cada endpoint. Es la lógica de `persist()` de AnotadorApp, partida en piezas.
 * No se importa desde los tests de node (anotador.ts no es cargable sin bundler).
 */
import {
  EXTRA_SLOT_PREFIX,
  emptyTeamStats,
  formacionSlotsForAnotadorSave,
  golesPorPeriodoFromEvents,
  hasAnotadorLiveData,
  informeFromSnapshot,
  mergeNotasPre,
  parseNotasPre,
  statsPeriodosPayload,
} from '../anotador'
import type { Puente } from './sincronizar.ts'

export const puenteAnotador: Puente = {
  anotadorDeNotas: (notas) => parseNotasPre(notas).anotador,

  notasPre: (existente, snapshot) => mergeNotasPre(existente, snapshot),

  titulares(existente, snap, convocados, escritos) {
    const xi = formacionSlotsForAnotadorSave(existente, snap)
    const asignados = new Map<string, string | null>()
    for (const [slotId, convId] of Object.entries(xi)) {
      if (convId) asignados.set(convId, slotId.startsWith(EXTRA_SLOT_PREFIX) ? null : slotId)
    }
    if (asignados.size === 0) return []
    return convocados.flatMap((c) => {
      const titular = asignados.has(c.id)
      const pos = asignados.get(c.id) ?? null
      const prev = escritos[c.id] ?? { titular: Boolean(c.titular), pos: c.posicion_asignada ?? null }
      if (prev.titular === titular && (!titular || pos == null || prev.pos === pos)) return []
      return [titular && pos ? { id: c.id, titular, posicion_asignada: pos } : { id: c.id, titular }]
    })
  },

  hayDatos: (snap, reflexion) => hasAnotadorLiveData(snap) || Boolean(reflexion.trim()),

  informe(snap, reflexion, convIds, nameOf) {
    const f = informeFromSnapshot(snap, convIds, nameOf)
    const payload: Record<string, unknown> = {
      goles_detalle_favor: f.goles.favor,
      goles_detalle_contra: f.goles.contra,
      faltas_mapa_cometidas: f.foulMap.cometidas,
      faltas_mapa_recibidas: f.foulMap.recibidas,
      reflexion_entrenador: reflexion,
      goles_por_periodo: golesPorPeriodoFromEvents(f.snap.events),
      ...emptyTeamStats(),
      ...f.teamStats,
    }
    return {
      score: f.score,
      playerRows: f.playerRows as unknown as Record<string, Record<string, unknown>>,
      payload,
      payloadPeriodos: { ...payload, stats_periodos: statsPeriodosPayload(f.snap) },
    }
  },
}
