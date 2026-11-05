'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useStaffPanel } from '@/stores/staffPanelStore'

/** El tablero vive en el panel lateral; esta ruta solo atiende enlaces antiguos. */
function AbrirPanel() {
  const router = useRouter()
  const params = useSearchParams()
  const post = params.get('post')

  useEffect(() => {
    const panel = useStaffPanel.getState()
    if (post) panel.verHilo(post)
    else panel.abrir('tablero')
    router.replace('/')
  }, [post, router])

  return null
}

export default function TableroPage() {
  return (
    <Suspense fallback={null}>
      <AbrirPanel />
    </Suspense>
  )
}
