import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  GROUPS_BY_BLOQUE,
  applyDerived,
  nivelTalones,
  nivelPlanchaLateral,
  nivelWallSit,
  nivelPuenteGluteo,
  nivelPlanchaFrontal,
  nivelNordic,
} from '../frontend/src/lib/fichaClinicaCatalog.ts'

test('valoración incluye Daniels y tests de fuerza/nordic', () => {
  const valIds = GROUPS_BY_BLOQUE.valoracion.map((g) => g.id)
  const testIds = GROUPS_BY_BLOQUE.tests.map((g) => g.id)
  assert.ok(valIds.includes('fuerza_daniels'))
  assert.ok(testIds.includes('test_talon_unilateral'))
  assert.ok(testIds.includes('test_plancha_lateral'))
  assert.ok(testIds.includes('test_wall_sit'))
  assert.ok(testIds.includes('test_puente_gluteo'))
  assert.ok(testIds.includes('test_plancha_frontal'))
  assert.ok(testIds.includes('test_nordic'))
  const daniels = GROUPS_BY_BLOQUE.valoracion.find((g) => g.id === 'fuerza_daniels')
  assert.equal(daniels?.legend?.length, 6)
  assert.ok(daniels?.fields.some((f) => f.key === 'daniels_cuadriceps'))
  assert.ok(daniels?.fields.some((f) => f.key === 'daniels_triceps_sural'))
})

test('bandas de nivel coinciden con la hoja', () => {
  assert.equal(nivelTalones(14), 'bajo')
  assert.equal(nivelTalones(16), 'normal')
  assert.equal(nivelTalones(25), 'bueno')
  assert.equal(nivelTalones(31), 'muy_bueno')
  assert.equal(nivelPlanchaLateral(19), 'bajo')
  assert.equal(nivelPlanchaLateral(20), 'normal')
  assert.equal(nivelPlanchaLateral(75), 'bueno')
  assert.equal(nivelPlanchaLateral(76), 'muy_bueno')
  assert.equal(nivelWallSit(29), 'bajo')
  assert.equal(nivelWallSit(60), 'normal')
  assert.equal(nivelWallSit(90), 'bueno')
  assert.equal(nivelWallSit(91), 'muy_bueno')
  assert.equal(nivelPuenteGluteo(9), 'bajo')
  assert.equal(nivelPuenteGluteo(10), 'normal')
  assert.equal(nivelPuenteGluteo(15), 'normal')
  assert.equal(nivelPuenteGluteo(20), 'bueno')
  assert.equal(nivelPuenteGluteo(21), 'muy_bueno')
  assert.equal(nivelPlanchaFrontal(29), 'bajo')
  assert.equal(nivelPlanchaFrontal(60), 'normal')
  assert.equal(nivelPlanchaFrontal(120), 'bueno')
  assert.equal(nivelPlanchaFrontal(121), 'muy_bueno')
  assert.equal(nivelNordic(19), 'riesgo')
  assert.equal(nivelNordic(20), 'aceptable')
  assert.equal(nivelNordic(40), 'bueno')
  assert.equal(nivelNordic(41), 'muy_bueno')
})

test('applyDerived rellena niveles D/I y tests globales', () => {
  const datos = applyDerived({
    talon_reps_d: 12,
    talon_reps_i: 28,
    plancha_lat_s_d: 50,
    wall_sit_s: 40,
    puente_gluteo_reps_i: 8,
    plancha_front_s: 130,
    nordic_angulo_d: 18,
    nordic_angulo_i: 36,
  })
  assert.equal(datos.talon_nivel_d, 'bajo')
  assert.equal(datos.talon_nivel_i, 'bueno')
  assert.equal(datos.plancha_lat_nivel_d, 'bueno')
  assert.equal(datos.wall_sit_nivel, 'normal')
  assert.equal(datos.puente_gluteo_nivel_i, 'bajo')
  assert.equal(datos.plancha_front_nivel, 'muy_bueno')
  assert.equal(datos.nordic_nivel_d, 'riesgo')
  assert.equal(datos.nordic_nivel_i, 'bueno')
})

test('columna dice Desviación y single leg va con valgo y vídeo antes de longitud', () => {
  const alineacion = GROUPS_BY_BLOQUE.valoracion.find((g) => g.id === 'alineacion_estatica')
  const columna = alineacion?.fields.find((f) => f.key === 'columna')
  assert.equal(columna?.options?.find((o) => o.value === 'desalineacion')?.label, 'Desviación')

  const control = GROUPS_BY_BLOQUE.tests.find((g) => g.id === 'control_motor')
  const keys = control?.fields.map((f) => f.key) || []
  const single = keys.indexOf('single_leg')
  const valgo = keys.indexOf('valgo_dinamico')
  const video = keys.indexOf('notas_control_motor')
  const longitud = keys.indexOf('longitud_pierna')
  assert.ok(single >= 0 && valgo === single + 1)
  assert.equal(video, valgo + 1)
  assert.equal(longitud, video + 1)

  const sl = control?.fields.find((f) => f.key === 'single_leg')
  assert.deepEqual(
    (sl?.options || []).filter((o) => o.value !== 'no_valorado').map((o) => o.label),
    ['Normal', 'Ligero valgo dinámico', 'Valgo dinámico'],
  )
})
