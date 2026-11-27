/**
 * Material de una sesión = unión del material de sus tareas ("material mínimo necesario").
 * Se calcula solo, como la duración. Espejo de `backend/app/services/material.py`.
 */

// Espejo de `catalogos/canonico.ts::MATERIALES` (sin imports para poder probarlo con `node --test`).
const MATERIALES: ReadonlyArray<{ codigo: string; nombre: string }> = [
  { codigo: 'balones', nombre: 'Balones' },
  { codigo: 'petos', nombre: 'Petos' },
  { codigo: 'conos', nombre: 'Conos' },
  { codigo: 'picas', nombre: 'Picas' },
  { codigo: 'vallas', nombre: 'Vallas' },
  { codigo: 'escaleras', nombre: 'Escaleras' },
  { codigo: 'gomas', nombre: 'Gomas' },
  { codigo: 'porterias_reducidas', nombre: 'Porterías reducidas' },
  { codigo: 'maniquies', nombre: 'Maniquíes' },
  { codigo: 'gps', nombre: 'GPS' },
  { codigo: 'pulsometros', nombre: 'Pulsómetros' },
]

const NOMBRES: Record<string, string> = Object.fromEntries(MATERIALES.map((m) => [m.codigo, m.nombre]))
const ORDEN: Record<string, number> = Object.fromEntries(MATERIALES.map((m, i) => [m.codigo, i]))
const POR_NOMBRE: Record<string, string> = Object.fromEntries(
  MATERIALES.map((m) => [m.nombre.toLowerCase(), m.codigo]),
)

/** Código canónico para un material (código o nombre del catálogo); el texto libre se conserva. */
export function codigoMaterial(m: string): string {
  const t = m.trim()
  const low = t.toLowerCase()
  if (low in NOMBRES) return low
  return POR_NOMBRE[low] ?? t
}

export function nombreMaterial(m: string): string {
  const c = codigoMaterial(m)
  return NOMBRES[c] ?? (c ? c.charAt(0).toUpperCase() + c.slice(1) : c)
}

function lista(valor: unknown): string[] {
  if (!valor) return []
  if (typeof valor === 'string') return valor.split(',').map((x) => x.trim()).filter(Boolean)
  if (Array.isArray(valor)) return valor.map((x) => String(x ?? '').trim()).filter(Boolean)
  return []
}

/** Unión de códigos (catálogo primero, en su orden; luego libres alfabéticamente). */
export function codigosDeTareas(materialesPorTarea: ReadonlyArray<unknown>): string[] {
  const vistos = new Set<string>()
  for (const mats of materialesPorTarea) {
    for (const m of lista(mats)) vistos.add(codigoMaterial(m))
  }
  const fin = MATERIALES.length
  return Array.from(vistos).sort((a, b) => {
    const d = (ORDEN[a] ?? fin) - (ORDEN[b] ?? fin)
    return d !== 0 ? d : a.toLowerCase().localeCompare(b.toLowerCase())
  })
}

/** Unión en nombres legibles. */
export function materialDeTareas(materialesPorTarea: ReadonlyArray<unknown>): string[] {
  return codigosDeTareas(materialesPorTarea).map(nombreMaterial)
}
