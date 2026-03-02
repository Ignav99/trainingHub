'use client'

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { usePathname } from 'next/navigation'
import { PageLoader } from '@/components/ui/page-loader'

interface PageReadyContextType {
  setReady: () => void
}

const PageReadyContext = createContext<PageReadyContextType>({
  setReady: () => {},
})

/**
 * Call from any page to signal that data is fully loaded.
 * Pass `isLoading` — when it becomes false, the layout-level
 * PageLoader disappears and the page content is revealed.
 *
 * Pages that don't call this hook get a fallback timeout (3s).
 */
export function usePageReady(isLoading: boolean = false) {
  const { setReady } = useContext(PageReadyContext)
  useEffect(() => {
    if (!isLoading) setReady()
  }, [isLoading, setReady])
}

/**
 * Wraps dashboard children. Shows <PageLoader /> during route
 * transitions and until the destination page signals readiness.
 */
export function PageReadyGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [pageReady, setPageReady] = useState(true)
  const prevPathname = useRef(pathname)
  const fallbackTimer = useRef<ReturnType<typeof setTimeout>>()

  const markReady = useCallback(() => {
    setPageReady(true)
    if (fallbackTimer.current) clearTimeout(fallbackTimer.current)
  }, [])

  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname
      setPageReady(false)
      // Fallback for pages that don't call usePageReady
      fallbackTimer.current = setTimeout(() => setPageReady(true), 3000)
    }
    return () => {
      if (fallbackTimer.current) clearTimeout(fallbackTimer.current)
    }
  }, [pathname])

  return (
    <PageReadyContext.Provider value={{ setReady: markReady }}>
      {!pageReady && <PageLoader />}
      <div style={{ display: pageReady ? undefined : 'none' }}>
        {children}
      </div>
    </PageReadyContext.Provider>
  )
}
