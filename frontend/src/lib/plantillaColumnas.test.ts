import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  fusionarSanciones,
  lecturaSancion,
  textoCumple,
  minutosPorPartido,
  perfilJugador,
  presencias,
  rindeEnPartidos,
  wellnessVisible,
} from './plantillaColumnas.ts'

const cinco = { nivel_tecnico: 5, nivel_tactico: 5, nivel_fisico: 5, nivel_mental: 5, nivel_global: 5 }

describe('perfil de la plantilla', () => {
  it('deja la media cuando nadie destaca', () => {
    assert.deepEqual(perfilJugador(cinco), { kind: 'media', valor: 5 })
  })

  it('nombra el eje que se separa', () => {
    assert.deepEqual(
      perfilJugador({ ...cinco, nivel_tecnico: 9, nivel_global: 6 }),
      { kind: 'clase', texto: 'top técnico' },
    )
    assert.deepEqual(
      perfilJugador({ ...cinco, nivel_tactico: 7, nivel_global: 5.5 }),
      { kind: 'clase', texto: 'táctico' },
    )
  })

  it('dice top cuando los cuatro van altos y juntos', () => {
    assert.deepEqual(
      perfilJugador({ nivel_tecnico: 8, nivel_tactico: 8, nivel_fisico: 9, nivel_mental: 8, nivel_global: 8.3 }),
      { kind: 'clase', texto: 'top' },
    )
  })

  it('no elige un eje si hay dos empatados', () => {
    const perfil = perfilJugador({
      nivel_tecnico: 9,
      nivel_tactico: 9,
      nivel_fisico: 5,
      nivel_mental: 5,
      nivel_global: 7,
    })
    assert.equal(perfil.kind, 'media')
  })
})

describe('rendimiento en partidos', () => {
  it('pide dos notas para dar un estado', () => {
    assert.equal(rindeEnPartidos(9, 1), null)
    assert.equal(rindeEnPartidos(null, 4), null)
    assert.equal(rindeEnPartidos(8, 2)?.texto, 'alto')
    assert.equal(rindeEnPartidos(6.5, 3)?.texto, 'bien')
    assert.equal(rindeEnPartidos(5, 3)?.texto, 'justo')
    assert.equal(rindeEnPartidos(4.2, 4)?.texto, 'bajo')
  })
})

describe('titular, suplente y minutos por partido', () => {
  it('junta las dos cifras y redondea el minuto', () => {
    assert.equal(presencias(11, 3), '11/3')
    assert.equal(presencias(0, 0), null)
    assert.equal(minutosPorPartido(200, 3), 67)
    assert.equal(minutosPorPartido(90, 0), null)
  })
})

describe('sanción y wellness', () => {
  it('se queda con la sanción más larga', () => {
    const map = fusionarSanciones([
      [{ estado: 'Sancionado', jugador_id: 'a', sancionado_restantes: 1 }],
      [{ estado: 'OK', jugador_id: 'b' }, { estado: 'Sancionado', jugador_id: 'a', sancionado_restantes: 3 }],
    ])
    assert.deepEqual(map.a, { restantes: 3 })
    assert.equal(map.b, undefined)
  })

  it('distingue cumple, libre y sin actas', () => {
    assert.equal(lecturaSancion({ restantes: 2 }, true).lectura, 'cumple')
    assert.equal(lecturaSancion({ restantes: 2 }, true).restantes, 2)
    assert.equal(lecturaSancion(undefined, true).lectura, 'libre')
    assert.equal(lecturaSancion(undefined, false).lectura, 'sin-datos')
  })

  it('en tarjetas solo se escribe cumple', () => {
    assert.equal(textoCumple('cumple', 1), 'cumple')
    assert.equal(textoCumple('cumple', 3), 'cumple 3')
    assert.equal(textoCumple('cumple'), 'cumple')
    assert.equal(textoCumple('libre'), null)
    assert.equal(textoCumple('sin-datos'), null)
  })

  it('prefiere la media de 7 días', () => {
    assert.deepEqual(wellnessVisible({ wellness_7d_avg: 18.5, wellness_last: 12 }), { valor: 18.5, reciente: false })
    assert.deepEqual(wellnessVisible({ wellness_7d_avg: null, wellness_last: 12 }), { valor: 12, reciente: true })
    assert.equal(wellnessVisible(null), null)
  })
})
