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
  tonoCasa,
  CASA_RESERVA_HSL,
} from './calendarioColores.ts'

describe('calendarioColores', () => {
  it('cada MD de entrenamiento tiene un tono distinto', () => {
    const tonos = ORDEN_MD.map((md) => MD_HSL[md])
    assert.equal(new Set(tonos).size, ORDEN_MD.length)
  })

  it('el día de partido usa la localía, nunca el MD', () => {
    assert.equal(colorDia({ hayPartido: true, localiaPartido: 'local', md: 'MD-2' }), 'var(--casa, var(--primary))')
    assert.equal(colorDia({ hayPartido: true, localiaPartido: 'visitante' }), 'var(--info)')
    assert.equal(colorDia({ md: 'MD-3' }), MD_HSL['MD-3'])
    assert.equal(colorDia({ md: '' }), null)
    assert.equal(colorMD('MD'), null)
    assert.equal(colorMD('MD-5'), null)
  })

  it('casa nunca es gris ni azul como fuera', () => {
    // Club negro o gris: el tinte de --primary se leía como día de otro mes.
    assert.equal(tonoCasa('#111111'), CASA_RESERVA_HSL)
    assert.equal(tonoCasa('#808080'), CASA_RESERVA_HSL)
    assert.equal(tonoCasa(null), CASA_RESERVA_HSL)
    assert.equal(tonoCasa('nope'), CASA_RESERVA_HSL)
    // Club azul marino: chocaría con fuera (info).
    assert.equal(tonoCasa('#1a3a6b'), CASA_RESERVA_HSL)
    // Club con color: su tono, saturación media, luminosidad fija.
    const verde = tonoCasa('#0b6b3a').split(' ')
    assert.ok(Math.abs(Number(verde[0]) - 150) <= 2)
    assert.equal(verde[2], '38%')
    assert.ok(parseFloat(verde[1]) >= 45)
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
