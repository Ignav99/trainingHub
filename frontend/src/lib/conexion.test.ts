import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { FALLOS_PARA_AVISAR, crearMonitorConexion } from './conexion.ts'

describe('monitor de conexión', () => {
  it('avisa del servidor tras varios fallos seguidos y se recupera con un éxito', () => {
    const m = crearMonitorConexion(() => true)
    const vistos: string[] = []
    m.suscribir((e) => vistos.push(e))
    for (let i = 1; i < FALLOS_PARA_AVISAR; i++) m.fallo()
    assert.equal(m.estado(), 'ok')
    m.fallo()
    assert.equal(m.estado(), 'servidor')
    m.exito()
    assert.equal(m.estado(), 'ok')
    assert.deepEqual(vistos, ['servidor', 'ok'])
  })

  it('sin red se marca al instante y vuelve con conRed', () => {
    let online = false
    const m = crearMonitorConexion(() => online)
    m.fallo()
    assert.equal(m.estado(), 'sin-red')
    online = true
    m.conRed()
    assert.equal(m.estado(), 'ok')
  })

  it('un oyente que lanza no rompe a los demás y se puede desuscribir', () => {
    const m = crearMonitorConexion()
    let n = 0
    m.suscribir(() => {
      throw new Error('x')
    })
    const off = m.suscribir(() => n++)
    m.sinRed()
    off()
    m.conRed()
    assert.equal(n, 1)
  })
})
