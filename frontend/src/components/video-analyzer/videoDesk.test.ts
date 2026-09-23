import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_DESK_BUTTONS,
  clipRangeFromPress,
  migrateDeskButtons,
  looksLikeLegacyDefaultButtons,
  clampLayout,
  exposeLayouts,
  packDefaultLayouts,
  placeButtonLayout,
  resolveButtonLayouts,
  sanitizeLayout,
  shiftLayout,
  layoutsOverlap,
  clipFileName,
  matchRevisionFolderId,
  groupClipsByButton,
  lanesWithEvents,
  clipDisplayTitle,
  zoomCinta,
  panCinta,
  cintaWindow,
  cintaTickStep,
  clipsOnLane,
  normalizeShortcut,
  shortcutTaken,
  timingsLabel,
  idsForKeyboardClipDelete,
  removeClipFromPlaylist,
  removeClipsFromPlaylist,
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

  it('packs the default botonera into free zones without a fixed size scale', () => {
    const layouts = Object.values(packDefaultLayouts(DEFAULT_DESK_BUTTONS))
    assert.equal(layouts.length, 6)
    for (const layout of layouts) {
      assert.ok(layout.x >= 0 && layout.y >= 0)
      assert.ok(layout.x + layout.w <= 100.05)
      assert.ok(layout.y + layout.h <= 100.05)
    }
    for (let i = 0; i < layouts.length; i++) {
      for (let j = i + 1; j < layouts.length; j++) {
        assert.equal(layoutsOverlap(layouts[i], layouts[j], -0.25), false)
      }
    }
    const wide = packDefaultLayouts(DEFAULT_DESK_BUTTONS)['fase-ataque-org']
    const pairA = packDefaultLayouts(DEFAULT_DESK_BUTTONS)['fase-trans-of']
    const pairB = packDefaultLayouts(DEFAULT_DESK_BUTTONS)['fase-trans-def']
    assert.ok(wide.w > 80)
    assert.equal(pairA.y, pairB.y)
    assert.ok(pairA.w < 60 && pairB.w < 60)
  })

  it('keeps a saved zone and parks a new button in a free gap', () => {
    const saved = { x: 4, y: 4, w: 90, h: 20 }
    const buttons: CodeButton[] = [
      { id: 'a', label: 'A', color: '#000', preRoll: 1, postRoll: 1, layout: saved },
      { id: 'b', label: 'B', color: '#111', preRoll: 1, postRoll: 1 },
    ]
    const resolved = resolveButtonLayouts(buttons)
    assert.deepEqual(resolved.a, saved)
    assert.equal(layoutsOverlap(resolved.a, resolved.b, -0.2), false)
    assert.equal(sanitizeLayout({ x: 10 }), undefined)
    assert.deepEqual(clampLayout({ x: 90, y: 90, w: 40, h: 40 }), { x: 60, y: 60, w: 40, h: 40 })
    assert.deepEqual(shiftLayout({ x: 10, y: 10, w: 20, h: 20 }, -30, 5), { x: 0, y: 15, w: 20, h: 20 })
    const parked = placeButtonLayout([saved])
    assert.equal(layoutsOverlap(saved, parked, -0.2), false)
  })

  it('keeps a covered button visible when a larger one is dropped on it', () => {
    const exposed = exposeLayouts({
      big: { x: 2, y: 2, w: 90, h: 40, z: 3 },
      small: { x: 12, y: 10, w: 28, h: 14, z: 1 },
    })
    assert.ok((exposed.small.z ?? 0) > (exposed.big.z ?? 0))
    const same = exposeLayouts({
      a: { x: 10, y: 10, w: 40, h: 22, z: 4 },
      b: { x: 10, y: 10, w: 40, h: 22, z: 1 },
    })
    const area = same.b.w * same.b.h
    const overlapW = Math.max(0, Math.min(same.a.x + same.a.w, same.b.x + same.b.w) - Math.max(same.a.x, same.b.x))
    const overlapH = Math.max(0, Math.min(same.a.y + same.a.h, same.b.y + same.b.h) - Math.max(same.a.y, same.b.y))
    assert.ok((overlapW * overlapH) / area < 0.9)
  })

  it('keeps extra custom buttons and fills size', () => {
    const custom: CodeButton[] = [
      { id: 'x', label: '2v1 banda', color: '#fff', preRoll: 2, postRoll: 4 },
    ]
    const next = migrateDeskButtons(custom)
    assert.equal(next[0].label, '2v1 banda')
    assert.equal(next[0].size, 'm')
    assert.equal(next[0].preRoll, 2)
    assert.equal(next[0].layout, undefined)
  })

  it('keeps a valid button zone through migration', () => {
    const custom: CodeButton[] = [
      { id: 'x', label: '2v1 banda', color: '#fff', preRoll: 2, postRoll: 4, layout: { x: 12, y: 8, w: 40, h: 22 } },
    ]
    assert.deepEqual(migrateDeskButtons(custom)[0].layout, { x: 12, y: 8, w: 40, h: 22 })
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

  it('creates a timeline lane only after the first event of that type', () => {
    const buttons: CodeButton[] = [
      { id: 'a', label: 'Ataque', color: '#111', preRoll: 1, postRoll: 1 },
      { id: 'b', label: 'Defensa', color: '#222', preRoll: 1, postRoll: 1 },
      { id: 'c', label: 'ABP', color: '#333', preRoll: 1, postRoll: 1 },
    ]
    assert.deepEqual(lanesWithEvents(buttons, []), [])
    const first = lanesWithEvents(buttons, [
      { id: '1', buttonId: 'b', timestamp: 40, startTime: 35, endTime: 45 },
    ])
    assert.deepEqual(first.map((b) => b.id), ['b'])
    const later = lanesWithEvents(buttons, [
      { id: '1', buttonId: 'b', timestamp: 40, startTime: 35, endTime: 45 },
      { id: '2', buttonId: 'a', timestamp: 10, startTime: 5, endTime: 15 },
      { id: '3', buttonId: 'b', timestamp: 50, startTime: 48, endTime: 55 },
      { id: '4', buttonId: 'gone', timestamp: 3, startTime: 1, endTime: 4 },
    ])
    assert.deepEqual(later.map((b) => b.id), ['b', 'a'])
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

  it('keeps keyboard shortcuts unique and reserved keys free', () => {
    assert.equal(normalizeShortcut('A'), 'a')
    assert.equal(normalizeShortcut(' '), undefined)
    assert.equal(normalizeShortcut('h'), undefined)
    assert.equal(normalizeShortcut('Delete'), undefined)
    assert.equal(normalizeShortcut('Backspace'), undefined)
    const buttons: CodeButton[] = [
      { id: 'a', label: 'A', color: '#000', shortcut: '1', preRoll: 1, postRoll: 1 },
      { id: 'b', label: 'B', color: '#000', shortcut: '2', preRoll: 1, postRoll: 1 },
    ]
    assert.equal(shortcutTaken(buttons, '1'), true)
    assert.equal(shortcutTaken(buttons, '1', 'a'), false)
    assert.equal(shortcutTaken(buttons, '9'), false)
    assert.equal(timingsLabel({ ...buttons[0], captureMode: 'range' }), 'inicio → fin')
  })

  it('deletes the focused clip from a playlist and keeps the rest playing', () => {
    const events: CodeEvent[] = [
      { id: 'a', buttonId: 'x', timestamp: 1, startTime: 0, endTime: 4 },
      { id: 'b', buttonId: 'x', timestamp: 8, startTime: 6, endTime: 10 },
      { id: 'c', buttonId: 'x', timestamp: 14, startTime: 12, endTime: 16 },
    ]
    assert.deepEqual(idsForKeyboardClipDelete('b', ['a', 'b', 'c']), ['b'])
    assert.deepEqual(idsForKeyboardClipDelete(null, ['a', 'c']), ['a', 'c'])
    const next = removeClipFromPlaylist({ title: 'Ataque', clips: events, startId: 'b' }, 'b')
    assert.deepEqual(next?.clips.map((c) => c.id), ['a', 'c'])
    assert.equal(next?.startId, 'c')
    assert.equal(removeClipFromPlaylist({ title: 'Ataque', clips: [events[0]], startId: 'a' }, 'a'), null)
    const afterTwo = removeClipsFromPlaylist({ title: 'Ataque', clips: events, startId: 'b' }, ['b', 'c'])
    assert.deepEqual(afterTwo?.clips.map((c) => c.id), ['a'])
    assert.equal(afterTwo?.startId, 'a')
  })
})
