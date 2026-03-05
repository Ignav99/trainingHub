'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function PartidoRedirect() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  useEffect(() => {
    router.replace(`/partidos?match=${id}&tab=partido`)
  }, [id, router])

  return null
}
