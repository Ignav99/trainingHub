/** Texto de «Variantes / reglas» del creador, con fallbacks legacy. */
export function reglasFromTarea(tarea: {
  reglas?: string | null
  variantes?: string[] | string | null
  reglas_tacticas?: string[] | string | null
  reglas_tecnicas?: string[] | string | null
} | null | undefined): string {
  if (!tarea) return ''
  const from = (val: unknown): string => {
    if (Array.isArray(val)) return val.filter(Boolean).join('\n')
    if (typeof val === 'string') return val.trim()
    return ''
  }
  return (
    from(tarea.reglas) ||
    from(tarea.variantes) ||
    from(tarea.reglas_tacticas) ||
    from(tarea.reglas_tecnicas) ||
    ''
  )
}

export function desarrolloFromTarea(tarea: {
  desarrollo?: string | null
  descripcion?: string | null
} | null | undefined): string {
  if (!tarea) return ''
  return (tarea.desarrollo || tarea.descripcion || '').trim()
}

export function variantesFromReglas(reglas: string | null | undefined): string[] {
  if (!reglas) return []
  return reglas
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}
