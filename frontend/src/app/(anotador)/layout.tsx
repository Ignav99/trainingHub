'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { useEquipoStore } from '@/stores/equipoStore'
import { Toaster } from '@/components/ui/toast'
import { usePersistHydrated } from '@/hooks/usePersistHydrated'

export default function AnotadorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isLoading, isAuthenticated } = useAuthStore()
  const loadEquipos = useEquipoStore((s) => s.loadEquipos)
  const authHydrated = usePersistHydrated(useAuthStore.persist)
  const equipoHydrated = usePersistHydrated(useEquipoStore.persist)

  useEffect(() => {
    if (!authHydrated) return
    if (!isLoading && !isAuthenticated) router.replace('/login')
  }, [authHydrated, isLoading, isAuthenticated, router])

  useEffect(() => {
    if (!equipoHydrated || !isAuthenticated) return
    loadEquipos()
  }, [equipoHydrated, isAuthenticated, loadEquipos])

  if (!authHydrated || isLoading || !isAuthenticated) {
    return <div className="min-h-[100dvh] bg-[#0c1410]" />
  }

  return (
    <div className="min-h-[100dvh] bg-[#0c1410] text-zinc-100 touch-manipulation select-none overflow-hidden">
      {children}
      <Toaster />
    </div>
  )
}
