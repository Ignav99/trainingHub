import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { uniqueFileNames, zipNameForToday } from './bibliotecaDescarga.ts'

describe('descarga de la biblioteca', () => {
  it('no repite nombres dentro del ZIP', () => {
    assert.deepEqual(
      uniqueFileNames(["12' Salida.mp4", "12' Salida.mp4", "12' salida.mp4", 'Otro.webm']),
      ["12' Salida.mp4", "12' Salida (2).mp4", "12' salida (3).mp4", 'Otro.webm'],
    )
  })

  it('el ZIP lleva la fecha del día', () => {
    assert.equal(zipNameForToday(new Date(2026, 9, 29)), 'cortes-2026-10-29.zip')
  })
})
