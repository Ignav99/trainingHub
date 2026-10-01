'use client'

import { useParams } from 'next/navigation'
import { PresentacionSala } from '@/components/revision/PresentacionSala'

export default function RevisionVideoSalaPage() {
  const params = useParams<{ code: string }>()
  const code = (params.code || '').toUpperCase()
  return <PresentacionSala code={code} role="tablet" directoRoom guestPass="" />
}
