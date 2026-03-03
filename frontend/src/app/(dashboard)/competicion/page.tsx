'use client'

import { useState, useEffect } from 'react'
import useSWR, { mutate } from 'swr'
import { useEquipoStore } from '@/stores/equipoStore'
import {
  rfefApi,
  RFEFCompeticion,
  RFEFClasificacionEquipo,
  RFEFGoleador,
  RFEFJornada,
  RFEFPartidoJornada,
} from '@/lib/api/rfef'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Spinner } from '@/components/ui/spinner'
import { ListPageSkeleton } from '@/components/ui/page-skeletons'
import { apiKey } from '@/lib/swr'
import {
  Trophy,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Link2,
  Check,
  Clock,
  Trash2,
  Users,
  Swords,
} from 'lucide-react'
import Link from 'next/link'

export default function CompeticionPage() {
  const { equipoActivo } = useEquipoStore()
  const [competicion, setCompeticion] = useState<RFEFCompeticion | null>(null)
  const [jornadas, setJornadas] = useState<RFEFJornada[]>([])
  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Setup state
  const [setupUrl, setSetupUrl] = useState('')
  const [setupName, setSetupName] = useState('')
  const [settingUp, setSettingUp] = useState(false)

  // Mi equipo selection
  const [selectingEquipo, setSelectingEquipo] = useState(false)
  const [savingEquipo, setSavingEquipo] = useState(false)

  // Jornada navigation
  const [currentJornada, setCurrentJornada] = useState(1)

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState(false)

  // SWR: Load competiciones
  const { data: competicionesRes, isLoading: loading } = useSWR<{ data: RFEFCompeticion[]; total: number }>(
    apiKey('/rfef/competiciones', {
      equipo_id: equipoActivo?.id,
    }, ['equipo_id']),
    {
      onSuccess: async (res) => {
        if (res.data.length > 0 && !competicion) {
          const comp = res.data[0]
          setCompeticion(comp)
          // Load jornadas
          try {
            const jornadasRes = await rfefApi.listJornadas(comp.id)
            setJornadas(jornadasRes.data)
            // Set current jornada to latest with results
            const withResults = jornadasRes.data.filter(j =>
              j.partidos?.some(p => p.goles_local !== null)
            )
            if (withResults.length > 0) {
              setCurrentJornada(withResults[withResults.length - 1].numero)
            } else if (jornadasRes.data.length > 0) {
              setCurrentJornada(jornadasRes.data[0].numero)
            }
          } catch { /* ok */ }
        }
      },
    }
  )

  // Show team selector when competition loaded but no team selected
  useEffect(() => {
    if (competicion && !competicion.mi_equipo_nombre && !selectingEquipo) {
      setSelectingEquipo(true)
    }
  }, [competicion, selectingEquipo])

  const reloadCompeticion = async () => {
    if (!equipoActivo?.id) return
    try {
      const res = await rfefApi.listCompeticiones({ equipo_id: equipoActivo.id })
      if (res.data.length > 0) {
        const comp = res.data[0]
        setCompeticion(comp)
        const jornadasRes = await rfefApi.listJornadas(comp.id)
        setJornadas(jornadasRes.data)
        const withResults = jornadasRes.data.filter(j =>
          j.partidos?.some(p => p.goles_local !== null)
        )
        if (withResults.length > 0) {
          setCurrentJornada(withResults[withResults.length - 1].numero)
        } else if (jornadasRes.data.length > 0) {
          setCurrentJornada(jornadasRes.data[0].numero)
        }
      } else {
        setCompeticion(null)
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar competicion')
    }
  }

  const handleSetup = async () => {
    if (!equipoActivo?.id || !setupUrl) return
    setSettingUp(true)
    setError(null)
    try {
      const comp = await rfefApi.setupFromUrl({
        url: setupUrl,
        equipo_id: equipoActivo.id,
        nombre: setupName || undefined,
      })
      setCompeticion(comp)
      setSetupUrl('')
      setSetupName('')
      // Show team selector immediately
      setSelectingEquipo(true)
      // Reload to get jornadas
      mutate((key: string) => typeof key === 'string' && key.includes('/rfef'), undefined, { revalidate: true })
      await reloadCompeticion()
    } catch (err: any) {
      const msg = err.message || 'Error al importar'
      if (msg.includes('0 bytes') || msg.includes('502')) {
        setError('La web de la RFAF no responde en este momento. Intentalo de nuevo en unos minutos.')
      } else {
        setError(msg)
      }
    } finally {
      setSettingUp(false)
    }
  }

  // After selecting team, trigger full sync to download ALL jornadas
  const handleSetMiEquipoAndSync = async (nombre: string) => {
    await handleSetMiEquipo(nombre)
    // Now trigger sync-full to get all jornadas (without waiting for actas)
    if (competicion) {
      setSyncing(true)
      setSyncStatus('Descargando todas las jornadas...')
      try {
        const result = await rfefApi.syncFull(competicion.id)
        setSyncStatus(
          `Listo: ${result.equipos_clasificacion} equipos, ${result.jornadas_saved}/${result.jornadas_total || '?'} jornadas` +
          (result.link_result ? `, ${result.link_result.partidos_created || 0} partidos creados` : '') +
          (result.errors?.length ? ` (${result.errors.length} errores)` : '')
        )
        mutate((key: string) => typeof key === 'string' && key.includes('/rfef'), undefined, { revalidate: true })
        await reloadCompeticion()
      } catch (err: any) {
        // Non-critical — the setup itself already worked
        console.error('Sync-full after setup:', err)
      } finally {
        setSyncing(false)
      }
    }
  }

  const handleSync = async () => {
    if (!competicion) return
    setSyncing(true)
    setSyncStatus('Sincronizando clasificacion...')
    setError(null)
    try {
      const result = await rfefApi.syncFull(competicion.id)
      if (result.jornadas_saved === 0 && result.equipos_clasificacion === 0) {
        setError('La RFAF no devolvio datos. Es posible que este caida temporalmente. Intentalo mas tarde.')
      } else {
        setSyncStatus(
          `Listo: ${result.equipos_clasificacion} equipos, ${result.jornadas_saved}/${result.jornadas_total || '?'} jornadas` +
          (result.actas_saved ? `, ${result.actas_saved} actas` : '') +
          (result.errors?.length ? ` (${result.errors.length} errores)` : '')
        )
      }
      mutate((key: string) => typeof key === 'string' && key.includes('/rfef'), undefined, { revalidate: true })
      await reloadCompeticion()
    } catch (err: any) {
      const msg = err.message || 'Error al sincronizar'
      if (msg.includes('502') || msg.includes('RFAF')) {
        setError('La web de la RFAF no responde. Intentalo mas tarde.')
      } else {
        setError(msg)
      }
    } finally {
      setSyncing(false)
    }
  }

  const handleSetMiEquipo = async (nombre: string) => {
    if (!competicion) return
    setSavingEquipo(true)
    setError(null)
    try {
      await rfefApi.setMiEquipo(competicion.id, nombre)
      setCompeticion(prev => prev ? { ...prev, mi_equipo_nombre: nombre } : null)
      setSelectingEquipo(false)
      // Trigger link to create rivals and matches
      try {
        const linkResult = await rfefApi.linkCompeticion(competicion.id)
        setSyncStatus(
          `Equipo seleccionado. Rivales creados: ${linkResult.rivales_created}, Partidos: ${linkResult.partidos_created}`
        )
      } catch {
        // Link might fail if no jornadas yet — that's ok
      }
      mutate((key: string) => typeof key === 'string' && key.includes('/rfef'), undefined, { revalidate: true })
    } catch (err: any) {
      setError(err.message || 'Error al seleccionar equipo')
    } finally {
      setSavingEquipo(false)
    }
  }

  const handleDelete = async () => {
    if (!competicion) return
    try {
      await rfefApi.deleteCompeticion(competicion.id)
      setCompeticion(null)
      setJornadas([])
      setConfirmDelete(false)
      setSyncStatus(null)
      mutate((key: string) => typeof key === 'string' && key.includes('/rfef'), undefined, { revalidate: true })
    } catch (err: any) {
      setError(err.message || 'Error al eliminar')
    }
  }

  if (loading) {
    return <ListPageSkeleton />
  }

  // ============ No competition: Setup screen ============
  if (!competicion) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <div className="text-center mb-8">
          <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h1 className="text-2xl font-bold">Competicion</h1>
          <p className="text-muted-foreground mt-1">
            Configura tu competicion para ver clasificacion, jornadas y resultados
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg mb-6">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Option A: Import from RFAF */}
        <div className="bg-card rounded-xl border p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Link2 className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Importar desde RFAF</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Pega la URL de rfaf.es para importar clasificacion, jornadas y resultados automaticamente.
          </p>

          <div>
            <label className="text-sm font-medium mb-1.5 block">URL de la RFAF</label>
            <input
              type="url"
              value={setupUrl}
              onChange={e => setSetupUrl(e.target.value)}
              placeholder="https://www.rfaf.es/pnfg/NPcd/NFG_VisClasificacion?..."
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Nombre de la competicion (opcional)
            </label>
            <input
              type="text"
              value={setupName}
              onChange={e => setSetupName(e.target.value)}
              placeholder="Ej: 3a Andaluza Senior Grupo 4"
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
            />
          </div>

          <button
            onClick={handleSetup}
            disabled={!setupUrl || settingUp}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {settingUp ? (
              <>
                <Spinner size="sm" />
                Importando...
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4" />
                Importar desde RFAF
              </>
            )}
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 border-t" />
          <span className="text-sm text-muted-foreground">o</span>
          <div className="flex-1 border-t" />
        </div>

        {/* Option B: Manual setup */}
        <div className="bg-card rounded-xl border p-6">
          <div className="flex items-center gap-2 mb-1">
            <Swords className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Crear datos manualmente</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Si tu liga no esta en la RFAF, crea rivales y partidos desde las secciones correspondientes.
          </p>
          <div className="flex gap-3">
            <Link
              href="/partidos"
              className="flex-1 py-2.5 rounded-lg border text-sm font-medium text-center hover:bg-muted transition-colors"
            >
              Ir a Partidos
            </Link>
            <Link
              href="/rivales"
              className="flex-1 py-2.5 rounded-lg border text-sm font-medium text-center hover:bg-muted transition-colors"
            >
              Ir a Rivales
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ============ Competition loaded ============
  const clasificacion = competicion.clasificacion || []
  const goleadores = competicion.goleadores || []
  const miEquipo = competicion.mi_equipo_nombre || ''

  const miEquipoStats = clasificacion.find(
    e => e.equipo.toLowerCase() === miEquipo.toLowerCase()
  )

  const currentJornadaData = jornadas.find(j => j.numero === currentJornada)
  const totalJornadas = competicion.calendario?.length || jornadas.length || 30

  const racha = miEquipoStats?.ultimos_5 || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6" />
            {competicion.nombre}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            {competicion.ultima_sincronizacion && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Sync: {new Date(competicion.ultima_sincronizacion).toLocaleString('es-ES')}
              </p>
            )}
            {miEquipo && (
              <p className="text-xs font-medium flex items-center gap-1">
                <Users className="h-3 w-3" />
                {miEquipo}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sincronizando...' : 'Sync completo'}
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-muted-foreground hover:text-destructive hover:border-destructive transition-colors"
            title="Eliminar competicion"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-center justify-between gap-4">
          <p className="text-sm text-destructive">
            Eliminar competicion? Se borraran partidos importados, jornadas y datos de clasificacion.
          </p>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1.5 rounded-lg border text-sm hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              className="px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-sm hover:bg-destructive/90"
            >
              Eliminar
            </button>
          </div>
        </div>
      )}

      {/* Status messages */}
      {error && (
        <div className="flex items-start gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {syncStatus && !error && (
        <div className="flex items-center gap-2 text-sm bg-muted/50 p-3 rounded-lg text-muted-foreground">
          <Check className="h-4 w-4 shrink-0 text-green-500" />
          <span>{syncStatus}</span>
        </div>
      )}

      {/* Mi equipo selector */}
      {selectingEquipo && clasificacion.length > 0 && (
        <div className="bg-card rounded-xl border p-4">
          <p className="text-sm font-medium mb-3">
            Selecciona tu equipo en la clasificacion:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {clasificacion.map(e => (
              <button
                key={e.equipo}
                onClick={() => handleSetMiEquipoAndSync(e.equipo)}
                disabled={savingEquipo || syncing}
                className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm text-left hover:bg-muted transition-colors disabled:opacity-50 ${
                  miEquipo.toLowerCase() === e.equipo.toLowerCase()
                    ? 'border-primary bg-primary/5'
                    : ''
                }`}
              >
                <span>
                  {e.posicion}. {e.equipo}
                </span>
                {miEquipo.toLowerCase() === e.equipo.toLowerCase() && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            ))}
          </div>
          {miEquipo && (
            <button
              onClick={() => setSelectingEquipo(false)}
              className="mt-3 text-sm text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </button>
          )}
        </div>
      )}

      {/* Summary cards */}
      {miEquipoStats && !selectingEquipo && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard
            label="Posicion"
            value={`${miEquipoStats.posicion}${String.fromCharCode(186)}`}
            sub={`de ${clasificacion.length}`}
          />
          <SummaryCard
            label="Puntos"
            value={miEquipoStats.puntos.toString()}
            sub={`${miEquipoStats.pj} PJ`}
          />
          <SummaryCard
            label="GF / GC"
            value={`${miEquipoStats.gf} / ${miEquipoStats.gc}`}
            sub={`Dif: ${miEquipoStats.gf - miEquipoStats.gc > 0 ? '+' : ''}${miEquipoStats.gf - miEquipoStats.gc}`}
          />
          <div className="bg-card rounded-xl border p-4">
            <p className="text-xs text-muted-foreground mb-1">Racha</p>
            <div className="flex gap-1">
              {racha.length > 0 ? racha.map((r, i) => (
                <span
                  key={i}
                  className={`w-7 h-7 rounded text-xs font-bold flex items-center justify-center ${
                    r === 'V' ? 'bg-green-500/20 text-green-600' :
                    r === 'E' ? 'bg-yellow-500/20 text-yellow-600' :
                    'bg-red-500/20 text-red-600'
                  }`}
                >
                  {r}
                </span>
              )) : (
                <span className="text-sm text-muted-foreground">-</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="clasificacion">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="clasificacion">Clasificacion</TabsTrigger>
          <TabsTrigger value="jornada">Jornada</TabsTrigger>
          <TabsTrigger value="goleadores">Goleadores</TabsTrigger>
        </TabsList>

        {/* Clasificacion tab */}
        <TabsContent value="clasificacion">
          <div className="bg-card rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground w-8">#</th>
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">Equipo</th>
                    <th className="text-center py-2.5 px-2 font-medium text-muted-foreground w-10">Pts</th>
                    <th className="text-center py-2.5 px-2 font-medium text-muted-foreground w-8">PJ</th>
                    <th className="text-center py-2.5 px-2 font-medium text-muted-foreground w-8">PG</th>
                    <th className="text-center py-2.5 px-2 font-medium text-muted-foreground w-8">PE</th>
                    <th className="text-center py-2.5 px-2 font-medium text-muted-foreground w-8">PP</th>
                    <th className="text-center py-2.5 px-2 font-medium text-muted-foreground w-8">GF</th>
                    <th className="text-center py-2.5 px-2 font-medium text-muted-foreground w-8">GC</th>
                    <th className="text-center py-2.5 px-2 font-medium text-muted-foreground hidden sm:table-cell">Forma</th>
                  </tr>
                </thead>
                <tbody>
                  {clasificacion.map((e) => {
                    const isMyTeam = miEquipo.toLowerCase() === e.equipo.toLowerCase()
                    return (
                      <tr
                        key={e.equipo}
                        className={`border-b last:border-0 transition-colors ${
                          isMyTeam
                            ? 'bg-yellow-50 dark:bg-yellow-950/20 font-medium'
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <td className="py-2 px-3 text-muted-foreground">{e.posicion}</td>
                        <td className="py-2 px-3">
                          <span className={isMyTeam ? 'font-semibold' : ''}>
                            {e.equipo}
                          </span>
                        </td>
                        <td className="text-center py-2 px-2 font-bold">{e.puntos}</td>
                        <td className="text-center py-2 px-2 text-muted-foreground">{e.pj}</td>
                        <td className="text-center py-2 px-2">{e.pg}</td>
                        <td className="text-center py-2 px-2">{e.pe}</td>
                        <td className="text-center py-2 px-2">{e.pp}</td>
                        <td className="text-center py-2 px-2">{e.gf}</td>
                        <td className="text-center py-2 px-2">{e.gc}</td>
                        <td className="text-center py-2 px-2 hidden sm:table-cell">
                          <div className="flex gap-0.5 justify-center">
                            {(e.ultimos_5 || []).map((r, i) => (
                              <span
                                key={i}
                                className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center ${
                                  r === 'V' ? 'bg-green-500/20 text-green-600' :
                                  r === 'E' ? 'bg-yellow-500/20 text-yellow-600' :
                                  'bg-red-500/20 text-red-600'
                                }`}
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {clasificacion.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                No hay datos de clasificacion. Pulsa &quot;Sync completo&quot; para importar.
              </div>
            )}
          </div>
        </TabsContent>

        {/* Jornada tab */}
        <TabsContent value="jornada">
          <div className="bg-card rounded-xl border">
            {/* Jornada navigator */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <button
                onClick={() => setCurrentJornada(j => Math.max(1, j - 1))}
                disabled={currentJornada <= 1}
                className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="font-semibold">Jornada {currentJornada}</span>
              <button
                onClick={() => setCurrentJornada(j => Math.min(totalJornadas, j + 1))}
                disabled={currentJornada >= totalJornadas}
                className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Matches */}
            <div className="divide-y">
              {currentJornadaData?.partidos?.length ? (
                currentJornadaData.partidos.map((partido, idx) => (
                  <PartidoRow
                    key={idx}
                    partido={partido}
                    miEquipo={miEquipo}
                  />
                ))
              ) : (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  {jornadas.length === 0
                    ? 'No hay jornadas. Pulsa "Sync completo" para importar todas.'
                    : 'No hay datos para esta jornada.'}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Goleadores tab */}
        <TabsContent value="goleadores">
          <div className="bg-card rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground w-8">#</th>
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">Jugador</th>
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">Equipo</th>
                    <th className="text-center py-2.5 px-3 font-medium text-muted-foreground w-12">PJ</th>
                    <th className="text-center py-2.5 px-3 font-medium text-muted-foreground w-12">Goles</th>
                  </tr>
                </thead>
                <tbody>
                  {goleadores.map((g, idx) => {
                    const isMyTeam = miEquipo && g.equipo.toLowerCase().includes(miEquipo.toLowerCase())
                    return (
                      <tr
                        key={idx}
                        className={`border-b last:border-0 ${
                          isMyTeam
                            ? 'bg-yellow-50 dark:bg-yellow-950/20'
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <td className="py-2 px-3 text-muted-foreground">{idx + 1}</td>
                        <td className="py-2 px-3 font-medium">{g.jugador}</td>
                        <td className="py-2 px-3 text-muted-foreground">{g.equipo}</td>
                        <td className="text-center py-2 px-3 text-muted-foreground">{g.pj || '-'}</td>
                        <td className="text-center py-2 px-3 font-bold">{g.goles}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {goleadores.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                No hay datos de goleadores.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Change team button */}
      {competicion.mi_equipo_nombre && !selectingEquipo && (
        <div className="text-center">
          <button
            onClick={() => setSelectingEquipo(true)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Cambiar equipo seleccionado ({competicion.mi_equipo_nombre})
          </button>
        </div>
      )}
    </div>
  )
}

// ============ Sub-components ============

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-card rounded-xl border p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

function PartidoRow({ partido, miEquipo }: { partido: RFEFPartidoJornada; miEquipo: string }) {
  const isMyTeam = (name: string) =>
    miEquipo && name.toLowerCase() === miEquipo.toLowerCase()
  const hasResult = partido.goles_local !== null && partido.goles_visitante !== null
  const isMyMatch = isMyTeam(partido.local) || isMyTeam(partido.visitante)

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 ${
        isMyMatch ? 'bg-yellow-50/50 dark:bg-yellow-950/10' : ''
      }`}
    >
      {/* Local */}
      <div className="flex-1 text-right">
        <span className={`text-sm ${isMyTeam(partido.local) ? 'font-bold' : ''}`}>
          {partido.local}
        </span>
      </div>

      {/* Score */}
      <div className="w-20 text-center shrink-0">
        {hasResult ? (
          <span className="text-sm font-bold bg-muted px-3 py-1 rounded">
            {partido.goles_local} - {partido.goles_visitante}
          </span>
        ) : (
          <div className="text-xs text-muted-foreground">
            {partido.hora || partido.fecha || '-'}
          </div>
        )}
      </div>

      {/* Visitante */}
      <div className="flex-1 text-left">
        <span className={`text-sm ${isMyTeam(partido.visitante) ? 'font-bold' : ''}`}>
          {partido.visitante}
        </span>
      </div>
    </div>
  )
}
