'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { useClubStore } from '@/stores/clubStore'
import { Spinner } from '@/components/ui/spinner'
import { usePersistHydrated } from '@/hooks/usePersistHydrated'

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuthStore()
  const { isOnboardingComplete } = useClubStore()
  const authHydrated = usePersistHydrated(useAuthStore.persist)
  const clubHydrated = usePersistHydrated(useClubStore.persist)

  useEffect(() => {
    if (!authHydrated) return
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authHydrated, isLoading, isAuthenticated, router])

  useEffect(() => {
    if (!authHydrated || !clubHydrated) return
    if (isAuthenticated && isOnboardingComplete) {
      router.push('/')
    }
  }, [authHydrated, clubHydrated, isAuthenticated, isOnboardingComplete, router])

  if (isLoading || !authHydrated || !clubHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 via-background to-muted/50">
      {children}
    </div>
  )
}
