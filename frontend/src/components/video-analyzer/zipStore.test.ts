import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildZipStore, crc32 } from './zipStore.ts'

describe('zip store', () => {
  it('checksums the ISO CRC32 vector', () => {
    const data = new TextEncoder().encode('123456789')
    assert.equal(crc32(data), 0xcbf43926)
  })

  it('writes a zip with folder prefixes for clip packs', async () => {
    const zip = buildZipStore([
      { path: 'Ataque organizado/clip.mp4', data: new TextEncoder().encode('aaa') },
      { path: 'ABP ofensiva/clip.mp4', data: new TextEncoder().encode('bbb') },
    ])
    const bytes = new Uint8Array(await zip.arrayBuffer())
    assert.equal(bytes[0], 0x50)
    assert.equal(bytes[1], 0x4b)
    const text = new TextDecoder().decode(bytes)
    assert.match(text, /Ataque organizado\/clip\.mp4/)
    assert.match(text, /ABP ofensiva\/clip\.mp4/)
  })
})
