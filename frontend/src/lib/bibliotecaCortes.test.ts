import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { catalogFase, etiquetaGrupos, guessFaseFromLabel, etiquetaKey, faseForEtiqueta, faseLabel, formatStorageBytes, inicioMarca, labelsForLibraryClip, minuteLabel, playlistFromIds, splitFase } from './bibliotecaCortes.ts'

describe('biblioteca de cortes', () => {
  it('etiqueta el espacio ocupado en español', () => {
    assert.equal(formatStorageBytes(0), '0 B')
    assert.equal(formatStorageBytes(1536), '1,5 KB')
    assert.equal(formatStorageBytes(5 * 1024 * 1024), '5,0 MB')
  })

  it('escribe el rango de minutos del corte', () => {
    assert.equal(minuteLabel(12, 18), "12'–18'")
    assert.equal(minuteLabel(12, 12), "12'")
    assert.equal(minuteLabel(null, null), '')
  })

  it('separa la subfase del recorte y deja la fase tal cual', () => {
    assert.deepEqual(splitFase('creacion'), { fase: 'ataque_organizado', subfase: 'creacion' })
    assert.deepEqual(splitFase('ataque_organizado'), { fase: 'ataque_organizado' })
    assert.equal(faseLabel('transicion_ofensiva'), 'Transición ofensiva')
  })

  it('en un lote cada recorte conserva su fase y no hereda la del primero', () => {
    const shared = { fase: 'ataque_organizado', subfase: '' }
    assert.deepEqual(
      labelsForLibraryClip(true, shared, { fase: 'defensa_organizada' }),
      { fase: 'defensa_organizada', subfase: undefined },
    )
    assert.deepEqual(
      labelsForLibraryClip(true, shared, { fase: 'creacion' }),
      { fase: 'ataque_organizado', subfase: 'creacion' },
    )
    assert.deepEqual(
      labelsForLibraryClip(false, { fase: 'abp_ofensiva' }, { fase: 'defensa_organizada' }),
      { fase: 'balon_parado_ofensivo', subfase: undefined },
    )
  })

  it('reproduce la selección en el orden marcado y nombra el inicio de cada corte', () => {
    const rows = [
      { id: 'a', titulo: 'Presión' },
      { id: 'b', titulo: 'Salida' },
      { id: 'c', titulo: 'Centro' },
    ]
    assert.deepEqual(
      playlistFromIds(rows, ['c', 'a']).map((row) => row.id),
      ['c', 'a'],
    )
    assert.equal(inicioMarca(0, 2, 'Centro'), 'Inicio · 1 de 2 · Centro')
    assert.equal(inicioMarca(1, 2, '  '), 'Inicio · 2 de 2 · Corte')
  })
  it('los códigos de la botonera pasan a los del catálogo de la biblioteca', () => {
    assert.equal(catalogFase('abp_defensiva'), 'balon_parado_defensivo')
    assert.equal(catalogFase('transicion_ofensiva'), 'transicion_defensa_ataque')
    assert.equal(catalogFase('ataque_organizado'), 'ataque_organizado')
    assert.deepEqual(splitFase('abp_ofensiva'), { fase: 'balon_parado_ofensivo' })
  })

  it('agrupa los recortes por etiqueta y recuerda la fase asociada', () => {
    const clips = [
      { title: 'Inicio 1', etiqueta: 'Inicio', startTime: 0, endTime: 5 },
      { title: 'Inicio 2', etiqueta: 'inicio ', startTime: 10, endTime: 15 },
      { title: 'Córner', etiqueta: 'Córner', fase: 'abp_ofensiva', startTime: 20, endTime: 25 },
      { title: 'Presión', etiqueta: 'Presión', fase: 'defensa_organizada', startTime: 30, endTime: 35 },
    ]
    const saved = { [etiquetaKey('Inicio')]: { fase: 'ataque_organizado', subfase: 'creacion' } }
    const grupos = etiquetaGrupos(clips, saved)
    assert.deepEqual(grupos.map((g) => [g.label, g.count, g.fase, g.subfase]), [
      ['Inicio', 2, 'ataque_organizado', 'creacion'],
      ['Córner', 1, 'balon_parado_ofensivo', undefined],
      ['Presión', 1, 'defensa_organizada', undefined],
    ])
    assert.equal(etiquetaKey('  Presión  Alta '), 'presion alta')
    const mapping = Object.fromEntries(grupos.map((g) => [g.key, { fase: g.fase, subfase: g.subfase }]))
    assert.deepEqual(faseForEtiqueta(mapping, 'INICIO'), { fase: 'ataque_organizado', subfase: 'creacion' })
    assert.deepEqual(
      labelsForLibraryClip(true, {}, faseForEtiqueta(mapping, 'Córner')),
      { fase: 'balon_parado_ofensivo', subfase: undefined },
    )
    assert.deepEqual(faseForEtiqueta(mapping, 'Otra'), {})
  })
  it('adivina la subfase por el nombre y solo se queda en fase en transiciones y ABP', () => {
    const cases: [string, Record<string, string>][] = [
      ['Inicios', { fase: 'ataque_organizado', subfase: 'creacion' }],
      ['Salida de balón', { fase: 'ataque_organizado', subfase: 'creacion' }],
      ['Progresiones', { fase: 'ataque_organizado', subfase: 'progresion' }],
      ['Finalización', { fase: 'ataque_organizado', subfase: 'finalizacion' }],
      ['Bloque alto', { fase: 'defensa_organizada', subfase: 'bloque_alto' }],
      ['Bloque medio', { fase: 'defensa_organizada', subfase: 'bloque_medio' }],
      ['Bloque bajo', { fase: 'defensa_organizada', subfase: 'bloque_bajo' }],
      ['Bloque mixto', { fase: 'defensa_organizada', subfase: 'bloque_mixto' }],
      ['Transición ofensiva', { fase: 'transicion_defensa_ataque' }],
      ['Transiciones defensivas', { fase: 'transicion_ataque_defensa' }],
      ['Transición ataque-defensa', { fase: 'transicion_ataque_defensa' }],
      ['Córner a favor', { fase: 'balon_parado_ofensivo' }],
      ['Gol', {}],
      ['Transición', {}],
    ]
    for (const [label, expected] of cases) assert.deepEqual(guessFaseFromLabel(label), expected, label)
  })

  it('la subfase del nombre gana a la fase genérica del botón', () => {
    const [inicio, transicion] = etiquetaGrupos([
      { title: 'Inicios', etiqueta: 'Inicios', fase: 'ataque_organizado' },
      { title: 'Robo', etiqueta: 'Robo', fase: 'transicion_ofensiva' },
    ], {})
    assert.deepEqual([inicio.fase, inicio.subfase], ['ataque_organizado', 'creacion'])
    assert.deepEqual([transicion.fase, transicion.subfase], ['transicion_defensa_ataque', undefined])
  })
})
