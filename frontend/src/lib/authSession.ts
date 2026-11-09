/**
 * Shared login across browser tabs.
 *
 * Supabase broadcasts SIGNED_OUT to every tab (refresh races, a second tab
 * recovering storage). Writing that into the persisted zustand blob logs the
 * whole browser out. Only an explicit logout in this tab may clear it, and
 * only once the Supabase token is actually gone.
 */

export interface PersistedAuthSnapshot {
  accessToken: string | null
  user: unknown
  isAuthenticated: boolean
}

export function readPersistedAuth(
  storage: { getItem: (key: string) => string | null } | null
): PersistedAuthSnapshot | null {
  if (!storage) return null
  try {
    const raw = storage.getItem('traininghub-auth')
    if (!raw) return null
    const parsed = JSON.parse(raw) as { state?: Partial<PersistedAuthSnapshot> }
    const state = parsed?.state
    if (!state) return null
    const accessToken = typeof state.accessToken === 'string' && state.accessToken.length > 0
      ? state.accessToken
      : null
    return {
      accessToken,
      user: state.user ?? null,
      isAuthenticated: state.isAuthenticated === true && accessToken !== null,
    }
  } catch {
    return null
  }
}

type StorageScan = {
  length: number
  key: (index: number) => string | null
  getItem: (key: string) => string | null
}

export function localSupabaseSessionPresent(storage: StorageScan | null): boolean {
  if (!storage) return false
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i)
    if (!key || !key.startsWith('sb-') || !key.endsWith('-auth-token')) continue
    const value = storage.getItem(key)
    if (value && value.length > 0) return true
  }
  return false
}

export function shouldClearSharedAuthOnSignedOut(
  explicitLogout: boolean,
  supabaseSessionPresent: boolean
): boolean {
  return explicitLogout && !supabaseSessionPresent
}

/**
 * True when a JWT is expired or expires within `skewMs`. Unparseable tokens
 * count as expiring so the caller falls back to the Supabase client, which
 * refreshes sessions itself.
 */
export function jwtExpiresSoon(token: string | null, nowMs = Date.now(), skewMs = 60_000): boolean {
  if (!token) return true
  const parts = token.split('.')
  if (parts.length !== 3) return true
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const json = typeof atob === 'function'
      ? atob(padded)
      : Buffer.from(padded, 'base64').toString('utf8')
    const payload = JSON.parse(json) as { exp?: number }
    if (typeof payload.exp !== 'number') return true
    return payload.exp * 1000 <= nowMs + skewMs
  } catch {
    return true
  }
}
