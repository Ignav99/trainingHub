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
  RFEFSancion,
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
  FileText,
  X,
  Shield,
  Settings,
} from 'lucide-react'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { RFEFActa } from '@/types'

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

  // Acta modal
  const [selectedActaCod, setSelectedActaCod] = useState<string | null>(null)

  // Sanciones config
  const [showSancionesConfig, setShowSancionesConfig] = useState(false)
  const [sancionComps, setSancionComps] = useState<{ id: string; nombre: string }[]>([])
  const [sancionGrupos, setSancionGrupos] = useState<{ id: string; nombre: string }[]>([])
  const [selectedSancionComp, setSelectedSancionComp] = useState('')
  const [selectedSancionGrupo, setSelectedSancionGrupo] = useState('')
  const [loadingSancionConfig, setLoadingSancionConfig] = useState(false)
  const [savingSancionConfig, setSavingSancionConfig] = useState(false)

  // Sanciones tab
  const [sancionesJornada, setSancionesJornada] = useState<number | undefined>(undefined)
  const [sanciones, setSanciones] = useState<RFEFSancion[]>([])
  const [loadingSanciones, setLoadingSanciones] = useState(false)
  const [syncingSanciones, setSyncingSanciones] = useState(false)

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
          (result.sanciones_saved ? `, ${result.sanciones_saved} sanciones` : '') +
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

  const sancionesConfigured = !!(competicion?.sancion_competicion_id && competicion?.sancion_grupo_id)

  const handleOpenSancionesConfig = async () => {
    setShowSancionesConfig(true)
    setLoadingSancionConfig(true)
    try {
      const res = await rfefApi.getSancionesCompeticiones(competicion?.rfef_codtemporada)
      setSancionComps(res.data)
    } catch { /* ok */ }
    setLoadingSancionConfig(false)
  }

  const handleSancionCompChange = async (compId: string) => {
    setSelectedSancionComp(compId)
    setSelectedSancionGrupo('')
    setSancionGrupos([])
    if (!compId) return
    try {
      const res = await rfefApi.getSancionesGrupos(competicion?.rfef_codtemporada || '21', compId)
      setSancionGrupos(res.data)
    } catch { /* ok */ }
  }

  const handleSaveSancionesConfig = async () => {
    if (!competicion || !selectedSancionComp || !selectedSancionGrupo) return
    setSavingSancionConfig(true)
    try {
      const updated = await rfefApi.setSancionesConfig(competicion.id, {
        sancion_competicion_id: selectedSancionComp,
        sancion_grupo_id: selectedSancionGrupo,
      })
      setCompeticion(prev => prev ? {
        ...prev,
        sancion_competicion_id: updated.sancion_competicion_id,
        sancion_grupo_id: updated.sancion_grupo_id,
      } : null)
      setShowSancionesConfig(false)
      // Auto-sync after config
      setSyncingSanciones(true)
      const syncRes = await rfefApi.syncSanciones(competicion.id)
      setSyncStatus(`Sanciones configuradas: ${syncRes.sanciones_saved} guardadas`)
      // Load sanciones
      await loadSanciones()
    } catch (err: any) {
      setError(err.message || 'Error al configurar sanciones')
    } finally {
      setSavingSancionConfig(false)
      setSyncingSanciones(false)
    }
  }

  const loadSanciones = async () => {
    if (!competicion) return
    setLoadingSanciones(true)
    try {
      const res = await rfefApi.listSanciones(competicion.id, {
        jornada: sancionesJornada,
      })
      setSanciones(res.data)
    } catch { /* ok */ }
    setLoadingSanciones(false)
  }

  const handleSyncSanciones = async () => {
    if (!competicion) return
    setSyncingSanciones(true)
    try {
      const res = await rfefApi.syncSanciones(competicion.id)
      setSyncStatus(`Sanciones sincronizadas: ${res.sanciones_saved} guardadas`)
      await loadSanciones()
    } catch (err: any) {
      setError(err.message || 'Error al sincronizar sanciones')
    } finally {
      setSyncingSanciones(false)
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
          {sancionesConfigured && (
            <TabsTrigger value="sanciones" onClick={() => { if (sanciones.length === 0) loadSanciones() }}>
              Sanciones
            </TabsTrigger>
          )}
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
                    onActaClick={partido.cod_acta ? () => setSelectedActaCod(partido.cod_acta!) : undefined}
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
        {/* Sanciones tab */}
        {sancionesConfigured && (
          <TabsContent value="sanciones">
            <div className="space-y-4">
              {/* Controls */}
              <div className="flex items-center gap-3 flex-wrap">
                <select
                  value={sancionesJornada ?? ''}
                  onChange={e => {
                    const val = e.target.value ? Number(e.target.value) : undefined
                    setSancionesJornada(val)
                    // Trigger reload
                    setTimeout(async () => {
                      if (!competicion) return
                      setLoadingSanciones(true)
                      try {
                        const res = await rfefApi.listSanciones(competicion.id, { jornada: val })
                        setSanciones(res.data)
                      } catch { /* ok */ }
                      setLoadingSanciones(false)
                    }, 0)
                  }}
                  className="px-3 py-1.5 rounded-lg border bg-background text-sm"
                >
                  <option value="">Todas las jornadas</option>
                  {(competicion.calendario || []).map(j => (
                    <option key={j.numero} value={j.numero}>Jornada {j.numero}</option>
                  ))}
                </select>
                <button
                  onClick={handleSyncSanciones}
                  disabled={syncingSanciones}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm hover:bg-muted disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${syncingSanciones ? 'animate-spin' : ''}`} />
                  {syncingSanciones ? 'Sincronizando...' : 'Sync sanciones'}
                </button>
              </div>

              {loadingSanciones ? (
                <div className="flex justify-center py-8">
                  <Spinner size="md" />
                </div>
              ) : sanciones.length === 0 ? (
                <div className="bg-card rounded-xl border py-8 text-center text-muted-foreground text-sm">
                  No hay sanciones{sancionesJornada ? ` para la jornada ${sancionesJornada}` : ''}. Pulsa &quot;Sync sanciones&quot; para importar.
                </div>
              ) : (
                <SancionesTable sanciones={sanciones} miEquipo={miEquipo} />
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Acta Detail Modal */}
      <ActaModal
        codActa={selectedActaCod}
        onClose={() => setSelectedActaCod(null)}
      />

      {/* Sanciones config */}
      {competicion.mi_equipo_nombre && !selectingEquipo && (
        <div className="bg-card rounded-xl border p-4">
          {sancionesConfigured && !showSancionesConfig ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-green-600">Sanciones configuradas</span>
              </div>
              <button
                onClick={handleOpenSancionesConfig}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <Settings className="h-3 w-3" />
                Reconfigurar
              </button>
            </div>
          ) : showSancionesConfig ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Configurar Sanciones RFAF</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Los IDs de sanciones son diferentes a los de clasificacion. Selecciona la competicion y grupo correctos.
              </p>

              {loadingSancionConfig ? (
                <div className="flex justify-center py-4"><Spinner size="sm" /></div>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Competicion (sanciones)</label>
                    <select
                      value={selectedSancionComp}
                      onChange={e => handleSancionCompChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
                    >
                      <option value="">Seleccionar...</option>
                      {sancionComps.map(c => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                  </div>

                  {selectedSancionComp && (
                    <div>
                      <label className="text-xs font-medium mb-1 block">Grupo (sanciones)</label>
                      <select
                        value={selectedSancionGrupo}
                        onChange={e => setSelectedSancionGrupo(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
                      >
                        <option value="">Seleccionar...</option>
                        {sancionGrupos.map(g => (
                          <option key={g.id} value={g.id}>{g.nombre}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveSancionesConfig}
                      disabled={!selectedSancionComp || !selectedSancionGrupo || savingSancionConfig}
                      className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                    >
                      {savingSancionConfig ? (
                        <><Spinner size="sm" />Guardando...</>
                      ) : (
                        'Guardar y sincronizar'
                      )}
                    </button>
                    <button
                      onClick={() => setShowSancionesConfig(false)}
                      className="px-3 py-2 rounded-lg border text-sm hover:bg-muted"
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={handleOpenSancionesConfig}
              className="flex items-center gap-2 text-sm text-primary hover:text-primary/80"
            >
              <Shield className="h-4 w-4" />
              Configurar sanciones RFAF
            </button>
          )}
        </div>
      )}

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

function PartidoRow({
  partido,
  miEquipo,
  onActaClick,
}: {
  partido: RFEFPartidoJornada
  miEquipo: string
  onActaClick?: () => void
}) {
  const isMyTeam = (name: string) =>
    miEquipo && name.toLowerCase() === miEquipo.toLowerCase()
  const hasResult = partido.goles_local !== null && partido.goles_visitante !== null
  const isMyMatch = isMyTeam(partido.local) || isMyTeam(partido.visitante)
  const hasActa = !!partido.cod_acta

  return (
    <div
      onClick={hasActa ? onActaClick : undefined}
      className={`flex items-center gap-3 px-4 py-3 ${
        isMyMatch ? 'bg-yellow-50/50 dark:bg-yellow-950/10' : ''
      } ${hasActa ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''}`}
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
          <span className="text-sm font-bold bg-muted px-3 py-1 rounded inline-flex items-center gap-1">
            {partido.goles_local} - {partido.goles_visitante}
            {hasActa && <FileText className="h-3 w-3 text-muted-foreground" />}
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

function SancionesTable({ sanciones, miEquipo }: { sanciones: RFEFSancion[]; miEquipo: string }) {
  // Group by jornada, then by category
  const byJornada = sanciones.reduce<Record<number, RFEFSancion[]>>((acc, s) => {
    if (!acc[s.jornada_numero]) acc[s.jornada_numero] = []
    acc[s.jornada_numero].push(s)
    return acc
  }, {})

  const categoriaLabel: Record<string, string> = {
    jugador: 'Jugadores',
    tecnico: 'Tecnicos / Cuerpo tecnico',
    equipo: 'Equipos',
  }

  const getBadgeColor = (desc: string) => {
    const d = desc.toLowerCase()
    if (d.includes('partido') && d.includes('suspensi')) return 'bg-red-500/15 text-red-600'
    if (d.includes('multa')) return 'bg-orange-500/15 text-orange-600'
    if (d.includes('amonesta')) return 'bg-yellow-500/15 text-yellow-700'
    return 'bg-muted text-muted-foreground'
  }

  return (
    <div className="space-y-6">
      {Object.keys(byJornada).sort((a, b) => Number(b) - Number(a)).map(jStr => {
        const jNum = Number(jStr)
        const items = byJornada[jNum]
        const byCategoria = items.reduce<Record<string, RFEFSancion[]>>((acc, s) => {
          if (!acc[s.categoria]) acc[s.categoria] = []
          acc[s.categoria].push(s)
          return acc
        }, {})

        return (
          <div key={jNum} className="bg-card rounded-xl border overflow-hidden">
            <div className="px-4 py-2.5 border-b bg-muted/50 flex items-center justify-between">
              <span className="font-semibold text-sm">Jornada {jNum}</span>
              {items[0]?.jornada_fecha && (
                <span className="text-xs text-muted-foreground">{items[0].jornada_fecha}</span>
              )}
            </div>

            {['jugador', 'tecnico', 'equipo'].map(cat => {
              const catItems = byCategoria[cat]
              if (!catItems?.length) return null
              return (
                <div key={cat}>
                  <div className="px-4 py-1.5 bg-muted/30 border-b">
                    <span className="text-xs font-semibold text-muted-foreground uppercase">
                      {categoriaLabel[cat] || cat}
                    </span>
                  </div>
                  <div className="divide-y">
                    {catItems.map((s, idx) => {
                      const isMyTeam = miEquipo && s.equipo_nombre.toLowerCase().includes(miEquipo.toLowerCase())
                      return (
                        <div
                          key={idx}
                          className={`px-4 py-2 flex items-start gap-3 text-sm ${
                            isMyTeam ? 'bg-yellow-50/50 dark:bg-yellow-950/10' : ''
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-medium ${isMyTeam ? 'font-bold' : ''}`}>
                                {s.equipo_nombre}
                              </span>
                              {s.persona_nombre && (
                                <span className="text-muted-foreground">— {s.persona_nombre}</span>
                              )}
                            </div>
                            {s.articulo && (
                              <span className="text-xs text-muted-foreground">Art. {s.articulo}</span>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${getBadgeColor(s.descripcion)}`}>
                            {s.descripcion}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

function ActaModal({ codActa, onClose }: { codActa: string | null; onClose: () => void }) {
  const { data: acta, isLoading } = useSWR<RFEFActa>(
    codActa ? apiKey(`/rfef/actas/${codActa}`) : null
  )

  return (
    <Dialog open={!!codActa} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Acta del partido</DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Spinner size="md" />
          </div>
        )}

        {acta && (
          <div className="space-y-5">
            {/* Header: Teams + Score */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-4">
                <div className="flex-1 text-right">
                  <p className="font-bold text-sm">{acta.local_nombre}</p>
                </div>
                <div className="text-center">
                  <span className="text-xl font-bold bg-muted px-4 py-1.5 rounded-lg inline-block">
                    {acta.goles_local ?? '-'} - {acta.goles_visitante ?? '-'}
                  </span>
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold text-sm">{acta.visitante_nombre}</p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground space-x-3">
                {acta.fecha && <span>{acta.fecha}</span>}
                {acta.hora && <span>{acta.hora}</span>}
                {acta.estadio && <span>{acta.estadio}</span>}
                <span>Jornada {acta.jornada_numero}</span>
              </div>
            </div>

            {/* Lineups: Side by side */}
            <div className="grid grid-cols-2 gap-4">
              {/* Local */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Titulares Local</p>
                <div className="space-y-1">
                  {acta.titulares_local?.map((j, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs py-1 px-2 rounded border">
                      <span className="font-bold text-muted-foreground w-6 text-right">{j.dorsal ?? '-'}</span>
                      <span className="flex-1 truncate">{j.nombre}</span>
                    </div>
                  ))}
                </div>
                {acta.suplentes_local?.length > 0 && (
                  <>
                    <p className="text-xs text-muted-foreground mt-3 mb-1">Suplentes</p>
                    <div className="space-y-1">
                      {acta.suplentes_local.map((j, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs py-1 px-2 rounded text-muted-foreground">
                          <span className="w-6 text-right">{j.dorsal ?? '-'}</span>
                          <span className="flex-1 truncate">{j.nombre}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Visitante */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Titulares Visitante</p>
                <div className="space-y-1">
                  {acta.titulares_visitante?.map((j, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs py-1 px-2 rounded border">
                      <span className="font-bold text-muted-foreground w-6 text-right">{j.dorsal ?? '-'}</span>
                      <span className="flex-1 truncate">{j.nombre}</span>
                    </div>
                  ))}
                </div>
                {acta.suplentes_visitante?.length > 0 && (
                  <>
                    <p className="text-xs text-muted-foreground mt-3 mb-1">Suplentes</p>
                    <div className="space-y-1">
                      {acta.suplentes_visitante.map((j, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs py-1 px-2 rounded text-muted-foreground">
                          <span className="w-6 text-right">{j.dorsal ?? '-'}</span>
                          <span className="flex-1 truncate">{j.nombre}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Goals */}
            {acta.goles?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Goles</p>
                <div className="space-y-1">
                  {acta.goles.map((g, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs py-1.5 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
                      <span className="font-bold text-emerald-600 w-8">{g.minuto}&apos;</span>
                      <span className="flex-1">{g.jugador}</span>
                      {g.parcial_local !== null && (
                        <span className="font-bold text-muted-foreground">
                          {g.parcial_local} - {g.parcial_visitante}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cards */}
            {(acta.tarjetas_local?.length > 0 || acta.tarjetas_visitante?.length > 0) && (
              <div className="grid grid-cols-2 gap-4">
                {acta.tarjetas_local?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Tarjetas Local</p>
                    <div className="space-y-1">
                      {acta.tarjetas_local.map((t, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs py-1 px-2">
                          <span className={`w-3 h-4 rounded-sm ${t.tipo === 'amarilla' ? 'bg-yellow-400' : 'bg-red-500'}`} />
                          <span>{t.jugador}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {acta.tarjetas_visitante?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Tarjetas Visitante</p>
                    <div className="space-y-1">
                      {acta.tarjetas_visitante.map((t, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs py-1 px-2">
                          <span className={`w-3 h-4 rounded-sm ${t.tipo === 'amarilla' ? 'bg-yellow-400' : 'bg-red-500'}`} />
                          <span>{t.jugador}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Substitutions */}
            {(acta.sustituciones_local?.length > 0 || acta.sustituciones_visitante?.length > 0) && (
              <div className="grid grid-cols-2 gap-4">
                {acta.sustituciones_local?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Cambios Local</p>
                    <div className="space-y-1">
                      {acta.sustituciones_local.map((s, i) => (
                        <div key={i} className="text-xs text-muted-foreground py-1 px-2">
                          {s.minuto}&apos; {s.jugador}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {acta.sustituciones_visitante?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Cambios Visitante</p>
                    <div className="space-y-1">
                      {acta.sustituciones_visitante.map((s, i) => (
                        <div key={i} className="text-xs text-muted-foreground py-1 px-2">
                          {s.minuto}&apos; {s.jugador}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Referees */}
            {acta.arbitros?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Arbitros</p>
                <div className="flex flex-wrap gap-2">
                  {acta.arbitros.map((a: any, i: number) => (
                    <span key={i} className="text-xs py-1 px-2 rounded bg-muted">
                      {typeof a === 'string' ? a : a.nombre || a.rol || JSON.stringify(a)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Technical staff */}
            {(Object.keys(acta.cuerpo_tecnico_local || {}).length > 0 || Object.keys(acta.cuerpo_tecnico_visitante || {}).length > 0) && (
              <div className="grid grid-cols-2 gap-4">
                {Object.keys(acta.cuerpo_tecnico_local || {}).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Cuerpo Tecnico Local</p>
                    {Object.entries(acta.cuerpo_tecnico_local).map(([rol, nombre]) => (
                      <div key={rol} className="text-xs py-0.5">
                        <span className="text-muted-foreground">{rol}:</span> {nombre}
                      </div>
                    ))}
                  </div>
                )}
                {Object.keys(acta.cuerpo_tecnico_visitante || {}).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Cuerpo Tecnico Visitante</p>
                    {Object.entries(acta.cuerpo_tecnico_visitante).map(([rol, nombre]) => (
                      <div key={rol} className="text-xs py-0.5">
                        <span className="text-muted-foreground">{rol}:</span> {nombre}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
