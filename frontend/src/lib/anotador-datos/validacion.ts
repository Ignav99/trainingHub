/**
 * Alarmas de coherencia del acta, antes de enviarla. Puras y conservadoras:
 * cada aviso dice QUÉ pasa, a QUIÉN/qué eventos afecta y qué acción sugiere.
 * Nada se corrige solo: el delegado decide.
 */
import type { AnotadorEvent, AnotadorSnapshot } from '../anotador'
import type { Aviso } from './tipos.ts'

export interface ConvocadoVal {
  id: string
  nombre?: string
  dorsal?: number | null
  /** Goles que el servidor tiene anotados para el jugador (si se conocen). */
  goles?: number
}

export interface OpcionesValidacion {
  ahora?: number
  /** Cambios permitidos por partido (por defecto 5). */
  maxCambios?: number
  /** Cambios ilimitados / volantes (categorías inferiores): sin tope y se permiten reentradas. */
  cambiosIlimitados?: boolean
  /** Tramos con el reloj en marcha y la app dormida (de `meta.huecos`). */
  huecos?: { desde: number; hasta: number }[]
  maxHuecoMs?: number
  /** Desde cuándo hay cambios sin enviar al servidor. */
  pendienteDesdeTs?: number | null
  maxPendienteMs?: number
  /** Última edición de cada evento (de `meta.evSello[id].ts`), para afinar duplicados. */
  evTs?: Record<string, number>
}

const MAX_CAMPO = 11
const MIN_CAMPO = 7
const clave = (e: AnotadorEvent) => (e.half === 2 ? 1000 : 0) + (e.minute || 0)
const sideOf = (e: AnotadorEvent) => e.side || (e.type === 'gol_contra' ? 'rival' : 'us')

function suj(e: AnotadorEvent): string | null {
  if (sideOf(e) === 'rival') return e.rivalDorsal != null ? `r:${e.rivalDorsal}` : null
  return e.convId ? `u:${e.convId}` : null
}

/** Once en el saque: el guardado al pitar, o el campo actual deshaciendo cambios y expulsiones. */
function onceInicial(snap: AnotadorSnapshot, orden: AnotadorEvent[]): Set<string> | null {
  const kick = Object.values(snap.kickoffSlots || {}).filter(Boolean)
  if (kick.length) return new Set(kick)
  if (!snap.started) return null
  const campo = new Set(Object.values(snap.slots || {}).filter(Boolean))
  for (const e of [...orden].reverse()) {
    if (sideOf(e) === 'rival') continue
    if (e.type === 'cambio' && e.convId && e.relatedConvId) {
      campo.delete(e.relatedConvId)
      campo.add(e.convId)
    } else if (e.type === 'roja' && e.convId) campo.add(e.convId)
  }
  return campo.size ? campo : null
}

