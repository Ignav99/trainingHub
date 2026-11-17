import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  matchWellnessJugador,
  parseHorasSueno,
  type WellnessPlayerRef,
} from './wellnessExcel.ts'

const plantilla: WellnessPlayerRef[] = [
  { id: 'gil', nombre: 'Alberto', apellidos: 'Gil', apodo: 'Alberto' },
  { id: 'heredero', nombre: 'Alberto ', apellidos: 'Heredero', apodo: 'Heredero' },
  { id: 'melchor', nombre: 'Melchor ', apellidos: 'Jiménez', apodo: 'Melchor' },
  { id: 'gori', nombre: 'Gonzalo ', apellidos: 'Gori', apodo: 'Gori' },
  { id: 'bartolome', nombre: 'Gonzalo ', apellidos: 'Bartolomé', apodo: 'Gonzalo' },
  { id: 'jose', nombre: 'Jose', apellidos: 'Gonzalez', apodo: 'Jose' },
  { id: 'edu', nombre: 'Eduardo', apellidos: 'Balbontín ', apodo: 'Edu' },
  { id: 'ale', nombre: 'Alejandro ', apellidos: 'Lopez', apodo: 'Ale' },
  { id: 'juan', nombre: 'Juan ', apellidos: 'De la calle', apodo: 'Juan' },
  { id: 'carlos-v', nombre: 'Carlos ', apellidos: 'Vargas ', apodo: 'Vargas' },
  { id: 'carlos-p', nombre: 'Carlos', apellidos: 'Piñero', apodo: 'Piñero' },
]

describe('matchWellnessJugador', () => {
  it('casa Melchor y Alberto Heredero con la ficha, aunque el nombre lleve un espacio de más', () => {
    assert.equal(matchWellnessJugador('Melchor', plantilla), 'melchor')
    assert.equal(matchWellnessJugador('Melchor Jiménez', plantilla), 'melchor')
    assert.equal(matchWellnessJugador('Alberto Heredero', plantilla), 'heredero')
    assert.equal(matchWellnessJugador('Alberto Gil', plantilla), 'gil')
  })

  it('no asigna un nombre de pila si lo comparten dos jugadores y ninguno lo usa de apodo', () => {
    assert.equal(matchWellnessJugador('Carlos', plantilla), null)
  })

  it('«Alberto» a secas es el apodo de Gil, no Heredero', () => {
    assert.equal(matchWellnessJugador('Alberto', plantilla), 'gil')
  })

  it('el apodo exacto gana cuando el nombre de pila está repetido', () => {
    assert.equal(matchWellnessJugador('Gonzalo', plantilla), 'bartolome')
    assert.equal(matchWellnessJugador('Gonzalo Bartolomé', plantilla), 'bartolome')
  })

  it('ignora acentos y el apellido extra del formulario', () => {
    assert.equal(matchWellnessJugador('Jose González', plantilla), 'jose')
    assert.equal(matchWellnessJugador('Edu Balbontín', plantilla), 'edu')
    assert.equal(matchWellnessJugador('Alejandro Lopez Juan', plantilla), 'ale')
    assert.equal(matchWellnessJugador('Juan De la calle', plantilla), 'juan')
    assert.equal(matchWellnessJugador('Gonzalo Gori', plantilla), 'gori')
    assert.equal(matchWellnessJugador('Carlos Vargas', plantilla), 'carlos-v')
  })

  it('deja sin asignar un nombre que no está en la plantilla', () => {
    assert.equal(matchWellnessJugador('Baba', plantilla), null)
    assert.equal(matchWellnessJugador('   ', plantilla), null)
  })
})

describe('parseHorasSueno del formulario', () => {
  it('lee las franjas del Google Form', () => {
    assert.equal(parseHorasSueno('Entre 6 y 7 horas'), 6.5)
    assert.equal(parseHorasSueno('Más de 7 horas'), 7.5)
    assert.equal(parseHorasSueno('Entre 5 y 6 horas'), 5.5)
    assert.equal(parseHorasSueno('Menos de 5 horas'), 4.5)
  })
})
