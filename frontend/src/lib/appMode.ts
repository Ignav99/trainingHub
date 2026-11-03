/**
 * Build-time edition switch.
 *
 * `NEXT_PUBLIC_APP_MODE=lite` builds the reduced edition: login only (no
 * signup), and after login just the Pizarra Táctica and the video tool.
 * Unset (or any other value) is the full app. Next inlines NEXT_PUBLIC_* at
 * build time, so the literal `process.env.NEXT_PUBLIC_APP_MODE` access below
 * must stay as is, and a lite deployment is a separate build.
 */
export const APP_MODE: 'lite' | 'full' = process.env.NEXT_PUBLIC_APP_MODE === 'lite' ? 'lite' : 'full'

export const isLiteMode = APP_MODE === 'lite'

/** Dashboard routes a lite user may open. Everything else bounces to "/". */
export const LITE_ALLOWED_PATHS = ['/', '/pizarra-tactica', '/video-analisis'] as const

export function isLiteAllowedPath(pathname: string): boolean {
  if (pathname === '/') return true
  return LITE_ALLOWED_PATHS.some((p) => p !== '/' && (pathname === p || pathname.startsWith(`${p}/`)))
}
