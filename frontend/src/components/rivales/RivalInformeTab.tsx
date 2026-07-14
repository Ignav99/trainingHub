'use client'

import { useState, useEffect, useRef } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { RivalScout } from '@/components/microciclos/RivalScout'
import { rivalesApi } from '@/lib/api/partidos'
import { apiKey } from '@/lib/swr'
import type { RFEFCompeticion } from '@/lib/api/rfef'
import type { RivalScoutData } from '@/types'
import { extractPersistentScout } from '@/lib/rivalScoutSync'

interface RivalInformeTabProps {
  rivalId: string
  rivalNombre?: string
  equipoId?: string
}

type SaveStatus = 'idle' | 'pending' | 'saved' | 'error'

export function RivalInformeTab({ rivalId, rivalNombre, equipoId }: RivalInformeTabProps) {
  const [scout, setScout] = useState<Partial<RivalScoutData>>({})
  const [loaded, setLoaded] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMountedRef = useRef(false)

  const { data: rfefRes } = useSWR<{ data: RFEFCompeticion[] }>(
    equipoId ? apiKey('/rfef/competiciones', { equipo_id: equipoId }) : null
  )
  const competicionId = rfefRes?.data?.find((c) => c.mi_equipo_nombre)?.id

  useEffect(() => {
    let cancelled = false
    rivalesApi
      .getScoutManual(rivalId)
      .then((data) => {
        if (!cancelled) {
          setScout(data ?? {})
          setLoaded(true)
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [rivalId])

  useEffect(() => {
    if (!loaded || !isMountedRef.current) {
      isMountedRef.current = true
      return
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    setSaveStatus('pending')

    saveTimerRef.current = setTimeout(async () => {
      try {
        await rivalesApi.putScoutManual(rivalId, extractPersistentScout(scout))
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } catch (err: unknown) {
        setSaveStatus('error')
        toast.error(err instanceof Error ? err.message : 'Error al guardar informe rival')
      }
    }, 1500)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [scout, rivalId, loaded])

  if (!loaded) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Cargando informe rival...</p>
  }

  return (
    <div className="space-y-2">
      {saveStatus === 'pending' && (
        <p className="text-xs text-muted-foreground">Guardando...</p>
      )}
      {saveStatus === 'saved' && (
        <p className="text-xs text-green-600">Guardado en perfil del rival</p>
      )}
      {saveStatus === 'error' && (
        <p className="text-xs text-red-600">Error al guardar</p>
      )}
      <RivalScout
        data={scout}
        rivalNombre={rivalNombre}
        rivalId={rivalId}
        equipoId={equipoId}
        onChange={setScout}
      />
    </div>
  )
}
