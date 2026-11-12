import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import {
  MD_CLASE_BG,
  MD_HSL,
  ORDEN_MD,
  colorDia,
  colorMD,
  etiquetaMicrociclo,
  nombreSesion,
  resultadoPartido,
  semanaDelAno,
  tinte,
  todasCompletadas,
} from './calendarioColores.ts'

describe('calendarioColores', () => {
  it('cada MD de entrenamiento tiene un tono distinto', () => {
    const tonos = ORDEN_MD.map((md) => MD_HSL[md])
    assert.equal(new Set(tonos).size, ORDEN_MD.length)
  })

  it('el día de partido usa la localía, nunca el MD', () => {
    assert.equal(colorDia({ hayPartido: true, localiaPartido: 'local', md: 'MD-2' }), 'var(--primary)')
    assert.equal(colorDia({ hayPartido: true, localiaPartido: 'visitante' }), 'var(--info)')
    assert.equal(colorDia({ md: 'MD-3' }), MD_HSL['MD-3'])
    assert.equal(colorDia({ md: '' }), null)
    assert.equal(colorMD('MD'), null)
    assert.equal(colorMD('MD-5'), null)
  })

  it('el tinte es el mismo tono con alfa', () => {
    assert.equal(tinte(MD_HSL['MD+1']), 'hsl(142 71% 45% / 0.14)')
  })

  it('resultado con V/E/D', () => {
    assert.deepEqual(resultadoPartido(6, 2), { marcador: '6–2', marca: 'V', texto: 'victoria' })
    assert.equal(resultadoPartido(1, 1)?.marca, 'E')
    assert.equal(resultadoPartido(0, 3)?.marca, 'D')
    assert.equal(resultadoPartido(null, null), null)
    assert.equal(resultadoPartido(undefined, 2), null)
  })

  it('relleno solo si todas las sesiones están completadas', () => {
    assert.equal(todasCompletadas([]), false)
    assert.equal(todasCompletadas([{ estado: 'completada' }, { estado: 'planificada' }]), false)
    assert.equal(todasCompletadas([{ estado: 'completada' }, { estado: 'completada' }]), true)
  })

  it('nombre de sesión por número', () => {
    assert.equal(nombreSesion({ numero_sesion: 35, titulo: 'Duelos' }), 'S35 · Duelos')
    assert.equal(nombreSesion({ titulo: 'Duelos' }), 'Duelos')
  })

  it('microciclos numerados por fecha: más antiguo = número menor', () => {
    const a = etiquetaMicrociclo({ fecha_inicio: '2026-10-26' })
    const b = etiquetaMicrociclo({ fecha_inicio: '2026-11-02' })
    const c = etiquetaMicrociclo({ fecha_inicio: '2026-11-09T00:00:00' })
    const n = (s: string) => Number(s.replace(/\D/g, ''))
    assert.ok(n(a) < n(b) && n(b) < n(c))
    assert.equal(n(c) - n(b), 1)
    // No depende del orden de la lista ni de cuál es la semana actual.
    assert.equal(semanaDelAno('2026-11-09'), n(c))
  })

  it('las clases de MD_COLOR están escritas literalmente donde Tailwind las ve', () => {
    const src = readFileSync(new URL('../components/sesiones/SesionesTablaCal.tsx', import.meta.url), 'utf8')
    for (const md of ORDEN_MD) assert.ok(src.includes(MD_CLASE_BG[md]), `${md}: falta ${MD_CLASE_BG[md]}`)
  })
})
