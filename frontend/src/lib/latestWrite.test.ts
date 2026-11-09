import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createLatestWrite } from './latestWrite.ts'

describe('createLatestWrite', () => {
  it('una escritura lenta no pisa el texto que llegó después', async () => {
    const seen: string[] = []
    let releaseFirst: (() => void) | null = null
    const saver = createLatestWrite<string>(async (value) => {
      seen.push(`start:${value}`)
      if (value === 'olf') {
        await new Promise<void>((resolve) => {
          releaseFirst = resolve
        })
      }
      seen.push(`end:${value}`)
    })

    const first = saver.submit('olf')
    const second = saver.submit('olfato del grupo')
    assert.deepEqual(seen, ['start:olf'])
    releaseFirst?.()
    await first
    await second
    assert.deepEqual(seen, ['start:olf', 'end:olf', 'start:olfato del grupo', 'end:olfato del grupo'])
    assert.equal(saver.pending(), false)
  })

  it('si la primera falla, el último texto sigue pendiente y se reintenta', async () => {
    const seen: string[] = []
    let fail = true
    const saver = createLatestWrite<string>(async (value) => {
      seen.push(value)
      if (fail) throw new Error('red')
    })

    await assert.rejects(() => saver.submit('objetivo'))
    assert.equal(saver.pending(), true)
    fail = false
    await saver.flush()
    assert.deepEqual(seen, ['objetivo', 'objetivo'])
    assert.equal(saver.pending(), false)
  })
})
