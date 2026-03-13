'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, ShieldAlert, Ban, Gavel, Info, Shield } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { rfefApi } from '@/lib/api/rfef'
import { apiKey } from '@/lib/swr'
import type { PreMatchTarjetas, TarjetaJugadorResumen } from '@/types'

function CicloVisual({ ciclo, max = 5 }: { ciclo: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <div
          key={i}
          className={`w-2 h-2.5 rounded-sm ${
            i < ciclo ? 'bg-amber-400' : 'bg-slate-700'
          }`}
        />
      ))}
    </div>
  )
}

function MotivoIcon({ motivo }: { motivo?: string | null }) {
  if (!motivo) return null
  switch (motivo) {
    case 'roja':
      return <Ban className="h-2.5 w-2.5" />
    case 'doble_amarilla':
      return <ShieldAlert className="h-2.5 w-2.5" />
    case 'sancion_oficial':
      return <Gavel className="h-2.5 w-2.5" />
    default:
      return null
  }
}

function PlayerRow({ j }: { j: TarjetaJugadorResumen }) {
  const displayName = j.apodo || j.nombre.split(',').reverse().join(' ').trim()

  return (
    <div
      className={`flex items-center gap-2 py-1.5 px-2 rounded ${
        j.estado === 'Sancionado'
          ? 'bg-red-950/40 border border-red-800/20'
          : j.estado === 'Apercibido'
          ? 'bg-amber-950/30 border border-amber-800/20'
          : 'bg-slate-800/50'
      }`}
    >
      {/* Dorsal */}
      <span
        className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
          j.estado === 'Sancionado'
            ? 'bg-red-900/60 text-red-300'
            : 'bg-slate-700 text-slate-300'
        }`}
      >
        {j.dorsal ?? '-'}
      </span>

      {/* Name + position */}
      <div className="flex-1 min-w-0">
        <span className="text-xs text-white truncate block">{displayName}</span>
        {j.posicion_principal && (
          <span className="text-[9px] text-slate-500">{j.posicion_principal}</span>
        )}
      </div>

      {/* Cycle visual */}
      {(j.amarillas_ciclo !== undefined && j.amarillas_ciclo !== null) && (
        <CicloVisual ciclo={j.amarillas_ciclo} />
      )}

      {/* Card counts */}
      <div className="flex items-center gap-1.5 shrink-0">
        {j.amarillas > 0 && (
          <div className="flex items-center gap-0.5">
            <div className="w-2.5 h-3.5 rounded-sm bg-amber-400" />
            <span className="text-[10px] text-amber-400 font-medium">{j.amarillas}</span>
          </div>
        )}
        {j.rojas > 0 && (
          <div className="flex items-center gap-0.5">
            <div className="w-2.5 h-3.5 rounded-sm bg-red-500" />
            <span className="text-[10px] text-red-400 font-medium">{j.rojas}</span>
          </div>
        )}
      </div>

      {/* Status badge */}
      {j.estado === 'Sancionado' && (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[9px] px-1.5 py-0 gap-0.5 shrink-0">
          <MotivoIcon motivo={j.sancionado_motivo} />
          Sancionado{j.sancionado_restantes && j.sancionado_restantes > 1
            ? ` (${j.sancionado_restantes})`
            : ''}
        </Badge>
      )}
      {j.estado === 'Apercibido' && (
        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[9px] px-1.5 py-0 gap-0.5 shrink-0">
          <AlertTriangle className="h-2.5 w-2.5" />
          Apercibido
        </Badge>
      )}
    </div>
  )
}

export function MiEquipoTarjetasWidget({ competicionId }: { competicionId: string }) {
  const { data, error, isLoading } = useSWR<PreMatchTarjetas>(
    competicionId ? apiKey(`/rfef/competiciones/${competicionId}/mi-equipo/tarjetas`) : null,
    () => rfefApi.getMiEquipoTarjetas(competicionId),
  )

  if (isLoading) {
    return (
      <Card className="bg-slate-900 border-slate-700">
        <CardContent className="p-4 flex items-center justify-center min-h-[120px]">
          <Spinner />
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return null
  }

  const jugadores = data.jugadores || []
  const sancionados = jugadores.filter(j => j.estado === 'Sancionado')
  const apercibidos = jugadores.filter(j => j.estado === 'Apercibido')
  const jornadasSinDatos = data.jornadas_sin_datos || []

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-400" />
            <h4 className="text-sm font-bold text-white">Estado Tarjetas - Mi Equipo</h4>
          </div>
          <div className="flex items-center gap-1.5">
            {sancionados.length > 0 && (
              <Badge className="bg-red-500/20 text-red-400 text-[9px]">
                {sancionados.length} sancionado{sancionados.length > 1 ? 's' : ''}
              </Badge>
            )}
            {apercibidos.length > 0 && (
              <Badge className="bg-amber-500/20 text-amber-400 text-[9px]">
                {apercibidos.length} apercibido{apercibidos.length > 1 ? 's' : ''}
              </Badge>
            )}
            <Badge className="bg-slate-800 text-slate-400 text-[9px]">
              {data.actas_con_tarjetas ?? data.total_actas} de {data.total_actas} actas
            </Badge>
          </div>
        </div>

        {/* Incomplete data warning */}
        {jornadasSinDatos.length > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-950/30 border border-amber-800/30">
            <Info className="h-3 w-3 text-amber-500 shrink-0" />
            <span className="text-[10px] text-amber-400">
              Sin datos en jornada{jornadasSinDatos.length > 1 ? 's' : ''}: {jornadasSinDatos.join(', ')}
            </span>
          </div>
        )}

        {/* Players list */}
        {jugadores.length > 0 ? (
          <div className="space-y-1">
            {jugadores.map((j, i) => (
              <PlayerRow key={j.jugador_id || i} j={j} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 text-center py-2">Sin tarjetas registradas</p>
        )}
      </CardContent>
    </Card>
  )
}
