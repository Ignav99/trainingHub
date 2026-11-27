/**
 * Máquina de toques del anotador: acción → jugador y jugador → acción, y la pareja
 * "sale / entra" de un cambio. Puro y sin React para poder probarlo.
 */

export type AccionJugador = 'gol' | 'amarilla' | 'roja'
export type AccionArmada = AccionJugador | 'cambio' | null

export interface Interaccion {
  /** Jugador seleccionado (en campo o banquillo). En un cambio es el que sale. */
  jugador: string | null
  /** Acción pulsada que espera a un jugador. */
  armada: AccionArmada
  /** Suplente propuesto para entrar (pareja visible, aún sin confirmar). */
  entra: string | null
}

export const INTERACCION_INICIAL: Interaccion = { jugador: null, armada: null, entra: null }

export type Efecto =
  | { tipo: 'ninguno' }
  | { tipo: 'evento'; accion: AccionJugador; convId: string }
  | { tipo: 'cambio'; sale: string; entra: string }
  | { tipo: 'aviso'; mensaje: string }

export interface Resultado {
  est: Interaccion
  efecto: Efecto
}

const ninguno: Efecto = { tipo: 'ninguno' }

export function tocarJugador(est: Interaccion, convId: string, enCampo: ReadonlySet<string>): Resultado {
  const estaEnCampo = enCampo.has(convId)

  if (est.armada === 'gol' || est.armada === 'amarilla' || est.armada === 'roja') {
    return {
      est: INTERACCION_INICIAL,
      efecto: { tipo: 'evento', accion: est.armada, convId },
    }
  }

  if (est.armada === 'cambio') {
    if (!est.jugador || !enCampo.has(est.jugador)) {
      if (estaEnCampo) return { est: { ...est, jugador: convId, entra: null }, efecto: ninguno }
      return { est, efecto: { tipo: 'aviso', mensaje: 'Toca primero al que sale' } }
    }
    if (estaEnCampo) return { est: { ...est, jugador: convId, entra: null }, efecto: ninguno }
    return {
      est: { jugador: convId, armada: null, entra: null },
      efecto: { tipo: 'cambio', sale: est.jugador, entra: convId },
    }
  }

  if (est.jugador === convId) return { est: INTERACCION_INICIAL, efecto: ninguno }

  // Suplente tocado con un titular seleccionado: queda propuesto, no se ejecuta.
  if (est.jugador && enCampo.has(est.jugador) && !estaEnCampo) {
    return { est: { ...est, entra: est.entra === convId ? null : convId }, efecto: ninguno }
  }
  return { est: { jugador: convId, armada: null, entra: null }, efecto: ninguno }
}

export function pulsarAccion(
  est: Interaccion,
  accion: AccionJugador | 'cambio',
  enCampo: ReadonlySet<string>,
): Resultado {
  if (est.armada === accion) return { est: { ...est, armada: null }, efecto: ninguno }

  if (accion === 'cambio') {
    if (est.jugador && est.entra && enCampo.has(est.jugador)) {
      return {
        est: { jugador: est.entra, armada: null, entra: null },
        efecto: { tipo: 'cambio', sale: est.jugador, entra: est.entra },
      }
    }
    const sale = est.jugador && enCampo.has(est.jugador) ? est.jugador : null
    return { est: { jugador: sale, armada: 'cambio', entra: null }, efecto: ninguno }
  }

  if (est.jugador) {
    return {
      est: INTERACCION_INICIAL,
      efecto: { tipo: 'evento', accion, convId: est.jugador },
    }
  }
  return { est: { ...est, armada: accion }, efecto: ninguno }
}

export function cancelar(): Interaccion {
  return INTERACCION_INICIAL
}

/** Texto guía para la franja de estado del campo. */
export function guiaInteraccion(est: Interaccion, nombre: (id: string) => string): string {
  if (est.armada === 'cambio') {
    if (!est.jugador) return 'Cambio: toca al jugador que sale'
    return `Sale ${nombre(est.jugador)}: toca al suplente que entra`
  }
  if (est.armada) {
    const que = est.armada === 'gol' ? 'el gol' : est.armada === 'amarilla' ? 'la amarilla' : 'la roja'
    return `Toca al jugador de ${que}`
  }
  if (est.jugador && est.entra) return `${nombre(est.jugador)} sale, ${nombre(est.entra)} entra`
  if (est.jugador) return `${nombre(est.jugador)} seleccionado`
  return 'Toca un jugador o elige una acción'
}
