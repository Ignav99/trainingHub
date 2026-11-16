import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  isLocalVideoFile,
  localVideoFingerprint,
  releaseVideoElement,
  videoMediaMessage,
} from './localVideoFile.ts'

const here = dirname(fileURLToPath(import.meta.url))

describe('local match file', () => {
  it('accepts a camera file whose browser left the MIME empty', () => {
    assert.equal(isLocalVideoFile({ type: '', name: 'Jornada 12 vs Nervion.mp4' }), true)
    assert.equal(isLocalVideoFile({ type: 'application/octet-stream', name: 'partido.mts' }), true)
    assert.equal(isLocalVideoFile({ type: 'video/mp4', name: 'clip' }), true)
    assert.equal(isLocalVideoFile({ type: '', name: 'acta.pdf' }), false)
    assert.equal(isLocalVideoFile({ type: 'text/plain', name: 'notas.txt' }), false)
  })

  it('builds the same fingerprint the API stores', () => {
    assert.equal(
      localVideoFingerprint('partido.mp4', 5_000_000_000, 5_400_000),
      'partido.mp4|5000000000|5400000',
    )
    assert.equal(localVideoFingerprint('  ', 1.2, Number.NaN), 'local_video|1|0')
  })

  it('releases the probe element before the blob URL can be revoked', () => {
    const calls: string[] = []
    releaseVideoElement({
      pause: () => calls.push('pause'),
      removeAttribute: (name) => calls.push(`remove:${name}`),
      load: () => calls.push('load'),
    })
    assert.deepEqual(calls, ['pause', 'remove:src', 'load'])
  })

  it('names a decode failure instead of staying silent', () => {
    assert.match(videoMediaMessage(4), /navegador/)
    assert.match(videoMediaMessage(3), /decodificarlo/)
    assert.match(videoMediaMessage(undefined), /No se ha podido abrir/)
  })

  it('opens the desk on the one player that will show the match', () => {
    const page = readFileSync(join(here, '../../app/(dashboard)/video-analisis/page.tsx'), 'utf8')
    const player = readFileSync(join(here, 'VideoPlayer.tsx'), 'utf8')
    assert.equal(page.includes('readLocalVideoFingerprint'), false)
    assert.match(page, /isLocalVideoFile/)
    assert.match(page, /setAnalyzerFile\(f\)/)
    assert.match(page, /onLocalDuration=\{handleLocalDuration\}/)
    assert.equal(player.includes("preload={playOnlyChrome ? 'metadata' : 'auto'}"), false)
    assert.match(player, /preload="metadata"/)
    const sample = player.slice(player.indexOf('const sample ='), player.indexOf('const onPlay ='))
    assert.equal(sample.includes('snapshotVideoFrame'), false)
    assert.match(player, /Abriendo el vídeo/)
  })
})
