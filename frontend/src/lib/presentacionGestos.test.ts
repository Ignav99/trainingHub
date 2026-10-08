import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isSlideNavKey, swipeSlideDelta } from './presentacionGestos.ts'

describe('presentation video safe space', () => {
  it('ignores a long horizontal stroke that starts on the video', () => {
    assert.equal(swipeSlideDelta({ startX: 40, endX: 280, videoSafe: true }), 0)
    assert.equal(swipeSlideDelta({ startX: 280, endX: 40, videoSafe: true }), 0)
  })

  it('still changes slides when the stroke is outside the video', () => {
    assert.equal(swipeSlideDelta({ startX: 200, endX: 40, videoSafe: false }), 1)
    assert.equal(swipeSlideDelta({ startX: 40, endX: 200, videoSafe: false }), -1)
    assert.equal(swipeSlideDelta({ startX: 40, endX: 80, videoSafe: false }), 0)
    assert.equal(swipeSlideDelta({ startX: null, endX: 200, videoSafe: false }), 0)
  })

  it('treats arrows and paging as slide keys', () => {
    assert.equal(isSlideNavKey('ArrowRight'), true)
    assert.equal(isSlideNavKey('ArrowLeft'), true)
    assert.equal(isSlideNavKey('PageDown'), true)
    assert.equal(isSlideNavKey(' '), true)
    assert.equal(isSlideNavKey('Escape'), false)
    assert.equal(isSlideNavKey('f'), false)
  })
})
