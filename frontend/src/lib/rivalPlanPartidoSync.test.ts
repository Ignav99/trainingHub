import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { extractPersistentPlanPartido, mergePlanPartidoOnLoad } from './rivalPlanPartidoSync.ts'

describe('plan de partido persistence', () => {
  it('keeps the general comment and each phase strengths', () => {
    const saved = extractPersistentPlanPartido({
      fases: [
        {
          fase: 'ataque_organizado',
          comentario_general: 'Salida corta',
          clips: [],
          subfases: {
            creacion: {
              notas: 'Portero más dos',
              fortalezas: ['Amplitud'],
              debilidades: ['Lento'],
            },
          },
        },
      ],
    })
    const fase = saved.fases?.find((item) => item.fase === 'ataque_organizado')
    assert.equal(fase?.comentario_general, 'Salida corta')
    assert.deepEqual(fase?.subfases?.creacion?.fortalezas, ['Amplitud'])
    assert.deepEqual(fase?.subfases?.creacion?.debilidades, ['Lento'])

    const merged = mergePlanPartidoOnLoad(
      {
        fases: [
          {
            fase: 'defensa_organizada',
            comentario_general: '',
            clips: [],
            subfases: {
              bloque_alto: { notas: 'Presión', fortalezas: ['Altura'], debilidades: [] },
            },
          },
        ],
      },
      {
        fases: [
          {
            fase: 'defensa_organizada',
            comentario_general: 'Borrador local',
            clips: [],
            subfases: {
              bloque_bajo: { notas: 'Local', fortalezas: ['Cierre'], debilidades: ['Banda'] },
            },
          },
        ],
      }
    )
    const defensa = merged.fases?.find((item) => item.fase === 'defensa_organizada')
    assert.equal(defensa?.comentario_general, '')
    assert.deepEqual(defensa?.subfases?.bloque_alto?.fortalezas, ['Altura'])
    assert.deepEqual(defensa?.subfases?.bloque_bajo?.fortalezas, ['Cierre'])
  })
})
