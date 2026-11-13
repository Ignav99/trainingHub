import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  COLOR_POR_DEFECTO,
  MAX_TEXTO,
  PALETA_DIA,
  TEXTO_POR_DEFECTO,
  diasPersonalesDe,
  escribirDiaPersonal,
  fechasDescanso,
  fijarEnLista,
  hslColorDia,
  leerDiaPersonal,
  normalizarTexto,
  quitarDeLista,
} from './diaPersonal.ts'
import { MD_HSL } from './calendarioColores.ts'

describe('diaPersonal', () => {
  it('la paleta tiene entre 6 y 8 colores con clave y tono únicos, distintos de los MD', () => {
    assert.ok(PALETA_DIA.length >= 6 && PALETA_DIA.length <= 8)
    assert.equal(new Set(PALETA_DIA.map((p) => p.clave)).size, PALETA_DIA.length)
    assert.equal(new Set(PALETA_DIA.map((p) => p.hsl)).size, PALETA_DIA.length)
    // Distinto = tono a 14° o más, o saturación muy distinta (tierra vs naranja).
    const partes = (c: string) => c.split(' ').map((x) => parseFloat(x))
    for (const p of PALETA_DIA) {
      const [h, s] = partes(p.hsl)
      for (const md of Object.values(MD_HSL)) {
        const [t, ts] = partes(md)
        const d = Math.min(Math.abs(h - t), 360 - Math.abs(h - t))
        assert.ok(d >= 14 || Math.abs(s - ts) >= 40, `${p.clave} demasiado cerca de un MD (${p.hsl} vs ${md})`)
      }
    }
  })

  it('ida y vuelta por notas', () => {
    const notas = escribirDiaPersonal({ texto: '  Vacaciones  ', color: 'rosa' })
    assert.equal(notas, '{"texto":"Vacaciones","color":"rosa"}')
    assert.deepEqual(leerDiaPersonal({ tipo: 'festivo', notas }), { texto: 'Vacaciones', color: 'rosa' })
  })

  it('un descanso normal no es día personalizado', () => {
    assert.equal(leerDiaPersonal({ tipo: 'descanso', notas: null }), null)
    assert.equal(leerDiaPersonal({ tipo: 'descanso', notas: '{"texto":"x","color":"teal"}' }), null)
    assert.equal(leerDiaPersonal(null), null)
  })

  it('tolerante: notas vacías, texto plano, JSON roto o color desconocido', () => {
    assert.deepEqual(leerDiaPersonal({ tipo: 'festivo', notas: null }), { texto: TEXTO_POR_DEFECTO, color: COLOR_POR_DEFECTO })
    assert.deepEqual(leerDiaPersonal({ tipo: 'festivo', notas: 'Fiesta local' }), { texto: 'Fiesta local', color: COLOR_POR_DEFECTO })
    assert.deepEqual(leerDiaPersonal({ tipo: 'festivo', notas: '{"texto":' }), { texto: '{"texto":', color: COLOR_POR_DEFECTO })
    assert.deepEqual(leerDiaPersonal({ tipo: 'festivo', notas: '{"texto":"Viaje","color":"#ff0000"}' }), { texto: 'Viaje', color: COLOR_POR_DEFECTO })
    assert.deepEqual(leerDiaPersonal({ tipo: 'festivo', notas: '{"color":"oliva"}' }), { texto: TEXTO_POR_DEFECTO, color: 'oliva' })
  })

  it(`el texto se corta a ${MAX_TEXTO} caracteres (también con acentos y emojis)`, () => {
    assert.equal(normalizarTexto('a'.repeat(30)).length, MAX_TEXTO)
    assert.equal(Array.from(normalizarTexto('ñ'.repeat(30))).length, MAX_TEXTO)
    assert.equal(normalizarTexto('  dos   espacios '), 'dos espacios')
    assert.throws(() => escribirDiaPersonal({ texto: '   ', color: 'teal' }))
    assert.ok(escribirDiaPersonal({ texto: 'x'.repeat(40), color: 'teal' }).length <= 200)
  })

  it('color desconocido al escribir → por defecto; hsl siempre válido', () => {
    assert.equal(JSON.parse(escribirDiaPersonal({ texto: 'A', color: 'fucsia' })).color, COLOR_POR_DEFECTO)
    assert.equal(hslColorDia('nope'), PALETA_DIA[0].hsl)
  })

  it('separa descansos de días personalizados', () => {
    const filas = [
      { id: '1', fecha: '2026-11-10', tipo: 'descanso' as const, notas: null },
      { id: '2', fecha: '2026-11-11', tipo: 'festivo' as const, notas: '{"texto":"Vacaciones","color":"teal"}' },
    ]
    assert.deepEqual(Array.from(fechasDescanso(filas)), ['2026-11-10'])
    assert.deepEqual(diasPersonalesDe(filas), { '2026-11-11': { id: '2', texto: 'Vacaciones', color: 'teal' } })
  })

  it('listas optimistas: reemplaza por fecha y mantiene el orden', () => {
    const a = { id: 'a', fecha: '2026-11-10', tipo: 'descanso' as const }
    const b = { id: 'b', fecha: '2026-11-12', tipo: 'descanso' as const }
    const nueva = { id: 'tmp', fecha: '2026-11-11', tipo: 'festivo' as const, notas: 'x' }
    assert.deepEqual(fijarEnLista([a, b], nueva).map((x) => x.id), ['a', 'tmp', 'b'])
    assert.deepEqual(fijarEnLista([a, b], { ...b, tipo: 'festivo' }).map((x) => x.tipo), ['descanso', 'festivo'])
    assert.deepEqual(quitarDeLista([a, b], '2026-11-10').map((x) => x.id), ['b'])
  })
})
