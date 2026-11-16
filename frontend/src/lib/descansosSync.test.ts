import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { FilaDescanso } from './diaPersonal.ts'
import {
  efectoDelCambio,
  empezarEscrituraDescansos,
  fechaCabeEnClave,
  filaDeRespuesta,
  lecturaDescansosObsoleta,
  listaTrasGuardar,
  respuestaBorra,
  terminarEscrituraDescansos,
} from './descansosSync.ts'

function fila(parcial: Partial<FilaDescanso> & Pick<FilaDescanso, 'id' | 'fecha' | 'tipo'>): FilaDescanso {
  return { notas: null, ...parcial }
}

const temporada = '/descansos?equipo_id=eq&fecha_desde=2026-07-01&fecha_hasta=2027-06-30'
const semana = '/descansos?equipo_id=eq&fecha_desde=2026-11-16&fecha_hasta=2026-11-22'

describe('lista de descansos tras guardar', () => {
  it('mantiene el descanso aunque la lista releída sea anterior al guardado', () => {
    const guardada = fila({ id: 'real', fecha: '2026-11-21', tipo: 'descanso' })
    const lista = listaTrasGuardar([], temporada, '2026-11-21', guardada)
    assert.deepEqual(lista.map((d) => d.id), ['real'])
  })

  it('sustituye la fila temporal por la del servidor y no la duplica', () => {
    const temporal = fila({ id: 'tmp-2026-11-21', fecha: '2026-11-21', tipo: 'descanso' })
    const real = fila({ id: 'real', fecha: '2026-11-21', tipo: 'descanso' })
    const lista = listaTrasGuardar([temporal], temporada, '2026-11-21', real)
    assert.deepEqual(lista.map((d) => d.id), ['real'])
  })

  it('deja la nota del día aunque la relectura no la traiga', () => {
    const nota = fila({
      id: 'real',
      fecha: '2026-12-21',
      tipo: 'festivo',
      notas: '{"texto":"Vacaciones","color":"rosa"}',
    })
    const lista = listaTrasGuardar(
      [fila({ id: 'otro', fecha: '2026-11-16', tipo: 'descanso' })],
      temporada,
      '2026-12-21',
      nota
    )
    assert.deepEqual(
      lista.map((d) => d.fecha),
      ['2026-11-16', '2026-12-21']
    )
    assert.equal(lista[1].notas, nota.notas)
  })

  it('quita el día borrado aunque la relectura todavía lo tenga', () => {
    const puesto = fila({ id: 'real', fecha: '2026-11-21', tipo: 'descanso' })
    const lista = listaTrasGuardar([puesto], temporada, '2026-11-21', null)
    assert.equal(lista.length, 0)
  })

  it('no mete el día en la tira de una semana que no lo contiene', () => {
    const nota = fila({ id: 'real', fecha: '2026-12-21', tipo: 'festivo' })
    const lista = listaTrasGuardar([], semana, '2026-12-21', nota)
    assert.equal(lista.length, 0)
    assert.equal(fechaCabeEnClave(semana, '2026-11-18'), true)
    assert.equal(fechaCabeEnClave(semana, '2026-12-21'), false)
  })

  it('reconoce la fila guardada y el borrado del toggle', () => {
    const guardada = fila({ id: 'real', fecha: '2026-11-21', tipo: 'descanso' })
    assert.equal(filaDeRespuesta(guardada)?.id, 'real')
    assert.equal(filaDeRespuesta({ deleted: true, id: 'real' }), null)
    assert.equal(respuestaBorra({ deleted: true, id: 'real' }), true)
    assert.equal(respuestaBorra(undefined), false)
  })

  it('una lectura empezada antes del clic no puede pintar después', () => {
    const inicio = Date.now() - 5
    empezarEscrituraDescansos()
    assert.equal(lecturaDescansosObsoleta(inicio), true)
    assert.equal(lecturaDescansosObsoleta(Date.now() + 60_000), true)
    terminarEscrituraDescansos()
    assert.equal(lecturaDescansosObsoleta(inicio), true)
    assert.equal(lecturaDescansosObsoleta(Date.now() + 60_000), false)
  })

  it('el efecto del cambio dice qué fecha se puso y cuál se quitó', () => {
    const antes = [fila({ id: 'a', fecha: '2026-11-16', tipo: 'descanso' })]
    const despues = [fila({ id: 'tmp-2026-11-21', fecha: '2026-11-21', tipo: 'festivo', notas: 'x' })]
    const efecto = efectoDelCambio(antes, despues)
    assert.equal(efecto.get('2026-11-16'), null)
    assert.equal(efecto.get('2026-11-21')?.id, 'tmp-2026-11-21')
  })
})
