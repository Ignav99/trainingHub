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
