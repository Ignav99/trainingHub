'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Trophy,
  RefreshCw,
  Link2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Award,
  MapPin,
  Clock,
  Swords,
  ArrowLeft,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useEquipoStore } from '@/stores/equipoStore'
import {
  rfefApi,
  RFEFCompeticion,
  RFEFClasificacionEquipo,
  RFEFJornada,
  RFEFGoleador,
} from '@/lib/api/rfef'

// ============ Helpers ============

function Ultimos5({ resultados }: { resultados?: ('V' | 'E' | 'D')[] }) {
  if (!resultados?.length) return null
  return (
    <div className="flex gap-0.5">
      {resultados.map((r, i) => (
        <span
          key={i}
          className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white ${
            r === 'V' ? 'bg-emerald-500' : r === 'E' ? 'bg-amber-400' : 'bg-red-500'
          }`}
        >
          {r}
        </span>
      ))}
    </div>
  )
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return 'Nunca'
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Hace un momento'
  if (diffMin < 60) return `Hace ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `Hace ${diffH}h`
  const diffD = Math.floor(diffH / 24)
  return `Hace ${diffD}d`
}

// ============ Main Page ============

export default function CompeticionPage() {
  const { equipoActivo } = useEquipoStore()
  const [competiciones, setCompeticiones] = useState<RFEFCompeticion[]>([])
  const [selected, setSelected] = useState<RFEFCompeticion | null>(null)
  const [jornadaActual, setJornadaActual] = useState<RFEFJornada | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  // Setup form
  const [showSetup, setShowSetup] = useState(false)
  const [setupUrl, setSetupUrl] = useState('')
  const [setupNombre, setSetupNombre] = useState('')
  const [setupLoading, setSetupLoading] = useState(false)
  const [setupError, setSetupError] = useState('')

  // Expandable sections
  const [showGoleadores, setShowGoleadores] = useState(false)

  const fetchCompeticiones = useCallback(async () => {
    if (!equipoActivo?.id) return
    setLoading(true)
    try {
      const res = await rfefApi.listCompeticiones({ equipo_id: equipoActivo.id })
      setCompeticiones(res.data || [])

      // Auto-select first with RFAF params
      const withRfef = (res.data || []).find((c) => c.rfef_codcompeticion)
      if (withRfef) {
        setSelected(withRfef)
        // Load jornada actual
        try {
          const jornada = await rfefApi.getJornadaActual(withRfef.id)
          setJornadaActual(jornada)
        } catch {
          // No jornada available
        }
      } else if (res.data?.length === 0) {
        setShowSetup(true)
      }
    } catch (err) {
      console.error('Error fetching competiciones:', err)
    } finally {
      setLoading(false)
    }
  }, [equipoActivo?.id])

  useEffect(() => {
    fetchCompeticiones()
  }, [fetchCompeticiones])

  async function handleSetup() {
    if (!equipoActivo?.id || !setupUrl.trim()) return
    setSetupLoading(true)
    setSetupError('')
    try {
      const comp = await rfefApi.setupFromUrl({
        url: setupUrl.trim(),
        equipo_id: equipoActivo.id,
        nombre: setupNombre.trim() || undefined,
      })
      setSelected(comp)
      setShowSetup(false)
      setSetupUrl('')
      setSetupNombre('')
      await fetchCompeticiones()
      // Load jornada
      try {
        const jornada = await rfefApi.getJornadaActual(comp.id)
        setJornadaActual(jornada)
      } catch {
        // ok
      }
    } catch (err: any) {
      setSetupError(err.message || 'Error al conectar con la RFAF')
    } finally {
      setSetupLoading(false)
    }
  }

  async function handleSync() {
    if (!selected) return
    setSyncing(true)
    try {
      await rfefApi.syncCompeticion(selected.id)
      // Refresh data
      const updated = await rfefApi.getCompeticion(selected.id)
      setSelected(updated)
      try {
        const jornada = await rfefApi.getJornadaActual(selected.id)
        setJornadaActual(jornada)
      } catch {
        // ok
      }
    } catch (err) {
      console.error('Sync error:', err)
    } finally {
      setSyncing(false)
    }
  }

  if (!equipoActivo) {
    return (
      <div className="text-center py-12">
        <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Selecciona un equipo para ver la competición</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            Competición
          </h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-lg" />
      </div>
    )
  }

  const clasificacion = selected?.clasificacion || []
  const goleadores = selected?.goleadores || []

  // Find user's team position
  const equipoNombre = equipoActivo.nombre?.toLowerCase() || ''
  const miEquipo = clasificacion.find(
    (e) => e.equipo.toLowerCase().includes(equipoNombre) || equipoNombre.includes(e.equipo.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/estadisticas" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="h-6 w-6 text-primary" />
              {selected?.nombre || 'Competición RFAF'}
            </h1>
          </div>
          {selected?.ultima_sincronizacion && (
            <p className="text-xs text-muted-foreground ml-6">
              Actualizado: {timeAgo(selected.ultima_sincronizacion)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selected && (
            <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
              <RefreshCw className={`h-4 w-4 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizando...' : 'Actualizar'}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowSetup(!showSetup)}>
            <Link2 className="h-4 w-4 mr-1.5" />
            {selected ? 'Otra competición' : 'Conectar RFAF'}
          </Button>
        </div>
      </div>

      {/* Setup form */}
      {showSetup && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-sm mb-3">Conectar competición RFAF</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Pega la URL de la clasificación de tu grupo desde{' '}
              <a href="https://www.rfaf.es" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                rfaf.es
              </a>
            </p>
            <div className="space-y-3">
              <Input
                placeholder="https://www.rfaf.es/pnfg/NPcd/NFG_VisClasificacion?codgrupo=..."
                value={setupUrl}
                onChange={(e) => setSetupUrl(e.target.value)}
              />
              <Input
                placeholder="Nombre de la competición (opcional)"
                value={setupNombre}
                onChange={(e) => setSetupNombre(e.target.value)}
              />
              {setupError && <p className="text-xs text-red-600">{setupError}</p>}
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSetup} disabled={setupLoading || !setupUrl.trim()}>
                  {setupLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      Conectando...
                    </>
                  ) : (
                    'Conectar'
                  )}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowSetup(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Competition selector (if multiple) */}
      {competiciones.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {competiciones.map((c) => (
            <Button
              key={c.id}
              variant={selected?.id === c.id ? 'default' : 'outline'}
              size="sm"
              onClick={async () => {
                setSelected(c)
                try {
                  const jornada = await rfefApi.getJornadaActual(c.id)
                  setJornadaActual(jornada)
                } catch {
                  setJornadaActual(null)
                }
              }}
            >
              {c.nombre}
            </Button>
          ))}
        </div>
      )}

      {/* Position summary cards */}
      {miEquipo && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-primary">{miEquipo.posicion}&#186;</p>
              <p className="text-xs text-muted-foreground mt-1">Posición</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold">{miEquipo.puntos}</p>
              <p className="text-xs text-muted-foreground mt-1">Puntos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-emerald-600">{miEquipo.gf}</p>
              <p className="text-xs text-muted-foreground mt-1">GF ({miEquipo.gc} GC)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold">
                {miEquipo.pg}V {miEquipo.pe}E {miEquipo.pp}D
              </p>
              <p className="text-xs text-muted-foreground mt-1">{miEquipo.pj} jugados</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Classification table */}
      {clasificacion.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Clasificación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground text-xs">
                    <th className="pb-2 font-medium w-8">#</th>
                    <th className="pb-2 font-medium">Equipo</th>
                    <th className="pb-2 font-medium text-center">PTS</th>
                    <th className="pb-2 font-medium text-center">PJ</th>
                    <th className="pb-2 font-medium text-center">PG</th>
                    <th className="pb-2 font-medium text-center">PE</th>
                    <th className="pb-2 font-medium text-center">PP</th>
                    <th className="pb-2 font-medium text-center">GF</th>
                    <th className="pb-2 font-medium text-center">GC</th>
                    <th className="pb-2 font-medium text-center hidden md:table-cell">Forma</th>
                  </tr>
                </thead>
                <tbody>
                  {clasificacion.map((e) => {
                    const isMyTeam =
                      e.equipo.toLowerCase().includes(equipoNombre) ||
                      equipoNombre.includes(e.equipo.toLowerCase())

                    return (
                      <tr
                        key={e.posicion}
                        className={`border-b last:border-0 ${
                          isMyTeam ? 'bg-primary/5 font-semibold' : ''
                        }`}
                      >
                        <td className="py-2 text-muted-foreground">{e.posicion}</td>
                        <td className="py-2">
                          <span className={isMyTeam ? 'text-primary' : ''}>{e.equipo}</span>
                        </td>
                        <td className="py-2 text-center font-bold">{e.puntos}</td>
                        <td className="py-2 text-center text-muted-foreground">{e.pj}</td>
                        <td className="py-2 text-center text-emerald-600">{e.pg}</td>
                        <td className="py-2 text-center text-amber-600">{e.pe}</td>
                        <td className="py-2 text-center text-red-600">{e.pp}</td>
                        <td className="py-2 text-center">{e.gf}</td>
                        <td className="py-2 text-center">{e.gc}</td>
                        <td className="py-2 text-center hidden md:table-cell">
                          <Ultimos5 resultados={e.ultimos_5} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current matchday */}
      {jornadaActual && jornadaActual.partidos?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Swords className="h-4 w-4" />
              Jornada {jornadaActual.numero}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {jornadaActual.partidos.map((p, i) => {
                const isMyMatch =
                  p.local.toLowerCase().includes(equipoNombre) ||
                  p.visitante.toLowerCase().includes(equipoNombre) ||
                  equipoNombre.includes(p.local.toLowerCase()) ||
                  equipoNombre.includes(p.visitante.toLowerCase())

                return (
                  <div
                    key={i}
                    className={`flex items-center gap-3 py-2.5 px-3 rounded-lg border ${
                      isMyMatch ? 'border-primary/30 bg-primary/5' : 'border-transparent'
                    }`}
                  >
                    <span className={`flex-1 text-right text-sm ${isMyMatch ? 'font-semibold' : ''}`}>
                      {p.local}
                    </span>
                    <div className="min-w-[60px] text-center">
                      {p.goles_local !== null && p.goles_visitante !== null ? (
                        <Badge variant="outline" className="font-bold">
                          {p.goles_local} - {p.goles_visitante}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {p.hora || 'vs'}
                        </span>
                      )}
                    </div>
                    <span className={`flex-1 text-sm ${isMyMatch ? 'font-semibold' : ''}`}>
                      {p.visitante}
                    </span>
                    {p.campo && (
                      <span className="text-[10px] text-muted-foreground hidden lg:flex items-center gap-0.5">
                        <MapPin className="h-2.5 w-2.5" />
                        {p.campo}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top scorers */}
      {goleadores.length > 0 && (
        <Card>
          <CardHeader className="cursor-pointer" onClick={() => setShowGoleadores(!showGoleadores)}>
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Award className="h-4 w-4" />
                Goleadores
              </span>
              {showGoleadores ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </CardTitle>
          </CardHeader>
          {showGoleadores && (
            <CardContent>
              <div className="space-y-1">
                {goleadores.slice(0, 10).map((g, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-1.5 px-2 rounded text-sm hover:bg-muted/30"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                      <span className="font-medium">{g.jugador}</span>
                      <span className="text-xs text-muted-foreground">({g.equipo})</span>
                    </div>
                    <Badge variant="outline" className="font-bold">
                      {g.goles}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Empty state */}
      {!selected && competiciones.length === 0 && !showSetup && (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              No hay competiciones RFAF conectadas
            </p>
            <Button onClick={() => setShowSetup(true)}>
              <Link2 className="h-4 w-4 mr-1.5" />
              Conectar competición
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
