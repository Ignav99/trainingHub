import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { Microciclo, Partido, Rival } from '@/types'
import {
  microcicloHasLinkedMatch,
  microcicloLinkedRival,
  rivalFromPartido,
} from './microcicloModo.ts'
import { defaultNutricionPartidoPlan, hasNutricionPartidoContent } from './microcicloNutricionSync.ts'
import { tramoHasContent } from './planPartidoTramos.ts'

const rival: Rival = {
  id: 'r1',
  nombre: 'Atlético X',
  nombre_corto: 'ATX',
  escudo_url: 'https://example/escudo.png',
  created_at: '',
  updated_at: '',
}

describe('sala lunes match assignment helpers', () => {
  it('reads rival from partidos.rivales join', () => {
    const partido = { id: 'p1', rival_id: 'r1', rivales: rival } as Partido & { rivales: Rival }
    assert.equal(rivalFromPartido(partido)?.nombre_corto, 'ATX')
  })

  it('prefers micro.rivales over nested partido rival', () => {
    const micro = {
      rivales: { ...rival, nombre_corto: 'Directo' },
      partidos: { rival },
    } as Pick<Microciclo, 'rivales' | 'partidos'>
    assert.equal(microcicloLinkedRival(micro)?.nombre_corto, 'Directo')
  })

  it('treats a linked partido without rival join as assigned', () => {
    const micro = { partido_id: 'p1' } as Pick<Microciclo, 'partido_id' | 'rival_id' | 'rivales' | 'partidos'>
    assert.equal(microcicloHasLinkedMatch(micro), true)
    assert.equal(microcicloHasLinkedMatch({}), false)
  })
})

describe('nutricion partido optional content', () => {
  it('ignores empty defaults', () => {
    assert.equal(hasNutricionPartidoContent(undefined), false)
    assert.equal(hasNutricionPartidoContent(defaultNutricionPartidoPlan()), false)
    assert.equal(tramoHasContent({ nutricion_partido: defaultNutricionPartidoPlan() }), false)
  })

  it('counts filled notes or tags as content', () => {
    assert.equal(hasNutricionPartidoContent({ notas: 'gel 45\'' }), true)
    assert.equal(tramoHasContent({ nutricion_partido: { etiquetas: ['cafeína'] } }), true)
  })
})
