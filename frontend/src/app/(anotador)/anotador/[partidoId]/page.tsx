'use client'

import { useParams } from 'next/navigation'
import { AnotadorApp } from '@/components/anotador/AnotadorApp'

export default function AnotadorPartidoPage() {
  const params = useParams()
  const partidoId = String(params.partidoId || '')
  if (!partidoId) return null
  return <AnotadorApp partidoId={partidoId} />
}
