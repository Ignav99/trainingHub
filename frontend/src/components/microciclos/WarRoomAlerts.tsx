'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Bell, CheckCircle, AlertTriangle, Info, ShieldAlert, Zap, RefreshCw, Loader2, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { alertasApi } from '@/lib/api/alertas'
import { mutate } from 'swr'
import type { Alerta } from '@/types'

const PRIORIDAD_ICONS: Record<string, React.ReactNode> = {
  urgente: <Zap className="h-3.5 w-3.5" />,
  alta: <AlertTriangle className="h-3.5 w-3.5" />,
  normal: <Info className="h-3.5 w-3.5" />,
  baja: <Info className="h-3.5 w-3.5" />,
}

const PRIORIDAD_COLORS: Record<string, string> = {
  urgente: 'border-l-red-600 bg-red-50 text-red-800',
  alta: 'border-l-orange-500 bg-orange-50 text-orange-800',
  normal: 'border-l-blue-500 bg-blue-50 text-blue-800',
  baja: 'border-l-gray-400 bg-gray-50 text-gray-700',
}

interface WarRoomAlertsProps {
  alertas: Alerta[]
  equipoId?: string
  microcicloId?: string
}

export function WarRoomAlerts({ alertas, equipoId, microcicloId }: WarRoomAlertsProps) {
  const [detecting, setDetecting] = useState(false)

  const handleDetect = async () => {
    if (!equipoId) return
    setDetecting(true)
    try {
      await alertasApi.detectar(equipoId, microcicloId)
      mutate((key: string) => typeof key === 'string' && key.includes('/microciclos'), undefined, { revalidate: true })
    } finally {
      setDetecting(false)
    }
  }

  if (alertas.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            Alertas
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Sin alertas activas</span>
          </div>
          <div className="flex gap-2 mt-3">
            {equipoId && (
              <Button variant="outline" size="sm" className="text-[10px] h-7" onClick={handleDetect} disabled={detecting}>
                {detecting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                Detectar
              </Button>
            )}
            <Button variant="ghost" size="sm" className="text-[10px] h-7" asChild>
              <Link href="/alertas">Ver todas <ArrowRight className="h-3 w-3 ml-1" /></Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const urgentes = alertas.filter(a => a.prioridad === 'urgente' || a.prioridad === 'alta')
  const otras = alertas.filter(a => a.prioridad !== 'urgente' && a.prioridad !== 'alta')

  return (
    <Card className={urgentes.length > 0 ? 'border-red-300 ring-1 ring-red-200/50' : ''}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bell className={`h-4 w-4 ${urgentes.length > 0 ? 'text-red-600 animate-pulse' : 'text-muted-foreground'}`} />
          Alertas
          {alertas.length > 0 && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 ml-1">
              {alertas.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {alertas.map((alerta) => (
          <div
            key={alerta.id}
            className={`flex items-start gap-2.5 p-2.5 rounded-lg border-l-2 transition-colors ${
              PRIORIDAD_COLORS[alerta.prioridad] || PRIORIDAD_COLORS.normal
            }`}
          >
            <span className="shrink-0 mt-0.5">{PRIORIDAD_ICONS[alerta.prioridad]}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold leading-tight">{alerta.titulo}</p>
              {alerta.mensaje && (
                <p className="text-[11px] mt-0.5 opacity-80">{alerta.mensaje}</p>
              )}
            </div>
            {alerta.accion_url && (
              <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2 shrink-0" asChild>
                <a href={alerta.accion_url}>Ir</a>
              </Button>
            )}
          </div>
        ))}
        <div className="flex gap-2 pt-2">
          {equipoId && (
            <Button variant="outline" size="sm" className="text-[10px] h-7" onClick={handleDetect} disabled={detecting}>
              {detecting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
              Detectar
            </Button>
          )}
          <Button variant="ghost" size="sm" className="text-[10px] h-7" asChild>
            <Link href="/alertas">Ver todas <ArrowRight className="h-3 w-3 ml-1" /></Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
