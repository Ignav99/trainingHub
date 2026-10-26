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
import { shouldPersistOwnedDoc } from '@/lib/ownedDocument'

interface RivalInformeTabProps {
  rivalId: string
  rivalNombre?: string
  rivalEscudoUrl?: string
  equipoId?: string
  fecha?: string
  jornada?: number | null
  localia?: 'local' | 'visitante' | 'neutral'
  tramo?: 'ida' | 'vuelta'
}

type SaveStatus = 'idle' | 'pending' | 'saved' | 'error'

export function RivalInformeTab({ rivalId, rivalNombre, rivalEscudoUrl, equipoId, fecha, jornada, localia, tramo }: RivalInformeTabProps) {
  const [scout, setScout] = useState<Partial<RivalScoutData>>({})
  const [loaded, setLoaded] = useState(false)
  const [ownerId, setOwnerId] = useState(rivalId)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loadedOwnerRef = useRef<string | null>(null)
  const dirtyRef = useRef(false)
  const scoutRef = useRef(scout)
  scoutRef.current = scout

  if (ownerId !== rivalId) {
    setOwnerId(rivalId)
    setScout({})
    setLoaded(false)
    loadedOwnerRef.current = null
    dirtyRef.current = false
  }

  const { data: rfefRes } = useSWR<{ data: RFEFCompeticion[] }>(
    equipoId ? apiKey('/rfef/competiciones', { equipo_id: equipoId }) : null
  )
  const competicionId = rfefRes?.data?.find((c) => c.mi_equipo_nombre)?.id

  useEffect(() => {
    let cancelled = false
    loadedOwnerRef.current = null
    dirtyRef.current = false
    rivalesApi
      .getScoutManual(rivalId)
      .then((data) => {
        if (cancelled) return
        loadedOwnerRef.current = rivalId
        setScout(data ?? {})
        setLoaded(true)
      })
      .catch(() => {
        if (cancelled) return
        loadedOwnerRef.current = rivalId
        setScout({})
        setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [rivalId])

  useEffect(() => {
    if (!shouldPersistOwnedDoc(loadedOwnerRef.current, rivalId, dirtyRef.current)) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    const owner = rivalId
    setSaveStatus('pending')

    saveTimerRef.current = setTimeout(async () => {
      if (!shouldPersistOwnedDoc(loadedOwnerRef.current, owner, dirtyRef.current)) return
      try {
        await rivalesApi.putScoutManual(owner, extractPersistentScout(scoutRef.current))
        if (loadedOwnerRef.current === owner) {
          dirtyRef.current = false
          setSaveStatus('saved')
          setTimeout(() => setSaveStatus('idle'), 2000)
        }
      } catch (err: unknown) {
        if (loadedOwnerRef.current !== owner) return
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
        rivalEscudoUrl={rivalEscudoUrl}
        rivalId={rivalId}
        equipoId={equipoId}
        fecha={fecha}
        jornada={jornada}
        localia={localia}
        tramo={tramo}
        onChange={(next) => {
          if (loadedOwnerRef.current !== rivalId) return
          dirtyRef.current = true
          setScout(next)
        }}
      />
    </div>
  )
}
