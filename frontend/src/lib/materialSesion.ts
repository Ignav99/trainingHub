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

/** Solo los petos llevan cantidad (estimada), guardada como la entrada "petos:12". */
export const CON_CANTIDAD: ReadonlySet<string> = new Set(['petos'])

/** Código canónico para un material (código o nombre del catálogo); el texto libre se conserva. */
export function codigoMaterial(m: string): string {
  const t = m.trim()
  const low = t.toLowerCase()
  if (low in NOMBRES) return low
  return POR_NOMBRE[low] ?? t
}

/** 'petos:12' -> {codigo:'petos', cantidad:12}; 'Petos' -> {codigo:'petos'}; 'conos:5' no lleva cantidad. */
export function parseEntrada(m: string): { codigo: string; cantidad?: number } {
  const t = m.trim()
  const i = t.indexOf(':')
  if (i > 0) {
    const cod = codigoMaterial(t.slice(0, i))
    if (CON_CANTIDAD.has(cod)) {
      const der = t.slice(i + 1).trim()
      if (/^\d+$/.test(der) && Number(der) > 0) return { codigo: cod, cantidad: Number(der) }
      return { codigo: cod }
    }
  }
  return { codigo: codigoMaterial(t) }
}

/** Inversa de `parseEntrada`. */
export function entradaMaterial(codigo: string, cantidad?: number | null): string {
  return CON_CANTIDAD.has(codigo) && cantidad && cantidad > 0 ? `${codigo}:${Math.round(cantidad)}` : codigo
}

export function nombreMaterial(m: string, cantidad?: number | null): string {
  const p = parseEntrada(m)
  const q = cantidad ?? p.cantidad
  const base = NOMBRES[p.codigo] ?? (p.codigo ? p.codigo.charAt(0).toUpperCase() + p.codigo.slice(1) : p.codigo)
  return CON_CANTIDAD.has(p.codigo) && q ? `${base} ~${q}` : base
}

function lista(valor: unknown): string[] {
  if (!valor) return []
  if (typeof valor === 'string') return valor.split(',').map((x) => x.trim()).filter(Boolean)
  if (Array.isArray(valor)) return valor.map((x) => String(x ?? '').trim()).filter(Boolean)
  return []
}

/** Códigos ordenados (catálogo primero; libres alfabéticamente) y cantidad MÁXIMA por código. */
function agregar(materialesPorTarea: ReadonlyArray<unknown>): { codigos: string[]; maximos: Record<string, number> } {
  const vistos = new Set<string>()
  const maximos: Record<string, number> = {}
  for (const mats of materialesPorTarea) {
    for (const m of lista(mats)) {
      const { codigo, cantidad } = parseEntrada(m)
      vistos.add(codigo)
      if (cantidad) maximos[codigo] = Math.max(maximos[codigo] ?? 0, cantidad)
    }
  }
  const fin = MATERIALES.length
  const codigos = Array.from(vistos).sort((a, b) => {
    const d = (ORDEN[a] ?? fin) - (ORDEN[b] ?? fin)
    return d !== 0 ? d : a.toLowerCase().localeCompare(b.toLowerCase())
  })
  return { codigos, maximos }
}

/** Unión de códigos planos, sin cantidades (lo que se guarda en `sesiones.materiales`). */
export function codigosDeTareas(materialesPorTarea: ReadonlyArray<unknown>): string[] {
  return agregar(materialesPorTarea).codigos
}

/** Unión en nombres legibles. Los petos se reutilizan: cantidad = máximo entre tareas (no suma). */
export function materialDeTareas(materialesPorTarea: ReadonlyArray<unknown>): string[] {
  const { codigos, maximos } = agregar(materialesPorTarea)
  return codigos.map((c) => nombreMaterial(c, maximos[c]))
}
