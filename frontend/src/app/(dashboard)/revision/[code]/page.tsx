'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { SalaStage } from '@/components/revision/SalaStage'
import { PresentacionSala } from '@/components/revision/PresentacionSala'
import { revisionApi, type RevisionSession } from '@/lib/api/revision'

function RevisionSalaInner() {
  const params = useParams<{ code: string }>()
  const search = useSearchParams()
  const code = (params.code || '').toUpperCase()
  const role = search.get('role') === 'host' ? 'host' : 'tablet'
  const [session, setSession] = useState<RevisionSession | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    revisionApi.getSession(code)
      .then((s) => { if (!cancelled) setSession(s) })
      .catch(() => { if (!cancelled) setError(true) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [code])

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Cargando sala…</div>
  }
  if (error || !session) {
    return <div className="p-8 text-center text-muted-foreground">No hay sala con el código {code}.</div>
  }
  if (session.current_clip_id) {
    return <SalaStage code={code} role={role} initialSession={session} />
  }
  return <PresentacionSala code={code} role={role} initialSession={session} />
}

export default function RevisionSalaPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Cargando sala…</div>}>
      <RevisionSalaInner />
    </Suspense>
  )
}
