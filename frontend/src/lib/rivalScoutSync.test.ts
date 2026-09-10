import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { RivalScoutData } from '@/types'
import {
  upsertRivalJugador,
  renameRivalJugador,
  removeRivalJugador,
  assignRivalSlot,
  mergeOnceProbableAnnotations,
  emptyJugadorEvaluacion,
  extractPersistentScout,
  mergeScoutOnLoad,
} from './rivalScoutSync.ts'

describe('manual once probable', () => {
  it('upserts a typed player without actas', () => {
    const once = upsertRivalJugador(undefined, 'García, Pedro', { dorsal: 10 })
    assert.equal(once.actas_analizadas, 0)
    assert.equal(once.jugadores.length, 1)
    assert.equal(once.jugadores[0].nombre, 'García, Pedro')
    assert.equal(once.jugadores[0].dorsal, 10)
  })

  it('places a player on a slot and moves them if reassigned', () => {
    const once = assignRivalSlot(undefined, 'GK', 'Portero Uno')
    assert.equal(once.colocacion.GK, 'Portero Uno')
    const moved = assignRivalSlot(once, 'ST', 'Portero Uno')
    assert.equal(moved.colocacion.ST, 'Portero Uno')
    assert.equal(moved.colocacion.GK, undefined)
    assert.equal(moved.jugadores.length, 1)
  })

  it('clears a slot without deleting the player', () => {
    const placed = assignRivalSlot(undefined, 'GK', 'Portero Uno')
    const cleared = assignRivalSlot(placed, 'GK', null)
    assert.equal(cleared.colocacion.GK, undefined)
    assert.equal(cleared.jugadores[0].nombre, 'Portero Uno')
  })

  it('renames a player and updates colocacion', () => {
    const once = assignRivalSlot(undefined, 'ST', 'Delantero')
    const renamed = renameRivalJugador(once, 'Delantero', 'Delantero Nuevo')
    assert.equal(renamed.jugadores[0].nombre, 'Delantero Nuevo')
    assert.equal(renamed.colocacion.ST, 'Delantero Nuevo')
  })

  it('removes a player from the list and the pitch', () => {
    const once = assignRivalSlot(undefined, 'ST', 'Delantero')
    const removed = removeRivalJugador(once, 'Delantero')
    assert.equal(removed.jugadores.length, 0)
    assert.deepEqual(removed.colocacion, {})
  })

  it('keeps hand-entered players when merging actas', () => {
    const saved = [
      emptyJugadorEvaluacion({ nombre: 'Manual, Juan', dorsal: 7, comentario: 'rápido' }),
      emptyJugadorEvaluacion({ nombre: 'Acta, Luis', comentario: 'líder' }),
    ]
    const fresh = [emptyJugadorEvaluacion({ nombre: 'Acta, Luis', dorsal: 9, apariciones: 4 })]
    const merged = mergeOnceProbableAnnotations(fresh, saved, { ST: 'Manual, Juan' }, 3)
    assert.equal(merged.actas_analizadas, 3)
    assert.equal(merged.jugadores.length, 2)
    const acta = merged.jugadores.find((j) => j.nombre === 'Acta, Luis')
    const manual = merged.jugadores.find((j) => j.nombre === 'Manual, Juan')
    assert.equal(acta?.comentario, 'líder')
    assert.equal(acta?.apariciones, 4)
    assert.equal(manual?.dorsal, 7)
    assert.equal(merged.colocacion.ST, 'Manual, Juan')
  })
})

describe('Comentarios Rival persist on the rival profile', () => {
  const scout: Partial<RivalScoutData> = {
    fases: [
      {
        fase: 'ataque_organizado',
        fortalezas: [],
        debilidades: [],
        clips: [],
      },
    ],
    estrategia: {
      sistema: '4-3-3',
      notas: 'Presionan en bloque alto. Laterales se incorporan.',
      dimensiones_campo: '105x68',
      actitud_estilo: 'Directo',
      once_probable: {
        actas_analizadas: 0,
        jugadores: [emptyJugadorEvaluacion({ nombre: 'Porter' })],
        colocacion: { GK: 'Porter' },
      },
    },
  }

  it('extractPersistentScout keeps Comentarios Rival, not only fases and once', () => {
    const persistent = extractPersistentScout(scout)
    assert.equal(persistent.estrategia?.notas, 'Presionan en bloque alto. Laterales se incorporan.')
    assert.equal(persistent.estrategia?.dimensiones_campo, '105x68')
    assert.equal(persistent.estrategia?.actitud_estilo, 'Directo')
    assert.equal(persistent.estrategia?.sistema, '4-3-3')
    assert.equal(persistent.estrategia?.once_probable?.colocacion?.GK, 'Porter')
  })

  it('mergeScoutOnLoad does not let empty weekly notes wipe the coach comments', () => {
    const persistent = extractPersistentScout(scout)
    const merged = mergeScoutOnLoad(persistent, {
      estrategia: { notas: '', dimensiones_campo: '', actitud_estilo: '' },
    })
    assert.equal(merged.estrategia?.notas, 'Presionan en bloque alto. Laterales se incorporan.')
    assert.equal(merged.estrategia?.dimensiones_campo, '105x68')
    assert.equal(merged.estrategia?.actitud_estilo, 'Directo')
  })

  it('mergeScoutOnLoad recovers comments from the microciclo if the profile is still empty', () => {
    const merged = mergeScoutOnLoad(
      { fases: [], estrategia: { sistema: '4-3-3' } },
      { estrategia: { notas: 'Olfato histórico en el microciclo' } }
    )
    assert.equal(merged.estrategia?.notas, 'Olfato histórico en el microciclo')
  })

  it('keeps an explicit empty profile comment instead of restoring weekly notes', () => {
    const merged = mergeScoutOnLoad(
      { estrategia: { notas: '' } },
      { estrategia: { notas: 'Notas viejas del microciclo' } }
    )
    assert.equal(merged.estrategia?.notas, '')
  })
})
