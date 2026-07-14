import { createClient, SupabaseClient } from '@supabase/supabase-js'

function getEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }
}

let client: SupabaseClient | null = null

function createSingletonClient(): SupabaseClient {
  const { url, anonKey } = getEnv()
  if (!url || !anonKey) {
    // During build, return a dummy client so module evaluation does not crash.
    // Any real runtime usage will throw a clear error when createServerClient is used.
    return createClient('https://placeholder.supabase.co', 'placeholder', {
      auth: { persistSession: false },
    })
  }
  return createClient(url, anonKey)
}

export function getSupabaseClient(): SupabaseClient {
  if (!client) client = createSingletonClient()
  return client
}

// Cliente para uso en servidor (Server Components, API Routes)
export const createServerClient = () => {
  const { url, anonKey } = getEnv()
  if (!url || !anonKey) {
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
    },
  })
}

export function ensureSupabaseEnv() {
  const { url, anonKey } = getEnv()
  if (!url || !anonKey) {
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
}
