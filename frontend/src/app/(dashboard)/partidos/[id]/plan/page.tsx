'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function PlanRedirect() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  useEffect(() => {
    router.replace(`/partidos?match=${id}&tab=plan`)
  }, [id, router])

  return null
}
