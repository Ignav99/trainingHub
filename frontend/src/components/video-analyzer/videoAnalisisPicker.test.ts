import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  canLoadMatchVideo,
  groupPartidosByMonth,
  localiaLabel,
  resumeWatchChoice,
  revisionLinkForMode,
  matchArchiveLabel,
  partidosCercanos,
  videoTrabajoBadge,
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

  it('shows the two matches before today and the two after, the rest goes to the list', () => {
    const p = (id: string, fecha: string) => ({ id, fecha, localia: 'local' })
    const todos = [
      p('a', '2026-09-01'), p('b', '2026-09-14'), p('c', '2026-10-01'), p('d', '2026-10-20'),
      p('e', '2026-11-05T18:00:00'), p('f', '2026-11-15'), p('g', '2026-11-29'), p('h', '2026-12-10'),
    ]
    const r = partidosCercanos(todos, '2026-11-05')
    assert.deepEqual(r.anteriores.map((x) => x.id), ['c', 'd'])
    assert.deepEqual(r.siguientes.map((x) => x.id), ['e', 'f'])
    assert.deepEqual(r.resto.map((x) => x.id).sort(), ['a', 'b', 'g', 'h'])

    const finTemporada = partidosCercanos(todos, '2027-01-01')
    assert.deepEqual(finTemporada.anteriores.map((x) => x.id), ['e', 'f', 'g', 'h'])
    assert.deepEqual(finTemporada.siguientes, [])

    const inicio = partidosCercanos(todos, '2026-09-10')
    assert.deepEqual(inicio.anteriores.map((x) => x.id), ['a'])
    assert.deepEqual(inicio.siguientes.map((x) => x.id), ['b', 'c', 'd'])
  })

  it('keeps rival footage out of our match review and labels the other opponent', () => {
    assert.equal(watchModeLabel('revision'), 'Revisión del partido')
    assert.equal(watchModeLabel('informe_rival'), 'Informe del rival')
    assert.deepEqual(revisionLinkForMode('revision'), { attachUpcomingMatch: true })
    assert.deepEqual(revisionLinkForMode('informe_rival'), { attachUpcomingMatch: false })
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

  it('reopens a worked match as the same task, even if the file is loaded again', () => {
    assert.deepEqual(resumeWatchChoice(null), { mode: null, opponent: '' })
    assert.deepEqual(resumeWatchChoice({ partido_id: 'p1', modo: 'revision' }), {
      mode: 'revision',
      opponent: '',
    })
    assert.deepEqual(resumeWatchChoice({
      partido_id: 'p1',
      modo: 'informe_rival',
      rival_visto: 'vs Herrera',
    }), { mode: 'informe_rival', opponent: 'Herrera' })
    assert.equal(videoTrabajoBadge({ partido_id: 'p1', modo: 'revision' }), 'Retomar revisión')
    assert.equal(videoTrabajoBadge({
      partido_id: 'p1',
      modo: 'informe_rival',
      rival_visto: 'Herrera',
    }), 'Retomar · vs Herrera')
  })
})
