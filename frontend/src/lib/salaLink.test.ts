import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  orderVideoCodecs,
  reconnectDelay,
  salaLinkLabel,
  salaSocketMode,
  sameSalaCode,
  shouldApplySeq,
  wrapSalaEnvelope,
  SALA_RECONNECT_MAX_MS,
} from './salaLink.ts'
import { trainingHubSalaGuestUrl } from './wsUrl.ts'

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

  it('puts H.264 first so the tablet can decode the computer video', () => {
    const ordered = orderVideoCodecs([
      { mimeType: 'video/VP8' },
      { mimeType: 'video/H264' },
      { mimeType: 'video/VP9' },
    ])
    assert.deepEqual(ordered.map((codec) => codec.mimeType), ['video/H264', 'video/VP8', 'video/VP9'])
  })

  it('labels the transport the coach sees', () => {
    assert.equal(salaLinkLabel('offline'), 'reconectando…')
    assert.equal(salaLinkLabel('cloud'), 'en vivo')
    assert.equal(salaLinkLabel('direct'), 'enlace directo')
  })

  it('wraps control envelopes with the sala code', () => {
    const env = wrapSalaEnvelope('sala_sync', 'ab12cd', 'tablet', { slide: 2, seq: 9 })
    assert.equal(env.type, 'sala_sync')
    assert.equal(env.session_code, 'AB12CD')
    assert.equal(env.role, 'tablet')
    assert.equal(env.slide, 2)
    assert.equal(env.seq, 9)
  })

  it('keeps the tablet on the QR guest socket even when a login is already stored', () => {
    assert.equal(salaSocketMode({
      role: 'tablet',
      accessToken: 'expired-jwt',
      equipoId: 'equipo-1',
      code: 'AB12CD',
    }), 'guest')
    assert.equal(salaSocketMode({
      role: 'tablet',
      accessToken: 'jwt',
      code: 'AB12CD',
    }), 'guest')
    assert.equal(salaSocketMode({ role: 'tablet', code: '' }), 'off')
  })

  it('lets the computer fall back to the sala code when the team is not ready', () => {
    assert.equal(salaSocketMode({
      role: 'host',
      accessToken: 'jwt',
      equipoId: 'equipo-1',
      code: 'AB12CD',
    }), 'jwt')
    assert.equal(salaSocketMode({
      role: 'host',
      accessToken: 'jwt',
      code: 'AB12CD',
    }), 'guest')
    assert.equal(salaSocketMode({
      role: 'host',
      guestPass: 'pase',
      accessToken: 'jwt',
      equipoId: 'equipo-1',
      code: 'AB12CD',
    }), 'guest')
    assert.equal(sameSalaCode('ab12cd', 'AB12CD'), true)
    assert.equal(sameSalaCode('OTRA', 'AB12CD'), false)
    assert.equal(sameSalaCode('', 'AB12CD'), true)
  })

  it('opens the sala websocket with the QR code and without a user token', () => {
    const url = trainingHubSalaGuestUrl('ab12cd', null, 'https://api.example.com/v1')
    assert.equal(url, 'wss://api.example.com/v1/ws?token=sala%3AAB12CD')
  })
})
