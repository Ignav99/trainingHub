'use client'

import { Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { SalaStage } from '@/components/revision/SalaStage'

function RevisionSalaInner() {
  const params = useParams<{ code: string }>()
  const search = useSearchParams()
  const code = (params.code || '').toUpperCase()
  const role = search.get('role') === 'host' ? 'host' : 'tablet'
  return <SalaStage code={code} role={role} />
}

export default function RevisionSalaPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Cargando sala…</div>}>
      <RevisionSalaInner />
    </Suspense>
  )
}
