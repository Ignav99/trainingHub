/**
 * Aspecto visual de la app.
 *
 * Desde nov-2026 Kabin-e tiene UN solo aspecto: Cal. Los aspectos "Acta" y
 * "Clásico" se retiraron de la app (el usuario ya no puede elegirlos); su código
 * queda en el historial de Git, etiqueta `aspectos-acta-clasico`.
 *
 * El tipo `Appearance` se mantiene para que los componentes que aún bifurcan
 * (p. ej. `PorAspecto`) compilen; en tiempo de ejecución siempre vale 'cal'.
 */
export const APPEARANCE_KEY = 'kabine-appearance:v1'
export const APPEARANCE: Appearance = 'cal'
export type Appearance = 'acta' | 'cal' | 'clasico'

/** Cualquier valor (incluido uno antiguo guardado en el navegador) resuelve a Cal. */
export function parseAppearance(_value?: string | null): Appearance {
  return APPEARANCE
}

export function appearanceLabel(_appearance?: Appearance): string {
  return 'Cal'
}

export function readAppearance(): Appearance {
  return APPEARANCE
}

/** Garantiza el atributo en <html> y limpia preferencias antiguas. */
export function applyAppearance(_appearance?: Appearance) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-appearance', APPEARANCE)
  try {
    localStorage.removeItem(APPEARANCE_KEY)
  } catch {
    // Modo privado puede rechazar el acceso; no importa.
  }
}

export const appearanceBootScript = `(function(){document.documentElement.setAttribute('data-appearance','cal');try{localStorage.removeItem('${APPEARANCE_KEY}')}catch(e){}})()`
