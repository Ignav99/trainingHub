import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isBackendUnavailable, retryWhileBackendWakes } from './backendRetry.ts'

const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { statusCode: status })

describe('isBackendUnavailable', () => {
  it('treats network errors and 5xx as "not answering"', () => {
    assert.equal(isBackendUnavailable(new TypeError('Failed to fetch')), true)
    assert.equal(isBackendUnavailable(httpError(502)), true)
    assert.equal(isBackendUnavailable(httpError(503)), true)
  })

  it('treats real answers as final', () => {
    assert.equal(isBackendUnavailable(httpError(401)), false)
    assert.equal(isBackendUnavailable(httpError(404)), false)
    assert.equal(isBackendUnavailable(httpError(422)), false)
  })
})

describe('retryWhileBackendWakes', () => {
  const clock = () => {
    let t = 0
    return { now: () => t, sleep: async (ms: number) => { t += ms } }
  }

  it('retries until the backend answers', async () => {
    let calls = 0
    const result = await retryWhileBackendWakes(async () => {
      calls++
      if (calls < 4) throw new TypeError('Failed to fetch')
      return 'ok'
    }, { ...clock(), delayMs: 1000, totalMs: 60_000 })
    assert.equal(result, 'ok')
    assert.equal(calls, 4)
  })

  it('does not retry a wrong password', async () => {
    let calls = 0
    await assert.rejects(
      retryWhileBackendWakes(async () => { calls++; throw httpError(401) }, clock()),
      (e: any) => e.statusCode === 401
    )
    assert.equal(calls, 1)
  })

  it('gives up after the deadline', async () => {
    let calls = 0
    await assert.rejects(
      retryWhileBackendWakes(async () => { calls++; throw httpError(502) }, { ...clock(), delayMs: 1000, totalMs: 5000 }),
      (e: any) => e.statusCode === 502
    )
    assert.equal(calls, 5)
  })
})
