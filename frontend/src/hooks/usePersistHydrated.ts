'use client'

import { useEffect, useState } from 'react'

type PersistApi = {
  hasHydrated: () => boolean
  onFinishHydration: (fn: () => void) => () => void
}

/** True once a zustand persist store has read localStorage. */
export function usePersistHydrated(persist: PersistApi): boolean {
  const [hydrated, setHydrated] = useState(() => persist.hasHydrated())

  useEffect(() => {
    if (persist.hasHydrated()) {
      setHydrated(true)
      return
    }
    return persist.onFinishHydration(() => setHydrated(true))
  }, [persist])

  return hydrated
}
