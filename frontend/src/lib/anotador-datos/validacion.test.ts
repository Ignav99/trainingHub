import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { snapshotVacio } from './estado.ts'
import { resumenAvisos, validarPartido, type ConvocadoVal } from './validacion.ts'

const conv: ConvocadoVal[] = Array.from({ length: 16 }, (_, i) => ({ id: `c${i + 1}`, nombre: `Jugador ${i + 1}`, dorsal: i + 1 }))
const slots = (n = 11) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`s${i + 1}`, `c${i + 1}`]))
const ev = (id: string, minute: number, type: string, extra: Record<string, unknown> = {}) =>
  ({ id, minute, half: minute > 45 ? 2 : 1, type, side: type === 'gol_contra' ? 'rival' : 'us', ...extra }) as any

function base(over: Record<string, unknown> = {}) {
  return { ...snapshotVacio(), started: true, slots: slots(), kickoffSlots: slots(), kickoffForm: '4-3-3', half1Ms: 45 * 60_000, ...over } as any
}
const codigos = (s: any, o?: any, c = conv) => validarPartido(s, c, o).map((a) => a.codigo)

describe('validarPartido', () => {
  it('un partido coherente no genera avisos', () => {
    const s = base({
      closed: true,
      events: [
        ev('1', 10, 'gol', { convId: 'c9' }),
        ev('2', 20, 'amarilla', { convId: 'c4' }),
        ev('3', 30, 'gol_contra', { rivalDorsal: 9 }),
        ev('4', 60, 'cambio', { convId: 'c2', relatedConvId: 'c12', slotId: 's2' }),
      ],
      slots: { ...slots(), s2: 'c12' },
      half2Ms: 47 * 60_000,
      half: 2,
    })
    assert.deepEqual(codigos(s), [])
  })

  it('amarillas: segunda sin roja, tres amarillas, roja duplicada', () => {
    const dos = base({ events: [ev('a', 10, 'amarilla', { convId: 'c3' }), ev('b', 30, 'amarilla', { convId: 'c3' })] })
    const a = validarPartido(dos, conv).find((x) => x.codigo === 'segunda_amarilla_sin_roja')!
    assert.equal(a.severidad, 'error')
    assert.deepEqual(a.eventIds, ['a', 'b'])
    assert.deepEqual(a.convIds, ['c3'])
    assert.equal(a.accion, 'anadir_roja')
    // con la roja ya no avisa
    const ok = base({ events: [...dos.events, ev('r', 30, 'roja', { convId: 'c3', slotId: 's3' })], slots: { ...slots(), s3: undefined } })
    assert.ok(!codigos(ok).includes('segunda_amarilla_sin_roja'))
    const tres = base({ events: ['a', 'b', 'c'].map((i, k) => ev(i, 10 + k, 'amarilla', { convId: 'c3' })) })
    assert.ok(codigos(tres).includes('tres_amarillas'))
    const rojas = base({ events: [ev('r1', 10, 'roja', { convId: 'c3' }), ev('r2', 12, 'roja', { convId: 'c3' })] })
    assert.ok(codigos(rojas).includes('roja_duplicada'))
  })

  it('amarillas del rival se agrupan por dorsal', () => {
    const s = base({ events: [ev('a', 10, 'amarilla', { side: 'rival', rivalDorsal: 5 }), ev('b', 40, 'amarilla', { side: 'rival', rivalDorsal: 5 })] })
    const a = validarPartido(s, conv).find((x) => x.codigo === 'segunda_amarilla_sin_roja')!
    assert.match(a.mensaje, /rival #5/)
  })

  it('eventos tras expulsión o sustitución', () => {
    const s = base({
      events: [
        ev('r', 20, 'roja', { convId: 'c5', slotId: 's5' }),
        ev('f', 30, 'falta', { convId: 'c5' }),
        ev('c', 50, 'cambio', { convId: 'c2', relatedConvId: 'c12', slotId: 's2' }),
        ev('g', 70, 'gol', { convId: 'c2' }),
      ],
      slots: { ...slots(), s5: undefined, s2: 'c12' },
    })
    const av = validarPartido(s, conv)
    assert.equal(av.find((a) => a.codigo === 'evento_tras_expulsion')!.eventIds[0], 'f')
    assert.equal(av.find((a) => a.codigo === 'evento_tras_sustitucion')!.eventIds[0], 'g')
    // en el mismo minuto no se considera "tras"
    const mismo = base({ events: [ev('r', 20, 'roja', { convId: 'c5' }), ev('f', 20, 'falta', { convId: 'c5' })], slots: { ...slots(), s5: undefined } })
    assert.ok(!codigos(mismo).includes('evento_tras_expulsion'))
  })

  it('cambios: sale quien no está, entra quien ya está, entra expulsado, reentrada, demasiados', () => {
    const s = base({
      events: [
        ev('x1', 50, 'cambio', { convId: 'c14', relatedConvId: 'c12', slotId: 's2' }), // c14 no está
        ev('x2', 51, 'cambio', { convId: 'c1', relatedConvId: 'c2', slotId: 's1' }), // c2 ya está
      ],
    })
    const c = codigos(s)
    assert.ok(c.includes('cambio_sale_no_en_campo'))
    assert.ok(c.includes('cambio_entra_ya_en_campo'))
    const exp = base({
      events: [
        ev('r', 20, 'roja', { convId: 'c5', slotId: 's5' }),
        ev('x', 60, 'cambio', { convId: 'c1', relatedConvId: 'c5', slotId: 's1' }),
      ],
    })
    assert.ok(codigos(exp).includes('cambio_entra_expulsado'))
    const re = base({
      events: [
        ev('x1', 50, 'cambio', { convId: 'c1', relatedConvId: 'c12', slotId: 's1' }),
        ev('x2', 70, 'cambio', { convId: 'c12', relatedConvId: 'c1', slotId: 's1' }),
      ],
    })
    assert.ok(codigos(re).includes('cambio_reentrada'))
    assert.ok(!codigos(re, { cambiosIlimitados: true }).includes('cambio_reentrada'))
    const muchos = base({
      events: Array.from({ length: 6 }, (_, i) => ev(`m${i}`, 50 + i, 'cambio', { convId: `c${i + 1}`, relatedConvId: `c${i + 12}`, slotId: `s${i + 1}` })),
      slots: Object.fromEntries(Array.from({ length: 11 }, (_, i) => [`s${i + 1}`, i < 5 ? `c${i + 12}` : `c${i + 1}`])),
    })
    const dm = validarPartido(muchos, conv).find((a) => a.codigo === 'demasiados_cambios')
    assert.ok(dm)
    assert.deepEqual(dm!.eventIds, ['m5'])
    assert.ok(!codigos(muchos, { cambiosIlimitados: true }).includes('demasiados_cambios'))
    assert.ok(!codigos(muchos, { maxCambios: 6 }).includes('demasiados_cambios'))
  })

  it('más de 11 y menos de 7 en el campo', () => {
    assert.ok(codigos(base({ slots: slots(12) })).includes('mas_de_11'))
    assert.ok(codigos(base({ slots: slots(6), kickoffSlots: slots(6) })).includes('menos_de_7'))
    assert.ok(!codigos(base({ slots: slots(7), kickoffSlots: slots(7) })).includes('menos_de_7'))
    // antes del saque no avisa por pocos
    assert.ok(!codigos({ ...snapshotVacio(), slots: slots(3) } as any).includes('menos_de_7'))
  })

  it('minutos fuera de rango y desorden', () => {
    const imposible = base({ events: [ev('a', 75, 'gol', { convId: 'c1', half: 1 })] })
    assert.ok(codigos(imposible).includes('minuto_imposible'))
    const segunda = base({ events: [ev('a', 30, 'gol', { convId: 'c1', half: 2 })] })
    assert.ok(codigos(segunda).includes('minuto_imposible'))
    const largo = base({ events: [ev('a', 53, 'falta', { convId: 'c1', half: 1 })], half1Ms: 47 * 60_000 })
    assert.ok(codigos(largo).includes('minuto_fuera_de_rango'))
    const conDescuento = base({ events: [ev('a', 47, 'falta', { convId: 'c1', half: 1 })], half1Ms: 48 * 60_000 })
    assert.ok(!codigos(conDescuento).includes('minuto_fuera_de_rango'))
    const desorden = base({ events: [ev('a', 30, 'corner'), ev('b', 10, 'corner'), ev('c', 40, 'corner')] })
    const d = validarPartido(desorden, conv).find((x) => x.codigo === 'eventos_desordenados')!
    assert.deepEqual(d.eventIds, ['b'])
    assert.equal(d.severidad, 'aviso')
    assert.equal(validarPartido(base({ events: [ev('a', 11, 'corner'), ev('b', 10, 'corner')] }), conv).find((x) => x.codigo === 'eventos_desordenados')!.severidad, 'info')
  })

  it('duplicados: mismo tipo, jugador y minuto; con ts distantes no lo son', () => {
    const s = base({ events: [ev('a', 10, 'gol', { convId: 'c9' }), ev('b', 10, 'gol', { convId: 'c9' }), ev('c', 10, 'gol', { convId: 'c8' })] })
    const d = validarPartido(s, conv).find((x) => x.codigo === 'evento_duplicado')!
    assert.deepEqual(d.eventIds, ['a', 'b'])
    assert.ok(!codigos(s, { evTs: { a: 1000, b: 61_000 } }).includes('evento_duplicado'))
    assert.ok(codigos(s, { evTs: { a: 1000, b: 11_000 } }).includes('evento_duplicado'))
    // fouls en el mismo minuto son normales
    assert.ok(!codigos(base({ events: [ev('a', 10, 'falta', { convId: 'c9' }), ev('b', 10, 'falta', { convId: 'c9' })] })).includes('evento_duplicado'))
  })

  it('goles: lado incoherente, sin goleador, autogol, descuadre con la convocatoria', () => {
    const s = base({ events: [ev('a', 10, 'gol', { convId: 'c9', side: 'rival' }), ev('b', 20, 'gol_contra', { side: 'us' }), ev('c', 30, 'gol'), ev('d', 40, 'gol_contra', { convId: 'c4', rivalDorsal: undefined, side: 'rival' })] })
    const c = codigos(s)
    for (const k of ['gol_lado_incoherente', 'gol_sin_goleador', 'posible_autogol']) assert.ok(c.includes(k), k)
    const g = base({ events: [ev('a', 10, 'gol', { convId: 'c9' })] })
    const descuadre = validarPartido(g, [{ id: 'c9', nombre: 'Nueve', goles: 2 }])
    assert.ok(descuadre.some((a) => a.codigo === 'goles_jugador_descuadre'))
    assert.ok(!validarPartido(g, [{ id: 'c9', nombre: 'Nueve', goles: 1 }]).some((a) => a.codigo === 'goles_jugador_descuadre'))
  })

  it('stats de tarjetas sin evento', () => {
    const s = base({ teamStats: { ...snapshotVacio().teamStats, tarjetas_amarillas: 2 }, events: [ev('a', 10, 'amarilla', { convId: 'c1' })] })
    assert.ok(codigos(s).includes('stats_tarjetas_sin_evento'))
  })

  it('dorsales rivales ausentes', () => {
    const s = base({ events: [ev('a', 10, 'gol_contra'), ev('b', 20, 'amarilla', { side: 'rival' }), ev('c', 30, 'gol_contra', { rivalDorsal: 7 })] })
    const a = validarPartido(s, conv).find((x) => x.codigo === 'rival_sin_dorsal')!
    assert.deepEqual(a.eventIds, ['a', 'b'])
    assert.equal(a.accion, 'completar_dorsal')
  })

  it('reloj y cierre', () => {
    assert.ok(codigos(base({ closed: true, running: true })).includes('cerrado_con_reloj'))
    assert.ok(codigos(base({ half: 2, half2Ms: 10 * 60_000, half1Ms: 0, events: [ev('a', 50, 'corner')] })).includes('primera_parte_sin_cerrar'))
    assert.ok(!codigos(base({ half: 2, half2Ms: 10 * 60_000, events: [ev('a', 50, 'corner')] })).includes('primera_parte_sin_cerrar'))
    const v = validarPartido(base({ closed: true, half2Ms: 45 * 60_000, half: 2 }), conv)
    assert.equal(v.find((a) => a.codigo === 'cerrado_sin_eventos')!.severidad, 'info')
    assert.ok(codigos({ ...snapshotVacio(), events: [ev('a', 10, 'corner')] } as any).includes('eventos_sin_saque'))
  })

  it('alineación que no cuadra con los cambios registrados', () => {
    const s = base({ slots: { ...slots(), s2: 'c13' }, events: [] })
    const a = validarPartido(s, conv).find((x) => x.codigo === 'alineacion_sin_cambio')!
    assert.deepEqual([...a.convIds].sort(), ['c13', 'c2'])
    // con el cambio registrado, no avisa
    const ok = base({ slots: { ...slots(), s2: 'c13' }, events: [ev('x', 50, 'cambio', { convId: 'c2', relatedConvId: 'c13', slotId: 's2' })] })
    assert.ok(!codigos(ok).includes('alineacion_sin_cambio'))
    // sin kickoffSlots se deduce rebobinando
    const sin = base({ kickoffSlots: undefined, slots: { ...slots(), s2: 'c13' }, events: [ev('x', 50, 'cambio', { convId: 'c2', relatedConvId: 'c13', slotId: 's2' })] })
    assert.ok(!codigos(sin).includes('alineacion_sin_cambio'))
    assert.ok(!codigos(sin).includes('cambio_sale_no_en_campo'))
  })

  it('segundo plano largo y sincronización atascada', () => {
    const s = base()
    const huecos = [{ desde: 0, hasta: 9 * 60_000 }, { desde: 0, hasta: 60_000 }]
    assert.equal(validarPartido(s, conv, { huecos }).filter((a) => a.codigo === 'reloj_en_segundo_plano').length, 1)
    assert.ok(codigos(s, { ahora: 1_000_000, pendienteDesdeTs: 1_000_000 - 11 * 60_000 }).includes('sync_pendiente'))
    assert.ok(!codigos(s, { ahora: 1_000_000, pendienteDesdeTs: 1_000_000 - 2 * 60_000 }).includes('sync_pendiente'))
    assert.ok(!codigos(s, { ahora: 1_000_000, pendienteDesdeTs: null }).includes('sync_pendiente'))
  })

  it('ordena por severidad y resume', () => {
    const s = base({ closed: true, running: true, events: [ev('a', 10, 'gol_contra')] })
    const av = validarPartido(s, conv)
    assert.equal(av[0].severidad, 'error')
    const r = resumenAvisos(av)
    assert.equal(r.errores + r.avisos + r.info, av.length)
    assert.ok(r.errores >= 1 && r.avisos >= 1)
  })
})
