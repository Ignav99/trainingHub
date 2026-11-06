import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  formatDelta,
  formatMedicion,
  progresoPorMetrica,
  resumenArea,
  revisionPendiente,
} from './planIndividual.ts'
import type { PlanEntrada, PlanMedicion } from './api/planIndividual.ts'

const med = (id: string, fecha: string, metrica: string, valor: number, extra: Partial<PlanMedicion> = {}): PlanMedicion => ({
  id,
  entrada_id: 'e',
  fecha,
  momento: 'seguimiento',
  metrica,
  valor,
  mejor: 'mas',
  created_at: `${fecha}T10:00:00Z`,
  ...extra,
})

describe('plan individualizado', () => {
  it('compares the first measure with the latest one, per metric', () => {
    const progreso = progresoPorMetrica([
      med('b', '2027-02-01', 'Salto vertical (CMJ)', 41, { unidad: 'cm' }),
      med('a', '2026-11-06', 'salto vertical (cmj)', 36, { unidad: 'cm', momento: 'inicial' }),
      med('c', '2026-11-06', 'Sprint 10 m', 1.92, { unidad: 's', mejor: 'menos', momento: 'inicial' }),
      med('d', '2027-02-01', 'Sprint 10 m', 1.85, { unidad: 's', mejor: 'menos' }),
    ])
    const salto = progreso.find((p) => p.metrica.startsWith('Salto'))!
    assert.equal(salto.serie.length, 2)
    assert.equal(salto.tendencia, 'mejora')
    assert.equal(formatDelta(salto), '+5 cm')
    const sprint = progreso.find((p) => p.metrica.startsWith('Sprint'))!
    assert.equal(sprint.tendencia, 'mejora')
    assert.equal(formatDelta(sprint), '−0,07 s')
  })

  it('reads «10 de 30 pases» as a percentage and compares in points', () => {
    const [pases] = progresoPorMetrica([
      med('a', '2026-11-06', 'Pases acertados', 10, { total: 30 }),
      med('b', '2027-03-01', 'Pases acertados', 18, { total: 30 }),
    ])
    assert.equal(formatMedicion(pases.inicial), '10/30 · 33,3 %')
    assert.equal(formatDelta(pases), '+26,7 pts')
    assert.equal(pases.tendencia, 'mejora')
  })

  it('a single measure has no trend yet', () => {
    const [solo] = progresoPorMetrica([med('a', '2026-11-06', 'Peso', 80, { unidad: 'kg', mejor: 'menos' })])
    assert.equal(solo.tendencia, null)
    assert.equal(formatDelta(solo), '')
  })

  it('flags reviews that are due and counts the area', () => {
    const base = { estado: 'en_trabajo', revisar_el: '2026-11-01' } as PlanEntrada
    assert.equal(revisionPendiente(base, '2026-11-06'), true)
    assert.equal(revisionPendiente({ ...base, estado: 'resuelta' }, '2026-11-06'), false)
    assert.equal(revisionPendiente({ ...base, revisar_el: '2027-01-01' }, '2026-11-06'), false)
    assert.deepEqual(
      resumenArea([base, { ...base, estado: 'resuelta' }, { ...base, revisar_el: null }], '2026-11-06'),
      { total: 3, activas: 2, resueltas: 1, revisar: 1 },
    )
  })
})
