/** Borrador local del texto que escribe el cuerpo técnico. Se escribe en cada cambio. */

export function preferText(primary?: string | null, fallback?: string | null): string {
  const main = (primary ?? '').trim()
  const other = (fallback ?? '').trim()
  if (main) return primary ?? ''
  if (other) return fallback ?? ''
  return primary ?? fallback ?? ''
}

export function writeDraft(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      key,
      JSON.stringify({ savedAt: new Date().toISOString(), value })
    )
  } catch {
    // Modo privado o cuota llena: el guardado de red sigue siendo el otro camino.
  }
}

export function readDraft<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { value?: T }
    return parsed?.value ?? null
  } catch {
    return null
  }
}
