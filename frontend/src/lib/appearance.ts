export const APPEARANCE_KEY = 'kabine-appearance:v1'
export const APPEARANCES = ['acta', 'cal', 'clasico'] as const
export type Appearance = (typeof APPEARANCES)[number]

export function parseAppearance(value: string | null | undefined): Appearance {
  return value === 'clasico' || value === 'cal' ? value : 'acta'
}

export function nextAppearance(current: Appearance): Appearance {
  return APPEARANCES[(APPEARANCES.indexOf(current) + 1) % APPEARANCES.length]
}

export function appearanceLabel(appearance: Appearance): string {
  return appearance === 'clasico' ? 'Clásico' : appearance === 'cal' ? 'Cal' : 'Acta'
}

/** Reads the attribute on <html>. `acta` is the absence of the attribute. */
export function readAppearance(): Appearance {
  if (typeof document === 'undefined') return 'acta'
  return parseAppearance(document.documentElement.getAttribute('data-appearance'))
}

export function applyAppearance(appearance: Appearance) {
  const root = document.documentElement
  if (appearance === 'acta') root.removeAttribute('data-appearance')
  else root.setAttribute('data-appearance', appearance)
  try {
    localStorage.setItem(APPEARANCE_KEY, appearance)
  } catch {
    // Private mode can refuse storage. The choice still applies this visit.
  }
}

export const appearanceBootScript = `(function(){try{var v=localStorage.getItem('${APPEARANCE_KEY}');if(v==='clasico'||v==='cal'){document.documentElement.setAttribute('data-appearance',v)}}catch(e){}})()`
