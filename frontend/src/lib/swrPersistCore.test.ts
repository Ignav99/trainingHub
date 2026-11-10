import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  PERSIST_PREFIX,
  buildStorageKey,
  isPersistableKey,
  parseEntries,
  serializeEntries,
  wipeOtherOwners,
  wipeStorage,
} from './swrPersistCore.ts'

const NOW = 1_800_000_000_000

describe('isPersistableKey', () => {
  it('acepta rutas API normales', () => {
    assert.equal(isPersistableKey('/partidos?equipo_id=1'), true)
    assert.equal(isPersistableKey('/sesiones?page=1&limit=10'), true)
  })
  it('no guarda datos personales de jugadores', () => {
    assert.equal(isPersistableKey('/jugadores?equipo_id=1'), false)
    assert.equal(isPersistableKey('/dashboard/plantilla?equipo_id=1'), false)
    assert.equal(isPersistableKey('/carga/equipo/1'), false)
  })
  it('excluye salud, medios pesados y sesión', () => {
    for (const k of [
      '/medico?equipo_id=1',
      '/enfermeria/x',
      '/jugadores/1/lesiones',
      '/lesion/2',
      '/salud/x',
      '/wellness/equipo/1',
      '/nutricion/planes',
      '/videos/1',
      '/biblioteca/descargas',
      '/informes/export',
      '/auth/me',
    ]) assert.equal(isPersistableKey(k), false, k)
  })
  it('excluye claves internas y no string', () => {
    assert.equal(isPersistableKey('$inf$/x'), false)
    assert.equal(isPersistableKey('@abc'), false)
    assert.equal(isPersistableKey(null), false)
    assert.equal(isPersistableKey(['/a']), false)
  })
  it('ignora tildes y mayúsculas', () => {
    assert.equal(isPersistableKey('/Lesión/1'), false)
    assert.equal(isPersistableKey('/NUTRICIÓN'), false)
  })
})

describe('buildStorageKey', () => {
  it('liga a usuario y organización', () => {
    assert.equal(buildStorageKey('u1', 'o1'), `${PERSIST_PREFIX}o1:u1`)
    assert.notEqual(buildStorageKey('u1', 'o1'), buildStorageKey('u2', 'o1'))
  })
  it('sin usuario no hay clave', () => {
    assert.equal(buildStorageKey(undefined, 'o1'), null)
    assert.equal(buildStorageKey('', 'o1'), null)
    assert.equal(buildStorageKey(null), null)
  })
})

describe('serializeEntries / parseEntries', () => {
  it('ida y vuelta', () => {
    const raw = serializeEntries([{ key: '/a?x=1', data: { n: 1 }, t: NOW - 1000 }])
    assert.ok(raw)
    assert.deepEqual(parseEntries(raw, NOW), [{ key: '/a?x=1', data: { n: 1 }, t: NOW - 1000 }])
  })
  it('no guarda claves excluidas ni datos indefinidos', () => {
    const raw = serializeEntries([
      { key: '/medico', data: { a: 1 }, t: NOW },
      { key: '/b', data: undefined, t: NOW },
    ])
    assert.equal(raw, null)
  })
  it('descarta las más grandes al superar el tope', () => {
    const big = 'x'.repeat(500)
    const raw = serializeEntries(
      [
        { key: '/grande', data: big, t: NOW },
        { key: '/chica', data: 'y', t: NOW },
      ],
      { maxChars: 300, maxEntryChars: 10_000 },
    )
    assert.ok(raw)
    const keys = parseEntries(raw, NOW).map((e) => e.key)
    assert.deepEqual(keys, ['/chica'])
  })
  it('salta entradas individuales demasiado grandes', () => {
    const raw = serializeEntries([{ key: '/g', data: 'x'.repeat(100), t: NOW }], { maxEntryChars: 50 })
    assert.equal(raw, null)
  })
  it('caduca entradas viejas (24 h)', () => {
    const raw = serializeEntries([
      { key: '/vieja', data: 1, t: NOW - 25 * 3600 * 1000 },
      { key: '/nueva', data: 2, t: NOW - 3600 * 1000 },
    ])
    assert.deepEqual(parseEntries(raw, NOW).map((e) => e.key), ['/nueva'])
  })
  it('tolera basura, versión distinta y fechas futuras', () => {
    assert.deepEqual(parseEntries(null, NOW), [])
    assert.deepEqual(parseEntries('{no json', NOW), [])
    assert.deepEqual(parseEntries('{"v":99,"e":{}}', NOW), [])
    assert.deepEqual(parseEntries(`{"v":1,"e":{"/a":{"d":1,"t":${NOW + 10 * 60_000}}}}`, NOW), [])
    assert.deepEqual(parseEntries('{"v":1,"e":{"/a":{"d":null,"t":1}}}', NOW), [])
  })
  it('al leer ignora claves excluidas aunque estén en disco', () => {
    const raw = `{"v":1,"e":{"/medico":{"d":1,"t":${NOW}}}}`
    assert.deepEqual(parseEntries(raw, NOW), [])
  })
})

function fakeStorage(initial: Record<string, string>) {
  const data = new Map(Object.entries(initial))
  return {
    data,
    get length() { return data.size },
    key: (i: number) => Array.from(data.keys())[i] ?? null,
    removeItem: (k: string) => { data.delete(k) },
  }
}

describe('wipe', () => {
  it('wipeStorage borra solo lo nuestro', () => {
    const s = fakeStorage({ [`${PERSIST_PREFIX}o:u1`]: '1', [`${PERSIST_PREFIX}o:u2`]: '2', 'traininghub-auth': 'x' })
    wipeStorage(s)
    assert.deepEqual(Array.from(s.data.keys()), ['traininghub-auth'])
  })
  it('wipeOtherOwners conserva la cuenta actual', () => {
    const mine = `${PERSIST_PREFIX}o:u1`
    const s = fakeStorage({ [mine]: '1', [`${PERSIST_PREFIX}o:u2`]: '2', otra: 'x' })
    wipeOtherOwners(s, mine)
    assert.deepEqual(Array.from(s.data.keys()).sort(), [mine, 'otra'].sort())
  })
})
