import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  MES_INICIO_TEMPORADA_DEFECTO,
  anioInicioTemporada,
  etiquetaMC,
  etiquetaMicrocicloLarga,
  limitesTemporada,
  mesInicioValido,
  numerarMicrociclos,
  rangoInicios,
  temporadaDeFecha,
} from './microcicloNumero.ts'

describe('temporada', () => {
  it('por defecto es el año deportivo 1 jul → 30 jun', () => {
    assert.equal(MES_INICIO_TEMPORADA_DEFECTO, 6)
    assert.deepEqual(limitesTemporada(2025), { desde: '2025-07-01', hasta: '2026-06-30' })
    assert.equal(anioInicioTemporada('2025-07-01'), 2025)
    assert.equal(anioInicioTemporada('2026-06-30'), 2025)
    assert.equal(anioInicioTemporada('2025-06-30T10:00:00Z'), 2024)
  })

  it('respeta el mes de inicio del calendario (agosto, enero)', () => {
    assert.deepEqual(limitesTemporada(2025, 7), { desde: '2025-08-01', hasta: '2026-07-31' })
    assert.deepEqual(limitesTemporada(2024, 0), { desde: '2024-01-01', hasta: '2024-12-31' })
    assert.deepEqual(limitesTemporada(2023, 2), { desde: '2023-03-01', hasta: '2024-02-29' })
    assert.equal(anioInicioTemporada('2025-07-20', 7), 2024)
    assert.equal(temporadaDeFecha('2026-03-10', 7).desde, '2025-08-01')
  })

  it('mes de inicio inválido cae al de por defecto', () => {
    assert.equal(mesInicioValido('7'), 7)
    assert.equal(mesInicioValido(0), 0)
    assert.equal(mesInicioValido(null), 6)
    assert.equal(mesInicioValido('abc'), 6)
    assert.equal(mesInicioValido(12), 6)
    assert.equal(mesInicioValido(''), 6)
  })
})

describe('numerarMicrociclos', () => {
  const temporada = limitesTemporada(2025)

  it('el primero de la temporada es el 1, por fecha de inicio ascendente', () => {
    const n = numerarMicrociclos(
      [
        { id: 'c', fecha_inicio: '2025-09-01' },
        { id: 'a', fecha_inicio: '2025-07-07' },
        { id: 'b', fecha_inicio: '2025-07-14T00:00:00' },
      ],
      temporada
    )
    assert.deepEqual([...n.entries()], [['a', 1], ['b', 2], ['c', 3]])
  })

  it('ignora los de otras temporadas y no depende del orden de entrada', () => {
    const micros = [
      { id: 'prev', fecha_inicio: '2025-06-30' },
      { id: 'x', fecha_inicio: '2025-08-04' },
      { id: 'next', fecha_inicio: '2026-07-01' },
      { id: 'y', fecha_inicio: '2025-08-11' },
    ]
    const a = numerarMicrociclos(micros, temporada)
    const b = numerarMicrociclos([...micros].reverse(), temporada)
    assert.equal(a.get('prev'), undefined)
    assert.equal(a.get('next'), undefined)
    assert.equal(a.get('x'), 1)
    assert.equal(a.get('y'), 2)
    assert.deepEqual([...a.entries()].sort(), [...b.entries()].sort())
  })

  it('desempata por id y cuenta una vez los repetidos', () => {
    const n = numerarMicrociclos(
      [
        { id: 'z', fecha_inicio: '2025-10-06' },
        { id: 'm', fecha_inicio: '2025-10-06' },
        { id: 'm', fecha_inicio: '2025-10-06' },
      ],
      temporada
    )
    assert.equal(n.get('m'), 1)
    assert.equal(n.get('z'), 2)
    assert.equal(n.size, 2)
  })

  it('rangoInicios', () => {
    assert.deepEqual(rangoInicios([]), { desde: null, hasta: null })
    assert.deepEqual(
      rangoInicios([{ fecha_inicio: '2025-09-01' }, { fecha_inicio: '2025-07-07T00:00' }, { fecha_inicio: null }]),
      { desde: '2025-07-07', hasta: '2025-09-01' }
    )
  })

  it('etiquetas', () => {
    assert.equal(etiquetaMC(12), 'MC 12')
    assert.equal(etiquetaMC(null), null)
    assert.equal(etiquetaMicrocicloLarga(12), 'Microciclo 12')
    assert.equal(etiquetaMicrocicloLarga(undefined), 'Microciclo')
  })
})
