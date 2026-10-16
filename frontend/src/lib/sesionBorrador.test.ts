import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  canPersistDraft,
  clearCreacion,
  continueHref,
  continuarWizardHref,
  markCreacion,
  pasoToPhase,
  pasoToWizardStep,
  persistedTaskRows,
  readCreacionPaso,
  taskSyncKey,
  wizardStepToPaso,
} from './sesionBorrador.ts'

describe('borrador de creación de sesión', () => {
  it('guarda el paso del asistente y lo lee después', () => {
    const notas = markCreacion({ campograma: 'x' }, 'tareas', false)
    assert.equal(readCreacionPaso(notas), 'tareas')
    assert.equal(notas.campograma, 'x')
    assert.equal(pasoToPhase('tareas'), 'diseno')
    assert.equal(pasoToWizardStep('tareas', false), 1)
    assert.equal(wizardStepToPaso(1, false), 'tareas')
    assert.equal(continueHref('abc', notas, 'borrador'), '/sesiones/abc?fase=diseno')
  })

  it('la convocatoria reabre esa fase y el asistido vuelve al asistente', () => {
    const notas = markCreacion({}, 'convocatoria', true)
    assert.equal(pasoToPhase('convocatoria'), 'convocatoria')
    assert.equal(pasoToWizardStep('ia', true), 1)
    assert.equal(continuarWizardHref('abc', notas), '/sesiones/nueva?continuar=abc&mode=assisted')
    assert.equal(continueHref('abc', notas, 'planificada'), '/sesiones/abc')
  })

  it('exige título, fecha y match day antes de crear el borrador', () => {
    assert.equal(canPersistDraft({ titulo: 'MD', fecha: '2026-10-16', match_day: 'MD-3' }), false)
    assert.equal(canPersistDraft({ titulo: 'MD-3 fuerza', fecha: '2026-10-16', match_day: 'MD-3' }), true)
    assert.equal(canPersistDraft({ titulo: 'Sesión', fecha: '', match_day: 'MD-3' }), false)
  })

  it('al terminar la creación quita la marca y solo sincroniza tareas con id real', () => {
    const limpias = clearCreacion(markCreacion({ campograma: 'x' }, 'tareas', false))
    assert.equal(readCreacionPaso(limpias), null)
    assert.equal(limpias.campograma, 'x')
    const rows = persistedTaskRows([
      { tarea: { id: '11111111-1111-4111-8111-111111111111' }, fase: 'activacion', orden: 1 },
      { tarea: { id: 'temp' }, fase: 'activacion', orden: 2 },
    ])
    assert.equal(rows.length, 1)
    assert.equal(taskSyncKey(rows), '11111111-1111-4111-8111-111111111111|activacion|1')
  })
})
