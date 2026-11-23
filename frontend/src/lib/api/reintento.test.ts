import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  MAX_RETRY_AFTER_MS,
  caducidadJwt,
  decisionReintentoSWR,
  esperaReintento,
  parseRetryAfter,
  reintentableGet,
  reintentableSWR,
  tokenVigente,
} from './reintento.ts'

describe('qué se reintenta', () => {
  it('GET: red, timeout, 408, 429, 502-504; nunca 4xx de validación/auth', () => {
    for (const s of [undefined, 408, 429, 502, 503, 504]) assert.equal(reintentableGet(s), true, String(s))
    for (const s of [400, 401, 402, 403, 404, 409, 422, 500]) assert.equal(reintentableGet(s), false, String(s))
  })
  it('SWR además reintenta 500', () => {
    assert.equal(reintentableSWR(500), true)
    assert.equal(reintentableSWR(422), false)
    assert.equal(reintentableSWR(401), false)
  })
})

describe('parseRetryAfter', () => {
  it('segundos y fecha HTTP, acotado', () => {
    assert.equal(parseRetryAfter('3'), 3000)
    assert.equal(parseRetryAfter('0'), 0)
    assert.equal(parseRetryAfter('9999'), MAX_RETRY_AFTER_MS)
    const ahora = Date.parse('2026-01-01T00:00:00Z')
    assert.equal(parseRetryAfter('Thu, 01 Jan 2026 00:00:05 GMT', ahora), 5000)
    assert.equal(parseRetryAfter('Wed, 31 Dec 2025 23:00:00 GMT', ahora), 0)
    assert.equal(parseRetryAfter('basura'), null)
    assert.equal(parseRetryAfter(null), null)
  })
})

describe('esperaReintento', () => {
  it('crece exponencialmente con jitter dentro de [techo/2, techo]', () => {
    assert.equal(esperaReintento(0, { baseMs: 600, azar: () => 0 }), 300)
    assert.equal(esperaReintento(0, { baseMs: 600, azar: () => 1 }), 600)
    assert.equal(esperaReintento(2, { baseMs: 600, azar: () => 1 }), 2400)
    assert.equal(esperaReintento(10, { baseMs: 600, maxMs: 8000, azar: () => 1 }), 8000)
    for (let i = 0; i < 50; i++) {
      const e = esperaReintento(1)
      assert.ok(e >= 600 && e <= 1200, String(e))
    }
  })
  it('respeta Retry-After como mínimo', () => {
    assert.equal(esperaReintento(0, { baseMs: 600, azar: () => 0, retryAfterMs: 5000 }), 5000)
    assert.equal(esperaReintento(0, { retryAfterMs: 60_000, azar: () => 0 }), MAX_RETRY_AFTER_MS)
  })
})

describe('decisionReintentoSWR', () => {
  const err = (statusCode?: number, retryAfterMs?: number) => Object.assign(new Error('x'), { statusCode, retryAfterMs })
  it('no reintenta 4xx ni pasado el máximo ni sin conexión', () => {
    assert.equal(decisionReintentoSWR(err(422), 1), null)
    assert.equal(decisionReintentoSWR(err(401), 1), null)
    assert.equal(decisionReintentoSWR(err(503), 5, { maxIntentos: 4 }), null)
    assert.equal(decisionReintentoSWR(err(), 1, { online: false }), null)
  })
  it('reintenta red/5xx/429 con backoff y Retry-After', () => {
    assert.equal(decisionReintentoSWR(err(503), 1, { azar: () => 1 }), 1000)
    assert.equal(decisionReintentoSWR(err(503), 3, { azar: () => 1 }), 4000)
    assert.equal(decisionReintentoSWR(err(), 1, { azar: () => 0 }), 500)
    assert.equal(decisionReintentoSWR(err(429, 7000), 1, { azar: () => 0 }), 7000)
  })
})

describe('token', () => {
  const jwt = (exp: number) =>
    `h.${Buffer.from(JSON.stringify({ exp })).toString('base64url')}.s`
  it('lee exp y decide vigencia con margen', () => {
    const ahora = 1_700_000_000_000
    assert.equal(caducidadJwt(jwt(1_700_000_100)), 1_700_000_100_000)
    assert.equal(tokenVigente(jwt(1_700_000_100), ahora), true)
    assert.equal(tokenVigente(jwt(1_700_000_010), ahora), false)
    assert.equal(tokenVigente(jwt(1_699_999_000), ahora), false)
    assert.equal(tokenVigente(null, ahora), false)
    assert.equal(tokenVigente('no-es-jwt', ahora), true)
    assert.equal(caducidadJwt('a.!!!.b'), null)
  })
})
