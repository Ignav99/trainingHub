'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR, { mutate } from 'swr'
import { Bell, Loader2, CheckCircle2, AlertTriangle, ArrowLeft, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { apiKey } from '@/lib/swr'
import { alertasApi } from '@/lib/api/alertas'
import { useEquipoStore } from '@/stores/equipoStore'
import type { Alerta } from '@/types'

const PRIORITY_COLORS: Record<string, string> = {
  baja: 'bg-gray-100 text-gray-700',
  normal: 'bg-blue-100 text-blue-700',
  alta: 'bg-amber-100 text-amber-700',
  urgente: 'bg-red-100 text-red-700',
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  microciclo_sin_sesion: <AlertTriangle className="h-4 w-4 text-amber-600" />,
  plan_partido_faltante: <AlertTriangle className="h-4 w-4 text-red-600" />,
  carga_critica: <AlertTriangle className="h-4 w-4 text-red-600" />,
  jugador_sancion: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
  default: <Bell className="h-4 w-4 text-blue-600" />,
}

export default function AlertasPage() {
  const { equipoActivo } = useEquipoStore()
  const [filter, setFilter] = useState<'todas' | 'activas' | 'resueltas'>('activas')
  const [detecting, setDetecting] = useState(false)

  const { data, isLoading, error } = useSWR<{ data: Alerta[]; total: number }>(
    equipoActivo?.id
      ? apiKey('/alertas', {
          equipo_id: equipoActivo.id,
          resuelta: filter === 'resueltas' ? true : filter === 'activas' ? false : undefined,
        })
      : null
  )

  const alertas = data?.data || []

  const handleDetect = async () => {
    if (!equipoActivo?.id) return
    setDetecting(true)
    try {
      const result = await alertasApi.detectar(equipoActivo.id)
      mutate((key: string) => typeof key === 'string' && key.includes('/alertas'), undefined, { revalidate: true })
      if (result.generadas === 0) {
        // ok
      }
    } catch (err: any) {
      // ignore
    } finally {
      setDetecting(false)
    }
  }

  const handleResolve = async (alerta: Alerta) => {
    try {
      await alertasApi.update(alerta.id, { resuelta: true, notas_resolucion: 'Resuelta desde el dashboard' })
      mutate((key: string) => typeof key === 'string' && key.includes('/alertas'), undefined, { revalidate: true })
    } catch (err: any) {
      // ignore
    }
  }

  const handleDelete = async (alerta: Alerta) => {
    try {
      await alertasApi.delete(alerta.id)
      mutate((key: string) => typeof key === 'string' && key.includes('/alertas'), undefined, { revalidate: true })
    } catch (err: any) {
      // ignore
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-7 w-7 text-primary" />
            Alertas
          </h1>
          <p className="text-sm text-muted-foreground">
            {equipoActivo?.nombre || 'Tu equipo'} · {data?.total || 0} alertas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="rounded-md border bg-background px-3 py-2 text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
          >
            <option value="activas">Activas</option>
            <option value="resueltas">Resueltas</option>
            <option value="todas">Todas</option>
          </select>
          <Button variant="outline" size="sm" onClick={handleDetect} disabled={detecting}>
            {detecting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Detectar
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="py-12 text-center text-destructive">
            Error al cargar alertas
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && alertas.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium text-muted-foreground">No hay alertas</p>
            <p className="text-sm text-muted-foreground mt-1">
              Pulsa "Detectar" para revisar el estado del equipo.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {alertas.map((alerta) => (
          <Card key={alerta.id} className={alerta.resuelta ? 'opacity-60' : ''}>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="mt-0.5">
                  {TYPE_ICONS[alerta.tipo] || TYPE_ICONS.default}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium">{alerta.titulo}</h3>
                    <Badge className={PRIORITY_COLORS[alerta.prioridad]}>{alerta.prioridad}</Badge>
                    {alerta.resuelta && (
                      <Badge variant="outline" className="text-green-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Resuelta
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{alerta.mensaje}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(alerta.created_at).toLocaleString('es-ES')}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {alerta.accion_url && !alerta.resuelta && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={alerta.accion_url}>Ver</Link>
                    </Button>
                  )}
                  {!alerta.resuelta && (
                    <Button variant="ghost" size="icon" onClick={() => handleResolve(alerta)}>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(alerta)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
