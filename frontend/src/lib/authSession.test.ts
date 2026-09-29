import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  localSupabaseSessionPresent,
  readPersistedAuth,
  shouldClearSharedAuthOnSignedOut,
} from './authSession.ts'

describe('shared auth across tabs', () => {
  it('reads a persisted login', () => {
    const storage = {
      getItem: () => JSON.stringify({
        state: { accessToken: 'tok', isAuthenticated: true, user: { id: '1', nombre: 'Ana' } },
      }),
    }
    const snap = readPersistedAuth(storage)
    assert.equal(snap?.isAuthenticated, true)
    assert.equal(snap?.accessToken, 'tok')
    assert.deepEqual(snap?.user, { id: '1', nombre: 'Ana' })
  })

  it('ignores a blob without a token', () => {
    const storage = {
      getItem: () => JSON.stringify({ state: { accessToken: '', isAuthenticated: true, user: null } }),
    }
    assert.equal(readPersistedAuth(storage)?.isAuthenticated, false)
  })

  it('returns null on broken storage', () => {
    assert.equal(readPersistedAuth(null), null)
    assert.equal(readPersistedAuth({ getItem: () => '{' }), null)
  })

  it('keeps the shared session when another tab emits SIGNED_OUT', () => {
    assert.equal(shouldClearSharedAuthOnSignedOut(false, true), false)
    assert.equal(shouldClearSharedAuthOnSignedOut(false, false), false)
    assert.equal(shouldClearSharedAuthOnSignedOut(true, true), false)
    assert.equal(shouldClearSharedAuthOnSignedOut(true, false), true)
  })

  it('detects the supabase token still in local storage', () => {
    const entries = new Map<string, string>([
      ['sb-yakfkuquvoszdtjeslfc-auth-token', '{"access_token":"abc"}'],
      ['sb-yakfkuquvoszdtjeslfc-auth-token-code-verifier', 'nope'],
    ])
    const storage = {
      length: entries.size,
      key: (i: number) => Array.from(entries.keys())[i] ?? null,
      getItem: (key: string) => entries.get(key) ?? null,
    }
    assert.equal(localSupabaseSessionPresent(storage), true)
    entries.delete('sb-yakfkuquvoszdtjeslfc-auth-token')
    const gone = {
      length: entries.size,
      key: (i: number) => Array.from(entries.keys())[i] ?? null,
      getItem: (key: string) => entries.get(key) ?? null,
    }
    assert.equal(localSupabaseSessionPresent(gone), false)
  })
})
