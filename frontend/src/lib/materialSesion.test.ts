import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { codigoMaterial, codigosDeTareas, materialDeTareas, nombreMaterial } from './materialSesion.ts'

describe('materialSesion', () => {
  it('une sin duplicados y en orden de catálogo, libres al final', () => {
    const r = codigosDeTareas([['conos', 'balones'], ['Balones', 'petos'], ['Aros'], ['picas']])
    assert.deepEqual(r, ['balones', 'petos', 'conos', 'picas', 'Aros'])
  })

  it('tolera tareas sin material, null, string separado por comas', () => {
    assert.deepEqual(codigosDeTareas([undefined, null, [], '', 'gps, balones']), ['balones', 'gps'])
    assert.deepEqual(codigosDeTareas([]), [])
  })

  it('devuelve nombres legibles', () => {
    assert.deepEqual(materialDeTareas([['porterias_reducidas', 'balones'], ['vallas mini']]), [
      'Balones',
      'Porterías reducidas',
      'Vallas mini',
    ])
  })

  it('normaliza nombre del catálogo a código', () => {
    assert.equal(codigoMaterial('Porterías reducidas'), 'porterias_reducidas')
    assert.equal(nombreMaterial('gps'), 'GPS')
  })
})

describe('materialSesion · catálogo', () => {
  it('coincide con canonico.ts::MATERIALES', async () => {
    const { MATERIALES } = await import('./catalogos/canonico.ts')
    for (const m of MATERIALES) assert.equal(nombreMaterial(m.codigo), m.nombre)
    assert.deepEqual(codigosDeTareas([MATERIALES.map((m) => m.codigo).reverse()]), MATERIALES.map((m) => m.codigo))
  })
})
