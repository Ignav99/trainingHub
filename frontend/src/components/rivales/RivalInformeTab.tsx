'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { RivalScout } from '@/components/microciclos/RivalScout'
import { rivalesApi } from '@/lib/api/partidos'
import { apiKey } from '@/lib/swr'
import type { RFEFCompeticion } from '@/lib/api/rfef'
import type { RivalScoutData } from '@/types'
import { extractPersistentScout, mergeScoutOnLoad } from '@/lib/rivalScoutSync'
import { readDraft } from '@/lib/durableDraft'
import { useDurableAutosave } from '@/hooks/useDurableAutosave'

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
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const draftKey = `th-draft:v1:rival-scout:${rivalId}`

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
          const draft = readDraft<Partial<RivalScoutData>>(draftKey)
          setScout(mergeScoutOnLoad(data ?? {}, draft))
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

  const scoutPayload = extractPersistentScout(scout)

  useDurableAutosave({
    enabled: loaded,
    storageKey: draftKey,
    value: scoutPayload,
    save: async (body) => {
      await rivalesApi.putScoutManual(rivalId, body)
    },
    keepaliveSave: (body) => {
      rivalesApi.putScoutManualKeepalive(rivalId, body)
    },
    onStatus: setSaveStatus,
  })

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
        onChange={setScout}
      />
    </div>
  )
}
