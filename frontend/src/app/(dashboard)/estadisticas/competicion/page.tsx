'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Trophy,
  RefreshCw,
  Link2,
  Loader2,
  Award,
  MapPin,
  Swords,
  ArrowLeft,
  Star,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Download,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useEquipoStore } from '@/stores/equipoStore'
import {
  rfefApi,
  RFEFCompeticion,
  RFEFJornada,
} from '@/lib/api/rfef'
import { partidosApi } from '@/lib/api/partidos'
import type { Partido } from '@/types'

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
  const [jornadas, setJornadas] = useState<RFEFJornada[]>([])
  const [misPartidos, setMisPartidos] = useState<Partido[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncingFull, setSyncingFull] = useState(false)

  // Setup form
  const [showSetup, setShowSetup] = useState(false)
  const [setupUrl, setSetupUrl] = useState('')
  const [setupNombre, setSetupNombre] = useState('')
  const [setupLoading, setSetupLoading] = useState(false)
  const [setupError, setSetupError] = useState('')

  // Mi equipo selection
  const [selectingEquipo, setSelectingEquipo] = useState(false)
  const [settingEquipo, setSettingEquipo] = useState(false)

  // Jornada navigator
  const [currentJornada, setCurrentJornada] = useState(1)

  const fetchCompeticiones = useCallback(async () => {
    if (!equipoActivo?.id) return
    setLoading(true)
    try {
      const res = await rfefApi.listCompeticiones({ equipo_id: equipoActivo.id })
      setCompeticiones(res.data || [])

      const withRfef = (res.data || []).find((c) => c.rfef_codcompeticion)
      if (withRfef) {
        setSelected(withRfef)
        await loadCompeticionData(withRfef)
      } else if (res.data?.length === 0) {
        setShowSetup(true)
      }
    } catch (err) {
      console.error('Error fetching competiciones:', err)
    } finally {
      setLoading(false)
    }
  }, [equipoActivo?.id])

  async function loadCompeticionData(comp: RFEFCompeticion) {
    // Load jornadas
    try {
      const jornadasRes = await rfefApi.listJornadas(comp.id)
      setJornadas(jornadasRes.data || [])
      // Set current jornada to latest with results
      const withResults = (jornadasRes.data || []).filter(j =>
        j.partidos?.some(p => p.goles_local !== null)
      )
      if (withResults.length > 0) {
        setCurrentJornada(withResults[withResults.length - 1].numero)
      }
    } catch { /* ok */ }

    // Load mis partidos (auto-created from this competition)
    if (equipoActivo?.id) {
      try {
        const partidosRes = await partidosApi.list({
          equipo_id: equipoActivo.id,
          orden: 'jornada',
          direccion: 'asc',
          limit: 50,
        })
        // Filter to ones linked to this competition
        setMisPartidos(
          (partidosRes?.data || []).filter(p => p.rfef_competicion_id === comp.id || p.competicion === 'liga')
        )
      } catch { /* ok */ }
    }
  }

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
      await loadCompeticionData(comp)
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
      const updated = await rfefApi.getCompeticion(selected.id)
      setSelected(updated)
      await loadCompeticionData(updated)
    } catch (err) {
      console.error('Sync error:', err)
    } finally {
      setSyncing(false)
    }
  }

  async function handleSyncFull() {
    if (!selected) return
    setSyncingFull(true)
    try {
      await rfefApi.syncFull(selected.id)
      const updated = await rfefApi.getCompeticion(selected.id)
      setSelected(updated)
      await loadCompeticionData(updated)
    } catch (err) {
      console.error('Full sync error:', err)
    } finally {
      setSyncingFull(false)
    }
  }

  async function handleSetMiEquipo(nombre: string) {
    if (!selected) return
    setSettingEquipo(true)
    try {
      await rfefApi.setMiEquipo(selected.id, nombre)
      // Trigger full sync + link
      await rfefApi.syncFull(selected.id)
      const updated = await rfefApi.getCompeticion(selected.id)
      setSelected(updated)
      setSelectingEquipo(false)
      await loadCompeticionData(updated)
    } catch (err: any) {
      console.error('Error setting mi equipo:', err)
    } finally {
      setSettingEquipo(false)
    }
  }

  if (!equipoActivo) {
    return (
      <div className="text-center py-12">
        <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Selecciona un equipo para ver la competicion</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            Competicion
          </h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-lg" />
      </div>
    )
  }

  const clasificacion = selected?.clasificacion || []
  const goleadores = selected?.goleadores || []
  const miEquipoNombre = selected?.mi_equipo_nombre?.toLowerCase() || ''

  // Find user's team position using mi_equipo_nombre
  const miEquipo = miEquipoNombre
    ? clasificacion.find((e) => e.equipo.toLowerCase() === miEquipoNombre)
    : null

  // Current jornada data
  const jornadaData = jornadas.find(j => j.numero === currentJornada)
  const maxJornada = jornadas.length > 0 ? Math.max(...jornadas.map(j => j.numero)) : (selected?.calendario?.length || 0)
  const calendarMax = selected?.calendario?.length || maxJornada

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
              {selected?.nombre || 'Competicion RFAF'}
            </h1>
          </div>
          {selected?.ultima_sincronizacion && (
            <p className="text-xs text-muted-foreground ml-6">
              Actualizado: {timeAgo(selected.ultima_sincronizacion)}
              {selected.mi_equipo_nombre && (
                <span className="ml-2">
                  · <Star className="h-3 w-3 inline text-amber-500" /> {selected.mi_equipo_nombre}
                </span>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selected && (
            <>
              <Button variant="outline" size="sm" onClick={handleSyncFull} disabled={syncingFull || syncing}>
                <Download className={`h-4 w-4 mr-1.5 ${syncingFull ? 'animate-pulse' : ''}`} />
                {syncingFull ? 'Sync completo...' : 'Sync completo'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing || syncingFull}>
                <RefreshCw className={`h-4 w-4 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Actualizando...' : 'Actualizar'}
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowSetup(!showSetup)}>
            <Link2 className="h-4 w-4 mr-1.5" />
            {selected ? 'Otra' : 'Conectar RFAF'}
          </Button>
        </div>
      </div>

      {/* Setup form */}
      {showSetup && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-sm mb-3">Conectar competicion RFAF</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Pega la URL de la clasificacion de tu grupo desde{' '}
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
                placeholder="Nombre de la competicion (opcional)"
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
                await loadCompeticionData(c)
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
              <p className="text-xs text-muted-foreground mt-1">Posicion</p>
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
              <div className="flex items-center justify-center gap-1">
                <Ultimos5 resultados={miEquipo.ultimos_5} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {miEquipo.pg}V {miEquipo.pe}E {miEquipo.pp}D
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      {selected && (
        <Tabs defaultValue="clasificacion">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="clasificacion">Clasificacion</TabsTrigger>
            <TabsTrigger value="jornadas">Jornadas</TabsTrigger>
            <TabsTrigger value="mis-partidos">Mis Partidos</TabsTrigger>
            <TabsTrigger value="goleadores">Goleadores</TabsTrigger>
          </TabsList>

          {/* ===== Tab: Clasificacion ===== */}
          <TabsContent value="clasificacion">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Trophy className="h-4 w-4" />
                    Clasificacion
                  </CardTitle>
                  {!selected.mi_equipo_nombre && clasificacion.length > 0 && (
                    <Button
                      variant={selectingEquipo ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectingEquipo(!selectingEquipo)}
                    >
                      <Star className="h-3.5 w-3.5 mr-1.5" />
                      {selectingEquipo ? 'Cancelar seleccion' : 'Seleccionar mi equipo'}
                    </Button>
                  )}
                </div>
                {selectingEquipo && (
                  <p className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-md">
                    Haz clic en tu equipo en la tabla para seleccionarlo. Esto activara la importacion automatica de partidos y rivales.
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {clasificacion.length > 0 ? (
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
                          const isMyTeam = miEquipoNombre
                            ? e.equipo.toLowerCase() === miEquipoNombre
                            : false

                          return (
                            <tr
                              key={e.posicion}
                              className={`border-b last:border-0 transition-colors ${
                                isMyTeam ? 'bg-primary/5 font-semibold' : ''
                              } ${selectingEquipo ? 'cursor-pointer hover:bg-amber-50' : ''}`}
                              onClick={() => {
                                if (selectingEquipo && !settingEquipo) {
                                  handleSetMiEquipo(e.equipo)
                                }
                              }}
                            >
                              <td className="py-2 text-muted-foreground">{e.posicion}</td>
                              <td className="py-2">
                                <span className={`flex items-center gap-1.5 ${isMyTeam ? 'text-primary' : ''}`}>
                                  {isMyTeam && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                                  {e.equipo}
                                </span>
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
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Sin datos de clasificacion. Sincroniza la competicion primero.
                  </p>
                )}
              </CardContent>
            </Card>
            {settingEquipo && (
              <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Configurando equipo y sincronizando todas las jornadas...
              </div>
            )}
          </TabsContent>

          {/* ===== Tab: Jornadas ===== */}
          <TabsContent value="jornadas">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Jornada {currentJornada}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={currentJornada <= 1}
                      onClick={() => setCurrentJornada(currentJornada - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium min-w-[80px] text-center">
                      {currentJornada} / {calendarMax}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={currentJornada >= calendarMax}
                      onClick={() => setCurrentJornada(currentJornada + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {jornadaData?.partidos?.length ? (
                  <div className="space-y-2">
                    {jornadaData.partidos.map((p, i) => {
                      const localLower = p.local.toLowerCase()
                      const visitanteLower = p.visitante.toLowerCase()
                      const isMyMatch = miEquipoNombre && (
                        localLower === miEquipoNombre ||
                        miEquipoNombre.includes(localLower) ||
                        localLower.includes(miEquipoNombre) ||
                        visitanteLower === miEquipoNombre ||
                        miEquipoNombre.includes(visitanteLower) ||
                        visitanteLower.includes(miEquipoNombre)
                      )

                      return (
                        <div
                          key={i}
                          className={`flex items-center gap-3 py-2.5 px-3 rounded-lg border ${
                            isMyMatch ? 'border-amber-300 bg-amber-50' : 'border-transparent'
                          }`}
                        >
                          <span className={`flex-1 text-right text-sm ${isMyMatch && localLower.includes(miEquipoNombre) ? 'font-bold text-primary' : ''}`}>
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
                          <span className={`flex-1 text-sm ${isMyMatch && visitanteLower.includes(miEquipoNombre) ? 'font-bold text-primary' : ''}`}>
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
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {jornadas.length === 0
                      ? 'Haz un "Sync completo" para descargar todas las jornadas'
                      : 'No hay datos para esta jornada'}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== Tab: Mis Partidos ===== */}
          <TabsContent value="mis-partidos">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Swords className="h-4 w-4" />
                  Mis Partidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!selected.mi_equipo_nombre ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Selecciona tu equipo en la tab Clasificacion para ver tus partidos.
                  </p>
                ) : misPartidos.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No hay partidos importados. Haz un "Sync completo" primero.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {misPartidos.map((p) => {
                      const played = p.goles_favor !== undefined && p.goles_favor !== null
                      return (
                        <Link
                          key={p.id}
                          href={`/partidos/${p.id}`}
                          className="flex items-center gap-3 py-2.5 px-3 rounded-lg border hover:bg-muted/30 transition-colors"
                        >
                          <div className="w-8 text-center">
                            <span className="text-xs text-muted-foreground font-medium">J{p.jornada || '?'}</span>
                          </div>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {p.localia === 'local' ? 'LOCAL' : 'VISIT'}
                          </Badge>
                          <span className="flex-1 text-sm font-medium truncate">
                            {p.rival?.nombre || 'Rival'}
                          </span>
                          {p.fecha && (
                            <span className="text-xs text-muted-foreground hidden sm:block">
                              {new Date(p.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                          {p.hora && (
                            <span className="text-xs text-muted-foreground">{p.hora}</span>
                          )}
                          {played ? (
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-bold ${
                                p.resultado === 'victoria' ? 'text-emerald-600' : p.resultado === 'derrota' ? 'text-red-600' : 'text-amber-600'
                              }`}>
                                {p.goles_favor} - {p.goles_contra}
                              </span>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">Pendiente</Badge>
                          )}
                          {p.ubicacion && (
                            <span className="text-[10px] text-muted-foreground hidden lg:flex items-center gap-0.5">
                              <MapPin className="h-2.5 w-2.5" />
                              {p.ubicacion}
                            </span>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== Tab: Goleadores ===== */}
          <TabsContent value="goleadores">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Goleadores
                </CardTitle>
              </CardHeader>
              <CardContent>
                {goleadores.length > 0 ? (
                  <div className="space-y-1">
                    {goleadores.map((g, i) => (
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
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Sin datos de goleadores. Sincroniza la competicion primero.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
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
              Conectar competicion
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
