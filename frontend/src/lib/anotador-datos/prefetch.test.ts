import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { crearAlmacenMemoria } from './almacen.ts'
import { CACHE_FOTOS, crearPrefetch } from './prefetch.ts'

describe('prefetch del partido', () => {
  it('guarda partido, convocados y precalienta fotos; se recupera sin red', async () => {
    const almacen = crearAlmacenMemoria()
    const cacheados = new Map<string, unknown>()
    const abiertos: string[] = []
    const caches = { async open(n: string) { abiertos.push(n); return { async match(u: string) { return cacheados.get(u) }, async put(u: string, r: unknown) { cacheados.set(u, r) } } } }
    const pedidos: string[] = []
    const p = crearPrefetch({
      almacen, caches,
      fetchFn: async (u) => { pedidos.push(u); if (u.includes('mala')) throw new Error('x'); return { opaque: true } },
      cargadores: {
        partido: async () => ({ id: 'p1', notas_pre: '{}' }),
        convocados: async () => ({ data: [
          { id: 'c1', jugador: { foto_url: 'https://cdn.x/a.jpg' } },
          { id: 'c2', jugadores: { foto_url: 'https://cdn.x/mala.jpg' } },
          { id: 'c3', jugador: { foto_url: 'https://cdn.x/a.jpg' } },
          { id: 'c4' },
        ] }),
        informe: async () => { throw new Error('404') },
        equipo: () => ({ nombre: 'Juvenil' }),
      },
    })
    const r = await p.prefetchPartido('p1')
    assert.deepEqual(abiertos, [CACHE_FOTOS])
    assert.equal(r.convocados.length, 4)
    assert.deepEqual(r.fotos, ['https://cdn.x/a.jpg'])
    assert.equal(pedidos.length, 2) // a.jpg una vez + mala.jpg
    assert.equal(r.informe, null)
    const local = await p.cargarPartidoLocal('p1')
    assert.equal((local!.partido as any).id, 'p1')
    assert.equal(await p.cargarPartidoLocal('otro'), null)
  })
})
