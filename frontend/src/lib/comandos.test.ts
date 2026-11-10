import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { filtrarComandos, type Comando } from './comandos.ts'

const c = (id: string, titulo: string, palabras?: string[]): Comando => ({ id, titulo, grupo: 'Ir a', palabras })
const base = [
  c('a', 'Sesiones', ['entrenamiento']),
  c('b', 'Balón parado', ['abp', 'corner']),
  c('c', 'Nueva sesión'),
  c('d', 'Competición'),
]
const ids = (l: Comando[]) => l.map((x) => x.id)

describe('filtrarComandos', () => {
  it('con consulta vacía devuelve todo en su orden', () => {
    assert.deepEqual(ids(filtrarComandos(base, '')), ['a', 'b', 'c', 'd'])
    assert.deepEqual(ids(filtrarComandos(base, '   ')), ['a', 'b', 'c', 'd'])
  })
  it('ignora mayúsculas y tildes', () => {
    assert.deepEqual(ids(filtrarComandos(base, 'BALON')), ['b'])
    assert.deepEqual(ids(filtrarComandos(base, 'competicion')), ['d'])
    assert.deepEqual(ids(filtrarComandos(base, 'sesión')), ['a', 'c'])
  })
  it('prefijo de palabra gana a contenido', () => {
    const l = [c('x', 'Posesión'), c('y', 'Sesiones')]
    assert.deepEqual(ids(filtrarComandos(l, 'ses')), ['y', 'x'])
  })
  it('prefijo de palabra al inicio del título gana a prefijo en palabra interior', () => {
    assert.deepEqual(ids(filtrarComandos(base, 'ses')), ['a', 'c'])
  })
  it('contenido gana a palabras clave', () => {
    const l = [c('x', 'Informes', ['partido']), c('y', 'Partidos')]
    assert.deepEqual(ids(filtrarComandos(l, 'part')), ['y', 'x'])
    const m = [c('p', 'Otro', ['sesion']), c('q', 'Pre-sesiones largas')]
    assert.deepEqual(ids(filtrarComandos(m, 'sesion')), ['q', 'p'])
  })
  it('encuentra por palabras clave', () => {
    assert.deepEqual(ids(filtrarComandos(base, 'abp')), ['b'])
    assert.deepEqual(ids(filtrarComandos(base, 'entren')), ['a'])
  })
  it('exige que coincidan todos los términos', () => {
    assert.deepEqual(ids(filtrarComandos(base, 'nueva ses')), ['c'])
    assert.deepEqual(ids(filtrarComandos(base, 'nueva zzz')), [])
  })
  it('es estable en empates y no muta la entrada', () => {
    const l = [c('1', 'Sesión uno'), c('2', 'Sesión dos'), c('3', 'Sesión tres')]
    assert.deepEqual(ids(filtrarComandos(l, 'sesion')), ['1', '2', '3'])
    assert.deepEqual(ids(l), ['1', '2', '3'])
  })
  it('sin coincidencias devuelve lista vacía', () => {
    assert.deepEqual(filtrarComandos(base, 'xyz'), [])
  })
})
