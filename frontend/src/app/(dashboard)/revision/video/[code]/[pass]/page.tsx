'use client'

import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import { PresentacionSala } from '@/components/revision/PresentacionSala'

function VideoSalaTablet() {
  const params = useParams<{ code: string; pass: string }>()
  const code = (params.code || '').toUpperCase()
  const pass = params.pass || ''
  return <PresentacionSala code={code} role="tablet" directoRoom guestPass={pass} />
}

export default function RevisionVideoSalaPassPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-zinc-400">Abriendo la sala…</div>}>
      <VideoSalaTablet />
    </Suspense>
  )
}
