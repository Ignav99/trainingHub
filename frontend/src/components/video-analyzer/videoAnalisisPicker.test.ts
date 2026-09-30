import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  canLoadMatchVideo,
  groupPartidosByMonth,
  localiaLabel,
  revisionLinkForMode,
  matchArchiveLabel,
  watchedMatchNote,
  watchModeLabel,
} from './videoAnalisisPicker.ts'

describe('video analisis picker', () => {
  it('groups matches by month, newest first, with home/away labels', () => {
    const groups = groupPartidosByMonth([
      { id: '1', fecha: '2026-09-20', localia: 'local', jornada: 4 },
      { id: '2', fecha: '2026-08-02', localia: 'visitante', jornada: 1 },
      { id: '3', fecha: '2026-09-07', localia: 'visitante', jornada: 3 },
    ])
    assert.equal(groups[0].key, '2026-09')
    assert.deepEqual(groups[0].partidos.map((p) => p.id), ['1', '3'])
    assert.equal(groups[1].key, '2026-08')
    assert.equal(localiaLabel('local'), 'Casa · ida')
    assert.equal(localiaLabel('visitante'), 'Fuera · vuelta')
  })

  it('keeps rival footage out of our match review and labels the other opponent', () => {
    assert.equal(watchModeLabel('revision'), 'Revisión del partido')
    assert.equal(watchModeLabel('informe_rival'), 'Informe del rival')
    assert.deepEqual(revisionLinkForMode('revision'), { lockAmbito: null, attachUpcomingMatch: true })
    assert.deepEqual(revisionLinkForMode('informe_rival'), { lockAmbito: 'rival', attachUpcomingMatch: false })
    assert.equal(watchedMatchNote('  Herrera '), 'vs Herrera')
    assert.equal(watchedMatchNote('vs Estrella'), 'vs Estrella')
    assert.equal(watchedMatchNote('   '), undefined)
    assert.equal(canLoadMatchVideo(null, 'Herrera'), false)
    assert.equal(canLoadMatchVideo('revision', ''), true)
    assert.equal(canLoadMatchVideo('informe_rival', ''), false)
    assert.equal(canLoadMatchVideo('informe_rival', 'Herrera'), true)
  })

  it('names the clip archive after the match and lets a loose file keep its name', () => {
    assert.equal(matchArchiveLabel({
      clubName: 'Motilla',
      rivalName: 'Herrera',
      localia: 'local',
      fecha: '2026-09-20',
      watchMode: 'revision',
      fileName: 'partido.mp4',
    }), 'Motilla vs Herrera 20 sep')
    assert.equal(matchArchiveLabel({
      clubName: 'Motilla',
      rivalName: 'Herrera',
      localia: 'visitante',
      fecha: '2026-10-04T18:00:00',
      watchMode: 'revision',
    }), 'Herrera vs Motilla 4 oct')
    assert.equal(matchArchiveLabel({
      rivalName: 'Herrera',
      fecha: '2026-09-20',
      watchMode: 'informe_rival',
      watchedOpponent: 'vs Estrella',
    }), 'Herrera vs Estrella 20 sep')
    assert.equal(matchArchiveLabel({ fileName: 'rondos.mp4' }), 'rondos')
  })
})
