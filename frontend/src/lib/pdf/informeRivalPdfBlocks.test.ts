import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { PreMatchIntel, RivalScoutStrategy } from '@/types'
import {
  collectContextoPdfBlocks,
  collectIntelPdfLines,
  collectOncePdfBlock,
  formatCampoLine,
} from './informeRivalPdfBlocks.ts'

describe('informe rival PDF contexto + once', () => {
  it('formats pitch size and coach notes as CONTEXTO', () => {
    assert.equal(formatCampoLine('105 x 68'), 'Campo 105 x 68')
    const blocks = collectContextoPdfBlocks({
      notas: 'Presiona alto y corta por dentro',
      dimensiones_campo: '105 x 68',
      actitud_estilo: 'Directo',
    })
    assert.equal(blocks[0]?.title, 'CONTEXTO')
    assert.deepEqual(blocks[0]?.lines, [
      'Presiona alto y corta por dentro',
      'Campo 105 x 68',
      'Directo',
    ])
  })

  it('adds RFEF intel as a contexto block', () => {
    const intel = {
      generated_at: '2026-09-18',
      rival_nombre: 'Atlético',
      clasificacion: { posicion: 5, puntos: 24 },
      contexto_stats: {
        actas_analizadas: 6,
        actas_con_goles_minuto: 4,
        racha: {
          estado: 'caliente',
          etiqueta: 'Racha caliente',
          victorias: 4,
          empates: 1,
          derrotas: 0,
          puntos: 13,
          ultimos_5: ['V', 'V', 'E', 'V', 'V'],
        },
        liga: { gf: 18, gc: 9 },
        casa: { pj: 3, pg: 3, pe: 0, pp: 0, gf: 10, gc: 2 },
        fuera: { pj: 3, pg: 1, pe: 1, pp: 1, gf: 8, gc: 7 },
        mitades: { marcados_1t: 6, marcados_2t: 12, encajados_1t: 4, encajados_2t: 5 },
        goles_por_minuto: { buckets: [], marcados: [], encajados: [] },
      },
      goleadores_rival: [{ jugador: 'García', goles: 7 }],
      tarjetas: {
        total_actas: 6,
        jugadores: [
          { nombre: 'López', amarillas: 5, rojas: 0, ciclos_cumplidos: 1, estado: 'Sancionado' },
          { nombre: 'Ruiz', amarillas: 4, rojas: 0, ciclos_cumplidos: 0, estado: 'Apercibido' },
        ],
      },
    } as PreMatchIntel

    const lines = collectIntelPdfLines(intel)
    assert.match(lines.join(' | '), /Clasificación: 5º/)
    assert.match(lines.join(' | '), /Racha caliente/)
    assert.match(lines.join(' | '), /Sancionados: López/)
    const blocks = collectContextoPdfBlocks({ notas: 'Olfato' }, intel)
    assert.equal(blocks.length, 2)
    assert.equal(blocks[1]?.title, 'CONTEXTO RFEF')
  })

  it('lists the placed XI with slot labels', () => {
    const estrategia: RivalScoutStrategy = {
      sistema: '4-4-2',
      once_probable: {
        actas_analizadas: 3,
        colocacion: { POR: 'Portero Uno', DC_L: 'Delantero' },
        jugadores: [
          { nombre: 'Portero Uno', dorsal: 1, apariciones: 3 },
          { nombre: 'Delantero', dorsal: 9, apariciones: 2, comentario: 'llega atrasado' },
        ],
      },
    }
    const block = collectOncePdfBlock(estrategia)
    assert.equal(block?.title, 'COMENTARIOS')
    assert.equal(block?.lines.some((line) => line.text.includes('Portero Uno')), false)
    assert.ok(block?.lines.some((line) => line.text.includes('Delantero') && line.text.includes('llega atrasado')))
  })

  it('keeps every comment and the attribute icons', () => {
    const block = collectOncePdfBlock({
      once_probable: {
        actas_analizadas: 1,
        jugadores: [
          {
            nombre: 'Rápido',
            dorsal: 7,
            apariciones: 1,
            comentario: 'Ataca el espacio una y otra vez sin recortar este texto largo',
            atributos: { correcaminos: true, bombilla: true },
          },
          {
            nombre: 'Cierre',
            dorsal: 4,
            apariciones: 1,
            atributos: { muro: true },
          },
        ],
      },
    })
    assert.equal(block?.lines.length, 2)
    assert.match(block?.lines[0]?.text || '', /Ataca el espacio una y otra vez/)
    assert.deepEqual(block?.lines[0]?.icons, ['correcaminos', 'bombilla'])
    assert.deepEqual(block?.lines[1]?.icons, ['muro'])
  })
})
