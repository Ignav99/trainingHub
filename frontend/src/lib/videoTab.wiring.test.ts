import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

function read(rel: string) {
  return readFileSync(join(root, rel), 'utf8')
}

describe('video analysis in another tab', () => {
  it('opens /video-analisis in a new tab from the informe and the sidebar', () => {
    const link = read('components/video-analyzer/OpenVideoTabLink.tsx')
    const scout = read('components/microciclos/RivalScout.tsx')
    const layout = read('app/(dashboard)/layout.tsx')
    const mobile = read('components/ui/mobile-nav.tsx')

    assert.match(link, /href="\/video-analisis"/)
    assert.match(link, /target="_blank"/)
    assert.match(link, /Abrir vídeo en otra pestaña/)
    assert.match(scout, /OpenVideoTabLink/)
    assert.match(layout, /OpenVideoTabLink/)
    assert.match(mobile, /OpenVideoTabLink/)
  })

  it('does not wipe the shared login on a SIGNED_OUT from another tab', () => {
    const auth = read('stores/authStore.ts')
    assert.match(auth, /shouldClearSharedAuthOnSignedOut/)
    assert.match(auth, /readPersistedAuth/)
    assert.match(auth, /explicitLogout/)
    const club = read('stores/clubStore.ts')
    assert.match(club, /onboarding_complete/)
  })
})