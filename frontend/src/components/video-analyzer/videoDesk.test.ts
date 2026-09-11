import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_DESK_BUTTONS,
  clipRangeFromPress,
  migrateDeskButtons,
  looksLikeLegacyDefaultButtons,
  clipFileName,
  matchRevisionFolderId,
  groupClipsByButton,
  clipDisplayTitle,
  zoomCinta,
  panCinta,
  cintaWindow,
  cintaTickStep,
  clipsOnLane,
} from './videoDesk.ts'
import type { CodeButton, CodeEvent } from './types.ts'

describe('video desk coding', () => {
  it('uses each button pre/post so organized attack is not the same clip as ABP', () => {
    const ataque = DEFAULT_DESK_BUTTONS.find((b) => b.fase === 'ataque_organizado')!
    const abp = DEFAULT_DESK_BUTTONS.find((b) => b.fase === 'abp_ofensiva')!
    const at = clipRangeFromPress(60, 120, ataque.preRoll, ataque.postRoll)
    const set = clipRangeFromPress(60, 120, abp.preRoll, abp.postRoll)
    assert.equal(at.startTime, 55)
    assert.equal(at.endTime, 68)
    assert.equal(set.startTime, 52)
    assert.equal(set.endTime, 72)
    assert.ok(set.endTime - set.startTime > at.endTime - at.startTime)
  })

  it('replaces the old 4 default buttons with the 6 phases', () => {
    const legacy: CodeButton[] = [
      { id: 'btn-1', label: 'Ataque', color: '#ef4444', shortcut: '1', preRoll: 5, postRoll: 5 },
      { id: 'btn-2', label: 'Defensa', color: '#3b82f6', shortcut: '2', preRoll: 5, postRoll: 5 },
      { id: 'btn-3', label: 'Transición', color: '#22c55e', shortcut: '3', preRoll: 4, postRoll: 6 },
      { id: 'btn-4', label: 'Córner', color: '#f59e0b', shortcut: '4', preRoll: 3, postRoll: 8 },
    ]
    assert.equal(looksLikeLegacyDefaultButtons(legacy), true)
    const next = migrateDeskButtons(legacy)
    assert.equal(next.length, 6)
    assert.ok(next.every((b) => Boolean(b.size && b.fase)))
    assert.ok(next.some((b) => b.fase === 'abp_defensiva' && b.preRoll === 8 && b.postRoll === 12))
  })

  it('keeps extra custom buttons and fills size', () => {
    const custom: CodeButton[] = [
      { id: 'x', label: '2v1 banda', color: '#fff', preRoll: 2, postRoll: 4 },
    ]
    const next = migrateDeskButtons(custom)
    assert.equal(next[0].label, '2v1 banda')
    assert.equal(next[0].size, 'm')
    assert.equal(next[0].preRoll, 2)
  })

  it('names clip files so they can be dropped into another PC folder', () => {
    assert.equal(
      clipFileName('Ataque organizado', 64, 78),
      'Ataque organizado — 01.04-01.18.mp4'
    )
    assert.equal(clipFileName('A/B:C', 0, 3), 'A B C — 00.00-00.03.mp4')
    assert.equal(clipFileName('ABP', 0, 3, 'webm'), 'ABP — 00.00-00.03.webm')
  })

  it('preselects the revision folder even when informe uses other fase ids', () => {
    const folders = [
      { id: 'a', fase: 'balon_parado_ofensivo', parent_id: null },
      { id: 'b', fase: 'ataque_organizado', parent_id: null },
    ]
    assert.equal(matchRevisionFolderId(folders, 'abp_ofensiva'), 'a')
    assert.equal(matchRevisionFolderId(folders, 'ataque_organizado'), 'b')
  })

  it('groups clips under the button that created them', () => {
    const events: CodeEvent[] = [
      { id: '1', buttonId: 'fase-ataque-org', timestamp: 10, startTime: 5, endTime: 18 },
      { id: '2', buttonId: 'gone', timestamp: 20, startTime: 18, endTime: 26, title: 'Solo' },
    ]
    const groups = groupClipsByButton(DEFAULT_DESK_BUTTONS, events)
    const ataque = groups.find((g) => g.button?.fase === 'ataque_organizado')
    const orphan = groups.find((g) => g.button === null)
    assert.equal(ataque?.clips.length, 1)
    assert.equal(orphan?.clips.length, 1)
    assert.equal(clipDisplayTitle(events[1], null), 'Solo')
  })

  it('zooms the tape around the playhead and keeps the window inside the match', () => {
    const full = cintaWindow(5400, 1, 0)
    assert.equal(full.viewStart, 0)
    assert.equal(full.viewEnd, 5400)
    const inAt = zoomCinta(5400, 1, 0, 1200, 4)
    assert.ok(inAt.zoom > 1)
    assert.ok(inAt.visible < full.visible)
    assert.ok(inAt.viewStart <= 1200 && inAt.viewEnd >= 1200)
    const panned = panCinta(5400, inAt.zoom, inAt.viewStart, 30)
    assert.ok(panned.viewStart > inAt.viewStart - 0.001)
    assert.equal(cintaTickStep(8), 1)
    assert.equal(cintaTickStep(900), 60)
  })

  it('collects every clip on a timeline lane so that row can be exported together', () => {
    const events: CodeEvent[] = [
      { id: 'b', buttonId: 'fase-ataque-org', timestamp: 40, startTime: 35, endTime: 48 },
      { id: 'a', buttonId: 'fase-ataque-org', timestamp: 10, startTime: 5, endTime: 18 },
      { id: 'd', buttonId: 'fase-defensa-org', timestamp: 20, startTime: 15, endTime: 28 },
    ]
    const lane = clipsOnLane(events, 'fase-ataque-org')
    assert.deepEqual(lane.map((c) => c.id), ['a', 'b'])
  })
})
