import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  autoIncludeInSesionAsistencia,
  sortRpeRoster,
  splitSesionAsistenciaRoster,
} from './jugadorTipo.ts'

describe('sesion asistencia roster', () => {
  it('auto-includes plantilla only', () => {
    assert.equal(autoIncludeInSesionAsistencia({ tipo_jugador: 'plantilla' }), true)
    assert.equal(autoIncludeInSesionAsistencia({ tipo_jugador: 'juvenil' }), false)
    assert.equal(autoIncludeInSesionAsistencia({ tipo_jugador: 'prueba' }), false)
    assert.equal(autoIncludeInSesionAsistencia({ es_invitado: true }), false)
  })

  it('keeps filial available to add until explicitly opted in', () => {
    const plantilla = { id: 'p1', tipo_jugador: 'plantilla' as const, es_invitado: false }
    const filial = { id: 'f1', tipo_jugador: 'juvenil' as const, es_invitado: false }
    const empty = splitSesionAsistenciaRoster([plantilla, filial], new Set())
    assert.deepEqual(empty.inSession.map((j) => j.id), ['p1'])
    assert.deepEqual(empty.filialDisponibles.map((j) => j.id), ['f1'])

    const added = splitSesionAsistenciaRoster([plantilla, filial], new Set(['f1']))
    assert.deepEqual(added.inSession.map((j) => j.id), ['p1', 'f1'])
    assert.equal(added.filialDisponibles.length, 0)
  })
})

describe('rpe roster order', () => {
  it('sorts plantilla by dorsal and puts filial/externos last', () => {
    const ordered = sortRpeRoster([
      { nombre: 'Filial', apellidos: 'Diez', dorsal: 2, tipo_jugador: 'juvenil' as const },
      { nombre: 'Invitado', apellidos: 'Once', dorsal: 11, tipo_jugador: 'invitado' as const, es_invitado: true },
      { nombre: 'Beto', apellidos: 'Baja', dorsal: 9, tipo_jugador: 'plantilla' as const },
      { nombre: 'Ana', apellidos: 'Alta', dorsal: 4, tipo_jugador: 'plantilla' as const },
      { nombre: 'Cero', apellidos: 'Sin', dorsal: null, tipo_jugador: 'plantilla' as const },
      { nombre: 'Prueba', apellidos: 'Ocho', dorsal: 8, tipo_jugador: 'prueba' as const },
    ])
    assert.deepEqual(ordered.map((p) => p.nombre), ['Ana', 'Beto', 'Cero', 'Filial', 'Prueba', 'Invitado'])
  })
})
