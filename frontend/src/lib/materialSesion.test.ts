import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  codigoMaterial,
  codigosDeTareas,
  entradaMaterial,
  materialDeTareas,
  nombreMaterial,
  parseEntrada,
} from './materialSesion.ts'

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

describe('materialSesion · petos con cantidad', () => {
  it('parsea petos:N y el legado "petos"', () => {
    assert.deepEqual(parseEntrada('petos:12'), { codigo: 'petos', cantidad: 12 })
    assert.deepEqual(parseEntrada('Petos: 8'), { codigo: 'petos', cantidad: 8 })
    assert.deepEqual(parseEntrada('petos'), { codigo: 'petos' })
    assert.deepEqual(parseEntrada('petos:0'), { codigo: 'petos' })
    assert.deepEqual(parseEntrada('conos:5'), { codigo: 'conos:5' })
  })

  it('serializa solo petos con cantidad', () => {
    assert.equal(entradaMaterial('petos', 12), 'petos:12')
    assert.equal(entradaMaterial('petos'), 'petos')
    assert.equal(entradaMaterial('conos', 5), 'conos')
  })

  it('agrega petos por máximo (no suma) y muestra "Petos ~12"', () => {
    assert.deepEqual(materialDeTareas([['balones', 'petos:8'], ['petos:12', 'conos'], ['petos']]), [
      'Balones',
      'Petos ~12',
      'Conos',
    ])
    assert.equal(nombreMaterial('petos:12'), 'Petos ~12')
    assert.equal(nombreMaterial('petos'), 'Petos')
  })

  it('los códigos guardados en la sesión no llevan cantidad', () => {
    assert.deepEqual(codigosDeTareas([['petos:12', 'balones'], ['petos:8']]), ['balones', 'petos'])
  })
})
