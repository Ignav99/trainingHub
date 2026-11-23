/**
 * Qué datos en caché dejan de valer cuando se guarda algo.
 * Pura (sin SWR ni alias `@/`): se prueba con `node --test`.
 *
 * Dos clases de clave:
 *  - listas: `/coleccion` o `/coleccion?…` de las colecciones relacionadas.
 *    Son de solo lectura en pantalla, revalidarlas es seguro.
 *  - agregados: todo lo que cuelga de `/dashboard`, `/carga`, `/estadisticas`…
 *    (resúmenes calculados en el servidor).
 *
 * Las fichas abiertas (`/sesiones/<id>`…) NO se tocan: suelen ser editores con
 * estado local y una recarga a destiempo pisaría lo que el usuario escribe.
 * Esas ya las pinta la caché instantánea con la respuesta del guardado.
 */

/** Colección → listas relacionadas que hay que volver a pedir. */
const LISTAS: Record<string, string[]> = {
  sesiones: ['sesiones', 'microciclos', 'rpe'],
  partidos: ['partidos', 'microciclos', 'convocatorias', 'rivales'],
  microciclos: ['microciclos', 'sesiones', 'partidos'],
  tareas: ['tareas', 'sesiones'],
  jugadores: ['jugadores', 'convocatorias', 'medico'],
  convocatorias: ['convocatorias', 'partidos', 'jugadores'],
  medico: ['medico', 'jugadores', 'alertas'],
  rpe: ['rpe', 'sesiones', 'wellness'],
  wellness: ['wellness', 'rpe'],
  rivales: ['rivales', 'partidos'],
  nutricion: ['nutricion', 'microciclos'],
  alertas: ['alertas'],
  notificaciones: ['notificaciones'],
  informes: ['informes'],
  presentaciones: ['presentaciones'],
  'game-models': ['game-models'],
  'tactical-boards': ['tactical-boards'],
  abp: ['abp'],
  equipos: ['equipos'],
}

/** Colección → agregados (subárbol entero) afectados. */
const AGREGADOS: Record<string, string[]> = {
  sesiones: ['dashboard', 'carga', 'estadisticas'],
  partidos: ['dashboard', 'estadisticas', 'estadisticas-partido', 'calendario'],
  microciclos: ['dashboard'],
  jugadores: ['dashboard', 'carga'],
  convocatorias: ['estadisticas', 'estadisticas-partido'],
  medico: ['dashboard'],
  rpe: ['carga', 'dashboard'],
  wellness: ['carga', 'dashboard'],
  carga: ['carga', 'dashboard'],
  alertas: ['dashboard'],
}

/** Colecciones con su propia sincronización fina (no se revalidan solas). */
const EXCLUIDAS = new Set(['descansos', 'auth', 'ai', 'ai-chat'])

export type Objetivos = { listas: string[]; agregados: string[] }

export function coleccionDe(path: string): string | null {
  const seg = path.split('?')[0].split('/').filter(Boolean)[0]
  return seg || null
}

/** Qué hay que revalidar tras escribir en `path`. */
export function objetivosDeEscritura(path: string): Objetivos {
  const col = coleccionDe(path)
  if (!col || EXCLUIDAS.has(col)) return { listas: [], agregados: [] }
  return { listas: LISTAS[col] ?? [col], agregados: AGREGADOS[col] ?? [] }
}

export function unirObjetivos(a: Objetivos, b: Objetivos): Objetivos {
  return {
    listas: Array.from(new Set([...a.listas, ...b.listas])),
    agregados: Array.from(new Set([...a.agregados, ...b.agregados])),
  }
}

/** Objetivos desde prefijos sueltos (`'/sesiones'`, `'sesiones'`): cuentan como listas. */
export function objetivosDePrefijos(prefijos: string[], agregados: string[] = []): Objetivos {
  const limpiar = (p: string) => p.replace(/^\/+/, '').split('?')[0]
  return { listas: prefijos.map(limpiar).filter(Boolean), agregados: agregados.map(limpiar).filter(Boolean) }
}

/** ¿La clave SWR `key` cae dentro de los objetivos? */
export function claveAfectada(key: unknown, o: Objetivos): boolean {
  if (typeof key !== 'string' || !key.startsWith('/')) return false
  const path = key.split('?')[0]
  const partes = path.split('/').filter(Boolean)
  if (!partes.length) return false
  if (partes.length === 1 && o.listas.includes(partes[0])) return true
  return o.agregados.includes(partes[0])
}
