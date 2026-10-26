import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { shouldPersistOwnedDoc, weeklyFallbackForRival } from './ownedDocument.ts'

describe('owned document autosave', () => {
  it('does not save another match while its document is still on screen', () => {
    assert.equal(shouldPersistOwnedDoc('rival-a', 'rival-b', true), false)
    assert.equal(shouldPersistOwnedDoc(null, 'rival-b', true), false)
    assert.equal(shouldPersistOwnedDoc('rival-b', 'rival-b', false), false)
  })

  it('saves only the document loaded for this match after an edit', () => {
    assert.equal(shouldPersistOwnedDoc('rival-b', 'rival-b', true), true)
  })

  it('does not reuse the previous rival as fallback', () => {
    assert.equal(weeklyFallbackForRival(true, { notas: 'otro partido' }), undefined)
    assert.deepEqual(weeklyFallbackForRival(false, { notas: 'este' }), { notas: 'este' })
    assert.equal(weeklyFallbackForRival(false, null), undefined)
  })
})
