/** Columnas de la tabla de plantilla que no son el dato crudo. */

export interface NivelesJugador {
  nivel_tecnico?: number | null
  nivel_tactico?: number | null
  nivel_fisico?: number | null
  nivel_mental?: number | null
  nivel_global?: number | null
}

export type Perfil =
  | { kind: 'clase'; texto: string }
  | { kind: 'media'; valor: number }
  | { kind: 'vacio' }

const EJES: Array<{ clave: keyof NivelesJugador; etiqueta: string }> = [
  { clave: 'nivel_tecnico', etiqueta: 'técnico' },
  { clave: 'nivel_tactico', etiqueta: 'táctico' },
  { clave: 'nivel_fisico', etiqueta: 'físico' },
  { clave: 'nivel_mental', etiqueta: 'mental' },
]

/**
 * Una sola lectura del perfil. Si un eje se separa del resto, esa es la clase
 * (top técnico, táctico…). Si los cuatro van juntos y altos, es top. Si no
 * destaca nadie, queda la media.
 */
export function perfilJugador(niveles: NivelesJugador): Perfil {
  const ejes = EJES.flatMap((eje) => {
    const valor = niveles[eje.clave]
    return valor == null || Number.isNaN(valor) ? [] : [{ etiqueta: eje.etiqueta, valor }]
  })
  if (ejes.length === 0) {
    return niveles.nivel_global == null ? { kind: 'vacio' } : { kind: 'media', valor: niveles.nivel_global }
  }

  const mejor = ejes.reduce((ganador, eje) => (eje.valor > ganador.valor ? eje : ganador))
  const empatados = ejes.filter((eje) => eje.valor === mejor.valor)
  const resto = ejes.filter((eje) => eje.valor !== mejor.valor)
  const mediaResto = resto.length
    ? resto.reduce((suma, eje) => suma + eje.valor, 0) / resto.length
    : mejor.valor
  const destaca = empatados.length === 1 && mejor.valor - mediaResto >= 1.5 && mejor.valor >= 7
  if (destaca && mejor.valor >= 8) return { kind: 'clase', texto: `top ${mejor.etiqueta}` }
  if (destaca) return { kind: 'clase', texto: mejor.etiqueta }

  const media = niveles.nivel_global ?? ejes.reduce((suma, eje) => suma + eje.valor, 0) / ejes.length
  const suelo = Math.min(...ejes.map((eje) => eje.valor))
  if (media >= 8 && mejor.valor - suelo < 1.5) return { kind: 'clase', texto: 'top' }
  return { kind: 'media', valor: Math.round(media * 10) / 10 }
}

export type TonoRinde = 'alto' | 'bien' | 'justo' | 'bajo'

export interface Rinde {
  texto: string
  tono: TonoRinde
  nota: number
  partidos: number
}

/** Cómo rinde en los partidos. Hacen falta dos notas; una sola no es un estado. */
export function rindeEnPartidos(media: number | null | undefined, partidos: number): Rinde | null {
  if (media == null || partidos < 2) return null
  const tono: TonoRinde = media >= 8 ? 'alto' : media >= 6.5 ? 'bien' : media >= 5 ? 'justo' : 'bajo'
  const texto = tono === 'alto' ? 'alto' : tono === 'bien' ? 'bien' : tono === 'justo' ? 'justo' : 'bajo'
  return { texto, tono, nota: media, partidos }
}

export interface FilaSancion {
  estado: string
  jugador_id?: string
  sancionado_restantes?: number | null
}

export interface SancionOficial {
  restantes: number
}

/** Se queda con la sanción más larga si el jugador sale en más de una competición. */
export function fusionarSanciones(listas: FilaSancion[][]): Record<string, SancionOficial> {
  const map: Record<string, SancionOficial> = {}
  for (const lista of listas) {
    for (const fila of lista) {
      if (fila.estado !== 'Sancionado' || !fila.jugador_id) continue
      const restantes = Math.max(1, fila.sancionado_restantes || 1)
      const previa = map[fila.jugador_id]
      if (!previa || restantes > previa.restantes) {
        map[fila.jugador_id] = { restantes }
      }
    }
  }
  return map
}

export type LecturaSancion = 'cumple' | 'libre' | 'sin-datos'

export function lecturaSancion(
  estadoManual: string | undefined,
  oficial: SancionOficial | undefined,
  actasCargadas: boolean,
): { lectura: LecturaSancion; restantes?: number } {
  if (oficial || estadoManual === 'sancionado') {
    return { lectura: 'cumple', restantes: oficial?.restantes }
  }
  if (actasCargadas) return { lectura: 'libre' }
  return { lectura: 'sin-datos' }
}

/** Titular / suplente que entró y jugó. Sin ninguna de las dos, no hay ratio. */
export function presencias(titularidades: number, suplencias: number): string | null {
  if (titularidades <= 0 && suplencias <= 0) return null
  return `${titularidades}/${suplencias}`
}

/** Minutos por partido en el que jugó. */
export function minutosPorPartido(minutos: number, partidos: number): number | null {
  if (partidos <= 0) return null
  return Math.round(minutos / partidos)
}

/** Media de 7 días si existe; si no, el último registro. */
export function wellnessVisible(dato: {
  wellness_7d_avg?: number | null
  wellness_last?: number | null
} | null | undefined): { valor: number; reciente: boolean } | null {
  if (!dato) return null
  if (dato.wellness_7d_avg != null) return { valor: dato.wellness_7d_avg, reciente: false }
  if (dato.wellness_last != null) return { valor: dato.wellness_last, reciente: true }
  return null
}