export function validarPartido(snap: AnotadorSnapshot, convocados: ConvocadoVal[], opts: OpcionesValidacion = {}): Aviso[] {
  const avisos: Aviso[] = []
  const ahora = opts.ahora ?? Date.now()
  const nombres = new Map(convocados.map((c) => [c.id, c.nombre || (c.dorsal != null ? `#${c.dorsal}` : 'Jugador')]))
  const nom = (id?: string) => (id ? nombres.get(id) || 'Jugador desconocido' : 'Jugador')
  const nomSuj = (e: AnotadorEvent) => (sideOf(e) === 'rival' ? (e.rivalDorsal != null ? `rival #${e.rivalDorsal}` : 'un rival') : nom(e.convId))
  const add = (a: Aviso) => avisos.push(a)
  const events = (snap.events || []).filter((e) => e && typeof e === 'object')
  const orden = events
    .map((e, i) => ({ e, i }))
    .sort((a, b) => clave(a.e) - clave(b.e) || a.i - b.i)
    .map((x) => x.e)
  const ids = (es: AnotadorEvent[]) => es.map((e) => e.id)

  // ---- tarjetas
  const porSuj = new Map<string, { am: AnotadorEvent[]; roj: AnotadorEvent[] }>()
  for (const e of events) {
    if (e.type !== 'amarilla' && e.type !== 'roja') continue
    const k = suj(e)
    if (!k) continue
    const r = porSuj.get(k) || { am: [], roj: [] }
    ;(e.type === 'amarilla' ? r.am : r.roj).push(e)
    porSuj.set(k, r)
  }
  porSuj.forEach((r, k) => {
    const ref = r.am[0] || r.roj[0]
    const quien = nomSuj(ref)
    const convIds = k.startsWith('u:') ? [k.slice(2)] : []
    if (r.am.length >= 3) {
      add({ severidad: 'error', codigo: 'tres_amarillas', mensaje: `${quien} tiene ${r.am.length} amarillas: un jugador no puede recibir más de dos.`, eventIds: ids(r.am), convIds, accion: 'editar_evento' })
    } else if (r.am.length === 2 && r.roj.length === 0) {
      add({ severidad: 'error', codigo: 'segunda_amarilla_sin_roja', mensaje: `${quien} tiene dos amarillas pero ninguna roja: la segunda amarilla implica expulsión.`, eventIds: ids(r.am), convIds, accion: 'anadir_roja' })
    }
    if (r.roj.length > 1) {
      add({ severidad: 'error', codigo: 'roja_duplicada', mensaje: `${quien} tiene ${r.roj.length} rojas anotadas.`, eventIds: ids(r.roj), convIds, accion: 'borrar_evento' })
    }
  })

  // ---- duplicados
  const tiposDup = new Set(['gol', 'gol_contra', 'amarilla', 'roja', 'cambio'])
  const vistos = new Map<string, AnotadorEvent[]>()
  for (const e of events) {
    if (!tiposDup.has(e.type)) continue
    const k = `${e.type}|${suj(e) || ''}|${e.relatedConvId || ''}|${e.half}|${e.minute}`
    const l = vistos.get(k) || []
    l.push(e)
    vistos.set(k, l)
  }
  vistos.forEach((l) => {
    if (l.length < 2) return
    const ts = l.map((e) => opts.evTs?.[e.id]).filter((t): t is number => typeof t === 'number')
    if (ts.length === l.length && Math.max(...ts) - Math.min(...ts) > 20_000) return
    add({ severidad: 'aviso', codigo: 'evento_duplicado', mensaje: `Posible duplicado: ${l.length} veces "${l[0].type}" de ${nomSuj(l[0])} en el minuto ${l[0].minute}′.`, eventIds: ids(l), convIds: l[0].convId ? [l[0].convId] : [], accion: 'borrar_evento' })
  })

  // ---- minutos fuera de rango
  const h1 = snap.half1Ms || 0
  const h2 = snap.half2Ms || 0
  const elapsedMin = Math.floor((snap.elapsedMs || 0) / 60_000)
  const tope1 = Math.max(45, h1 >= 60_000 ? Math.floor(h1 / 60_000) : 0, snap.half === 1 ? elapsedMin : 0) + 1
  const tope2 = Math.max(90, h2 >= 60_000 ? 45 + Math.floor(h2 / 60_000) : 0, snap.half === 2 ? 45 + elapsedMin : 0) + 1
  const fuera: AnotadorEvent[] = []
  const muyFuera: AnotadorEvent[] = []
  for (const e of events) {
    const m = e.minute || 0
    if (m < 0 || m > 120 || (e.half !== 2 && m > 60) || (e.half === 2 && (m > 105 || m < 45))) muyFuera.push(e)
    else if ((e.half !== 2 && m > tope1) || (e.half === 2 && m > tope2)) fuera.push(e)
  }
  if (muyFuera.length) add({ severidad: 'error', codigo: 'minuto_imposible', mensaje: `${muyFuera.length === 1 ? 'Un evento tiene' : `${muyFuera.length} eventos tienen`} un minuto imposible para su parte (${muyFuera.map((e) => `${e.minute}′`).join(', ')}).`, eventIds: ids(muyFuera), convIds: [], accion: 'ajustar_minuto' })
  if (fuera.length) add({ severidad: 'aviso', codigo: 'minuto_fuera_de_rango', mensaje: `${fuera.length === 1 ? 'Un evento supera' : `${fuera.length} eventos superan`} la duración registrada de su parte (${fuera.map((e) => `${e.minute}′`).join(', ')}). Si hubo descuento, ignóralo.`, eventIds: ids(fuera), convIds: [], accion: 'ajustar_minuto' })

  // ---- orden cronológico (en el orden en que se anotaron)
  const desorden: AnotadorEvent[] = []
  let mayor = -1
  let salto = 0
  for (const e of events) {
    const k = clave(e)
    if (k < mayor) { desorden.push(e); salto = Math.max(salto, mayor - k) } else mayor = k
  }
  if (desorden.length) add({ severidad: salto > 3 ? 'aviso' : 'info', codigo: 'eventos_desordenados', mensaje: `${desorden.length === 1 ? 'Un evento está' : `${desorden.length} eventos están`} fuera de orden cronológico (hasta ${salto}′ de diferencia). Puede ser correcto si se anotó con retraso.`, eventIds: ids(desorden), convIds: [], accion: 'ajustar_minuto' })

  // ---- simulación del campo: cambios, expulsiones, eventos tras salir
  const inicial = onceInicial(snap, orden)
  const salio = new Map<string, { k: number; causa: 'roja' | 'cambio' }>()
  const expulsados = new Set<string>()
  const fueraDeCampo: AnotadorEvent[] = []
  const errsCambio: Aviso[] = []
  if (inicial) {
    const campo = new Set(inicial)
    const salieron = new Set<string>()
    for (const e of orden) {
      if (sideOf(e) === 'rival') continue
      if (e.type === 'cambio' && e.convId && e.relatedConvId) {
        if (!campo.has(e.convId)) errsCambio.push({ severidad: 'error', codigo: 'cambio_sale_no_en_campo', mensaje: `Cambio al ${e.minute}′: sale ${nom(e.convId)} pero no estaba en el campo.`, eventIds: [e.id], convIds: [e.convId], accion: 'editar_evento' })
        if (campo.has(e.relatedConvId)) errsCambio.push({ severidad: 'error', codigo: 'cambio_entra_ya_en_campo', mensaje: `Cambio al ${e.minute}′: entra ${nom(e.relatedConvId)} pero ya estaba en el campo.`, eventIds: [e.id], convIds: [e.relatedConvId], accion: 'editar_evento' })
        if (expulsados.has(e.relatedConvId)) errsCambio.push({ severidad: 'error', codigo: 'cambio_entra_expulsado', mensaje: `Cambio al ${e.minute}′: entra ${nom(e.relatedConvId)}, que ya estaba expulsado.`, eventIds: [e.id], convIds: [e.relatedConvId], accion: 'editar_evento' })
        else if (!opts.cambiosIlimitados && salieron.has(e.relatedConvId)) errsCambio.push({ severidad: 'aviso', codigo: 'cambio_reentrada', mensaje: `Cambio al ${e.minute}′: ${nom(e.relatedConvId)} vuelve a entrar tras haber salido (solo válido con cambios volantes).`, eventIds: [e.id], convIds: [e.relatedConvId], accion: 'revisar_cambios' })
        campo.delete(e.convId)
        campo.add(e.relatedConvId)
        salieron.add(e.convId)
        salio.set(e.convId, { k: clave(e), causa: 'cambio' })
      } else if (e.type === 'roja' && e.convId) {
        campo.delete(e.convId)
        expulsados.add(e.convId)
        salio.set(e.convId, { k: clave(e), causa: 'roja' })
      }
    }
    // eventos de un jugador después de haber salido
    for (const e of orden) {
      if (sideOf(e) === 'rival' || !e.convId) continue
      const s = salio.get(e.convId)
      if (s && clave(e) > s.k && e.type !== 'cambio') fueraDeCampo.push(e)
      if (e.type === 'gol' && e.relatedConvId) {
        const sa = salio.get(e.relatedConvId)
        if (sa && clave(e) > sa.k) fueraDeCampo.push(e)
      }
    }
    for (const e of fueraDeCampo) {
      const id = e.convId!
      const s = salio.get(id)!
      const roja = s.causa === 'roja'
      add({ severidad: roja ? 'error' : 'aviso', codigo: roja ? 'evento_tras_expulsion' : 'evento_tras_sustitucion', mensaje: `${nom(id)} tiene un "${e.type}" al ${e.minute}′ después de ${roja ? 'ser expulsado' : 'ser sustituido'}.`, eventIds: [e.id], convIds: [id], accion: 'editar_evento' })
    }
    errsCambio.forEach(add)

    // alineación distinta de la esperada
    if (snap.started && !snap.closed) {
      const real = new Set(Object.values(snap.slots || {}).filter(Boolean))
      const dif = [...Array.from(campo).filter((x) => !real.has(x)), ...Array.from(real).filter((x) => !campo.has(x))]
      if (dif.length) add({ severidad: 'aviso', codigo: 'alineacion_sin_cambio', mensaje: `El campo no coincide con los cambios anotados (${dif.map(nom).join(', ')}): ¿falta registrar un cambio?`, eventIds: [], convIds: dif, accion: 'revisar_alineacion' })
    }
  }

  // ---- jugadores en el campo
  const enCampo = Object.values(snap.slots || {}).filter(Boolean).length
  if (enCampo > MAX_CAMPO) add({ severidad: 'error', codigo: 'mas_de_11', mensaje: `Hay ${enCampo} jugadores en el campo: el máximo es ${MAX_CAMPO}.`, eventIds: [], convIds: Object.values(snap.slots).filter(Boolean), accion: 'revisar_alineacion' })
  if (snap.started && !snap.closed && enCampo > 0 && enCampo < MIN_CAMPO) add({ severidad: 'error', codigo: 'menos_de_7', mensaje: `Solo hay ${enCampo} jugadores en el campo: con menos de ${MIN_CAMPO} el partido se suspende.`, eventIds: [], convIds: [], accion: 'revisar_alineacion' })

  // ---- cambios sobre el máximo
  const cambios = orden.filter((e) => e.type === 'cambio' && sideOf(e) === 'us')
  const maxC = opts.maxCambios ?? 5
  if (!opts.cambiosIlimitados && cambios.length > maxC) add({ severidad: 'aviso', codigo: 'demasiados_cambios', mensaje: `Hay ${cambios.length} cambios anotados y el máximo es ${maxC}. Si en tu categoría hay cambios volantes, actívalos.`, eventIds: ids(cambios.slice(maxC)), convIds: [], accion: 'revisar_cambios' })

  // ---- goles
  const golesMal = events.filter((e) => (e.type === 'gol' && e.side === 'rival') || (e.type === 'gol_contra' && e.side === 'us'))
  if (golesMal.length) add({ severidad: 'error', codigo: 'gol_lado_incoherente', mensaje: `${golesMal.length === 1 ? 'Un gol tiene' : `${golesMal.length} goles tienen`} el lado contradictorio con su tipo: el marcador contaría para el equipo equivocado.`, eventIds: ids(golesMal), convIds: [], accion: 'editar_evento' })
  const sinGoleador = events.filter((e) => e.type === 'gol' && sideOf(e) === 'us' && !e.convId)
  if (sinGoleador.length) add({ severidad: 'aviso', codigo: 'gol_sin_goleador', mensaje: `${sinGoleador.length === 1 ? 'Un gol propio no tiene' : `${sinGoleador.length} goles propios no tienen`} goleador.`, eventIds: ids(sinGoleador), convIds: [], accion: 'editar_evento' })
  const autogol = events.filter((e) => e.type === 'gol_contra' && e.convId)
  if (autogol.length) add({ severidad: 'info', codigo: 'posible_autogol', mensaje: `Gol en contra con jugador propio (${autogol.map((e) => nom(e.convId)).join(', ')}): se cuenta como autogol.`, eventIds: ids(autogol), convIds: autogol.map((e) => e.convId!), accion: 'editar_evento' })
  const golesPorJug = new Map<string, number>()
  for (const e of events) if (e.type === 'gol' && sideOf(e) === 'us' && e.convId) golesPorJug.set(e.convId, (golesPorJug.get(e.convId) || 0) + 1)
  for (const c of convocados) {
    if (c.goles != null && c.goles !== (golesPorJug.get(c.id) || 0)) {
      add({ severidad: 'aviso', codigo: 'goles_jugador_descuadre', mensaje: `${nom(c.id)} figura con ${c.goles} gol(es) en la convocatoria pero el acta recoge ${golesPorJug.get(c.id) || 0}.`, eventIds: [], convIds: [c.id], accion: 'revisar_marcador' })
    }
  }
  // estadísticas de equipo frente a eventos
  const ts = snap.teamStats || {}
  const cuenta = (t: string, lado: 'us' | 'rival') => events.filter((e) => e.type === t && sideOf(e) === lado).length
  for (const [clave2, tipo, etiqueta] of [['tarjetas_amarillas', 'amarilla', 'amarillas'], ['tarjetas_rojas', 'roja', 'rojas']] as const) {
    for (const lado of ['us', 'rival'] as const) {
      const stat = ts[lado === 'us' ? clave2 : `rival_${clave2}`] || 0
      const n = cuenta(tipo, lado)
      if (stat > n) add({ severidad: 'aviso', codigo: 'stats_tarjetas_sin_evento', mensaje: `Las estadísticas cuentan ${stat} ${etiqueta} ${lado === 'us' ? 'propias' : 'del rival'} pero solo hay ${n} evento(s) con jugador.`, eventIds: [], convIds: [], accion: 'revisar_marcador' })
    }
  }

  // ---- dorsales rivales
  const sinDorsal = events.filter((e) => sideOf(e) === 'rival' && (e.type === 'gol_contra' || e.type === 'amarilla' || e.type === 'roja') && e.rivalDorsal == null)
  if (sinDorsal.length) add({ severidad: 'aviso', codigo: 'rival_sin_dorsal', mensaje: `${sinDorsal.length === 1 ? 'Un gol o tarjeta del rival no tiene' : `${sinDorsal.length} goles o tarjetas del rival no tienen`} dorsal.`, eventIds: ids(sinDorsal), convIds: [], accion: 'completar_dorsal' })

  // ---- reloj y cierre
  if (snap.closed && snap.running) add({ severidad: 'error', codigo: 'cerrado_con_reloj', mensaje: 'El partido está cerrado pero el reloj sigue en marcha.', eventIds: [], convIds: [], accion: 'cerrar_reloj' })
  const segundaParte = snap.half === 2 || h2 > 0 || events.some((e) => e.half === 2)
  if (segundaParte && h1 < 60_000 && (h2 > 0 || events.some((e) => e.half === 2))) add({ severidad: 'aviso', codigo: 'primera_parte_sin_cerrar', mensaje: 'Hay datos de la 2ª parte pero la 1ª no consta como terminada (sin duración registrada).', eventIds: [], convIds: [], accion: 'cerrar_primera_parte' })
  if (snap.closed && events.length === 0) add({ severidad: 'info', codigo: 'cerrado_sin_eventos', mensaje: 'El partido se cierra sin ningún evento (ni goles, ni tarjetas, ni cambios). Es correcto si fue así.', eventIds: [], convIds: [], accion: 'revisar_marcador' })
  if (!snap.started && events.length > 0) add({ severidad: 'aviso', codigo: 'eventos_sin_saque', mensaje: 'Hay eventos anotados pero no se pulsó el saque inicial: los minutos jugados pueden salir mal.', eventIds: ids(events), convIds: [], accion: 'revisar_alineacion' })

  // ---- reloj en segundo plano
  const maxHueco = opts.maxHuecoMs ?? 3 * 60_000
  for (const h of opts.huecos || []) {
    if (h.hasta - h.desde > maxHueco) {
      const min = Math.round((h.hasta - h.desde) / 60_000)
      add({ severidad: 'aviso', codigo: 'reloj_en_segundo_plano', mensaje: `La app estuvo ${min} min en segundo plano con el reloj en marcha: el minuto mostrado puede ir atrasado. Revisa el reloj.`, eventIds: [], convIds: [], accion: 'ajustar_minuto' })
    }
  }

  // ---- sincronización atascada
  if (opts.pendienteDesdeTs && ahora - opts.pendienteDesdeTs > (opts.maxPendienteMs ?? 10 * 60_000)) {
    const min = Math.round((ahora - opts.pendienteDesdeTs) / 60_000)
    add({ severidad: 'aviso', codigo: 'sync_pendiente', mensaje: `Hace ${min} min que hay cambios sin enviar al servidor. Siguen a salvo en la tablet; busca cobertura o pulsa "Reintentar".`, eventIds: [], convIds: [], accion: 'forzar_sync' })
  }

  const rank = { error: 0, aviso: 1, info: 2 } as const
  return avisos.sort((a, b) => rank[a.severidad] - rank[b.severidad])
}

export function resumenAvisos(avisos: Aviso[]): { errores: number; avisos: number; info: number } {
  return {
    errores: avisos.filter((a) => a.severidad === 'error').length,
    avisos: avisos.filter((a) => a.severidad === 'aviso').length,
    info: avisos.filter((a) => a.severidad === 'info').length,
  }
}
