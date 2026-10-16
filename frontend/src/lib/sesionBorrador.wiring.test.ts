import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function read(rel: string) {
  return readFileSync(join(root, rel), 'utf8')
}

describe('la creación de sesión se guarda sola', () => {
  it('el asistente persiste el borrador al salir y al cambiar de paso', () => {
    const page = read('app/(dashboard)/sesiones/nueva/page.tsx')
    assert.match(page, /persistDraft/)
    assert.match(page, /pagehide/)
    assert.match(page, /visibilitychange/)
    assert.match(page, /continuar/)
    assert.match(page, /Borrador guardado/)
    assert.match(page, /batchUpdateTareas/)
  })

  it('la lista marca la sesión sin terminar y abre el punto donde se quedó', () => {
    const list = read('app/(dashboard)/sesiones/page.tsx')
    assert.match(list, /Sin terminar/)
    assert.match(list, /Te quedaste en/)
    assert.match(list, /continueHref/)
  })

  it('la ficha reabre la fase guardada y se puede volver al asistente', () => {
    const detail = read('app/(dashboard)/sesiones/[id]/page.tsx')
    assert.match(detail, /Creación sin terminar/)
    assert.match(detail, /pasoToPhase/)
    assert.match(detail, /continuarWizardHref/)
    assert.match(detail, /clearCreacion/)
  })
})
