import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { MOTIVOS_AUSENCIA } from './canonico.ts'

describe('motivos de ausencia de la convocatoria', () => {
  it('ofrece Trabajo y deja fuera Sanción', () => {
    const codes = MOTIVOS_AUSENCIA.map((m) => m.codigo)
    assert.equal(codes.includes('trabajo'), true)
    assert.equal(codes.includes('sancion'), false)
    assert.equal(MOTIVOS_AUSENCIA.find((m) => m.codigo === 'trabajo')?.nombre, 'Trabajo')
  })

  it('la convocatoria de la sesión toma la lista del catálogo', () => {
    const page = readFileSync(new URL('../../app/(dashboard)/sesiones/[id]/page.tsx', import.meta.url), 'utf8')
    const wizard = readFileSync(new URL('../../components/sesiones/AttendanceStep.tsx', import.meta.url), 'utf8')
    assert.match(page, /MOTIVOS_AUSENCIA_CATALOGO/)
    assert.match(wizard, /MOTIVOS_AUSENCIA_CATALOGO/)
    assert.doesNotMatch(page, /value: 'sancion'/)
    assert.doesNotMatch(wizard, /value: 'sancion'/)
  })
})
