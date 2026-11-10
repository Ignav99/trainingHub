export interface Comando {
  id: string
  titulo: string
  grupo: string
  palabras?: string[]
  atajo?: string
  href?: string
}

/** Minúsculas y sin tildes, para comparar. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

const PREFIJO_PALABRA = 100
const PREFIJO_TITULO = 20
const CONTENIDO = 50
const PALABRA_CLAVE = 10

function puntuar(comando: Comando, tokens: string[]): number {
  const titulo = normalizar(comando.titulo)
  const palabrasTitulo = titulo.split(/[\s/\-–—_.,:;()]+/).filter(Boolean)
  const claves = (comando.palabras ?? []).map(normalizar)
  let total = 0
  for (const token of tokens) {
    let mejor = 0
    if (palabrasTitulo.some((p) => p.startsWith(token))) {
      mejor = PREFIJO_PALABRA + (titulo.startsWith(token) ? PREFIJO_TITULO : 0)
    } else if (titulo.includes(token)) {
      mejor = CONTENIDO
    } else if (claves.some((c) => c.includes(token))) {
      mejor = PALABRA_CLAVE
    }
    if (mejor === 0) return 0
    total += mejor
  }
  return total
}

/**
 * Filtra y ordena por puntuación: prefijo de palabra > contenido > palabras clave.
 * Todos los términos de la consulta deben coincidir. Orden estable en empates.
 * Consulta vacía: devuelve todo en su orden.
 */
export function filtrarComandos<T extends Comando>(comandos: T[], consulta: string): T[] {
  const tokens = normalizar(consulta).split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return [...comandos]
  return comandos
    .map((comando, indice) => ({ comando, indice, puntos: puntuar(comando, tokens) }))
    .filter((x) => x.puntos > 0)
    .sort((a, b) => b.puntos - a.puntos || a.indice - b.indice)
    .map((x) => x.comando)
}
