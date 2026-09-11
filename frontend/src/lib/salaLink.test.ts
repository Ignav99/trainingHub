import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  reconnectDelay,
  salaLinkLabel,
  shouldApplySeq,
  wrapSalaEnvelope,
  SALA_RECONNECT_MAX_MS,
} from './salaLink.ts'

describe('sala link helpers', () => {
  it('applies a newer seq and ignores an older one so a delayed tap cannot rewind the TV', () => {
    assert.equal(shouldApplySeq(0, 1), true)
    assert.equal(shouldApplySeq(4, 5), true)
    assert.equal(shouldApplySeq(5, 5), false)
    assert.equal(shouldApplySeq(5, 3), false)
    assert.equal(shouldApplySeq(5, undefined), true)
  })

  it('backs off reconnects without waiting forever', () => {
    assert.equal(reconnectDelay(0), 400)
    assert.ok(reconnectDelay(3) > reconnectDelay(1))
    assert.equal(reconnectDelay(20), SALA_RECONNECT_MAX_MS)
  })

  it('labels the transport the coach sees', () => {
    assert.equal(salaLinkLabel('offline'), 'reconectando…')
    assert.equal(salaLinkLabel('cloud'), 'en vivo')
    assert.equal(salaLinkLabel('direct'), 'enlace directo')
  })

  it('wraps control envelopes with the sala code', () => {
    const env = wrapSalaEnvelope('sala_sync', 'AB12CD', 'tablet', { slide: 2, seq: 9 })
    assert.equal(env.type, 'sala_sync')
    assert.equal(env.session_code, 'AB12CD')
    assert.equal(env.role, 'tablet')
    assert.equal(env.slide, 2)
    assert.equal(env.seq, 9)
  })
})
